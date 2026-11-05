// RADAR HUNT — tipos del dominio del juego (independientes de UI y de Supabase).

export type SubspecialtyCode =
  | "retina"
  | "glaucoma"
  | "cornea"
  | "ocular_surface"
  | "cataract"
  | "refractive"
  | "uveitis"
  | "oculoplastics"
  | "neuro_ophthalmology"
  | "pediatric_ophthalmology"
  | "strabismus"
  | "contactology"
  | "low_vision"
  | "ocular_oncology"
  | "ocular_trauma"
  | "emergency_ophthalmology"
  | "general_ophthalmology";

/** Etapa profesional: determina la liga en la que compite cada participante. */
export type CareerStage = "resident" | "attending";
export type CareerLevel = CareerStage | "both";

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";
export type ValidationLevel = "ai_generated" | "or_reviewed" | "kol_verified";
export type ContentStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "needs_update"
  | "rejected"
  | "archived";
export type CognitiveLevel = "recall" | "understanding" | "application" | "analysis";
export type QuestionType = "single_choice" | "multiple_choice";

export interface Reference {
  /** Cita legible: autor/organismo, título, edición/año. */
  citation: string;
  url?: string;
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  type: QuestionType;
  subspecialty: SubspecialtyCode;
  careerLevel: CareerLevel;
  difficulty: 1 | 2 | 3 | 4 | 5;
  cognitiveLevel: CognitiveLevel;
  /** Estructura anatómica (código de `EYE_STRUCTURES`) para enlazar con el ojo 3D. */
  structure?: string;
  stem: string;
  options: QuestionOption[];
  explanation: string;
  references: Reference[];
  status: ContentStatus;
  validationLevel: ValidationLevel;
  aiAssisted: boolean;
}

/** Pregunta tal como la recibe el participante: sin la marca de respuesta correcta. */
export interface PublicQuestion {
  id: string;
  type: QuestionType;
  subspecialty: SubspecialtyCode;
  difficulty: number;
  stem: string;
  options: { id: string; text: string }[];
  timeLimitS: number;
  /** true si el contenido aún no ha pasado la validación KOL (solo modo práctica/demo). */
  unvalidated: boolean;
}

export interface BossStep {
  /** Información nueva que se revela al llegar a este paso (como en la consulta real). */
  reveal: string;
  questionId: string;
}

export interface BossCase {
  id: string;
  title: string;
  subspecialty: SubspecialtyCode;
  careerLevel: CareerLevel;
  intro: string;
  steps: BossStep[];
  status: ContentStatus;
  validationLevel: ValidationLevel;
}

export interface League {
  id: string;
  seasonId: string;
  subspecialty: SubspecialtyCode;
  careerLevel: CareerStage;
  name: string;
  rules: LeagueRules;
}

export interface LeagueRules {
  /** Se suman las mejores N rondas de M. */
  bestN: number;
  totalRounds: number;
  /** Finalistas que pasan a la final. */
  finalistsK: number;
  /** Peso máximo del bonus de velocidad (0,5 = hasta +50 %). */
  speedLambda: number;
  /** Segundos por pregunta. */
  timeLimitS: number;
  /** Preguntas por ronda. */
  questionsPerRound: number;
}

export type RoundKind =
  | "league_round"
  | "boss_challenge"
  | "practice"
  | "final"
  /** Reto de una estación de congreso: se desbloquea escaneando su QR. */
  | "congress_station";

export interface Round {
  id: string;
  kind: RoundKind;
  leagueId?: string;
  bossCaseId?: string;
  /** Congreso al que pertenece (rondas de estación). */
  eventId?: string;
  number?: number;
  title: string;
  opensAt: string;
  closesAt: string;
  questionIds: string[];
}

/** Progreso del Eye Universe: mejor resultado de la práctica de cada estación de los Hunts. */
export interface EyeStationProgress {
  station: string;
  bestCorrect: number;
  total: number;
  attempts: number;
  completedAt: string;
}

export interface AnswerRecord {
  questionId: string;
  selected: string[];
  isCorrect: boolean;
  partialCredit: number;
  responseMs: number;
  points: number;
}

export interface Attempt {
  id: string;
  roundId: string;
  userId: string;
  startedAt: string;
  submittedAt?: string;
  answers: AnswerRecord[];
  totalScore: number;
  correctCount: number;
  totalMs: number;
}

export interface LeaderboardRow {
  userId: string;
  displayName: string;
  score: number;
  correct: number;
  totalMs: number;
  roundsPlayed: number;
  rank: number;
  isFinalist: boolean;
}

export interface VerificationRequest {
  firstName: string;
  lastName: string;
  licenseNumber: string;
  /** Colegio de Médicos (provincia) que emite el número; recomendado para comprobarlo. */
  licenseCollege?: string;
  email: string;
  specialty: string;
  hospital: string;
  careerStage: CareerStage;
  residencyYear?: number;
  primarySubspecialty?: SubspecialtyCode;
}

export interface VerificationRecord extends VerificationRequest {
  userId: string;
  status: VerificationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewerNote?: string;
  /** Señales automáticas para el revisor (no deciden por sí solas). */
  signals: VerificationSignals;
}

export interface VerificationSignals {
  institutionalEmail: boolean;
  emailMatchesAccount: boolean;
  licenseFormatOk: boolean;
  specialtyIsOphthalmology: boolean;
}
