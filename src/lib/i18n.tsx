import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApprovalStatus, Role, SafetyFlag, ValidationLevel } from "./types";
import type { PIIMatch } from "./safety";

export type UILocale = "es" | "en";

const STORAGE_KEY = "or-locale";

type Dict = Record<string, string>;

const ES: Dict = {
  // Shell
  "brand.tagline": "Capa de Inteligencia",
  "shell.educational_footer.title": "Uso educativo exclusivo.",
  "shell.educational_footer.body":
    "No sustituye al juicio clínico, diagnóstico ni tratamiento individualizado.",
  // Top bar
  "topbar.breadcrumb": "Capa de Inteligencia",
  "topbar.live": "Datos en vivo",
  "topbar.demo": "Modo demo",
  "topbar.live_tooltip": "Conectado a Supabase",
  "topbar.demo_tooltip": "Modo demo / datos simulados",
  "topbar.badge": "Uso educativo · MVP v0.9",
  "topbar.notifications": "Notificaciones",
  "topbar.role_menu": "Cambiar rol · demo",
  "topbar.role_active": "Activo",
  "topbar.language": "Idioma",
  "topbar.language_es": "Español",
  "topbar.language_en": "English",
  // Demo banner
  "demo.banner":
    "Modo demo activo · Supabase no conectado. Datos simulados localmente; configura las variables de entorno para pasar a modo en vivo.",
  // Sidebar groups
  "nav.group.overview": "Resumen",
  "nav.group.intelligence": "Inteligencia",
  "nav.group.editorial": "Editorial y validación",
  "nav.group.insights": "Insights",
  // Sidebar items
  "nav.dashboard": "Panel principal",
  "nav.clinical_ai": "OR IA Clínica",
  "nav.academy_tutor": "Tutor Academy",
  "nav.case_analysis": "Análisis de casos",
  "nav.knowledge_base": "Base de conocimiento",
  "nav.editorial_review": "Revisión editorial",
  "nav.kol_verification": "Verificación KOL",
  "nav.analytics": "Analítica",
  "nav.settings": "Configuración",
  "nav.implementation": "Checklist implementación",
  "nav.atlas": "Atlas oftalmológico",
  "nav.evidence": "Evidencia clínica",
  // Roles
  "role.admin": "Administrador",
  "role.medical_editor": "Editor médico",
  "role.kol": "KOL (líder de opinión)",
  "role.verified_doctor": "Oftalmólogo verificado",
  "role.industry_user": "Usuario industria",
  // Approval status badges
  "status.Draft": "Borrador",
  "status.Pending Review": "Pendiente de revisión",
  "status.Approved": "Aprobado",
  "status.Rejected": "Rechazado",
  "status.Archived": "Archivado",
  // Validation levels
  "validation.AI Generated": "Generado por IA · Educativo",
  "validation.OR Reviewed": "Revisado por OR",
  "validation.KOL Verified": "Verificado por KOL",
  "validation.KOL_with_name": "Verificado por KOL",
  // Safety flags
  "safety.Missing data": "Datos faltantes",
  "safety.Red flag": "Signo de alarma",
  "safety.Needs specialist review": "Requiere revisión por especialista",
  "safety.Evidence limited": "Evidencia limitada",
  "safety.KOL review recommended": "Revisión KOL recomendada",
  "safety.Emergency symptom": "Síntoma de urgencia",
  "safety.Patient-identifiable data risk": "Riesgo de datos identificables",
  // Disclaimers
  "disclaimer.educational_title": "Uso educativo y bibliográfico exclusivo.",
  "disclaimer.educational_body":
    "Esta respuesta tiene fines exclusivamente educativos y bibliográficos. No constituye diagnóstico médico ni recomendación de tratamiento individualizado. El juicio clínico es responsabilidad del profesional sanitario.",
  "disclaimer.educational_body_catalog":
    "Estos contenidos tienen fines exclusivamente educativos y bibliográficos. No constituyen diagnóstico médico ni recomendación de tratamiento individualizado; verifica siempre con la fuente original. El juicio clínico es responsabilidad del profesional sanitario.",
  "disclaimer.safety_title": "Consulta sensible a la seguridad detectada",
  "disclaimer.safety_body":
    "Se ha detectado una consulta sensible a la seguridad. La respuesta se mantendrá educativa y no debe utilizarse como consejo médico urgente.",
  // Feedback buttons
  "feedback.label": "Feedback",
  "feedback.useful": "Útil",
  "feedback.not-useful": "No útil",
  "feedback.incomplete": "Incompleta",
  "feedback.error": "Posible error",
  "feedback.kol": "Solicitar revisión KOL",
  "feedback.toast": "Feedback registrado",
  // PII messages
  "pii.title": "Posibles datos identificables del paciente detectados",
  "pii.body":
    'Anonimiza el caso antes de continuar. El botón "Analizar" permanece desactivado hasta que se eliminen estas coincidencias.',
  "pii.email": "Dirección de email detectada. Elimínala antes de enviar el caso.",
  "pii.phone": "Posible número de teléfono detectado. Elimínalo antes de enviar.",
  "pii.date_of_birth":
    "Se encontró una fecha que podría identificar al paciente. Sustituye las fechas específicas por rango de edad o tiempos relativos.",
  "pii.medical_record":
    "Número de historia clínica detectado. Elimina los identificadores antes de enviar.",
  "pii.id_number":
    "Identificador numérico largo detectado. Asegúrate de que no sea un número de identidad.",
  "pii.patient_name":
    "Posible nombre de paciente detectado. Usa iniciales o edad + sexo en su lugar.",
  "pii.address": "Posible dirección postal detectada. Elimínala antes de enviar.",
  // Toasts
  "toast.settings.provider": "Configuración del proveedor guardada",
  "toast.settings.security": "Configuración de seguridad guardada",
  "toast.settings.limits": "Límites de uso guardados",
  "toast.settings.disclaimer": "Disclaimer actualizado",
  "toast.settings.retention": "Política de retención guardada",
  "toast.kol.saved": "Decisión KOL guardada",
  "toast.editorial.assigned_kol": "Asignado al KOL",
  "toast.editorial.approved": "Aprobado",
  "toast.editorial.changes_requested": "Cambios solicitados",
  "toast.editorial.or_reviewed": "Marcado como Revisado por OR",
  "toast.editorial.editing": "Editando respuesta",
  "toast.editorial.sent_kol": "Enviado al KOL",
  "toast.editorial.unsafe": "Marcado como inseguro",
  "toast.kb.approved": "Aprobado",
  "toast.kb.rejected": "Rechazado",
  "toast.kb.archived": "Archivado",
  "toast.kb.deactivated": "Desactivado",
  "toast.kb.sent_kol": "Enviado a KOL",
  "toast.kb.embeddings": "Embeddings en cola",
  "toast.kb.required": "El título y el autor son obligatorios",
  "toast.kb.sent_editorial": "Fuente enviada a revisión editorial",
  "toast.case.success": "Análisis educativo del caso generado",
  "toast.case.error": "No se pudo generar el análisis. Inténtalo de nuevo.",
};

const EN: Dict = {
  "brand.tagline": "Intelligence Layer",
  "shell.educational_footer.title": "Educational use only.",
  "shell.educational_footer.body":
    "Does not replace clinical judgement, diagnosis or individualised treatment.",
  "topbar.breadcrumb": "Intelligence Layer",
  "topbar.live": "Live data",
  "topbar.demo": "Demo mode",
  "topbar.live_tooltip": "Connected to Supabase",
  "topbar.demo_tooltip": "Demo mode / simulated data",
  "topbar.badge": "Educational use · MVP v0.9",
  "topbar.notifications": "Notifications",
  "topbar.role_menu": "Switch role · demo",
  "topbar.role_active": "Active",
  "topbar.language": "Language",
  "topbar.language_es": "Spanish",
  "topbar.language_en": "English",
  "demo.banner":
    "Demo mode active · Supabase not connected. Data is simulated locally; set the environment variables to switch to live mode.",
  "nav.group.overview": "Overview",
  "nav.group.intelligence": "Intelligence",
  "nav.group.editorial": "Editorial & validation",
  "nav.group.insights": "Insights",
  "nav.dashboard": "Dashboard",
  "nav.clinical_ai": "OR Clinical AI",
  "nav.academy_tutor": "Academy Tutor",
  "nav.case_analysis": "Case analysis",
  "nav.knowledge_base": "Knowledge base",
  "nav.editorial_review": "Editorial review",
  "nav.kol_verification": "KOL verification",
  "nav.analytics": "Analytics",
  "nav.settings": "Settings",
  "nav.implementation": "Implementation checklist",
  "nav.atlas": "Ophthalmology atlas",
  "nav.evidence": "Clinical evidence",
  "role.admin": "Administrator",
  "role.medical_editor": "Medical editor",
  "role.kol": "KOL (key opinion leader)",
  "role.verified_doctor": "Verified ophthalmologist",
  "role.industry_user": "Industry user",
  "status.Draft": "Draft",
  "status.Pending Review": "Pending review",
  "status.Approved": "Approved",
  "status.Rejected": "Rejected",
  "status.Archived": "Archived",
  "validation.AI Generated": "AI generated · Educational",
  "validation.OR Reviewed": "OR reviewed",
  "validation.KOL Verified": "KOL verified",
  "validation.KOL_with_name": "KOL verified",
  "safety.Missing data": "Missing data",
  "safety.Red flag": "Red flag",
  "safety.Needs specialist review": "Needs specialist review",
  "safety.Evidence limited": "Evidence limited",
  "safety.KOL review recommended": "KOL review recommended",
  "safety.Emergency symptom": "Emergency symptom",
  "safety.Patient-identifiable data risk": "Patient-identifiable data risk",
  "disclaimer.educational_title": "Educational and bibliographic use only.",
  "disclaimer.educational_body":
    "This response is for educational and bibliographic purposes only. It does not constitute a medical diagnosis or individualised treatment recommendation. Clinical judgement remains the responsibility of the treating professional.",
  "disclaimer.educational_body_catalog":
    "This content is for educational and bibliographic purposes only. It does not constitute a medical diagnosis or individualised treatment recommendation; always verify against the original source. Clinical judgement remains the responsibility of the treating professional.",
  "disclaimer.safety_title": "Safety-sensitive query detected",
  "disclaimer.safety_body":
    "A safety-sensitive query was detected. The response will remain educational and must not be used as urgent medical advice.",
  "feedback.label": "Feedback",
  "feedback.useful": "Useful",
  "feedback.not-useful": "Not useful",
  "feedback.incomplete": "Incomplete",
  "feedback.error": "Possible error",
  "feedback.kol": "Request KOL review",
  "feedback.toast": "Feedback recorded",
  "pii.title": "Possible patient-identifiable data detected",
  "pii.body":
    'Anonymise the case before continuing. The "Analyse" button stays disabled until these matches are removed.',
  "pii.email": "Email address detected. Remove it before submitting the case.",
  "pii.phone": "Possible phone number detected. Remove it before submitting.",
  "pii.date_of_birth":
    "A date that could identify the patient was found. Replace specific dates with an age range or relative times.",
  "pii.medical_record": "Medical record number detected. Remove identifiers before submitting.",
  "pii.id_number": "Long numeric identifier detected. Make sure it is not an ID number.",
  "pii.patient_name": "Possible patient name detected. Use initials or age + sex instead.",
  "pii.address": "Possible postal address detected. Remove it before submitting.",
  "toast.settings.provider": "Provider configuration saved",
  "toast.settings.security": "Security configuration saved",
  "toast.settings.limits": "Usage limits saved",
  "toast.settings.disclaimer": "Disclaimer updated",
  "toast.settings.retention": "Retention policy saved",
  "toast.kol.saved": "KOL decision saved",
  "toast.editorial.assigned_kol": "Assigned to KOL",
  "toast.editorial.approved": "Approved",
  "toast.editorial.changes_requested": "Changes requested",
  "toast.editorial.or_reviewed": "Marked as OR reviewed",
  "toast.editorial.editing": "Editing response",
  "toast.editorial.sent_kol": "Sent to KOL",
  "toast.editorial.unsafe": "Marked as unsafe",
  "toast.kb.approved": "Approved",
  "toast.kb.rejected": "Rejected",
  "toast.kb.archived": "Archived",
  "toast.kb.deactivated": "Deactivated",
  "toast.kb.sent_kol": "Sent to KOL",
  "toast.kb.embeddings": "Embeddings queued",
  "toast.kb.required": "Title and author are required",
  "toast.kb.sent_editorial": "Source sent to editorial review",
  "toast.case.success": "Educational case analysis generated",
  "toast.case.error": "Could not generate the analysis. Please try again.",
};

const DICTS: Record<UILocale, Dict> = { es: ES, en: EN };

interface I18nCtx {
  locale: UILocale;
  setLocale: (l: UILocale) => void;
  t: (key: string) => string;
  roleLabel: (r: Role) => string;
  statusLabel: (s: ApprovalStatus) => string;
  validationLabel: (v: ValidationLevel) => string;
  safetyLabel: (f: SafetyFlag) => string;
  piiMessage: (m: Pick<PIIMatch, "type">) => string;
}

// Shared singleton so non-React code (toast helpers, services) can resolve
// the active locale without prop-drilling.
let currentLocale: UILocale = "es";
export function getActiveLocale(): UILocale {
  return currentLocale;
}
export function tr(key: string): string {
  return DICTS[currentLocale][key] ?? ES[key] ?? key;
}

const I18nContext = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<UILocale>("es");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "es" || stored === "en") setLocaleState(stored);
  }, []);

  useEffect(() => {
    currentLocale = locale;
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const value = useMemo<I18nCtx>(() => {
    const dict = DICTS[locale];
    const t = (key: string) => dict[key] ?? ES[key] ?? key;
    return {
      locale,
      setLocale: (l) => {
        setLocaleState(l);
        if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, l);
      },
      t,
      roleLabel: (r) => t(`role.${r}`),
      statusLabel: (s) => t(`status.${s}`),
      validationLabel: (v) => t(`validation.${v}`),
      safetyLabel: (f) => t(`safety.${f}`),
      piiMessage: (m) => t(`pii.${m.type}`),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
