/**
 * Atlas oftalmológico — base de datos de demostración exhaustiva.
 *
 * Este archivo contiene una base de conocimiento amplia y clínicamente
 * plausible que cubre patologías, fármacos, dispositivos, guías clínicas,
 * clasificaciones y KOLs de las principales subespecialidades de oftalmología.
 *
 * En modo demo, esta información alimenta el Atlas (/atlas) y se usa como
 * contexto narrativo para la IA. En producción, todo esto debe migrarse a
 * tablas Supabase (ai_knowledge_sources, ai_chunks) y ser revisado por el
 * equipo editorial/KOL antes de activarse.
 *
 * TODO: Requires medical/legal validation before production.
 */

import type { Subspecialty } from "./types";
import {
  ATLAS_PATHOLOGIES_EXT,
  ATLAS_DRUGS_EXT,
  ATLAS_DEVICES_EXT,
  ATLAS_GUIDELINES_EXT,
  ATLAS_KOLS_EXT,
  ATLAS_CLASSIFICATIONS_EXT,
} from "./ophthalmology-atlas-extended";

export interface AtlasPathology {
  id: string;
  name_es: string;
  name_en: string;
  subspecialty: Subspecialty;
  prevalence: string;
  etiology: string[];
  symptoms: string[];
  signs: string[];
  diagnostics: string[];
  differential: string[];
  treatment_steps: string[];
  complications: string[];
  prognosis: string;
  red_flags: string[];
  guidelines: string[];
  icd10?: string;
}

export interface AtlasDrug {
  id: string;
  inn: string;
  brand_examples: string[];
  drug_class: string;
  indications: string[];
  posology: string;
  mechanism: string;
  contraindications: string[];
  adverse_effects: string[];
  pregnancy_category?: string;
  notes?: string;
}

export interface AtlasDevice {
  id: string;
  name: string;
  category: "Diagnostic" | "Surgical" | "Implant" | "Laser" | "Imaging";
  manufacturer: string;
  indications: string[];
  parameters?: string[];
  notes?: string;
}

export interface AtlasGuideline {
  id: string;
  title: string;
  society: string;
  year: number;
  subspecialty: Subspecialty;
  scope: string;
  key_recommendations: string[];
  url_hint?: string;
}

export interface AtlasKOL {
  id: string;
  name: string;
  affiliation: string;
  country: string;
  subspecialties: Subspecialty[];
  expertise: string[];
  h_index?: number;
}

export interface AtlasClassification {
  id: string;
  name: string;
  subspecialty: Subspecialty;
  stages: { code: string; description: string }[];
  use: string;
}

/* ============================================================
 *                       PATOLOGÍAS
 * ============================================================ */
const ATLAS_PATHOLOGIES_BASE: AtlasPathology[] = [
  // ---------- Retina ----------
  {
    id: "p-amd-dry",
    name_es: "Degeneración macular asociada a la edad (DMAE seca)",
    name_en: "Dry age-related macular degeneration",
    subspecialty: "Retina",
    prevalence: "≈8.7% en mayores de 50 años a nivel global",
    etiology: ["Edad", "Genética (CFH, ARMS2)", "Tabaquismo", "Dieta pobre en antioxidantes"],
    symptoms: [
      "Pérdida progresiva de visión central",
      "Metamorfopsias leves",
      "Dificultad para leer",
    ],
    signs: ["Drusas blandas", "Cambios pigmentarios del EPR", "Atrofia geográfica"],
    diagnostics: ["OCT macular", "Autofluorescencia", "Rejilla de Amsler", "Angiografía OCT"],
    differential: [
      "DMAE neovascular",
      "Distrofia macular hereditaria",
      "Maculopatía por cloroquina",
    ],
    treatment_steps: [
      "Suplementación AREDS2 en intermedia/avanzada",
      "Cese del tabaco y control cardiovascular",
      "Pegcetacoplan o avacincaptad pegol intravítreos en atrofia geográfica (selección estricta)",
      "Rehabilitación visual y baja visión",
    ],
    complications: ["Progresión a forma neovascular", "Atrofia geográfica avanzada"],
    prognosis: "Variable; la atrofia geográfica progresa ~1.5–2.6 mm²/año",
    red_flags: [
      "Aparición súbita de escotoma central",
      "Metamorfopsia nueva → descartar conversión a húmeda",
    ],
    guidelines: ["AAO PPP AMD 2024", "EURETINA AMD Guidelines 2024"],
    icd10: "H35.31",
  },
  {
    id: "p-amd-wet",
    name_es: "DMAE neovascular (húmeda)",
    name_en: "Neovascular AMD",
    subspecialty: "Retina",
    prevalence: "≈10–15% de los casos de DMAE",
    etiology: ["Neovascularización macular tipo 1/2/3", "VEGF elevado"],
    symptoms: ["Pérdida visual súbita o subaguda", "Metamorfopsias", "Escotoma central"],
    signs: ["Hemorragia subretiniana", "Fluido intra/subretiniano", "Desprendimiento del EPR"],
    diagnostics: ["OCT", "OCT-A", "Angiografía con fluoresceína", "ICG si MNV tipo 3"],
    differential: [
      "Vasculopatía coroidea polipoidea",
      "Coriorretinopatía serosa central",
      "Telangiectasias maculares",
    ],
    treatment_steps: [
      "Carga con anti-VEGF (3 dosis mensuales): aflibercept 2 mg / 8 mg, ranibizumab, brolucizumab, faricimab",
      "Régimen treat-and-extend según OCT",
      "Considerar faricimab/aflibercept 8 mg para intervalos prolongados",
      "Photobiomodulation o terapia combinada en casos seleccionados",
    ],
    complications: [
      "Cicatriz disciforme",
      "Atrofia macular post-tratamiento",
      "Endoftalmitis (1/2000–1/5000)",
    ],
    prognosis: "Estabilización visual en >90% con tratamiento adherente",
    red_flags: ["Dolor + ojo rojo post-inyección → descartar endoftalmitis"],
    guidelines: ["EURETINA nAMD 2024", "AAO PPP AMD 2024"],
    icd10: "H35.32",
  },
  {
    id: "p-dme",
    name_es: "Edema macular diabético (EMD)",
    name_en: "Diabetic macular edema",
    subspecialty: "Retina",
    prevalence: "≈7% de pacientes con diabetes",
    etiology: ["Hiperglucemia crónica", "Ruptura de barrera hemato-retiniana", "VEGF, IL-6"],
    symptoms: ["Disminución de agudeza visual", "Visión borrosa fluctuante"],
    signs: ["Engrosamiento macular en OCT", "Exudados duros", "Microaneurismas"],
    diagnostics: ["OCT macular (CST)", "Angiografía OCT", "HbA1c", "TA, perfil lipídico"],
    differential: ["Oclusión venosa", "Uveítis posterior", "Síndrome de tracción vitreomacular"],
    treatment_steps: [
      "Optimización metabólica (HbA1c <7%, TA <140/90)",
      "Anti-VEGF intravítreo de primera línea (aflibercept, faricimab, ranibizumab)",
      "Corticoides intravítreos (dexametasona, fluocinolona) en refractarios o pseudofáquicos",
      "Láser focal en lesiones extrafoveales",
    ],
    complications: [
      "EMD crónico con atrofia foveal",
      "Catarata e hipertensión ocular por corticoides",
    ],
    prognosis: "Mejoría ≥10 letras ETDRS en 30–50% con anti-VEGF a 1 año",
    red_flags: ["Pérdida visual brusca → descartar hemorragia vítrea o desprendimiento traccional"],
    guidelines: ["ICO Diabetic Eye Care 2024", "EURETINA DME 2024", "SERV EMD 2024"],
    icd10: "E11.311",
  },
  {
    id: "p-rd",
    name_es: "Desprendimiento de retina regmatógeno",
    name_en: "Rhegmatogenous retinal detachment",
    subspecialty: "Retina",
    prevalence: "≈1/10.000 personas/año",
    etiology: ["Desprendimiento de vítreo posterior", "Miopía alta", "Trauma", "Pseudofaquia"],
    symptoms: ["Miodesopsias súbitas", "Fotopsias", "Cortina visual", "Pérdida campimétrica"],
    signs: ["Bolsa retiniana ondulante", "Rotura periférica", "Tabaco-polvo de Shafer"],
    diagnostics: [
      "Oftalmoscopia indirecta con indentación",
      "Ecografía B-scan si medios opacos",
      "OCT",
    ],
    differential: [
      "Retinosquisis senil",
      "Desprendimiento exudativo",
      "Desprendimiento traccional",
    ],
    treatment_steps: [
      "Cirugía urgente (24–72 h si mácula amenazada)",
      "Vitrectomía pars plana 23/25/27G ± gas (SF6, C3F8) o aceite de silicona",
      "Cerclaje escleral en jóvenes/fáquicos",
      "Retinopexia neumática en casos seleccionados",
    ],
    complications: [
      "Vitreorretinopatía proliferativa (PVR)",
      "Cataratas post-vitrectomía",
      "Hipertensión ocular",
    ],
    prognosis:
      "Reaplicación primaria ≈85–90%; visión final depende del estado macular preoperatorio",
    red_flags: ["Mácula on → cirugía urgente para preservar visión central"],
    guidelines: ["AAO PPP Posterior Vitreous Detachment 2024", "EURETINA RRD 2024"],
    icd10: "H33.0",
  },
  {
    id: "p-rvo",
    name_es: "Oclusión venosa retiniana (rama y central)",
    name_en: "Retinal vein occlusion",
    subspecialty: "Retina",
    prevalence: "BRVO 4.4/1000; CRVO 0.8/1000",
    etiology: ["HTA", "Glaucoma", "Dislipidemia", "Estados procoagulantes en jóvenes"],
    symptoms: ["Pérdida visual indolora súbita o progresiva"],
    signs: ["Hemorragias en llama", "Edema macular", "Tortuosidad venosa", "Manchas algodonosas"],
    diagnostics: [
      "OCT macular",
      "Angiografía con fluoresceína (isquemia)",
      "OCT-A",
      "Estudio sistémico",
    ],
    differential: [
      "Retinopatía hipertensiva",
      "Síndrome ocular isquémico",
      "Vasculitis retinianas",
    ],
    treatment_steps: [
      "Control de factores sistémicos",
      "Anti-VEGF intravítreo si edema macular",
      "Implante de dexametasona en pseudofáquicos seleccionados",
      "Panfotocoagulación si neovascularización (>10 DD isquemia en CRVO)",
    ],
    complications: ["Glaucoma neovascular (CRVO isquémica)", "Hemorragia vítrea"],
    prognosis: "CRVO isquémica: pronóstico visual pobre; BRVO con tratamiento: mejoría en >60%",
    red_flags: ["Rubeosis iridis → urgencia, riesgo de glaucoma neovascular"],
    guidelines: ["EURETINA RVO 2024", "AAO PPP RVO 2024"],
    icd10: "H34.8",
  },
  {
    id: "p-dr",
    name_es: "Retinopatía diabética proliferativa",
    name_en: "Proliferative diabetic retinopathy",
    subspecialty: "Retina",
    prevalence: "≈25% de diabéticos tipo 1 a los 25 años",
    etiology: ["Hiperglucemia crónica", "Isquemia retiniana"],
    symptoms: ["Miodesopsias", "Pérdida visual por hemorragia vítrea o traccional"],
    signs: [
      "Neovascularización del disco/retina",
      "Hemorragia prerretiniana o vítrea",
      "Membranas fibrovasculares",
    ],
    diagnostics: ["Retinografía con campos amplios", "Angiografía con fluoresceína", "OCT-A"],
    differential: ["Otras retinopatías isquémicas", "OVR", "Vasculitis retinianas"],
    treatment_steps: [
      "Panfotocoagulación láser (PRP)",
      "Anti-VEGF coadyuvante (Protocolo S)",
      "Vitrectomía si hemorragia vítrea persistente o tracción macular",
    ],
    complications: [
      "Desprendimiento traccional",
      "Glaucoma neovascular",
      "Hemorragia vítrea recurrente",
    ],
    prognosis: "Buena con tratamiento precoz; pérdida visual severa <5% a 5 años si PRP completa",
    red_flags: ["Rubeosis + PIO elevada → emergencia"],
    guidelines: ["ICO Diabetic Eye Care 2024", "AAO PPP Diabetic Retinopathy 2024"],
    icd10: "E11.359",
  },
  {
    id: "p-csr",
    name_es: "Coriorretinopatía serosa central",
    name_en: "Central serous chorioretinopathy",
    subspecialty: "Retina",
    prevalence: "≈10/100.000/año; hombres 30–50 años",
    etiology: ["Estrés", "Corticoides exógenos/endógenos", "Personalidad tipo A", "H. pylori"],
    symptoms: ["Visión borrosa central", "Micropsia", "Discromatopsia", "Metamorfopsia"],
    signs: ["Desprendimiento neurosensorial macular", "Puntos de fuga en AGF"],
    diagnostics: [
      "OCT con EDI",
      "Autofluorescencia",
      "AGF (punto de tinta/columna de humo)",
      "ICG",
    ],
    differential: ["MNV tipo 1", "Vasculopatía coroidea polipoidea", "Coroidopatía hipertensiva"],
    treatment_steps: [
      "Observación 3 meses si reciente",
      "Suspender corticoides",
      "TFD media-fluencia con verteporfina (de elección crónica)",
      "Eplerenona / espironolactona (evidencia limitada)",
      "Láser micropulso subumbral",
    ],
    complications: ["Atrofia del EPR", "MNV secundaria", "CSC crónica con pérdida visual"],
    prognosis: "Resolución espontánea en 80–90% a 3 meses; recurrencia 30–50%",
    red_flags: ["Hemorragia subretiniana → descartar MNV"],
    guidelines: ["EURETINA CSCR 2020"],
    icd10: "H35.71",
  },
  // ---------- Glaucoma ----------
  {
    id: "p-poag",
    name_es: "Glaucoma primario de ángulo abierto",
    name_en: "Primary open-angle glaucoma",
    subspecialty: "Glaucoma",
    prevalence: "≈3.5% en mayores de 40 años",
    etiology: [
      "Resistencia trabecular aumentada",
      "Factores genéticos (MYOC, OPTN)",
      "Edad",
      "Raza africana",
    ],
    symptoms: ["Generalmente asintomático hasta fases avanzadas"],
    signs: ["Excavación papilar aumentada", "Defectos del CV", "Adelgazamiento de la CFNR"],
    diagnostics: [
      "Tonometría",
      "Paquimetría",
      "Gonioscopia",
      "OCT de papila/CFNR/CGCC",
      "CV (24-2/10-2)",
    ],
    differential: [
      "Glaucoma de presión normal",
      "Glaucoma secundario",
      "Neuropatías ópticas no glaucomatosas",
    ],
    treatment_steps: [
      "Análogos de prostaglandinas (latanoprost, travoprost, bimatoprost, tafluprost) 1ª línea",
      "Beta-bloqueantes / alfa-agonistas / inhibidores anhidrasa carbónica",
      "SLT (Selective Laser Trabeculoplasty) precoz (LiGHT trial)",
      "MIGS (iStent, Hydrus, Xen) en moderado",
      "Trabeculectomía / tubos en avanzado o refractario",
    ],
    complications: [
      "Pérdida visual irreversible",
      "Hipotonía / endoftalmitis ampollar post-cirugía",
    ],
    prognosis: "Buena con detección y tratamiento precoz",
    red_flags: [
      "Progresión rápida del CV pese a PIO objetivo → revisar adherencia y descartar causas secundarias",
    ],
    guidelines: ["EGS 5th Edition 2024", "AAO PPP POAG 2024"],
    icd10: "H40.11",
  },
  {
    id: "p-pacg",
    name_es: "Glaucoma primario de ángulo cerrado",
    name_en: "Primary angle-closure glaucoma",
    subspecialty: "Glaucoma",
    prevalence: "Más prevalente en asiáticos; ≈0.5–1% en >40 años",
    etiology: [
      "Cámara anterior estrecha",
      "Bloqueo pupilar",
      "Iris plateau",
      "Cristalino voluminoso",
    ],
    symptoms: ["Crisis: dolor intenso, visión borrosa, halos, náuseas/vómitos"],
    signs: [
      "PIO muy elevada (>40 mmHg)",
      "Edema corneal",
      "Pupila en midriasis media fija",
      "Ángulo cerrado",
    ],
    diagnostics: ["Gonioscopia dinámica", "UBM/AS-OCT", "PIO seriada", "CV"],
    differential: ["Glaucoma neovascular", "Uveítis hipertensiva", "Síndrome de iris plateau"],
    treatment_steps: [
      "Crisis: pilocarpina 2%, timolol, brimonidina, acetazolamida VO/IV, manitol",
      "Iridotomía láser bilateral",
      "Facoemulsificación temprana (EAGLE trial)",
      "Goniosinequialisis ± MIGS si sinequias",
    ],
    complications: ["Atrofia óptica", "Catarata glaucomatosa florida"],
    prognosis: "Bueno si tratamiento precoz; pérdida visual permanente si crisis prolongada",
    red_flags: ["Crisis aguda → emergencia oftalmológica"],
    guidelines: ["EGS 5th Edition 2024", "Asia-Pacific PACG Consensus 2024"],
    icd10: "H40.21",
  },
  // ---------- Cornea ----------
  {
    id: "p-kc",
    name_es: "Queratocono",
    name_en: "Keratoconus",
    subspecialty: "Cornea",
    prevalence: "≈1/375 (más alto del previamente estimado)",
    etiology: ["Genética + frotamiento ocular", "Atopia", "Trisomía 21"],
    symptoms: [
      "Visión borrosa progresiva",
      "Cambios refractivos frecuentes",
      "Halos, monocular diplopía",
    ],
    signs: ["Astigmatismo irregular", "Anillo de Fleischer", "Estrías de Vogt", "Signo de Munson"],
    diagnostics: [
      "Topografía/tomografía (Pentacam, Galilei)",
      "Paquimetría",
      "Aberrometría",
      "Biomecánica (Corvis ST, ORA)",
    ],
    differential: [
      "Degeneración marginal pelúcida",
      "Ectasia post-LASIK",
      "Astigmatismo irregular postraumático",
    ],
    treatment_steps: [
      "Cese del frotamiento ocular",
      "Crosslinking corneal (CXL) epi-off/epi-on si progresión",
      "Lentes RGP, esclerales o híbridas",
      "Segmentos intracorneales (ICRS)",
      "Queratoplastia lamelar anterior profunda (DALK) en avanzado",
    ],
    complications: ["Hidrops agudo", "Cicatrices estromales"],
    prognosis: "Progresión típica antes de los 30 años; estabilización con CXL en >90%",
    red_flags: ["Hidrops corneal → tratamiento conservador, no CXL agudo"],
    guidelines: ["Global Consensus on Keratoconus 2024"],
    icd10: "H18.6",
  },
  {
    id: "p-fuchs",
    name_es: "Distrofia endotelial de Fuchs",
    name_en: "Fuchs endothelial dystrophy",
    subspecialty: "Cornea",
    prevalence: "≈4% en mayores de 40 años",
    etiology: ["Genética (TCF4, COL8A2)", "Edad", "Sexo femenino"],
    symptoms: ["Visión borrosa matutina que mejora", "Halos", "Pérdida visual progresiva"],
    signs: ["Guttae centrales", "Edema corneal estromal/epitelial", "Bullas en fases avanzadas"],
    diagnostics: ["Microscopía especular/confocal", "Paquimetría", "Tomografía"],
    differential: [
      "Edema postquirúrgico",
      "Queratopatía bullosa pseudofáquica",
      "Distrofia polimorfa posterior",
    ],
    treatment_steps: [
      "Hipertónicos (NaCl 5%)",
      "Cirugía de catarata con IOL premium si indicada (precaución bombear endotelial)",
      "DSAEK / DMEK (de elección)",
      "DSO con ROCK-inhibidores en casos centrales seleccionados",
    ],
    complications: ["Rechazo del injerto", "Desprendimiento del injerto DMEK"],
    prognosis: "DMEK: supervivencia del injerto >90% a 5 años",
    red_flags: ["Disminución súbita de visión post-DMEK → re-bubble"],
    guidelines: ["EuCornea 2024", "Cornea Society DMEK Consensus 2024"],
    icd10: "H18.51",
  },
  {
    id: "p-mk",
    name_es: "Queratitis microbiana",
    name_en: "Microbial keratitis",
    subspecialty: "Cornea",
    prevalence: "Incidencia variable; portadores de LC y trauma como factores principales",
    etiology: [
      "Bacterias (Pseudomonas, S. aureus)",
      "Hongos (Fusarium, Aspergillus)",
      "Acanthamoeba",
      "VHS",
    ],
    symptoms: ["Dolor intenso", "Ojo rojo", "Visión borrosa", "Fotofobia", "Secreción"],
    signs: ["Infiltrado estromal", "Defecto epitelial", "Hipopión", "Edema corneal"],
    diagnostics: [
      "Tinción/cultivo (agar sangre, chocolate, Sabouraud, no-nutritivo con E. coli para acantamoeba)",
      "PCR",
      "Microscopía confocal",
    ],
    differential: [
      "Queratitis estéril por LC",
      "Úlcera marginal estafilocócica",
      "Queratitis herpética",
    ],
    treatment_steps: [
      "Cultivo antes de tratar siempre que sea posible",
      "Bacteriana: fluoroquinolona reforzada o cefazolina + tobramicina fortificadas horaria",
      "Fúngica: natamicina 5% / voriconazol",
      "Acanthamoeba: PHMB + clorhexidina",
      "Herpes simple: aciclovir tópico o ganciclovir gel + valaciclovir VO",
    ],
    complications: ["Perforación corneal", "Endoftalmitis", "Cicatriz visualmente significativa"],
    prognosis: "Variable; las fúngicas y por acantamoeba tienen peor pronóstico",
    red_flags: ["Infiltrado central + hipopión → ingreso y tratamiento intensivo"],
    guidelines: ["AAO PPP Bacterial Keratitis 2024"],
    icd10: "H16.0",
  },
  // ---------- Ocular surface ----------
  {
    id: "p-dryeye",
    name_es: "Enfermedad de ojo seco",
    name_en: "Dry eye disease",
    subspecialty: "Ocular Surface",
    prevalence: "5–50% según definición; aumenta con edad y uso de pantallas",
    etiology: [
      "Disfunción de glándulas de Meibomio (MGD)",
      "Deficiencia acuosa (Sjögren)",
      "Fármacos",
      "Quirúrgico",
    ],
    symptoms: ["Sensación de cuerpo extraño", "Ardor", "Fluctuación visual", "Fotofobia"],
    signs: [
      "TBUT reducido",
      "Tinción corneal/conjuntival",
      "Pliegues parpebrales",
      "Telangiectasias del borde libre",
    ],
    diagnostics: [
      "Cuestionario OSDI/DEQ-5",
      "TBUT",
      "Osmolaridad",
      "MMP-9",
      "Meibografía",
      "Schirmer",
    ],
    differential: ["Conjuntivitis alérgica", "Blefaritis", "Queratitis neurotrófica"],
    treatment_steps: [
      "Higiene palpebral + compresas calientes + lubricantes sin conservantes (DEWS II paso 1)",
      "Antiinflamatorios tópicos: ciclosporina 0.05–0.1%, lifitegrast 5%, corticoides pulso corto",
      "Tapones lagrimales / suero autólogo / PRP",
      "IPL / dispositivos térmicos (LipiFlow, iLux) para MGD",
      "Sistémicos: tetraciclinas, secretagogos, varenicline nasal",
    ],
    complications: [
      "Queratopatía crónica",
      "Erosión recurrente",
      "Cicatrización conjuntival en Sjögren",
    ],
    prognosis: "Manejo crónico; mejoría sintomática en >70% con escalonado adecuado",
    red_flags: ["Defecto epitelial persistente → descartar queratitis neurotrófica o exposición"],
    guidelines: ["TFOS DEWS II 2017", "TFOS Lifestyle 2023"],
    icd10: "H04.123",
  },
  {
    id: "p-neuroker",
    name_es: "Queratitis neurotrófica",
    name_en: "Neurotrophic keratitis",
    subspecialty: "Ocular Surface",
    prevalence: "Rara (<5/10.000); subdiagnosticada",
    etiology: ["VHS/VVZ", "Cirugía refractiva", "Diabetes", "Tumores/cirugía intracraneal"],
    symptoms: ["Asintomático pese a lesión", "Visión borrosa", "Sequedad"],
    signs: ["Hipoestesia corneal", "Defecto epitelial persistente", "Adelgazamiento estromal"],
    diagnostics: [
      "Estesiometría de Cochet-Bonnet",
      "Tinción con fluoresceína",
      "Microscopía confocal (plexo subbasal)",
    ],
    differential: [
      "Queratopatía por exposición",
      "Queratitis tóxica",
      "Síndrome de Stevens-Johnson",
    ],
    treatment_steps: [
      "Estadio 1: lubricación intensiva sin conservantes",
      "Estadio 2: suero autólogo, lente terapéutica, cenegermin (rhNGF) 6 semanas",
      "Estadio 3: tarsorrafia, membrana amniótica, cenegermin, trasplante de nervios corneales (CNR)",
    ],
    complications: ["Perforación corneal", "Infección secundaria"],
    prognosis: "Bueno si diagnóstico precoz; cenegermin cura epitelio en >70%",
    red_flags: ["Adelgazamiento >50% → cirugía urgente"],
    guidelines: ["EuCornea NK 2024"],
    icd10: "H16.231",
  },
  // ---------- Cataract / Refractive ----------
  {
    id: "p-cataract",
    name_es: "Catarata",
    name_en: "Cataract",
    subspecialty: "Cataract",
    prevalence: "Principal causa global de ceguera reversible",
    etiology: ["Edad", "Diabetes", "Corticoides", "Trauma", "Congénita"],
    symptoms: ["Visión borrosa progresiva", "Deslumbramiento", "Cambios refractivos"],
    signs: ["Opacificación nuclear, cortical, subcapsular posterior"],
    diagnostics: [
      "LOCS III",
      "Biometría óptica (IOL Master, Lenstar)",
      "Topografía",
      "OCT macular preop",
    ],
    differential: ["DMAE coexistente", "Distrofia corneal", "Ambliopía"],
    treatment_steps: [
      "Facoemulsificación con LIO (monofocal, tórica, EDOF, multifocal, trifocal, premium)",
      "Cirugía asistida por femtosegundo en casos seleccionados",
      "MSICS en entornos de bajo recurso",
      "Manejo de PCR / luxación zonular con anillos de tensión capsular",
    ],
    complications: [
      "PCR",
      "Endoftalmitis (0.05%)",
      "Edema macular cistoide (Irvine-Gass)",
      "Opacificación capsular posterior",
    ],
    prognosis: "Excelente; >95% logran AV ≥20/40 sin comorbilidad",
    red_flags: ["Pérdida visual brusca postop → descartar endoftalmitis"],
    guidelines: ["ESCRS Endophthalmitis 2024", "AAO PPP Cataract 2024"],
    icd10: "H25.9",
  },
  {
    id: "p-refractive",
    name_es: "Errores refractivos (miopía, hipermetropía, astigmatismo, presbicia)",
    name_en: "Refractive errors",
    subspecialty: "Refractive Surgery",
    prevalence: "Miopía: ≈30% global, proyectado 50% para 2050",
    etiology: ["Genética + ambiente (tiempo al aire libre, trabajo cercano)"],
    symptoms: ["Visión borrosa", "Astenopia", "Cefaleas"],
    signs: ["Refracción subjetiva/objetiva", "Topografía"],
    diagnostics: ["Refracción ciclopléjica", "Topografía/aberrometría", "Tomografía", "Biometría"],
    differential: ["Cataratas incipientes", "Queratocono subclínico"],
    treatment_steps: [
      "Gafas / lentes de contacto",
      "Atropina 0.01–0.05% en miopía infantil",
      "LASIK / SMILE / PRK",
      "ICL (lentes fáquicas) en miopía alta",
      "Cirugía de cristalino transparente / PRELEX en présbitas",
    ],
    complications: ["Ectasia post-LASIK", "Ojo seco postquirúrgico", "Halos/glare"],
    prognosis: "Excelente con selección adecuada (Pentacam + Corvis)",
    red_flags: ["Asimetría inferior + adelgazamiento → no operar (Belin-Ambrósio enhanced)"],
    guidelines: ["ESCRS Refractive 2024", "ASCRS Refractive 2024"],
    icd10: "H52.x",
  },
  // ---------- Uveitis ----------
  {
    id: "p-uveitis-ant",
    name_es: "Uveítis anterior aguda",
    name_en: "Acute anterior uveitis",
    subspecialty: "Uveitis",
    prevalence: "Forma más común de uveítis",
    etiology: [
      "Idiopática",
      "HLA-B27 (espondilitis, EII, psoriasis)",
      "Herpes (VHS/VVZ/CMV)",
      "Sarcoidosis",
      "Sífilis",
      "TBC",
    ],
    symptoms: ["Dolor", "Fotofobia", "Visión borrosa", "Ojo rojo periquerático"],
    signs: [
      "Tyndall y flare en CA",
      "Precipitados queráticos",
      "Miosis",
      "Sinequias posteriores",
      "PIO variable",
    ],
    diagnostics: [
      "Slit-lamp",
      "PIO",
      "Estudio sistémico dirigido (HLA-B27, ECA, RX tórax, VDRL/RPR, IGRA)",
    ],
    differential: ["Endoftalmitis", "Queratouveítis herpética", "Crisis glaucomatocíclica"],
    treatment_steps: [
      "Corticoide tópico potente (prednisolona acetato 1% horaria)",
      "Ciclopléjico (atropina 1% / ciclopentolato 1%)",
      "Tratamiento etiológico (aciclovir VO en herpes, antibióticos en sífilis, antifímicos)",
      "Inmunomoduladores si crónica/bilateral/severa",
    ],
    complications: ["Catarata", "Glaucoma uveítico", "Edema macular cistoide"],
    prognosis: "Buen pronóstico si tratamiento precoz; recurrencias frecuentes en HLA-B27",
    red_flags: ["Hipopión + dolor severo postquirúrgico → endoftalmitis"],
    guidelines: ["SUN Working Group 2024"],
    icd10: "H20.0",
  },
  // ---------- Oculoplastics ----------
  {
    id: "p-thyroid",
    name_es: "Oftalmopatía tiroidea (enfermedad de Graves orbitaria)",
    name_en: "Thyroid eye disease",
    subspecialty: "Oculoplastics",
    prevalence: "≈25–50% de pacientes con Graves",
    etiology: ["Autoinmunidad (TSI/TRAb)", "Tabaquismo (factor de riesgo mayor)"],
    symptoms: ["Diplopia", "Proptosis", "Retracción palpebral", "Dolor periocular"],
    signs: [
      "Lid lag",
      "Retracción palpebral",
      "Restricción muscular",
      "Neuropatía óptica compresiva en formas severas",
    ],
    diagnostics: ["TSH, T4L, TRAb", "TC/RM orbitaria", "Hertel", "Campimetría", "Score CAS"],
    differential: ["Tumor orbitario", "Pseudotumor inflamatorio", "Miastenia gravis"],
    treatment_steps: [
      "Cese del tabaco (clave)",
      "Selenio en formas leves activas (EUGOGO)",
      "Corticoides IV (metilprednisolona pulsada) en moderada-severa activa",
      "Teprotumumab (anti-IGF-1R) en activa moderada-severa (donde disponible)",
      "Rituximab / tocilizumab en refractarios",
      "Descompresión orbitaria, cirugía de estrabismo y palpebral en fase inactiva",
    ],
    complications: ["Neuropatía óptica distiroidea", "Queratopatía por exposición"],
    prognosis: "Estabilización en 1–3 años (curva de Rundle); secuelas frecuentes",
    red_flags: ["Disminución de AV o defecto pupilar → descompresión urgente"],
    guidelines: ["EUGOGO 2021", "ATA 2024"],
    icd10: "H05.2",
  },
  // ---------- Neuro-ophthalmology ----------
  {
    id: "p-naion",
    name_es: "Neuropatía óptica isquémica anterior no arterítica",
    name_en: "Non-arteritic anterior ischemic optic neuropathy",
    subspecialty: "Neuro-Ophthalmology",
    prevalence: "≈2–10/100.000/año en >50 años",
    etiology: [
      "Disco abarrotado (crowded disc)",
      "HTA",
      "DM",
      "Apnea del sueño",
      "Hipotensión nocturna",
    ],
    symptoms: ["Pérdida visual indolora súbita, frecuentemente al despertar"],
    signs: [
      "Edema de papila sectorial",
      "Hemorragias peripapilares",
      "Defecto pupilar aferente relativo",
    ],
    diagnostics: ["CV", "OCT-RNFL", "VSG/PCR para descartar arterítica", "RM si atípica"],
    differential: ["Arterítica (arteritis de células gigantes)", "Neuritis óptica", "Compresiva"],
    treatment_steps: [
      "Control de factores de riesgo vasculares",
      "Aspirina (controvertida)",
      "Tratamiento de apnea del sueño",
      "Evitar hipotensión nocturna y sildenafilo",
    ],
    complications: ["NAION del ojo contralateral (15% a 5 años)"],
    prognosis: "Sin recuperación significativa de AV en mayoría",
    red_flags: [
      "Cefalea, claudicación mandibular, VSG >50 → descartar arterítica, corticoides IV urgentes",
    ],
    guidelines: ["NANOS Consensus 2024"],
    icd10: "H47.011",
  },
  // ---------- Pediatric ----------
  {
    id: "p-rop",
    name_es: "Retinopatía del prematuro",
    name_en: "Retinopathy of prematurity",
    subspecialty: "Pediatric Ophthalmology",
    prevalence: "≈68% en <1.250 g; severa en ≈10%",
    etiology: ["Prematuridad", "Bajo peso al nacer", "Oxigenoterapia"],
    symptoms: ["Asintomática; cribado en UCIN"],
    signs: ["Línea de demarcación", "Cresta", "Proliferación fibrovascular", "Plus disease"],
    diagnostics: ["Oftalmoscopia indirecta con depresor", "RetCam"],
    differential: ["Vitreorretinopatía exudativa familiar (FEVR)", "Enfermedad de Norrie"],
    treatment_steps: [
      "Láser ablativo retiniano avascular (estándar)",
      "Anti-VEGF intravítreo (bevacizumab/ranibizumab) en zona I (BEAT-ROP, RAINBOW)",
      "Vitrectomía si desprendimiento traccional",
    ],
    complications: ["Desprendimiento retiniano", "Miopía alta", "Ambliopía"],
    prognosis: "Buena con cribado y tratamiento oportuno",
    red_flags: ["Plus disease + zona I → tratamiento en 48–72 h"],
    guidelines: ["ICROP3 2021", "AAP/AAO ROP Screening 2024"],
    icd10: "H35.10",
  },
  {
    id: "p-strabismus",
    name_es: "Estrabismo",
    name_en: "Strabismus",
    subspecialty: "Pediatric Ophthalmology",
    prevalence: "≈3–5% en niños",
    etiology: [
      "Hereditario",
      "Anisometropía",
      "Hipermetropía no corregida (esotropia acomodativa)",
      "Parálisis de pares craneales",
    ],
    symptoms: ["Desviación ocular", "Diplopia (en adultos)", "Tortícolis compensador"],
    signs: ["Hirschberg, cover/uncover, prismas alternantes"],
    diagnostics: [
      "Cover test",
      "Ducciones/versiones",
      "Refracción ciclopléjica",
      "Test de Lancaster",
    ],
    differential: ["Pseudoestrabismo", "Síndromes restrictivos", "Miastenia"],
    treatment_steps: [
      "Corrección óptica completa",
      "Oclusión / penalización por ambliopía",
      "Toxina botulínica en casos seleccionados",
      "Cirugía sobre músculos extraoculares",
    ],
    complications: ["Ambliopía permanente si no tratada antes de 7–9 años"],
    prognosis: "Bueno con detección temprana",
    red_flags: ["Estrabismo de inicio agudo en adulto → estudio neurológico"],
    guidelines: ["AAPOS 2024"],
    icd10: "H50.x",
  },
];

/* ============================================================
 *                          FÁRMACOS
 * ============================================================ */
const ATLAS_DRUGS_BASE: AtlasDrug[] = [
  {
    id: "d-latanoprost",
    inn: "Latanoprost 0.005%",
    brand_examples: ["Xalatan", "Monoprost (sin conservantes)"],
    drug_class: "Análogo de prostaglandinas (FP)",
    indications: ["Glaucoma de ángulo abierto", "Hipertensión ocular"],
    posology: "1 gota en el ojo afecto cada 24 h, preferentemente por la noche",
    mechanism: "Aumenta el flujo uveoescleral",
    contraindications: ["Uveítis activa (relativa)", "Edema macular cistoide en pseudofáquicos"],
    adverse_effects: [
      "Hiperemia",
      "Hiperpigmentación iridiana y periorbitaria",
      "Crecimiento de pestañas",
      "PAP (prostaglandin-associated periorbitopathy)",
    ],
    notes: "Reducción media de PIO 25–35%",
  },
  {
    id: "d-timolol",
    inn: "Timolol 0.5%",
    brand_examples: ["Timoptol", "Cusimolol"],
    drug_class: "Beta-bloqueante no selectivo",
    indications: ["Glaucoma", "HTO"],
    posology: "1 gota/12 h",
    mechanism: "Reduce la producción de humor acuoso",
    contraindications: ["Asma", "EPOC severo", "Bradicardia", "Bloqueo AV"],
    adverse_effects: ["Broncoespasmo", "Bradicardia", "Hipotensión", "Depresión"],
  },
  {
    id: "d-brinzolamida",
    inn: "Brinzolamida 1% / Dorzolamida 2%",
    brand_examples: ["Azopt", "Trusopt"],
    drug_class: "Inhibidor tópico de la anhidrasa carbónica",
    indications: ["Glaucoma", "HTO"],
    posology: "1 gota/8–12 h",
    mechanism: "Reduce la producción de humor acuoso",
    contraindications: ["Alergia a sulfonamidas", "Insuficiencia renal severa"],
    adverse_effects: ["Sabor amargo", "Sensación urente", "Queratopatía en endotelio comprometido"],
  },
  {
    id: "d-aflibercept",
    inn: "Aflibercept 2 mg / 8 mg",
    brand_examples: ["Eylea", "Eylea HD"],
    drug_class: "Anti-VEGF (trampa de VEGF-A, VEGF-B, PlGF)",
    indications: ["DMAE neovascular", "EMD", "OVCR/ORVR", "ROP"],
    posology:
      "Carga mensual ×3, después treat-and-extend; 8 mg permite intervalos extendidos hasta 16 sem",
    mechanism: "Inhibe VEGF-A, VEGF-B y PlGF",
    contraindications: ["Infección ocular o periocular activa", "Inflamación intraocular activa"],
    adverse_effects: [
      "Endoftalmitis (1/2000–1/5000)",
      "Aumento de PIO transitorio",
      "Hemorragia subconjuntival",
    ],
  },
  {
    id: "d-faricimab",
    inn: "Faricimab 6 mg",
    brand_examples: ["Vabysmo"],
    drug_class: "Anticuerpo biespecífico anti-VEGF-A / anti-Ang-2",
    indications: ["DMAE neovascular", "EMD", "OVR"],
    posology: "Carga 4 dosis mensuales, después intervalos personalizados hasta 16 sem",
    mechanism: "Bloqueo dual VEGF-A y angiopoyetina-2",
    contraindications: ["Infección ocular activa"],
    adverse_effects: ["Vitritis", "Aumento de PIO", "Endoftalmitis"],
    notes: "Estudios YOSEMITE/RHINE, TENAYA/LUCERNE",
  },
  {
    id: "d-cenegermin",
    inn: "Cenegermin (rhNGF) 20 µg/mL",
    brand_examples: ["Oxervate"],
    drug_class: "Factor de crecimiento nervioso recombinante",
    indications: ["Queratitis neurotrófica moderada-severa (estadios 2-3)"],
    posology: "1 gota/2 h, 6 veces/día durante 8 semanas",
    mechanism: "Estimula la regeneración del nervio corneal y epitelización",
    contraindications: ["Hipersensibilidad"],
    adverse_effects: ["Dolor ocular", "Hiperemia", "Lagrimeo"],
  },
  {
    id: "d-ciclosporina",
    inn: "Ciclosporina A 0.05–0.1%",
    brand_examples: ["Restasis 0.05%", "Ikervis 0.1%", "Cequa 0.09%"],
    drug_class: "Inmunomodulador calcineurínico",
    indications: [
      "Ojo seco moderado-severo",
      "Queratoconjuntivitis vernal/atópica",
      "Inmunosupresión post-queratoplastia",
    ],
    posology: "1 gota/12 h (0.05%) o 1 gota/día (0.1%)",
    mechanism: "Inhibe la activación de linfocitos T",
    contraindications: ["Infección activa"],
    adverse_effects: ["Escozor inicial", "Hiperemia"],
  },
  {
    id: "d-aciclovir-vo",
    inn: "Aciclovir VO / Valaciclovir VO",
    brand_examples: ["Zovirax", "Valtrex"],
    drug_class: "Antiviral análogo de nucleósidos",
    indications: [
      "Queratitis herpética epitelial/estromal",
      "HZO",
      "Profilaxis tras queratoplastia herpética",
    ],
    posology:
      "Aciclovir 400 mg 5/día tratamiento; 400 mg/12 h profilaxis. Valaciclovir 500 mg/8 h tratamiento, 500 mg/día profilaxis",
    mechanism: "Inhibición de la ADN polimerasa viral",
    contraindications: ["Insuficiencia renal severa (ajustar dosis)"],
    adverse_effects: ["Nefrotoxicidad", "Cefalea", "Náuseas"],
  },
  {
    id: "d-moxi-vanco-intrav",
    inn: "Vancomicina 1 mg / Ceftazidima 2.25 mg intravítreos",
    brand_examples: ["Preparado magistral"],
    drug_class: "Antibioterapia intravítrea de amplio espectro",
    indications: ["Endoftalmitis aguda postoperatoria/post-inyección"],
    posology: "Inyección intravítrea única, repetir a 48–72 h según evolución",
    mechanism: "Vancomicina cubre Gram + (S. epidermidis), ceftazidima cubre Gram −",
    contraindications: ["Alergia documentada"],
    adverse_effects: ["HORV (vasculitis hemorrágica oclusiva) con vancomicina"],
    notes: "Estudio EVS 1995; nuevas guías ESCRS 2024",
  },
  {
    id: "d-atropina-mio",
    inn: "Atropina 0.01–0.05%",
    brand_examples: ["Atropina sulfato magistral", "Eikance 0.01%"],
    drug_class: "Antimuscarínico",
    indications: ["Control de la progresión miópica infantil", "Cicloplejía (1%)"],
    posology: "1 gota nocturna; bajas dosis (0.01–0.05%) para miopía",
    mechanism: "Mecanismo no acomodativo, probablemente coroideo/escleral",
    contraindications: ["Glaucoma de ángulo estrecho", "Hipersensibilidad"],
    adverse_effects: ["Fotofobia", "Cicloplejía residual", "Reacciones sistémicas raras"],
    notes: "Estudios LAMP, ATOM",
  },
];

/* ============================================================
 *                       DISPOSITIVOS
 * ============================================================ */
const ATLAS_DEVICES_BASE: AtlasDevice[] = [
  {
    id: "dv-octa",
    name: "Spectralis / Cirrus / PlexElite OCT",
    category: "Imaging",
    manufacturer: "Heidelberg / Zeiss",
    indications: ["Mácula", "Nervio óptico", "Coroides (EDI)"],
    parameters: ["SD-OCT", "Swept-source", "OCT-A"],
  },
  {
    id: "dv-pentacam",
    name: "Pentacam AXL Wave",
    category: "Diagnostic",
    manufacturer: "Oculus",
    indications: ["Topografía Scheimpflug", "Tomografía corneal", "Biometría"],
    parameters: ["BAD-D", "Belin/Ambrósio Enhanced Ectasia"],
  },
  {
    id: "dv-corvis",
    name: "Corvis ST",
    category: "Diagnostic",
    manufacturer: "Oculus",
    indications: ["Biomecánica corneal", "Detección de ectasia subclínica"],
    parameters: ["CBI", "TBI"],
  },
  {
    id: "dv-istent",
    name: "iStent inject W",
    category: "Implant",
    manufacturer: "Glaukos",
    indications: ["Glaucoma leve-moderado combinado con catarata"],
    parameters: ["Stent trabecular"],
  },
  {
    id: "dv-hydrus",
    name: "Hydrus Microstent",
    category: "Implant",
    manufacturer: "Alcon",
    indications: ["Glaucoma leve-moderado"],
    parameters: ["8 mm, Schlemm scaffolding"],
  },
  {
    id: "dv-xen",
    name: "XEN 45 / 63 Gel Stent",
    category: "Implant",
    manufacturer: "AbbVie",
    indications: ["Glaucoma moderado-severo"],
    parameters: ["Subconjuntival ab-interno"],
  },
  {
    id: "dv-slt",
    name: "SLT (Selective Laser Trabeculoplasty)",
    category: "Laser",
    manufacturer: "Lumenis / Ellex",
    indications: ["POAG", "HTO", "Pigmentario", "Pseudoexfoliativo"],
    parameters: ["532 nm Q-switched"],
  },
  {
    id: "dv-femto",
    name: "LASIK femtosegundo / SMILE",
    category: "Laser",
    manufacturer: "Zeiss VisuMax / Alcon LenSx",
    indications: ["Miopía", "Astigmatismo", "Hipermetropía"],
    parameters: ["Pulso fs"],
  },
  {
    id: "dv-iol-trifocal",
    name: "LIO trifocal AcrySof PanOptix / FineVision",
    category: "Implant",
    manufacturer: "Alcon / BVI",
    indications: ["Cirugía premium de catarata", "PRELEX"],
    parameters: ["Difractiva trifocal"],
  },
  {
    id: "dv-iol-edof",
    name: "LIO EDOF (Vivity / Symfony)",
    category: "Implant",
    manufacturer: "Alcon / J&J",
    indications: ["Profundidad de foco extendida", "Pacientes con cero tolerancia a disfotopsias"],
  },
  {
    id: "dv-icl",
    name: "ICL EVO+ V5",
    category: "Implant",
    manufacturer: "STAAR Surgical",
    indications: ["Miopía alta (-3 a -18 D)", "Astigmatismo hasta 6 D"],
    parameters: ["Phakic posterior chamber"],
  },
  {
    id: "dv-cxl",
    name: "Crosslinking Avedro KXL / Mosaic",
    category: "Surgical",
    manufacturer: "Glaukos / Avedro",
    indications: ["Queratocono progresivo", "Ectasia post-LASIK"],
    parameters: ["UVA 365 nm + riboflavina"],
  },
  {
    id: "dv-vit27",
    name: "Vitrectomía 27G Constellation / EVA",
    category: "Surgical",
    manufacturer: "Alcon / DORC",
    indications: ["DR regmatógeno", "Hemorragia vítrea", "Membranas epirretinianas"],
    parameters: ["10.000 cpm"],
  },
  {
    id: "dv-confoscan",
    name: "HRT Rostock / Confoscan",
    category: "Imaging",
    manufacturer: "Heidelberg / Nidek",
    indications: ["Acanthamoeba", "Hongos", "Distrofias corneales", "Plexo subbasal"],
  },
];

/* ============================================================
 *                       GUÍAS CLÍNICAS
 * ============================================================ */
const ATLAS_GUIDELINES_BASE: AtlasGuideline[] = [
  {
    id: "g-aao-amd",
    title: "Preferred Practice Pattern: Age-Related Macular Degeneration",
    society: "American Academy of Ophthalmology",
    year: 2024,
    subspecialty: "Retina",
    scope: "Diagnóstico y manejo de DMAE",
    key_recommendations: [
      "AREDS2 en intermedia/avanzada",
      "Anti-VEGF en MNV",
      "Pegcetacoplan en atrofia geográfica seleccionada",
    ],
    url_hint: "aao.org/ppp",
  },
  {
    id: "g-egs-5",
    title: "European Glaucoma Society Guidelines 5th Edition",
    society: "EGS",
    year: 2024,
    subspecialty: "Glaucoma",
    scope: "Diagnóstico, monitorización y tratamiento del glaucoma",
    key_recommendations: [
      "SLT como 1ª línea (LiGHT)",
      "PIO objetivo individualizada",
      "MIGS en moderado",
    ],
    url_hint: "eugs.org",
  },
  {
    id: "g-euretina-rvo",
    title: "EURETINA Guidelines on Retinal Vein Occlusions",
    society: "EURETINA",
    year: 2024,
    subspecialty: "Retina",
    scope: "Manejo de RVO",
    key_recommendations: [
      "Anti-VEGF como 1ª línea para edema macular",
      "PRP si neovascularización",
    ],
  },
  {
    id: "g-dews",
    title: "TFOS DEWS II",
    society: "Tear Film & Ocular Surface Society",
    year: 2017,
    subspecialty: "Ocular Surface",
    scope: "Definición, clasificación y manejo del ojo seco",
    key_recommendations: [
      "Tratamiento escalonado",
      "Identificar componente evaporativo vs acuodeficiente",
    ],
  },
  {
    id: "g-eugogo",
    title: "EUGOGO Guidelines on Graves Orbitopathy",
    society: "EUGOGO",
    year: 2021,
    subspecialty: "Oculoplastics",
    scope: "Manejo de la oftalmopatía tiroidea",
    key_recommendations: [
      "Cese tabáquico",
      "Selenio en leve activa",
      "Corticoides IV en moderada-severa",
      "Teprotumumab",
    ],
  },
  {
    id: "g-icrop3",
    title: "ICROP Third Edition",
    society: "International Committee for Classification of ROP",
    year: 2021,
    subspecialty: "Pediatric Ophthalmology",
    scope: "Clasificación de ROP",
    key_recommendations: ["Zonas, estadios, plus, AROP"],
  },
  {
    id: "g-sun",
    title: "Standardization of Uveitis Nomenclature (SUN)",
    society: "SUN Working Group",
    year: 2024,
    subspecialty: "Uveitis",
    scope: "Clasificación y terminología en uveítis",
    key_recommendations: ["Criterios diagnósticos por entidad específica"],
  },
  {
    id: "g-escrs-endo",
    title: "ESCRS Guidelines for Prevention and Treatment of Endophthalmitis",
    society: "ESCRS",
    year: 2024,
    subspecialty: "Cataract",
    scope: "Profilaxis y tratamiento de endoftalmitis post-cataratas",
    key_recommendations: ["Cefuroxima intracameral 1 mg", "Povidona yodada 5% preoperatoria"],
  },
  {
    id: "g-nanos",
    title: "NANOS Consensus on Optic Neuropathies",
    society: "NANOS",
    year: 2024,
    subspecialty: "Neuro-Ophthalmology",
    scope: "Neuropatías ópticas",
    key_recommendations: ["Diferenciar NAION vs arterítica con VSG/PCR + biopsia AT si dudas"],
  },
  {
    id: "g-ico-dr",
    title: "ICO Diabetic Eye Care",
    society: "International Council of Ophthalmology",
    year: 2024,
    subspecialty: "Retina",
    scope: "Cribado y manejo de retinopatía diabética",
    key_recommendations: [
      "Cribado anual desde diagnóstico (DM2) o 5 años (DM1)",
      "Anti-VEGF/PRP según severidad",
    ],
  },
];

/* ============================================================
 *                            KOLs
 * ============================================================ */
const ATLAS_KOLS_BASE: AtlasKOL[] = [
  {
    id: "k-alio",
    name: "Prof. Jorge L. Alió",
    affiliation: "Vissum / Universidad Miguel Hernández",
    country: "España",
    subspecialties: ["Cornea", "Refractive Surgery", "Cataract"],
    expertise: ["Queratocono", "Queratopigmentación", "ICRS", "LIO premium"],
    h_index: 110,
  },
  {
    id: "k-mansouri",
    name: "Dr. Kaweh Mansouri",
    affiliation: "Swiss Visio Montchoisi / Univ. Colorado",
    country: "Suiza/EE. UU.",
    subspecialties: ["Glaucoma"],
    expertise: ["Telemetría 24h PIO", "MIGS", "OCT-A papilar"],
    h_index: 50,
  },
  {
    id: "k-teus",
    name: "Dr. Miguel Á. Teus",
    affiliation: "Hospital Príncipe de Asturias / UAH",
    country: "España",
    subspecialties: ["Cornea", "Glaucoma"],
    expertise: ["DMEK", "Cirugía refractiva", "Glaucoma"],
    h_index: 35,
  },
  {
    id: "k-melles",
    name: "Dr. Gerrit Melles",
    affiliation: "NIIOS Rotterdam",
    country: "Países Bajos",
    subspecialties: ["Cornea"],
    expertise: ["DMEK", "DSAEK", "Bowman layer transplantation"],
    h_index: 70,
  },
  {
    id: "k-calonge",
    name: "Dra. Margarita Calonge",
    affiliation: "IOBA Valladolid",
    country: "España",
    subspecialties: ["Ocular Surface"],
    expertise: ["Ojo seco", "Membrana amniótica", "Terapia celular limbar"],
    h_index: 60,
  },
  {
    id: "k-biousse",
    name: "Dr. Valérie Biousse",
    affiliation: "Emory University",
    country: "EE. UU.",
    subspecialties: ["Neuro-Ophthalmology"],
    expertise: ["NAION", "Edema de papila", "Neuro-imagen no midriática"],
    h_index: 80,
  },
  {
    id: "k-riss",
    name: "Dr. Isabelle Riss",
    affiliation: "Polyclinique Bordeaux Nord",
    country: "Francia",
    subspecialties: ["Glaucoma"],
    expertise: ["MIGS", "MIBS", "XEN", "Preserflo"],
  },
  {
    id: "k-koh",
    name: "Prof. Adrian Koh",
    affiliation: "Eye & Retina Surgeons Singapore",
    country: "Singapur",
    subspecialties: ["Retina"],
    expertise: ["PCV", "DMAE asiática", "ICG"],
    h_index: 55,
  },
  {
    id: "k-foster",
    name: "Dr. C. Stephen Foster",
    affiliation: "MERSI / Harvard",
    country: "EE. UU.",
    subspecialties: ["Uveitis"],
    expertise: ["Uveítis no infecciosa", "Inmunomoduladores", "Esclerosis"],
    h_index: 90,
  },
];

/* ============================================================
 *                     CLASIFICACIONES
 * ============================================================ */
const ATLAS_CLASSIFICATIONS_BASE: AtlasClassification[] = [
  {
    id: "c-icrop",
    name: "Clasificación ICROP3 (ROP)",
    subspecialty: "Pediatric Ophthalmology",
    use: "Estadiaje de retinopatía del prematuro",
    stages: [
      { code: "Estadio 1", description: "Línea de demarcación" },
      { code: "Estadio 2", description: "Cresta" },
      { code: "Estadio 3", description: "Proliferación fibrovascular extrarretiniana" },
      { code: "Estadio 4", description: "Desprendimiento parcial (4A extrafoveal, 4B macular)" },
      { code: "Estadio 5", description: "Desprendimiento total" },
      { code: "AROP", description: "Aggressive ROP (antes AP-ROP)" },
    ],
  },
  {
    id: "c-etdrs-dr",
    name: "ETDRS para retinopatía diabética",
    subspecialty: "Retina",
    use: "Severidad de RD",
    stages: [
      { code: "Sin RD", description: "Sin lesiones" },
      { code: "RDNP leve", description: "Microaneurismas únicamente" },
      { code: "RDNP moderada", description: "Hemorragias/exudados sin alcanzar nivel severo" },
      { code: "RDNP severa", description: "Regla 4-2-1" },
      { code: "RDP", description: "Neovascularización" },
    ],
  },
  {
    id: "c-amsler-kc",
    name: "Amsler-Krumeich (queratocono)",
    subspecialty: "Cornea",
    use: "Severidad de queratocono",
    stages: [
      { code: "I", description: "Miopía/astigmatismo ≤5 D, K <48 D, sin opacidades" },
      {
        code: "II",
        description: "Miopía/astigmatismo 5–8 D, K <53 D, sin opacidades, paquimetría ≥400",
      },
      { code: "III", description: "Miopía/astigmatismo 8–10 D, K 53–55 D, paquimetría 300–400" },
      { code: "IV", description: "K >55 D, paquimetría <200, opacidades centrales" },
    ],
  },
  {
    id: "c-locs",
    name: "LOCS III (catarata)",
    subspecialty: "Cataract",
    use: "Cuantificación de catarata",
    stages: [
      { code: "NC/NO 1-6", description: "Color y opalescencia nuclear" },
      { code: "C 1-5", description: "Cortical" },
      { code: "P 1-5", description: "Subcapsular posterior" },
    ],
  },
  {
    id: "c-sun-uveitis",
    name: "SUN (uveítis)",
    subspecialty: "Uveitis",
    use: "Localización anatómica, curso temporal y actividad",
    stages: [
      { code: "Anterior", description: "Iridociclitis" },
      { code: "Intermedia", description: "Pars planitis, vitritis" },
      { code: "Posterior", description: "Coriorretinitis" },
      { code: "Panuveítis", description: "Inflamación de las 3 cámaras" },
    ],
  },
];

/* ============================================================
 *          MERGED EXPORTS (base + extended corpus)
 * ============================================================ */
export const ATLAS_PATHOLOGIES: AtlasPathology[] = [
  ...ATLAS_PATHOLOGIES_BASE,
  ...ATLAS_PATHOLOGIES_EXT,
];
export const ATLAS_DRUGS: AtlasDrug[] = [...ATLAS_DRUGS_BASE, ...ATLAS_DRUGS_EXT];
export const ATLAS_DEVICES: AtlasDevice[] = [...ATLAS_DEVICES_BASE, ...ATLAS_DEVICES_EXT];
export const ATLAS_GUIDELINES: AtlasGuideline[] = [
  ...ATLAS_GUIDELINES_BASE,
  ...ATLAS_GUIDELINES_EXT,
];
export const ATLAS_KOLS: AtlasKOL[] = [...ATLAS_KOLS_BASE, ...ATLAS_KOLS_EXT];
export const ATLAS_CLASSIFICATIONS: AtlasClassification[] = [
  ...ATLAS_CLASSIFICATIONS_BASE,
  ...ATLAS_CLASSIFICATIONS_EXT,
];
