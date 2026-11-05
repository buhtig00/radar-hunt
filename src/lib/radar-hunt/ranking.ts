// RADAR HUNT — clasificaciones de liga.
import type { Attempt, LeaderboardRow, LeagueRules } from "./types";

export interface RankInput {
  attempts: Attempt[];
  rules: Pick<LeagueRules, "bestN" | "finalistsK">;
  displayName: (userId: string) => string;
}

/**
 * Clasificación de liga:
 * - suma de las mejores N rondas de cada participante (una guardia no penaliza);
 * - desempate: más aciertos; la rapidez NO desempata (equidad entre idiomas y ritmos);
 *   a igualdad, se comparte puesto y se ordena alfabéticamente;
 * - los K primeros son finalistas;
 * - empates exactos comparten puesto (ranking de competición 1, 2, 2, 4).
 */
export function rankLeague({ attempts, rules, displayName }: RankInput): LeaderboardRow[] {
  const byUser = new Map<string, Attempt[]>();
  for (const a of attempts) {
    if (!a.submittedAt) continue;
    const list = byUser.get(a.userId) ?? [];
    list.push(a);
    byUser.set(a.userId, list);
  }

  const rows = [...byUser.entries()].map(([userId, list]) => {
    const best = [...list].sort((x, y) => y.totalScore - x.totalScore).slice(0, rules.bestN);
    return {
      userId,
      displayName: displayName(userId),
      score: Math.round(best.reduce((s, a) => s + a.totalScore, 0) * 100) / 100,
      correct: best.reduce((s, a) => s + a.correctCount, 0),
      totalMs: best.reduce((s, a) => s + a.totalMs, 0),
      roundsPlayed: list.length,
      rank: 0,
      isFinalist: false,
    };
  });

  rows.sort(
    (a, b) =>
      b.score - a.score ||
      b.correct - a.correct ||
      a.displayName.localeCompare(b.displayName, "es"),
  );

  rows.forEach((r, i) => {
    const prev = rows[i - 1];
    r.rank = prev && prev.score === r.score && prev.correct === r.correct ? prev.rank : i + 1;
    r.isFinalist = r.rank <= rules.finalistsK;
  });
  return rows;
}
