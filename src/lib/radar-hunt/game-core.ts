// RADAR HUNT — núcleo del juego. Una sola lógica para el modo demo (navegador) y
// producción (funciones de servidor con Supabase): solo cambia el repositorio.
// El tiempo de respuesta se mide SIEMPRE con el reloj del repositorio (servidor en
// producción), desde la entrega de la pregunta hasta la recepción de la respuesta.
import { getLeague } from "./catalog";
import { emptyCompetency, updateCompetency, type Competency } from "./competency";
import { rankLeague } from "./ranking";
import { isPlayableInCompetition, roundState, toPublicQuestion } from "./rounds";
import { bossTotal, scoreAnswer, summarize } from "./scoring";
import type {
  AnswerRecord,
  Attempt,
  BossCase,
  CareerStage,
  EyeStationProgress,
  LeaderboardRow,
  PublicQuestion,
  Question,
  Reference,
  Round,
  SubspecialtyCode,
  VerificationStatus,
} from "./types";

export interface PlayerContext {
  userId: string;
  careerStage?: CareerStage;
  verification: VerificationStatus;
}

export interface GameRepo {
  now(): number;
  getQuestion(id: string): Promise<Question | undefined>;
  getRound(id: string): Promise<Round | undefined>;
  getBossCase(id: string): Promise<BossCase | undefined>;
  getAttempt(roundId: string, userId: string): Promise<Attempt | undefined>;
  getAttemptById(id: string): Promise<Attempt | undefined>;
  createAttempt(a: Attempt): Promise<Attempt>;
  updateAttempt(a: Attempt): Promise<void>;
  /** Registra la entrega si no existía y devuelve la marca de tiempo (ms) original. */
  recordDelivery(attemptId: string, questionId: string, at: number): Promise<number>;
  getDelivery(attemptId: string, questionId: string): Promise<number | undefined>;
  saveAnswer(attemptId: string, rec: AnswerRecord): Promise<void>;
  listLeagueAttempts(leagueId: string): Promise<Attempt[]>;
  displayNames(userIds: string[]): Promise<Map<string, string>>;
  getCompetency(userId: string, sub: SubspecialtyCode): Promise<Competency | undefined>;
  saveCompetency(userId: string, c: Competency): Promise<void>;
  /** Rondas de estación de congreso: el jugador ha escaneado el QR de la estación. */
  hasRoundAccess?(round: Round, userId: string): Promise<boolean>;
  /** Eye Universe: guarda el resultado de la práctica de una estación (se conserva el mejor). */
  recordEyeStation?(userId: string, station: string, correct: number, total: number): Promise<void>;
  eyeProgress?(userId: string): Promise<EyeStationProgress[]>;
}

/** Id de las prácticas lanzadas desde una estación del Eye Universe. */
export function eyeStationPracticeId(station: string, suffix: string): string {
  return `practice:station:${station}:${suffix}`;
}

/** Estación del Eye Universe de una ronda de práctica (o undefined si no lo es). */
export function eyeStationOfRound(roundId: string): string | undefined {
  return /^practice:station:([A-Z]{3}-\d{2}):/.exec(roundId)?.[1];
}

export interface CoreOptions {
  /** En producción, las rondas de liga exigen perfil verificado. */
  requireVerifiedForLeagues: boolean;
  /** En producción, solo preguntas aprobadas + validadas + con referencia. */
  competitionOnlyPlayable: boolean;
}

export class GameError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface QuestionPayload {
  attemptId: string;
  index: number;
  total: number;
  question: PublicQuestion;
  /** Paso de un caso BOSS: información nueva revelada. */
  reveal?: string;
}

export interface AnswerFeedback {
  record: AnswerRecord;
  correctOptionIds: string[];
  explanation: string;
  references: Reference[];
  isLast: boolean;
}

export interface AttemptSummary {
  attempt: Attempt;
  bossPerfect?: boolean;
}

function timeLimitFor(round: Round): { timeLimitS: number; lambda: number } {
  const league = round.leagueId ? getLeague(round.leagueId) : undefined;
  if (league) return { timeLimitS: league.rules.timeLimitS, lambda: league.rules.speedLambda };
  // Estaciones, BOSS y práctica: cuenta el acierto, no la rapidez (solo el directo en sala la premia).
  return { timeLimitS: round.kind === "boss_challenge" ? 60 : 30, lambda: 0 };
}

export function createGameCore(repo: GameRepo, opts: CoreOptions) {
  async function loadRound(roundId: string): Promise<Round> {
    const round = await repo.getRound(roundId);
    if (!round) throw new GameError("round_not_found", "Ronda no encontrada");
    return round;
  }

  async function assertEligible(round: Round, player: PlayerContext) {
    if (round.kind === "congress_station") {
      const ok = (await repo.hasRoundAccess?.(round, player.userId)) ?? false;
      if (!ok)
        throw new GameError(
          "station_locked",
          "Escanea el código QR de la estación para desbloquear su reto.",
        );
      const state = roundState(round, repo.now());
      if (state !== "open")
        throw new GameError(
          "round_closed",
          state === "upcoming"
            ? "El juego del congreso aún no ha empezado."
            : "El juego del congreso ha terminado.",
        );
    }
    if (round.kind === "league_round" || round.kind === "final") {
      const league = round.leagueId ? getLeague(round.leagueId) : undefined;
      if (!league) throw new GameError("league_not_found", "Liga no encontrada");
      if (opts.requireVerifiedForLeagues && player.verification !== "verified") {
        throw new GameError(
          "not_verified",
          "Las ligas oficiales requieren un perfil profesional verificado.",
        );
      }
      if (player.careerStage && player.careerStage !== league.careerLevel) {
        throw new GameError(
          "wrong_league",
          league.careerLevel === "resident"
            ? "Esta liga es para residentes."
            : "Esta liga es para adjuntos.",
        );
      }
      const state = roundState(round, repo.now());
      if (state !== "open") {
        throw new GameError(
          "round_closed",
          state === "upcoming" ? "La ronda aún no está abierta." : "La ronda ya ha cerrado.",
        );
      }
    }
    if (round.questionIds.length === 0) {
      throw new GameError("round_empty", "Ronda pendiente de publicación por el comité editorial.");
    }
  }

  async function start(player: PlayerContext, roundId: string): Promise<Attempt> {
    const round = await loadRound(roundId);
    await assertEligible(round, player);
    const existing = await repo.getAttempt(roundId, player.userId);
    if (existing) return existing;
    return repo.createAttempt({
      id: `att-${roundId}-${player.userId}-${repo.now()}`,
      roundId,
      userId: player.userId,
      startedAt: new Date(repo.now()).toISOString(),
      answers: [],
      totalScore: 0,
      correctCount: 0,
      totalMs: 0,
    });
  }

  async function loadOwnAttempt(player: PlayerContext, attemptId: string): Promise<Attempt> {
    const a = await repo.getAttemptById(attemptId);
    if (!a || a.userId !== player.userId)
      throw new GameError("attempt_not_found", "Intento no encontrado");
    return a;
  }

  /** Entrega la siguiente pregunta no respondida (orden fijo, sin saltos ni repeticiones). */
  async function nextQuestion(
    player: PlayerContext,
    attemptId: string,
  ): Promise<QuestionPayload | null> {
    const attempt = await loadOwnAttempt(player, attemptId);
    if (attempt.submittedAt) return null;
    const round = await loadRound(attempt.roundId);
    const index = attempt.answers.length;
    if (index >= round.questionIds.length) return null;
    const qid = round.questionIds[index];
    const q = await repo.getQuestion(qid);
    if (!q) throw new GameError("question_not_found", "Pregunta no encontrada");
    if (opts.competitionOnlyPlayable && round.kind !== "practice" && !isPlayableInCompetition(q)) {
      throw new GameError("question_not_playable", "Pregunta no validada para competición.");
    }
    await repo.recordDelivery(attempt.id, qid, repo.now());
    const { timeLimitS } = timeLimitFor(round);
    let reveal: string | undefined;
    if (round.kind === "boss_challenge" && round.bossCaseId) {
      const c = await repo.getBossCase(round.bossCaseId);
      reveal = c?.steps[index]?.reveal;
    }
    return {
      attemptId,
      index,
      total: round.questionIds.length,
      question: toPublicQuestion(q, player.userId, timeLimitS),
      reveal,
    };
  }

  async function answer(
    player: PlayerContext,
    attemptId: string,
    questionId: string,
    selected: string[],
  ): Promise<AnswerFeedback> {
    const attempt = await loadOwnAttempt(player, attemptId);
    if (attempt.submittedAt) throw new GameError("attempt_closed", "Este intento ya está cerrado.");
    const round = await loadRound(attempt.roundId);
    const expected = round.questionIds[attempt.answers.length];
    if (questionId !== expected) throw new GameError("out_of_order", "Respuesta fuera de orden.");
    const deliveredAt = await repo.getDelivery(attempt.id, questionId);
    if (deliveredAt === undefined)
      throw new GameError("not_delivered", "La pregunta no se ha entregado.");
    const q = await repo.getQuestion(questionId);
    if (!q) throw new GameError("question_not_found", "Pregunta no encontrada");

    const { timeLimitS, lambda } = timeLimitFor(round);
    const record = scoreAnswer({
      question: q,
      selected,
      responseMs: repo.now() - deliveredAt,
      timeLimitS,
      lambda,
    });
    await repo.saveAnswer(attempt.id, record);

    const answers = [...attempt.answers, record];
    const isLast = answers.length >= round.questionIds.length;
    const s = summarize(answers);
    const updated: Attempt = { ...attempt, answers, ...s };
    if (isLast) {
      updated.submittedAt = new Date(repo.now()).toISOString();
      if (round.kind === "boss_challenge") updated.totalScore = bossTotal(answers).total;
    }
    await repo.updateAttempt(updated);
    if (isLast && round.kind === "practice") {
      const station = eyeStationOfRound(round.id);
      if (station && repo.recordEyeStation)
        await repo.recordEyeStation(player.userId, station, updated.correctCount, answers.length);
    }

    const comp =
      (await repo.getCompetency(player.userId, q.subspecialty)) ?? emptyCompetency(q.subspecialty);
    await repo.saveCompetency(
      player.userId,
      updateCompetency(comp, q.difficulty, record.partialCredit),
    );

    return {
      record,
      correctOptionIds: q.options.filter((o) => o.isCorrect).map((o) => o.id),
      explanation: q.explanation,
      references: q.references,
      isLast,
    };
  }

  async function summary(player: PlayerContext, attemptId: string): Promise<AttemptSummary> {
    const attempt = await loadOwnAttempt(player, attemptId);
    const round = await loadRound(attempt.roundId);
    return {
      attempt,
      bossPerfect: round.kind === "boss_challenge" ? bossTotal(attempt.answers).perfect : undefined,
    };
  }

  async function leaderboard(leagueId: string): Promise<LeaderboardRow[]> {
    const league = getLeague(leagueId);
    if (!league) throw new GameError("league_not_found", "Liga no encontrada");
    const attempts = await repo.listLeagueAttempts(leagueId);
    const names = await repo.displayNames([...new Set(attempts.map((a) => a.userId))]);
    return rankLeague({
      attempts,
      rules: league.rules,
      displayName: (u) => names.get(u) ?? "Participante",
    });
  }

  return { start, nextQuestion, answer, summary, leaderboard };
}

export type GameCore = ReturnType<typeof createGameCore>;
