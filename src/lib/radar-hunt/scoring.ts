// RADAR HUNT — puntuación. Se ejecuta en el servidor en producción (y localmente en
// el modo demo). El cliente nunca decide los puntos.
import type { AnswerRecord, Question } from "./types";

/** Margen de latencia de red descontado del tiempo medido (ms). */
export const LATENCY_ALLOWANCE_MS = 300;
/** Bonus por resolver un caso BOSS completo sin errores. */
export const BOSS_PERFECT_BONUS = 0.2;

/** Puntos base según la dificultad (1–5): 100, 125, 150, 175, 200. */
export function basePoints(difficulty: number): number {
  const d = Math.min(5, Math.max(1, Math.round(difficulty)));
  return 100 * (1 + 0.25 * (d - 1));
}

/**
 * Crédito de acierto en [0, 1].
 * - Respuesta única: 1 si coincide, 0 si no.
 * - Selección múltiple: max(0, (aciertos − falsos) / correctas).
 */
export function correctnessCredit(question: Question, selected: string[]): number {
  const correct = new Set(question.options.filter((o) => o.isCorrect).map((o) => o.id));
  const valid = new Set(question.options.map((o) => o.id));
  const chosen = [...new Set(selected)].filter((id) => valid.has(id));
  if (question.type === "single_choice") {
    return chosen.length === 1 && correct.has(chosen[0]) ? 1 : 0;
  }
  if (correct.size === 0) return 0;
  const tp = chosen.filter((id) => correct.has(id)).length;
  const fp = chosen.length - tp;
  return Math.max(0, (tp - fp) / correct.size);
}

/** Factor de velocidad en [1, 1 + λ]: la rapidez nunca supera al acierto. */
export function speedFactor(responseMs: number, timeLimitS: number, lambda: number): number {
  const t = Math.max(0, responseMs - LATENCY_ALLOWANCE_MS);
  const T = timeLimitS * 1000;
  if (T <= 0) return 1;
  return 1 + lambda * Math.max(0, 1 - t / T);
}

export interface ScoreInput {
  question: Question;
  selected: string[];
  responseMs: number;
  timeLimitS: number;
  lambda: number;
}

/** Puntúa una respuesta. Fuera de tiempo = 0 puntos (pero cuenta como respondida). */
export function scoreAnswer({
  question,
  selected,
  responseMs,
  timeLimitS,
  lambda,
}: ScoreInput): AnswerRecord {
  const timedOut = responseMs > timeLimitS * 1000 + LATENCY_ALLOWANCE_MS;
  const credit = timedOut ? 0 : correctnessCredit(question, selected);
  const points =
    credit > 0
      ? basePoints(question.difficulty) * credit * speedFactor(responseMs, timeLimitS, lambda)
      : 0;
  return {
    questionId: question.id,
    selected,
    isCorrect: credit === 1,
    partialCredit: Math.round(credit * 1000) / 1000,
    responseMs: Math.max(0, Math.round(responseMs)),
    points: Math.round(points * 100) / 100,
  };
}

/** Total de un caso BOSS: suma de pasos + 20 % si todos los pasos son correctos. */
export function bossTotal(steps: AnswerRecord[]): { total: number; perfect: boolean } {
  const sum = steps.reduce((acc, s) => acc + s.points, 0);
  const perfect = steps.length > 0 && steps.every((s) => s.isCorrect);
  const total = perfect ? sum * (1 + BOSS_PERFECT_BONUS) : sum;
  return { total: Math.round(total * 100) / 100, perfect };
}

export function summarize(answers: AnswerRecord[]) {
  return {
    totalScore: Math.round(answers.reduce((a, x) => a + x.points, 0) * 100) / 100,
    correctCount: answers.filter((x) => x.isCorrect).length,
    totalMs: answers.reduce((a, x) => a + x.responseMs, 0),
  };
}
