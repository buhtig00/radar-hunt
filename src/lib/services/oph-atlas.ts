/**
 * Atlas / Evidence service backed by `oph_*` tables.
 *
 * Lee únicamente contenido aprobado (status='approved' AND is_active=true) gracias
 * a las políticas RLS de cada tabla. Cuando Supabase no está configurado o la
 * tabla está vacía, devuelve [] y los componentes hacen merge con los arrays
 * estáticos de demostración existentes.
 */

import { supabase, isSupabaseConfigured } from "@/lib/db/client";
import type {
  AtlasPathology,
  AtlasDrug,
  AtlasDevice,
  AtlasGuideline,
  AtlasClassification,
} from "@/lib/ophthalmology-atlas";
import type { ClinicalProtocol } from "@/lib/ophthalmology-evidence";
import type { Subspecialty } from "@/lib/types";

/* ---------- subspecialty mapping (DB enum → UI label) ---------- */
const SUB_MAP: Record<string, Subspecialty> = {
  retina: "Retina",
  glaucoma: "Glaucoma",
  cornea: "Cornea",
  ocular_surface: "Ocular Surface",
  cataract: "Cataract",
  refractive: "Refractive Surgery",
  uveitis: "Uveitis",
  oculoplastics: "Oculoplastics",
  neuro_ophthalmology: "Neuro-Ophthalmology",
  pediatric_ophthalmology: "Pediatric Ophthalmology",
  contactology: "Contactology",
  general_ophthalmology: "General",
};
const mapSub = (s: string | null | undefined): Subspecialty => (s && SUB_MAP[s]) || "General";

const splitLines = (s: string | null | undefined): string[] =>
  (s ?? "")
    .split(/\r?\n|•|·|;|\u2022/)
    .map((l) => l.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean);

const empty = <T>(): T[] => [];

/* ============================================================
 *                       PATHOLOGIES
 * ============================================================ */
export async function fetchOphPathologies(): Promise<AtlasPathology[]> {
  if (!isSupabaseConfigured || !supabase) return empty();
  const { data, error } = await supabase
    .from("oph_pathologies")
    .select(
      "id, slug, name_es, name_en, subspecialty, icd10_codes, epidemiology_es, risk_factors_es, clinical_features_es, diagnostic_workup_es, differential_diagnosis_es, treatment_overview_es, follow_up_es, red_flags_es",
    )
    .eq("status", "approved")
    .eq("is_active", true);
  if (error || !data) return empty();
  return data.map(
    (r): AtlasPathology => ({
      id: `db-${r.id}`,
      name_es: r.name_es,
      name_en: r.name_en,
      subspecialty: mapSub(r.subspecialty),
      prevalence: r.epidemiology_es ?? "—",
      etiology: splitLines(r.risk_factors_es),
      symptoms: splitLines(r.clinical_features_es),
      signs: splitLines(r.clinical_features_es),
      diagnostics: splitLines(r.diagnostic_workup_es),
      differential: splitLines(r.differential_diagnosis_es),
      treatment_steps: splitLines(r.treatment_overview_es),
      complications: [],
      prognosis: r.follow_up_es ?? "—",
      red_flags: splitLines(r.red_flags_es),
      guidelines: [],
      icd10: (r.icd10_codes ?? [])[0],
    }),
  );
}

/* ============================================================
 *                       MEDICATIONS
 * ============================================================ */
export async function fetchOphMedications(): Promise<AtlasDrug[]> {
  if (!isSupabaseConfigured || !supabase) return empty();
  const { data, error } = await supabase
    .from("oph_medications")
    .select(
      "id, generic_name_en, generic_name_es, brand_names, medication_class, route, mechanism_es, common_uses_es, contraindications_es, adverse_effects_es, monitoring_es",
    )
    .eq("status", "approved")
    .eq("is_active", true);
  if (error || !data) return empty();
  return data.map(
    (r): AtlasDrug => ({
      id: `db-${r.id}`,
      inn: r.generic_name_es || r.generic_name_en,
      brand_examples: r.brand_names ?? [],
      drug_class: `${r.medication_class ?? "—"} · ${r.route ?? ""}`.trim(),
      indications: splitLines(r.common_uses_es),
      posology: r.monitoring_es ?? "—",
      mechanism: r.mechanism_es ?? "—",
      contraindications: splitLines(r.contraindications_es),
      adverse_effects: splitLines(r.adverse_effects_es),
    }),
  );
}

/* ------------ Rich medications with indications join ------------ */

export interface RichMedicationIndication {
  pathology_id: string | null;
  pathology_name: string | null;
  pathology_subspecialty: string | null;
  indication_es: string | null;
  indication_en: string | null;
  line_of_therapy: string | null;
  evidence_level: string | null;
  notes_es: string | null;
}

export interface RichMedication {
  id: string;
  inn: string;
  generic_name_en: string | null;
  brand_names: string[];
  medication_class: string;
  route: string;
  mechanism_es: string | null;
  common_uses_es: string | null;
  contraindications_es: string | null;
  adverse_effects_es: string | null;
  monitoring_es: string | null;
  is_intravitreal: boolean;
  indications: RichMedicationIndication[];
}

export async function fetchOphMedicationsRich(): Promise<RichMedication[]> {
  if (!isSupabaseConfigured || !supabase) return empty();
  const { data, error } = await supabase
    .from("oph_medications")
    .select(
      `id, generic_name_en, generic_name_es, brand_names, medication_class, route,
       mechanism_es, common_uses_es, contraindications_es, adverse_effects_es,
       monitoring_es, is_intravitreal,
       oph_medication_indications!oph_medication_indications_medication_id_fkey(
         indication_es, indication_en, line_of_therapy, evidence_level, notes_es,
         status, is_active,
         pathology:oph_pathologies(id, name_es, name_en, subspecialty)
       )`,
    )
    .eq("status", "approved")
    .eq("is_active", true);
  if (error || !data) return empty();
  return data.map(
    (r: any): RichMedication => ({
      id: r.id,
      inn: r.generic_name_es || r.generic_name_en,
      generic_name_en: r.generic_name_en,
      brand_names: r.brand_names ?? [],
      medication_class: r.medication_class ?? "other",
      route: r.route ?? "other",
      mechanism_es: r.mechanism_es,
      common_uses_es: r.common_uses_es,
      contraindications_es: r.contraindications_es,
      adverse_effects_es: r.adverse_effects_es,
      monitoring_es: r.monitoring_es,
      is_intravitreal: !!r.is_intravitreal,
      indications: ((r.oph_medication_indications ?? []) as any[])
        .filter((mi) => mi.status === "approved" && mi.is_active)
        .map((mi) => ({
          pathology_id: mi.pathology?.id ?? null,
          pathology_name: mi.pathology?.name_es ?? mi.pathology?.name_en ?? null,
          pathology_subspecialty: mi.pathology?.subspecialty ?? null,
          indication_es: mi.indication_es,
          indication_en: mi.indication_en,
          line_of_therapy: mi.line_of_therapy,
          evidence_level: mi.evidence_level,
          notes_es: mi.notes_es,
        })),
    }),
  );
}

/* ============================================================
 *                       DEVICES
 * ============================================================ */
export async function fetchOphDevices(): Promise<AtlasDevice[]> {
  if (!isSupabaseConfigured || !supabase) return empty();
  const { data, error } = await supabase
    .from("oph_devices")
    .select("id, name, manufacturer, device_category, intended_use_es, indications_es")
    .eq("status", "approved")
    .eq("is_active", true);
  if (error || !data) return empty();
  const CAT_MAP: Record<string, AtlasDevice["category"]> = {
    diagnostic_imaging: "Imaging",
    surgical_instrument: "Surgical",
    intraocular_lens: "Implant",
    laser_system: "Laser",
    diagnostic_device: "Diagnostic",
  };
  return data.map(
    (r): AtlasDevice => ({
      id: `db-${r.id}`,
      name: r.name,
      category: CAT_MAP[r.device_category as string] ?? "Diagnostic",
      manufacturer: r.manufacturer ?? "—",
      indications: splitLines(r.indications_es || r.intended_use_es),
    }),
  );
}

/* ============================================================
 *                       GUIDELINES
 * ============================================================ */
export async function fetchOphGuidelines(): Promise<AtlasGuideline[]> {
  if (!isSupabaseConfigured || !supabase) return empty();
  const { data, error } = await supabase
    .from("oph_guidelines")
    .select(
      "id, title, organization, publication_year, subspecialty, summary_es, key_recommendations_es, url",
    )
    .eq("status", "approved")
    .eq("is_active", true);
  if (error || !data) return empty();
  return data.map(
    (r): AtlasGuideline => ({
      id: `db-${r.id}`,
      title: r.title,
      society: r.organization,
      year: r.publication_year ?? new Date().getFullYear(),
      subspecialty: mapSub(r.subspecialty),
      scope: r.summary_es ?? "",
      key_recommendations: splitLines(r.key_recommendations_es),
      url_hint: r.url ?? undefined,
    }),
  );
}

/* ============================================================
 *                       CLASSIFICATIONS
 * ============================================================ */
export async function fetchOphClassifications(): Promise<AtlasClassification[]> {
  if (!isSupabaseConfigured || !supabase) return empty();
  const { data, error } = await supabase
    .from("oph_classifications")
    .select(
      "id, name, acronym, subspecialty, clinical_use_es, oph_classification_items(code, label_es, label_en, definition_es, item_order)",
    )
    .eq("status", "approved")
    .eq("is_active", true);
  if (error || !data) return empty();
  return data.map(
    (r: any): AtlasClassification => ({
      id: `db-${r.id}`,
      name: r.acronym ? `${r.name} (${r.acronym})` : r.name,
      subspecialty: mapSub(r.subspecialty),
      use: r.clinical_use_es ?? "",
      stages: (r.oph_classification_items ?? [])
        .slice()
        .sort((a: any, b: any) => (a.item_order ?? 0) - (b.item_order ?? 0))
        .map((it: any) => ({
          code: it.code ?? it.label_en?.slice(0, 6) ?? "—",
          description: it.label_es || it.definition_es || it.label_en || "—",
        })),
    }),
  );
}

/* ============================================================
 *                       PROTOCOLS  (Evidence)
 * ============================================================ */
export async function fetchOphProtocols(): Promise<ClinicalProtocol[]> {
  if (!isSupabaseConfigured || !supabase) return empty();
  const { data, error } = await supabase
    .from("oph_protocols")
    .select(
      "id, title_es, title_en, subspecialty, objective_es, inclusion_criteria_es, step_by_step_es, follow_up_es, red_flags_es, references_json",
    )
    .eq("status", "approved")
    .eq("is_active", true);
  if (error || !data) return empty();
  return data.map(
    (r: any): ClinicalProtocol => ({
      id: `db-${r.id}`,
      title: r.title_es || r.title_en,
      subspecialty: mapSub(r.subspecialty),
      context: [r.objective_es, r.inclusion_criteria_es].filter(Boolean).join(" · ") || "—",
      steps: splitLines(r.step_by_step_es),
      monitoring: splitLines(r.follow_up_es),
      pitfalls: splitLines(r.red_flags_es),
      source:
        Array.isArray(r.references_json) && r.references_json[0]
          ? String(
              r.references_json[0].citation ?? r.references_json[0].title ?? "Referencia editorial",
            )
          : "Protocolo editorial OR",
    }),
  );
}
