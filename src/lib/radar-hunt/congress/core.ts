// RADAR HUNT — núcleo del modo congreso. Una sola lógica para la demo (navegador) y
// producción (funciones de servidor): solo cambia el repositorio. El reloj es siempre
// el del repositorio (servidor en producción): fases, ventanas y tiempos de respuesta.
import { isPlayableInCompetition, roundState, shuffle } from "../rounds";
import { scoreAnswer } from "../scoring";
import type { Attempt, CareerStage, Question, Round } from "../types";
import { toCsv } from "./csv";
import { HOSPITAL_MIN_PARTICIPANTS, rankEvent, rankHospitals, tally } from "./ranking";
import { generateToken, manualCode, normalizeCode } from "./tokens";
import { rankSeason, SEASON_PLAN, type SeasonRow } from "../season";
import type {
  AdminOverview,
  AdminStation,
  CongressEvent,
  EventRanking,
  EventSummary,
  EventView,
  Feedback,
  FeedbackInput,
  LiveAnswer,
  LiveItem,
  LivePhase,
  LiveSession,
  LiveState,
  LiveView,
  Participant,
  ParticipantConsents,
  QuestionPick,
  SalaView,
  Station,
  StationToken,
  StationView,
  StationVisit,
} from "./types";

/** Ronda de juego de una estación (compartida por todos; opciones en orden propio). */
export const stationRoundId = (stationId: string) => `cs:${stationId}`;
/** Límite de preguntas por estación. */
export const STATION_MAX_QUESTIONS = 5;
/** Margen de red para respuestas en sala (igual que en las rondas). */
export const LIVE_LATENCY_MS = 300;
const LIVE_LAMBDA = 0.5;

export interface CongressRepo {
  now(): number;
  listEvents(): Promise<CongressEvent[]>;
  getEvent(idOrSlug: string): Promise<CongressEvent | undefined>;
  saveEvent(e: CongressEvent): Promise<void>;

  listStations(eventId: string): Promise<Station[]>;
  getStation(id: string): Promise<Station | undefined>;
  saveStation(s: Station): Promise<void>;
  deleteStation(id: string): Promise<void>;
  getToken(stationId: string): Promise<StationToken | undefined>;
  saveToken(t: StationToken): Promise<void>;
  findStationIdByToken(token: string): Promise<string | undefined>;
  findStationIdByCode(eventId: string, code: string): Promise<string | undefined>;

  getParticipant(eventId: string, userId: string): Promise<Participant | undefined>;
  listParticipants(eventId: string): Promise<Participant[]>;
  saveParticipant(p: Participant): Promise<void>;

  getVisit(stationId: string, userId: string): Promise<StationVisit | undefined>;
  listVisits(eventId: string): Promise<StationVisit[]>;
  saveVisit(v: StationVisit): Promise<void>;

  listSessions(eventId: string): Promise<LiveSession[]>;
  getSession(id: string): Promise<LiveSession | undefined>;
  saveSession(s: LiveSession): Promise<void>;
  deleteSession(id: string): Promise<void>;
  getLiveState(sessionId: string): Promise<LiveState | undefined>;
  saveLiveState(s: LiveState): Promise<void>;
  listLiveAnswers(sessionId: string, itemId?: string): Promise<LiveAnswer[]>;
  listEventLiveAnswers(eventId: string): Promise<LiveAnswer[]>;
  /** Guarda la respuesta si no existía; devuelve false si ya había una (una por persona). */
  insertLiveAnswer(a: LiveAnswer): Promise<boolean>;

  getFeedback(eventId: string, userId: string): Promise<Feedback | undefined>;
  listFeedback(eventId: string): Promise<Feedback[]>;
  insertFeedback(f: Feedback): Promise<boolean>;

  /** Crea o actualiza la ronda de juego de la estación (reutiliza el núcleo del juego). */
  upsertStationRound(r: Round): Promise<void>;
  listStationAttempts(eventId: string): Promise<Attempt[]>;
  getQuestion(id: string): Promise<Question | undefined>;
  listQuestions(filter: { subspecialty?: string }): Promise<Question[]>;

  audit(actorId: string, action: string, details: Record<string, unknown>): Promise<void>;
}

export interface CongressPlayer {
  userId: string;
  /** Datos del perfil profesional, si existe (para precargar la inscripción). */
  profileName?: string;
  hospital?: string;
  careerStage?: CareerStage;
}

export interface CongressActor {
  userId: string;
  isStaff: boolean;
}

export interface CongressOptions {
  /** Producción: solo preguntas aprobadas, validadas y con referencia. */
  onlyPlayable: boolean;
  /** Hook de la demo: simula a los participantes ficticios (no se usa en producción). */
  beforeRead?: (eventId: string) => Promise<void>;
}

export class CongressError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface JoinInput {
  consents: ParticipantConsents;
  alias?: string;
  hospital?: string;
  displayName?: string;
  careerStage?: CareerStage;
}

export interface ScanResult {
  stationId: string;
  roundId: string;
  eventSlug: string;
  stationTitle: string;
  firstVisit: boolean;
}

export interface LiveAnswerFeedback {
  accepted: boolean;
  points: number;
  isCorrect: boolean;
  responseMs: number;
}

export type ModeratorAction =
  | "open"
  | "close"
  | "reveal"
  | "leaderboard"
  | "next"
  | "end"
  | "reset";

export function gameState(e: CongressEvent, now: number): "upcoming" | "open" | "closed" {
  if (e.status === "closed") return "closed";
  return roundState({ opensAt: e.gameOpensAt, closesAt: e.gameClosesAt } as Round, now);
}

/** Fase efectiva: un ítem abierto se cierra solo al agotarse el tiempo del servidor. */
export function effectivePhase(s: LiveState | undefined, now: number): LivePhase {
  if (!s) return "idle";
  if (s.phase === "open" && s.endsAt !== undefined && now > s.endsAt + LIVE_LATENCY_MS)
    return "closed";
  return s.phase;
}

export function createCongressCore(repo: CongressRepo, opts: CongressOptions) {
  // ---------------------------------------------------------------- utilidades
  async function loadEvent(idOrSlug: string): Promise<CongressEvent> {
    const e = await repo.getEvent(idOrSlug);
    if (!e) throw new CongressError("event_not_found", "Congreso no encontrado.");
    return e;
  }
  function assertStaff(actor: CongressActor) {
    if (!actor.isStaff)
      throw new CongressError("forbidden", "Solo la organización del congreso puede hacer esto.");
  }
  function assertPublic(e: CongressEvent, actor?: CongressActor) {
    if (e.status === "draft" && !actor?.isStaff)
      throw new CongressError("event_not_found", "Congreso no encontrado.");
  }
  async function touch(eventId: string) {
    await opts.beforeRead?.(eventId);
  }
  const playable = (q: Question) => !opts.onlyPlayable || isPlayableInCompetition(q);

  function stationRound(s: Station, e: CongressEvent): Round {
    return {
      id: stationRoundId(s.id),
      kind: "congress_station",
      eventId: e.id,
      title: `${s.label} · ${s.title}`,
      opensAt: e.gameOpensAt,
      closesAt: e.gameClosesAt,
      questionIds: s.questionIds.slice(0, STATION_MAX_QUESTIONS),
    };
  }

  function publicName(p: Participant | undefined): string {
    if (!p || !p.consents.publicRanking) return "Participante anónimo";
    return p.alias?.trim() || p.displayName;
  }

  async function computeRanking(e: CongressEvent, me?: string): Promise<EventRanking> {
    const [participants, attempts, live, stations] = await Promise.all([
      repo.listParticipants(e.id),
      repo.listStationAttempts(e.id),
      repo.listEventLiveAnswers(e.id),
      repo.listStations(e.id),
    ]);
    const stationRounds = new Set(stations.map((s) => stationRoundId(s.id)));
    const byUser = new Map<string, Participant>(participants.map((p) => [p.userId, p]));
    const entries = new Map<
      string,
      {
        userId: string;
        stationScore: number;
        liveScore: number;
        correct: number;
        totalMs: number;
        stationsDone: number;
      }
    >();
    const entry = (u: string) => {
      let x = entries.get(u);
      if (!x) {
        x = { userId: u, stationScore: 0, liveScore: 0, correct: 0, totalMs: 0, stationsDone: 0 };
        entries.set(u, x);
      }
      return x;
    };
    for (const a of attempts) {
      if (!a.submittedAt || !stationRounds.has(a.roundId) || !byUser.has(a.userId)) continue;
      const x = entry(a.userId);
      x.stationScore += a.totalScore;
      x.correct += a.correctCount;
      x.totalMs += a.totalMs;
      x.stationsDone += 1;
    }
    for (const a of live) {
      if (!byUser.has(a.userId)) continue;
      const x = entry(a.userId);
      x.liveScore += a.points;
      if (a.isCorrect) x.correct += 1;
      x.totalMs += a.responseMs;
    }
    const individual = rankEvent({
      entries: [...entries.values()],
      name: (u) => publicName(byUser.get(u)),
      hospital: (u) => byUser.get(u)?.hospital,
      me,
    });
    return {
      individual,
      hospitals: rankHospitals(individual),
      hospitalMin: HOSPITAL_MIN_PARTICIPANTS,
    };
  }

  // ---------------------------------------------------------------- participante
  async function listEvents(actor?: CongressActor): Promise<EventSummary[]> {
    const now = repo.now();
    const events = (await repo.listEvents()).filter((e) => e.status !== "draft" || actor?.isStaff);
    return Promise.all(
      events.map(async (e) => ({
        id: e.id,
        slug: e.slug,
        name: e.name,
        venue: e.venue,
        city: e.city,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        status: e.status,
        gameState: gameState(e, now),
        stations: (await repo.listStations(e.id)).filter((s) => s.active).length,
        isDemo: e.isDemo,
      })),
    );
  }

  async function eventView(
    slug: string,
    player: CongressPlayer,
    actor?: CongressActor,
  ): Promise<EventView> {
    const e = await loadEvent(slug);
    assertPublic(e, actor);
    await touch(e.id);
    const [stations, participant, visits, attempts, sessions, feedback] = await Promise.all([
      repo.listStations(e.id),
      repo.getParticipant(e.id, player.userId),
      repo.listVisits(e.id),
      repo.listStationAttempts(e.id),
      repo.listSessions(e.id),
      repo.getFeedback(e.id, player.userId),
    ]);
    const mine = new Set(visits.filter((v) => v.userId === player.userId).map((v) => v.stationId));
    const myAttempts = new Map(
      attempts.filter((a) => a.userId === player.userId).map((a) => [a.roundId, a]),
    );
    const views: StationView[] = stations
      .filter((s) => s.active)
      .map((s) => {
        const a = myAttempts.get(stationRoundId(s.id));
        return {
          id: s.id,
          label: s.label,
          title: s.title,
          description: s.description,
          floorId: s.floorId,
          x: s.x,
          y: s.y,
          subspecialty: s.subspecialty,
          track: s.track,
          questionCount: Math.min(s.questionIds.length, STATION_MAX_QUESTIONS),
          sponsor: s.sponsor,
          roundId: stationRoundId(s.id),
          status: a?.submittedAt ? "done" : mine.has(s.id) ? "unlocked" : "locked",
          myScore: a?.submittedAt ? a.totalScore : undefined,
        };
      });
    let me: EventView["me"];
    if (participant) {
      const r = await computeRanking(e, player.userId);
      const row = r.individual.find((x) => x.userId === player.userId);
      me = {
        score: row?.score ?? 0,
        rank: row?.rank,
        stationsDone: views.filter((v) => v.status === "done").length,
      };
    }
    const now = repo.now();
    const sess = await Promise.all(
      sessions.map(async (s) => ({
        id: s.id,
        title: s.title,
        room: s.room,
        speaker: s.speaker,
        phase: effectivePhase(await repo.getLiveState(s.id), now),
      })),
    );
    return {
      event: e,
      stations: views,
      participant,
      me,
      sessions: sess,
      hasFeedback: !!feedback,
      canManage: !!actor?.isStaff,
    };
  }

  async function join(
    slug: string,
    player: CongressPlayer,
    input: JoinInput,
  ): Promise<Participant> {
    const e = await loadEvent(slug);
    assertPublic(e);
    if (e.status === "closed" || gameState(e, repo.now()) === "closed")
      throw new CongressError("event_closed", "La inscripción a este congreso está cerrada.");
    if (!input.consents?.participation)
      throw new CongressError(
        "consent_required",
        "Para participar tienes que aceptar las bases y el tratamiento de datos.",
      );
    const name = (input.displayName ?? player.profileName ?? "").trim();
    if (!name) throw new CongressError("name_required", "Indica tu nombre.");
    const prev = await repo.getParticipant(e.id, player.userId);
    const p: Participant = {
      eventId: e.id,
      userId: player.userId,
      displayName: name.slice(0, 80),
      alias: input.alias?.trim().slice(0, 40) || undefined,
      hospital: (input.hospital ?? player.hospital)?.trim().slice(0, 120) || undefined,
      careerStage: input.careerStage ?? player.careerStage,
      joinedAt: prev?.joinedAt ?? new Date(repo.now()).toISOString(),
      consents: {
        participation: true,
        publicRanking: !!input.consents.publicRanking,
        communications: !!input.consents.communications,
      },
    };
    await repo.saveParticipant(p);
    return p;
  }

  /** Escaneo del QR (token) o código manual: acredita la visita y abre el reto. */
  async function scan(
    player: CongressPlayer,
    input: { token?: string; code?: string; slug?: string },
  ): Promise<ScanResult> {
    let stationId: string | undefined;
    if (input.token) stationId = await repo.findStationIdByToken(normalizeCode(input.token));
    else if (input.code && input.slug) {
      const e = await loadEvent(input.slug);
      stationId = await repo.findStationIdByCode(e.id, normalizeCode(input.code).slice(0, 8));
    }
    const station = stationId ? await repo.getStation(stationId) : undefined;
    if (!station || !station.active)
      throw new CongressError(
        "invalid_code",
        "Código no válido o caducado. Pide uno nuevo en la estación.",
      );
    const e = await loadEvent(station.eventId);
    if (input.slug && input.slug !== e.slug && input.slug !== e.id)
      throw new CongressError("wrong_event", "Este código es de otro congreso.");
    assertPublic(e);
    const state = gameState(e, repo.now());
    if (state !== "open")
      throw new CongressError(
        "game_closed",
        state === "upcoming" ? "El juego aún no ha empezado." : "El juego ha terminado.",
      );
    const participant = await repo.getParticipant(e.id, player.userId);
    if (!participant)
      throw new CongressError("join_required", "Inscríbete en el congreso para jugar.");
    const prev = await repo.getVisit(station.id, player.userId);
    if (!prev)
      await repo.saveVisit({
        eventId: e.id,
        stationId: station.id,
        userId: player.userId,
        scannedAt: new Date(repo.now()).toISOString(),
      });
    await repo.upsertStationRound(stationRound(station, e));
    return {
      stationId: station.id,
      roundId: stationRoundId(station.id),
      eventSlug: e.slug,
      stationTitle: station.title,
      firstVisit: !prev,
    };
  }

  async function ranking(slug: string, player?: CongressPlayer): Promise<EventRanking> {
    const e = await loadEvent(slug);
    assertPublic(e);
    await touch(e.id);
    return computeRanking(e, player?.userId);
  }

  /** Temporada: cada congreso publicado es un Hunt; cuentan los mejores de cada persona. */
  async function season(player?: CongressPlayer): Promise<SeasonView> {
    const now = repo.now();
    const events = (await repo.listEvents())
      .filter((e) => e.status !== "draft")
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const results = [];
    for (const e of events) {
      await touch(e.id);
      results.push({
        eventId: e.id,
        eventName: e.name,
        rows: (await computeRanking(e)).individual,
      });
    }
    return {
      plan: SEASON_PLAN,
      hunts: events.map((e) => ({
        id: e.id,
        slug: e.slug,
        name: e.name,
        city: e.city,
        venue: e.venue,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        gameState: gameState(e, now),
        isDemo: e.isDemo,
      })),
      rows: rankSeason(results, { me: player?.userId }),
    };
  }

  async function submitFeedback(slug: string, player: CongressPlayer, input: FeedbackInput) {
    const e = await loadEvent(slug);
    if (!(await repo.getParticipant(e.id, player.userId)))
      throw new CongressError("join_required", "Inscríbete en el congreso para valorarlo.");
    const clamp = (n: number, lo: number, hi: number) =>
      Math.min(hi, Math.max(lo, Math.round(Number(n) || 0)));
    const ok = await repo.insertFeedback({
      eventId: e.id,
      userId: player.userId,
      overall: clamp(input.overall, 1, 5),
      stations: clamp(input.stations, 1, 5),
      live: clamp(input.live, 1, 5),
      recommend: clamp(input.recommend, 0, 10),
      comment: input.comment?.trim().slice(0, 500) || undefined,
      submittedAt: new Date(repo.now()).toISOString(),
    });
    if (!ok) throw new CongressError("feedback_exists", "Ya has enviado tu valoración. ¡Gracias!");
    return true;
  }

  // ---------------------------------------------------------------- directo (sala)
  async function itemPublic(item: LiveItem, userId: string) {
    if (item.kind === "poll") {
      return {
        id: item.id,
        kind: item.kind,
        stem: item.prompt ?? "",
        options: item.options ?? [],
        multiple: false,
        timeLimitS: item.timeLimitS,
        unvalidated: false,
      };
    }
    const q = item.questionId ? await repo.getQuestion(item.questionId) : undefined;
    if (!q) throw new CongressError("question_not_found", "Pregunta no encontrada.");
    return {
      id: item.id,
      kind: item.kind,
      stem: q.stem,
      // Orden propio de cada persona; en la pantalla de sala, el orden original.
      options: (userId ? shuffle(q.options, `${q.id}:${userId}`) : q.options).map((o) => ({
        id: o.id,
        text: o.text,
      })),
      multiple: q.type === "multiple_choice",
      timeLimitS: item.timeLimitS,
      unvalidated: !isPlayableInCompetition(q),
    };
  }

  async function buildLive(
    e: CongressEvent,
    session: LiveSession,
    userId: string,
  ): Promise<LiveView> {
    const now = repo.now();
    const state = await repo.getLiveState(session.id);
    const phase = effectivePhase(state, now);
    const item = state && state.itemIndex >= 0 ? session.items[state.itemIndex] : undefined;
    const participants = (await repo.listParticipants(e.id)).length;
    const view: LiveView = {
      session: {
        id: session.id,
        title: session.title,
        room: session.room,
        speaker: session.speaker,
      },
      phase,
      itemIndex: state?.itemIndex ?? -1,
      itemCount: session.items.length,
      serverNow: now,
      answered: 0,
      participants,
    };
    if (!item || phase === "idle" || phase === "ended") return view;
    // La pregunta solo se entrega con el ítem abierto o ya cerrado (nunca antes).
    view.item = await itemPublic(item, userId);
    if (phase === "open" && state?.endsAt !== undefined)
      view.remainingMs = Math.max(0, state.endsAt - now);
    const answers = await repo.listLiveAnswers(session.id, item.id);
    view.answered = answers.length;
    const mine = userId ? answers.find((a) => a.userId === userId) : undefined;
    if (mine)
      view.myAnswer = {
        selected: mine.selected,
        // Los puntos y el acierto no se desvelan hasta la revelación.
        points: phase === "reveal" || phase === "leaderboard" ? mine.points : 0,
        isCorrect: phase === "reveal" || phase === "leaderboard" ? mine.isCorrect : false,
        responseMs: mine.responseMs,
      };
    const showTally =
      item.kind === "poll" ? phase !== "open" : phase === "reveal" || phase === "leaderboard";
    if (showTally) {
      const q = item.questionId ? await repo.getQuestion(item.questionId) : undefined;
      view.reveal = {
        correctOptionIds:
          item.kind === "quiz" && q && (phase === "reveal" || phase === "leaderboard")
            ? q.options.filter((o) => o.isCorrect).map((o) => o.id)
            : [],
        explanation: phase === "reveal" || phase === "leaderboard" ? q?.explanation : undefined,
        references: phase === "reveal" || phase === "leaderboard" ? (q?.references ?? []) : [],
        tally: tally(
          view.item.options.map((o) => o.id),
          answers,
        ),
        answered: answers.length,
      };
    }
    return view;
  }

  /** Sesión «en curso»: la primera con un ítem activo; si no, la última que se movió. */
  async function currentSession(e: CongressEvent): Promise<LiveSession | undefined> {
    const sessions = await repo.listSessions(e.id);
    const states = await Promise.all(sessions.map((s) => repo.getLiveState(s.id)));
    const now = repo.now();
    let best: { s: LiveSession; v: number } | undefined;
    sessions.forEach((s, i) => {
      const st = states[i];
      const ph = effectivePhase(st, now);
      if (!st || ph === "idle" || ph === "ended") return;
      if (!best || st.version > best.v) best = { s, v: st.version };
    });
    return best?.s;
  }

  async function liveView(slug: string, player: CongressPlayer, sessionId?: string) {
    const e = await loadEvent(slug);
    assertPublic(e);
    await touch(e.id);
    const s = sessionId ? await repo.getSession(sessionId) : await currentSession(e);
    if (!s || s.eventId !== e.id) return null;
    return buildLive(e, s, player.userId);
  }

  async function answerLive(
    slug: string,
    player: CongressPlayer,
    input: { sessionId: string; itemId: string; selected: string[] },
  ): Promise<LiveAnswerFeedback> {
    const e = await loadEvent(slug);
    const s = await repo.getSession(input.sessionId);
    if (!s || s.eventId !== e.id)
      throw new CongressError("session_not_found", "Sesión no encontrada.");
    if (!(await repo.getParticipant(e.id, player.userId)))
      throw new CongressError("join_required", "Inscríbete en el congreso para participar.");
    const now = repo.now();
    const state = await repo.getLiveState(s.id);
    const item = state ? s.items[state.itemIndex] : undefined;
    if (
      !state ||
      !item ||
      item.id !== input.itemId ||
      effectivePhase(state, now) !== "open" ||
      state.openedAt === undefined
    )
      throw new CongressError("live_closed", "Esta pregunta ya está cerrada.");
    const responseMs = now - state.openedAt;
    let rec = { points: 0, isCorrect: false, selected: input.selected.slice(0, 10) };
    if (item.kind === "quiz") {
      const q = item.questionId ? await repo.getQuestion(item.questionId) : undefined;
      if (!q) throw new CongressError("question_not_found", "Pregunta no encontrada.");
      const r = scoreAnswer({
        question: q,
        selected: rec.selected,
        responseMs,
        timeLimitS: item.timeLimitS,
        lambda: LIVE_LAMBDA,
      });
      rec = { points: r.points, isCorrect: r.isCorrect, selected: r.selected };
    } else {
      const valid = new Set((item.options ?? []).map((o) => o.id));
      rec.selected = rec.selected.filter((id) => valid.has(id)).slice(0, 1);
      if (rec.selected.length === 0) throw new CongressError("invalid_option", "Elige una opción.");
    }
    const ok = await repo.insertLiveAnswer({
      sessionId: s.id,
      itemId: item.id,
      userId: player.userId,
      selected: rec.selected,
      responseMs: Math.max(0, Math.round(responseMs)),
      isCorrect: rec.isCorrect,
      points: rec.points,
      answeredAt: now,
    });
    if (!ok) throw new CongressError("already_answered", "Ya has respondido a esta pregunta.");
    return { accepted: true, points: rec.points, isCorrect: rec.isCorrect, responseMs };
  }

  async function sala(slug: string): Promise<SalaView> {
    const e = await loadEvent(slug);
    assertPublic(e);
    await touch(e.id);
    const s = await currentSession(e);
    const r = await computeRanking(e);
    const attempts = await repo.listStationAttempts(e.id);
    return {
      event: {
        id: e.id,
        slug: e.slug,
        name: e.name,
        venue: e.venue,
        sponsors: e.sponsors,
        recognition: e.recognition,
      },
      live: s ? await buildLive(e, s, "") : undefined,
      top: r.individual.slice(0, 10),
      participants: (await repo.listParticipants(e.id)).length,
      stationsCompleted: attempts.filter((a) => a.submittedAt).length,
    };
  }

  // ---------------------------------------------------------------- organización
  async function moderate(
    actor: CongressActor,
    sessionId: string,
    action: ModeratorAction,
    itemIndex?: number,
  ): Promise<LiveState> {
    assertStaff(actor);
    const s = await repo.getSession(sessionId);
    if (!s) throw new CongressError("session_not_found", "Sesión no encontrada.");
    const now = repo.now();
    const prev = (await repo.getLiveState(s.id)) ?? {
      sessionId: s.id,
      itemIndex: -1,
      phase: "idle" as LivePhase,
      version: 0,
    };
    const cur = effectivePhase(prev, now);
    const next: LiveState = { ...prev, version: prev.version + 1 };
    const openAt = (i: number) => {
      const item = s.items[i];
      if (!item) throw new CongressError("item_not_found", "No hay más preguntas en esta sesión.");
      next.itemIndex = i;
      next.phase = "open";
      next.openedAt = now;
      next.endsAt = now + item.timeLimitS * 1000;
    };
    switch (action) {
      case "open":
        openAt(itemIndex ?? 0);
        break;
      case "next":
        openAt(prev.itemIndex + 1);
        break;
      case "close":
        if (cur !== "open") throw new CongressError("not_open", "No hay ninguna pregunta abierta.");
        next.phase = "closed";
        next.endsAt = now;
        break;
      case "reveal":
        if (cur !== "closed" && cur !== "open")
          throw new CongressError("not_closed", "Primero lanza y cierra una pregunta.");
        next.phase = "reveal";
        if (cur === "open") next.endsAt = now;
        break;
      case "leaderboard":
        next.phase = "leaderboard";
        break;
      case "end":
        next.phase = "ended";
        break;
      case "reset":
        next.phase = "idle";
        next.itemIndex = -1;
        next.openedAt = undefined;
        next.endsAt = undefined;
        break;
    }
    // Un ítem ya lanzado no se repite (sus respuestas son definitivas).
    if (
      next.phase === "open" &&
      (await repo.listLiveAnswers(s.id, s.items[next.itemIndex].id)).length > 0
    )
      throw new CongressError("already_used", "Esa pregunta ya se ha lanzado en esta sesión.");
    await repo.saveLiveState(next);
    await repo.audit(actor.userId, `live.${action}`, { sessionId, itemIndex: next.itemIndex });
    return next;
  }

  async function adminOverview(actor: CongressActor, slug: string): Promise<AdminOverview> {
    assertStaff(actor);
    const e = await loadEvent(slug);
    await touch(e.id);
    const [participants, stations, visits, attempts, sessions, live, feedback] = await Promise.all([
      repo.listParticipants(e.id),
      repo.listStations(e.id),
      repo.listVisits(e.id),
      repo.listStationAttempts(e.id),
      repo.listSessions(e.id),
      repo.listEventLiveAnswers(e.id),
      repo.listFeedback(e.id),
    ]);
    const adminStations: AdminStation[] = await Promise.all(
      stations.map(async (s) => {
        const tok = await ensureToken(s.id);
        const done = attempts.filter((a) => a.roundId === stationRoundId(s.id) && a.submittedAt);
        return {
          ...s,
          token: tok.token,
          manualCode: manualCode(tok.token),
          scans: visits.filter((v) => v.stationId === s.id).length,
          completions: done.length,
          avgScore: done.length
            ? Math.round((done.reduce((x, a) => x + a.totalScore, 0) / done.length) * 10) / 10
            : 0,
        };
      }),
    );
    const now = repo.now();
    const sess = await Promise.all(
      sessions.map(async (s) => {
        const st = (await repo.getLiveState(s.id)) ?? {
          sessionId: s.id,
          itemIndex: -1,
          phase: "idle" as LivePhase,
          version: 0,
        };
        return { ...s, state: { ...st, phase: effectivePhase(st, now) } };
      }),
    );
    const avg = (k: "overall" | "stations" | "live") =>
      feedback.length
        ? Math.round((feedback.reduce((x, f) => x + f[k], 0) / feedback.length) * 10) / 10
        : 0;
    const promoters = feedback.filter((f) => f.recommend >= 9).length;
    const detractors = feedback.filter((f) => f.recommend <= 6).length;
    return {
      event: e,
      participants,
      stations: adminStations,
      sessions: sess,
      kpis: {
        participants: participants.length,
        scans: visits.length,
        completions: attempts.filter((a) => a.submittedAt).length,
        liveAnswers: live.length,
        feedback: feedback.length,
        communicationsOptIn: participants.filter((p) => p.consents.communications).length,
      },
      feedback: {
        count: feedback.length,
        overall: avg("overall"),
        stations: avg("stations"),
        live: avg("live"),
        nps: feedback.length ? Math.round(((promoters - detractors) / feedback.length) * 100) : 0,
      },
    };
  }

  async function ensureToken(stationId: string): Promise<StationToken> {
    const t = await repo.getToken(stationId);
    if (t) return t;
    const fresh = {
      stationId,
      token: generateToken(),
      rotatedAt: new Date(repo.now()).toISOString(),
    };
    await repo.saveToken(fresh);
    return fresh;
  }

  async function rotateToken(actor: CongressActor, stationId: string): Promise<StationToken> {
    assertStaff(actor);
    const t = { stationId, token: generateToken(), rotatedAt: new Date(repo.now()).toISOString() };
    await repo.saveToken(t);
    await repo.audit(actor.userId, "station.rotate_token", { stationId });
    return t;
  }

  async function saveEvent(actor: CongressActor, e: CongressEvent) {
    assertStaff(actor);
    const clash = (await repo.listEvents()).find((x) => x.slug === e.slug && x.id !== e.id);
    if (clash) throw new CongressError("slug_taken", "Ya existe un congreso con esa dirección.");
    if (new Date(e.gameClosesAt) <= new Date(e.gameOpensAt))
      throw new CongressError(
        "bad_window",
        "El cierre del juego debe ser posterior a la apertura.",
      );
    await repo.saveEvent(e);
    await repo.audit(actor.userId, "event.save", { eventId: e.id, status: e.status });
    return e;
  }

  async function saveStation(actor: CongressActor, s: Station) {
    assertStaff(actor);
    const e = await loadEvent(s.eventId);
    if (!e.floors.some((f) => f.id === s.floorId))
      throw new CongressError("bad_floor", "Planta no válida.");
    const ids = [...new Set(s.questionIds)].slice(0, STATION_MAX_QUESTIONS);
    for (const id of ids) {
      const q = await repo.getQuestion(id);
      if (!q) throw new CongressError("question_not_found", `Pregunta ${id} no encontrada.`);
      if (!playable(q))
        throw new CongressError(
          "question_not_playable",
          "Solo se pueden usar preguntas aprobadas, validadas y con referencia.",
        );
    }
    const clean: Station = {
      ...s,
      label: s.label.trim().slice(0, 6) || "E",
      title: s.title.trim().slice(0, 80),
      description: s.description.trim().slice(0, 280),
      x: Math.min(100, Math.max(0, s.x)),
      y: Math.min(100, Math.max(0, s.y)),
      questionIds: ids,
      sponsor: s.sponsor?.name.trim()
        ? {
            name: s.sponsor.name.trim().slice(0, 60),
            disclosure: sponsorDisclosure(s.sponsor.name.trim()),
          }
        : undefined,
    };
    await repo.saveStation(clean);
    await ensureToken(clean.id);
    await repo.upsertStationRound(stationRound(clean, e));
    await repo.audit(actor.userId, "station.save", { stationId: clean.id });
    return clean;
  }

  async function deleteStation(actor: CongressActor, stationId: string) {
    assertStaff(actor);
    const st = await repo.getStation(stationId);
    if (!st) return;
    const visits = (await repo.listVisits(st.eventId)).filter((v) => v.stationId === stationId);
    if (visits.length > 0)
      throw new CongressError(
        "station_in_use",
        "Esta estación ya tiene participantes: desactívala en lugar de borrarla.",
      );
    await repo.deleteStation(stationId);
    await repo.audit(actor.userId, "station.delete", { stationId });
  }

  async function suggestQuestions(actor: CongressActor, subspecialty: string, seed: string) {
    assertStaff(actor);
    const pool = (await repo.listQuestions({ subspecialty })).filter(playable);
    return shuffle(pool, seed)
      .slice(0, STATION_MAX_QUESTIONS)
      .map((q) => q.id);
  }

  async function questionBank(
    actor: CongressActor,
    subspecialty?: string,
  ): Promise<QuestionPick[]> {
    assertStaff(actor);
    return (await repo.listQuestions({ subspecialty })).map((q) => ({
      id: q.id,
      subspecialty: q.subspecialty,
      difficulty: q.difficulty,
      stem: q.stem,
      playable: isPlayableInCompetition(q),
    }));
  }

  async function saveSession(actor: CongressActor, s: LiveSession) {
    assertStaff(actor);
    await loadEvent(s.eventId);
    if (!s.title.trim()) throw new CongressError("title_required", "La sesión necesita un título.");
    const items: LiveItem[] = [];
    for (const it of s.items) {
      const timeLimitS = Math.min(120, Math.max(10, Math.round(it.timeLimitS || 20)));
      if (it.kind === "quiz") {
        const q = it.questionId ? await repo.getQuestion(it.questionId) : undefined;
        if (!q) throw new CongressError("question_not_found", "Pregunta no encontrada.");
        if (!playable(q))
          throw new CongressError(
            "question_not_playable",
            "Solo se pueden lanzar preguntas aprobadas, validadas y con referencia.",
          );
        items.push({ id: it.id, kind: "quiz", questionId: q.id, timeLimitS });
      } else {
        const options = (it.options ?? [])
          .map((o) => ({ id: o.id, text: o.text.trim().slice(0, 80) }))
          .filter((o) => o.text);
        if (!it.prompt?.trim() || options.length < 2 || options.length > 6)
          throw new CongressError(
            "bad_poll",
            "Una encuesta necesita un enunciado y de 2 a 6 opciones.",
          );
        items.push({
          id: it.id,
          kind: "poll",
          prompt: it.prompt.trim().slice(0, 200),
          options,
          timeLimitS,
        });
      }
    }
    const clean = {
      ...s,
      title: s.title.trim().slice(0, 120),
      room: s.room.trim().slice(0, 60),
      items,
    };
    await repo.saveSession(clean);
    await repo.audit(actor.userId, "session.save", { sessionId: s.id });
    return clean;
  }

  async function deleteSession(actor: CongressActor, sessionId: string) {
    assertStaff(actor);
    if ((await repo.listLiveAnswers(sessionId)).length > 0)
      throw new CongressError(
        "session_in_use",
        "Esta sesión ya tiene respuestas y no se puede borrar.",
      );
    await repo.deleteSession(sessionId);
    await repo.audit(actor.userId, "session.delete", { sessionId });
  }

  async function stationTokens(actor: CongressActor, slug: string) {
    assertStaff(actor);
    const e = await loadEvent(slug);
    const stations = (await repo.listStations(e.id)).filter((s) => s.active);
    await repo.audit(actor.userId, "station.print_qr", { eventId: e.id });
    return {
      event: e,
      stations: await Promise.all(
        stations.map(async (s) => {
          const t = await ensureToken(s.id);
          return {
            id: s.id,
            label: s.label,
            title: s.title,
            token: t.token,
            manualCode: manualCode(t.token),
          };
        }),
      ),
    };
  }

  type ExportKind = "participants" | "ranking" | "stations" | "live" | "feedback";
  async function exportCsv(actor: CongressActor, slug: string, kind: ExportKind) {
    assertStaff(actor);
    const e = await loadEvent(slug);
    await repo.audit(actor.userId, `export.${kind}`, { eventId: e.id });
    const date = new Date(repo.now()).toISOString().slice(0, 10);
    const filename = `radar-hunt_${e.slug}_${kind}_${date}.csv`;
    if (kind === "participants") {
      const [ps, r] = [await repo.listParticipants(e.id), await computeRanking(e)];
      const score = new Map(r.individual.map((x) => [x.userId, x]));
      return {
        filename,
        csv: toCsv(
          [
            "Nombre",
            "Alias",
            "Centro",
            "Etapa",
            "Inscripción",
            "Clasificación pública",
            "Comunicaciones de Ophthalmology Radar",
            "Puntos",
            "Estaciones completadas",
          ],
          ps.map((p) => [
            p.displayName,
            p.alias,
            p.hospital,
            p.careerStage === "resident"
              ? "Residente"
              : p.careerStage === "attending"
                ? "Adjunto/a"
                : "",
            p.joinedAt,
            p.consents.publicRanking,
            p.consents.communications,
            score.get(p.userId)?.score ?? 0,
            score.get(p.userId)?.stationsDone ?? 0,
          ]),
        ),
      };
    }
    if (kind === "ranking") {
      const r = await computeRanking(e);
      return {
        filename,
        csv: toCsv(
          [
            "Puesto",
            "Nombre público",
            "Centro",
            "Estaciones",
            "Sala",
            "Total",
            "Aciertos",
            "Estaciones completadas",
          ],
          r.individual.map((x) => [
            x.rank,
            x.name,
            x.hospital,
            x.stationScore,
            x.liveScore,
            x.score,
            x.correct,
            x.stationsDone,
          ]),
        ),
      };
    }
    if (kind === "stations") {
      const ov = await adminOverview(actor, slug);
      return {
        filename,
        csv: toCsv(
          [
            "Estación",
            "Título",
            "Subespecialidad",
            "Patrocinio",
            "Escaneos",
            "Completadas",
            "Puntuación media",
          ],
          ov.stations.map((s) => [
            s.label,
            s.title,
            s.subspecialty,
            s.sponsor?.name,
            s.scans,
            s.completions,
            s.avgScore,
          ]),
        ),
      };
    }
    if (kind === "live") {
      const rows: (string | number)[][] = [];
      for (const s of await repo.listSessions(e.id)) {
        for (const it of s.items) {
          const answers = await repo.listLiveAnswers(s.id, it.id);
          if (answers.length === 0) continue;
          const pub = await itemPublic(it, "");
          const t = tally(
            pub.options.map((o) => o.id),
            answers,
          );
          rows.push([
            s.title,
            it.kind === "quiz" ? "Reto" : "Encuesta",
            pub.stem,
            answers.length,
            it.kind === "quiz"
              ? `${Math.round((answers.filter((a) => a.isCorrect).length / answers.length) * 100)} %`
              : "",
            pub.options.map((o) => `${o.text}: ${t[o.id] ?? 0}`).join(" | "),
          ]);
        }
      }
      return {
        filename,
        csv: toCsv(
          ["Sesión", "Tipo", "Enunciado", "Respuestas", "Aciertos", "Recuento por opción"],
          rows,
        ),
      };
    }
    // feedback: solo agregados y comentarios sin identificar
    const fb = await repo.listFeedback(e.id);
    return {
      filename,
      csv: toCsv(
        [
          "Valoración global (1–5)",
          "Estaciones (1–5)",
          "Sesiones en directo (1–5)",
          "Recomendaría (0–10)",
          "Comentario",
        ],
        shuffle(fb, e.id).map((f) => [f.overall, f.stations, f.live, f.recommend, f.comment]),
      ),
    };
  }

  return {
    listEvents,
    eventView,
    join,
    scan,
    ranking,
    season,
    submitFeedback,
    liveView,
    answerLive,
    sala,
    moderate,
    adminOverview,
    rotateToken,
    saveEvent,
    saveStation,
    deleteStation,
    suggestQuestions,
    questionBank,
    saveSession,
    deleteSession,
    stationTokens,
    exportCsv,
  };
}

export type CongressCore = ReturnType<typeof createCongressCore>;

export interface SeasonView {
  plan: typeof SEASON_PLAN;
  hunts: {
    id: string;
    slug: string;
    name: string;
    city: string;
    venue: string;
    startsAt: string;
    endsAt: string;
    gameState: "upcoming" | "open" | "closed";
    isDemo?: boolean;
  }[];
  rows: SeasonRow[];
}

export function sponsorDisclosure(name: string): string {
  return `Estación con el apoyo de ${name}. ${name} no ha elaborado, seleccionado ni revisado las preguntas y no recibe datos personales de los participantes.`;
}

export const RECOGNITION_POLICY =
  "Reconocimiento no monetario: diploma digital y mención en la clausura para los primeros clasificados y centros. Sin premios en metálico, sorteos ni regalos de valor (política pendiente de revisión legal: códigos de Farmaindustria, EFPIA y MedTech Europe).";
