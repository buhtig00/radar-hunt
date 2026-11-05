// Genera supabase/seed/radar_hunt_hunt_matrix.sql a partir de seed-hunt-matrix.ts.
// Uso: npx vite-node scripts/radar-hunt/generate-hunt-seed.ts
// Todo entra como pending_review: NO es jugable en competición hasta que Medical/KOL lo
// apruebe y añada explicación y al menos una referencia.
import { mkdirSync, writeFileSync } from "node:fs";
import { HUNT_QUESTIONS } from "../../src/lib/radar-hunt/seed-hunt-matrix";

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const out: string[] = [
  "-- RADAR HUNT — banco de los Hunts (matriz de 8 estaciones por perfil, 21/09/2026).",
  "-- GENERADO (scripts/radar-hunt/generate-hunt-seed.ts): no editar a mano.",
  "-- Contenido candidato · pendiente de validación Medical/KOL · no jugable en competición.",
  "begin;",
];
for (const x of HUNT_QUESTIONS) {
  out.push(
    `insert into public.rh_questions (id, type, subspecialty, career_level, difficulty, cognitive_level, structure, stem, explanation, "references", status, validation_level, ai_assisted, is_boss_step) values (${q(x.id)}, ${q(x.type)}, ${q(x.subspecialty)}, ${q(x.careerLevel)}, ${x.difficulty}, ${q(x.cognitiveLevel)}, ${x.structure ? q(x.structure) : "null"}, ${q(x.stem)}, ${q(x.explanation)}, '[]'::jsonb, 'pending_review', 'ai_generated', false, false) on conflict (id) do nothing;`,
  );
  x.options.forEach((o, i) =>
    out.push(
      `insert into public.rh_question_options (id, question_id, position, text, is_correct) values (${q(o.id)}, ${q(x.id)}, ${i + 1}, ${q(o.text)}, ${o.isCorrect}) on conflict (id) do nothing;`,
    ),
  );
}
out.push("commit;", "");
mkdirSync("supabase/seed", { recursive: true });
writeFileSync("supabase/seed/radar_hunt_hunt_matrix.sql", out.join("\n"));
console.log(`preguntas=${HUNT_QUESTIONS.length}`);
