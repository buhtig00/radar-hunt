export type Role = "admin" | "medical_editor" | "kol" | "verified_doctor" | "industry_user";

export type Language = "es" | "en";

export type Subspecialty =
  | "Retina"
  | "Glaucoma"
  | "Cornea"
  | "Ocular Surface"
  | "Cataract"
  | "Refractive Surgery"
  | "Uveitis"
  | "Oculoplastics"
  | "Neuro-Ophthalmology"
  | "Pediatric Ophthalmology"
  | "Contactology"
  | "General";

export const SUBSPECIALTIES: Subspecialty[] = [
  "Retina",
  "Glaucoma",
  "Cornea",
  "Ocular Surface",
  "Cataract",
  "Refractive Surgery",
  "Uveitis",
  "Oculoplastics",
  "Neuro-Ophthalmology",
  "Pediatric Ophthalmology",
  "Contactology",
  "General",
];

export type SourceType =
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

export type ApprovalStatus = "Draft" | "Pending Review" | "Approved" | "Rejected" | "Archived";

export type ValidationLevel = "AI Generated" | "OR Reviewed" | "KOL Verified";

export type SafetyFlag =
  | "Missing data"
  | "Red flag"
  | "Needs specialist review"
  | "Evidence limited"
  | "KOL review recommended"
  | "Emergency symptom"
  | "Patient-identifiable data risk";

export type ClinicalAIMode = "Clinical AI Assistant" | "Evidence Search" | "Protocol Support";

export type TutorMode =
  | "Ask about this module"
  | "Summarise module"
  | "Generate MCQs"
  | "Create flashcards"
  | "Prepare mock exam"
  | "Explain key concepts";

export interface KnowledgeSource {
  id: string;
  title: string;
  description?: string;
  source_type: SourceType;
  subspecialty: Subspecialty;
  pathology?: string;
  language: Language;
  author: string;
  external_url?: string;
  publication_date?: string;
  evidence_level?: string;
  approval_status: ApprovalStatus;
  is_active: boolean;
  last_reviewed_at?: string;
  kol_validator?: string;
  validation_level?: ValidationLevel;
}

export interface AISource {
  id: string;
  title: string;
  author?: string;
  type: SourceType;
  year?: number;
}

export interface AIAnswer {
  summary: string;
  considerations: string[];
  missing_information?: string[];
  differential?: string[];
  evidence_overview: string;
  red_flags?: string[];
  sources_used: AISource[];
  related_or_content: { id: string; title: string; type: SourceType }[];
  validation_level: ValidationLevel;
  safety_flags: SafetyFlag[];
}

export interface ClinicalCaseInput {
  title: string;
  subspecialty: Subspecialty;
  age_range: string;
  complaint: string;
  history: string;
  examination: string;
  imaging: string;
  previous_treatments: string;
  question: string;
}

export interface CaseAIAnalysis {
  case_summary: string;
  relevant_data: string[];
  missing_information: string[];
  diagnostic_hypotheses: { name: string; rationale: string }[];
  complementary_tests: string[];
  red_flags: string[];
  discussion_questions: string[];
  bibliography: AISource[];
  related_or_content: { id: string; title: string; type: SourceType }[];
  safety_flags: SafetyFlag[];
}

export interface AcademyCourse {
  id: string;
  title: string;
  modules: { id: string; title: string }[];
}

export interface MCQ {
  question: string;
  options: { label: "A" | "B" | "C" | "D"; text: string }[];
  correct: "A" | "B" | "C" | "D";
  explanation: string;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface TutorAnswer {
  short_answer: string;
  expanded_explanation: string;
  clinical_pearl: string;
  self_assessment: MCQ;
  recommended_content: { id: string; title: string }[];
  key_concepts: string[];
  flashcards: Flashcard[];
  mcqs: MCQ[];
  exam_readiness: number; // 0-100
}

export interface ReviewQueueItem {
  id: string;
  kind: "source" | "answer";
  title: string;
  subspecialty: Subspecialty;
  author?: string;
  uploaded_at: string;
  summary: string;
  risk_notes?: string[];
  query?: string;
  answer?: string;
  safety_flags?: SafetyFlag[];
}

export interface KOLQueueItem {
  id: string;
  question: string;
  subspecialty: Subspecialty;
  status:
    | "Awaiting review"
    | "Approved as KOL Verified"
    | "Changes requested"
    | "Rejected"
    | "Needs update";
  assigned_kol: string;
  date_assigned: string;
  next_review_date: string;
  ai_answer: string;
  editor_notes?: string;
  sources_used: AISource[];
}
