import { describe, expect, it } from "vitest";
import { HUNT_BANK, HUNT_KOL_REVIEW } from "./hunt-bank";
import { KOL_REVIEW_ROWS } from "./hunt-kol-review";
import {
  applyKolReview,
  kolReviewSql,
  normalizeKolDate,
  normalizeKolState,
  normalizeKolUrl,
  parseKolChanges,
  parseKolReferences,
  type KolReviewRow,
} from "./kol-review";
import { isPlayableInCompetition } from "./rounds";
import { HUNT_QUESTIONS } from "./seed-hunt-matrix";

// hm-gen-01-q1: correcta B («Uveítis anterior»).
const Q = HUNT_QUESTIONS.find((q) => q.id === "hm-gen-01-q1")!;
const row = (over: Partial<KolReviewRow> = {}): KolReviewRow => ({
  id: Q.id,
  source: "test › Revisión fila 2",
  state: "Aprobada",
  stem: Q.stem,
  options: Q.options.map((o) => o.text),
  matrixCorrect: "B",
  explanation:
    "La tríada dolor-fotofobia-miosis con células en cámara anterior define la uveítis anterior.",
  reference: "SUN Working Group. Am J Ophthalmol. 2005;140:509-16.",
  url: "10.1016/j.ajo.2005.03.057",
  reviewer: "Dra. Revisora",
  date: "20/11/2026",
  ...over,
});
const one = (r: KolReviewRow) => {
  const res = applyKolReview(HUNT_QUESTIONS, [r]);
  return { ...res, q: res.questions.find((x) => x.id === Q.id)! };
};

describe("revisión KOL · utilidades", () => {
  it("normaliza estados del desplegable", () => {
    expect(normalizeKolState("Aprobada con cambios")).toBe("aprobada_con_cambios");
    expect(normalizeKolState(" aprobada ")).toBe("aprobada");
    expect(normalizeKolState("RECHAZADA")).toBe("rechazada");
    expect(normalizeKolState("")).toBe("sin_estado");
    expect(normalizeKolState("Quizás")).toBeNull();
  });

  it("interpreta cambios estructurados y separa el texto libre", () => {
    const c = parseKolChanges("Enunciado: Nuevo enunciado\nC: Nueva opción C\nopción d) Otra D");
    expect(c).toEqual({
      stem: "Nuevo enunciado",
      options: { C: "Nueva opción C", D: "Otra D" },
      freeText: [],
    });
    expect(parseKolChanges("Ninguno").freeText).toEqual([]);
    expect(parseKolChanges("Revisar la redacción").freeText).toEqual(["Revisar la redacción"]);
  });

  it("DOI, URL, referencias y fechas", () => {
    expect(normalizeKolUrl("doi:10.1016/j.ajo.2005.03.057")).toBe(
      "https://doi.org/10.1016/j.ajo.2005.03.057",
    );
    expect(normalizeKolUrl("https://www.aao.org/ppp")).toBe("https://www.aao.org/ppp");
    expect(normalizeKolUrl("pubmed")).toBeNull();
    const r = parseKolReferences("Cita 1\nCita 2", "10.1001/abc\nhttps://x.org/y\nhttps://z.org");
    expect(r.references).toEqual([
      { citation: "Cita 1", url: "https://doi.org/10.1001/abc" },
      { citation: "Cita 2", url: "https://x.org/y" },
    ]);
    expect(r.problems).toHaveLength(1);
    expect(normalizeKolDate("2026-11-20")).toBe("2026-11-20");
    expect(normalizeKolDate("5/1/2027")).toBe("2027-01-05");
    expect(normalizeKolDate("mañana")).toBeUndefined();
  });
});

describe("revisión KOL · reglas", () => {
  it("«Aprobada» con explicación y referencia → jugable en competición", () => {
    const { q, issues, summary } = one(row());
    expect(issues).toEqual([]);
    expect(summary.approved).toBe(1);
    expect(q).toMatchObject({ status: "approved", validationLevel: "kol_verified" });
    expect(q.references[0].url).toBe("https://doi.org/10.1016/j.ajo.2005.03.057");
    expect(isPlayableInCompetition(q)).toBe(true);
    expect(q.options.map((o) => o.isCorrect)).toEqual([false, true, false, false]);
    expect(isPlayableInCompetition(Q)).toBe(false);
  });

  it("aprobada sin explicación o sin referencia → sigue pendiente, con error", () => {
    for (const over of [{ explanation: "" }, { reference: "", url: "" }]) {
      const { q, issues, summary } = one(row(over));
      expect(q).toBe(Q);
      expect(summary.pending).toBe(1);
      expect(issues[0].level).toBe("error");
      expect(isPlayableInCompetition(q)).toBe(false);
    }
  });

  it("aplica la correcta tras revisión y avisa del cambio", () => {
    const { q, issues, outcomes } = one(row({ state: "Aprobada con cambios", correct: "c" }));
    expect(q.options.map((o) => o.isCorrect)).toEqual([false, false, true, false]);
    expect(outcomes[0].correctChanged).toBe(true);
    expect(issues.some((i) => i.message.includes("B → C"))).toBe(true);
  });

  it("letra correcta inválida → pendiente", () => {
    const { q, summary } = one(row({ correct: "E" }));
    expect(q).toBe(Q);
    expect(summary.pending).toBe(1);
  });

  it("cambios estructurados en N y ediciones directas en las celdas", () => {
    const opts = Q.options.map((o) => o.text);
    opts[3] = "Oclusión de rama venosa";
    const { q, outcomes } = one(
      row({
        state: "Aprobada con cambios",
        changes: "Enunciado: Enunciado revisado",
        options: opts,
      }),
    );
    expect(q.stem).toBe("Enunciado revisado");
    expect(q.options[3].text).toBe("Oclusión de rama venosa");
    expect(q.options[3].id).toBe(Q.options[3].id);
    expect(outcomes[0].textChanged).toBe(true);
  });

  it("cambios en texto libre → pendiente para edición manual", () => {
    const { q, issues } = one(
      row({ state: "Aprobada con cambios", changes: "Mejorar la opción A" }),
    );
    expect(q).toBe(Q);
    expect(issues[0].message).toContain("texto libre");
  });

  it("rechazada → rejected; pendiente → sin cambios (con aviso si hay texto)", () => {
    expect(one(row({ state: "Rechazada" })).q.status).toBe("rejected");
    const p = one(row({ state: "Pendiente" }));
    expect(p.q).toBe(Q);
    expect(p.issues[0].level).toBe("warning");
  });

  it("errores: id desconocido, duplicado, estado raro, hoja desfasada", () => {
    const res = applyKolReview(HUNT_QUESTIONS, [
      row({ id: "hm-xxx-q9" }),
      row(),
      row(),
      row({ id: "hm-gen-01-q2", state: "Tal vez" }),
      row({ id: "hm-gen-01-q3", matrixCorrect: "B" }), // en el banco es A
    ]);
    expect(res.summary.errors).toBe(4);
    expect(res.summary.approved).toBe(1);
    const q3 = res.questions.find((q) => q.id === "hm-gen-01-q3")!;
    expect(q3.status).toBe("pending_review");
  });

  it("no muta el banco original", () => {
    const before = JSON.stringify(HUNT_QUESTIONS);
    applyKolReview(HUNT_QUESTIONS, [row({ state: "Aprobada con cambios", correct: "A" })]);
    expect(JSON.stringify(HUNT_QUESTIONS)).toBe(before);
  });

  it("SQL de producción: solo aprobadas y rechazadas, con comillas escapadas", () => {
    const res = applyKolReview(HUNT_QUESTIONS, [
      row({ explanation: "Perla con 'comillas'." }),
      row({ id: "hm-gen-01-q2", matrixCorrect: "D", state: "Rechazada" }),
      row({ id: "hm-gen-01-q3", matrixCorrect: "A", state: "Pendiente" }),
    ]);
    const sql = kolReviewSql(res);
    expect(sql).toContain("Perla con ''comillas''.");
    expect(sql).toContain("validation_level = 'kol_verified'");
    expect(sql).toContain("'2026-11-20'::timestamptz");
    expect(sql).toContain("set status = 'rejected'");
    expect(sql).not.toContain("hm-gen-01-q3");
    expect(sql.match(/update public\.rh_question_options/g)).toHaveLength(4);
  });
});

describe("banco de los Hunts con la revisión importada", () => {
  it("la importación actual se aplica sin errores", () => {
    expect(HUNT_KOL_REVIEW.issues.filter((i) => i.level === "error")).toEqual([]);
    expect(HUNT_BANK).toHaveLength(HUNT_QUESTIONS.length);
    expect(HUNT_KOL_REVIEW.summary.rows).toBe(KOL_REVIEW_ROWS.length);
  });

  it("toda pregunta aprobada es jugable en competición (explicación + referencia)", () => {
    for (const q of HUNT_BANK.filter((x) => x.status === "approved")) {
      expect(isPlayableInCompetition(q), q.id).toBe(true);
      expect(q.explanation.length).toBeGreaterThan(0);
      expect(q.options.filter((o) => o.isCorrect)).toHaveLength(1);
    }
  });
});
