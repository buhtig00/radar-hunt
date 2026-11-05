/**
 * Taxonomía de familias farmacológicas oftálmicas.
 *
 * Agrupa los valores de la enum `oph_medication_class` (Supabase) en familias
 * clínicas con etiquetas ES/EN. Útil para filtros en cascada: Familia → Subclase
 * → Patología/Indicación.
 */

export type MedicationClass =
  | "anti_vegf"
  | "corticosteroid"
  | "antibiotic"
  | "antiviral"
  | "antifungal"
  | "anti_inflammatory_nsaid"
  | "immunomodulator"
  | "glaucoma_prostaglandin"
  | "glaucoma_beta_blocker"
  | "glaucoma_alpha_agonist"
  | "glaucoma_carbonic_anhydrase_inhibitor"
  | "glaucoma_rho_kinase_inhibitor"
  | "glaucoma_miotic"
  | "mydriatic_cycloplegic"
  | "lubricant_artificial_tear"
  | "osmotic_agent"
  | "local_anesthetic"
  | "anti_allergic"
  | "other";

export interface MedicationFamily {
  /** Slug interno estable para el filtro. */
  id: string;
  /** Etiqueta en español. */
  label_es: string;
  /** Etiqueta en inglés. */
  label_en: string;
  /** Subclases (medication_class) que pertenecen a esta familia. */
  classes: MedicationClass[];
  /** Descripción breve del grupo. */
  description_es: string;
}

export const MEDICATION_FAMILIES: MedicationFamily[] = [
  {
    id: "anti_vegf",
    label_es: "Anti-VEGF intravítreos",
    label_en: "Intravitreal anti-VEGF",
    classes: ["anti_vegf"],
    description_es: "Bloqueantes del factor de crecimiento vascular para DMAE, EMD, OVR.",
  },
  {
    id: "corticosteroids",
    label_es: "Corticoides oftálmicos",
    label_en: "Ophthalmic corticosteroids",
    classes: ["corticosteroid"],
    description_es: "Antiinflamatorios potentes tópicos, perioculares e intravítreos.",
  },
  {
    id: "nsaid",
    label_es: "AINE tópicos",
    label_en: "Topical NSAIDs",
    classes: ["anti_inflammatory_nsaid"],
    description_es: "Antiinflamatorios no esteroideos para EMQ, dolor postquirúrgico.",
  },
  {
    id: "immunomodulators",
    label_es: "Inmunomoduladores",
    label_en: "Immunomodulators",
    classes: ["immunomodulator"],
    description_es: "Ciclosporina, tacrolimus, lifitegrast: ojo seco e inflamación crónica.",
  },
  {
    id: "antibiotics",
    label_es: "Antibióticos",
    label_en: "Antibiotics",
    classes: ["antibiotic"],
    description_es: "Fluoroquinolonas, aminoglucósidos, macrólidos para infección ocular.",
  },
  {
    id: "antivirals",
    label_es: "Antivirales",
    label_en: "Antivirals",
    classes: ["antiviral"],
    description_es: "Aciclovir, ganciclovir, trifluridina: queratitis herpética, CMV.",
  },
  {
    id: "antifungals",
    label_es: "Antifúngicos",
    label_en: "Antifungals",
    classes: ["antifungal"],
    description_es: "Natamicina, voriconazol, anfotericina B para queratitis micóticas.",
  },
  {
    id: "antiallergics",
    label_es: "Antialérgicos / antihistamínicos",
    label_en: "Antiallergics / antihistamines",
    classes: ["anti_allergic"],
    description_es: "Olopatadina, azelastina, ketotifeno: conjuntivitis alérgica.",
  },
  {
    id: "glaucoma",
    label_es: "Hipotensores oculares (glaucoma)",
    label_en: "IOP-lowering (glaucoma)",
    classes: [
      "glaucoma_prostaglandin",
      "glaucoma_beta_blocker",
      "glaucoma_alpha_agonist",
      "glaucoma_carbonic_anhydrase_inhibitor",
      "glaucoma_rho_kinase_inhibitor",
      "glaucoma_miotic",
    ],
    description_es: "Análogos de PG, betabloqueantes, α-agonistas, IAC, rho-kinasa, mióticos.",
  },
  {
    id: "mydriatics",
    label_es: "Midriáticos y ciclopléjicos",
    label_en: "Mydriatics & cycloplegics",
    classes: ["mydriatic_cycloplegic"],
    description_es: "Tropicamida, ciclopentolato, atropina: exploración y uveítis.",
  },
  {
    id: "lubricants",
    label_es: "Lubricantes / lágrimas artificiales",
    label_en: "Lubricants / artificial tears",
    classes: ["lubricant_artificial_tear"],
    description_es: "Carboximetilcelulosa, hialurónico, trehalosa: superficie ocular.",
  },
  {
    id: "osmotics",
    label_es: "Agentes osmóticos",
    label_en: "Osmotic agents",
    classes: ["osmotic_agent"],
    description_es: "Manitol, glicerol: hipertensión ocular aguda, edema corneal.",
  },
  {
    id: "anesthetics",
    label_es: "Anestésicos locales",
    label_en: "Local anesthetics",
    classes: ["local_anesthetic"],
    description_es: "Tetracaína, oxibuprocaína, lidocaína: tonometría, cirugía menor.",
  },
  {
    id: "other",
    label_es: "Otros",
    label_en: "Other",
    classes: ["other"],
    description_es: "Sin clasificar / categorías especiales.",
  },
];

export const MEDICATION_CLASS_LABEL_ES: Record<MedicationClass, string> = {
  anti_vegf: "Anti-VEGF",
  corticosteroid: "Corticoide",
  antibiotic: "Antibiótico",
  antiviral: "Antiviral",
  antifungal: "Antifúngico",
  anti_inflammatory_nsaid: "AINE tópico",
  immunomodulator: "Inmunomodulador",
  glaucoma_prostaglandin: "Análogo de prostaglandina",
  glaucoma_beta_blocker: "Betabloqueante",
  glaucoma_alpha_agonist: "α-agonista",
  glaucoma_carbonic_anhydrase_inhibitor: "Inhibidor de anhidrasa carbónica",
  glaucoma_rho_kinase_inhibitor: "Inhibidor de Rho-kinasa",
  glaucoma_miotic: "Miótico",
  mydriatic_cycloplegic: "Midriático/ciclopléjico",
  lubricant_artificial_tear: "Lubricante / lágrima artificial",
  osmotic_agent: "Agente osmótico",
  local_anesthetic: "Anestésico local",
  anti_allergic: "Antialérgico",
  other: "Otro",
};

export const ROUTE_LABEL_ES: Record<string, string> = {
  topical_eye_drops: "Colirio tópico",
  topical_ointment: "Pomada tópica",
  intravitreal: "Intravítreo",
  periocular: "Periocular",
  intracameral: "Intracameral",
  subconjunctival: "Subconjuntival",
  oral: "Oral",
  iv_systemic: "Intravenoso sistémico",
  im_systemic: "Intramuscular sistémico",
  implant: "Implante",
  other: "Otra",
};

export const LINE_OF_THERAPY_LABEL_ES: Record<string, string> = {
  first_line: "1.ª línea",
  second_line: "2.ª línea",
  first_or_second_line: "1.ª / 2.ª línea",
  third_line: "3.ª línea",
  adjunct: "Adyuvante",
  rescue: "Rescate",
  off_label: "Off-label",
  perioperative: "Perioperatorio",
  prophylaxis: "Profilaxis",
};

export const EVIDENCE_LEVEL_LABEL_ES: Record<string, string> = {
  guideline: "Guía clínica",
  clinical_guideline: "Guía clínica",
  systematic_review: "Revisión sistemática",
  randomized_trial: "Ensayo aleatorizado",
  prospective_study: "Estudio prospectivo",
  retrospective_study: "Estudio retrospectivo",
  case_series: "Serie de casos",
  case_report: "Caso clínico",
  expert_consensus: "Consenso de expertos",
  consensus_statement: "Consenso de expertos",
  expert_opinion: "Opinión de experto",
  educational_reference: "Referencia educativa",
  classification_criteria: "Criterios de clasificación",
  regulatory_document: "Documento regulatorio",
  not_applicable: "No aplica",
};

export function prettyLineOfTherapy(v?: string | null): string {
  if (!v) return "—";
  return LINE_OF_THERAPY_LABEL_ES[v] ?? v.replace(/_/g, " ");
}

export function prettyEvidenceLevel(v?: string | null): string {
  if (!v) return "—";
  return EVIDENCE_LEVEL_LABEL_ES[v] ?? v.replace(/_/g, " ");
}

export function familyForClass(cls: string | null | undefined): MedicationFamily | undefined {
  if (!cls) return undefined;
  return MEDICATION_FAMILIES.find((f) => (f.classes as string[]).includes(cls));
}
