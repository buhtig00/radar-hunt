// RADAR HUNT — fachada única para la interfaz. Modo "demo" (navegador, sin backend)
// si RH_FORCE_DEMO (deploy.ts), si Supabase no está configurado o si VITE_RH_DEMO=true;
// si no, modo "live" con las funciones de servidor (autoritativas).
import { demoService } from "./demo-service";
import { RH_FORCE_DEMO } from "./deploy";
import {
  rhAnswer,
  rhEyeProgress,
  rhFlagQuestion,
  rhGetLeagueView,
  rhGetMyProfile,
  rhListBoss,
  rhListVerifications,
  rhMyCompetency,
  rhNextQuestion,
  rhPublishLeagueRounds,
  rhReviewVerification,
  rhStartPractice,
  rhStartRound,
  rhStartStationPractice,
  rhSubmitVerification,
  rhSummary,
} from "./game.functions";
import type { AnswerFeedback, AttemptSummary, QuestionPayload } from "./game-core";
import type { EyeStationProgress, SubspecialtyCode } from "./types";
import type {
  BossView,
  CompetencyView,
  LeagueView,
  ProfileView,
  VerificationQueueItem,
} from "./views";

const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
export const RH_MODE: "demo" | "live" =
  !RH_FORCE_DEMO &&
  env.VITE_SUPABASE_URL &&
  env.VITE_SUPABASE_PUBLISHABLE_KEY &&
  env.VITE_RH_DEMO !== "true"
    ? "live"
    : "demo";

export interface RadarHuntService {
  mode: "demo" | "live";
  getMyProfile(): Promise<ProfileView | null>;
  submitVerification(input: unknown): Promise<ProfileView>;
  listVerifications(
    status?: "pending" | "verified" | "rejected" | "all",
  ): Promise<VerificationQueueItem[]>;
  reviewVerification(
    userId: string,
    decision: "approve" | "reject",
    note?: string,
  ): Promise<ProfileView>;
  getLeagueView(leagueId: string): Promise<LeagueView>;
  startRound(roundId: string): Promise<string>;
  nextQuestion(attemptId: string): Promise<QuestionPayload | null>;
  answer(attemptId: string, questionId: string, selected: string[]): Promise<AnswerFeedback>;
  summary(attemptId: string): Promise<AttemptSummary>;
  listBoss(): Promise<BossView[]>;
  startPractice(subspecialty: SubspecialtyCode): Promise<string>;
  /** Eye Universe: práctica de una estación de los Hunts (Science XP, sin las RADARS). */
  startStationPractice(stationCode: string): Promise<string>;
  eyeProgress(): Promise<EyeStationProgress[]>;
  myCompetency(): Promise<CompetencyView[]>;
  flagQuestion(questionId: string, reason: string): Promise<boolean>;
  publishLeagueRounds(leagueId?: string): Promise<{ published: number }>;
}

const liveService: RadarHuntService = {
  mode: "live",
  getMyProfile: () => rhGetMyProfile(),
  submitVerification: (input) => rhSubmitVerification({ data: input as never }),
  listVerifications: (status = "pending") => rhListVerifications({ data: { status } }),
  reviewVerification: (userId, decision, note) =>
    rhReviewVerification({ data: { userId, decision, note } }),
  getLeagueView: (leagueId) => rhGetLeagueView({ data: { leagueId } }),
  startRound: (roundId) => rhStartRound({ data: { roundId } }),
  nextQuestion: (attemptId) => rhNextQuestion({ data: { attemptId } }),
  answer: (attemptId, questionId, selected) =>
    rhAnswer({ data: { attemptId, questionId, selected } }),
  summary: (attemptId) => rhSummary({ data: { attemptId } }),
  listBoss: () => rhListBoss(),
  startPractice: (subspecialty) => rhStartPractice({ data: { subspecialty } }),
  startStationPractice: (station) => rhStartStationPractice({ data: { station } }),
  eyeProgress: () => rhEyeProgress(),
  myCompetency: () => rhMyCompetency(),
  flagQuestion: (questionId, reason) => rhFlagQuestion({ data: { questionId, reason } }),
  publishLeagueRounds: (leagueId) => rhPublishLeagueRounds({ data: { leagueId } }),
};

export const rh: RadarHuntService = RH_MODE === "live" ? liveService : demoService;
