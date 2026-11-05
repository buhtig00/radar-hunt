// RADAR HUNT — servicio de DEMOSTRACIÓN (navegador, sin backend). Usa el mismo
// núcleo del juego que producción; los datos se guardan en localStorage. Los
// participantes "demo" de las clasificaciones son ficticios y se etiquetan como tales.
import { CURRENT_SEASON, getLeague, LEAGUES } from "./catalog";
import { createGameCore, eyeStationPracticeId, type PlayerContext } from "./game-core";
import { createMemoryRepo, emptyMemoryState, type MemoryState } from "./repo-memory";
import { buildLeagueRounds, roundState, seededRandom, shuffle } from "./rounds";
import { DEMO_BOSS_CASES, DEMO_BOSS_QUESTIONS, DEMO_QUESTIONS } from "./seed-questions";
import { HUNT_BANK } from "./hunt-bank";
import { HUNT_STATIONS } from "./seed-hunt-matrix";
import { computeSignals, normalizeLicense, verificationSchema } from "./verification";
import { congressDemoState, demoStationAccess } from "./congress/demo-state";
import type {
  Attempt,
  EyeStationProgress,
  Round,
  SubspecialtyCode,
  VerificationRequest,
} from "./types";
import type {
  BossView,
  CompetencyView,
  LeagueView,
  ProfileView,
  RoundView,
  VerificationQueueItem,
} from "./views";

const KEY = "rh-demo-v1";
export const DEMO_USER_ID = "demo-me";
const DEMO_ACCOUNT_EMAIL = "tu.correo@hospital.es";

interface DemoStore {
  game: MemoryState;
  profiles: Record<string, ProfileView>;
  seededLeagues: string[];
}

function load(): DemoStore {
  const fresh: DemoStore = {
    game: emptyMemoryState(),
    profiles: seedApplicants(),
    seededLeagues: [],
  };
  if (typeof window === "undefined") return fresh;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fresh;
    const parsed = JSON.parse(raw) as DemoStore;
    return { ...fresh, ...parsed, game: { ...emptyMemoryState(), ...parsed.game } };
  } catch {
    return fresh;
  }
}

function seedApplicants(): Record<string, ProfileView> {
  const mk = (
    id: string,
    first: string,
    last: string,
    lic: string,
    email: string,
    hospital: string,
    stage: "resident" | "attending",
    year?: number,
  ): ProfileView => {
    const req: VerificationRequest = {
      firstName: first,
      lastName: last,
      licenseNumber: lic,
      email,
      specialty: "Oftalmología",
      hospital,
      careerStage: stage,
      residencyYear: year,
    };
    return {
      userId: id,
      firstName: first,
      lastName: last,
      displayName: `${first} ${last}`,
      licenseNumber: normalizeLicense(lic),
      email,
      specialty: "Oftalmología",
      hospital,
      careerStage: stage,
      residencyYear: year,
      status: "pending",
      signals: computeSignals(req, email),
      submittedAt: "2026-11-03T09:12:00Z",
    };
  };
  return {
    "demo-applicant-1": mk(
      "demo-applicant-1",
      "Solicitante",
      "Demo Uno",
      "462212345",
      "solicitante1@hospital-demo.es",
      "Hospital Demo Valencia",
      "resident",
      3,
    ),
    "demo-applicant-2": mk(
      "demo-applicant-2",
      "Solicitante",
      "Demo Dos",
      "28123",
      "solicitante2@gmail.com",
      "Clínica Demo Madrid",
      "attending",
    ),
  };
}

let store: DemoStore | null = null;
function s(): DemoStore {
  if (!store) store = load();
  return store;
}
function save() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s()));
  } catch {
    /* almacenamiento no disponible: la demo sigue en memoria */
  }
}

const allRounds: Round[] = [
  ...LEAGUES.flatMap((l) => buildLeagueRounds(l, DEMO_QUESTIONS)),
  ...DEMO_BOSS_CASES.map((c) => ({
    id: `boss:${c.id}`,
    kind: "boss_challenge" as const,
    bossCaseId: c.id,
    title: c.title,
    opensAt: CURRENT_SEASON.startsAt,
    closesAt: CURRENT_SEASON.endsAt,
    questionIds: c.steps.map((x) => x.questionId),
  })),
];

let repo: ReturnType<typeof createMemoryRepo> | null = null;
function r() {
  if (!repo) {
    repo = createMemoryRepo({
      questions: [...DEMO_QUESTIONS, ...DEMO_BOSS_QUESTIONS, ...HUNT_BANK],
      rounds: allRounds,
      bossCases: DEMO_BOSS_CASES,
      state: s().game,
      onChange: save,
      access: (round, userId) => demoStationAccess(congressDemoState())(round, userId),
    });
  }
  return repo;
}
const core = () =>
  createGameCore(r(), { requireVerifiedForLeagues: true, competitionOnlyPlayable: false });

function player(): PlayerContext {
  const p = s().profiles[DEMO_USER_ID];
  return {
    userId: DEMO_USER_ID,
    careerStage: p?.careerStage,
    verification: p?.status ?? "unverified",
  };
}

/** Acceso del modo congreso (demo) al mismo repositorio y jugador del juego. */
export const demoGame = {
  repo: () => r(),
  state: () => s().game,
  profile: () => s().profiles[DEMO_USER_ID],
  save: () => save(),
  /** Otra pestaña ha cambiado la demo: volver a leer localStorage. */
  reload() {
    store = null;
    repo = null;
  },
  questions: [...DEMO_QUESTIONS, ...DEMO_BOSS_QUESTIONS, ...HUNT_BANK],
};

/** Participantes ficticios en la ronda 1 de cada liga, para ver la clasificación viva. */
function ensureBots(leagueId: string) {
  if (s().seededLeagues.includes(leagueId)) return;
  const league = getLeague(leagueId);
  const round = allRounds.find((x) => x.leagueId === leagueId && x.number === 1);
  if (!league || !round || round.questionIds.length === 0) return;
  const rnd = seededRandom(leagueId);
  const label = league.careerLevel === "resident" ? "Residente" : "Adjunto/a";
  for (let i = 1; i <= 12; i++) {
    const userId = `bot:${leagueId}:${i}`;
    const correct = Math.floor(rnd() * (round.questionIds.length + 1));
    const att: Attempt = {
      id: `att-${userId}`,
      roundId: round.id,
      userId,
      startedAt: round.opensAt,
      submittedAt: round.opensAt,
      answers: [],
      totalScore: Math.round(correct * (120 + rnd() * 90) * 100) / 100,
      correctCount: correct,
      totalMs: Math.round((8 + rnd() * 18) * 1000 * round.questionIds.length),
    };
    s().game.attempts.push(att);
    s().game.names[userId] = `${label} demo ${String(i).padStart(2, "0")}`;
  }
  s().seededLeagues.push(leagueId);
  save();
}

function roundView(round: Round): RoundView {
  const a = s().game.attempts.find((x) => x.roundId === round.id && x.userId === DEMO_USER_ID);
  return {
    id: round.id,
    number: round.number ?? 0,
    title: round.title,
    opensAt: round.opensAt,
    closesAt: round.closesAt,
    state: roundState(round),
    questionCount: round.questionIds.length,
    myAttempt: a
      ? {
          id: a.id,
          submitted: !!a.submittedAt,
          score: a.totalScore,
          correct: a.correctCount,
          answered: a.answers.length,
        }
      : undefined,
  };
}

export const demoService = {
  mode: "demo" as const,

  async getMyProfile(): Promise<ProfileView | null> {
    return s().profiles[DEMO_USER_ID] ?? null;
  },

  async submitVerification(input: unknown): Promise<ProfileView> {
    const data = verificationSchema.parse(input);
    const prev = s().profiles[DEMO_USER_ID];
    if (prev?.status === "verified") throw new Error("Tu perfil ya está verificado.");
    const req: VerificationRequest = {
      ...data,
      primarySubspecialty: data.primarySubspecialty as SubspecialtyCode | undefined,
    };
    const p: ProfileView = {
      userId: DEMO_USER_ID,
      firstName: data.firstName,
      lastName: data.lastName,
      displayName: `${data.firstName} ${data.lastName}`,
      licenseNumber: normalizeLicense(data.licenseNumber),
      licenseCollege: data.licenseCollege || undefined,
      email: data.email,
      specialty: data.specialty,
      hospital: data.hospital,
      careerStage: data.careerStage,
      residencyYear: data.careerStage === "resident" ? data.residencyYear : undefined,
      primarySubspecialty: req.primarySubspecialty,
      status: "pending",
      signals: computeSignals(req, DEMO_ACCOUNT_EMAIL),
      submittedAt: new Date().toISOString(),
    };
    s().profiles[DEMO_USER_ID] = p;
    s().game.names[DEMO_USER_ID] = p.displayName;
    save();
    return p;
  },

  async listVerifications(
    status: "pending" | "verified" | "rejected" | "all" = "pending",
  ): Promise<VerificationQueueItem[]> {
    const all = Object.values(s().profiles);
    return all
      .filter((p) => status === "all" || p.status === status)
      .map((p) => ({
        ...p,
        duplicateLicense: all.some(
          (o) => o.userId !== p.userId && o.licenseNumber === p.licenseNumber,
        ),
      }));
  },

  async reviewVerification(
    userId: string,
    decision: "approve" | "reject",
    note?: string,
  ): Promise<ProfileView> {
    const p = s().profiles[userId];
    if (!p) throw new Error("Solicitud no encontrada");
    if (decision === "approve") {
      const clash = Object.values(s().profiles).some(
        (o) =>
          o.userId !== userId && o.status === "verified" && o.licenseNumber === p.licenseNumber,
      );
      if (clash) throw new Error("Ese número de colegiado ya está verificado en otra cuenta.");
    }
    const updated: ProfileView = {
      ...p,
      status: decision === "approve" ? "verified" : "rejected",
      reviewedAt: new Date().toISOString(),
      reviewerNote: note,
    };
    s().profiles[userId] = updated;
    save();
    return updated;
  },

  async getLeagueView(leagueId: string): Promise<LeagueView> {
    const league = getLeague(leagueId);
    if (!league) throw new Error("Liga no encontrada");
    ensureBots(leagueId);
    const rounds = allRounds
      .filter((x) => x.leagueId === leagueId)
      .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
    return {
      league,
      rounds: rounds.map(roundView),
      leaderboard: await core().leaderboard(leagueId),
      isMyLeague: player().careerStage === league.careerLevel,
    };
  },

  async startRound(roundId: string) {
    return (await core().start(player(), roundId)).id;
  },
  async nextQuestion(attemptId: string) {
    return core().nextQuestion(player(), attemptId);
  },
  async answer(attemptId: string, questionId: string, selected: string[]) {
    return core().answer(player(), attemptId, questionId, selected);
  },
  async summary(attemptId: string) {
    return core().summary(player(), attemptId);
  },

  async listBoss(): Promise<BossView[]> {
    return DEMO_BOSS_CASES.map((c) => {
      const roundId = `boss:${c.id}`;
      const a = s().game.attempts.find((x) => x.roundId === roundId && x.userId === DEMO_USER_ID);
      return {
        bossCase: {
          id: c.id,
          title: c.title,
          subspecialty: c.subspecialty,
          careerLevel: c.careerLevel,
          intro: c.intro,
          steps: c.steps.length,
        },
        roundId,
        myAttempt: a
          ? { id: a.id, submitted: !!a.submittedAt, score: a.totalScore, correct: a.correctCount }
          : undefined,
      };
    });
  },

  async startPractice(subspecialty: SubspecialtyCode): Promise<string> {
    // Práctica: banco demo + profundización (Science XP) de la matriz de los Hunts.
    const pool = [...DEMO_QUESTIONS, ...HUNT_BANK.filter((q) => q.layer === "science_xp")].filter(
      (q) => q.subspecialty === subspecialty && q.status !== "rejected",
    );
    if (pool.length === 0) throw new Error("No hay preguntas para esta subespecialidad.");
    const now = Date.now();
    const id = `practice:${subspecialty}:${now}`;
    r().addRound({
      id,
      kind: "practice",
      title: "Práctica libre",
      opensAt: new Date(now).toISOString(),
      closesAt: new Date(now + 24 * 3600_000).toISOString(),
      questionIds: shuffle(pool, id)
        .slice(0, 5)
        .map((q) => q.id),
    });
    return id;
  },

  async startStationPractice(stationCode: string): Promise<string> {
    // Práctica de una estación de los Hunts desde el Eye Universe: su profundización
    // (Science XP) + preguntas de práctica de la misma subespecialidad hasta 5. Las de
    // competición (RADARS) NO se exponen: se juegan en el Hunt, escaneando el QR.
    const st = HUNT_STATIONS.find((x) => x.code === stationCode);
    if (!st) throw new Error("Estación desconocida.");
    // Las rechazadas por el KOL no se practican.
    const own = HUNT_BANK.filter((q) => st.scienceXpIds.includes(q.id) && q.status !== "rejected");
    const now = Date.now();
    const id = eyeStationPracticeId(st.code, String(now));
    const fill = shuffle(
      DEMO_QUESTIONS.filter((q) => q.subspecialty === st.subspecialty),
      id,
    );
    const picked = [...own, ...fill].slice(0, 5);
    if (picked.length === 0) throw new Error("No hay preguntas para esta estación.");
    r().addRound({
      id,
      kind: "practice",
      title: `Práctica · ${st.code} ${st.title}`,
      opensAt: new Date(now).toISOString(),
      closesAt: new Date(now + 24 * 3600_000).toISOString(),
      questionIds: picked.map((q) => q.id),
    });
    return id;
  },

  async eyeProgress(): Promise<EyeStationProgress[]> {
    return Object.entries(s().game.eyeProgress ?? {})
      .filter(([k]) => k.startsWith(`${DEMO_USER_ID}|`))
      .map(([, v]) => v);
  },

  async myCompetency(): Promise<CompetencyView[]> {
    return Object.entries(s().game.competency)
      .filter(([k]) => k.startsWith(`${DEMO_USER_ID}|`))
      .map(([, c]) => c);
  },

  async flagQuestion(_questionId: string, _reason: string): Promise<boolean> {
    return true;
  },

  async publishLeagueRounds(): Promise<{ published: number }> {
    return { published: 0 };
  },

  /** Reinicia la demo (borra progreso local). */
  reset() {
    store = { game: emptyMemoryState(), profiles: seedApplicants(), seededLeagues: [] };
    repo = null;
    save();
  },
};
