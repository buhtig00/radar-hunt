import { beforeEach, describe, expect, it } from "vitest";
import { demoService, DEMO_USER_ID } from "./demo-service";
import { leagueId } from "./catalog";
import { DEMO_QUESTIONS } from "./seed-questions";

const correctOf = (qid: string) =>
  DEMO_QUESTIONS.find((q) => q.id === qid)!.options.find((o) => o.isCorrect)!.id;
const form = {
  firstName: "Lucía",
  lastName: "García Pérez",
  licenseNumber: "282812345",
  email: "lgarcia@hospital-demo.es",
  specialty: "Oftalmología",
  hospital: "Hospital Demo",
  careerStage: "attending",
};

describe("servicio demo: verificar → aprobar → jugar → clasificación", () => {
  beforeEach(() => demoService.reset());

  it("flujo completo de un adjunto", async () => {
    expect(await demoService.getMyProfile()).toBeNull();
    const p = await demoService.submitVerification(form);
    expect(p.status).toBe("pending");
    expect(p.signals.institutionalEmail).toBe(true);

    const lid = leagueId("cornea", "attending");
    const view = await demoService.getLeagueView(lid);
    const r1 = view.rounds[0];
    expect(r1.state).toBe("open");
    await expect(demoService.startRound(r1.id)).rejects.toThrow("verificado");

    const queue = await demoService.listVerifications("pending");
    expect(queue.map((q) => q.userId)).toContain(DEMO_USER_ID);
    await demoService.reviewVerification(
      DEMO_USER_ID,
      "approve",
      "Colegiado comprobado en el registro",
    );
    expect((await demoService.getMyProfile())!.status).toBe("verified");

    const attemptId = await demoService.startRound(r1.id);
    for (;;) {
      const q = await demoService.nextQuestion(attemptId);
      if (!q) break;
      await demoService.answer(attemptId, q.question.id, [correctOf(q.question.id)]);
    }
    const lb = (await demoService.getLeagueView(lid)).leaderboard;
    expect(
      lb.some((row) => row.userId === DEMO_USER_ID && row.displayName === "Lucía García Pérez"),
    ).toBe(true);
    expect(lb.length).toBe(13); // 12 participantes demo + tú
    expect((await demoService.myCompetency()).find((c) => c.subspecialty === "cornea")!.items).toBe(
      r1.questionCount,
    );
  });

  it("no deja jugar en la liga de residentes a un adjunto", async () => {
    await demoService.submitVerification(form);
    await demoService.reviewVerification(DEMO_USER_ID, "approve");
    const view = await demoService.getLeagueView(leagueId("cornea", "resident"));
    expect(view.isMyLeague).toBe(false);
    await expect(demoService.startRound(view.rounds[0].id)).rejects.toThrow("residentes");
  });

  it("detecta un colegiado duplicado ya verificado", async () => {
    await demoService.submitVerification({ ...form, licenseNumber: "462212345" });
    await demoService.reviewVerification("demo-applicant-1", "approve");
    await expect(demoService.reviewVerification(DEMO_USER_ID, "approve")).rejects.toThrow(
      "otra cuenta",
    );
    const q = await demoService.listVerifications("all");
    expect(q.find((x) => x.userId === DEMO_USER_ID)!.duplicateLicense).toBe(true);
  });

  it("práctica libre y BOSS sin verificación", async () => {
    const pid = await demoService.startPractice("glaucoma");
    const att = await demoService.startRound(pid);
    expect((await demoService.nextQuestion(att))!.question.unvalidated).toBe(true);
    const boss = await demoService.listBoss();
    expect(boss).toHaveLength(3);
    const b = await demoService.startRound(boss[0].roundId);
    expect((await demoService.nextQuestion(b))!.reveal).toBeTruthy();
  });
});
