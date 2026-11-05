import { describe, expect, it } from "vitest";
import {
  computeTrackBadges,
  EYE_ANCHORS,
  EYE_TRACKS,
  findTrackStation,
  isStationPassed,
  passMark,
  stationsForStructure,
  trackProgress,
  trackStations,
} from "./eye-tracks";
import { EYE_CHAPTERS, EYE_STRUCTURES } from "./eye-universe";
import { HUNT_STATIONS, HUNT_TRACKS } from "./seed-hunt-matrix";

describe("Eye Universe por especialidades", () => {
  it("los 6 recorridos cubren las 23 estaciones, cada una una sola vez y en su recorrido", () => {
    expect(EYE_TRACKS.map((t) => t.code).sort()).toEqual(Object.keys(HUNT_TRACKS).sort());
    const routed = EYE_TRACKS.flatMap((t) => t.route);
    expect(routed).toHaveLength(HUNT_STATIONS.length);
    expect(new Set(routed).size).toBe(HUNT_STATIONS.length);
    for (const t of EYE_TRACKS)
      for (const code of t.route)
        expect(HUNT_STATIONS.find((s) => s.code === code)?.track, code).toBe(t.code);
  });

  it("todas las estaciones tienen anclaje anatómico válido", () => {
    const structures = new Set(EYE_STRUCTURES.map((s) => s.code));
    const chapters = new Set(EYE_CHAPTERS.map((c) => c.code));
    for (const s of HUNT_STATIONS) {
      const a = EYE_ANCHORS[s.code];
      expect(a, s.code).toBeTruthy();
      expect(a.station).toBe(s.code);
      expect(structures.has(a.structure), `${s.code} → ${a.structure}`).toBe(true);
      if (a.clip) expect(chapters.has(a.clip), s.code).toBe(true);
      // marcador dentro de la órbita (≈ ±25 mm) y cámara fuera del punto mirado
      for (const v of a.marker) expect(Math.abs(v)).toBeLessThan(35);
      const d = Math.hypot(...a.view.pos.map((p, i) => p - a.view.target[i]));
      expect(d, s.code).toBeGreaterThan(2);
      expect(a.focus.length).toBeGreaterThan(20);
    }
  });

  it("las estaciones fuera del globo activan la vista de anejos", () => {
    for (const a of Object.values(EYE_ANCHORS)) {
      const outside = ["eyelids", "lacrimal", "extraocular_muscles", "orbit", "optic_nerve"];
      if (outside.includes(a.structure)) expect(a.adnexa, a.station).toBeTruthy();
    }
    expect(EYE_ANCHORS["OCP-01"].adnexa).toBe("full");
  });

  it("orden clínico numerado y búsquedas", () => {
    const g = trackStations("glaucoma");
    expect(g.map((s) => s.order)).toEqual([1, 2, 3, 4, 5]);
    expect(g[0].code).toBe("GLA-03");
    expect(findTrackStation("OCP-02")?.track).toBe("oculoplastia");
    expect(findTrackStation("XXX")).toBeUndefined();
    expect(stationsForStructure("optic_disc").map((s) => s.code)).toEqual(
      expect.arrayContaining(["GLA-01", "NEU-02"]),
    );
  });
});

describe("insignias de recorrido", () => {
  const done = (station: string, bestCorrect: number, total = 5) => ({
    station,
    bestCorrect,
    total,
    attempts: 1,
    completedAt: "2026-11-04T00:00:00Z",
  });

  it("una estación se supera con el 80 % (4/5, 3/3) y no con menos", () => {
    expect(isStationPassed(done("GLA-01", 4))).toBe(true);
    expect(isStationPassed(done("GLA-01", 5))).toBe(true);
    expect(isStationPassed(done("GLA-01", 3))).toBe(false);
    expect(isStationPassed(done("GEN-02", 3, 3))).toBe(true);
    expect(isStationPassed(done("GEN-02", 2, 3))).toBe(false);
    expect(isStationPassed(done("GEN-02", 0, 0))).toBe(false);
    expect(isStationPassed(undefined)).toBe(false);
    expect(passMark(5)).toBe(4);
    expect(passMark(3)).toBe(3);
    expect(passMark(4)).toBe(4);
  });

  it("6 insignias de recorrido + 1 global, sin ganar al empezar", () => {
    const b = computeTrackBadges([]);
    expect(b).toHaveLength(EYE_TRACKS.length + 1);
    expect(b.every((x) => !x.earned && x.progress === 0)).toBe(true);
    expect(new Set(b.map((x) => x.id)).size).toBe(b.length);
  });

  it("el recorrido se gana solo con todas sus estaciones superadas", () => {
    const g = EYE_TRACKS.find((t) => t.code === "general")!;
    const half = computeTrackBadges([done(g.route[0], 5), done(g.route[1], 3)]);
    const gen = half.find((x) => x.track === "general")!;
    expect(gen.earned).toBe(false);
    expect(gen.progress).toBeCloseTo(0.5);
    expect(gen.hint).toBe("1 de 2 estaciones superadas");
    const full = computeTrackBadges([done(g.route[0], 5), done(g.route[1], 4)]);
    expect(full.find((x) => x.track === "general")!.earned).toBe(true);
    expect(full.find((x) => x.id === "track-all")!.earned).toBe(false);
    const all = computeTrackBadges(EYE_TRACKS.flatMap((t) => t.route).map((c) => done(c, 4)));
    expect(all.every((x) => x.earned)).toBe(true);
  });

  it("trackProgress distingue practicadas de superadas", () => {
    const g = EYE_TRACKS.find((t) => t.code === "glaucoma")!;
    const map = new Map([
      [g.route[0], done(g.route[0], 1)],
      [g.route[1], done(g.route[1], 4)],
    ]);
    expect(trackProgress(g, map)).toMatchObject({ passed: 1, practiced: 2, total: 5 });
  });
});
