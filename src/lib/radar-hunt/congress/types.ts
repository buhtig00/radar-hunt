// RADAR HUNT — modo congreso (pilar 3): tipos del dominio, independientes de UI y Supabase.
//
// Reglas de diseño (ver docs/radar-hunt-platform/ARQUITECTURA-Radar-Hunt.md §4.3 y §8):
// - Las preguntas de las estaciones y de los retos en sala salen del banco editorial
//   (en producción: aprobadas, validadas y con referencia). Los patrocinadores no las
//   elaboran, seleccionan ni revisan.
// - Sin premios en metálico ni regalos de valor; reconocimiento no monetario.
// - Las encuestas de sala son de la sesión, no estudios de mercado (eso es D6, aparte).
// - Sin geolocalización: la presencia se acredita escaneando el QR de la estación.
// - El servidor es la autoridad sobre fases, tiempos y puntos.
import type { CareerStage, Reference, SubspecialtyCode } from "../types";

export type EventStatus = "draft" | "published" | "closed";

export interface FloorRoom {
  id: string;
  name: string;
  /** Rectángulo en coordenadas 0–100 del plano. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Floor {
  id: string;
  name: string;
  order: number;
  /** Plano propio de la sede (imagen con derechos de uso). Si falta, se dibuja el esquema. */
  imageUrl?: string;
  rooms: FloorRoom[];
}

export interface Sponsor {
  name: string;
  /** Texto de transparencia que se muestra siempre junto al patrocinio. */
  disclosure: string;
}

export interface CongressEvent {
  id: string;
  slug: string;
  name: string;
  venue: string;
  city: string;
  timezone: string;
  startsAt: string;
  endsAt: string;
  /** Ventana en la que se puede jugar (estaciones y retos en sala). */
  gameOpensAt: string;
  gameClosesAt: string;
  status: EventStatus;
  floors: Floor[];
  sponsors: Sponsor[];
  /** Política de reconocimiento (sin metálico). */
  recognition: string;
  /** Evento de demostración (datos ficticios). */
  isDemo?: boolean;
}

export interface Station {
  id: string;
  eventId: string;
  /** Etiqueta corta visible en el plano (p. ej. "E3"). */
  label: string;
  title: string;
  description: string;
  floorId: string;
  /** Posición en el plano (0–100). */
  x: number;
  y: number;
  subspecialty: SubspecialtyCode;
  /** Recorrido (perfil de liga) al que pertenece: general, anterior, retina… */
  track?: string;
  questionIds: string[];
  sponsor?: Sponsor;
  active: boolean;
}

/** Token del QR de una estación. Solo lo conocen el servidor y el personal del evento. */
export interface StationToken {
  stationId: string;
  token: string;
  rotatedAt: string;
}

export interface ParticipantConsents {
  /** Obligatorio: bases y tratamiento de datos para participar. */
  participation: boolean;
  /** Opcional: aparecer con nombre o alias en la clasificación pública. */
  publicRanking: boolean;
  /** Opcional: comunicaciones de Ophthalmology Radar (nunca de patrocinadores). */
  communications: boolean;
}

export interface Participant {
  eventId: string;
  userId: string;
  displayName: string;
  alias?: string;
  hospital?: string;
  careerStage?: CareerStage;
  joinedAt: string;
  consents: ParticipantConsents;
}

export interface StationVisit {
  eventId: string;
  stationId: string;
  userId: string;
  scannedAt: string;
}

export type LiveItemKind = "quiz" | "poll";

export interface LiveItem {
  id: string;
  kind: LiveItemKind;
  /** Reto: pregunta del banco editorial. */
  questionId?: string;
  /** Encuesta de opinión de la sesión (no de mercado). */
  prompt?: string;
  options?: { id: string; text: string }[];
  timeLimitS: number;
}

export interface LiveSession {
  id: string;
  eventId: string;
  title: string;
  room: string;
  speaker?: string;
  startsAt?: string;
  items: LiveItem[];
}

export type LivePhase = "idle" | "open" | "closed" | "reveal" | "leaderboard" | "ended";

export interface LiveState {
  sessionId: string;
  itemIndex: number;
  phase: LivePhase;
  /** Marca del servidor (ms) en que se abrió el ítem: base del tiempo de respuesta. */
  openedAt?: number;
  endsAt?: number;
  version: number;
}

export interface LiveAnswer {
  sessionId: string;
  itemId: string;
  userId: string;
  selected: string[];
  responseMs: number;
  isCorrect: boolean;
  points: number;
  answeredAt: number;
}

export interface FeedbackInput {
  overall: number;
  stations: number;
  live: number;
  recommend: number;
  comment?: string;
}

export interface Feedback extends FeedbackInput {
  eventId: string;
  userId: string;
  submittedAt: string;
}

// ------------------------------------------------------------------ vistas para la interfaz

export type StationStatus = "locked" | "unlocked" | "done";

export interface StationView {
  id: string;
  label: string;
  title: string;
  description: string;
  floorId: string;
  x: number;
  y: number;
  subspecialty: SubspecialtyCode;
  track?: string;
  questionCount: number;
  sponsor?: Sponsor;
  roundId: string;
  status: StationStatus;
  myScore?: number;
}

export interface EventRankingRow {
  userId: string;
  name: string;
  hospital?: string;
  stationScore: number;
  liveScore: number;
  score: number;
  correct: number;
  totalMs: number;
  stationsDone: number;
  rank: number;
  isMe?: boolean;
}

export interface HospitalRankingRow {
  hospital: string;
  participants: number;
  /** Media de las 5 mejores puntuaciones del centro. */
  score: number;
  rank: number;
}

export interface EventRanking {
  individual: EventRankingRow[];
  hospitals: HospitalRankingRow[];
  /** Mínimo de participantes para que un centro aparezca. */
  hospitalMin: number;
}

export interface EventSummary {
  id: string;
  slug: string;
  name: string;
  venue: string;
  city: string;
  startsAt: string;
  endsAt: string;
  status: EventStatus;
  gameState: "upcoming" | "open" | "closed";
  stations: number;
  isDemo?: boolean;
}

export interface LiveItemPublic {
  id: string;
  kind: LiveItemKind;
  stem: string;
  options: { id: string; text: string }[];
  multiple: boolean;
  timeLimitS: number;
  unvalidated: boolean;
}

export interface LiveReveal {
  correctOptionIds: string[];
  explanation?: string;
  references: Reference[];
  /** Recuento por opción (solo en cierre/revelación). */
  tally: Record<string, number>;
  answered: number;
}

export interface LiveView {
  session: Pick<LiveSession, "id" | "title" | "room" | "speaker">;
  phase: LivePhase;
  itemIndex: number;
  itemCount: number;
  /** Ms restantes según el reloj del servidor (solo en fase abierta). */
  remainingMs?: number;
  serverNow: number;
  item?: LiveItemPublic;
  myAnswer?: Pick<LiveAnswer, "selected" | "points" | "isCorrect" | "responseMs">;
  answered: number;
  participants: number;
  reveal?: LiveReveal;
}

export interface EventView {
  event: CongressEvent;
  stations: StationView[];
  participant?: Participant;
  me?: { score: number; rank?: number; stationsDone: number };
  sessions: { id: string; title: string; room: string; speaker?: string; phase: LivePhase }[];
  hasFeedback: boolean;
  /** La persona puede gestionar el evento (organización). */
  canManage: boolean;
}

export interface SalaView {
  event: Pick<CongressEvent, "id" | "slug" | "name" | "venue" | "sponsors" | "recognition">;
  live?: LiveView;
  top: EventRankingRow[];
  participants: number;
  stationsCompleted: number;
}

export interface AdminStation extends Station {
  token: string;
  manualCode: string;
  scans: number;
  completions: number;
  avgScore: number;
}

export interface AdminOverview {
  event: CongressEvent;
  participants: Participant[];
  stations: AdminStation[];
  sessions: (LiveSession & { state: LiveState })[];
  kpis: {
    participants: number;
    scans: number;
    completions: number;
    liveAnswers: number;
    feedback: number;
    communicationsOptIn: number;
  };
  feedback: { count: number; overall: number; stations: number; live: number; nps: number };
}

export interface QuestionPick {
  id: string;
  subspecialty: SubspecialtyCode;
  difficulty: number;
  stem: string;
  playable: boolean;
}
