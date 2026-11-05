import { describe, expect, it } from "vitest";
import type { EventRankingRow } from "./congress/types";
import { computeBadges, rankSeason, type ProgressSummary } from "./season";

const row = (userId: string, score: number): EventRankingRow => ({
  userId,
  name: userId,
  stationScore: score,
  liveScore: 0,
  score,
  correct: 1,
  totalMs: 0,
  stationsDone: 1,
  rank: 0,
});

describe("temporada", () => {
  it("normaliza cada Hunt al ganador (1000) y suma los mejores N", () => {
    const hunts = [
      { eventId: "h1", eventName: "H1", rows: [row("ana", 400), row("bea", 200)] }, // ana 1000, bea 500
      { eventId: "h2", eventName: "H2", rows: [row("bea", 2000), row("ana", 1000)] }, // bea 1000, ana 500
      { eventId: "h3", eventName: "H3", rows: [row("ana", 50), row("carla", 100)] }, // ana 500, carla 1000
    ];
    const r = rankSeason(hunts, { bestHunts: 2, finalists: 2, me: "ana" });
    // ana: mejores 2 de 3 = 1000 + 500; bea: 1000 + 500; carla: 1000
    expect(r.map((x) => [x.userId, x.score, x.rank])).toEqual([
      ["ana", 1500, 1], // desempata por más Hunts jugados (3 frente a 2)
      ["bea", 1500, 2],
      ["carla", 1000, 3],
    ]);
    expect(r[0].counted.map((c) => c.eventScore)).toEqual([1000, 500]);
    expect(r[0].isMe).toBe(true);
    expect(r.filter((x) => x.isFinalist).map((x) => x.userId)).toEqual(["ana", "bea"]);
  });

  it("un congreso grande no pesa más que uno pequeño", () => {
    const r = rankSeason([
      { eventId: "big", eventName: "Grande", rows: [row("a", 9000)] },
      { eventId: "small", eventName: "Pequeño", rows: [row("b", 300)] },
    ]);
    expect(r[0].score).toBe(r[1].score);
    expect(r[0].rank).toBe(1);
  });
});

describe("recompensas", () => {
  const base: ProgressSummary = {
    rp: 0,
    leagueRounds: 0,
    bossPlayed: 0,
    bossPerfect: 0,
    congressStations: 0,
    huntsJoined: 0,
    liveAnswers: 0,
    competency: [],
  };
  it("las insignias se ganan por progreso", () => {
    const none = computeBadges(base, 0);
    expect(none.every((b) => !b.earned)).toBe(true);
    const some = computeBadges(
      {
        ...base,
        congressStations: 5,
        leagueRounds: 2,
        competency: [{ subspecialty: "retina", rating: 1150, items: 12, correct: 10 }],
      },
      9,
    );
    const earned = some.filter((b) => b.earned).map((b) => b.id);
    expect(earned).toEqual(expect.arrayContaining(["eye", "hunt", "stations", "mastery"]));
    expect(some.find((b) => b.id === "streak")!.progress).toBeCloseTo(2 / 3);
  });
});
