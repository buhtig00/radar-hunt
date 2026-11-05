// RADAR HUNT — filas de las hojas «Revisión KOL» (Google Drive), tal cual.
// GENERADO por scripts/radar-hunt/import-kol-review.py: no editar a mano.
// Las reglas que las convierten en preguntas aprobadas están en kol-review.ts.
import type { KolReviewRow } from "./kol-review";

/** Fecha de la última importación (null: aún no hay revisiones). */
export const KOL_REVIEW_IMPORTED_AT: string | null = null;

/** Archivos de los que salieron las filas. */
export const KOL_REVIEW_SOURCES: string[] = [];

/** Solo filas con decisión o con algo escrito; las «Pendiente» vacías no se guardan. */
export const KOL_REVIEW_ROWS: KolReviewRow[] = [];
