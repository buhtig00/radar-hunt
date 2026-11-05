// Genera supabase/seed/radar_hunt_demo_bank.sql a partir del banco TS (única fuente).
// Uso: npx vite-node scripts/radar-hunt/generate-demo-seed.ts
import { writeFileSync, mkdirSync } from "node:fs";
import {
  ALL_DEMO_QUESTIONS,
  DEMO_BOSS_CASES,
  DEMO_BOSS_QUESTIONS,
} from "../../src/lib/radar-hunt/seed-questions";

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const boss = new Set(DEMO_BOSS_QUESTIONS.map((x) => x.id));
const out: string[] = [
  "-- RADAR HUNT — banco de DEMOSTRACIÓN (generado; no editar a mano).",
  "-- Todas las preguntas entran como pending_review / ai_generated: NO son jugables en",
  "-- competición hasta que un editor y un KOL las aprueben.",
  "begin;",
];
for (const x of ALL_DEMO_QUESTIONS) {
  out.push(
    `insert into public.rh_questions (id, type, subspecialty, career_level, difficulty, cognitive_level, structure, stem, explanation, "references", status, validation_level, ai_assisted, is_boss_step) values (${q(x.id)}, ${q(x.type)}, ${q(x.subspecialty)}, ${q(x.careerLevel)}, ${x.difficulty}, ${q(x.cognitiveLevel)}, ${x.structure ? q(x.structure) : "null"}, ${q(x.stem)}, ${q(x.explanation)}, ${q(JSON.stringify(x.references))}::jsonb, ${q(x.status)}, ${q(x.validationLevel)}, ${x.aiAssisted}, ${boss.has(x.id)}) on conflict (id) do nothing;`,
  );
  x.options.forEach((o, i) =>
    out.push(
      `insert into public.rh_question_options (id, question_id, position, text, is_correct) values (${q(o.id)}, ${q(x.id)}, ${i + 1}, ${q(o.text)}, ${o.isCorrect}) on conflict (id) do nothing;`,
    ),
  );
}
for (const c of DEMO_BOSS_CASES) {
  out.push(
    `insert into public.rh_boss_cases (id, title, subspecialty, career_level, intro, status, validation_level) values (${q(c.id)}, ${q(c.title)}, ${q(c.subspecialty)}, ${q(c.careerLevel)}, ${q(c.intro)}, ${q(c.status)}, ${q(c.validationLevel)}) on conflict (id) do nothing;`,
  );
  c.steps.forEach((s, i) =>
    out.push(
      `insert into public.rh_boss_steps (case_id, step_no, reveal, question_id) values (${q(c.id)}, ${i + 1}, ${q(s.reveal)}, ${q(s.questionId)}) on conflict do nothing;`,
    ),
  );
}
out.push("commit;", "");
mkdirSync("supabase/seed", { recursive: true });
writeFileSync("supabase/seed/radar_hunt_demo_bank.sql", out.join("\n"));
console.log(`questions=${ALL_DEMO_QUESTIONS.length} boss=${DEMO_BOSS_CASES.length}`);
