// RADAR HUNT — funciones de servidor (modo producción, Supabase). La lógica del juego
// es la de game-core.ts; aquí se autentica, se construye el contexto del jugador y se
// aplican los permisos. El cliente nunca puntúa ni mide tiempos.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CURRENT_SEASON, getLeague, LEAGUES, SUBSPECIALTIES } from "./catalog";
import { createGameCore, eyeStationPracticeId, GameError, type PlayerContext } from "./game-core";
import { HUNT_STATIONS } from "./seed-hunt-matrix";
import { createSupabaseRepo, rhDb, rhMust, rowToQuestion } from "./repo-supabase.server";
import { buildLeagueRounds, isPlayableInCompetition, roundState, shuffle } from "./rounds";
import { computeSignals, normalizeLicense, verificationSchema } from "./verification";
import type { EyeStationProgress, Question, SubspecialtyCode } from "./types";
import type {
  BossView,
  CompetencyView,
  LeagueView,
  ProfileView,
  RoundView,
  VerificationQueueItem,
} from "./views";

const core = () =>
  createGameCore(createSupabaseRepo(), {
    requireVerifiedForLeagues: true,
    competitionOnlyPlayable: true,
  });

async function rolesOf(supabase: {
  rpc: (fn: string) => Promise<{ data: unknown; error: { message: string } | null }>;
}) {
  const { data, error } = await supabase.rpc("get_my_roles");
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ role: string; is_active?: boolean }>)
    .filter((r) => r.is_active !== false)
    .map((r) => r.role);
}

async function requireEditorial(supabase: never) {
  const roles = await rolesOf(supabase);
  if (!roles.some((r) => r === "admin" || r === "medical_editor")) throw new Error("Forbidden");
}

type ProfileRow = {
  user_id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  license_number: string;
  license_college: string | null;
  professional_email: string;
  specialty: string;
  hospital: string;
  career_stage: "resident" | "attending";
  residency_year: number | null;
  primary_subspecialty: SubspecialtyCode | null;
  verification_status: ProfileView["status"];
  verification_signals: ProfileView["signals"];
  submitted_at: string;
  reviewed_at: string | null;
  reviewer_note: string | null;
};

function toProfileView(r: ProfileRow): ProfileView {
  return {
    userId: r.user_id,
    firstName: r.first_name,
    lastName: r.last_name,
    displayName: r.display_name,
    licenseNumber: r.license_number,
    licenseCollege: r.license_college ?? undefined,
    email: r.professional_email,
    specialty: r.specialty,
    hospital: r.hospital,
    careerStage: r.career_stage,
    residencyYear: r.residency_year ?? undefined,
    primarySubspecialty: r.primary_subspecialty ?? undefined,
    status: r.verification_status,
    signals: r.verification_signals,
    submittedAt: r.submitted_at,
    reviewedAt: r.reviewed_at ?? undefined,
    reviewerNote: r.reviewer_note ?? undefined,
  };
}

async function loadProfile(userId: string): Promise<ProfileView | null> {
  const r = rhMust(
    await rhDb().from("rh_profiles").select("*").eq("user_id", userId).maybeSingle(),
  ) as ProfileRow | null;
  return r ? toProfileView(r) : null;
}

async function playerOf(userId: string): Promise<PlayerContext> {
  const p = await loadProfile(userId);
  return { userId, careerStage: p?.careerStage, verification: p?.status ?? "unverified" };
}

function wrap<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((e) => {
    if (e instanceof GameError) throw new Error(e.message);
    throw e;
  });
}

// --------------------------------------------------------------------------- perfil y verificación
export const rhGetMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => loadProfile(context.userId));

export const rhSubmitVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => verificationSchema.parse(d))
  .handler(async ({ context, data }): Promise<ProfileView> => {
    const existing = await loadProfile(context.userId);
    if (existing?.status === "verified") throw new Error("Tu perfil ya está verificado.");
    const accountEmail = (context.claims as { email?: string }).email ?? null;
    const signals = computeSignals(
      { ...data, primarySubspecialty: data.primarySubspecialty as SubspecialtyCode | undefined },
      accountEmail,
    );
    rhMust(
      await rhDb()
        .from("rh_profiles")
        .upsert(
          {
            user_id: context.userId,
            first_name: data.firstName,
            last_name: data.lastName,
            license_number: normalizeLicense(data.licenseNumber),
            license_college: data.licenseCollege || null,
            professional_email: data.email,
            specialty: data.specialty,
            hospital: data.hospital,
            career_stage: data.careerStage,
            residency_year: data.careerStage === "resident" ? (data.residencyYear ?? null) : null,
            primary_subspecialty: data.primarySubspecialty || null,
            verification_status: "pending",
            verification_signals: signals,
            submitted_at: new Date().toISOString(),
            reviewed_at: null,
            reviewed_by: null,
            reviewer_note: null,
          },
          { onConflict: "user_id" },
        ),
    );
    rhMust(
      await rhDb()
        .from("rh_verification_events")
        .insert({
          user_id: context.userId,
          action: existing ? "resubmitted" : "submitted",
          actor_id: context.userId,
        }),
    );
    return (await loadProfile(context.userId))!;
  });

export const rhListVerifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ status: z.enum(["pending", "verified", "rejected", "all"]).default("pending") })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }): Promise<VerificationQueueItem[]> => {
    await requireEditorial(context.supabase as never);
    let q = rhDb()
      .from("rh_profiles")
      .select("*")
      .order("submitted_at", { ascending: true })
      .limit(500);
    if (data.status !== "all") q = q.eq("verification_status", data.status);
    const rows = rhMust(await q) as ProfileRow[];
    const licenses = rows.map((r) => r.license_number);
    const dupRows = licenses.length
      ? (rhMust(
          await rhDb()
            .from("rh_profiles")
            .select("user_id, license_number")
            .in("license_number", licenses),
        ) as { user_id: string; license_number: string }[])
      : [];
    return rows.map((r) => ({
      ...toProfileView(r),
      duplicateLicense: dupRows.some(
        (d) => d.license_number === r.license_number && d.user_id !== r.user_id,
      ),
    }));
  });

export const rhReviewVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        decision: z.enum(["approve", "reject"]),
        note: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<ProfileView> => {
    await requireEditorial(context.supabase as never);
    const status = data.decision === "approve" ? "verified" : "rejected";
    rhMust(
      await rhDb()
        .from("rh_profiles")
        .update({
          verification_status: status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: context.userId,
          reviewer_note: data.note ?? null,
        })
        .eq("user_id", data.userId),
    );
    if (data.decision === "approve") {
      rhMust(
        await rhDb()
          .from("or_ai_user_roles")
          .upsert(
            { user_id: data.userId, role: "verified_doctor", is_active: true },
            { onConflict: "user_id,role" },
          ),
      );
    }
    rhMust(
      await rhDb()
        .from("rh_verification_events")
        .insert({
          user_id: data.userId,
          action: data.decision === "approve" ? "approved" : "rejected",
          actor_id: context.userId,
          note: data.note ?? null,
        }),
    );
    return (await loadProfile(data.userId))!;
  });

// --------------------------------------------------------------------------- ligas y rondas
export const rhGetLeagueView = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ leagueId: z.string() }).parse(d))
  .handler(
    async ({ context, data }): Promise<LeagueView> =>
      wrap(async () => {
        const league = getLeague(data.leagueId);
        if (!league) throw new Error("Liga no encontrada");
        const player = await playerOf(context.userId);
        const rounds = rhMust(
          await rhDb()
            .from("rh_rounds")
            .select("id, number, title, opens_at, closes_at, rh_round_questions(question_id)")
            .eq("league_id", league.id)
            .order("number"),
        ) as {
          id: string;
          number: number;
          title: string;
          opens_at: string;
          closes_at: string;
          rh_round_questions: { question_id: string }[];
        }[];
        const ids = rounds.map((r) => r.id);
        const mine = ids.length
          ? (rhMust(
              await rhDb()
                .from("rh_attempts")
                .select(
                  "id, round_id, submitted_at, total_score, correct_count, rh_answers(question_id)",
                )
                .eq("user_id", context.userId)
                .in("round_id", ids),
            ) as {
              id: string;
              round_id: string;
              submitted_at: string | null;
              total_score: number;
              correct_count: number;
              rh_answers: unknown[];
            }[])
          : [];
        const roundViews: RoundView[] = rounds.map((r) => {
          const a = mine.find((m) => m.round_id === r.id);
          return {
            id: r.id,
            number: r.number,
            title: r.title,
            opensAt: r.opens_at,
            closesAt: r.closes_at,
            state: roundState({
              id: r.id,
              kind: "league_round",
              title: r.title,
              opensAt: r.opens_at,
              closesAt: r.closes_at,
              questionIds: [],
            }),
            questionCount: r.rh_round_questions.length,
            myAttempt: a
              ? {
                  id: a.id,
                  submitted: !!a.submitted_at,
                  score: Number(a.total_score),
                  correct: a.correct_count,
                  answered: a.rh_answers.length,
                }
              : undefined,
          };
        });
        return {
          league,
          rounds: roundViews,
          leaderboard: await core().leaderboard(league.id),
          isMyLeague: player.careerStage === league.careerLevel,
        };
      }),
  );

export const rhStartRound = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ roundId: z.string() }).parse(d))
  .handler(async ({ context, data }) =>
    wrap(async () => (await core().start(await playerOf(context.userId), data.roundId)).id),
  );

export const rhNextQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ attemptId: z.string() }).parse(d))
  .handler(async ({ context, data }) =>
    wrap(async () => core().nextQuestion(await playerOf(context.userId), data.attemptId)),
  );

export const rhAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        attemptId: z.string(),
        questionId: z.string(),
        selected: z.array(z.string()).max(10),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) =>
    wrap(async () =>
      core().answer(await playerOf(context.userId), data.attemptId, data.questionId, data.selected),
    ),
  );

export const rhSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ attemptId: z.string() }).parse(d))
  .handler(async ({ context, data }) =>
    wrap(async () => core().summary(await playerOf(context.userId), data.attemptId)),
  );

// --------------------------------------------------------------------------- BOSS, práctica, competencias
export const rhListBoss = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BossView[]> => {
    const cases = rhMust(
      await rhDb()
        .from("rh_boss_cases")
        .select(
          "id, title, subspecialty, career_level, intro, status, validation_level, rh_boss_steps(step_no)",
        )
        .eq("status", "approved"),
    ) as {
      id: string;
      title: string;
      subspecialty: SubspecialtyCode;
      career_level: "resident" | "attending" | "both";
      intro: string;
      rh_boss_steps: unknown[];
    }[];
    const out: BossView[] = [];
    for (const c of cases) {
      const roundId = `boss:${c.id}`;
      await rhDb().from("rh_rounds").upsert(
        {
          id: roundId,
          kind: "boss_challenge",
          boss_case_id: c.id,
          title: c.title,
          opens_at: CURRENT_SEASON.startsAt,
          closes_at: CURRENT_SEASON.endsAt,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
      const a = rhMust(
        await rhDb()
          .from("rh_attempts")
          .select("id, submitted_at, total_score, correct_count")
          .eq("round_id", roundId)
          .eq("user_id", context.userId)
          .maybeSingle(),
      ) as {
        id: string;
        submitted_at: string | null;
        total_score: number;
        correct_count: number;
      } | null;
      out.push({
        bossCase: {
          id: c.id,
          title: c.title,
          subspecialty: c.subspecialty,
          careerLevel: c.career_level,
          intro: c.intro,
          steps: c.rh_boss_steps.length,
        },
        roundId,
        myAttempt: a
          ? {
              id: a.id,
              submitted: !!a.submitted_at,
              score: Number(a.total_score),
              correct: a.correct_count,
            }
          : undefined,
      });
    }
    return out;
  });

export const rhStartPractice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ subspecialty: z.enum(SUBSPECIALTIES as [SubspecialtyCode, ...SubspecialtyCode[]]) })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const rows = rhMust(
      await rhDb()
        .from("rh_questions")
        .select("*, rh_question_options(*)")
        .eq("subspecialty", data.subspecialty)
        .eq("status", "approved")
        .eq("is_boss_step", false)
        .limit(200),
    ) as never[];
    const pool = rows.map(rowToQuestion).filter(isPlayableInCompetition);
    if (pool.length === 0)
      throw new Error("Aún no hay preguntas validadas para practicar en esta subespecialidad.");
    const now = Date.now();
    const id = `practice:${data.subspecialty}:${context.userId}:${now}`;
    const picked = shuffle(pool, id).slice(0, 5);
    rhMust(
      await rhDb()
        .from("rh_rounds")
        .insert({
          id,
          kind: "practice",
          title: "Práctica libre",
          opens_at: new Date(now).toISOString(),
          closes_at: new Date(now + 24 * 3600_000).toISOString(),
        }),
    );
    rhMust(
      await rhDb()
        .from("rh_round_questions")
        .insert(picked.map((q, i) => ({ round_id: id, position: i + 1, question_id: q.id }))),
    );
    return id;
  });

// Eye Universe: práctica de una estación de los Hunts (solo su Science XP validado + práctica
// validada de la subespecialidad hasta 5). Las preguntas RADARS de competición no se exponen.
export const rhStartStationPractice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ station: z.string().regex(/^[A-Z]{3}-\d{2}$/) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const st = HUNT_STATIONS.find((x) => x.code === data.station);
    if (!st) throw new Error("Estación desconocida.");
    const load = async (q: { ids?: string[]; sub?: SubspecialtyCode }) => {
      let query = rhDb()
        .from("rh_questions")
        .select("*, rh_question_options(*)")
        .eq("status", "approved")
        .eq("is_boss_step", false);
      if (q.ids) query = query.in("id", q.ids);
      if (q.sub) query = query.eq("subspecialty", q.sub);
      const rows = rhMust(await query.limit(200)) as never[];
      return rows.map(rowToQuestion).filter(isPlayableInCompetition);
    };
    const own = await load({ ids: st.scienceXpIds });
    const now = Date.now();
    const id = eyeStationPracticeId(st.code, `${context.userId}:${now}`);
    const fill = shuffle(
      (await load({ sub: st.subspecialty })).filter(
        (q) => !st.radarIds.includes(q.id) && !st.scienceXpIds.includes(q.id),
      ),
      id,
    );
    const picked = [...own, ...fill].slice(0, 5);
    if (picked.length === 0)
      throw new Error(
        "Las preguntas de esta estación están pendientes de validación por el comité médico.",
      );
    rhMust(
      await rhDb()
        .from("rh_rounds")
        .insert({
          id,
          kind: "practice",
          title: `Práctica · ${st.code} ${st.title}`,
          opens_at: new Date(now).toISOString(),
          closes_at: new Date(now + 24 * 3600_000).toISOString(),
        }),
    );
    rhMust(
      await rhDb()
        .from("rh_round_questions")
        .insert(picked.map((q, i) => ({ round_id: id, position: i + 1, question_id: q.id }))),
    );
    return id;
  });

export const rhEyeProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EyeStationProgress[]> => {
    const repo = createSupabaseRepo();
    return (await repo.eyeProgress?.(context.userId)) ?? [];
  });

export const rhMyCompetency = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CompetencyView[]> => {
    const rows = rhMust(
      await rhDb()
        .from("rh_competency")
        .select("subspecialty, rating, items, correct")
        .eq("user_id", context.userId),
    ) as CompetencyView[];
    return rows.map((r) => ({ ...r, rating: Number(r.rating) }));
  });

export const rhFlagQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ questionId: z.string(), reason: z.string().trim().min(5).max(2000) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    rhMust(
      await rhDb()
        .from("rh_question_flags")
        .upsert(
          { question_id: data.questionId, user_id: context.userId, reason: data.reason },
          { onConflict: "question_id,user_id" },
        ),
    );
    return true;
  });

// --------------------------------------------------------------------------- publicación de rondas (editorial)
export const rhPublishLeagueRounds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ leagueId: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    await requireEditorial(context.supabase as never);
    const leagues = data.leagueId ? LEAGUES.filter((l) => l.id === data.leagueId) : LEAGUES;
    let published = 0;
    for (const league of leagues) {
      const rows = rhMust(
        await rhDb()
          .from("rh_questions")
          .select("*, rh_question_options(*)")
          .eq("subspecialty", league.subspecialty)
          .eq("status", "approved")
          .eq("is_boss_step", false),
      ) as never[];
      const bank: Question[] = rows.map(rowToQuestion).filter(isPlayableInCompetition);
      const existing = rhMust(
        await rhDb().from("rh_rounds").select("id").eq("league_id", league.id),
      ) as { id: string }[];
      const have = new Set(existing.map((r) => r.id));
      for (const r of buildLeagueRounds(league, bank)) {
        if (have.has(r.id) || r.questionIds.length === 0) continue; // las rondas publicadas quedan congeladas
        rhMust(
          await rhDb().from("rh_rounds").insert({
            id: r.id,
            kind: "league_round",
            league_id: league.id,
            number: r.number,
            title: r.title,
            opens_at: r.opensAt,
            closes_at: r.closesAt,
            published_by: context.userId,
          }),
        );
        rhMust(
          await rhDb()
            .from("rh_round_questions")
            .insert(
              r.questionIds.map((qid, i) => ({
                round_id: r.id,
                position: i + 1,
                question_id: qid,
              })),
            ),
        );
        published++;
      }
    }
    return { published };
  });
