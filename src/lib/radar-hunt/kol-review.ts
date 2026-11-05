// RADAR HUNT — aplicación de la revisión Medical/KOL al banco de los Hunts.
//
// Las hojas «Revisión KOL · <recorrido>» (Google Drive) se exportan a .xlsx y
// scripts/radar-hunt/import-kol-review.py extrae sus filas a hunt-kol-review.ts SIN
// interpretarlas. Todas las reglas viven aquí (puras y con tests):
//
//  · «Aprobada» / «Aprobada con cambios» → approved + kol_verified, SOLO si hay explicación
//    y al menos una referencia; si falta algo, la pregunta sigue pending_review y se informa.
//  · Los cambios se aplican si son estructurados: columna «Cambios» con líneas
//    «Enunciado: …», «A: …» … «D: …», o el texto editado directamente en las celdas.
//    Cualquier otro texto libre en «Cambios» deja la pregunta pendiente para edición manual.
//  · «Correcta tras revisión» (A–D) sustituye a la correcta de la matriz.
//  · «Rechazada» → rejected (sale de cualquier ronda).
//  · «Pendiente» o vacío → sin cambios.
//  · Si la «Correcta (matriz)» de la hoja no coincide con el banco, la hoja está desfasada:
//    la fila se ignora (las letras podrían apuntar a otras opciones).
import type { Question, Reference } from "./types";

export const KOL_LETTERS = ["A", "B", "C", "D"] as const;

/** Fila de la pestaña «Revisión», tal cual (texto de cada celda, recortado). */
export interface KolReviewRow {
  /** Columna A: id de la pregunta (hm-gen-01-q1…). */
  id: string;
  /** Origen legible para el informe: «archivo › Revisión fila 7». */
  source: string;
  /** L: Estado de revisión. */
  state: string;
  /** E: Enunciado (puede venir editado por el KOL). */
  stem?: string;
  /** F–I: opciones A–D (pueden venir editadas). */
  options?: string[];
  /** J: Correcta (matriz). */
  matrixCorrect?: string;
  /** M: Correcta tras revisión. */
  correct?: string;
  /** N: Cambios en enunciado u opciones. */
  changes?: string;
  /** O: Explicación (perla clínica). */
  explanation?: string;
  /** P: Referencia (cita completa); varias, una por línea. */
  reference?: string;
  /** Q: DOI o URL; varios, uno por línea y en el mismo orden que las citas. */
  url?: string;
  /** R: Revisor/a (KOL). */
  reviewer?: string;
  /** S: Fecha de revisión (ISO si se pudo convertir). */
  date?: string;
}

export type KolReviewState =
  | "pendiente"
  | "aprobada"
  | "aprobada_con_cambios"
  | "rechazada"
  | "sin_estado";

export type KolOutcomeKind = "approved" | "rejected" | "pending" | "unchanged";

export interface KolReviewIssue {
  id: string;
  source: string;
  level: "error" | "warning";
  message: string;
}

export interface KolReviewOutcome {
  id: string;
  source: string;
  state: KolReviewState;
  outcome: KolOutcomeKind;
  correctChanged: boolean;
  textChanged: boolean;
  reviewer?: string;
  reviewedAt?: string;
}

export interface KolReviewResult<T extends Question> {
  questions: T[];
  outcomes: KolReviewOutcome[];
  issues: KolReviewIssue[];
  summary: Record<KolOutcomeKind, number> & {
    rows: number;
    errors: number;
    warnings: number;
    correctChanged: number;
  };
}

const norm = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const fold = (s: string) => norm(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function normalizeKolState(raw: string): KolReviewState | null {
  const s = fold(raw);
  if (!s) return "sin_estado";
  if (s === "pendiente") return "pendiente";
  if (s === "aprobada" || s === "aprobado") return "aprobada";
  if (s === "aprobada con cambios" || s === "aprobado con cambios") return "aprobada_con_cambios";
  if (s === "rechazada" || s === "rechazado") return "rechazada";
  return null;
}

const EMPTY_CHANGES = new Set([
  "",
  "-",
  "—",
  "no",
  "ninguno",
  "ninguna",
  "sin cambios",
  "n/a",
  "na",
]);

/** Cambios de la columna N: «Enunciado: …» y «A: …»…«D: …», una por línea. */
export function parseKolChanges(raw: string | undefined): {
  stem?: string;
  options: Partial<Record<(typeof KOL_LETTERS)[number], string>>;
  freeText: string[];
} {
  const out: ReturnType<typeof parseKolChanges> = { options: {}, freeText: [] };
  if (EMPTY_CHANGES.has(fold(raw ?? ""))) return out;
  for (const line of (raw ?? "").split(/\r?\n/)) {
    if (!line.trim()) continue;
    const m = /^\s*(enunciado|opci[oó]n\s+[a-d]|[a-d])\s*[:：)]\s*(.+?)\s*$/i.exec(line);
    if (!m) {
      out.freeText.push(line.trim());
      continue;
    }
    const key = fold(m[1]);
    if (key === "enunciado") out.stem = m[2];
    else out.options[key.slice(-1).toUpperCase() as (typeof KOL_LETTERS)[number]] = m[2];
  }
  return out;
}

/** «10.1016/…», «doi:10.…» o «https://…» → URL; otra cosa → null. */
export function normalizeKolUrl(raw: string): string | null {
  const s = raw.trim().replace(/[.,;]+$/, "");
  if (/^https?:\/\/\S+$/i.test(s)) return s;
  const doi = /^(?:doi:\s*|https?:\/\/(?:dx\.)?doi\.org\/)?(10\.\d{4,9}\/\S+)$/i.exec(s);
  return doi ? `https://doi.org/${doi[1]}` : null;
}

/** Citas de P (una por línea) emparejadas en orden con los DOI/URL de Q. */
export function parseKolReferences(
  reference: string | undefined,
  url: string | undefined,
): { references: Reference[]; problems: string[] } {
  const problems: string[] = [];
  const cites = (reference ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const links = (url ?? "")
    .split(/[\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const references: Reference[] = cites.map((citation) => ({ citation }));
  links.forEach((l, i) => {
    const u = normalizeKolUrl(l);
    if (!u) return void problems.push(`DOI/URL no reconocido: «${l}»`);
    if (i < references.length) references[i].url = u;
    else problems.push(`DOI/URL sin cita a la que asociarlo: «${l}»`);
  });
  return { references, problems };
}

/** «2026-11-20», «20/11/2026» o «20-11-2026» → «2026-11-20»; otra cosa → undefined. */
export function normalizeKolDate(raw: string | undefined): string | undefined {
  const s = (raw ?? "").trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return undefined;
}

const correctLetter = (q: Question) => KOL_LETTERS[q.options.findIndex((o) => o.isCorrect)];

export function applyKolReview<T extends Question>(
  bank: readonly T[],
  rows: readonly KolReviewRow[],
): KolReviewResult<T> {
  const byId = new Map(bank.map((q, i) => [q.id, i]));
  const questions = [...bank];
  const outcomes: KolReviewOutcome[] = [];
  const issues: KolReviewIssue[] = [];
  const seen = new Map<string, string>();

  for (const row of rows) {
    const id = norm(row.id);
    const issue = (level: KolReviewIssue["level"], message: string) =>
      issues.push({ id, source: row.source, level, message });

    const idx = byId.get(id);
    if (idx === undefined) {
      issue("error", "El id no existe en el banco de los Hunts.");
      continue;
    }
    if (seen.has(id)) {
      issue("error", `Fila duplicada (ya revisada en ${seen.get(id)}); se ignora.`);
      continue;
    }
    seen.set(id, row.source);

    const state = normalizeKolState(row.state);
    if (!state) {
      issue("error", `Estado de revisión no reconocido: «${row.state}».`);
      continue;
    }
    const base = bank[idx];
    const reviewer = norm(row.reviewer) || undefined;
    const reviewedAt = normalizeKolDate(row.date);
    if (norm(row.date) && !reviewedAt) issue("warning", `Fecha no reconocida: «${row.date}».`);
    const record = (outcome: KolOutcomeKind, correctChanged = false, textChanged = false) =>
      outcomes.push({
        id,
        source: row.source,
        state,
        outcome,
        correctChanged,
        textChanged,
        reviewer,
        reviewedAt,
      });

    const matrix = norm(row.matrixCorrect).toUpperCase();
    if (matrix && matrix !== correctLetter(base)) {
      issue(
        "error",
        `La hoja está desfasada: «Correcta (matriz)» = ${matrix} y el banco tiene ${correctLetter(base)}. Regenera la hoja.`,
      );
      record("unchanged");
      continue;
    }

    if (state === "pendiente" || state === "sin_estado") {
      if (norm(row.explanation) || norm(row.reference) || norm(row.correct))
        issue("warning", "Hay revisión escrita pero el estado sigue «Pendiente».");
      record("unchanged");
      continue;
    }
    if (state === "rechazada") {
      questions[idx] = { ...base, status: "rejected" };
      record("rejected");
      continue;
    }

    // Aprobada / Aprobada con cambios
    const pending = (message: string) => {
      issue("error", `${message} Sigue pendiente.`);
      record("pending");
    };

    const letter = norm(row.correct).toUpperCase() || correctLetter(base);
    const correctIdx = KOL_LETTERS.indexOf(letter as (typeof KOL_LETTERS)[number]);
    if (correctIdx < 0 || correctIdx >= base.options.length) {
      pending(`«Correcta tras revisión» no válida: «${row.correct}» (usa A, B, C o D).`);
      continue;
    }

    const parsed = parseKolChanges(row.changes);
    if (parsed.freeText.length) {
      pending(
        `Cambios en texto libre que hay que aplicar a mano: «${parsed.freeText.join(" / ")}». Usa líneas «Enunciado: …» o «A: …», o edita las celdas.`,
      );
      continue;
    }

    // Texto editado en las celdas E–I o descrito en N (N tiene prioridad).
    let stem = base.stem;
    const cellStem = norm(row.stem);
    if (cellStem && cellStem !== norm(base.stem)) stem = cellStem;
    if (parsed.stem) stem = parsed.stem;
    const texts = base.options.map((o, i) => {
      const letterI = KOL_LETTERS[i];
      const cell = norm(row.options?.[i]);
      return parsed.options[letterI] ?? (cell && cell !== norm(o.text) ? cell : o.text);
    });
    const textChanged = stem !== base.stem || texts.some((t, i) => t !== base.options[i].text);
    const correctChanged = correctIdx !== base.options.findIndex((o) => o.isCorrect);

    const explanation = (row.explanation ?? "").trim();
    const { references, problems } = parseKolReferences(row.reference, row.url);
    problems.forEach((p) => issue("warning", p));
    const missing = [!explanation && "explicación", !references.length && "referencia"].filter(
      Boolean,
    );
    if (missing.length) {
      pending(`Aprobada sin ${missing.join(" ni ")}: no puede pasar a competición.`);
      continue;
    }

    if (state === "aprobada" && textChanged)
      issue(
        "warning",
        "Marcada «Aprobada» pero el texto cambia: se aplica como «Aprobada con cambios».",
      );
    if (state === "aprobada_con_cambios" && !textChanged && !correctChanged)
      issue("warning", "Marcada «Aprobada con cambios» pero no se detecta ningún cambio.");
    if (correctChanged)
      issue("warning", `El KOL cambia la respuesta correcta: ${correctLetter(base)} → ${letter}.`);

    questions[idx] = {
      ...base,
      stem,
      options: base.options.map((o, i) => ({ ...o, text: texts[i], isCorrect: i === correctIdx })),
      explanation,
      references,
      status: "approved",
      validationLevel: "kol_verified",
    };
    record("approved", correctChanged, textChanged);
  }

  const count = (k: KolOutcomeKind) => outcomes.filter((o) => o.outcome === k).length;
  return {
    questions,
    outcomes,
    issues,
    summary: {
      rows: rows.length,
      approved: count("approved"),
      rejected: count("rejected"),
      pending: count("pending"),
      unchanged: count("unchanged"),
      errors: issues.filter((i) => i.level === "error").length,
      warnings: issues.filter((i) => i.level === "warning").length,
      correctChanged: outcomes.filter((o) => o.correctChanged).length,
    },
  };
}

/** UPDATEs para producción (Supabase) con lo aprobado o rechazado. Idempotente. */
export function kolReviewSql<T extends Question>(
  result: KolReviewResult<T>,
  header: string[] = [],
): string {
  const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
  const byId = new Map(result.questions.map((x) => [x.id, x]));
  const out = [
    "-- RADAR HUNT — revisión Medical/KOL del banco de los Hunts.",
    "-- GENERADO por scripts/radar-hunt/kol-review-report.ts: no editar a mano.",
    ...header.map((h) => `-- ${h}`),
    "begin;",
  ];
  for (const o of result.outcomes) {
    if (o.outcome !== "approved" && o.outcome !== "rejected") continue;
    const x = byId.get(o.id)!;
    const reviewed = o.reviewedAt ? `${q(o.reviewedAt)}::timestamptz` : "now()";
    out.push(`-- ${o.id} · ${o.state}${o.reviewer ? ` · ${o.reviewer.replace(/\n/g, " ")}` : ""}`);
    if (o.outcome === "rejected") {
      out.push(
        `update public.rh_questions set status = 'rejected', reviewed_at = ${reviewed}, updated_at = now() where id = ${q(x.id)};`,
      );
      continue;
    }
    out.push(
      `update public.rh_questions set stem = ${q(x.stem)}, explanation = ${q(x.explanation)}, "references" = ${q(JSON.stringify(x.references))}::jsonb, status = 'approved', validation_level = 'kol_verified', reviewed_at = ${reviewed}, updated_at = now() where id = ${q(x.id)};`,
    );
    for (const opt of x.options)
      out.push(
        `update public.rh_question_options set text = ${q(opt.text)}, is_correct = ${opt.isCorrect} where id = ${q(opt.id)};`,
      );
  }
  out.push("commit;", "");
  return out.join("\n");
}
