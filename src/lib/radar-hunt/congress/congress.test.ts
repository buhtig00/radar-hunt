import { describe, expect, it } from "vitest";
import { createGameCore } from "../game-core";
import { createMemoryRepo } from "../repo-memory";
import type { Question } from "../types";
import { createCongressCore, effectivePhase, stationRoundId, type CongressActor } from "./core";
import { csvCell, toCsv } from "./csv";
import { rankEvent, rankHospitals } from "./ranking";
import { createCongressMemoryRepo, emptyCongressState, memoryStationAccess } from "./repo-memory";
import { generateToken, manualCode, normalizeCode, parseScan, TOKEN_LENGTH } from "./tokens";
import type { CongressEvent, Station } from "./types";

const q = (id: string, ok = true, correct = "a"): Question => ({
  id,
  type: "single_choice",
  subspecialty: "glaucoma",
  careerLevel: "both",
  difficulty: 1,
  cognitiveLevel: "recall",
  stem: `Pregunta ${id}`,
  options: ["a", "b", "c", "d"].map((o) => ({
    id: o,
    text: o.toUpperCase(),
    isCorrect: o === correct,
  })),
  explanation: "Explicación",
  references: ok ? [{ citation: "Guía de referencia" }] : [],
  status: ok ? "approved" : "pending_review",
  validationLevel: ok ? "kol_verified" : "ai_generated",
  aiAssisted: false,
});

const T0 = Date.parse("2026-11-05T09:00:00Z");
const EVENT: CongressEvent = {
  id: "ev1",
  slug: "congreso-prueba",
  name: "Congreso de prueba",
  venue: "Sede",
  city: "Ciudad",
  timezone: "Europe/Madrid",
  startsAt: "2026-11-05T08:00:00Z",
  endsAt: "2026-11-06T18:00:00Z",
  gameOpensAt: "2026-11-05T08:00:00Z",
  gameClosesAt: "2026-11-06T18:00:00Z",
  status: "published",
  floors: [{ id: "f1", name: "Planta baja", order: 0, rooms: [] }],
  sponsors: [],
  recognition: "Diploma",
};
const STATION: Station = {
  id: "st1",
  eventId: "ev1",
  label: "E1",
  title: "Glaucoma",
  description: "",
  floorId: "f1",
  x: 50,
  y: 50,
  subspecialty: "glaucoma",
  questionIds: ["q1", "q2"],
  active: true,
};
const STAFF: CongressActor = { userId: "staff", isStaff: true };
const ME = { userId: "u1", profileName: "Ana Pérez", hospital: "Hospital A" };

function setup(onlyPlayable = true) {
  let now = T0;
  const questions = [q("q1"), q("q2", true, "b"), q("q3"), q("bad", false)];
  const cstate = emptyCongressState();
  const game = createMemoryRepo({
    questions,
    rounds: [],
    bossCases: [],
    clock: () => now,
    access: memoryStationAccess(cstate),
  });
  const repo = createCongressMemoryRepo({
    state: cstate,
    clock: () => now,
    game: { addRound: (r) => game.addRound(r), attempts: () => game.state.attempts, questions },
  });
  const core = createCongressCore(repo, { onlyPlayable });
  const gcore = createGameCore(game, {
    requireVerifiedForLeagues: true,
    competitionOnlyPlayable: onlyPlayable,
  });
  return {
    core,
    gcore,
    repo,
    cstate,
    tick: (ms: number) => (now += ms),
    async init() {
      await core.saveEvent(STAFF, EVENT);
      await core.saveStation(STAFF, STATION);
      const ov = await core.adminOverview(STAFF, EVENT.slug);
      return ov.stations[0].token;
    },
    join: (p = ME, publicRanking = true) =>
      core.join(EVENT.slug, p, {
        consents: { participation: true, publicRanking, communications: false },
      }),
  };
}

describe("tokens QR", () => {
  it("genera tokens de 20 caracteres sin caracteres ambiguos y códigos manuales", () => {
    const t = generateToken();
    expect(t).toHaveLength(TOKEN_LENGTH);
    expect(t).toMatch(/^[0-9A-HJKMNP-TV-Z]+$/);
    expect(generateToken()).not.toBe(t);
    expect(manualCode("ABCDEFGH1234567890AB")).toBe("ABCD-EFGH");
  });
  it("interpreta URL, token suelto y código manual", () => {
    const t = "ABCDEFGH1234567890AB";
    expect(parseScan(`https://x.app/radar-hunt/congresos/s/e/${t}`)).toEqual({ token: t });
    expect(parseScan(t.toLowerCase())).toEqual({ token: t });
    expect(parseScan("abcd-efgh")).toEqual({ code: "ABCDEFGH" });
    expect(parseScan("hola")).toBeNull();
    expect(normalizeCode("o1-il")).toBe("0111");
  });
});

describe("CSV", () => {
  it("usa «;», BOM, comillas, decimales con coma y neutraliza fórmulas", () => {
    const csv = toCsv(
      ["a", "b"],
      [
        ["x;y", 1.5],
        ['di "hola"', true],
        ["=SUM(A1)", null],
      ],
    );
    expect(csv.startsWith("﻿a;b\r\n")).toBe(true);
    expect(csv).toContain('"x;y";1,5');
    expect(csv).toContain('"di ""hola""";sí');
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell(-3)).toBe("-3");
  });
});

describe("clasificaciones del congreso", () => {
  const e = (userId: string, stationScore: number, correct = 1, totalMs = 1000) => ({
    userId,
    stationScore,
    liveScore: 0,
    correct,
    totalMs,
    stationsDone: 1,
  });
  it("ordena por puntos, aciertos y tiempo, con empates compartidos", () => {
    const rows = rankEvent({
      entries: [e("a", 100), e("b", 200), e("c", 100), e("d", 100, 2)],
      name: (u) => u,
      hospital: () => undefined,
    });
    expect(rows.map((r) => [r.userId, r.rank])).toEqual([
      ["b", 1],
      ["d", 2],
      ["a", 3],
      ["c", 3],
    ]);
  });
  it("centros: media de los 5 mejores y mínimo 3 participantes", () => {
    const rows = rankEvent({
      entries: [100, 200, 300, 400, 500, 600]
        .map((s, i) => e(`h${i}`, s))
        .concat([e("x1", 900), e("x2", 900)]),
      name: (u) => u,
      hospital: (u) =>
        u.startsWith("h") ? (u === "h0" ? " hospital á " : "Hospital A") : "Clínica X",
    });
    const hs = rankHospitals(rows);
    expect(hs).toHaveLength(1); // Clínica X solo tiene 2
    expect(hs[0].participants).toBe(6);
    expect(hs[0].score).toBe(400); // (600+500+400+300+200)/5
  });
});

describe("estaciones", () => {
  it("exige consentimiento, inscripción y escaneo antes de jugar", async () => {
    const t = setup();
    const token = await t.init();
    await expect(
      t.core.join(EVENT.slug, ME, {
        consents: { participation: false, publicRanking: false, communications: false },
      }),
    ).rejects.toThrow(/aceptar las bases/);
    await expect(t.core.scan(ME, { token })).rejects.toThrow(/Inscríbete/);
    await t.join();
    await expect(
      t.gcore.start({ userId: "u1", verification: "unverified" }, stationRoundId("st1")),
    ).rejects.toThrow(/Escanea el código QR/);
    await expect(t.core.scan(ME, { token: "X".repeat(20) })).rejects.toThrow(/Código no válido/);
    const r = await t.core.scan(ME, { token });
    expect(r.roundId).toBe("cs:st1");
    expect(r.firstVisit).toBe(true);
    expect((await t.core.scan(ME, { token })).firstVisit).toBe(false);

    const player = { userId: "u1", verification: "unverified" as const };
    const att = await t.gcore.start(player, r.roundId);
    for (let i = 0; i < 2; i++) {
      const nq = await t.gcore.nextQuestion(player, att.id);
      t.tick(2000);
      await t.gcore.answer(player, att.id, nq!.question.id, [i === 0 ? "a" : "b"]);
    }
    const view = await t.core.eventView(EVENT.slug, ME);
    expect(view.stations[0].status).toBe("done");
    expect(view.me?.rank).toBe(1);
    expect(view.me?.score).toBe(200); // 2 aciertos × 100 RP: la rapidez no suma en estaciones
  });

  it("el código manual funciona y rotar el QR invalida el anterior", async () => {
    const t = setup();
    const token = await t.init();
    await t.join();
    await t.core.scan(ME, { code: manualCode(token).toLowerCase(), slug: EVENT.slug });
    const fresh = await t.core.rotateToken(STAFF, "st1");
    expect(fresh.token).not.toBe(token);
    await expect(t.core.scan(ME, { token })).rejects.toThrow(/Código no válido/);
    await expect(t.core.rotateToken({ userId: "u1", isStaff: false }, "st1")).rejects.toThrow(
      /organización/,
    );
  });

  it("fuera de la ventana de juego no se puede escanear y los borradores no se ven", async () => {
    const t = setup();
    const token = await t.init();
    await t.join();
    t.tick(3 * 24 * 3600_000);
    await expect(t.core.scan(ME, { token })).rejects.toThrow(/terminado/);
    await t.core.saveEvent(STAFF, { ...EVENT, status: "draft" });
    expect(await t.core.listEvents()).toHaveLength(0);
    expect(await t.core.listEvents(STAFF)).toHaveLength(1);
  });

  it("en producción solo admite preguntas validadas con referencia", async () => {
    const t = setup(true);
    await t.core.saveEvent(STAFF, EVENT);
    await expect(t.core.saveStation(STAFF, { ...STATION, questionIds: ["bad"] })).rejects.toThrow(
      /validadas/,
    );
    const sug = await t.core.suggestQuestions(STAFF, "glaucoma", "x");
    expect(sug).not.toContain("bad");
    expect(sug.length).toBe(3);
  });

  it("el patrocinio lleva siempre su texto de transparencia", async () => {
    const t = setup();
    await t.core.saveEvent(STAFF, EVENT);
    const s = await t.core.saveStation(STAFF, {
      ...STATION,
      sponsor: { name: "Marca", disclosure: "otro" },
    });
    expect(s.sponsor?.disclosure).toMatch(/no ha elaborado, seleccionado ni revisado/);
  });

  it("la clasificación pública respeta el consentimiento", async () => {
    const t = setup();
    const token = await t.init();
    await t.join(ME, false);
    await t.core.scan(ME, { token });
    const player = { userId: "u1", verification: "unverified" as const };
    const att = await t.gcore.start(player, "cs:st1");
    for (let i = 0; i < 2; i++) {
      const nq = await t.gcore.nextQuestion(player, att.id);
      await t.gcore.answer(player, att.id, nq!.question.id, ["a"]);
    }
    const r = await t.core.ranking(EVENT.slug);
    expect(r.individual[0].name).toBe("Participante anónimo");
  });
});

describe("directo en sala", () => {
  async function liveSetup() {
    const t = setup();
    await t.init();
    await t.join();
    await t.join({ userId: "u2", profileName: "Luis Gil", hospital: "Hospital A" });
    await t.core.saveSession(STAFF, {
      id: "s1",
      eventId: "ev1",
      title: "Sesión de glaucoma",
      room: "Auditorio",
      items: [
        { id: "i1", kind: "quiz", questionId: "q2", timeLimitS: 20 },
        {
          id: "i2",
          kind: "poll",
          prompt: "¿Qué prefieres?",
          options: [
            { id: "x", text: "X" },
            { id: "y", text: "Y" },
          ],
          timeLimitS: 15,
        },
      ],
    });
    return t;
  }

  it("no entrega la pregunta antes de abrirla ni la respuesta antes de revelarla", async () => {
    const t = await liveSetup();
    expect(await t.core.liveView(EVENT.slug, ME, "s1")).toMatchObject({ phase: "idle" });
    expect((await t.core.liveView(EVENT.slug, ME, "s1"))?.item).toBeUndefined();
    await expect(
      t.core.answerLive(EVENT.slug, ME, { sessionId: "s1", itemId: "i1", selected: ["b"] }),
    ).rejects.toThrow(/cerrada/);
    await t.core.moderate(STAFF, "s1", "open", 0);
    const v = await t.core.liveView(EVENT.slug, ME);
    expect(v?.item?.stem).toBe("Pregunta q2");
    expect(v?.reveal).toBeUndefined();
    expect(JSON.stringify(v)).not.toContain('isCorrect":true');
  });

  it("mide el tiempo desde la apertura en el servidor, una respuesta por persona", async () => {
    const t = await liveSetup();
    await t.core.moderate(STAFF, "s1", "open", 0);
    t.tick(5000);
    const a = await t.core.answerLive(EVENT.slug, ME, {
      sessionId: "s1",
      itemId: "i1",
      selected: ["b"],
    });
    expect(a.responseMs).toBe(5000);
    expect(a.isCorrect).toBe(true);
    expect(a.points).toBeGreaterThan(100);
    await expect(
      t.core.answerLive(EVENT.slug, ME, { sessionId: "s1", itemId: "i1", selected: ["a"] }),
    ).rejects.toThrow(/Ya has respondido/);
    t.tick(20_000);
    expect(effectivePhase(t.cstate.live[0], Date.parse("2100-01-01"))).toBe("closed");
    await expect(
      t.core.answerLive(
        EVENT.slug,
        { userId: "u2" },
        { sessionId: "s1", itemId: "i1", selected: ["b"] },
      ),
    ).rejects.toThrow(/cerrada/);
    await t.core.moderate(STAFF, "s1", "reveal");
    const v = await t.core.liveView(EVENT.slug, ME);
    expect(v?.reveal?.correctOptionIds).toEqual(["b"]);
    expect(v?.reveal?.tally.b).toBe(1);
    expect(v?.myAnswer?.isCorrect).toBe(true);
    const sala = await t.core.sala(EVENT.slug);
    expect(sala.top[0].liveScore).toBeGreaterThan(100);
    await expect(t.core.moderate(STAFF, "s1", "open", 0)).rejects.toThrow(/ya se ha lanzado/);
  });

  it("encuesta de sala: recuento al cerrar, sin puntos", async () => {
    const t = await liveSetup();
    await t.core.moderate(STAFF, "s1", "open", 1);
    await t.core.answerLive(EVENT.slug, ME, { sessionId: "s1", itemId: "i2", selected: ["y"] });
    await t.core.answerLive(
      EVENT.slug,
      { userId: "u2" },
      { sessionId: "s1", itemId: "i2", selected: ["y", "x"] },
    );
    expect((await t.core.liveView(EVENT.slug, ME))?.reveal).toBeUndefined();
    await t.core.moderate(STAFF, "s1", "close");
    const v = await t.core.liveView(EVENT.slug, ME);
    expect(v?.reveal?.tally).toEqual({ x: 0, y: 2 });
    expect(t.cstate.liveAnswers.every((a) => a.points === 0)).toBe(true);
    const exp = await t.core.exportCsv(STAFF, EVENT.slug, "live");
    expect(exp.csv).toContain("Y: 2");
  });

  it("solo la organización modera y las encuestas se validan", async () => {
    const t = await liveSetup();
    await expect(
      t.core.moderate({ userId: "u1", isStaff: false }, "s1", "open", 0),
    ).rejects.toThrow(/organización/);
    await expect(
      t.core.saveSession(STAFF, {
        id: "s2",
        eventId: "ev1",
        title: "X",
        room: "",
        items: [
          {
            id: "p",
            kind: "poll",
            prompt: "¿?",
            options: [{ id: "a", text: "A" }],
            timeLimitS: 10,
          },
        ],
      }),
    ).rejects.toThrow(/de 2 a 6 opciones/);
  });
});

describe("valoración y exportaciones", () => {
  it("una valoración por persona; la exportación no identifica a nadie", async () => {
    const t = setup();
    await t.init();
    await t.join();
    await t.core.submitFeedback(EVENT.slug, ME, {
      overall: 5,
      stations: 4,
      live: 5,
      recommend: 10,
      comment: "Muy útil",
    });
    await expect(
      t.core.submitFeedback(EVENT.slug, ME, { overall: 1, stations: 1, live: 1, recommend: 0 }),
    ).rejects.toThrow(/Ya has enviado/);
    const fb = await t.core.exportCsv(STAFF, EVENT.slug, "feedback");
    expect(fb.csv).toContain("Muy útil");
    expect(fb.csv).not.toContain("Ana");
    const ps = await t.core.exportCsv(STAFF, EVENT.slug, "participants");
    expect(ps.csv).toContain("Comunicaciones de Ophthalmology Radar");
    const ov = await t.core.adminOverview(STAFF, EVENT.slug);
    expect(ov.feedback.nps).toBe(100);
    await expect(
      t.core.exportCsv({ userId: "u1", isStaff: false }, EVENT.slug, "participants"),
    ).rejects.toThrow();
  });
});
