// RADAR HUNT — funciones de servidor del modo congreso (producción, Supabase).
// Autentican, construyen el contexto (jugador u organización) y delegan en core.ts.
// El reloj, las fases y la puntuación son del servidor; el cliente nunca los decide.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SUBSPECIALTIES } from "../catalog";
import { rhDb, rhMust } from "../repo-supabase.server";
import type { SubspecialtyCode } from "../types";
import { CongressError, createCongressCore, type CongressActor, type CongressPlayer } from "./core";
import { createCongressSupabaseRepo } from "./repo-supabase.server";
import type { CongressEvent, LiveSession, Station } from "./types";
import { proposalSchema } from "../proposal";
import type { ProgressSummary } from "../season";
import type { Competency } from "../competency";

const core = () => createCongressCore(createCongressSupabaseRepo(), { onlyPlayable: true });

async function playerOf(userId: string): Promise<CongressPlayer> {
  const p = rhMust(
    await rhDb()
      .from("rh_profiles")
      .select("display_name, hospital, career_stage")
      .eq("user_id", userId)
      .maybeSingle(),
  ) as {
    display_name: string;
    hospital: string;
    career_stage: CongressPlayer["careerStage"];
  } | null;
  return {
    userId,
    profileName: p?.display_name,
    hospital: p?.hospital,
    careerStage: p?.career_stage ?? undefined,
  };
}

/** Organización: admin o editor médico, o personal del evento (moderador/organizador). */
async function actorOf(userId: string, eventKey?: string): Promise<CongressActor> {
  const roles = rhMust(
    await rhDb().from("or_ai_user_roles").select("role, is_active").eq("user_id", userId),
  ) as { role: string; is_active: boolean }[];
  if (roles.some((r) => r.is_active && (r.role === "admin" || r.role === "medical_editor")))
    return { userId, isStaff: true };
  if (eventKey) {
    const ev = rhMust(
      await rhDb()
        .from("rh_events")
        .select("id")
        .or(
          `id.eq.${eventKey.replace(/[^a-z0-9-]/gi, "")},slug.eq.${eventKey.replace(/[^a-z0-9-]/gi, "")}`,
        )
        .maybeSingle(),
    ) as { id: string } | null;
    if (ev) {
      const staff = rhMust(
        await rhDb()
          .from("rh_event_staff")
          .select("user_id")
          .eq("event_id", ev.id)
          .eq("user_id", userId)
          .maybeSingle(),
      );
      if (staff) return { userId, isStaff: true };
    }
  }
  return { userId, isStaff: false };
}

async function eventOfStation(stationId: string) {
  const r = rhMust(
    await rhDb().from("rh_event_stations").select("event_id").eq("id", stationId).maybeSingle(),
  ) as { event_id: string } | null;
  return r?.event_id;
}
async function eventOfSession(sessionId: string) {
  const r = rhMust(
    await rhDb().from("rh_event_sessions").select("event_id").eq("id", sessionId).maybeSingle(),
  ) as { event_id: string } | null;
  return r?.event_id;
}

function wrap<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((e) => {
    if (e instanceof CongressError) throw new Error(e.message);
    throw e;
  });
}

const slug = z.string().min(3).max(64);
const id = z.string().min(1).max(80);
const subs = SUBSPECIALTIES as [SubspecialtyCode, ...SubspecialtyCode[]];
const sponsorSchema = z.object({ name: z.string().max(60), disclosure: z.string().max(400) });
const floorSchema = z.object({
  id: z.string().max(40),
  name: z.string().max(60),
  order: z.number(),
  imageUrl: z.string().url().max(500).optional(),
  rooms: z
    .array(
      z.object({
        id: z.string().max(40),
        name: z.string().max(60),
        x: z.number(),
        y: z.number(),
        w: z.number(),
        h: z.number(),
      }),
    )
    .max(40),
});
const eventSchema = z.object({
  id,
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{2,60}$/),
  name: z.string().min(3).max(120),
  venue: z.string().max(120),
  city: z.string().max(80),
  timezone: z.string().max(60),
  startsAt: z.string(),
  endsAt: z.string(),
  gameOpensAt: z.string(),
  gameClosesAt: z.string(),
  status: z.enum(["draft", "published", "closed"]),
  floors: z.array(floorSchema).max(10),
  sponsors: z.array(sponsorSchema).max(20),
  recognition: z.string().max(600),
  isDemo: z.boolean().optional(),
});
const stationSchema = z.object({
  id,
  eventId: id,
  label: z.string().max(6),
  title: z.string().min(1).max(80),
  description: z.string().max(280),
  floorId: z.string().max(40),
  x: z.number(),
  y: z.number(),
  subspecialty: z.enum(subs),
  track: z.string().max(30).optional(),
  questionIds: z.array(id).max(5),
  sponsor: sponsorSchema.optional(),
  active: z.boolean(),
});
const sessionSchema = z.object({
  id,
  eventId: id,
  title: z.string().min(1).max(120),
  room: z.string().max(60),
  speaker: z.string().max(80).optional(),
  startsAt: z.string().optional(),
  items: z
    .array(
      z.object({
        id: z.string().max(40),
        kind: z.enum(["quiz", "poll"]),
        questionId: id.optional(),
        prompt: z.string().max(200).optional(),
        options: z
          .array(z.object({ id: z.string().max(10), text: z.string().max(80) }))
          .max(6)
          .optional(),
        timeLimitS: z.number(),
      }),
    )
    .max(30),
});

// ------------------------------------------------------------------ participante
export const rhcListEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) =>
    wrap(async () => core().listEvents(await actorOf(context.userId))),
  );

export const rhcEventView = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug }).parse(d))
  .handler(async ({ context, data }) =>
    wrap(async () =>
      core().eventView(
        data.slug,
        await playerOf(context.userId),
        await actorOf(context.userId, data.slug),
      ),
    ),
  );

export const rhcMyDefaults = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const p = await playerOf(context.userId);
    return { displayName: p.profileName, hospital: p.hospital, careerStage: p.careerStage };
  });

export const rhcJoin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        slug,
        input: z.object({
          consents: z.object({
            participation: z.boolean(),
            publicRanking: z.boolean(),
            communications: z.boolean(),
          }),
          alias: z.string().max(40).optional(),
          hospital: z.string().max(120).optional(),
          displayName: z.string().max(80).optional(),
          careerStage: z.enum(["resident", "attending"]).optional(),
        }),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) =>
    wrap(async () => core().join(data.slug, await playerOf(context.userId), data.input)),
  );

export const rhcScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        token: z.string().max(40).optional(),
        code: z.string().max(20).optional(),
        slug: slug.optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) =>
    wrap(async () => core().scan(await playerOf(context.userId), data)),
  );

export const rhcRanking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug }).parse(d))
  .handler(async ({ context, data }) =>
    wrap(async () => core().ranking(data.slug, { userId: context.userId })),
  );

export const rhcLiveView = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug, sessionId: id.optional() }).parse(d))
  .handler(async ({ context, data }) =>
    wrap(async () => core().liveView(data.slug, { userId: context.userId }, data.sessionId)),
  );

export const rhcAnswerLive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ slug, sessionId: id, itemId: id, selected: z.array(z.string().max(40)).max(10) })
      .parse(d),
  )
  .handler(async ({ context, data }) =>
    wrap(async () =>
      core().answerLive(
        data.slug,
        { userId: context.userId },
        {
          sessionId: data.sessionId,
          itemId: data.itemId,
          selected: data.selected,
        },
      ),
    ),
  );

export const rhcSubmitFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        slug,
        input: z.object({
          overall: z.number(),
          stations: z.number(),
          live: z.number(),
          recommend: z.number(),
          comment: z.string().max(500).optional(),
        }),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) =>
    wrap(async () => core().submitFeedback(data.slug, { userId: context.userId }, data.input)),
  );

export const rhcSala = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug }).parse(d))
  .handler(async ({ data }) => wrap(async () => core().sala(data.slug)));

// ------------------------------------------------------------------ organización
export const rhcAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug }).parse(d))
  .handler(async ({ context, data }) =>
    wrap(async () => core().adminOverview(await actorOf(context.userId, data.slug), data.slug)),
  );

export const rhcSaveEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => eventSchema.parse(d))
  .handler(async ({ context, data }) =>
    wrap(async () =>
      core().saveEvent(await actorOf(context.userId, data.id), data as CongressEvent),
    ),
  );

export const rhcSaveStation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => stationSchema.parse(d))
  .handler(async ({ context, data }) =>
    wrap(async () =>
      core().saveStation(await actorOf(context.userId, data.eventId), data as Station),
    ),
  );

export const rhcDeleteStation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id }).parse(d))
  .handler(async ({ context, data }) =>
    wrap(async () =>
      core().deleteStation(await actorOf(context.userId, await eventOfStation(data.id)), data.id),
    ),
  );

export const rhcRotateToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id }).parse(d))
  .handler(async ({ context, data }) =>
    wrap(async () =>
      core().rotateToken(await actorOf(context.userId, await eventOfStation(data.id)), data.id),
    ),
  );

export const rhcSuggestQuestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ subspecialty: z.enum(subs), seed: z.string().max(80) }).parse(d),
  )
  .handler(async ({ context, data }) =>
    wrap(async () =>
      core().suggestQuestions(await actorOf(context.userId), data.subspecialty, data.seed),
    ),
  );

export const rhcQuestionBank = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ subspecialty: z.enum(subs).optional() }).parse(d))
  .handler(async ({ context, data }) =>
    wrap(async () => core().questionBank(await actorOf(context.userId), data.subspecialty)),
  );

export const rhcSaveSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => sessionSchema.parse(d))
  .handler(async ({ context, data }) =>
    wrap(async () =>
      core().saveSession(await actorOf(context.userId, data.eventId), data as LiveSession),
    ),
  );

export const rhcDeleteSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id }).parse(d))
  .handler(async ({ context, data }) =>
    wrap(async () =>
      core().deleteSession(await actorOf(context.userId, await eventOfSession(data.id)), data.id),
    ),
  );

export const rhcModerate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        sessionId: id,
        action: z.enum(["open", "close", "reveal", "leaderboard", "next", "end", "reset"]),
        itemIndex: z.number().int().min(0).max(29).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) =>
    wrap(async () =>
      core().moderate(
        await actorOf(context.userId, await eventOfSession(data.sessionId)),
        data.sessionId,
        data.action,
        data.itemIndex,
      ),
    ),
  );

export const rhcStationTokens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug }).parse(d))
  .handler(async ({ context, data }) =>
    wrap(async () => core().stationTokens(await actorOf(context.userId, data.slug), data.slug)),
  );

export const rhcExportCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ slug, kind: z.enum(["participants", "ranking", "stations", "live", "feedback"]) })
      .parse(d),
  )
  .handler(async ({ context, data }) =>
    wrap(async () =>
      core().exportCsv(await actorOf(context.userId, data.slug), data.slug, data.kind),
    ),
  );

// ------------------------------------------------------------------ temporada, progreso y propuestas
export const rhcSeason = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => wrap(async () => core().season({ userId: context.userId })));

export const rhcMyProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProgressSummary> => {
    const uid = context.userId;
    const attempts = rhMust(
      await rhDb()
        .from("rh_attempts")
        .select(
          "id, round_id, total_score, correct_count, submitted_at, rh_rounds(kind), rh_answers(is_correct)",
        )
        .eq("user_id", uid)
        .not("submitted_at", "is", null),
    ) as {
      round_id: string;
      total_score: number | string;
      rh_rounds: { kind: string } | null;
      rh_answers: { is_correct: boolean }[];
    }[];
    const live = rhMust(
      await rhDb().from("rh_live_answers").select("points").eq("user_id", uid),
    ) as { points: number | string }[];
    const hunts = rhMust(
      await rhDb().from("rh_event_participants").select("event_id").eq("user_id", uid),
    ) as unknown[];
    const comp = rhMust(await rhDb().from("rh_competency").select("*").eq("user_id", uid)) as {
      subspecialty: Competency["subspecialty"];
      rating: number;
      items: number;
      correct: number;
    }[];
    const kind = (a: (typeof attempts)[number]) => a.rh_rounds?.kind ?? "league_round";
    const boss = attempts.filter((a) => kind(a) === "boss_challenge");
    return {
      rp:
        Math.round(
          (attempts
            .filter((a) => kind(a) !== "practice")
            .reduce((x, a) => x + Number(a.total_score), 0) +
            live.reduce((x, a) => x + Number(a.points), 0)) *
            100,
        ) / 100,
      leagueRounds: attempts.filter((a) => kind(a) === "league_round" || kind(a) === "final")
        .length,
      bossPlayed: boss.length,
      bossPerfect: boss.filter(
        (a) => a.rh_answers.length > 0 && a.rh_answers.every((x) => x.is_correct),
      ).length,
      congressStations: attempts.filter((a) => kind(a) === "congress_station").length,
      huntsJoined: hunts.length,
      liveAnswers: live.length,
      competency: comp.map((c) => ({
        subspecialty: c.subspecialty,
        rating: Number(c.rating),
        items: c.items,
        correct: c.correct,
      })),
    };
  });

/** Formulario público de la página «Industria»: no requiere sesión; trampa anti-bots. */
export const rhcRequestProposal = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => proposalSchema.parse(d))
  .handler(async ({ data }) => {
    if (data.website) return true; // bot: se descarta en silencio
    rhMust(
      await rhDb().from("rh_proposal_requests").insert({
        name: data.name,
        organization: data.organization,
        role: data.role,
        kind: data.kind,
        email: data.email,
        message: data.message,
        consent_at: new Date().toISOString(),
      }),
    );
    return true;
  });
