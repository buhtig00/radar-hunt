// RADAR HUNT — vistas que la interfaz consume (idénticas en modo demo y producción).
import type { Competency } from "./competency";
import type {
  BossCase,
  CareerStage,
  LeaderboardRow,
  League,
  SubspecialtyCode,
  VerificationSignals,
  VerificationStatus,
} from "./types";

export interface ProfileView {
  userId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  licenseNumber: string;
  licenseCollege?: string;
  email: string;
  specialty: string;
  hospital: string;
  careerStage: CareerStage;
  residencyYear?: number;
  primarySubspecialty?: SubspecialtyCode;
  status: VerificationStatus;
  signals: VerificationSignals;
  submittedAt: string;
  reviewedAt?: string;
  reviewerNote?: string;
}

export interface RoundView {
  id: string;
  number: number;
  title: string;
  opensAt: string;
  closesAt: string;
  state: "upcoming" | "open" | "closed";
  questionCount: number;
  myAttempt?: { id: string; submitted: boolean; score: number; correct: number; answered: number };
}

export interface LeagueView {
  league: League;
  rounds: RoundView[];
  leaderboard: LeaderboardRow[];
  /** El usuario actual puede competir en esta liga (etapa profesional coincidente). */
  isMyLeague: boolean;
}

export interface BossView {
  bossCase: Pick<BossCase, "id" | "title" | "subspecialty" | "careerLevel" | "intro"> & {
    steps: number;
  };
  roundId: string;
  myAttempt?: { id: string; submitted: boolean; score: number; correct: number };
}

export type CompetencyView = Competency;

export interface VerificationQueueItem extends ProfileView {
  /** Coincidencias de número de colegiado en otras cuentas (para detectar duplicados). */
  duplicateLicense: boolean;
}
