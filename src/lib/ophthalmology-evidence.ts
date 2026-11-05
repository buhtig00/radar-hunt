/**
 * Biblioteca de evidencia oftalmológica — base de datos de demostración.
 *
 * Contiene ensayos clínicos pivotales, protocolos clínico-quirúrgicos,
 * escalas de medida, guías de sociedades científicas y revisiones
 * Cochrane / NICE / NEI ampliamente referenciados en la literatura.
 *
 * Fuentes públicas referenciadas (sólo para contexto educativo del demo):
 *   - American Academy of Ophthalmology (AAO) Preferred Practice Patterns
 *   - EURETINA Clinical Guidelines
 *   - ESCRS Clinical Guidelines
 *   - European Glaucoma Society (EGS) Guidelines, 5th Edition
 *   - ICO (International Council of Ophthalmology) Guidelines
 *   - DRCR Retina Network (antes DRCR.net) Protocol series
 *   - NEI/NIH-sponsored landmark trials (ETDRS, DCCT, OHTS, AGIS, CIGTS, CNTGS…)
 *   - Cochrane Eyes and Vision Group systematic reviews
 *   - NICE Guidance (UK) en glaucoma, DMAE, retinopatía diabética
 *   - PubMed/NCBI, NEJM, Ophthalmology, JAMA Ophthalmology
 *
 * TODO: Requires medical/legal validation before production.
 * Todos los datos son resúmenes educativos; verificar siempre con la
 * fuente original antes de uso clínico.
 */

import type { Subspecialty } from "./types";
import {
  LANDMARK_TRIALS_EXT,
  CLINICAL_PROTOCOLS_EXT,
  CLINICAL_SCALES_EXT,
  SYSTEMATIC_REVIEWS_EXT,
  IV_DOSING_TABLE_EXT,
} from "./ophthalmology-evidence-extended";
import {
  LANDMARK_TRIALS_EXT3,
  CLINICAL_PROTOCOLS_EXT3,
  CLINICAL_SCALES_EXT3,
  SYSTEMATIC_REVIEWS_EXT3,
} from "./ophthalmology-evidence-extended-3";

/* ============================================================
 *               ENSAYOS CLÍNICOS PIVOTALES
 * ============================================================ */

export interface LandmarkTrial {
  id: string;
  acronym: string;
  full_name: string;
  year: number;
  subspecialty: Subspecialty;
  topic: string;
  design: string;
  population: string;
  intervention: string;
  primary_endpoint: string;
  key_results: string[];
  clinical_impact: string;
  sponsor?: string;
  reference: string;
}

const LANDMARK_TRIALS_BASE: LandmarkTrial[] = [
  /* ---------- Retina / DMAE ---------- */
  {
    id: "t-marina",
    acronym: "MARINA",
    full_name:
      "Minimally Classic/Occult Trial of the Anti-VEGF Antibody Ranibizumab in the Treatment of Neovascular AMD",
    year: 2006,
    subspecialty: "Retina",
    topic: "Ranibizumab en DMAE neovascular",
    design: "ECA fase III, doble ciego, 2 años, n=716",
    population: "DMAE húmeda con lesiones mínimamente clásicas u ocultas",
    intervention: "Ranibizumab 0.3 mg o 0.5 mg intravítreo mensual vs. sham",
    primary_endpoint: "Proporción que pierde <15 letras ETDRS a 12 meses",
    key_results: [
      "94.6% (0.5 mg) vs 62.2% sham mantuvieron visión",
      "Ganancia media +7.2 letras (0.5 mg) vs −10.4 sham a 12 m",
      "Beneficio sostenido a 24 meses",
    ],
    clinical_impact: "Estableció el bloqueo de VEGF como estándar en DMAE húmeda.",
    sponsor: "Genentech",
    reference: "Rosenfeld PJ, et al. N Engl J Med 2006;355:1419-31.",
  },
  {
    id: "t-anchor",
    acronym: "ANCHOR",
    full_name: "Anti-VEGF Antibody for the Treatment of Predominantly Classic CNV in AMD",
    year: 2006,
    subspecialty: "Retina",
    topic: "Ranibizumab vs TFD con verteporfina",
    design: "ECA fase III, 2 años, n=423",
    population: "DMAE húmeda predominantemente clásica",
    intervention: "Ranibizumab mensual vs TFD",
    primary_endpoint: "Pérdida <15 letras a 12 meses",
    key_results: [
      "96% ranibizumab vs 64% TFD mantuvieron visión",
      "Ganancia +11.3 letras (0.5 mg) vs −9.5 letras TFD",
    ],
    clinical_impact: "Confirmó superioridad de anti-VEGF sobre TFD.",
    reference: "Brown DM, et al. N Engl J Med 2006;355:1432-44.",
  },
  {
    id: "t-cattn",
    acronym: "CATT",
    full_name: "Comparison of Age-related Macular Degeneration Treatments Trials",
    year: 2011,
    subspecialty: "Retina",
    topic: "Bevacizumab vs ranibizumab en DMAE",
    design: "ECA no inferioridad, 2 años, n=1208 (NEI)",
    population: "DMAE húmeda tratamiento-naïve",
    intervention: "Bevacizumab vs ranibizumab; mensual vs PRN",
    primary_endpoint: "Cambio medio de AV a 1 año",
    key_results: [
      "Bevacizumab no inferior a ranibizumab",
      "PRN no inferior a mensual (límite estrecho)",
      "Tasa de efectos adversos sistémicos similar",
    ],
    clinical_impact: "Sustentó el uso off-label de bevacizumab por coste-efectividad.",
    sponsor: "NEI",
    reference: "CATT Research Group. N Engl J Med 2011;364:1897-908.",
  },
  {
    id: "t-view",
    acronym: "VIEW 1/2",
    full_name: "VEGF Trap-Eye: Investigation of Efficacy and Safety in Wet AMD",
    year: 2012,
    subspecialty: "Retina",
    topic: "Aflibercept en DMAE",
    design: "Dos ECA fase III gemelos, n≈2400",
    population: "DMAE húmeda",
    intervention: "Aflibercept 2 mg q4w/q8w vs ranibizumab q4w",
    primary_endpoint: "No inferioridad en mantenimiento visual a 52 semanas",
    key_results: [
      "Aflibercept q8w no inferior a ranibizumab mensual",
      "Reducción de carga inyectable con mantenimiento de eficacia",
    ],
    clinical_impact: "Habilitó pautas bimensuales con aflibercept 2 mg.",
    reference: "Heier JS, et al. Ophthalmology 2012;119:2537-48.",
  },
  {
    id: "t-tenaya-lucerne",
    acronym: "TENAYA / LUCERNE",
    full_name: "Faricimab in Neovascular AMD",
    year: 2022,
    subspecialty: "Retina",
    topic: "Faricimab (anti-VEGF/Ang-2) en DMAE",
    design: "Dos ECA fase III, 2 años, n≈1300",
    population: "DMAE neovascular",
    intervention: "Faricimab 6 mg PTI hasta q16w vs aflibercept 2 mg q8w",
    primary_endpoint: "Cambio medio de AV a 48 semanas (no inferioridad)",
    key_results: [
      "AV equivalente con intervalos extendidos",
      "≈45% de pacientes en q16w al año",
      "Perfil de seguridad comparable",
    ],
    clinical_impact: "Pivot para pautas con bajo número de inyecciones.",
    reference: "Heier JS, et al. Lancet 2022;399:729-40.",
  },
  {
    id: "t-pulsar",
    acronym: "PULSAR",
    full_name: "Aflibercept 8 mg in Neovascular AMD",
    year: 2023,
    subspecialty: "Retina",
    topic: "Aflibercept 8 mg dosis alta",
    design: "ECA fase III, 96 semanas, n≈1009",
    population: "DMAE húmeda",
    intervention: "Aflibercept 8 mg q12w/q16w vs 2 mg q8w",
    primary_endpoint: "Cambio AV a 48 semanas (no inferioridad)",
    key_results: [
      "No inferioridad demostrada con intervalos hasta q16w",
      "Seguridad ocular comparable",
    ],
    clinical_impact: "Soporta pautas extendidas q12/16 semanas.",
    reference: "Lanzetta P, et al. Lancet 2024;403:1153-63.",
  },
  /* ---------- Retina / Diabetes ---------- */
  {
    id: "t-etdrs",
    acronym: "ETDRS",
    full_name: "Early Treatment Diabetic Retinopathy Study",
    year: 1985,
    subspecialty: "Retina",
    topic: "Láser focal/PRP y aspirina en RD",
    design: "ECA multicéntrico NEI, n=3711",
    population: "RD no proliferativa y proliferativa temprana",
    intervention: "Fotocoagulación focal/grid o PRP precoz vs diferida",
    primary_endpoint: "Pérdida visual severa",
    key_results: [
      "Láser focal reduce pérdida visual moderada en EMC ≈50%",
      "PRP precoz no superior si RDP de bajo riesgo",
      "Aspirina no aumenta hemorragia vítrea",
    ],
    clinical_impact: "Definió las indicaciones clásicas de láser en RD y EMC.",
    sponsor: "NEI",
    reference: "ETDRS Reports 1-27 (1985-1996).",
  },
  {
    id: "t-protocol-t",
    acronym: "DRCR Protocol T",
    full_name: "Aflibercept, Bevacizumab, or Ranibizumab for Diabetic Macular Edema",
    year: 2015,
    subspecialty: "Retina",
    topic: "Comparación head-to-head anti-VEGF en EMD",
    design: "ECA, 2 años, n=660",
    population: "EMD con afectación central",
    intervention: "Aflibercept vs bevacizumab vs ranibizumab PRN",
    primary_endpoint: "Cambio medio de AV a 1 año",
    key_results: [
      "Si AV inicial ≤20/50, aflibercept superior",
      "Si AV inicial ≥20/40, equivalentes",
      "A 2 años se mantiene la ventaja de aflibercept en peor visión",
    ],
    clinical_impact: "Selección de anti-VEGF guiada por AV basal.",
    sponsor: "DRCR Retina Network / NEI",
    reference: "Wells JA, et al. N Engl J Med 2015;372:1193-203.",
  },
  {
    id: "t-protocol-s",
    acronym: "DRCR Protocol S",
    full_name: "Ranibizumab vs Panretinal Photocoagulation for Proliferative DR",
    year: 2015,
    subspecialty: "Retina",
    topic: "Anti-VEGF vs PRP en RDP",
    design: "ECA, 2 años, n=305 pacientes / 394 ojos",
    population: "RDP",
    intervention: "Ranibizumab vs PRP",
    primary_endpoint: "Cambio AV a 2 años (no inferioridad)",
    key_results: [
      "No inferioridad de ranibizumab",
      "Menos pérdida de CV y menos vitrectomías con anti-VEGF",
      "Mejor en pacientes con EMD coexistente",
    ],
    clinical_impact: "Anti-VEGF como alternativa a PRP en RDP seleccionada.",
    reference: "Gross JG, et al. JAMA 2015;314:2137-46.",
  },
  {
    id: "t-dcct",
    acronym: "DCCT",
    full_name: "Diabetes Control and Complications Trial",
    year: 1993,
    subspecialty: "Retina",
    topic: "Control glucémico intensivo en DM1",
    design: "ECA, 6.5 años, n=1441",
    population: "Diabetes tipo 1",
    intervention: "Insulina intensiva vs convencional",
    primary_endpoint: "Aparición/progresión de RD",
    key_results: [
      "Reducción 76% en aparición de RD",
      "Reducción 54% en progresión",
      "Beneficio mantenido (legado) en EDIC",
    ],
    clinical_impact: "Cimentó el papel del control metabólico estricto.",
    sponsor: "NIDDK/NEI",
    reference: "DCCT Research Group. N Engl J Med 1993;329:977-86.",
  },
  {
    id: "t-ukpds",
    acronym: "UKPDS",
    full_name: "United Kingdom Prospective Diabetes Study",
    year: 1998,
    subspecialty: "Retina",
    topic: "Control glucémico y tensional en DM2",
    design: "ECA largo plazo, n=5102",
    population: "DM2 recién diagnosticada",
    intervention: "Tratamiento intensivo vs convencional",
    primary_endpoint: "Complicaciones micro/macrovasculares",
    key_results: [
      "Cada 1% reducción HbA1c → 35% menos complicaciones microvasculares",
      "TA ajustada reduce 47% pérdida visual severa",
    ],
    clinical_impact: "Soporte para control tensional estricto en DM2.",
    reference: "UKPDS Group. Lancet 1998;352:837-53.",
  },
  /* ---------- Retina / OVR / Otras ---------- */
  {
    id: "t-cruise",
    acronym: "CRUISE/BRAVO",
    full_name: "Ranibizumab for Macular Edema after CRVO/BRVO",
    year: 2010,
    subspecialty: "Retina",
    topic: "Anti-VEGF en oclusiones venosas",
    design: "ECA fase III, 6 meses + extensión",
    population: "Edema macular tras OVCR (CRUISE) y ORVR (BRAVO)",
    intervention: "Ranibizumab mensual vs sham",
    primary_endpoint: "Cambio AV a 6 meses",
    key_results: ["+12.7 (BRAVO) y +14.9 (CRUISE) letras vs sham", "Buena tolerancia"],
    clinical_impact: "Anti-VEGF como primera línea en edema macular por OVR.",
    reference: "Campochiaro PA, et al. Ophthalmology 2010;117:1102-12.",
  },
  /* ---------- Glaucoma ---------- */
  {
    id: "t-ohts",
    acronym: "OHTS",
    full_name: "Ocular Hypertension Treatment Study",
    year: 2002,
    subspecialty: "Glaucoma",
    topic: "Tratamiento preventivo en HTO",
    design: "ECA, 5 años, n=1636",
    population: "HTO sin daño glaucomatoso",
    intervention: "Hipotensores tópicos vs observación",
    primary_endpoint: "Conversión a glaucoma",
    key_results: [
      "Reducción del 50% en conversión a glaucoma",
      "Paquimetría delgada como factor de riesgo principal",
    ],
    clinical_impact: "Permitió estratificación del riesgo en HTO.",
    sponsor: "NEI",
    reference: "Kass MA, et al. Arch Ophthalmol 2002;120:701-13.",
  },
  {
    id: "t-cntgs",
    acronym: "CNTGS",
    full_name: "Collaborative Normal-Tension Glaucoma Study",
    year: 1998,
    subspecialty: "Glaucoma",
    topic: "Reducción PIO en glaucoma de tensión normal",
    design: "ECA, n=140",
    population: "Glaucoma normotensivo",
    intervention: "Reducción ≥30% PIO vs no tratamiento",
    primary_endpoint: "Progresión del CV",
    key_results: [
      "Reducción del 50% en progresión con tratamiento",
      "Beneficio mayor al excluir cataratas inducidas",
    ],
    clinical_impact: "Validó la reducción de PIO incluso con presiones normales.",
    reference: "CNTGS Group. Am J Ophthalmol 1998;126:498-505.",
  },
  {
    id: "t-emgt",
    acronym: "EMGT",
    full_name: "Early Manifest Glaucoma Trial",
    year: 2002,
    subspecialty: "Glaucoma",
    topic: "Tratamiento precoz vs observación",
    design: "ECA, n=255",
    population: "Glaucoma incipiente",
    intervention: "Betaxolol + trabeculoplastia vs observación",

    primary_endpoint: "Progresión del CV/papila",
    key_results: [
      "Reducción 25% PIO → mitad de progresión",
      "Cada mmHg menos = 10% menos riesgo de progresión",
    ],
    clinical_impact: "Estableció la relación dosis-respuesta de la PIO.",
    reference: "Heijl A, et al. Arch Ophthalmol 2002;120:1268-79.",
  },
  {
    id: "t-light",
    acronym: "LiGHT",
    full_name: "Laser in Glaucoma and Ocular Hypertension Trial",
    year: 2019,
    subspecialty: "Glaucoma",
    topic: "SLT como tratamiento de primera línea",
    design: "ECA, 3 años, n=718",
    population: "POAG/HTO de novo",
    intervention: "SLT primera línea vs colirios",
    primary_endpoint: "Calidad de vida y control de PIO",
    key_results: [
      "74% libres de colirios a 3 años con SLT",
      "Menor coste y menos cirugía",
      "Calidad de vida no inferior",
    ],
    clinical_impact: "Cambió la práctica hacia SLT como primera línea.",
    reference: "Gazzard G, et al. Lancet 2019;393:1505-16.",
  },
  {
    id: "t-eagle",
    acronym: "EAGLE",
    full_name: "Effectiveness, in Angle-closure Glaucoma, of Lens Extraction",
    year: 2016,
    subspecialty: "Glaucoma",
    topic: "Facoemulsificación precoz en PACG",
    design: "ECA, 3 años, n=419",
    population: "PACG y HTO de ángulo cerrado",
    intervention: "Facoemulsificación vs iridotomía + colirios",
    primary_endpoint: "Calidad de vida, PIO, coste-eficacia",
    key_results: ["Mejor calidad de vida y control de PIO con faco", "Menos cirugías adicionales"],
    clinical_impact: "Cataratas precoces como tratamiento del cierre angular.",
    reference: "Azuara-Blanco A, et al. Lancet 2016;388:1389-97.",
  },
  /* ---------- Cornea / Refractiva ---------- */
  {
    id: "t-cxl-dresden",
    acronym: "Dresden CXL Protocol",
    full_name: "Corneal Cross-Linking — Wollensak/Spoerl Original Protocol",
    year: 2003,
    subspecialty: "Cornea",
    topic: "Crosslinking en queratocono progresivo",
    design: "Cohorte prospectiva, posteriores ECA confirmatorios",
    population: "Queratocono con progresión",
    intervention: "Riboflavina 0.1% + UVA 3 mW/cm² 30 min (epi-off)",
    primary_endpoint: "Estabilización K-max",
    key_results: ["Estabilización en >90% a 5–10 años", "Reducción de K-max ≈1–2 D media"],
    clinical_impact: "Estándar terapéutico para detener la progresión.",
    reference: "Wollensak G, Spoerl E, Seiler T. Am J Ophthalmol 2003;135:620-7.",
  },
  /* ---------- Pediátrica ---------- */
  {
    id: "t-rainbow",
    acronym: "RAINBOW",
    full_name: "Ranibizumab vs Laser Therapy for Retinopathy of Prematurity",
    year: 2019,
    subspecialty: "Pediatric Ophthalmology",
    topic: "Anti-VEGF en ROP",
    design: "ECA, n=225",
    population: "ROP umbral",
    intervention: "Ranibizumab 0.2/0.1 mg vs láser",
    primary_endpoint: "Resolución sin recurrencia ni desfavorable",
    key_results: [
      "Ranibizumab 0.2 mg superior numéricamente a láser",
      "Perfil de seguridad sistémico favorable",
    ],
    clinical_impact: "Apoya anti-VEGF como opción de tratamiento.",
    reference: "Stahl A, et al. Lancet 2019;394:1551-9.",
  },
  /* ---------- Uveítis ---------- */
  {
    id: "t-must",
    acronym: "MUST",
    full_name: "Multicenter Uveitis Steroid Treatment Trial",
    year: 2011,
    subspecialty: "Uveitis",
    topic: "Implante de fluocinolona vs terapia sistémica",
    design: "ECA, 2 años, n=255",
    population: "Uveítis intermedia, posterior, panuveítis",
    intervention: "Implante fluocinolona vs corticoides sistémicos + inmunosupresores",
    primary_endpoint: "Cambio de AV a 24 meses",
    key_results: [
      "AV similar a 2 años; diferencias a 7 años favorables a terapia sistémica",
      "Más catarata e HTO con implante",
    ],
    clinical_impact: "Reposicionó la terapia sistémica como opción duradera.",
    reference: "MUST Trial. Ophthalmology 2011;118:1916-26.",
  },
];

/* ============================================================
 *                  PROTOCOLOS CLÍNICOS
 * ============================================================ */

export interface ClinicalProtocol {
  id: string;
  title: string;
  subspecialty: Subspecialty;
  context: string;
  steps: string[];
  monitoring: string[];
  pitfalls: string[];
  source: string;
}

const CLINICAL_PROTOCOLS_BASE: ClinicalProtocol[] = [
  {
    id: "pr-antivegf-loading",
    title: "Carga y mantenimiento de anti-VEGF en DMAE neovascular",
    subspecialty: "Retina",
    context: "Pacientes con MNV activa diagnosticada por OCT/OCT-A.",
    steps: [
      "3 dosis mensuales de carga (aflibercept 2 mg / faricimab / ranibizumab)",
      "Revisión OCT a las 4–6 semanas de la 3.ª inyección",
      "Régimen treat-and-extend: +2 semanas si seco, −2 si actividad",
      "Intervalo mínimo 4 semanas, máximo 16 semanas según molécula",
      "Reevaluación de diagnóstico a los 12 meses si respuesta subóptima",
    ],
    monitoring: [
      "AV ETDRS",
      "OCT macular",
      "OCT-A si sospecha de MNV tipo 3",
      "PIO post-inyección",
    ],
    pitfalls: [
      "Confundir fluido subretiniano tolerable con actividad",
      "No detectar vasculopatía coroidea polipoidea (considerar ICG)",
      "Endoftalmitis: dolor + hipopión + descenso visual súbito",
    ],
    source: "AAO PPP AMD 2024; EURETINA nAMD Guidelines 2024.",
  },
  {
    id: "pr-dme",
    title: "Manejo escalonado del edema macular diabético",
    subspecialty: "Retina",
    context: "EMD con afectación central (CST ≥300 µm) y AV reducida.",
    steps: [
      "Optimización sistémica: HbA1c, TA, lípidos, función renal",
      "Anti-VEGF de primera línea (selección según AV basal — Protocolo T)",
      "Si respuesta subóptima ≥3 inyecciones → cambio de molécula o corticoide intravítreo",
      "Láser focal en lesiones extrafoveales persistentes",
      "Vitrectomía si componente traccional",
    ],
    monitoring: ["AV, OCT cada 4–8 semanas durante la carga", "HbA1c trimestral"],
    pitfalls: ["Hipertensión ocular por corticoides", "Catarata acelerada"],
    source: "ICO Diabetic Eye Care 2024; DRCR Protocol T.",
  },
  {
    id: "pr-glaucoma-stepwise",
    title: "Tratamiento escalonado del POAG",
    subspecialty: "Glaucoma",
    context: "POAG diagnosticado o HTO de alto riesgo (OHTS criteria).",
    steps: [
      "PIO objetivo individualizada (reducción 20–40%)",
      "SLT primera línea (LiGHT) o análogo de prostaglandinas",
      "Combinaciones fijas si no se alcanza objetivo",
      "MIGS en moderado o coexistencia de catarata",
      "Trabeculectomía / tubo en avanzado o refractario",
    ],
    monitoring: [
      "PIO, paquimetría",
      "OCT CFNR/CGCC cada 6–12 m",
      "CV 24-2 (y 10-2 en avanzado) 1–2/año",
    ],
    pitfalls: ["Adherencia subóptima a colirios", "Progresión 'silenciosa' del CV"],
    source: "EGS Guidelines 5th Edition 2024; AAO PPP POAG 2024.",
  },
  {
    id: "pr-pacg-crisis",
    title: "Manejo del cierre angular agudo",
    subspecialty: "Glaucoma",
    context: "Crisis aguda con PIO >40 mmHg, edema corneal, midriasis media fija.",
    steps: [
      "Decúbito supino para desplazar el cristalino",
      "Tópico: pilocarpina 2% (cuando PIO <50), timolol, brimonidina, dorzolamida",
      "Sistémico: acetazolamida 500 mg VO/IV; manitol 1–2 g/kg IV si refractario",
      "Iridotomía láser bilateral en cuanto la córnea aclare",
      "Considerar facoemulsificación temprana (EAGLE)",
    ],
    monitoring: ["PIO cada 30–60 min", "Gonioscopia tras aclarar córnea"],
    pitfalls: [
      "Pilocarpina con PIO muy alta → isquemia iridiana",
      "Manitol en cardiópatas/renales",
    ],
    source: "EGS 2024; AAO PPP PACG 2024.",
  },
  {
    id: "pr-cxl",
    title: "Crosslinking corneal (protocolo Dresden epi-off)",
    subspecialty: "Cornea",
    context: "Queratocono progresivo (≥1 D K-max/año) o ectasia post-LASIK.",
    steps: [
      "Desepitelización central 9 mm",
      "Riboflavina 0.1% en dextrano cada 2 min × 30 min",
      "UV-A 365 nm, 3 mW/cm² × 30 min (dosis 5.4 J/cm²)",
      "Lente de contacto terapéutica + AB tópico",
    ],
    monitoring: ["Tomografía a 1, 3, 6, 12 meses", "Vigilancia de haze/infiltrados"],
    pitfalls: [
      "Edema y haze postoperatorio",
      "Contraindicado si paquimetría <400 µm tras desepit.",
    ],
    source: "Wollensak/Spoerl 2003; Global Consensus on Keratoconus 2024.",
  },
  {
    id: "pr-bacterial-keratitis",
    title: "Queratitis bacteriana — manejo empírico",
    subspecialty: "Cornea",
    context: "Úlcera corneal aguda con sospecha bacteriana.",
    steps: [
      "Tinciones y cultivo antes de iniciar (agar sangre, chocolate, Sabouraud)",
      "Empírico: fluoroquinolona reforzada (moxi/levofloxacino) cada hora 48 h",
      "Alternativa: cefazolina 50 mg/mL + tobramicina 14 mg/mL fortificadas alternas horarias",
      "Reevaluar en 48 h; ajustar según antibiograma",
      "Cicloplejía para confort; evitar corticoides hasta cultivo (-)",
    ],
    monitoring: ["Tamaño del infiltrado, defecto epitelial, hipopión", "PIO"],
    pitfalls: [
      "Confundir con queratitis por Acanthamoeba en LC",
      "Toxicidad de antibióticos fortificados",
    ],
    source: "AAO PPP Bacterial Keratitis 2024.",
  },
  {
    id: "pr-cataract",
    title: "Protocolo perioperatorio cirugía de catarata",
    subspecialty: "Cataract",
    context: "Facoemulsificación electiva.",
    steps: [
      "Biometría óptica (IOLMaster/Lenstar) y cálculo IOL (Barrett Universal II, Hill RBF)",
      "Topografía si astigmatismo ≥1 D o cirugía refractiva previa",
      "Profilaxis: povidona yodada 5% conjuntival 3 min preop.",
      "Cefuroxima intracamerular 1 mg al cierre (ESCRS endoftalmitis study)",
      "Tratamiento postoperatorio: AINE + corticoide tópico 3–4 semanas",
    ],
    monitoring: ["Revisión 1 día, 1 semana, 4 semanas", "OCT macular si visión <20/25 sin causa"],
    pitfalls: [
      "Edema macular cistoide pseudofáquico (Irvine-Gass)",
      "Cápsula posterior débil en pseudoexfoliación",
    ],
    source: "ESCRS Guidelines on Cataract Surgery 2024.",
  },
  {
    id: "pr-rop-screening",
    title: "Cribado de retinopatía del prematuro",
    subspecialty: "Pediatric Ophthalmology",
    context: "RN <31 semanas EG o <1500 g, o riesgo clínico.",
    steps: [
      "Primer examen: 31 semanas EPM o 4 sem postnatales (lo que sea mayor)",
      "Oftalmoscopia indirecta con indentación bajo midriasis",
      "Clasificación ICROP3 (zona, estadio, plus)",
      "Tratamiento (láser o anti-VEGF) si tipo 1",
      "Seguimiento a largo plazo: miopía, estrabismo, ambliopía",
    ],
    monitoring: ["Cada 1–2 semanas según estadio", "Hasta vascularización completa de zona III"],
    pitfalls: ["No reconocer ROP posterior agresiva (A-ROP)"],
    source: "AAO/AAP/AAPOS Screening for ROP 2018; ICROP3 2021.",
  },
];

/* ============================================================
 *                ESCALAS Y CLASIFICACIONES
 * ============================================================ */

export interface ClinicalScale {
  id: string;
  name: string;
  subspecialty: Subspecialty;
  purpose: string;
  items: { code: string; description: string }[];
  source: string;
}

const CLINICAL_SCALES_BASE: ClinicalScale[] = [
  {
    id: "sc-etdrs-dr",
    name: "Clasificación ETDRS de la retinopatía diabética",
    subspecialty: "Retina",
    purpose: "Estadificación de la RD para investigación y seguimiento.",
    items: [
      { code: "10", description: "Sin retinopatía" },
      { code: "20", description: "Microaneurismas únicamente" },
      { code: "35", description: "RDNP leve" },
      { code: "43", description: "RDNP moderada" },
      { code: "47", description: "RDNP moderadamente severa" },
      { code: "53", description: "RDNP severa (regla 4-2-1)" },
      { code: "61", description: "RDP leve" },
      { code: "65", description: "RDP moderada" },
      { code: "71", description: "RDP de alto riesgo" },
      { code: "85", description: "RDP avanzada con secuelas" },
    ],
    source: "ETDRS Report 12, 1991.",
  },
  {
    id: "sc-icdr",
    name: "Escala internacional clínica de RD (ICDR)",
    subspecialty: "Retina",
    purpose: "Estadificación simplificada para uso clínico cotidiano.",
    items: [
      { code: "0", description: "Sin retinopatía aparente" },
      { code: "1", description: "RDNP leve (microaneurismas)" },
      { code: "2", description: "RDNP moderada" },
      { code: "3", description: "RDNP severa" },
      { code: "4", description: "RDP" },
    ],
    source: "Wilkinson CP, et al. Ophthalmology 2003;110:1677-82.",
  },
  {
    id: "sc-sun",
    name: "Criterios SUN para uveítis",
    subspecialty: "Uveitis",
    purpose: "Estandarización de localización, actividad y cronicidad.",
    items: [
      { code: "Anterior", description: "Iritis / iridociclitis" },
      { code: "Intermedia", description: "Vitritis predominante" },
      { code: "Posterior", description: "Coroiditis / retinitis" },
      { code: "Panuveítis", description: "Afectación de los tres segmentos" },
      { code: "Células CA", description: "Escala 0 a 4+ (0, 0.5+, 1+, 2+, 3+, 4+)" },
    ],
    source: "SUN Working Group. Am J Ophthalmol 2005;140:509-16.",
  },
  {
    id: "sc-locs3",
    name: "LOCS III — Lens Opacities Classification System",
    subspecialty: "Cataract",
    purpose: "Cuantificar densidad y tipo de catarata.",
    items: [
      { code: "NO/NC", description: "Opalescencia y color nuclear 0.1–6.9" },
      { code: "C", description: "Catarata cortical 0.1–5.9" },
      { code: "P", description: "Subcapsular posterior 0.1–5.9" },
    ],
    source: "Chylack LT, et al. Arch Ophthalmol 1993;111:831-6.",
  },
  {
    id: "sc-icrop3",
    name: "Clasificación internacional de ROP (ICROP3)",
    subspecialty: "Pediatric Ophthalmology",
    purpose: "Estadificación de la retinopatía del prematuro.",
    items: [
      { code: "Zona", description: "I, II o III según extensión vascular" },
      { code: "Estadio", description: "1 a 5 según severidad" },
      { code: "Plus", description: "Tortuosidad y dilatación vascular en polo posterior" },
      { code: "A-ROP", description: "ROP agresiva posterior" },
    ],
    source: "Chiang MF, et al. Ophthalmology 2021;128:e51-68.",
  },
];

/* ============================================================
 *               REVISIONES SISTEMÁTICAS / META
 * ============================================================ */

export interface SystematicReview {
  id: string;
  title: string;
  subspecialty: Subspecialty;
  year: number;
  source: string;
  conclusion: string;
}

const SYSTEMATIC_REVIEWS_BASE: SystematicReview[] = [
  {
    id: "sr-antivegf-dme",
    title: "Anti-VEGF agents for diabetic macular oedema",
    subspecialty: "Retina",
    year: 2023,
    source: "Cochrane Database Syst Rev",
    conclusion:
      "Anti-VEGF mejora AV ≥3 líneas a 1 año frente a láser o sham; aflibercept marginalmente superior en peor visión basal.",
  },
  {
    id: "sr-laser-dme",
    title: "Laser photocoagulation for diabetic macular oedema",
    subspecialty: "Retina",
    year: 2018,
    source: "Cochrane Database Syst Rev",
    conclusion:
      "Láser focal reduce pérdida visual moderada; rol actual coadyuvante en lesiones extrafoveales.",
  },
  {
    id: "sr-medical-glaucoma",
    title: "Medical interventions for primary open-angle glaucoma",
    subspecialty: "Glaucoma",
    year: 2022,
    source: "Cochrane Eyes and Vision",
    conclusion: "Análogos de prostaglandinas son los más eficaces como monoterapia inicial.",
  },
  {
    id: "sr-slt-glaucoma",
    title: "Selective laser trabeculoplasty as primary treatment",
    subspecialty: "Glaucoma",
    year: 2022,
    source: "BMJ Open Ophthalmology",
    conclusion:
      "SLT comparable o superior a colirios en eficacia y calidad de vida; menor coste a largo plazo.",
  },
  {
    id: "sr-cxl",
    title: "Corneal collagen cross-linking for keratoconus",
    subspecialty: "Cornea",
    year: 2023,
    source: "Cochrane Database Syst Rev",
    conclusion:
      "Evidencia moderada de estabilización de K-max y mejora modesta de AV en queratocono progresivo.",
  },
  {
    id: "sr-screening-dr",
    title: "Screening for diabetic retinopathy",
    subspecialty: "Retina",
    year: 2020,
    source: "USPSTF / NICE",
    conclusion:
      "Cribado anual coste-efectivo en DM1 desde 5 años de diagnóstico y desde el momento en DM2.",
  },
  {
    id: "sr-amblyopia-patching",
    title: "Patching for amblyopia",
    subspecialty: "Pediatric Ophthalmology",
    year: 2019,
    source: "Cochrane Eyes and Vision",
    conclusion:
      "Parche 2–6 h/día comparable a tiempo completo; combinar con atropina en ambliopías moderadas.",
  },
];

/* ============================================================
 *           POSOLOGÍA DE FÁRMACOS INTRAVÍTREOS
 * ============================================================ */

export interface IVDosing {
  id: string;
  drug: string;
  indication: string;
  dose: string;
  schedule: string;
  notes: string;
  source: string;
}

const IV_DOSING_TABLE_BASE: IVDosing[] = [
  {
    id: "iv-ranibizumab",
    drug: "Ranibizumab 0.5 mg",
    indication: "DMAE neovascular, EMD, OVR, MNV miópica, ROP",
    dose: "0.5 mg / 0.05 mL (0.2/0.1 mg en ROP)",
    schedule: "Carga 3 mensuales, luego PRN o T&E",
    notes: "Vida media vítrea ≈9 días",
    source: "Ficha técnica EMA; AAO PPP 2024.",
  },
  {
    id: "iv-aflibercept2",
    drug: "Aflibercept 2 mg",
    indication: "DMAE, EMD, OVR, RD",
    dose: "2 mg / 0.05 mL",
    schedule: "3 dosis mensuales + q8w (hasta q16 en VIEW/ALTAIR)",
    notes: "Proteína de fusión recombinante",
    source: "Ficha técnica EMA; VIEW 1/2.",
  },
  {
    id: "iv-aflibercept8",
    drug: "Aflibercept 8 mg",
    indication: "DMAE, EMD",
    dose: "8 mg / 0.07 mL",
    schedule: "3 mensuales + q12w/q16w",
    notes: "Permite extensión de intervalos",
    source: "PULSAR/PHOTON 2023.",
  },
  {
    id: "iv-faricimab",
    drug: "Faricimab 6 mg",
    indication: "DMAE neovascular, EMD",
    dose: "6 mg / 0.05 mL",
    schedule: "4 mensuales + PTI hasta q16w",
    notes: "Bi-específico anti-VEGF/Ang-2",
    source: "TENAYA/LUCERNE; YOSEMITE/RHINE.",
  },
  {
    id: "iv-brolucizumab",
    drug: "Brolucizumab 6 mg",
    indication: "DMAE neovascular, EMD",
    dose: "6 mg / 0.05 mL",
    schedule: "3 mensuales + q8/q12w",
    notes: "Vigilancia de vasculitis oclusiva intraocular",
    source: "HAWK/HARRIER.",
  },
  {
    id: "iv-dex-implant",
    drug: "Implante de dexametasona 0.7 mg",
    indication: "EMD, OVR, uveítis no infecciosa",
    dose: "0.7 mg sostenido",
    schedule: "Cada 3–6 meses según necesidad",
    notes: "Riesgo de HTO y catarata",
    source: "MEAD/Ozurdex SP.",
  },
  {
    id: "iv-fluocinolone",
    drug: "Implante de fluocinolona 0.19 mg",
    indication: "EMD crónico, uveítis posterior crónica",
    dose: "0.19 mg liberación 3 años",
    schedule: "Implante único",
    notes: "Considerar pseudofáquicos por catarata",
    source: "FAME; PSV-FAI-001.",
  },
  {
    id: "iv-pegcetacoplan",
    drug: "Pegcetacoplan",
    indication: "Atrofia geográfica secundaria a DMAE",
    dose: "15 mg / 0.1 mL",
    schedule: "Mensual o bimestral",
    notes: "Vigilar conversión a MNV",
    source: "OAKS/DERBY 2023.",
  },
];

/* ============================================================
 *                ETIQUETAS / METADATOS
 * ============================================================ */

export const EVIDENCE_SOURCES = [
  "American Academy of Ophthalmology (AAO) — Preferred Practice Patterns",
  "EURETINA Clinical Guidelines",
  "European Society of Cataract and Refractive Surgeons (ESCRS)",
  "European Glaucoma Society (EGS) — 5th Edition",
  "International Council of Ophthalmology (ICO)",
  "DRCR Retina Network (antes DRCR.net)",
  "NEI / NIH — clinical trials database",
  "Cochrane Eyes and Vision Group",
  "NICE Guidance (UK)",
  "Sociedad Española de Oftalmología (SEO) y subespecialidades (SERV, SEG, SECOIR)",
  "PubMed/NCBI — NEJM, Lancet, JAMA Ophthalmology, Ophthalmology, Br J Ophthalmol",
] as const;

/* ============================================================
 *          MERGED EXPORTS (base + extended corpus)
 * ============================================================ */
export const LANDMARK_TRIALS: LandmarkTrial[] = [
  ...LANDMARK_TRIALS_BASE,
  ...LANDMARK_TRIALS_EXT,
  ...LANDMARK_TRIALS_EXT3,
];
export const CLINICAL_PROTOCOLS: ClinicalProtocol[] = [
  ...CLINICAL_PROTOCOLS_BASE,
  ...CLINICAL_PROTOCOLS_EXT,
  ...CLINICAL_PROTOCOLS_EXT3,
];
export const CLINICAL_SCALES: ClinicalScale[] = [
  ...CLINICAL_SCALES_BASE,
  ...CLINICAL_SCALES_EXT,
  ...CLINICAL_SCALES_EXT3,
];
export const SYSTEMATIC_REVIEWS: SystematicReview[] = [
  ...SYSTEMATIC_REVIEWS_BASE,
  ...SYSTEMATIC_REVIEWS_EXT,
  ...SYSTEMATIC_REVIEWS_EXT3,
];
export const IV_DOSING_TABLE: IVDosing[] = [...IV_DOSING_TABLE_BASE, ...IV_DOSING_TABLE_EXT];
