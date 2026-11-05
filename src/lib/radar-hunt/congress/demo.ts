// RADAR HUNT — modo congreso en DEMOSTRACIÓN (navegador, sin backend). Usa el mismo núcleo
// que producción. El congreso, la sede y los participantes son FICTICIOS y se etiquetan
// como tales. Se sincroniza entre pestañas (moderación ↔ pantalla de sala) vía localStorage.
import { DEMO_USER_ID, demoGame } from "../demo-service";
import { seededRandom } from "../rounds";
import { scoreAnswer } from "../scoring";
import type { Attempt } from "../types";
import {
  createCongressCore,
  effectivePhase,
  RECOGNITION_POLICY,
  stationRoundId,
  type CongressActor,
  type CongressPlayer,
  type CongressRepo,
} from "./core";
import {
  congressDemoState,
  reloadCongressDemo,
  resetCongressDemo,
  saveCongressDemo,
} from "./demo-state";
import { createCongressMemoryRepo } from "./repo-memory";
import { HUNT_STATIONS } from "../seed-hunt-matrix";
import type { CongressService } from "./service-types";
import { proposalSchema } from "../proposal";
import type { ProgressSummary } from "../season";
import type { CongressEvent, Floor, LiveSession, Station } from "./types";

export const DEMO_EVENT_ID = "demo-congreso";
export const DEMO_EVENT_SLUG = "congreso-demo";
const BOTS = 18;
const BOT_HOSPITALS = [
  "Hospital Demo Norte",
  "Hospital Demo Sur",
  "Hospital Demo Centro",
  "Clínica Demo Este",
];

function isStaffRole(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const r = window.localStorage.getItem("or-role") ?? "admin";
    return r === "admin" || r === "medical_editor";
  } catch {
    return true;
  }
}

const FLOORS: Floor[] = [
  {
    id: "pb",
    name: "Planta baja",
    order: 0,
    rooms: [
      { id: "hall", name: "Hall y acreditaciones", x: 4, y: 58, w: 34, h: 36 },
      { id: "expo", name: "Zona de exposición", x: 42, y: 52, w: 54, h: 42 },
      { id: "audA", name: "Auditorio A", x: 4, y: 6, w: 46, h: 44 },
      { id: "cafe", name: "Café", x: 56, y: 6, w: 40, h: 38 },
    ],
  },
  {
    id: "p1",
    name: "Planta 1",
    order: 1,
    rooms: [
      { id: "s1", name: "Sala 1", x: 4, y: 6, w: 44, h: 40 },
      { id: "s2", name: "Sala 2", x: 52, y: 6, w: 44, h: 40 },
      { id: "poster", name: "Pósteres y vídeos", x: 4, y: 54, w: 92, h: 40 },
    ],
  },
  {
    id: "p2",
    name: "Planta 2",
    order: 2,
    rooms: [
      { id: "aulas", name: "Aulas de casos clínicos", x: 4, y: 6, w: 92, h: 40 },
      { id: "talleres", name: "Talleres", x: 4, y: 54, w: 60, h: 40 },
      { id: "terraza", name: "Terraza", x: 68, y: 54, w: 28, h: 40 },
    ],
  },
];

function demoEvent(now: number): CongressEvent {
  const d = new Date(now);
  const day0 = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const iso = (ms: number) => new Date(ms).toISOString();
  return {
    id: DEMO_EVENT_ID,
    slug: DEMO_EVENT_SLUG,
    name: "Congreso Demo de Oftalmología",
    venue: "Palacio de Congresos (sede ficticia)",
    city: "Ciudad Demo",
    timezone: "Europe/Madrid",
    startsAt: iso(day0 - 24 * 3600_000),
    endsAt: iso(day0 + 2 * 24 * 3600_000 - 1),
    gameOpensAt: iso(day0 - 24 * 3600_000),
    gameClosesAt: iso(day0 + 2 * 24 * 3600_000 - 1),
    status: "published",
    floors: FLOORS,
    sponsors: [
      {
        name: "Patrocinador Demo",
        disclosure:
          "Patrocinador ficticio de demostración. Los patrocinadores no elaboran, seleccionan ni revisan las preguntas y no reciben datos personales.",
      },
    ],
    recognition: RECOGNITION_POLICY,
    isDemo: true,
  };
}

/**
 * Estaciones del Hunt demo: las 23 estaciones CIENTÍFICAS de la «Matriz de 8 estaciones por
 * perfil» (contenido candidato, pendiente de Medical/KOL), con sus 5 preguntas RADARS.
 * Repartidas por recorrido (perfil de liga) en las tres plantas de la sede ficticia.
 */
const TRACK_AREAS: Record<string, { floorId: string; x: number; y: number; w: number; h: number }> =
  {
    general: { floorId: "pb", x: 8, y: 64, w: 26, h: 26 },
    anterior: { floorId: "pb", x: 46, y: 58, w: 22, h: 30 },
    retina: { floorId: "pb", x: 72, y: 58, w: 22, h: 30 },
    glaucoma: { floorId: "p1", x: 8, y: 62, w: 84, h: 26 },
    neuroped: { floorId: "p1", x: 8, y: 14, w: 84, h: 26 },
    oculoplastia: { floorId: "p2", x: 8, y: 14, w: 84, h: 26 },
  };
const LABEL_PREFIX: Record<string, string> = {
  GEN: "GN",
  ANT: "AN",
  RET: "RE",
  GLA: "GL",
  PED: "PE",
  NEU: "NE",
  OCP: "OC",
};

const STATION_SEED: Omit<Station, "eventId" | "active">[] = (() => {
  const byTrack = new Map<string, typeof HUNT_STATIONS>();
  for (const st of HUNT_STATIONS) byTrack.set(st.track, [...(byTrack.get(st.track) ?? []), st]);
  const out: Omit<Station, "eventId" | "active">[] = [];
  for (const [track, list] of byTrack) {
    const area = TRACK_AREAS[track];
    const cols = Math.min(list.length, list.length > 3 ? Math.ceil(list.length / 2) : list.length);
    const rows = Math.ceil(list.length / cols);
    list.forEach((st, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const [pre, num] = st.code.split("-");
      out.push({
        id: `demo-${st.code.toLowerCase()}`,
        label: `${LABEL_PREFIX[pre]}${Number(num)}`,
        title: st.title,
        description: `${st.code} · Recorrido ${st.trackLabel}. Contenido candidato pendiente de validación Medical/KOL.`,
        floorId: area.floorId,
        x: Math.round(area.x + (area.w * (c + 0.5)) / cols),
        y: Math.round(area.y + (area.h * (r + 0.5)) / rows),
        subspecialty: st.subspecialty,
        track,
        questionIds: st.radarIds,
      });
    });
  }
  return out;
})();

function sessionsSeed(): LiveSession[] {
  const xp = (code: string, n: number) => `hm-${code.toLowerCase()}-q${n}`;
  const quiz = (id: string, questionId: string) => ({
    id,
    kind: "quiz" as const,
    questionId,
    timeLimitS: 20,
  });
  return [
    {
      id: "demo-ses-retina",
      eventId: DEMO_EVENT_ID,
      title: "Sesión de casos: retina médica",
      room: "Auditorio A",
      speaker: "Ponente demo",
      items: [
        quiz("r1", xp("RET-01", 6)),
        quiz("r2", xp("RET-02", 6)),
        quiz("r3", xp("RET-03", 6)),
        {
          id: "r-poll",
          kind: "poll",
          prompt: "¿Qué tema de retina te gustaría profundizar en la próxima edición?",
          options: [
            { id: "a", text: "DMAE" },
            { id: "b", text: "Edema macular diabético" },
            { id: "c", text: "Oclusiones venosas" },
            { id: "d", text: "Imagen multimodal" },
          ],
          timeLimitS: 15,
        },
      ],
    },
    {
      id: "demo-ses-glaucoma",
      eventId: DEMO_EVENT_ID,
      title: "Mesa redonda: decisiones en glaucoma",
      room: "Sala 1",
      speaker: "Moderador demo",
      items: [
        quiz("g1", xp("GLA-01", 6)),
        quiz("g2", xp("GLA-02", 6)),
        {
          id: "g-poll",
          kind: "poll",
          prompt: "¿Con qué confianza interpretas la progresión en el campo visual?",
          options: [
            { id: "a", text: "Mucha" },
            { id: "b", text: "Bastante" },
            { id: "c", text: "Poca" },
          ],
          timeLimitS: 15,
        },
      ],
    },
  ];
}

function buildRepo(): CongressRepo {
  return createCongressMemoryRepo({
    state: congressDemoState(),
    onChange: saveCongressDemo,
    game: {
      addRound: (r) => demoGame.repo().addRound(r),
      attempts: () => demoGame.state().attempts,
      questions: demoGame.questions,
    },
  });
}

const SYSTEM: CongressActor = { userId: "demo-system", isStaff: true };

/** Siembra (una vez) el congreso demo y mantiene sus fechas en torno a hoy. */
async function ensureSeed(repo: CongressRepo) {
  const core = createCongressCore(repo, { onlyPlayable: false });
  const now = repo.now();
  const existing = await repo.getEvent(DEMO_EVENT_ID);
  const fresh = demoEvent(now);
  if (existing) {
    if (existing.gameClosesAt !== fresh.gameClosesAt)
      await repo.saveEvent({
        ...existing,
        startsAt: fresh.startsAt,
        endsAt: fresh.endsAt,
        gameOpensAt: fresh.gameOpensAt,
        gameClosesAt: fresh.gameClosesAt,
      });
    return;
  }
  await core.saveEvent(SYSTEM, fresh);
  for (const s of STATION_SEED) {
    await core.saveStation(SYSTEM, { ...s, eventId: DEMO_EVENT_ID, active: true });
  }
  for (const s of sessionsSeed()) await core.saveSession(SYSTEM, s);
  // Participantes ficticios con algunas estaciones ya completadas.
  const game = demoGame.state();
  for (let i = 1; i <= BOTS; i++) {
    const userId = `bot:congreso:${String(i).padStart(2, "0")}`;
    const rnd = seededRandom(userId);
    await repo.saveParticipant({
      eventId: DEMO_EVENT_ID,
      userId,
      displayName: `Participante demo ${String(i).padStart(2, "0")}`,
      hospital: BOT_HOSPITALS[i % BOT_HOSPITALS.length],
      careerStage: i % 3 === 0 ? "resident" : "attending",
      joinedAt: fresh.gameOpensAt,
      consents: { participation: true, publicRanking: i % 5 !== 0, communications: false },
    });
    for (const st of STATION_SEED) {
      if (rnd() > 0.3) continue;
      await repo.saveVisit({
        eventId: DEMO_EVENT_ID,
        stationId: st.id,
        userId,
        scannedAt: fresh.gameOpensAt,
      });
      const correct = Math.floor(rnd() * 6);
      const att: Attempt = {
        id: `att-${userId}-${st.id}`,
        roundId: stationRoundId(st.id),
        userId,
        startedAt: fresh.gameOpensAt,
        submittedAt: fresh.gameOpensAt,
        answers: [],
        totalScore: correct * (100 + 25 * Math.floor(rnd() * 3)),
        correctCount: correct,
        totalMs: Math.round((6 + rnd() * 16) * 3000),
      };
      game.attempts.push(att);
    }
  }
  demoGame.save();
}

/** Simula las respuestas de los participantes ficticios a lo largo del tiempo del ítem. */
async function simulateBots(repo: CongressRepo, eventId: string) {
  const now = repo.now();
  const bots = (await repo.listParticipants(eventId)).filter((p) => p.userId.startsWith("bot:"));
  for (const s of await repo.listSessions(eventId)) {
    const st = await repo.getLiveState(s.id);
    if (!st || st.itemIndex < 0 || st.openedAt === undefined) continue;
    const item = s.items[st.itemIndex];
    if (!item) continue;
    const phase = effectivePhase(st, now);
    if (phase === "idle") continue;
    const until = Math.min(now, st.endsAt ?? now) - st.openedAt;
    const q = item.questionId ? await repo.getQuestion(item.questionId) : undefined;
    const answered = new Set((await repo.listLiveAnswers(s.id, item.id)).map((a) => a.userId));
    for (const b of bots) {
      if (answered.has(b.userId)) continue;
      const rnd = seededRandom(`${s.id}:${item.id}:${b.userId}`);
      if (rnd() > 0.85) continue;
      const t = 1200 + rnd() * item.timeLimitS * 850;
      if (t > until) continue;
      let selected: string[];
      let points = 0;
      let isCorrect = false;
      if (item.kind === "quiz" && q) {
        const right = q.options.filter((o) => o.isCorrect).map((o) => o.id);
        const wrong = q.options.filter((o) => !o.isCorrect).map((o) => o.id);
        selected =
          rnd() < 0.6 || wrong.length === 0 ? right : [wrong[Math.floor(rnd() * wrong.length)]];
        const r = scoreAnswer({
          question: q,
          selected,
          responseMs: t,
          timeLimitS: item.timeLimitS,
          lambda: 0.5,
        });
        points = r.points;
        isCorrect = r.isCorrect;
      } else {
        const opts = item.options ?? [];
        // Reparto sesgado pero determinista para que la encuesta no salga plana.
        const w = opts.map((_, i) => 1 / (i + 1.3));
        let x = rnd() * w.reduce((a, v) => a + v, 0);
        let k = 0;
        while (k < opts.length - 1 && (x -= w[k]) > 0) k++;
        selected = [opts[k].id];
      }
      await repo.insertLiveAnswer({
        sessionId: s.id,
        itemId: item.id,
        userId: b.userId,
        selected,
        responseMs: Math.round(t),
        isCorrect,
        points,
        answeredAt: st.openedAt + t,
      });
    }
  }
}

function ctx() {
  // Lee siempre lo último de localStorage: otra pestaña puede estar moderando.
  reloadCongressDemo();
  demoGame.reload();
  const repo = buildRepo();
  const core = createCongressCore(repo, {
    onlyPlayable: false,
    beforeRead: (eventId) => simulateBots(repo, eventId),
  });
  return { repo, core };
}

async function ready() {
  const c = ctx();
  await ensureSeed(c.repo);
  return c.core;
}

function player(): CongressPlayer {
  const p = demoGame.profile();
  return {
    userId: DEMO_USER_ID,
    profileName: p?.displayName,
    hospital: p?.hospital,
    careerStage: p?.careerStage,
  };
}
const actor = (): CongressActor => ({ userId: DEMO_USER_ID, isStaff: isStaffRole() });

export const congressDemoService: CongressService = {
  mode: "demo",
  async listEvents() {
    return (await ready()).listEvents(actor());
  },
  async eventView(slug) {
    return (await ready()).eventView(slug, player(), actor());
  },
  async myDefaults() {
    const p = player();
    return { displayName: p.profileName, hospital: p.hospital, careerStage: p.careerStage };
  },
  async join(slug, input) {
    return (await ready()).join(slug, player(), input);
  },
  async scan(input) {
    return (await ready()).scan(player(), input);
  },
  async ranking(slug) {
    return (await ready()).ranking(slug, player());
  },
  async season() {
    return (await ready()).season(player());
  },
  async myProgress(): Promise<ProgressSummary> {
    await ready();
    const me = DEMO_USER_ID;
    const attempts = demoGame.state().attempts.filter((a) => a.userId === me && a.submittedAt);
    const cs = congressDemoState();
    const kind = (roundId: string) =>
      roundId.startsWith("boss:")
        ? "boss"
        : roundId.startsWith("cs:")
          ? "station"
          : roundId.startsWith("practice:")
            ? "practice"
            : "league";
    const live = cs.liveAnswers.filter((a) => a.userId === me);
    const boss = attempts.filter((a) => kind(a.roundId) === "boss");
    return {
      rp:
        Math.round(
          (attempts
            .filter((a) => kind(a.roundId) !== "practice")
            .reduce((s, a) => s + a.totalScore, 0) +
            live.reduce((s, a) => s + a.points, 0)) *
            100,
        ) / 100,
      leagueRounds: attempts.filter((a) => kind(a.roundId) === "league").length,
      bossPlayed: boss.length,
      bossPerfect: boss.filter((a) => a.answers.length > 0 && a.answers.every((x) => x.isCorrect))
        .length,
      congressStations: attempts.filter((a) => kind(a.roundId) === "station").length,
      huntsJoined: cs.participants.filter((p) => p.userId === me).length,
      liveAnswers: live.length,
      competency: Object.entries(demoGame.state().competency)
        .filter(([k]) => k.startsWith(`${me}|`))
        .map(([, c]) => c),
    };
  },
  async requestProposal(input) {
    const data = proposalSchema.parse(input);
    try {
      const key = "rh-proposals-v1";
      const list = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown[];
      list.push({ ...data, at: new Date().toISOString() });
      window.localStorage.setItem(key, JSON.stringify(list.slice(-20)));
    } catch {
      /* sin almacenamiento: en la demo no se envía a ningún sitio */
    }
    return true;
  },
  async liveView(slug, sessionId) {
    return (await ready()).liveView(slug, player(), sessionId);
  },
  async answerLive(slug, sessionId, itemId, selected) {
    return (await ready()).answerLive(slug, player(), { sessionId, itemId, selected });
  },
  async submitFeedback(slug, input) {
    return (await ready()).submitFeedback(slug, player(), input);
  },
  async sala(slug) {
    return (await ready()).sala(slug);
  },
  async adminOverview(slug) {
    return (await ready()).adminOverview(actor(), slug);
  },
  async saveEvent(e) {
    return (await ready()).saveEvent(actor(), e);
  },
  async saveStation(s) {
    return (await ready()).saveStation(actor(), s);
  },
  async deleteStation(id) {
    return (await ready()).deleteStation(actor(), id);
  },
  async rotateToken(id) {
    return (await ready()).rotateToken(actor(), id);
  },
  async suggestQuestions(sub, seed) {
    return (await ready()).suggestQuestions(actor(), sub, seed);
  },
  async questionBank(sub) {
    return (await ready()).questionBank(actor(), sub);
  },
  async saveSession(s) {
    return (await ready()).saveSession(actor(), s);
  },
  async deleteSession(id) {
    return (await ready()).deleteSession(actor(), id);
  },
  async moderate(sessionId, action, itemIndex) {
    return (await ready()).moderate(actor(), sessionId, action, itemIndex);
  },
  async stationTokens(slug) {
    return (await ready()).stationTokens(actor(), slug);
  },
  async exportCsv(slug, kind) {
    return (await ready()).exportCsv(actor(), slug, kind);
  },
  reset() {
    resetCongressDemo();
  },
};
