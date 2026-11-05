/**
 * Role-based capability map for the Ophthalmology Radar Intelligence Layer.
 *
 * Source of truth for what each role can see and do across the platform.
 * Keep this aligned with the role descriptions in /settings → Roles.
 *
 * // TODO: When auth is enabled, derive `role` from `user_roles` table via
 *           a security-definer `has_role(uid, role)` function — never from
 *           the client-side profile.
 */
import type { Role } from "./types";

export type Capability =
  | "use_clinical_ai"
  | "use_academy_tutor"
  | "use_case_analysis"
  | "view_knowledge_base"
  | "manage_knowledge_base"
  | "review_editorial"
  | "assign_kol"
  | "review_kol"
  | "view_analytics"
  | "view_individual_queries"
  | "manage_settings"
  | "view_implementation_checklist";

const MATRIX: Record<Role, Capability[]> = {
  admin: [
    "use_clinical_ai",
    "use_academy_tutor",
    "use_case_analysis",
    "view_knowledge_base",
    "manage_knowledge_base",
    "review_editorial",
    "assign_kol",
    "review_kol",
    "view_analytics",
    "view_individual_queries",
    "manage_settings",
    "view_implementation_checklist",
  ],
  medical_editor: [
    "use_clinical_ai",
    "use_academy_tutor",
    "use_case_analysis",
    "view_knowledge_base",
    "manage_knowledge_base",
    "review_editorial",
    "assign_kol",
    "view_analytics",
    "view_individual_queries",
  ],
  kol: ["review_kol", "use_clinical_ai", "use_academy_tutor"],
  verified_doctor: ["use_clinical_ai", "use_academy_tutor", "use_case_analysis"],
  industry_user: ["view_analytics"],
};

export function can(role: Role, capability: Capability): boolean {
  return MATRIX[role]?.includes(capability) ?? false;
}

export function capabilitiesFor(role: Role): Capability[] {
  return MATRIX[role] ?? [];
}
