// Server-only: idempotent seeding of the curated knowledge-block sources into
// the RAG tables (ai_knowledge_sources + ai_chunks).
//
// Design notes:
// - All seeds are inserted as pending review / inactive, so they are NOT
//   retrievable by the AI layer until an editor (and optionally a KOL) approves
//   them. This respects the master-KB governance rule.
// - Idempotent: existing rows (matched by metadata.external_id) are skipped and
//   never overwritten, so editorial decisions survive re-runs.
// - Independent of reindexEvidenceCorpus(): that pipeline deletes/re-inserts
//   only "ophthalmology-evidence"/"oph-tables" sources, never "knowledge-blocks".
// - Only substantive monographs are chunked + embedded. Title-only catalogue
//   stubs are inserted as backlog rows without vectors, keeping the corpus clean.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { embedText } from "./gateway.server";
import { chunkContent } from "./chunk";
import { ophCodeToSubspecialtyLabel } from "@/lib/ophthalmology-subspecialty";
import { KNOWLEDGE_BLOCK_SEEDS, type KnowledgeBlockSeed } from "@/lib/knowledge-block-seeds";

export interface SeedBlocksReport {
  generated_at: string;
  total_seeds: number;
  sources_inserted: number;
  skipped_existing: number;
  monographs_chunked: number;
  chunks_inserted: number;
  stubs_seeded: number;
  by_subspecialty: Record<string, number>;
  embedding_dims: number | null;
}

function mapApprovalStatus(raw: string): string {
  switch (raw.trim().toLowerCase()) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "archived":
      return "Archived";
    case "draft":
      return "Draft";
    default:
      return "Pending Review";
  }
}

function buildContent(seed: KnowledgeBlockSeed): string {
  const refs = seed.references
    .map((r) => (r.url ? `${r.title} (${r.url})` : r.title))
    .filter(Boolean);
  return refs.length ? `${seed.text}\n\nFuentes: ${refs.join("; ")}` : seed.text;
}

export async function seedKnowledgeBlocks(): Promise<SeedBlocksReport> {
  const seeds = KNOWLEDGE_BLOCK_SEEDS;

  // Idempotency: collect external_ids already imported from the blocks.
  const { data: existingRows } = await supabaseAdmin
    .from("ai_knowledge_sources")
    .select("metadata")
    .eq("metadata->>imported_from", "knowledge-blocks");
  const existing = new Set<string>();
  for (const row of existingRows ?? []) {
    const ext = (row.metadata as { external_id?: string } | null)?.external_id;
    if (ext) existing.add(ext);
  }

  const fresh = seeds.filter((s) => !existing.has(s.external_id));
  const by_subspecialty: Record<string, number> = {};

  const sourceRows = fresh.map((s) => {
    const label = ophCodeToSubspecialtyLabel(s.subspecialty);
    by_subspecialty[label] = (by_subspecialty[label] ?? 0) + 1;
    return {
      title: s.title,
      description: s.text.slice(0, 280),
      source_type: "Knowledge Block",
      subspecialty: label,
      language: s.language,
      author: null,
      external_url: s.references[0]?.url ?? null,
      publication_date: null,
      evidence_level: null,
      approval_status: mapApprovalStatus(s.approval_status),
      is_active: false,
      validation_level: null,
      // JSON round-trip so the typed client accepts it as plain Json
      // (KnowledgeBlockReference[] lacks the index signature Json requires).
      metadata: JSON.parse(
        JSON.stringify({
          imported_from: "knowledge-blocks",
          external_id: s.external_id,
          kind: s.kind,
          references: s.references,
        }),
      ),
    };
  });

  let sources_inserted = 0;
  const byExt = new Map<string, string>();
  for (let i = 0; i < sourceRows.length; i += 200) {
    const batch = sourceRows.slice(i, i + 200);
    const { data, error } = await supabaseAdmin
      .from("ai_knowledge_sources")
      .insert(batch)
      .select("id, metadata");
    if (error) throw new Error(`insert block sources failed: ${error.message}`);
    sources_inserted += data?.length ?? 0;
    for (const row of data ?? []) {
      const ext = (row.metadata as { external_id?: string } | null)?.external_id;
      if (ext) byExt.set(ext, row.id as string);
    }
  }

  // Chunk + embed only the substantive monographs we just inserted.
  const freshMonographs = fresh.filter((s) => s.kind === "monograph" && byExt.has(s.external_id));
  const pendingChunks = freshMonographs.flatMap((s) =>
    chunkContent(buildContent(s)).map((content, chunk_index) => ({
      source_id: byExt.get(s.external_id)!,
      chunk_index,
      content,
    })),
  );

  let embedding_dims: number | null = null;
  let chunks_inserted = 0;
  if (pendingChunks.length) {
    const embeddings: number[][] = [];
    for (let i = 0; i < pendingChunks.length; i += 32) {
      const vecs = await embedText(pendingChunks.slice(i, i + 32).map((c) => c.content));
      embeddings.push(...vecs);
    }
    embedding_dims = embeddings[0]?.length ?? null;

    const chunkRows = pendingChunks
      .map((c, i) => {
        const embedding = embeddings[i];
        if (!embedding) return null;
        return {
          source_id: c.source_id,
          chunk_index: c.chunk_index,
          content: c.content,
          embedding: embedding as unknown as string,
          token_count: Math.round(c.content.length / 4),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    for (let i = 0; i < chunkRows.length; i += 50) {
      const batch = chunkRows.slice(i, i + 50);
      const { error } = await supabaseAdmin.from("ai_chunks").insert(batch);
      if (error) throw new Error(`insert block chunks failed: ${error.message}`);
      chunks_inserted += batch.length;
    }
  }

  return {
    generated_at: new Date().toISOString(),
    total_seeds: seeds.length,
    sources_inserted,
    skipped_existing: seeds.length - fresh.length,
    monographs_chunked: freshMonographs.length,
    chunks_inserted,
    stubs_seeded: fresh.filter((s) => s.kind === "stub").length,
    by_subspecialty,
    embedding_dims,
  };
}
