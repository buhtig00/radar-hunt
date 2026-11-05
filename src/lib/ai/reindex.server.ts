// Server-only: extracted reindex pipeline + quality validations for the RAG corpus.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { embedText } from "./gateway.server";
import { chunkContent } from "./chunk";
import { ophCodeToSubspecialtyLabel } from "@/lib/ophthalmology-subspecialty";
import {
  LANDMARK_TRIALS,
  CLINICAL_PROTOCOLS,
  CLINICAL_SCALES,
  SYSTEMATIC_REVIEWS,
} from "@/lib/ophthalmology-evidence";

export interface SourceDoc {
  external_id: string;
  title: string;
  description: string;
  source_type: string;
  subspecialty: string;
  language: "es" | "en";
  author: string | null;
  publication_date: string | null;
  evidence_level: string | null;
  content: string;
}

export interface QualityIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  detail?: string[];
}

export interface QualityReport {
  generated_at: string;
  expected_docs: number;
  sources_inserted: number;
  chunks_inserted: number;
  embedding_dims: number | null;
  duplicate_external_ids: string[];
  duplicate_titles: string[];
  short_content_docs: string[];
  missing_embeddings: string[];
  orphan_chunks: number;
  orphan_sources: number;
  by_subspecialty: Record<string, number>;
  by_language: Record<string, number>;
  by_source_type: Record<string, number>;
  issues: QualityIssue[];
  ok: boolean;
}

const MIN_CONTENT_CHARS = 60;

export function buildDocs(): SourceDoc[] {
  const docs: SourceDoc[] = [];

  for (const t of LANDMARK_TRIALS) {
    docs.push({
      external_id: t.id,
      title: `${t.acronym} — ${t.full_name}`,
      description: t.topic,
      source_type: "Paper",
      subspecialty: t.subspecialty,
      language: "es",
      author: t.reference,
      publication_date: `${t.year}-01-01`,
      evidence_level: "I (RCT)",
      content: [
        `Acrónimo: ${t.acronym}`,
        `Nombre: ${t.full_name}`,
        `Año: ${t.year}`,
        `Tema: ${t.topic}`,
        `Diseño: ${t.design}`,
        `Población: ${t.population}`,
        `Intervención: ${t.intervention}`,
        `Endpoint primario: ${t.primary_endpoint}`,
        `Resultados clave: ${t.key_results.join(" | ")}`,
        `Impacto clínico: ${t.clinical_impact}`,
        `Referencia: ${t.reference}`,
      ].join("\n"),
    });
  }
  for (const p of CLINICAL_PROTOCOLS) {
    docs.push({
      external_id: p.id,
      title: p.title,
      description: p.context,
      source_type: "Protocol",
      subspecialty: p.subspecialty,
      language: "es",
      author: p.source,
      publication_date: null,
      evidence_level: "Guideline-based protocol",
      content: [
        `Protocolo: ${p.title}`,
        `Contexto: ${p.context}`,
        `Pasos: ${p.steps.join(" | ")}`,
        `Monitorización: ${p.monitoring.join(" | ")}`,
        `Errores a evitar: ${p.pitfalls.join(" | ")}`,
        `Fuente: ${p.source}`,
      ].join("\n"),
    });
  }
  for (const s of CLINICAL_SCALES) {
    docs.push({
      external_id: s.id,
      title: s.name,
      description: s.purpose,
      source_type: "Guideline",
      subspecialty: s.subspecialty,
      language: "es",
      author: s.source,
      publication_date: null,
      evidence_level: "Validated scale",
      content: [
        `Escala: ${s.name}`,
        `Propósito: ${s.purpose}`,
        `Items: ${s.items.map((i) => `${i.code}: ${i.description}`).join(" | ")}`,
        `Fuente: ${s.source}`,
      ].join("\n"),
    });
  }
  for (const r of SYSTEMATIC_REVIEWS) {
    docs.push({
      external_id: r.id,
      title: r.title,
      description: r.conclusion,
      source_type: "Paper",
      subspecialty: r.subspecialty,
      language: "es",
      author: r.source,
      publication_date: `${r.year}-01-01`,
      evidence_level: "Systematic review",
      content: [
        `Revisión: ${r.title}`,
        `Año: ${r.year}`,
        `Fuente: ${r.source}`,
        `Conclusión: ${r.conclusion}`,
      ].join("\n"),
    });
  }
  return docs;
}

async function embedInBatches(texts: string[], batchSize = 32): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const vecs = await embedText(texts.slice(i, i + batchSize));
    out.push(...vecs);
  }
  return out;
}

function tally<T extends string>(values: T[]): Record<string, number> {
  const r: Record<string, number> = {};
  for (const v of values) r[v] = (r[v] ?? 0) + 1;
  return r;
}

function findDuplicates<T>(arr: T[]): T[] {
  const seen = new Set<T>();
  const dup = new Set<T>();
  for (const v of arr) {
    if (seen.has(v)) dup.add(v);
    else seen.add(v);
  }
  return [...dup];
}

/* ---------------------------------------------------------------
 * Build SourceDocs from the curated `oph_*` clinical tables so the
 * RAG retriever can answer with the real institutional corpus —
 * not only the static ophthalmology-evidence arrays.
 * --------------------------------------------------------------- */
const OPH_SUB_LANG: "es" = "es";

function joinNonEmpty(parts: Array<string | null | undefined>, sep = "\n"): string {
  return parts.filter((p) => p && String(p).trim().length > 0).join(sep);
}

export async function buildOphDocsFromDb(): Promise<SourceDoc[]> {
  const docs: SourceDoc[] = [];

  // Pathologies
  const { data: paths } = await supabaseAdmin
    .from("oph_pathologies")
    .select(
      "id, name_es, name_en, subspecialty, epidemiology_es, risk_factors_es, clinical_features_es, diagnostic_workup_es, differential_diagnosis_es, treatment_overview_es, follow_up_es, red_flags_es, icd10_codes",
    )
    .eq("status", "approved")
    .eq("is_active", true);
  for (const p of paths ?? []) {
    docs.push({
      external_id: `oph-pathology-${p.id}`,
      title: p.name_es || p.name_en,
      description: (p.epidemiology_es ?? "").slice(0, 280),
      source_type: "Pathology",
      subspecialty: ophCodeToSubspecialtyLabel(p.subspecialty),
      language: OPH_SUB_LANG,
      author: null,
      publication_date: null,
      evidence_level: "Curated pathology",
      content: joinNonEmpty([
        `Patología: ${p.name_es || p.name_en}`,
        p.icd10_codes?.length ? `ICD-10: ${p.icd10_codes.join(", ")}` : null,
        p.epidemiology_es && `Epidemiología: ${p.epidemiology_es}`,
        p.risk_factors_es && `Factores de riesgo: ${p.risk_factors_es}`,
        p.clinical_features_es && `Clínica: ${p.clinical_features_es}`,
        p.diagnostic_workup_es && `Diagnóstico: ${p.diagnostic_workup_es}`,
        p.differential_diagnosis_es && `Diferencial: ${p.differential_diagnosis_es}`,
        p.treatment_overview_es && `Tratamiento: ${p.treatment_overview_es}`,
        p.follow_up_es && `Seguimiento: ${p.follow_up_es}`,
        p.red_flags_es && `Banderas rojas: ${p.red_flags_es}`,
      ]),
    });
  }

  // Medications
  const { data: meds } = await supabaseAdmin
    .from("oph_medications")
    .select(
      "id, generic_name_es, generic_name_en, brand_names, medication_class, route, mechanism_es, common_uses_es, contraindications_es, adverse_effects_es, monitoring_es",
    )
    .eq("status", "approved")
    .eq("is_active", true);
  for (const m of meds ?? []) {
    const name = m.generic_name_es || m.generic_name_en;
    docs.push({
      external_id: `oph-medication-${m.id}`,
      title: `Fármaco: ${name}`,
      description: (m.common_uses_es ?? "").slice(0, 280),
      source_type: "Medication",
      subspecialty: "General",
      language: OPH_SUB_LANG,
      author: null,
      publication_date: null,
      evidence_level: "Drug monograph",
      content: joinNonEmpty([
        `Fármaco (DCI): ${name}`,
        m.brand_names?.length ? `Marcas: ${m.brand_names.join(", ")}` : null,
        `Clase: ${m.medication_class} · Vía: ${m.route}`,
        m.mechanism_es && `Mecanismo: ${m.mechanism_es}`,
        m.common_uses_es && `Usos: ${m.common_uses_es}`,
        m.contraindications_es && `Contraindicaciones: ${m.contraindications_es}`,
        m.adverse_effects_es && `Efectos adversos: ${m.adverse_effects_es}`,
        m.monitoring_es && `Monitorización: ${m.monitoring_es}`,
      ]),
    });
  }

  // Guidelines
  const { data: guides } = await supabaseAdmin
    .from("oph_guidelines")
    .select(
      "id, title, organization, country_region, subspecialty, publication_year, summary_es, key_recommendations_es, url",
    )
    .eq("status", "approved")
    .eq("is_active", true);
  for (const g of guides ?? []) {
    docs.push({
      external_id: `oph-guideline-${g.id}`,
      title: g.title,
      description: (g.summary_es ?? "").slice(0, 280),
      source_type: "Guideline",
      subspecialty: ophCodeToSubspecialtyLabel(g.subspecialty),
      language: OPH_SUB_LANG,
      author: g.organization ?? null,
      publication_date: g.publication_year ? `${g.publication_year}-01-01` : null,
      evidence_level: "Clinical guideline",
      content: joinNonEmpty([
        `Guía: ${g.title}`,
        g.organization && `Organización: ${g.organization}`,
        g.country_region && `Región: ${g.country_region}`,
        g.summary_es && `Resumen: ${g.summary_es}`,
        g.key_recommendations_es && `Recomendaciones clave: ${g.key_recommendations_es}`,
        g.url && `URL: ${g.url}`,
      ]),
    });
  }

  // Classifications
  const { data: clsRows } = await supabaseAdmin
    .from("oph_classifications")
    .select(
      "id, name, acronym, subspecialty, description_es, clinical_use_es, oph_classification_items(code, label_es, definition_es, item_order)",
    )
    .eq("status", "approved")
    .eq("is_active", true);
  for (const c of clsRows ?? []) {
    const items = ((c as any).oph_classification_items ?? [])
      .slice()
      .sort((a: any, b: any) => (a.item_order ?? 0) - (b.item_order ?? 0))
      .map(
        (it: any) =>
          `- ${it.code ?? ""} ${it.label_es ?? ""}${it.definition_es ? `: ${it.definition_es}` : ""}`,
      )
      .join("\n");
    docs.push({
      external_id: `oph-classification-${c.id}`,
      title: c.acronym ? `${c.name} (${c.acronym})` : c.name,
      description: (c.clinical_use_es ?? c.description_es ?? "").slice(0, 280),
      source_type: "Classification",
      subspecialty: ophCodeToSubspecialtyLabel(c.subspecialty),
      language: OPH_SUB_LANG,
      author: null,
      publication_date: null,
      evidence_level: "Validated classification",
      content: joinNonEmpty([
        `Clasificación: ${c.name}${c.acronym ? ` (${c.acronym})` : ""}`,
        c.description_es && `Descripción: ${c.description_es}`,
        c.clinical_use_es && `Uso clínico: ${c.clinical_use_es}`,
        items && `Estadios/Items:\n${items}`,
      ]),
    });
  }

  // Protocols
  const { data: protos } = await supabaseAdmin
    .from("oph_protocols")
    .select(
      "id, title_es, title_en, subspecialty, objective_es, inclusion_criteria_es, exclusion_criteria_es, step_by_step_es, investigations_es, treatment_algorithm_es, follow_up_es, red_flags_es",
    )
    .eq("status", "approved")
    .eq("is_active", true);
  for (const p of protos ?? []) {
    docs.push({
      external_id: `oph-protocol-${p.id}`,
      title: `Protocolo: ${p.title_es || p.title_en}`,
      description: (p.objective_es ?? "").slice(0, 280),
      source_type: "Protocol",
      subspecialty: ophCodeToSubspecialtyLabel(p.subspecialty),
      language: OPH_SUB_LANG,
      author: null,
      publication_date: null,
      evidence_level: "Clinical protocol",
      content: joinNonEmpty([
        `Protocolo: ${p.title_es || p.title_en}`,
        p.objective_es && `Objetivo: ${p.objective_es}`,
        p.inclusion_criteria_es && `Criterios inclusión: ${p.inclusion_criteria_es}`,
        p.exclusion_criteria_es && `Criterios exclusión: ${p.exclusion_criteria_es}`,
        p.investigations_es && `Estudios: ${p.investigations_es}`,
        p.step_by_step_es && `Pasos: ${p.step_by_step_es}`,
        p.treatment_algorithm_es && `Algoritmo: ${p.treatment_algorithm_es}`,
        p.follow_up_es && `Seguimiento: ${p.follow_up_es}`,
        p.red_flags_es && `Banderas rojas: ${p.red_flags_es}`,
      ]),
    });
  }

  // Devices
  const { data: devs } = await supabaseAdmin
    .from("oph_devices")
    .select(
      "id, name, manufacturer, device_category, subspecialty, description_es, intended_use_es, indications_es, limitations_es, safety_notes_es",
    )
    .eq("status", "approved")
    .eq("is_active", true);
  for (const d of devs ?? []) {
    docs.push({
      external_id: `oph-device-${d.id}`,
      title: `Dispositivo: ${d.name}`,
      description: (d.intended_use_es ?? d.description_es ?? "").slice(0, 280),
      source_type: "Device",
      subspecialty: ophCodeToSubspecialtyLabel(d.subspecialty),
      language: OPH_SUB_LANG,
      author: d.manufacturer ?? null,
      publication_date: null,
      evidence_level: "Device monograph",
      content: joinNonEmpty([
        `Dispositivo: ${d.name}`,
        d.manufacturer && `Fabricante: ${d.manufacturer}`,
        d.device_category && `Categoría: ${d.device_category}`,
        d.description_es && `Descripción: ${d.description_es}`,
        d.intended_use_es && `Uso previsto: ${d.intended_use_es}`,
        d.indications_es && `Indicaciones: ${d.indications_es}`,
        d.limitations_es && `Limitaciones: ${d.limitations_es}`,
        d.safety_notes_es && `Seguridad: ${d.safety_notes_es}`,
      ]),
    });
  }

  // Filter out docs whose content is too short to be useful
  return docs.filter((d) => d.content.trim().length >= MIN_CONTENT_CHARS);
}

export async function reindexEvidenceCorpus(): Promise<QualityReport> {
  const staticDocs = buildDocs();
  const ophDocs = await buildOphDocsFromDb();
  const docs = [...staticDocs, ...ophDocs];
  const issues: QualityIssue[] = [];

  const duplicate_external_ids = findDuplicates(docs.map((d) => d.external_id));
  if (duplicate_external_ids.length) {
    issues.push({
      severity: "error",
      code: "duplicate_external_id",
      message: `Hay ${duplicate_external_ids.length} external_id repetidos en el KB.`,
      detail: duplicate_external_ids,
    });
  }
  const duplicate_titles = findDuplicates(docs.map((d) => d.title.toLowerCase()));
  if (duplicate_titles.length) {
    issues.push({
      severity: "warning",
      code: "duplicate_title",
      message: `Hay ${duplicate_titles.length} títulos repetidos.`,
      detail: duplicate_titles,
    });
  }
  const short_content_docs = docs
    .filter((d) => (d.content?.trim().length ?? 0) < MIN_CONTENT_CHARS)
    .map((d) => d.external_id);
  if (short_content_docs.length) {
    issues.push({
      severity: "warning",
      code: "short_content",
      message: `${short_content_docs.length} documentos con contenido <${MIN_CONTENT_CHARS} caracteres.`,
      detail: short_content_docs,
    });
  }

  await supabaseAdmin
    .from("ai_knowledge_sources")
    .delete()
    .in("metadata->>imported_from", ["ophthalmology-evidence", "oph-tables"]);

  const sourceRows = docs.map((d) => ({
    title: d.title,
    description: d.description,
    source_type: d.source_type,
    subspecialty: d.subspecialty,
    language: d.language,
    author: d.author,
    publication_date: d.publication_date,
    evidence_level: d.evidence_level,
    approval_status: "Approved",
    is_active: true,
    validation_level: "OR Reviewed",
    metadata: {
      imported_from: d.external_id.startsWith("oph-") ? "oph-tables" : "ophthalmology-evidence",
      external_id: d.external_id,
    },
  }));

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("ai_knowledge_sources")
    .insert(sourceRows)
    .select("id, metadata");
  if (insErr) throw new Error(`insert sources failed: ${insErr.message}`);

  const byExt = new Map<string, string>();
  for (const row of inserted ?? []) {
    const ext = (row.metadata as { external_id?: string } | null)?.external_id;
    if (ext) byExt.set(ext, row.id as string);
  }

  // Split each document into overlapping chunks so long monographs are matched
  // at passage level instead of as one giant vector. Each chunk keeps a back
  // reference to its source via external_id.
  const pendingChunks = docs.flatMap((d) =>
    chunkContent(d.content).map((content, chunk_index) => ({
      external_id: d.external_id,
      chunk_index,
      content,
    })),
  );

  const embeddings = await embedInBatches(
    pendingChunks.map((c) => c.content),
    32,
  );
  const embedding_dims = embeddings[0]?.length ?? null;

  const missingExt = new Set<string>();
  const chunkRows = pendingChunks
    .map((c, i) => {
      const source_id = byExt.get(c.external_id);
      const embedding = embeddings[i];
      if (!source_id || !embedding) {
        missingExt.add(c.external_id);
        return null;
      }
      return {
        source_id,
        chunk_index: c.chunk_index,
        content: c.content,
        embedding: embedding as unknown as string,
        token_count: Math.round(c.content.length / 4),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const missing_embeddings = [...missingExt];

  if (missing_embeddings.length) {
    issues.push({
      severity: "error",
      code: "missing_embedding",
      message: `${missing_embeddings.length} documentos sin embedding generado.`,
      detail: missing_embeddings,
    });
  }

  let chunks_inserted = 0;
  for (let i = 0; i < chunkRows.length; i += 50) {
    const batch = chunkRows.slice(i, i + 50);
    const { error } = await supabaseAdmin.from("ai_chunks").insert(batch);
    if (error) throw new Error(`insert chunks failed: ${error.message}`);
    chunks_inserted += batch.length;
  }

  const { count: srcCount } = await supabaseAdmin
    .from("ai_knowledge_sources")
    .select("id", { count: "exact", head: true })
    .in("metadata->>imported_from", ["ophthalmology-evidence", "oph-tables"]);

  const importedIds = (inserted ?? []).map((r) => r.id as string);
  const { count: chunkCount } = await supabaseAdmin
    .from("ai_chunks")
    .select("id", { count: "exact", head: true })
    .in("source_id", importedIds.length ? importedIds : ["00000000-0000-0000-0000-000000000000"]);

  // A source can now produce several chunks, so compare distinct sources that
  // received at least one chunk against the total inserted sources.
  const sourcesWithChunks = new Set(chunkRows.map((c) => c.source_id)).size;
  const orphan_sources = (srcCount ?? 0) - sourcesWithChunks;
  const orphan_chunks = (chunkCount ?? 0) - chunks_inserted;
  if (orphan_sources > 0) {
    issues.push({
      severity: "warning",
      code: "orphan_sources",
      message: `${orphan_sources} fuentes sin chunk asociado tras la indexación.`,
    });
  }

  if ((srcCount ?? 0) !== docs.length) {
    issues.push({
      severity: "warning",
      code: "source_count_mismatch",
      message: `Esperaban ${docs.length} fuentes, contadas ${srcCount ?? 0}.`,
    });
  }

  const report: QualityReport = {
    generated_at: new Date().toISOString(),
    expected_docs: docs.length,
    sources_inserted: inserted?.length ?? 0,
    chunks_inserted,
    embedding_dims,
    duplicate_external_ids,
    duplicate_titles,
    short_content_docs,
    missing_embeddings,
    orphan_chunks: Math.max(0, orphan_chunks),
    orphan_sources: Math.max(0, orphan_sources),
    by_subspecialty: tally(docs.map((d) => d.subspecialty)),
    by_language: tally(docs.map((d) => d.language)),
    by_source_type: tally(docs.map((d) => d.source_type)),
    issues,
    ok: issues.every((i) => i.severity !== "error"),
  };

  await supabaseAdmin
    .from("ai_knowledge_sources")
    .delete()
    .eq("metadata->>imported_from", "ophthalmology-evidence-report");
  await supabaseAdmin.from("ai_knowledge_sources").insert({
    title: `Informe de calidad del corpus (${report.generated_at})`,
    description: `${report.sources_inserted} fuentes · ${report.chunks_inserted} chunks · ${report.issues.length} avisos`,
    source_type: "Report",
    subspecialty: "general_ophthalmology",
    language: "es",
    approval_status: "Approved",
    is_active: false,
    validation_level: "OR Reviewed",
    metadata: JSON.parse(
      JSON.stringify({ imported_from: "ophthalmology-evidence-report", report }),
    ),
  });

  return report;
}

export async function getLastQualityReport(): Promise<QualityReport | null> {
  const { data } = await supabaseAdmin
    .from("ai_knowledge_sources")
    .select("metadata, created_at")
    .eq("metadata->>imported_from", "ophthalmology-evidence-report")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const meta = data?.metadata as { report?: QualityReport } | null;
  return meta?.report ?? null;
}
