// RADAR HUNT — contrato del servicio del modo congreso (idéntico en demo y producción).
import type { CareerStage } from "../types";
import type {
  JoinInput,
  LiveAnswerFeedback,
  ModeratorAction,
  ScanResult,
  SeasonView,
} from "./core";
import type { ProgressSummary } from "../season";
import type {
  AdminOverview,
  CongressEvent,
  EventRanking,
  EventSummary,
  EventView,
  FeedbackInput,
  LiveSession,
  LiveState,
  LiveView,
  Participant,
  QuestionPick,
  SalaView,
  Station,
  StationToken,
} from "./types";

export type ExportKind = "participants" | "ranking" | "stations" | "live" | "feedback";

export interface StationTokensView {
  event: CongressEvent;
  stations: { id: string; label: string; title: string; token: string; manualCode: string }[];
}

export interface CongressService {
  mode: "demo" | "live";
  listEvents(): Promise<EventSummary[]>;
  eventView(slug: string): Promise<EventView>;
  myDefaults(): Promise<{ displayName?: string; hospital?: string; careerStage?: CareerStage }>;
  join(slug: string, input: JoinInput): Promise<Participant>;
  scan(input: { token?: string; code?: string; slug?: string }): Promise<ScanResult>;
  ranking(slug: string): Promise<EventRanking>;
  season(): Promise<SeasonView>;
  /** Progreso del usuario para las insignias (ligas, BOSS, estaciones, directo). */
  myProgress(): Promise<ProgressSummary>;
  /** Solicitud de propuesta para industria, congresos y sociedades. */
  requestProposal(input: ProposalInput): Promise<boolean>;
  liveView(slug: string, sessionId?: string): Promise<LiveView | null>;
  answerLive(
    slug: string,
    sessionId: string,
    itemId: string,
    selected: string[],
  ): Promise<LiveAnswerFeedback>;
  submitFeedback(slug: string, input: FeedbackInput): Promise<boolean>;
  sala(slug: string): Promise<SalaView>;
  // Organización (admin, editor médico o moderador del evento)
  adminOverview(slug: string): Promise<AdminOverview>;
  saveEvent(e: CongressEvent): Promise<CongressEvent>;
  saveStation(s: Station): Promise<Station>;
  deleteStation(id: string): Promise<void>;
  rotateToken(stationId: string): Promise<StationToken>;
  suggestQuestions(subspecialty: string, seed: string): Promise<string[]>;
  questionBank(subspecialty?: string): Promise<QuestionPick[]>;
  saveSession(s: LiveSession): Promise<LiveSession>;
  deleteSession(id: string): Promise<void>;
  moderate(sessionId: string, action: ModeratorAction, itemIndex?: number): Promise<LiveState>;
  stationTokens(slug: string): Promise<StationTokensView>;
  exportCsv(slug: string, kind: ExportKind): Promise<{ filename: string; csv: string }>;
  reset?(): void;
}

export interface ProposalInput {
  name: string;
  organization: string;
  role: string;
  kind: "sociedad" | "congreso" | "industria" | "otro";
  email: string;
  message: string;
  consent: boolean;
  /** Trampa para bots: debe llegar vacío. */
  website?: string;
}
