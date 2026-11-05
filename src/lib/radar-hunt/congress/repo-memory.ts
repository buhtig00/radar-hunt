// RADAR HUNT — repositorio del modo congreso en memoria (demo y tests), serializable.
import type { Attempt, Question, Round } from "../types";
import type { CongressRepo } from "./core";
import type {
  CongressEvent,
  Feedback,
  LiveAnswer,
  LiveSession,
  LiveState,
  Participant,
  Station,
  StationToken,
  StationVisit,
} from "./types";

export interface CongressMemoryState {
  events: CongressEvent[];
  stations: Station[];
  tokens: StationToken[];
  participants: Participant[];
  visits: StationVisit[];
  sessions: LiveSession[];
  live: LiveState[];
  liveAnswers: LiveAnswer[];
  feedback: Feedback[];
  audit: { at: string; actor: string; action: string; details: Record<string, unknown> }[];
}

export function emptyCongressState(): CongressMemoryState {
  return {
    events: [],
    stations: [],
    tokens: [],
    participants: [],
    visits: [],
    sessions: [],
    live: [],
    liveAnswers: [],
    feedback: [],
    audit: [],
  };
}

export interface CongressMemoryInit {
  state: CongressMemoryState;
  clock?: () => number;
  onChange?: () => void;
  /** Puente con el repositorio del juego (rondas de estación, intentos, banco). */
  game: {
    addRound(r: Round): void;
    attempts(): Attempt[];
    questions: Question[];
  };
}

export function createCongressMemoryRepo(init: CongressMemoryInit): CongressRepo {
  const st = init.state;
  const changed = () => init.onChange?.();
  const qmap = new Map(init.game.questions.map((q) => [q.id, q]));
  const upsert = <T>(list: T[], item: T, same: (a: T) => boolean): T[] => {
    const i = list.findIndex(same);
    if (i < 0) return [...list, item];
    const out = [...list];
    out[i] = item;
    return out;
  };
  const stationEvent = (stationId: string) => st.stations.find((s) => s.id === stationId)?.eventId;

  return {
    now: init.clock ?? (() => Date.now()),
    async listEvents() {
      return st.events;
    },
    async getEvent(idOrSlug) {
      return st.events.find((e) => e.id === idOrSlug || e.slug === idOrSlug);
    },
    async saveEvent(e) {
      st.events = upsert(st.events, e, (x) => x.id === e.id);
      changed();
    },
    async listStations(eventId) {
      return st.stations.filter((s) => s.eventId === eventId);
    },
    async getStation(id) {
      return st.stations.find((s) => s.id === id);
    },
    async saveStation(s) {
      st.stations = upsert(st.stations, s, (x) => x.id === s.id);
      changed();
    },
    async deleteStation(id) {
      st.stations = st.stations.filter((s) => s.id !== id);
      st.tokens = st.tokens.filter((t) => t.stationId !== id);
      changed();
    },
    async getToken(stationId) {
      return st.tokens.find((t) => t.stationId === stationId);
    },
    async saveToken(t) {
      st.tokens = upsert(st.tokens, t, (x) => x.stationId === t.stationId);
      changed();
    },
    async findStationIdByToken(token) {
      return st.tokens.find((t) => t.token === token)?.stationId;
    },
    async findStationIdByCode(eventId, code) {
      return st.tokens.find(
        (t) => t.token.slice(0, 8) === code && stationEvent(t.stationId) === eventId,
      )?.stationId;
    },
    async getParticipant(eventId, userId) {
      return st.participants.find((p) => p.eventId === eventId && p.userId === userId);
    },
    async listParticipants(eventId) {
      return st.participants.filter((p) => p.eventId === eventId);
    },
    async saveParticipant(p) {
      st.participants = upsert(
        st.participants,
        p,
        (x) => x.eventId === p.eventId && x.userId === p.userId,
      );
      changed();
    },
    async getVisit(stationId, userId) {
      return st.visits.find((v) => v.stationId === stationId && v.userId === userId);
    },
    async listVisits(eventId) {
      return st.visits.filter((v) => v.eventId === eventId);
    },
    async saveVisit(v) {
      st.visits = upsert(st.visits, v, (x) => x.stationId === v.stationId && x.userId === v.userId);
      changed();
    },
    async listSessions(eventId) {
      return st.sessions.filter((s) => s.eventId === eventId);
    },
    async getSession(id) {
      return st.sessions.find((s) => s.id === id);
    },
    async saveSession(s) {
      st.sessions = upsert(st.sessions, s, (x) => x.id === s.id);
      changed();
    },
    async deleteSession(id) {
      st.sessions = st.sessions.filter((s) => s.id !== id);
      st.live = st.live.filter((l) => l.sessionId !== id);
      changed();
    },
    async getLiveState(sessionId) {
      return st.live.find((l) => l.sessionId === sessionId);
    },
    async saveLiveState(s) {
      st.live = upsert(st.live, s, (x) => x.sessionId === s.sessionId);
      changed();
    },
    async listLiveAnswers(sessionId, itemId) {
      return st.liveAnswers.filter(
        (a) => a.sessionId === sessionId && (itemId === undefined || a.itemId === itemId),
      );
    },
    async listEventLiveAnswers(eventId) {
      const ids = new Set(st.sessions.filter((s) => s.eventId === eventId).map((s) => s.id));
      return st.liveAnswers.filter((a) => ids.has(a.sessionId));
    },
    async insertLiveAnswer(a) {
      if (
        st.liveAnswers.some(
          (x) => x.sessionId === a.sessionId && x.itemId === a.itemId && x.userId === a.userId,
        )
      )
        return false;
      st.liveAnswers = [...st.liveAnswers, a];
      changed();
      return true;
    },
    async getFeedback(eventId, userId) {
      return st.feedback.find((f) => f.eventId === eventId && f.userId === userId);
    },
    async listFeedback(eventId) {
      return st.feedback.filter((f) => f.eventId === eventId);
    },
    async insertFeedback(f) {
      if (st.feedback.some((x) => x.eventId === f.eventId && x.userId === f.userId)) return false;
      st.feedback = [...st.feedback, f];
      changed();
      return true;
    },
    async upsertStationRound(r) {
      init.game.addRound(r);
    },
    async listStationAttempts(eventId) {
      const rounds = new Set(
        st.stations.filter((s) => s.eventId === eventId).map((s) => `cs:${s.id}`),
      );
      return init.game.attempts().filter((a) => rounds.has(a.roundId));
    },
    async getQuestion(id) {
      return qmap.get(id);
    },
    async listQuestions({ subspecialty }) {
      return init.game.questions.filter((q) => !subspecialty || q.subspecialty === subspecialty);
    },
    async audit(actor, action, details) {
      st.audit = [
        ...st.audit.slice(-199),
        { at: new Date().toISOString(), actor, action, details },
      ];
      changed();
    },
  };
}

/** Acceso a la ronda de una estación: hay visita (escaneo) registrada. */
export function memoryStationAccess(state: CongressMemoryState) {
  return (round: Round, userId: string) => {
    if (round.kind !== "congress_station") return false;
    const stationId = round.id.replace(/^cs:/, "");
    return state.visits.some((v) => v.stationId === stationId && v.userId === userId);
  };
}
