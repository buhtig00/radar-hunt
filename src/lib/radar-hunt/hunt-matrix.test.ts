import { describe, expect, it } from "vitest";
import { isPlayableInCompetition } from "./rounds";
import { HUNT_QUESTIONS, HUNT_STATIONS, HUNT_TRACKS } from "./seed-hunt-matrix";

describe("banco de los Hunts (matriz de 8 estaciones por perfil)", () => {
  it("23 estaciones científicas con 5 RADARS cada una y recorrido válido", () => {
    expect(HUNT_STATIONS).toHaveLength(23);
    for (const s of HUNT_STATIONS) {
      expect(s.radarIds).toHaveLength(5);
      expect(HUNT_TRACKS[s.track]).toBeTruthy();
    }
    expect(new Set(HUNT_STATIONS.map((s) => s.track)).size).toBe(6);
  });
  it("182 preguntas cerradas, una correcta, ids únicos y sin marcas comerciales", () => {
    expect(HUNT_QUESTIONS).toHaveLength(182);
    expect(new Set(HUNT_QUESTIONS.map((q) => q.id)).size).toBe(182);
    const optIds = HUNT_QUESTIONS.flatMap((q) => q.options.map((o) => o.id));
    expect(new Set(optIds).size).toBe(optIds.length);
    for (const q of HUNT_QUESTIONS) {
      expect(q.options).toHaveLength(4);
      expect(q.options.filter((o) => o.isCorrect)).toHaveLength(1);
      expect(q.stem.length).toBeGreaterThan(15);
    }
    const text = JSON.stringify(HUNT_QUESTIONS);
    for (const brand of ["ZEISS", "MORIA", "EQUIPSA", "BRILL", "OPHTEC", "Medicontur", "Biotech"])
      expect(text).not.toContain(brand);
  });
  it("la correcta está repartida (ninguna letra supera el 30 %)", () => {
    const pos = HUNT_QUESTIONS.map((q) => q.options.findIndex((o) => o.isCorrect));
    for (let i = 0; i < 4; i++)
      expect(pos.filter((p) => p === i).length / pos.length).toBeLessThan(0.3);
  });
  it("es contenido candidato: no jugable en competición hasta validación KOL", () => {
    for (const q of HUNT_QUESTIONS) {
      expect(q.status).toBe("pending_review");
      expect(isPlayableInCompetition(q)).toBe(false);
    }
  });
});
