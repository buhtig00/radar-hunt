// RADAR HUNT — calendario de rondas, selección de preguntas y orden de opciones.
import { CURRENT_SEASON } from "./catalog";
import type { League, PublicQuestion, Question, Round } from "./types";

/** PRNG determinista (mulberry32) a partir de una cadena. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], seed: string): T[] {
  const rnd = seededRandom(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Preguntas elegibles para una liga: su subespecialidad y su nivel (o "ambos"). */
export function eligibleQuestions(
  bank: Question[],
  league: Pick<League, "subspecialty" | "careerLevel">,
): Question[] {
  return bank.filter(
    (q) =>
      q.subspecialty === league.subspecialty &&
      (q.careerLevel === "both" || q.careerLevel === league.careerLevel) &&
      q.status !== "rejected" &&
      q.status !== "archived",
  );
}

/** Regla de producción: solo se juega en competición lo aprobado, validado y con referencia. */
export function isPlayableInCompetition(q: Question): boolean {
  return (
    q.status === "approved" &&
    (q.validationLevel === "or_reviewed" || q.validationLevel === "kol_verified") &&
    q.references.length > 0
  );
}

const WEEK_MS = 7 * 24 * 3600 * 1000;

/**
 * Calendario de la liga: M rondas semanales desde el inicio de temporada; cada ronda
 * abre 7 días. Las preguntas se reparten de forma determinista (mismas para todos).
 */
export function buildLeagueRounds(league: League, bank: Question[]): Round[] {
  const pool = shuffle(eligibleQuestions(bank, league), league.id);
  const start = new Date(CURRENT_SEASON.startsAt).getTime();
  const { totalRounds, questionsPerRound } = league.rules;
  return Array.from({ length: totalRounds }, (_, i) => {
    // Sin repetir preguntas entre rondas: si el banco no llega, la ronda queda vacía
    // ("pendiente de publicación por el comité editorial").
    const ids = pool.slice(i * questionsPerRound, (i + 1) * questionsPerRound).map((q) => q.id);
    return {
      id: `${league.id}:r${i + 1}`,
      kind: "league_round" as const,
      leagueId: league.id,
      number: i + 1,
      title: `Ronda ${i + 1}`,
      opensAt: new Date(start + i * WEEK_MS).toISOString(),
      closesAt: new Date(start + (i + 1) * WEEK_MS).toISOString(),
      questionIds: ids,
    };
  });
}

export function roundState(round: Round, now = Date.now()): "upcoming" | "open" | "closed" {
  const o = new Date(round.opensAt).getTime();
  const c = new Date(round.closesAt).getTime();
  return now < o ? "upcoming" : now > c ? "closed" : "open";
}

/** Vista pública: sin marca de correcta y con opciones en orden propio de cada usuario. */
export function toPublicQuestion(q: Question, userId: string, timeLimitS: number): PublicQuestion {
  return {
    id: q.id,
    type: q.type,
    subspecialty: q.subspecialty,
    difficulty: q.difficulty,
    stem: q.stem,
    options: shuffle(q.options, `${q.id}:${userId}`).map((o) => ({ id: o.id, text: o.text })),
    timeLimitS,
    unvalidated: !isPlayableInCompetition(q),
  };
}
