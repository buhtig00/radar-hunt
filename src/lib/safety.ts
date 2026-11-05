import type { Language, SafetyFlag } from "./types";

const ES_TERMS = [
  "pérdida súbita de visión",
  "perdida subita de vision",
  "dolor ocular severo",
  "traumatismo ocular",
  "endoftalmitis",
  "glaucoma agudo",
  "quemadura química",
  "quemadura quimica",
  "diplopía aguda",
  "diplopia aguda",
  "anisocoria aguda",
  "oclusión vascular",
  "oclusion vascular",
];

const EN_TERMS = [
  "sudden vision loss",
  "severe ocular pain",
  "ocular trauma",
  "endophthalmitis",
  "acute glaucoma",
  "chemical burn",
  "acute diplopia",
  "acute anisocoria",
  "vascular occlusion",
];

const DIAGNOSIS_PATTERNS = [
  /\bdiagnose\b/i,
  /\bdiagnostic[ao]s? definitiv[ao]s?\b/i,
  /\bdefinitive diagnosis\b/i,
  /\bwhat does (this|my) patient have\b/i,
  /\bqué tiene (este|mi) paciente\b/i,
];

const TREATMENT_PATTERNS = [
  /\bwhat dose\b/i,
  /\bdosage\b/i,
  /\bhow many mg\b/i,
  /\bqué dosis\b/i,
  /\bque dosis\b/i,
  /\bprescribe?\b/i,
  /\breceta\b/i,
];

const IMAGE_PATTERNS = [
  /\binterpret (this )?(oct|image|fundus|angiograph)/i,
  /\binterpreta (esta )?(oct|imagen|fondo|angiograf)/i,
];

const PII_PATTERNS = [
  /\b\d{2}[-/]\d{2}[-/]\d{2,4}\b/,
  /\b\d{6,}\b/,
  /\b[A-Z][a-z]+ [A-Z][a-z]+\b/,
  /\b\d{3}[-\s]?\d{3}[-\s]?\d{4}\b/,
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/,
];

export interface SafetyResult {
  emergency: boolean;
  categories: string[];
  matchedTerms: string[];
  flags: SafetyFlag[];
}

/**
 * Normaliza el texto para comparar términos: minúsculas y sin diacríticos
 * (NFD), de modo que "pérdida" y "perdida" coincidan por igual. Evita falsos
 * negativos cuando el usuario omite los acentos.
 */
export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function detectSafety(query: string, language: Language = "es"): SafetyResult {
  const lower = normalizeForMatch(query);
  const terms = language === "es" ? [...ES_TERMS, ...EN_TERMS] : [...EN_TERMS, ...ES_TERMS];
  // Comparamos sobre la forma normalizada en ambos lados para que las
  // variantes con/sin tilde se detecten de forma consistente.
  const matchedTerms = terms.filter((t) => lower.includes(normalizeForMatch(t)));
  const categories: string[] = [];
  const flags: SafetyFlag[] = [];

  if (matchedTerms.length > 0) {
    categories.push("Síntoma de urgencia");
    flags.push("Emergency symptom", "Red flag");
  }
  if (DIAGNOSIS_PATTERNS.some((p) => p.test(query))) {
    categories.push("Solicitud de diagnóstico definitivo");
    flags.push("Needs specialist review");
  }
  if (TREATMENT_PATTERNS.some((p) => p.test(query))) {
    categories.push("Solicitud de tratamiento/dosificación individual");
    flags.push("Needs specialist review");
  }
  if (IMAGE_PATTERNS.some((p) => p.test(query))) {
    categories.push("Solicitud de interpretación de imagen");
    flags.push("Needs specialist review");
  }
  if (PII_PATTERNS.some((p) => p.test(query))) {
    categories.push("Riesgo de datos identificables del paciente");
    flags.push("Patient-identifiable data risk");
  }

  return {
    emergency: matchedTerms.length > 0,
    categories,
    matchedTerms,
    flags,
  };
}

export const EDUCATIONAL_DISCLAIMER =
  "Esta respuesta tiene fines exclusivamente educativos y bibliográficos. No constituye diagnóstico médico ni recomendación de tratamiento individualizado. El juicio clínico es responsabilidad del profesional sanitario.";

export const SAFETY_QUERY_NOTICE =
  "Se ha detectado una consulta sensible a la seguridad. La respuesta se mantendrá educativa y no debe utilizarse como consejo médico urgente.";

/**
 * Detector local de PII para el formulario de Análisis de Casos Clínicos.
 * Se ejecuta íntegramente en el navegador antes de enviar ningún dato al servicio de IA.
 * Devuelve una lista legible de coincidencias que el médico debe eliminar.
 *
 * // TODO: Requiere validación médica/legal antes de producción — esto es
 *           una heurística de defensa en profundidad, no una garantía.
 */
export interface PIIMatch {
  type:
    | "email"
    | "phone"
    | "date_of_birth"
    | "id_number"
    | "medical_record"
    | "patient_name"
    | "address";
  excerpt: string;
  message: string;
}

const NAME_RE =
  /\b(?:Mr|Mrs|Ms|Dr|Sr|Sra|D\.|Dña\.|Don|Doña)\.?\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?\b/;
const ADDRESS_RE =
  /\b\d{1,5}\s+[A-ZÁÉÍÓÚÑ][\wáéíóúñ.]*\s+(?:Street|St|Avenue|Ave|Road|Rd|Calle|Avenida|Plaza|Carrer)\b/i;
const MRN_RE = /\b(?:MRN|HC|NHC|HIST(?:ORIA)?)[:\s#-]*[A-Z0-9-]{4,}\b/i;
const DOB_RE =
  /\b(?:DOB|FN|fecha de nacimiento|date of birth)\s*[:\-]?\s*\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}\b/i;
const DATE_RE = /\b\d{1,2}[-/.]\d{1,2}[-/.](?:19|20)\d{2}\b/;

export function detectPII(text: string): PIIMatch[] {
  const out: PIIMatch[] = [];
  const push = (m: PIIMatch) => out.push(m);

  const email = text.match(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/);
  if (email)
    push({
      type: "email",
      excerpt: email[0],
      message: "Dirección de email detectada. Elimínala antes de enviar el caso.",
    });

  const phone = text.match(/\b(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3}[\s-]?\d{3,4}\b/);
  if (phone && phone[0].replace(/\D/g, "").length >= 7)
    push({
      type: "phone",
      excerpt: phone[0],
      message: "Posible número de teléfono detectado. Elimínalo antes de enviar.",
    });

  const dob = text.match(DOB_RE) || text.match(DATE_RE);
  if (dob)
    push({
      type: "date_of_birth",
      excerpt: dob[0],
      message:
        "Se encontró una fecha que podría identificar al paciente. Sustituye las fechas específicas por rango de edad o tiempos relativos.",
    });

  const mrn = text.match(MRN_RE);
  if (mrn)
    push({
      type: "medical_record",
      excerpt: mrn[0],
      message: "Número de historia clínica detectado. Elimina los identificadores antes de enviar.",
    });

  const id = text.match(/\b\d{6,}\b/);
  if (id && !mrn)
    push({
      type: "id_number",
      excerpt: id[0],
      message:
        "Identificador numérico largo detectado. Asegúrate de que no sea un número de identidad.",
    });

  const name = text.match(NAME_RE);
  if (name)
    push({
      type: "patient_name",
      excerpt: name[0],
      message: "Posible nombre de paciente detectado. Usa iniciales o edad + sexo en su lugar.",
    });

  const addr = text.match(ADDRESS_RE);
  if (addr)
    push({
      type: "address",
      excerpt: addr[0],
      message: "Posible dirección postal detectada. Elimínala antes de enviar.",
    });

  const seen = new Set<string>();
  return out.filter((m) => {
    const k = `${m.type}:${m.excerpt}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
