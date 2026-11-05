import { describe, expect, it } from "vitest";
import {
  createGameCore,
  eyeStationOfRound,
  eyeStationPracticeId,
  type PlayerContext,
} from "./game-core";
import { createMemoryRepo } from "./repo-memory";
import { DEMO_QUESTIONS } from "./seed-questions";
import { HUNT_QUESTIONS, HUNT_STATIONS } from "./seed-hunt-matrix";
import { demoService } from "./demo-service";
import type { Round } from "./types";

const ALL = [...DEMO_QUESTIONS, ...HUNT_QUESTIONS];
const me: PlayerContext = { userId: "u1", careerStage: "attending", verification: "verified" };
const correct = (id: string) => ALL.find((q) => q.id === id)!.options.find((o) => o.isCorrect)!.id;
const wrong = (id: string) => ALL.find((q) => q.id === id)!.options.find((o) => !o.isCorrect)!.id;

function practiceRound(id: string, qids: string[]): Round {
  return {
    id,
    kind: "practice",
    title: "Práctica",
    opensAt: "2026-01-01T00:00:00Z",
    closesAt: "2030-01-01T00:00:00Z",
    questionIds: qids,
  };
}

async function play(
  core: ReturnType<typeof createGameCore>,
  roundId: string,
  pick: (id: string, i: number) => string,
) {
  const att = await core.start(me, roundId);
  for (let i = 0; ; i++) {
    const p = await core.nextQuestion(me, att.id);
    if (!p) break;
    await core.answer(me, att.id, p.question.id, [pick(p.question.id, i)]);
  }
}

describe("Eye Universe: práctica por estación y progreso", () => {
  it("reconoce los ids de práctica de estación", () => {
    const id = eyeStationPracticeId("GLA-02", "u1:123");
    expect(eyeStationOfRound(id)).toBe("GLA-02");
    expect(eyeStationOfRound("practice:glaucoma:u1:123")).toBeUndefined();
    expect(eyeStationOfRound("cs:abc")).toBeUndefined();
  });

  it("al cerrar la práctica guarda el progreso y conserva el mejor resultado", async () => {
    const st = HUNT_STATIONS.find((s) => s.code === "GLA-02")!;
    const qids = st.scienceXpIds;
    const r1 = eyeStationPracticeId(st.code, "1");
    const r2 = eyeStationPracticeId(st.code, "2");
    const r3 = eyeStationPracticeId(st.code, "3");
    const repo = createMemoryRepo({
      questions: ALL,
      rounds: [practiceRound(r1, qids), practiceRound(r2, qids), practiceRound(r3, qids)],
      bossCases: [],
    });
    const core = createGameCore(repo, {
      requireVerifiedForLeagues: true,
      competitionOnlyPlayable: false,
    });
    await play(core, r1, (id, i) => (i === 0 ? correct(id) : wrong(id)));
    let p = await repo.eyeProgress!("u1");
    expect(p).toEqual([
      expect.objectContaining({ station: "GLA-02", bestCorrect: 1, attempts: 1 }),
    ]);
    await play(core, r2, correct);
    await play(core, r3, wrong);
    p = await repo.eyeProgress!("u1");
    expect(p[0]).toMatchObject({ bestCorrect: qids.length, total: qids.length, attempts: 3 });
  });

  it("una práctica normal no cuenta como estación", async () => {
    const q = DEMO_QUESTIONS.slice(0, 2).map((x) => x.id);
    const repo = createMemoryRepo({
      questions: ALL,
      rounds: [practiceRound("practice:cornea:1", q)],
      bossCases: [],
    });
    const core = createGameCore(repo, {
      requireVerifiedForLeagues: true,
      competitionOnlyPlayable: false,
    });
    await play(core, "practice:cornea:1", correct);
    expect(await repo.eyeProgress!("u1")).toEqual([]);
  });

  it("la demo arma la práctica de estación sin exponer las preguntas de competición", async () => {
    const st = HUNT_STATIONS.find((s) => s.code === "OCP-02")!;
    const roundId = await demoService.startStationPractice(st.code);
    expect(eyeStationOfRound(roundId)).toBe("OCP-02");
    const attemptId = await demoService.startRound(roundId);
    const seen: string[] = [];
    for (;;) {
      const p = await demoService.nextQuestion(attemptId);
      if (!p) break;
      seen.push(p.question.id);
      await demoService.answer(attemptId, p.question.id, [correct(p.question.id)]);
    }
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.length).toBeLessThanOrEqual(5);
    for (const id of seen) expect(st.radarIds).not.toContain(id);
    expect(seen).toEqual(expect.arrayContaining(st.scienceXpIds));
    const prog = await demoService.eyeProgress();
    expect(prog.find((x) => x.station === "OCP-02")).toMatchObject({ bestCorrect: seen.length });
  });
});
