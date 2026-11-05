// RADAR HUNT — fachada del modo congreso para la interfaz: demo (navegador) o
// producción (funciones de servidor), con la misma decisión que el juego (RH_MODE).
import { RH_MODE } from "../service";
import {
  rhcAdminOverview,
  rhcAnswerLive,
  rhcDeleteSession,
  rhcDeleteStation,
  rhcEventView,
  rhcExportCsv,
  rhcJoin,
  rhcListEvents,
  rhcLiveView,
  rhcModerate,
  rhcMyDefaults,
  rhcQuestionBank,
  rhcMyProgress,
  rhcRanking,
  rhcRequestProposal,
  rhcSeason,
  rhcRotateToken,
  rhcSala,
  rhcSaveEvent,
  rhcSaveSession,
  rhcSaveStation,
  rhcScan,
  rhcStationTokens,
  rhcSubmitFeedback,
  rhcSuggestQuestions,
} from "./congress.functions";
import { congressDemoService } from "./demo";
import type { CongressService } from "./service-types";
import type { SubspecialtyCode } from "../types";

const liveService: CongressService = {
  mode: "live",
  listEvents: () => rhcListEvents(),
  eventView: (slug) => rhcEventView({ data: { slug } }),
  myDefaults: () => rhcMyDefaults(),
  join: (slug, input) => rhcJoin({ data: { slug, input } }),
  scan: (input) => rhcScan({ data: input }),
  ranking: (slug) => rhcRanking({ data: { slug } }),
  season: () => rhcSeason(),
  myProgress: () => rhcMyProgress(),
  requestProposal: (input) => rhcRequestProposal({ data: input as never }),
  liveView: (slug, sessionId) => rhcLiveView({ data: { slug, sessionId } }),
  answerLive: (slug, sessionId, itemId, selected) =>
    rhcAnswerLive({ data: { slug, sessionId, itemId, selected } }),
  submitFeedback: (slug, input) => rhcSubmitFeedback({ data: { slug, input } }),
  sala: (slug) => rhcSala({ data: { slug } }),
  adminOverview: (slug) => rhcAdminOverview({ data: { slug } }),
  saveEvent: (e) => rhcSaveEvent({ data: e }),
  saveStation: (s) => rhcSaveStation({ data: s }),
  deleteStation: (id) => rhcDeleteStation({ data: { id } }),
  rotateToken: (id) => rhcRotateToken({ data: { id } }),
  suggestQuestions: (subspecialty, seed) =>
    rhcSuggestQuestions({ data: { subspecialty: subspecialty as SubspecialtyCode, seed } }),
  questionBank: (subspecialty) =>
    rhcQuestionBank({ data: { subspecialty: subspecialty as SubspecialtyCode | undefined } }),
  saveSession: (s) => rhcSaveSession({ data: s }),
  deleteSession: (id) => rhcDeleteSession({ data: { id } }),
  moderate: (sessionId, action, itemIndex) =>
    rhcModerate({ data: { sessionId, action, itemIndex } }),
  stationTokens: (slug) => rhcStationTokens({ data: { slug } }),
  exportCsv: (slug, kind) => rhcExportCsv({ data: { slug, kind } }),
};

export const rhc: CongressService = RH_MODE === "live" ? liveService : congressDemoService;
