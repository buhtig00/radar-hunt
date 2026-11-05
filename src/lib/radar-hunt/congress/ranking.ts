// RADAR HUNT — clasificaciones del congreso (Live Score del evento; no computa en las ligas).
import type { EventRankingRow, HospitalRankingRow } from "./types";

export const HOSPITAL_TOP_N = 5;
export const HOSPITAL_MIN_PARTICIPANTS = 3;

export interface ScoreEntry {
  userId: string;
  stationScore: number;
  liveScore: number;
  correct: number;
  totalMs: number;
  stationsDone: number;
}

export interface RankEventInput {
  entries: ScoreEntry[];
  /** Nombre visible (respeta el consentimiento de clasificación pública). */
  name: (userId: string) => string;
  hospital: (userId: string) => string | undefined;
  me?: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Clasificación individual: estaciones + retos en sala. Desempate: más aciertos; el tiempo
 * no desempata. Los empates exactos comparten puesto (1, 2, 2, 4).
 */
export function rankEvent({ entries, name, hospital, me }: RankEventInput): EventRankingRow[] {
  const rows: EventRankingRow[] = entries
    .filter((e) => e.stationScore + e.liveScore > 0 || e.correct > 0 || e.stationsDone > 0)
    .map((e) => ({
      userId: e.userId,
      name: name(e.userId),
      hospital: hospital(e.userId),
      stationScore: round2(e.stationScore),
      liveScore: round2(e.liveScore),
      score: round2(e.stationScore + e.liveScore),
      correct: e.correct,
      totalMs: e.totalMs,
      stationsDone: e.stationsDone,
      rank: 0,
      isMe: me ? e.userId === me : undefined,
    }));
  rows.sort(
    (a, b) => b.score - a.score || b.correct - a.correct || a.userId.localeCompare(b.userId),
  );
  rows.forEach((r, i) => {
    const p = rows[i - 1];
    r.rank = p && p.score === r.score && p.correct === r.correct ? p.rank : i + 1;
  });
  return rows;
}

/** Normaliza el nombre del centro para agrupar ("H. U. La Fe " ≈ "h. u. la fe"). */
export function hospitalKey(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Clasificación de centros: media de sus 5 mejores puntuaciones (no la suma, para no
 * premiar solo el tamaño). Solo aparecen los centros con al menos 3 participantes.
 */
export function rankHospitals(rows: EventRankingRow[]): HospitalRankingRow[] {
  const groups = new Map<string, { label: string; scores: number[] }>();
  for (const r of rows) {
    if (!r.hospital?.trim()) continue;
    const k = hospitalKey(r.hospital);
    const g = groups.get(k) ?? { label: r.hospital.trim(), scores: [] };
    g.scores.push(r.score);
    groups.set(k, g);
  }
  const out: HospitalRankingRow[] = [...groups.values()]
    .filter((g) => g.scores.length >= HOSPITAL_MIN_PARTICIPANTS)
    .map((g) => {
      const top = [...g.scores].sort((a, b) => b - a).slice(0, HOSPITAL_TOP_N);
      return {
        hospital: g.label,
        participants: g.scores.length,
        score: round2(top.reduce((s, x) => s + x, 0) / top.length),
        rank: 0,
      };
    })
    .sort((a, b) => b.score - a.score || a.hospital.localeCompare(b.hospital, "es"));
  out.forEach((r, i) => {
    const p = out[i - 1];
    r.rank = p && p.score === r.score ? p.rank : i + 1;
  });
  return out;
}

/** Recuento de una encuesta o reto: votos por opción. */
export function tally(
  optionIds: string[],
  answers: { selected: string[] }[],
): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(optionIds.map((id) => [id, 0]));
  for (const a of answers)
    for (const id of new Set(a.selected)) if (id in out) out[id] = (out[id] ?? 0) + 1;
  return out;
}
