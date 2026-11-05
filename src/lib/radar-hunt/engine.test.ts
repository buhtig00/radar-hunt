import { describe, expect, it } from "vitest";
import {
  basePoints,
  bossTotal,
  correctnessCredit,
  scoreAnswer,
  speedFactor,
  LATENCY_ALLOWANCE_MS,
} from "./scoring";
import { rankLeague } from "./ranking";
import { emptyCompetency, updateCompetency, weakAreas } from "./competency";
import {
  computeSignals,
  licenseFormatOk,
  normalizeLicense,
  verificationSchema,
} from "./verification";
import { buildLeagueRounds, isPlayableInCompetition, shuffle, toPublicQuestion } from "./rounds";
import { LEAGUES, SUBSPECIALTIES } from "./catalog";
import type { Attempt, Question } from "./types";

const q = (over: Partial<Question> = {}): Question => ({
  id: "q1",
  type: "single_choice",
  subspecialty: "cornea",
  careerLevel: "both",
  difficulty: 3,
  cognitiveLevel: "recall",
  stem: "¿?",
  options: [
    { id: "a", text: "A", isCorrect: true },
    { id: "b", text: "B", isCorrect: false },
    { id: "c", text: "C", isCorrect: false },
  ],
  explanation: "",
  references: [{ citation: "AAO BCSC" }],
  status: "approved",
  validationLevel: "kol_verified",
  aiAssisted: false,
  ...over,
});

describe("puntuación", () => {
  it("puntos base por dificultad", () => {
    expect([1, 2, 3, 4, 5].map(basePoints)).toEqual([100, 125, 150, 175, 200]);
  });
  it("la velocidad suma como máximo un 50 % y nunca resta", () => {
    expect(speedFactor(0, 30, 0.5)).toBeCloseTo(1.5);
    expect(speedFactor(LATENCY_ALLOWANCE_MS, 30, 0.5)).toBeCloseTo(1.5);
    expect(speedFactor(30_000, 30, 0.5)).toBeCloseTo(1.0, 2);
    expect(speedFactor(60_000, 30, 0.5)).toBe(1);
  });
  it("respuesta única correcta e incorrecta", () => {
    const right = scoreAnswer({
      question: q(),
      selected: ["a"],
      responseMs: 15_300,
      timeLimitS: 30,
      lambda: 0.5,
    });
    expect(right.isCorrect).toBe(true);
    expect(right.points).toBeCloseTo(150 * 1.25, 1);
    const wrong = scoreAnswer({
      question: q(),
      selected: ["b"],
      responseMs: 1000,
      timeLimitS: 30,
      lambda: 0.5,
    });
    expect(wrong.points).toBe(0);
  });
  it("respuesta fuera de tiempo = 0", () => {
    const late = scoreAnswer({
      question: q(),
      selected: ["a"],
      responseMs: 31_000,
      timeLimitS: 30,
      lambda: 0.5,
    });
    expect(late.points).toBe(0);
    expect(late.isCorrect).toBe(false);
  });
  it("selección múltiple con crédito parcial y sin marcar todo", () => {
    const multi = q({
      type: "multiple_choice",
      options: [
        { id: "a", text: "A", isCorrect: true },
        { id: "b", text: "B", isCorrect: true },
        { id: "c", text: "C", isCorrect: false },
        { id: "d", text: "D", isCorrect: false },
      ],
    });
    expect(correctnessCredit(multi, ["a", "b"])).toBe(1);
    expect(correctnessCredit(multi, ["a"])).toBe(0.5);
    expect(correctnessCredit(multi, ["a", "c"])).toBe(0);
    expect(correctnessCredit(multi, ["a", "b", "c", "d"])).toBe(0);
    expect(correctnessCredit(multi, ["a", "a", "zzz"])).toBe(0.5);
  });
  it("BOSS: +20 % solo si todos los pasos son correctos", () => {
    const s = (p: number, ok: boolean) => ({
      questionId: "x",
      selected: [],
      isCorrect: ok,
      partialCredit: ok ? 1 : 0,
      responseMs: 0,
      points: p,
    });
    expect(bossTotal([s(100, true), s(150, true)])).toEqual({ total: 300, perfect: true });
    expect(bossTotal([s(100, true), s(0, false)])).toEqual({ total: 100, perfect: false });
  });
});

describe("clasificación", () => {
  const att = (userId: string, round: string, score: number, correct = 1, ms = 1000): Attempt => ({
    id: `${userId}${round}`,
    roundId: round,
    userId,
    startedAt: "",
    submittedAt: "x",
    answers: [],
    totalScore: score,
    correctCount: correct,
    totalMs: ms,
  });
  it("suma las mejores N rondas, desempata por aciertos y nunca por rapidez", () => {
    const rows = rankLeague({
      attempts: [
        att("ana", "r1", 100),
        att("ana", "r2", 10),
        att("ana", "r3", 300),
        att("bea", "r1", 400, 3, 9000),
        att("carlos", "r1", 400, 2, 1000),
        att("dani", "r1", 50),
        { ...att("eva", "r1", 999), submittedAt: undefined },
      ],
      rules: { bestN: 2, finalistsK: 2 },
      displayName: (u) => u,
    });
    // bea gana por aciertos aunque sea la más lenta; ana (300+100, 2 aciertos) y carlos
    // (2 aciertos, más rápido) empatan: la rapidez no desempata.
    expect(rows.map((r) => [r.userId, r.score, r.rank])).toEqual([
      ["bea", 400, 1],
      ["ana", 400, 2],
      ["carlos", 400, 2],
      ["dani", 50, 4],
    ]);
    expect(rows.find((r) => r.userId === "ana")!.roundsPlayed).toBe(3);
    expect(rows.filter((r) => r.isFinalist).map((r) => r.userId)).toEqual(["bea", "ana", "carlos"]);
  });
  it("empates exactos comparten puesto", () => {
    const rows = rankLeague({
      attempts: [att("a", "r", 10), att("b", "r", 10), att("c", "r", 5)],
      rules: { bestN: 5, finalistsK: 1 },
      displayName: (u) => u,
    });
    expect(rows.map((r) => r.rank)).toEqual([1, 1, 3]);
    expect(rows.filter((r) => r.isFinalist)).toHaveLength(2);
  });
});

describe("competencias", () => {
  it("sube con aciertos difíciles y baja con fallos fáciles", () => {
    const up = updateCompetency(emptyCompetency("retina"), 5, 1);
    const down = updateCompetency(emptyCompetency("retina"), 1, 0);
    expect(up.rating).toBeGreaterThan(1000);
    expect(down.rating).toBeLessThan(1000);
    expect(up.rating - 1000).toBeGreaterThan(1000 - down.rating);
  });
  it("áreas de mejora: menor rating con mínimo de respuestas", () => {
    const list = [
      { subspecialty: "retina" as const, rating: 900, items: 10, correct: 3 },
      { subspecialty: "glaucoma" as const, rating: 1100, items: 10, correct: 8 },
      { subspecialty: "cornea" as const, rating: 700, items: 2, correct: 0 },
    ];
    expect(weakAreas(list, 5, 1).map((c) => c.subspecialty)).toEqual(["retina"]);
  });
});

describe("verificación profesional", () => {
  const ok = {
    firstName: "Lucía",
    lastName: "García Pérez",
    licenseNumber: "28 28 12345",
    email: "lgarcia@salud.madrid.org",
    specialty: "Oftalmología",
    hospital: "Hospital Clínico San Carlos",
    careerStage: "attending" as const,
  };
  it("normaliza y valida el número de colegiado", () => {
    expect(normalizeLicense("28 28-12.345")).toBe("282812345");
    expect(licenseFormatOk("282812345")).toBe(true);
    expect(licenseFormatOk("1234")).toBe(false);
    expect(licenseFormatOk("ABC123456")).toBe(false);
  });
  it("esquema: exige todos los campos y el año de residencia a los residentes", () => {
    expect(verificationSchema.safeParse(ok).success).toBe(true);
    expect(verificationSchema.safeParse({ ...ok, hospital: "" }).success).toBe(false);
    expect(verificationSchema.safeParse({ ...ok, careerStage: "resident" }).success).toBe(false);
    expect(
      verificationSchema.safeParse({ ...ok, careerStage: "resident", residencyYear: 3 }).success,
    ).toBe(true);
  });
  it("señales para el revisor", () => {
    expect(computeSignals(ok, "LGARCIA@salud.madrid.org")).toEqual({
      institutionalEmail: true,
      emailMatchesAccount: true,
      licenseFormatOk: true,
      specialtyIsOphthalmology: true,
    });
    const s = computeSignals(
      { ...ok, email: "lucia@gmail.com", specialty: "Medicina de familia" },
      "otra@x.es",
    );
    expect(s.institutionalEmail).toBe(false);
    expect(s.emailMatchesAccount).toBe(false);
    expect(s.specialtyIsOphthalmology).toBe(false);
  });
});

describe("ligas y rondas", () => {
  it("34 ligas: 17 subespecialidades × residentes/adjuntos", () => {
    expect(SUBSPECIALTIES).toHaveLength(17);
    expect(LEAGUES).toHaveLength(34);
    expect(new Set(LEAGUES.map((l) => l.id)).size).toBe(34);
  });
  it("rondas deterministas con preguntas de la liga", () => {
    const bank = Array.from({ length: 12 }, (_, i) => q({ id: `c${i}` }));
    const league = LEAGUES.find(
      (l) => l.subspecialty === "cornea" && l.careerLevel === "resident",
    )!;
    const a = buildLeagueRounds(league, bank);
    const b = buildLeagueRounds(league, bank);
    expect(a).toEqual(b);
    expect(a).toHaveLength(10);
    expect(a.map((r) => r.questionIds.length)).toEqual([5, 5, 2, 0, 0, 0, 0, 0, 0, 0]);
    expect(new Set(a.flatMap((r) => r.questionIds)).size).toBe(12);
    expect(new Date(a[1].opensAt).getTime() - new Date(a[0].opensAt).getTime()).toBe(
      7 * 24 * 3600 * 1000,
    );
  });
  it("vista pública sin respuesta correcta y con orden propio por usuario", () => {
    const pq = toPublicQuestion(q(), "u1", 30);
    expect(JSON.stringify(pq)).not.toContain("isCorrect");
    expect(pq.options.map((o) => o.id).sort()).toEqual(["a", "b", "c"]);
    expect(shuffle([1, 2, 3, 4, 5], "s")).toEqual(shuffle([1, 2, 3, 4, 5], "s"));
  });
  it("regla de competición: aprobada + validada + con referencia", () => {
    expect(isPlayableInCompetition(q())).toBe(true);
    expect(isPlayableInCompetition(q({ validationLevel: "ai_generated" }))).toBe(false);
    expect(isPlayableInCompetition(q({ references: [] }))).toBe(false);
    expect(isPlayableInCompetition(q({ status: "pending_review" }))).toBe(false);
  });
});
