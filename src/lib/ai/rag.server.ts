// Server-only RAG retrieval over ai_knowledge_sources via pgvector.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { embedText } from "./gateway.server";

export interface RetrievedChunk {
  chunk_id: string;
  source_id: string;
  content: string;
  similarity: number;
  source_title: string;
  source_type: string;
  source_author: string | null;
  source_year: number | null;
  source_subspecialty: string;
  source_language: string;
  validation_level: string | null;
}

// Por debajo de este coseno la similitud es ruido: descartamos el chunk para
// no inyectar contexto irrelevante (que diluye la respuesta y favorece las
// alucinaciones de cita). Ajustable por llamada con `minSimilarity`.
export const DEFAULT_MIN_SIMILARITY = 0.2;

// Pequeño impulso a las fuentes en el idioma del usuario: mantiene la
// recuperación cross-lingual (guías AAO/EGS en inglés para una consulta en
// español) pero, a igualdad de relevancia, prioriza el idioma preferido.
const SAME_LANGUAGE_BOOST = 0.03;

export async function retrieveContext(opts: {
  query: string;
  subspecialty?: string;
  language?: string;
  topK?: number;
  minSimilarity?: number;
  /** Si es false, filtra estrictamente por idioma (sin cross-lingual). */
  crossLingual?: boolean;
}): Promise<RetrievedChunk[]> {
  const [embedding] = await embedText(opts.query);
  if (!embedding) return [];

  const topK = opts.topK ?? 6;
  const crossLingual = opts.crossLingual !== false;

  // En modo cross-lingual no filtramos por idioma en SQL y pedimos un pool más
  // amplio de candidatos para reordenarlos en memoria. Los embeddings de
  // text-embedding-3-small son multilingües, así que una guía en inglés puede
  // ser muy relevante para una consulta en español.
  const { data, error } = await supabaseAdmin.rpc("match_ai_chunks", {
    query_embedding: embedding as unknown as string,
    match_count: crossLingual ? Math.max(topK * 3, topK) : topK,
    filter_subspecialty: opts.subspecialty,
    filter_language: crossLingual ? undefined : opts.language,
  });
  if (error) {
    console.error("match_ai_chunks error", error);
    return [];
  }

  const threshold = opts.minSimilarity ?? DEFAULT_MIN_SIMILARITY;
  const candidates = ((data ?? []) as RetrievedChunk[]).filter(
    (c) => (c.similarity ?? 0) >= threshold,
  );

  if (!crossLingual || !opts.language) return candidates.slice(0, topK);

  // Reordenamos con el impulso de idioma y devolvemos los topK mejores.
  return candidates
    .map((c) => ({
      c,
      score: (c.similarity ?? 0) + (c.source_language === opts.language ? SAME_LANGUAGE_BOOST : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((x) => x.c);
}

/**
 * IDs de fuente (uuid) realmente recuperados del corpus aprobado. Se usa para
 * validar a posteriori que la IA solo cite fuentes presentes en el contexto y
 * descartar referencias inventadas.
 */
export function retrievedSourceIds(chunks: RetrievedChunk[]): Set<string> {
  return new Set(chunks.map((c) => c.source_id));
}

export function formatContextForPrompt(chunks: RetrievedChunk[]): string {
  if (!chunks.length) return "(No hay fuentes aprobadas indexadas relevantes.)";
  return chunks
    .map(
      (c, i) =>
        `[${i + 1}] id=${c.source_id} | ${c.source_title} (${c.source_type}${c.source_year ? `, ${c.source_year}` : ""}${c.source_author ? `, ${c.source_author}` : ""})\n${c.content.slice(0, 1200)}`,
    )
    .join("\n\n---\n\n");
}
