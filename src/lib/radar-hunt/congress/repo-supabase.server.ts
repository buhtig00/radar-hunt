// RADAR HUNT — repositorio Supabase del modo congreso (solo servidor, service_role).
// Toda la lógica vive en core.ts; aquí solo se leen y escriben las tablas rh_*.
import { ATTEMPT_COLS, rhDb, rhMust, rowToAttempt, rowToQuestion } from "../repo-supabase.server";
import type { Question, SubspecialtyCode } from "../types";
import type { CongressRepo } from "./core";
import type {
  CongressEvent,
  Feedback,
  LiveAnswer,
  LiveSession,
  LiveState,
  Participant,
  Station,
  StationVisit,
} from "./types";

const db = rhDb;
const must = rhMust;
const iso = (ms?: number) => (ms === undefined ? null : new Date(ms).toISOString());
const ms = (s: string | null | undefined) => (s ? new Date(s).getTime() : undefined);
const isUniqueViolation = (e: { code?: string } | null) => e?.code === "23505";

type EventRow = {
  id: string;
  slug: string;
  name: string;
  venue: string;
  city: string;
  timezone: string;
  starts_at: string;
  ends_at: string;
  game_opens_at: string;
  game_closes_at: string;
  status: CongressEvent["status"];
  floors: CongressEvent["floors"];
  sponsors: CongressEvent["sponsors"];
  recognition: string;
  is_demo: boolean;
};
const toEvent = (r: EventRow): CongressEvent => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  venue: r.venue,
  city: r.city,
  timezone: r.timezone,
  startsAt: r.starts_at,
  endsAt: r.ends_at,
  gameOpensAt: r.game_opens_at,
  gameClosesAt: r.game_closes_at,
  status: r.status,
  floors: r.floors ?? [],
  sponsors: r.sponsors ?? [],
  recognition: r.recognition,
  isDemo: r.is_demo,
});

type StationRow = {
  id: string;
  event_id: string;
  label: string;
  title: string;
  description: string;
  floor_id: string;
  x: number | string;
  y: number | string;
  subspecialty: SubspecialtyCode;
  track: string | null;
  question_ids: string[];
  sponsor: Station["sponsor"] | null;
  active: boolean;
};
const toStation = (r: StationRow): Station => ({
  id: r.id,
  eventId: r.event_id,
  label: r.label,
  title: r.title,
  description: r.description,
  floorId: r.floor_id,
  x: Number(r.x),
  y: Number(r.y),
  subspecialty: r.subspecialty,
  track: r.track ?? undefined,
  questionIds: r.question_ids ?? [],
  sponsor: r.sponsor ?? undefined,
  active: r.active,
});

type ParticipantRow = {
  event_id: string;
  user_id: string;
  display_name: string;
  alias: string | null;
  hospital: string | null;
  career_stage: Participant["careerStage"] | null;
  joined_at: string;
  consent_participation: boolean;
  consent_public_ranking: boolean;
  consent_communications: boolean;
};
const toParticipant = (r: ParticipantRow): Participant => ({
  eventId: r.event_id,
  userId: r.user_id,
  displayName: r.display_name,
  alias: r.alias ?? undefined,
  hospital: r.hospital ?? undefined,
  careerStage: r.career_stage ?? undefined,
  joinedAt: r.joined_at,
  consents: {
    participation: r.consent_participation,
    publicRanking: r.consent_public_ranking,
    communications: r.consent_communications,
  },
});

type VisitRow = { event_id: string; station_id: string; user_id: string; scanned_at: string };
const toVisit = (r: VisitRow): StationVisit => ({
  eventId: r.event_id,
  stationId: r.station_id,
  userId: r.user_id,
  scannedAt: r.scanned_at,
});

type SessionRow = {
  id: string;
  event_id: string;
  title: string;
  room: string;
  speaker: string | null;
  starts_at: string | null;
  items: LiveSession["items"];
};
const toSession = (r: SessionRow): LiveSession => ({
  id: r.id,
  eventId: r.event_id,
  title: r.title,
  room: r.room,
  speaker: r.speaker ?? undefined,
  startsAt: r.starts_at ?? undefined,
  items: r.items ?? [],
});

type LiveRow = {
  session_id: string;
  item_index: number;
  phase: LiveState["phase"];
  opened_at: string | null;
  ends_at: string | null;
  version: number;
};
const toLive = (r: LiveRow): LiveState => ({
  sessionId: r.session_id,
  itemIndex: r.item_index,
  phase: r.phase,
  openedAt: ms(r.opened_at),
  endsAt: ms(r.ends_at),
  version: r.version,
});

type AnswerRow = {
  session_id: string;
  item_id: string;
  user_id: string;
  selected: string[];
  response_ms: number;
  is_correct: boolean;
  points: number | string;
  answered_at: string;
};
const toAnswer = (r: AnswerRow): LiveAnswer => ({
  sessionId: r.session_id,
  itemId: r.item_id,
  userId: r.user_id,
  selected: r.selected,
  responseMs: r.response_ms,
  isCorrect: r.is_correct,
  points: Number(r.points),
  answeredAt: ms(r.answered_at) ?? 0,
});

type FeedbackRow = {
  event_id: string;
  user_id: string;
  overall: number;
  stations: number;
  live: number;
  recommend: number;
  comment: string | null;
  submitted_at: string;
};
const toFeedback = (r: FeedbackRow): Feedback => ({
  eventId: r.event_id,
  userId: r.user_id,
  overall: r.overall,
  stations: r.stations,
  live: r.live,
  recommend: r.recommend,
  comment: r.comment ?? undefined,
  submittedAt: r.submitted_at,
});

export function createCongressSupabaseRepo(): CongressRepo {
  return {
    now: () => Date.now(),

    async listEvents() {
      const rows = must(await db().from("rh_events").select("*").order("starts_at")) as EventRow[];
      return rows.map(toEvent);
    },
    async getEvent(idOrSlug) {
      const r = must(
        await db()
          .from("rh_events")
          .select("*")
          .or(
            `id.eq.${idOrSlug.replace(/[^a-z0-9-]/gi, "")},slug.eq.${idOrSlug.replace(/[^a-z0-9-]/gi, "")}`,
          )
          .maybeSingle(),
      ) as EventRow | null;
      return r ? toEvent(r) : undefined;
    },
    async saveEvent(e) {
      must(
        await db().from("rh_events").upsert({
          id: e.id,
          slug: e.slug,
          name: e.name,
          venue: e.venue,
          city: e.city,
          timezone: e.timezone,
          starts_at: e.startsAt,
          ends_at: e.endsAt,
          game_opens_at: e.gameOpensAt,
          game_closes_at: e.gameClosesAt,
          status: e.status,
          floors: e.floors,
          sponsors: e.sponsors,
          recognition: e.recognition,
          is_demo: !!e.isDemo,
        }),
      );
    },

    async listStations(eventId) {
      const rows = must(
        await db().from("rh_event_stations").select("*").eq("event_id", eventId).order("label"),
      ) as StationRow[];
      return rows.map(toStation);
    },
    async getStation(id) {
      const r = must(
        await db().from("rh_event_stations").select("*").eq("id", id).maybeSingle(),
      ) as StationRow | null;
      return r ? toStation(r) : undefined;
    },
    async saveStation(s) {
      must(
        await db()
          .from("rh_event_stations")
          .upsert({
            id: s.id,
            event_id: s.eventId,
            label: s.label,
            title: s.title,
            description: s.description,
            floor_id: s.floorId,
            x: s.x,
            y: s.y,
            subspecialty: s.subspecialty,
            track: s.track ?? null,
            question_ids: s.questionIds,
            sponsor: s.sponsor ?? null,
            active: s.active,
          }),
      );
    },
    async deleteStation(id) {
      must(await db().from("rh_event_stations").delete().eq("id", id));
    },
    async getToken(stationId) {
      const r = must(
        await db().from("rh_station_tokens").select("*").eq("station_id", stationId).maybeSingle(),
      ) as { station_id: string; token: string; rotated_at: string } | null;
      return r ? { stationId: r.station_id, token: r.token, rotatedAt: r.rotated_at } : undefined;
    },
    async saveToken(t) {
      must(
        await db()
          .from("rh_station_tokens")
          .upsert({ station_id: t.stationId, token: t.token, rotated_at: t.rotatedAt }),
      );
    },
    async findStationIdByToken(token) {
      const r = must(
        await db().from("rh_station_tokens").select("station_id").eq("token", token).maybeSingle(),
      ) as { station_id: string } | null;
      return r?.station_id;
    },
    async findStationIdByCode(eventId, code) {
      const rows = must(
        await db()
          .from("rh_station_tokens")
          .select("station_id, rh_event_stations!inner(event_id)")
          .eq("code8", code)
          .eq("rh_event_stations.event_id", eventId),
      ) as { station_id: string }[];
      return rows.length === 1 ? rows[0].station_id : undefined;
    },

    async getParticipant(eventId, userId) {
      const r = must(
        await db()
          .from("rh_event_participants")
          .select("*")
          .eq("event_id", eventId)
          .eq("user_id", userId)
          .maybeSingle(),
      ) as ParticipantRow | null;
      return r ? toParticipant(r) : undefined;
    },
    async listParticipants(eventId) {
      const rows = must(
        await db().from("rh_event_participants").select("*").eq("event_id", eventId),
      ) as ParticipantRow[];
      return rows.map(toParticipant);
    },
    async saveParticipant(p) {
      must(
        await db()
          .from("rh_event_participants")
          .upsert({
            event_id: p.eventId,
            user_id: p.userId,
            display_name: p.displayName,
            alias: p.alias ?? null,
            hospital: p.hospital ?? null,
            career_stage: p.careerStage ?? null,
            joined_at: p.joinedAt,
            consent_participation: p.consents.participation,
            consent_public_ranking: p.consents.publicRanking,
            consent_communications: p.consents.communications,
            consents_updated_at: new Date().toISOString(),
          }),
      );
    },

    async getVisit(stationId, userId) {
      const r = must(
        await db()
          .from("rh_station_visits")
          .select("*")
          .eq("station_id", stationId)
          .eq("user_id", userId)
          .maybeSingle(),
      ) as VisitRow | null;
      return r ? toVisit(r) : undefined;
    },
    async listVisits(eventId) {
      const rows = must(
        await db().from("rh_station_visits").select("*").eq("event_id", eventId),
      ) as VisitRow[];
      return rows.map(toVisit);
    },
    async saveVisit(v) {
      const res = await db().from("rh_station_visits").insert({
        event_id: v.eventId,
        station_id: v.stationId,
        user_id: v.userId,
        scanned_at: v.scannedAt,
      });
      if (res.error && !isUniqueViolation(res.error)) throw new Error(res.error.message);
    },

    async listSessions(eventId) {
      const rows = must(
        await db().from("rh_event_sessions").select("*").eq("event_id", eventId).order("starts_at"),
      ) as SessionRow[];
      return rows.map(toSession);
    },
    async getSession(id) {
      const r = must(
        await db().from("rh_event_sessions").select("*").eq("id", id).maybeSingle(),
      ) as SessionRow | null;
      return r ? toSession(r) : undefined;
    },
    async saveSession(s) {
      must(
        await db()
          .from("rh_event_sessions")
          .upsert({
            id: s.id,
            event_id: s.eventId,
            title: s.title,
            room: s.room,
            speaker: s.speaker ?? null,
            starts_at: s.startsAt ?? null,
            items: s.items,
          }),
      );
    },
    async deleteSession(id) {
      must(await db().from("rh_event_sessions").delete().eq("id", id));
    },
    async getLiveState(sessionId) {
      const r = must(
        await db().from("rh_live_state").select("*").eq("session_id", sessionId).maybeSingle(),
      ) as LiveRow | null;
      return r ? toLive(r) : undefined;
    },
    async saveLiveState(s) {
      must(
        await db()
          .from("rh_live_state")
          .upsert({
            session_id: s.sessionId,
            item_index: s.itemIndex,
            phase: s.phase,
            opened_at: iso(s.openedAt),
            ends_at: iso(s.endsAt),
            version: s.version,
          }),
      );
    },
    async listLiveAnswers(sessionId, itemId) {
      let q = db().from("rh_live_answers").select("*").eq("session_id", sessionId);
      if (itemId !== undefined) q = q.eq("item_id", itemId);
      return (must(await q) as AnswerRow[]).map(toAnswer);
    },
    async listEventLiveAnswers(eventId) {
      const sessions = must(
        await db().from("rh_event_sessions").select("id").eq("event_id", eventId),
      ) as { id: string }[];
      if (sessions.length === 0) return [];
      const rows = must(
        await db()
          .from("rh_live_answers")
          .select("*")
          .in(
            "session_id",
            sessions.map((s) => s.id),
          ),
      ) as AnswerRow[];
      return rows.map(toAnswer);
    },
    async insertLiveAnswer(a) {
      const res = await db()
        .from("rh_live_answers")
        .insert({
          session_id: a.sessionId,
          item_id: a.itemId,
          user_id: a.userId,
          selected: a.selected,
          response_ms: a.responseMs,
          is_correct: a.isCorrect,
          points: a.points,
          answered_at: iso(a.answeredAt),
        });
      if (isUniqueViolation(res.error)) return false;
      if (res.error) throw new Error(res.error.message);
      return true;
    },

    async getFeedback(eventId, userId) {
      const r = must(
        await db()
          .from("rh_event_feedback")
          .select("*")
          .eq("event_id", eventId)
          .eq("user_id", userId)
          .maybeSingle(),
      ) as FeedbackRow | null;
      return r ? toFeedback(r) : undefined;
    },
    async listFeedback(eventId) {
      const rows = must(
        await db().from("rh_event_feedback").select("*").eq("event_id", eventId),
      ) as FeedbackRow[];
      return rows.map(toFeedback);
    },
    async insertFeedback(f) {
      const res = await db()
        .from("rh_event_feedback")
        .insert({
          event_id: f.eventId,
          user_id: f.userId,
          overall: f.overall,
          stations: f.stations,
          live: f.live,
          recommend: f.recommend,
          comment: f.comment ?? null,
          submitted_at: f.submittedAt,
        });
      if (isUniqueViolation(res.error)) return false;
      if (res.error) throw new Error(res.error.message);
      return true;
    },

    async upsertStationRound(r) {
      must(
        await db()
          .from("rh_rounds")
          .upsert({
            id: r.id,
            kind: r.kind,
            event_id: r.eventId ?? null,
            title: r.title,
            opens_at: r.opensAt,
            closes_at: r.closesAt,
          }),
      );
      const current = (
        must(
          await db()
            .from("rh_round_questions")
            .select("position, question_id")
            .eq("round_id", r.id)
            .order("position"),
        ) as { question_id: string }[]
      ).map((x) => x.question_id);
      if (current.join("|") === r.questionIds.join("|")) return;
      // Con intentos empezados no se cambian las preguntas (orden fijo para todos).
      const started = must(
        await db().from("rh_attempts").select("id").eq("round_id", r.id).limit(1),
      ) as unknown[];
      if (started.length > 0) return;
      must(await db().from("rh_round_questions").delete().eq("round_id", r.id));
      if (r.questionIds.length > 0)
        must(
          await db()
            .from("rh_round_questions")
            .insert(
              r.questionIds.map((q, i) => ({ round_id: r.id, position: i + 1, question_id: q })),
            ),
        );
    },
    async listStationAttempts(eventId) {
      const rounds = must(await db().from("rh_rounds").select("id").eq("event_id", eventId)) as {
        id: string;
      }[];
      if (rounds.length === 0) return [];
      const rows = must(
        await db()
          .from("rh_attempts")
          .select(ATTEMPT_COLS)
          .in(
            "round_id",
            rounds.map((r) => r.id),
          ),
      ) as never[];
      return rows.map(rowToAttempt);
    },
    async getQuestion(id) {
      const r = must(
        await db()
          .from("rh_questions")
          .select("*, rh_question_options(*)")
          .eq("id", id)
          .maybeSingle(),
      ) as never | null;
      return r ? rowToQuestion(r) : undefined;
    },
    async listQuestions({ subspecialty }) {
      let q = db()
        .from("rh_questions")
        .select("*, rh_question_options(*)")
        .eq("is_boss_step", false)
        .neq("status", "archived")
        .limit(300);
      if (subspecialty) q = q.eq("subspecialty", subspecialty);
      return (must(await q) as never[]).map(rowToQuestion) as Question[];
    },

    async audit(actorId, action, details) {
      must(await db().from("rh_audit_log").insert({ actor_id: actorId, action, details }));
    },
  };
}
