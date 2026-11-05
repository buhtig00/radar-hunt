import { describe, expect, it } from "vitest";
import { createGameCore, GameError, type PlayerContext } from "./game-core";
import { createMemoryRepo } from "./repo-memory";
import { CURRENT_SEASON, getLeague, leagueId } from "./catalog";
import { buildLeagueRounds } from "./rounds";
import { DEMO_BOSS_CASES, DEMO_BOSS_QUESTIONS, DEMO_QUESTIONS } from "./seed-questions";
import type { Round } from "./types";

const ALL = [...DEMO_QUESTIONS, ...DEMO_BOSS_QUESTIONS];
const league = getLeague(leagueId("cornea", "attending"))!;
const rounds = buildLeagueRounds(league, DEMO_QUESTIONS);
const bossRound: Round = {
  id: "boss:" + DEMO_BOSS_CASES[0].id,
  kind: "boss_challenge",
  bossCaseId: DEMO_BOSS_CASES[0].id,
  title: "BOSS",
  opensAt: CURRENT_SEASON.startsAt,
  closesAt: CURRENT_SEASON.endsAt,
  questionIds: DEMO_BOSS_CASES[0].steps.map((s) => s.questionId),
};

function setup(t0 = new Date(CURRENT_SEASON.startsAt).getTime() + 3600_000) {
  let now = t0;
  const repo = createMemoryRepo({
    questions: ALL,
    rounds: [...rounds, bossRound],
    bossCases: DEMO_BOSS_CASES,
    clock: () => now,
  });
  const core = createGameCore(repo, {
    requireVerifiedForLeagues: true,
    competitionOnlyPlayable: false,
  });
  return { core, repo, advance: (ms: number) => (now += ms) };
}
const ana: PlayerContext = { userId: "ana", careerStage: "attending", verification: "verified" };
const correctOf = (qid: string) =>
  ALL.find((q) => q.id === qid)!.options.find((o) => o.isCorrect)!.id;

describe("núcleo del juego", () => {
  it("juega una ronda completa con tiempos del servidor", async () => {
    const { core, advance } = setup();
    const att = await core.start(ana, rounds[0].id);
    let total = 0;
    for (;;) {
      const p = await core.nextQuestion(ana, att.id);
      if (!p) break;
      expect(JSON.stringify(p.question)).not.toContain("isCorrect");
      advance(5_000);
      const fb = await core.answer(ana, att.id, p.question.id, [correctOf(p.question.id)]);
      expect(fb.record.isCorrect).toBe(true);
      expect(fb.record.responseMs).toBe(5_000);
      expect(fb.references.length).toBeGreaterThan(0);
      total += fb.record.points;
    }
    const s = await core.summary(ana, att.id);
    expect(s.attempt.submittedAt).toBeDefined();
    expect(s.attempt.correctCount).toBe(rounds[0].questionIds.length);
    expect(s.attempt.totalScore).toBeCloseTo(total, 1);
    const lb = await core.leaderboard(league.id);
    expect(lb[0].userId).toBe("ana");
  });

  it("pedir la pregunta otra vez no reinicia el reloj", async () => {
    const { core, advance } = setup();
    const att = await core.start(ana, rounds[0].id);
    const p = (await core.nextQuestion(ana, att.id))!;
    advance(10_000);
    await core.nextQuestion(ana, att.id);
    advance(2_000);
    const fb = await core.answer(ana, att.id, p.question.id, [correctOf(p.question.id)]);
    expect(fb.record.responseMs).toBe(12_000);
  });

  it("rechaza respuestas fuera de orden, sin entrega o de otro usuario", async () => {
    const { core } = setup();
    const att = await core.start(ana, rounds[0].id);
    await expect(core.answer(ana, att.id, rounds[0].questionIds[0], ["x"])).rejects.toThrow(
      GameError,
    );
    await core.nextQuestion(ana, att.id);
    await expect(core.answer(ana, att.id, rounds[0].questionIds[1], ["x"])).rejects.toThrow(
      "fuera de orden",
    );
    await expect(core.nextQuestion({ ...ana, userId: "intruso" }, att.id)).rejects.toThrow(
      "Intento no encontrado",
    );
  });

  it("un intento por ronda: volver a empezar reanuda el mismo intento", async () => {
    const { core } = setup();
    const a = await core.start(ana, rounds[0].id);
    const b = await core.start(ana, rounds[0].id);
    expect(b.id).toBe(a.id);
  });

  it("exige verificación, liga correcta y ronda abierta", async () => {
    const { core } = setup();
    await expect(core.start({ ...ana, verification: "pending" }, rounds[0].id)).rejects.toThrow(
      "verificado",
    );
    await expect(core.start({ ...ana, careerStage: "resident" }, rounds[0].id)).rejects.toThrow(
      "adjuntos",
    );
    await expect(core.start(ana, rounds[5].id)).rejects.toThrow(
      /no está abierta|pendiente de publicación/,
    );
  });

  it("BOSS: revela información por pasos y aplica el bonus de caso perfecto", async () => {
    const { core, advance } = setup();
    const resident: PlayerContext = {
      userId: "res",
      careerStage: "resident",
      verification: "pending",
    };
    const att = await core.start(resident, bossRound.id);
    const reveals: string[] = [];
    let sumPoints = 0;
    for (;;) {
      const p = await core.nextQuestion(resident, att.id);
      if (!p) break;
      reveals.push(p.reveal ?? "");
      advance(20_000);
      sumPoints += (await core.answer(resident, att.id, p.question.id, [correctOf(p.question.id)]))
        .record.points;
    }
    expect(reveals).toEqual(DEMO_BOSS_CASES[0].steps.map((s) => s.reveal));
    const s = await core.summary(resident, att.id);
    expect(s.bossPerfect).toBe(true);
    expect(s.attempt.totalScore).toBeCloseTo(sumPoints * 1.2, 1);
  });
});
