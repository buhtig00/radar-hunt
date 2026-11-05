// Informe de la revisión Medical/KOL importada y SQL para producción.
// Uso: npx vite-node scripts/radar-hunt/kol-review-report.ts
//   1. python3 -I scripts/radar-hunt/import-kol-review.py hojas/*.xlsx
//   2. este script → informe por estación + supabase/seed/radar_hunt_kol_review.sql
// Sale con código 1 si hay errores (filas que no se pudieron aplicar).
import { mkdirSync, writeFileSync } from "node:fs";
import { HUNT_KOL_REVIEW } from "../../src/lib/radar-hunt/hunt-bank";
import {
  KOL_REVIEW_IMPORTED_AT,
  KOL_REVIEW_SOURCES,
} from "../../src/lib/radar-hunt/hunt-kol-review";
import { kolReviewSql } from "../../src/lib/radar-hunt/kol-review";
import { isPlayableInCompetition } from "../../src/lib/radar-hunt/rounds";
import { HUNT_STATIONS } from "../../src/lib/radar-hunt/seed-hunt-matrix";

const { questions, issues, summary } = HUNT_KOL_REVIEW;
const SQL = "supabase/seed/radar_hunt_kol_review.sql";

if (!KOL_REVIEW_IMPORTED_AT) {
  console.log("Aún no hay revisiones importadas (hunt-kol-review.ts vacío).");
  process.exit(0);
}

console.log(
  `Revisión KOL importada ${KOL_REVIEW_IMPORTED_AT} de: ${KOL_REVIEW_SOURCES.join(", ")}`,
);
console.log(
  `Filas ${summary.rows} · aprobadas ${summary.approved} · rechazadas ${summary.rejected} · ` +
    `pendientes por incidencia ${summary.pending} · sin cambios ${summary.unchanged} · ` +
    `correcta cambiada ${summary.correctChanged} · errores ${summary.errors} · avisos ${summary.warnings}\n`,
);

const byId = new Map(questions.map((q) => [q.id, q]));
console.log("Estación  RADARS jugables  Science XP jugables  rechazadas");
for (const st of HUNT_STATIONS) {
  const playable = (ids: string[]) =>
    ids.filter((id) => isPlayableInCompetition(byId.get(id)!)).length;
  const rejected = [...st.radarIds, ...st.scienceXpIds].filter(
    (id) => byId.get(id)!.status === "rejected",
  ).length;
  console.log(
    `${st.code.padEnd(9)} ${`${playable(st.radarIds)}/${st.radarIds.length}`.padEnd(16)} ` +
      `${`${playable(st.scienceXpIds)}/${st.scienceXpIds.length}`.padEnd(20)} ${rejected}`,
  );
}

for (const level of ["error", "warning"] as const) {
  const list = issues.filter((i) => i.level === level);
  if (!list.length) continue;
  console.log(`\n${level === "error" ? "ERRORES (no aplicado)" : "Avisos"}:`);
  for (const i of list) console.log(`  ${i.id} (${i.source}): ${i.message}`);
}

mkdirSync("supabase/seed", { recursive: true });
writeFileSync(
  SQL,
  kolReviewSql(HUNT_KOL_REVIEW, [
    `Importada ${KOL_REVIEW_IMPORTED_AT} de: ${KOL_REVIEW_SOURCES.join(", ")}`,
    "Aplicar DESPUÉS de radar_hunt_hunt_matrix.sql. Solo toca lo aprobado o rechazado.",
  ]),
);
console.log(`\nSQL de producción: ${SQL}`);
process.exit(summary.errors ? 1 : 0);
