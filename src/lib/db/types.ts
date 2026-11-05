/**
 * Database types mirroring the Supabase schema for Ophthalmology Radar.
 *
 * These types are the contract between the frontend service layer and the
 * Supabase project. When the backend is provisioned, regenerate via:
 *   supabase gen types typescript --project-id <id> > db.types.ts
 * and re-export the relevant rows from here.
 */

export type DBLanguage = "es" | "en";

export type DBSourceType =
  | "Course"
  | "Course Module"
  | "Webinar"
  | "Clinical Case"
  | "Paper"
  | "Guideline"
  | "Protocol"
  | "Test Question"
  | "Industry Material"
  | "KOL Commentary";

export type DBApprovalStatus = "Draft" | "Pending Review" | "Approved" | "Rejected" | "Archived";
export type DBValidationLevel = "AI Generated" | "OR Reviewed" | "KOL Verified";

/** public.ai_knowledge_sources */
export interface AIKnowledgeSourceRow {
  id: string;
  title: string;
  description: string | null;
  source_type: DBSourceType;
  subspecialty: string;
  pathology: string | null;
  language: DBLanguage;
  author: string | null;
  external_url: string | null;
  publication_date: string | null;
  evidence_level: string | null;
  approval_status: DBApprovalStatus;
  is_active: boolean;
  last_reviewed_at: string | null;
  kol_validator: string | null;
  validation_level: DBValidationLevel | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/** public.ai_chunks — vector retrieval units (pgvector) */
export interface AIChunkRow {
  id: string;
  source_id: string;
  chunk_index: number;
  content: string;
  // embedding column is server-side (vector); not consumed by the client.
  token_count: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/** public.ai_interactions */
export interface AIInteractionRow {
  id: string;
  user_id: string | null;
  role: string | null;
  mode: string; // 'clinical_ai' | 'academy_tutor' | 'case_analysis'
  subspecialty: string | null;
  language: DBLanguage;
  query: string;
  answer: Record<string, unknown>; // structured AIAnswer JSON
  validation_level: DBValidationLevel;
  safety_flags: string[];
  sources_used: string[];
  latency_ms: number | null;
  created_at: string;
}

/** public.ai_feedback */
export interface AIFeedbackRow {
  id: string;
  interaction_id: string;
  user_id: string | null;
  rating: "useful" | "not_useful" | "needs_kol";
  comment: string | null;
  created_at: string;
}

/** public.ai_safety_events */
export interface AISafetyEventRow {
  id: string;
  interaction_id: string | null;
  user_id: string | null;
  severity: "info" | "warning" | "critical";
  categories: string[];
  matched_terms: string[];
  query_excerpt: string | null;
  action_taken: string | null;
  created_at: string;
}

/** public.ai_validated_answers — KOL-verified canonical answers */
export interface AIValidatedAnswerRow {
  id: string;
  question: string;
  subspecialty: string;
  answer: Record<string, unknown>;
  kol_validator: string;
  kol_user_id: string | null;
  validation_level: DBValidationLevel; // typically 'KOL Verified'
  status:
    | "Awaiting review"
    | "Approved as KOL Verified"
    | "Changes requested"
    | "Rejected"
    | "Needs update";
  valid_from: string;
  valid_until: string | null;
  editor_notes: string | null;
  sources_used: string[];
  created_at: string;
  updated_at: string;
}
