// Canonicalisation between the `oph_subspecialty` enum codes used by the
// curated clinical tables / knowledge-block seeds (e.g. "ocular_surface") and
// the UI `Subspecialty` labels the app sends with every query (e.g.
// "Ocular Surface"). `match_ai_chunks` filters by exact string match, so a
// mismatch here silently hides curated content from RAG retrieval.

import type { Subspecialty } from "./types";

const CODE_TO_LABEL: Record<string, Subspecialty> = {
  retina: "Retina",
  glaucoma: "Glaucoma",
  cornea: "Cornea",
  ocular_surface: "Ocular Surface",
  cataract: "Cataract",
  refractive: "Refractive Surgery",
  uveitis: "Uveitis",
  oculoplastics: "Oculoplastics",
  neuro_ophthalmology: "Neuro-Ophthalmology",
  neuro: "Neuro-Ophthalmology",
  pediatric_ophthalmology: "Pediatric Ophthalmology",
  pediatric: "Pediatric Ophthalmology",
  // Subspecialties without a dedicated UI bucket fall back to the closest one.
  strabismus: "Pediatric Ophthalmology",
  contactology: "Contactology",
  low_vision: "General",
  ocular_oncology: "General",
  ocular_trauma: "General",
  emergency_ophthalmology: "General",
  general_ophthalmology: "General",
};

// Accept values that already arrive as UI labels so the mapping is idempotent.
const LABEL_SET = new Set<string>(Object.values(CODE_TO_LABEL));

/**
 * Map an `oph_subspecialty` enum code (or an already-canonical UI label) to the
 * UI `Subspecialty` label used for retrieval filtering. Unknown values fall
 * back to "General" so the content remains retrievable rather than orphaned.
 */
export function ophCodeToSubspecialtyLabel(value: string | null | undefined): Subspecialty {
  if (!value) return "General";
  if (LABEL_SET.has(value)) return value as Subspecialty;
  const key = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return CODE_TO_LABEL[key] ?? "General";
}
