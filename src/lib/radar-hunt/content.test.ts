import { describe, expect, it } from "vitest";
import { ALL_DEMO_QUESTIONS, DEMO_BOSS_CASES, DEMO_QUESTIONS } from "./seed-questions";
import { EYE_CHAPTERS, EYE_HOTSPOTS, EYE_STATIONS, EYE_STRUCTURES } from "./eye-universe";
import { SUBSPECIALTIES } from "./catalog";
import { isPlayableInCompetition } from "./rounds";

const structureCodes = new Set(EYE_STRUCTURES.map((s) => s.code));
const chapterCodes = new Set(EYE_CHAPTERS.map((c) => c.code));

describe("contenido de demostración", () => {
  it("ids únicos y una sola respuesta correcta por pregunta", () => {
    expect(new Set(ALL_DEMO_QUESTIONS.map((q) => q.id)).size).toBe(ALL_DEMO_QUESTIONS.length);
    for (const q of ALL_DEMO_QUESTIONS) {
      expect(q.options.filter((o) => o.isCorrect)).toHaveLength(1);
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(new Set(q.options.map((o) => o.id)).size).toBe(q.options.length);
    }
  });
  it("todas llevan referencia y explicación, y NO son jugables en competición (pendientes de KOL)", () => {
    for (const q of ALL_DEMO_QUESTIONS) {
      expect(q.references.length).toBeGreaterThan(0);
      expect(q.explanation.length).toBeGreaterThan(20);
      expect(q.validationLevel).toBe("ai_generated");
      expect(isPlayableInCompetition(q)).toBe(false);
    }
  });
  it("las 17 subespecialidades tienen preguntas", () => {
    for (const sub of SUBSPECIALTIES) {
      expect(
        DEMO_QUESTIONS.filter((q) => q.subspecialty === sub).length,
        sub,
      ).toBeGreaterThanOrEqual(3);
    }
  });
  it("las estructuras citadas existen en el ojo", () => {
    for (const q of ALL_DEMO_QUESTIONS)
      if (q.structure) expect(structureCodes.has(q.structure), q.id).toBe(true);
  });
  it("los casos BOSS apuntan a preguntas existentes", () => {
    const ids = new Set(ALL_DEMO_QUESTIONS.map((q) => q.id));
    for (const c of DEMO_BOSS_CASES) {
      expect(c.steps.length).toBeGreaterThanOrEqual(3);
      for (const s of c.steps) expect(ids.has(s.questionId)).toBe(true);
    }
  });
  it("capítulos contiguos (0–49 s) y puntos interactivos dentro de su capítulo", () => {
    expect(EYE_CHAPTERS[0].startS).toBe(0);
    expect(EYE_CHAPTERS.at(-1)!.endS).toBe(49);
    for (let i = 1; i < EYE_CHAPTERS.length; i++)
      expect(EYE_CHAPTERS[i].startS).toBe(EYE_CHAPTERS[i - 1].endS);
    for (const s of EYE_STRUCTURES)
      if (s.chapter) expect(chapterCodes.has(s.chapter), s.code).toBe(true);
    for (const h of EYE_HOTSPOTS) {
      const ch = EYE_CHAPTERS.find((c) => c.code === h.chapter)!;
      expect(h.startS).toBeGreaterThanOrEqual(ch.startS);
      expect(h.endS).toBeLessThanOrEqual(ch.endS);
      expect(structureCodes.has(h.structure)).toBe(true);
    }
  });
  it("una estación por capítulo, en orden, con su corte dentro del capítulo", () => {
    expect(EYE_STATIONS.map((x) => x.code)).toEqual(EYE_CHAPTERS.map((c) => c.code));
    EYE_STATIONS.forEach((x, i) => {
      const ch = EYE_CHAPTERS[i];
      expect(x.number).toBe(i + 1);
      expect(x.clipStartS).toBeGreaterThanOrEqual(ch.startS);
      expect(x.clipEndS).toBeLessThanOrEqual(ch.endS);
      expect(x.clipEndS).toBeGreaterThan(x.clipStartS);
      expect(x.video).toMatch(/^\/eye\/stations\/S0[1-4][A-Z]?\.mp4$/);
    });
  });
});
