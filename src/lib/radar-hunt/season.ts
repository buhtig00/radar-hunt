// RADAR HUNT — temporada: cada congreso es un Hunt; la temporada suma los mejores Hunts de
// cada participante y termina en la Gran Final. Recompensas (insignias) por progreso,
// separadas de los premios por clasificación. Sin premios en metálico.
import type { EventRankingRow } from "./congress/types";
import type { Competency } from "./competency";

export const SEASON_PLAN = {
  name: "Temporada 2026–2027",
  huntsPlanned: 8,
  /** Cuentan los mejores N Hunts de cada participante (no penaliza perderse congresos). */
  bestHunts: 5,
  /** Event Score normalizado: el ganador de cada Hunt suma 1000. */
  eventScoreMax: 1000,
  finalists: 16,
  final: {
    name: "Gran Final",
    city: "Barcelona",
    when: "2027",
    /** Sede y fecha pendientes de confirmación por la organización. */
    confirmed: false,
  },
} as const;

export interface HuntResult {
  eventId: string;
  eventName: string;
  rows: EventRankingRow[];
}

export interface SeasonRow {
  userId: string;
  name: string;
  hospital?: string;
  /** Suma de los mejores Event Scores (0–1000 cada uno). */
  score: number;
  huntsPlayed: number;
  /** Event Scores que cuentan, de mayor a menor. */
  counted: { eventId: string; eventName: string; eventScore: number }[];
  rank: number;
  isFinalist: boolean;
  isMe?: boolean;
}

/**
 * Clasificación de temporada. En cada Hunt, el Event Score de cada persona es su puntuación
 * relativa al ganador (0–1000), para que el tamaño o la duración del congreso no pesen. Se
 * suman los mejores `bestHunts`. Desempate: más Hunts jugados (constancia); después, puesto
 * compartido. La rapidez nunca desempata.
 */
export function rankSeason(
  hunts: HuntResult[],
  opts: { bestHunts?: number; finalists?: number; me?: string } = {},
): SeasonRow[] {
  const bestN = opts.bestHunts ?? SEASON_PLAN.bestHunts;
  const K = opts.finalists ?? SEASON_PLAN.finalists;
  const byUser = new Map<
    string,
    { name: string; hospital?: string; scores: SeasonRow["counted"] }
  >();
  for (const h of hunts) {
    const top = Math.max(0, ...h.rows.map((r) => r.score));
    if (top <= 0) continue;
    for (const r of h.rows) {
      const eventScore = Math.round((SEASON_PLAN.eventScoreMax * r.score) / top);
      const u = byUser.get(r.userId) ?? { name: r.name, hospital: r.hospital, scores: [] };
      u.name = r.name;
      u.hospital = r.hospital ?? u.hospital;
      u.scores.push({ eventId: h.eventId, eventName: h.eventName, eventScore });
      byUser.set(r.userId, u);
    }
  }
  const rows: SeasonRow[] = [...byUser.entries()].map(([userId, u]) => {
    const counted = [...u.scores].sort((a, b) => b.eventScore - a.eventScore).slice(0, bestN);
    return {
      userId,
      name: u.name,
      hospital: u.hospital,
      score: counted.reduce((s, x) => s + x.eventScore, 0),
      huntsPlayed: u.scores.length,
      counted,
      rank: 0,
      isFinalist: false,
      isMe: opts.me ? userId === opts.me : undefined,
    };
  });
  rows.sort(
    (a, b) =>
      b.score - a.score || b.huntsPlayed - a.huntsPlayed || a.name.localeCompare(b.name, "es"),
  );
  rows.forEach((r, i) => {
    const p = rows[i - 1];
    r.rank = p && p.score === r.score && p.huntsPlayed === r.huntsPlayed ? p.rank : i + 1;
    r.isFinalist = r.rank <= K && r.score > 0;
  });
  return rows;
}

// --------------------------------------------------------------------- recompensas

export interface ProgressSummary {
  /** RP acumulados: ligas, BOSS, estaciones y retos en sala (la práctica libre no suma). */
  rp: number;
  leagueRounds: number;
  bossPlayed: number;
  bossPerfect: number;
  congressStations: number;
  huntsJoined: number;
  liveAnswers: number;
  competency: Competency[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  /** 0–1 */
  progress: number;
  earned: boolean;
  hint: string;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Insignias por progreso: se ganan jugando, no se compran ni se canjean por regalos. */
export function computeBadges(p: ProgressSummary, eyeStationsDone: number): Badge[] {
  const mastered = p.competency.filter((c) => c.items >= 10 && c.rating >= 1100).length;
  const b = (
    id: string,
    name: string,
    description: string,
    value: number,
    goal: number,
    hint: string,
  ): Badge => ({
    id,
    name,
    description,
    progress: clamp01(value / goal),
    earned: value >= goal,
    hint: value >= goal ? "Conseguida" : `${Math.min(value, goal)} de ${goal}`,
  });
  return [
    b(
      "eye",
      "Explorador del ojo",
      "Mira los 9 tramos del viaje anatómico por el ojo.",
      eyeStationsDone,
      9,
      "",
    ),
    b("hunt", "Primer Hunt", "Completa una estación en un congreso.", p.congressStations, 1, ""),
    b("stations", "Rastreador", "Completa 5 estaciones de congreso.", p.congressStations, 5, ""),
    b("live", "En la sala", "Responde 5 retos o encuestas en directo.", p.liveAnswers, 5, ""),
    b("streak", "Constancia", "Juega 3 rondas de liga.", p.leagueRounds, 3, ""),
    b("boss", "Caso resuelto", "Termina un reto BOSS sin errores.", p.bossPerfect, 1, ""),
    b(
      "mastery",
      "Dominio",
      "Alcanza 1100 de Elo en una subespecialidad (mínimo 10 respuestas).",
      mastered,
      1,
      "",
    ),
    b("season", "Temporada", "Participa en 3 Hunts de la temporada.", p.huntsJoined, 3, ""),
  ];
}

/** Premios por clasificación: reconocimiento académico, nunca dinero ni regalos de valor. */
export const SEASON_PRIZES = [
  {
    who: "Campeón/a de la temporada (Gran Final)",
    what: "Diploma, mención en la Gran Final y estancia formativa (observership) en un centro de referencia.",
  },
  {
    who: "Podio de cada liga (residentes y adjuntos)",
    what: "Diploma acreditativo y plaza en la Gran Final.",
  },
  {
    who: "Campeón/a de cada Hunt",
    what: "Mención en la clausura del congreso y diploma digital.",
  },
  {
    who: "Centro campeón",
    what: "Reconocimiento al servicio en la Gran Final (placa institucional).",
  },
  {
    who: "Mejor residente de la temporada",
    what: "Mentoría con un KOL de su subespecialidad (sesión formativa, sin coste para el residente).",
  },
] as const;

export const PRIZE_POLICY =
  "Los premios son de carácter académico y formativo: no se entregan premios en metálico, sorteos ni regalos de valor. Las estancias y mentorías las gestiona y financia la sociedad científica organizadora, sin intervención de patrocinadores en la selección. Política pendiente de revisión legal (Farmaindustria, EFPIA, MedTech Europe).";
