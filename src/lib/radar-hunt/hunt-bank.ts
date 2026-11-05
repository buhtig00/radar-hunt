// RADAR HUNT — banco de los Hunts con la revisión Medical/KOL aplicada.
// Úsalo en lugar de HUNT_QUESTIONS (seed-hunt-matrix.ts, contenido candidato sin revisar)
// en todo lo que se juega.
import { applyKolReview } from "./kol-review";
import { KOL_REVIEW_ROWS } from "./hunt-kol-review";
import { HUNT_QUESTIONS } from "./seed-hunt-matrix";

export const HUNT_KOL_REVIEW = applyKolReview(HUNT_QUESTIONS, KOL_REVIEW_ROWS);

export const HUNT_BANK = HUNT_KOL_REVIEW.questions;
