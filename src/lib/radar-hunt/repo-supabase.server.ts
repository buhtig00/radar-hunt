// RADAR HUNT — repositorio Supabase (solo servidor, service_role). Toda la lógica de
// juego vive en game-core.ts; aquí solo se leen/escriben tablas rh_*.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
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

// Las tablas rh_* aún no están en los tipos generados de Supabase.
// Las tablas rh_* aún no están en los tipos generados (types.ts) hasta aplicar la migración y
// regenerarlos con `supabase gen types`; mientras tanto el cliente se tipa de forma laxa.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabaseAdmin as unknown as { from: (t: string) => any };

function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

type QRow = {
  id: string;
  type: Question["type"];
  subspecialty: SubspecialtyCode;
  career_level: Question["careerLevel"];
  difficulty: Question["difficulty"];
  cognitive_level: Question["cognitiveLevel"];
  structure: string | null;
  stem: string;
  explanation: string;
  references: Question["references"];
  status: Question["status"];
  validation_level: Question["validationLevel"];
  ai_assisted: boolean;
  rh_question_options: { id: string; position: number; text: string; is_correct: boolean }[];
};

export function rowToQuestion(r: QRow): Question {
  return {
    id: r.id,
    type: r.type,
    subspecialty: r.subspecialty,
    careerLevel: r.career_level,
    difficulty: r.difficulty,
    cognitiveLevel: r.cognitive_level,
    structure: r.structure ?? undefined,
    stem: r.stem,
    explanation: r.explanation,
    references: r.references ?? [],
    status: r.status,
    validationLevel: r.validation_level,
    aiAssisted: r.ai_assisted,
    options: [...(r.rh_question_options ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((o) => ({ id: o.id, text: o.text, isCorrect: o.is_correct })),
  };
}

type ARow = {
  id: string;
  round_id: string;
  user_id: string;
  started_at: string;
  submitted_at: string | null;
  total_score: number;
  correct_count: number;
  total_ms: number;
  rh_answers?: {
    question_id: string;
    selected: string[];
    is_correct: boolean;
    partial_credit: number;
    response_ms: number;
    points: number;
    answered_at: string;
  }[];
};

export function rowToAttempt(r: ARow): Attempt {
  return {
    id: r.id,
    roundId: r.round_id,
    userId: r.user_id,
    startedAt: r.started_at,
    submittedAt: r.submitted_at ?? undefined,
    totalScore: Number(r.total_score),
    correctCount: r.correct_count,
    totalMs: Number(r.total_ms),
    answers: [...(r.rh_answers ?? [])]
      .sort((a, b) => a.answered_at.localeCompare(b.answered_at))
      .map((x) => ({
        questionId: x.question_id,
        selected: x.selected,
        isCorrect: x.is_correct,
        partialCredit: Number(x.partial_credit),
        responseMs: x.response_ms,
        points: Number(x.points),
      })),
  };
}

export const ATTEMPT_COLS =
  "id, round_id, user_id, started_at, submitted_at, total_score, correct_count, total_ms, rh_answers(question_id, selected, is_correct, partial_credit, response_ms, points, answered_at)";

export function createSupabaseRepo(): GameRepo {
  return {
    now: () => Date.now(),

    async hasRoundAccess(round, userId) {
      if (round.kind !== "congress_station") return false;
      const v = must(
        await db()
          .from("rh_station_visits")
          .select("station_id")
          .eq("station_id", round.id.replace(/^cs:/, ""))
          .eq("user_id", userId)
          .maybeSingle(),
      );
      return !!v;
    },

    async recordEyeStation(userId, station, correct, total) {
      const prev = must(
        await db()
          .from("rh_eye_progress")
          .select("best_correct, total, attempts")
          .eq("user_id", userId)
          .eq("station_code", station)
          .maybeSingle(),
      ) as { best_correct: number; total: number; attempts: number } | null;
      const keepPrev = !!prev && prev.best_correct > correct;
      must(
        await db()
          .from("rh_eye_progress")
          .upsert(
            {
              user_id: userId,
              station_code: station,
              best_correct: keepPrev ? prev!.best_correct : correct,
              total: keepPrev ? prev!.total : total,
              attempts: (prev?.attempts ?? 0) + 1,
              completed_at: new Date().toISOString(),
            },
            { onConflict: "user_id,station_code" },
          ),
      );
    },

    async eyeProgress(userId): Promise<EyeStationProgress[]> {
      const rows = must(
        await db()
          .from("rh_eye_progress")
          .select("station_code, best_correct, total, attempts, completed_at")
          .eq("user_id", userId),
      ) as {
        station_code: string;
        best_correct: number;
        total: number;
        attempts: number;
        completed_at: string;
      }[];
      return rows.map((r) => ({
        station: r.station_code,
        bestCorrect: r.best_correct,
        total: r.total,
        attempts: r.attempts,
        completedAt: r.completed_at,
      }));
    },

    async getQuestion(id) {
      const row = must(
        await db()
          .from("rh_questions")
          .select("*, rh_question_options(*)")
          .eq("id", id)
          .maybeSingle(),
      ) as QRow | null;
      return row ? rowToQuestion(row) : undefined;
    },

    async getRound(id): Promise<Round | undefined> {
      const r = must(await db().from("rh_rounds").select("*").eq("id", id).maybeSingle()) as {
        id: string;
        kind: Round["kind"];
        league_id: string | null;
        boss_case_id: string | null;
        event_id?: string | null;
        number: number | null;
        title: string;
        opens_at: string;
        closes_at: string;
      } | null;
      if (!r) return undefined;
      let questionIds: string[];
      if (r.kind === "boss_challenge" && r.boss_case_id) {
        const steps = must(
          await db()
            .from("rh_boss_steps")
            .select("step_no, question_id")
            .eq("case_id", r.boss_case_id)
            .order("step_no"),
        ) as { question_id: string }[];
        questionIds = steps.map((s) => s.question_id);
      } else {
        const qs = must(
          await db()
            .from("rh_round_questions")
            .select("position, question_id")
            .eq("round_id", id)
            .order("position"),
        ) as { question_id: string }[];
        questionIds = qs.map((q) => q.question_id);
      }
      return {
        id: r.id,
        kind: r.kind,
        leagueId: r.league_id ?? undefined,
        bossCaseId: r.boss_case_id ?? undefined,
        eventId: r.event_id ?? undefined,
        number: r.number ?? undefined,
        title: r.title,
        opensAt: r.opens_at,
        closesAt: r.closes_at,
        questionIds,
      };
    },

    async getBossCase(id): Promise<BossCase | undefined> {
      const c = must(
        await db()
          .from("rh_boss_cases")
          .select("*, rh_boss_steps(step_no, reveal, question_id)")
          .eq("id", id)
          .maybeSingle(),
      ) as {
        id: string;
        title: string;
        subspecialty: SubspecialtyCode;
        career_level: BossCase["careerLevel"];
        intro: string;
        status: BossCase["status"];
        validation_level: BossCase["validationLevel"];
        rh_boss_steps: { step_no: number; reveal: string; question_id: string }[];
      } | null;
      if (!c) return undefined;
      return {
        id: c.id,
        title: c.title,
        subspecialty: c.subspecialty,
        careerLevel: c.career_level,
        intro: c.intro,
        status: c.status,
        validationLevel: c.validation_level,
        steps: [...c.rh_boss_steps]
          .sort((a, b) => a.step_no - b.step_no)
          .map((s) => ({ reveal: s.reveal, questionId: s.question_id })),
      };
    },

    async getAttempt(roundId, userId) {
      const r = must(
        await db()
          .from("rh_attempts")
          .select(ATTEMPT_COLS)
          .eq("round_id", roundId)
          .eq("user_id", userId)
          .maybeSingle(),
      ) as ARow | null;
      return r ? rowToAttempt(r) : undefined;
    },

    async getAttemptById(id) {
      const r = must(
        await db().from("rh_attempts").select(ATTEMPT_COLS).eq("id", id).maybeSingle(),
      ) as ARow | null;
      return r ? rowToAttempt(r) : undefined;
    },

    async createAttempt(a) {
      // Idempotente ante doble clic: unique(round_id, user_id)
      const ins = await db()
        .from("rh_attempts")
        .upsert(
          { round_id: a.roundId, user_id: a.userId },
          { onConflict: "round_id,user_id", ignoreDuplicates: true },
        )
        .select(ATTEMPT_COLS)
        .maybeSingle();
      if (ins.error) throw new Error(ins.error.message);
      if (ins.data) return rowToAttempt(ins.data as ARow);
      const again = must(
        await db()
          .from("rh_attempts")
          .select(ATTEMPT_COLS)
          .eq("round_id", a.roundId)
          .eq("user_id", a.userId)
          .single(),
      ) as ARow;
      return rowToAttempt(again);
    },

    async updateAttempt(a) {
      must(
        await db()
          .from("rh_attempts")
          .update({
            total_score: a.totalScore,
            correct_count: a.correctCount,
            total_ms: a.totalMs,
            submitted_at: a.submittedAt ?? null,
          })
          .eq("id", a.id),
      );
    },

    async recordDelivery(attemptId, questionId, at) {
      await db()
        .from("rh_question_deliveries")
        .upsert(
          {
            attempt_id: attemptId,
            question_id: questionId,
            delivered_at: new Date(at).toISOString(),
          },
          { onConflict: "attempt_id,question_id", ignoreDuplicates: true },
        );
      const row = must(
        await db()
          .from("rh_question_deliveries")
          .select("delivered_at")
          .eq("attempt_id", attemptId)
          .eq("question_id", questionId)
          .single(),
      ) as { delivered_at: string };
      return new Date(row.delivered_at).getTime();
    },

    async getDelivery(attemptId, questionId) {
      const row = must(
        await db()
          .from("rh_question_deliveries")
          .select("delivered_at")
          .eq("attempt_id", attemptId)
          .eq("question_id", questionId)
          .maybeSingle(),
      ) as { delivered_at: string } | null;
      return row ? new Date(row.delivered_at).getTime() : undefined;
    },

    async saveAnswer(attemptId, rec: AnswerRecord) {
      must(
        await db().from("rh_answers").insert({
          attempt_id: attemptId,
          question_id: rec.questionId,
          selected: rec.selected,
          is_correct: rec.isCorrect,
          partial_credit: rec.partialCredit,
          response_ms: rec.responseMs,
          points: rec.points,
        }),
      );
    },

    async listLeagueAttempts(leagueId) {
      const rounds = must(await db().from("rh_rounds").select("id").eq("league_id", leagueId)) as {
        id: string;
      }[];
      if (rounds.length === 0) return [];
      const rows = must(
        await db()
          .from("rh_attempts")
          .select(
            "id, round_id, user_id, started_at, submitted_at, total_score, correct_count, total_ms",
          )
          .in(
            "round_id",
            rounds.map((r) => r.id),
          )
          .not("submitted_at", "is", null),
      ) as ARow[];
      return rows.map(rowToAttempt);
    },

    async displayNames(userIds) {
      const out = new Map<string, string>();
      if (userIds.length === 0) return out;
      const rows = must(
        await db()
          .from("rh_profiles")
          .select("user_id, display_name, public_alias, show_in_public_ranking")
          .in("user_id", userIds),
      ) as {
        user_id: string;
        display_name: string;
        public_alias: string | null;
        show_in_public_ranking: boolean;
      }[];
      for (const r of rows)
        out.set(
          r.user_id,
          r.show_in_public_ranking ? r.public_alias || r.display_name : "Participante anónimo",
        );
      return out;
    },

    async getCompetency(userId, sub) {
      const r = must(
        await db()
          .from("rh_competency")
          .select("*")
          .eq("user_id", userId)
          .eq("subspecialty", sub)
          .maybeSingle(),
      ) as {
        subspecialty: SubspecialtyCode;
        rating: number;
        items: number;
        correct: number;
      } | null;
      return r
        ? {
            subspecialty: r.subspecialty,
            rating: Number(r.rating),
            items: r.items,
            correct: r.correct,
          }
        : undefined;
    },

    async saveCompetency(userId, c: Competency) {
      must(
        await db().from("rh_competency").upsert(
          {
            user_id: userId,
            subspecialty: c.subspecialty,
            rating: c.rating,
            items: c.items,
            correct: c.correct,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,subspecialty" },
        ),
      );
    },
  };
}

export { db as rhDb, must as rhMust };
