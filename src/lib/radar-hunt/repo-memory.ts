// RADAR HUNT — repositorio en memoria (modo demo y tests), con persistencia opcional.
import type { Competency } from "./competency";
import type { GameRepo } from "./game-core";
import type {
  AnswerRecord,
  Attempt,
  BossCase,
  EyeStationProgress,
  Question,
  Round,
  SubspecialtyCode,
} from "./types";

export interface MemoryState {
  attempts: Attempt[];
  deliveries: Record<string, number>;
  competency: Record<string, Competency>;
  names: Record<string, string>;
  extraRounds: Round[];
  /** Eye Universe: `${usuario}|${estación}` → mejor práctica de la estación. */
  eyeProgress: Record<string, EyeStationProgress>;
}

export function emptyMemoryState(): MemoryState {
  return {
    attempts: [],
    deliveries: {},
    competency: {},
    names: {},
    extraRounds: [],
    eyeProgress: {},
  };
}

export interface MemoryRepoInit {
  questions: Question[];
  rounds: Round[];
  bossCases: BossCase[];
  state?: MemoryState;
  clock?: () => number;
  onChange?: (state: MemoryState) => void;
  /** Acceso a rondas de estación de congreso (escaneo del QR). */
  access?: (round: Round, userId: string) => boolean | Promise<boolean>;
}

export function createMemoryRepo(
  init: MemoryRepoInit,
): GameRepo & { state: MemoryState; addRound(r: Round): void } {
  const questions = new Map(init.questions.map((q) => [q.id, q]));
  const rounds = new Map(init.rounds.map((r) => [r.id, r]));
  const bosses = new Map(init.bossCases.map((b) => [b.id, b]));
  const state = init.state ?? emptyMemoryState();
  state.eyeProgress ??= {};
  for (const r of state.extraRounds) rounds.set(r.id, r);
  const clock = init.clock ?? (() => Date.now());
  const changed = () => init.onChange?.(state);
  const key = (a: string, b: string) => `${a}|${b}`;

  return {
    state,
    addRound(r: Round) {
      rounds.set(r.id, r);
      state.extraRounds = [...state.extraRounds.filter((x) => x.id !== r.id), r];
      changed();
    },
    now: clock,
    async getQuestion(id) {
      return questions.get(id);
    },
    async getRound(id) {
      return rounds.get(id);
    },
    async getBossCase(id) {
      return bosses.get(id);
    },
    async getAttempt(roundId, userId) {
      return state.attempts.find((a) => a.roundId === roundId && a.userId === userId);
    },
    async getAttemptById(id) {
      return state.attempts.find((a) => a.id === id);
    },
    async createAttempt(a) {
      state.attempts.push(a);
      changed();
      return a;
    },
    async updateAttempt(a) {
      state.attempts = state.attempts.map((x) => (x.id === a.id ? a : x));
      changed();
    },
    async recordDelivery(attemptId, questionId, at) {
      const k = key(attemptId, questionId);
      if (state.deliveries[k] === undefined) {
        state.deliveries[k] = at;
        changed();
      }
      return state.deliveries[k];
    },
    async getDelivery(attemptId, questionId) {
      return state.deliveries[key(attemptId, questionId)];
    },
    async saveAnswer(_attemptId: string, _rec: AnswerRecord) {
      // Las respuestas viajan dentro del intento (updateAttempt).
    },
    async listLeagueAttempts(leagueId) {
      return state.attempts.filter((a) => rounds.get(a.roundId)?.leagueId === leagueId);
    },
    async displayNames(userIds) {
      return new Map(userIds.map((u) => [u, state.names[u] ?? "Participante"]));
    },
    async getCompetency(userId, sub: SubspecialtyCode) {
      return state.competency[key(userId, sub)];
    },
    async saveCompetency(userId, c) {
      state.competency[key(userId, c.subspecialty)] = c;
      changed();
    },
    async recordEyeStation(userId, station, correct, total) {
      const k = key(userId, station);
      const prev = state.eyeProgress[k];
      state.eyeProgress[k] = {
        station,
        bestCorrect: Math.max(prev?.bestCorrect ?? 0, correct),
        total: prev && prev.bestCorrect > correct ? prev.total : total,
        attempts: (prev?.attempts ?? 0) + 1,
        completedAt: new Date(clock()).toISOString(),
      };
      changed();
    },
    async eyeProgress(userId) {
      return Object.entries(state.eyeProgress)
        .filter(([k]) => k.startsWith(`${userId}|`))
        .map(([, v]) => v);
    },
    async hasRoundAccess(round, userId) {
      return init.access ? await init.access(round, userId) : false;
    },
  };
}
