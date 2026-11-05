// RADAR HUNT — mapa de competencias (formación personalizada).
// Puntuación tipo Elo por subespecialidad: cada pregunta actúa como "rival" con una
// fuerza según su dificultad. Es orientación formativa, no una evaluación oficial.
import type { SubspecialtyCode } from "./types";

export const ELO_START = 1000;
const K_START = 40;
const K_MIN = 16;

/** Fuerza de la pregunta: dificultad 1 → 800 … dificultad 5 → 1200. */
export function itemRating(difficulty: number): number {
  return 700 + 100 * Math.min(5, Math.max(1, difficulty));
}

export interface Competency {
  subspecialty: SubspecialtyCode;
  rating: number;
  items: number;
  correct: number;
}

/** Actualiza la competencia con una respuesta (credit en [0,1]). */
export function updateCompetency(c: Competency, difficulty: number, credit: number): Competency {
  const expected = 1 / (1 + 10 ** ((itemRating(difficulty) - c.rating) / 400));
  const k = Math.max(K_MIN, K_START - c.items);
  return {
    ...c,
    rating: Math.round((c.rating + k * (credit - expected)) * 10) / 10,
    items: c.items + 1,
    correct: c.correct + (credit === 1 ? 1 : 0),
  };
}

export function emptyCompetency(subspecialty: SubspecialtyCode): Competency {
  return { subspecialty, rating: ELO_START, items: 0, correct: 0 };
}

/** Áreas de mejora: subespecialidades con suficientes respuestas y menor rendimiento. */
export function weakAreas(list: Competency[], minItems = 5, max = 3): Competency[] {
  return list
    .filter((c) => c.items >= minItems)
    .sort((a, b) => a.rating - b.rating)
    .slice(0, max);
}
