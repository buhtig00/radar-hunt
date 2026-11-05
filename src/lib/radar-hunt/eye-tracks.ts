// RADAR HUNT — Eye Universe por especialidades: los 6 recorridos de los Hunts y el anclaje
// anatómico de sus 23 estaciones dentro del ojo 3D (segmento anterior, úvea, polo posterior,
// nervio óptico y anejos/órbita).
//
// Coordenadas:
//  · `marker` en mm en los ejes de construcción del modelo (ojo derecho, centro del globo):
//    x > 0 nasal, y > 0 anterior (eje óptico), z > 0 inferior.
//  · `view` (cámara) en mm en ejes de la escena: x > 0 nasal, y > 0 superior, z > 0 anterior.
// Modelo procedural educativo: pendiente de validación anatómica por un oftalmólogo.
import type { StructureCode } from "@/components/radar-hunt/eye-anim";
import type { Badge } from "./season";
import { HUNT_STATIONS, HUNT_TRACKS, type HuntStationSeed } from "./seed-hunt-matrix";
import type { EyeStationProgress } from "./types";

export type EyeZone = "anterior" | "uvea" | "posterior" | "nerve" | "adnexa";

export const EYE_ZONE_LABELS: Record<EyeZone, string> = {
  anterior: "Segmento anterior",
  uvea: "Úvea y cámara posterior",
  posterior: "Polo posterior",
  nerve: "Nervio óptico",
  adnexa: "Anejos y órbita",
};

/** Qué capas de anejos se muestran: nada, órbita (sin párpados) o todo (con párpados). */
export type AdnexaMode = "off" | "orbit" | "full";

export interface EyeView {
  pos: [number, number, number];
  target: [number, number, number];
}

export interface EyeAnchor {
  station: string;
  zone: EyeZone;
  structure: StructureCode;
  marker: [number, number, number];
  view: EyeView;
  cutaway?: boolean;
  adnexa?: AdnexaMode;
  /** Modo didáctico del humor acuoso (estaciones de glaucoma de producción y drenaje). */
  aqueous?: boolean;
  /** Tramo de la película del viaje anatómico que ilustra la estación, si existe. */
  clip?: string;
  /** Qué mirar en ese tramo, si no es la estructura de la estación (p. ej. el reflejo rojo). */
  clipLook?: string;
  /** Una línea: qué mirar en el ojo al llegar a la estación. */
  focus: string;
}

export interface EyeTrack {
  code: string;
  label: string;
  short: string;
  /** Color del recorrido en el ojo y en la interfaz (nunca el dorado, reservado al podio). */
  color: string;
  /** Estaciones en orden clínico de recorrido. */
  route: string[];
  intro: string;
}

export const EYE_TRACKS: EyeTrack[] = [
  {
    code: "general",
    label: HUNT_TRACKS.general,
    short: "General",
    color: "#60a5fa",
    route: ["GEN-01", "GEN-02"],
    intro: "La inflamación y la infección intraocular: del iris y el cuerpo ciliar al vítreo.",
  },
  {
    code: "anterior",
    label: HUNT_TRACKS.anterior,
    short: "Anterior",
    color: "#2dd4bf",
    route: ["ANT-02", "ANT-01"],
    intro: "La córnea de fuera adentro: la superficie que se infecta y el estroma que se adelgaza.",
  },
  {
    code: "retina",
    label: HUNT_TRACKS.retina,
    short: "Retina",
    color: "#fb7185",
    route: ["RET-01", "RET-02", "RET-03"],
    intro: "El polo posterior: mácula, retina diabética y circulación retiniana.",
  },
  {
    code: "glaucoma",
    label: HUNT_TRACKS.glaucoma,
    short: "Glaucoma",
    color: "#a78bfa",
    route: ["GLA-03", "GLA-02", "GLA-04", "GLA-01", "GLA-05"],
    intro:
      "Sigue al humor acuoso: se produce en el cuerpo ciliar, se drena por el ángulo y, si la presión falla, daña el nervio.",
  },
  {
    code: "neuroped",
    label: HUNT_TRACKS.neuroped,
    short: "Neuro + Pediatría",
    color: "#f472b6",
    route: ["PED-03", "PED-02", "PED-01", "NEU-03", "NEU-02", "NEU-01"],
    intro:
      "De delante atrás: el reflejo rojo, la fóvea en desarrollo, los músculos y sus nervios, el disco y el nervio óptico.",
  },
  {
    code: "oculoplastia",
    label: HUNT_TRACKS.oculoplastia,
    short: "Oculoplastia",
    color: "#fb923c",
    route: ["OCP-01", "OCP-02", "OCP-03", "OCP-05", "OCP-04"],
    intro: "Fuera del globo: párpados, vía lagrimal y órbita, desde el reborde hasta el vértice.",
  },
];

// Vistas reutilizables (escena)
const V = {
  cornea: { pos: [9, 4, 24], target: [0, 0, 11] },
  corneaInferior: { pos: [14, -9, 22], target: [0, -1.5, 11] },
  uvea: { pos: [40, 10, 22], target: [0, 0, 6] },
  vitreous: { pos: [50, 6, 2], target: [0, 0, 0] },
  ciliary: { pos: [30, 8, 16], target: [0, 1, 8] },
  angle: { pos: [16, 9, 17], target: [0, 5.2, 9.6] },
  capsule: { pos: [24, 7, 18], target: [0, 1.5, 8.5] },
  pupil: { pos: [0, 0, 23], target: [0, 0, 9] },
  macula: { pos: [0, 0, 5], target: [0, 0, -11] },
  fundusWide: { pos: [0, 2, 9], target: [0, 0, -11] },
  disc: { pos: [3.6, 0, 1.5], target: [4.4, 0, -11] },
  discVessels: { pos: [2.4, 0, 5], target: [2, 0, -11] },
  fovea: { pos: [0, 0, -4], target: [0, 0, -11] },
  nerveBack: { pos: [26, 12, -34], target: [4, 0, -14] },
  lidsFront: { pos: [6, 4, 64], target: [0, 1, 0] },
  lacrimal: { pos: [42, 6, 44], target: [11, -2, 2] },
  musclesFront: { pos: [-34, 38, 42], target: [-2, 0, -4] },
  musclesTop: { pos: [4, 58, -4], target: [2, 0, -10] },
  apex: { pos: [30, 40, -40], target: [4, 0, -16] },
  nerveTop: { pos: [20, 44, -12], target: [4, 0, -16] },
  septum: { pos: [38, 30, 46], target: [4, 2, 0] },
  intraconal: { pos: [-48, 16, -30], target: [0, 0, -14] },
} satisfies Record<string, EyeView>;

export const EYE_ANCHORS: Record<string, EyeAnchor> = {
  // — General / residentes
  "GEN-01": {
    station: "GEN-01",
    zone: "uvea",
    structure: "iris",
    marker: [-5.2, 9.0, 2.6],
    view: V.uvea,
    cutaway: true,
    clip: "S02A",
    focus:
      "Iris y cuerpo ciliar en corte sagital: la úvea anterior, donde empiezan las células y el flare.",
  },
  "GEN-02": {
    station: "GEN-02",
    zone: "posterior",
    structure: "vitreous",
    marker: [-2.5, 0, 3],
    view: V.vitreous,
    cutaway: true,
    clip: "S03",
    focus:
      "La cavidad vítrea: allí se toma la muestra y se inyectan los antibióticos intravítreos.",
  },
  // — Segmento anterior
  "ANT-02": {
    station: "ANT-02",
    zone: "anterior",
    structure: "cornea",
    marker: [2.5, 12.8, 1.5],
    view: V.cornea,
    clip: "S01",
    focus: "Epitelio y estroma corneal: el defecto epitelial y el infiltrado de la queratitis.",
  },
  "ANT-01": {
    station: "ANT-01",
    zone: "anterior",
    structure: "cornea",
    marker: [0, 12.0, 3.6],
    view: V.corneaInferior,
    clip: "S01",
    focus:
      "Córnea inferior: el empinamiento y el adelgazamiento típicos del queratocono se sitúan aquí.",
  },
  // — Retina
  "RET-01": {
    station: "RET-01",
    zone: "posterior",
    structure: "macula",
    marker: [-1.2, -10.6, 0.5],
    view: V.macula,
    clip: "S04",
    focus: "La mácula: drusas, atrofia geográfica o neovascularización bajo la fóvea.",
  },
  "RET-02": {
    station: "RET-02",
    zone: "posterior",
    structure: "retina",
    marker: [-3.5, -10.2, -2.6],
    view: V.fundusWide,
    clip: "S04C",
    focus:
      "Retina y arcadas: microaneurismas, exudados y el engrosamiento macular del edema diabético.",
  },
  "RET-03": {
    station: "RET-03",
    zone: "posterior",
    structure: "retina",
    marker: [3.4, -10.2, -1.8],
    view: V.discVessels,
    clip: "S04",
    focus:
      "Arterias y venas que salen del disco: una oclusión central afecta a todas, una de rama a un sector.",
  },
  // — Glaucoma
  "GLA-03": {
    station: "GLA-03",
    zone: "uvea",
    structure: "ciliary_body",
    marker: [-5.6, 7.9, -2],
    view: V.ciliary,
    cutaway: true,
    aqueous: true,
    clip: "S02Z",
    focus:
      "Los procesos ciliares producen el humor acuoso: sigue las partículas de la cámara posterior al ángulo.",
  },
  "GLA-02": {
    station: "GLA-02",
    zone: "anterior",
    structure: "angle",
    marker: [-0.3, 9.95, -5.75],
    view: V.angle,
    cutaway: true,
    aqueous: true,
    clip: "S02Z",
    focus:
      "El ángulo iridocorneal en corte: si el iris se adosa a la malla trabecular, el acuoso no sale.",
  },
  "GLA-04": {
    station: "GLA-04",
    zone: "anterior",
    structure: "lens",
    marker: [-0.3, 9.3, -2.6],
    view: V.capsule,
    cutaway: true,
    clip: "S02",
    focus:
      "Cápsula anterior y cara posterior del iris: el material pseudoexfoliativo y el pigmento obstruyen la trabécula.",
  },
  "GLA-01": {
    station: "GLA-01",
    zone: "posterior",
    structure: "optic_disc",
    marker: [4.6, -9.9, 1.0],
    view: V.disc,
    clip: "S04",
    focus: "El disco óptico: la excavación y el anillo neurorretiniano que vigila el glaucoma.",
  },
  "GLA-05": {
    station: "GLA-05",
    zone: "nerve",
    structure: "optic_disc",
    marker: [5.2, -14, 0.4],
    view: V.nerveBack,
    clip: "S04",
    focus:
      "Detrás del globo: el daño progresivo del nervio aunque la presión sea normal; aquí se juega la progresión.",
  },
  // — Neuro + Pediatría
  "PED-03": {
    station: "PED-03",
    zone: "anterior",
    structure: "pupil",
    marker: [1.0, 9.8, 0.5],
    view: V.pupil,
    // S02 abre con el reflejo rojo a través de la pupila y recorre el cristalino (catarata
    // congénita, otra causa de leucocoria). S02P es el reflejo fotomotor, que no es el tema.
    clip: "S02",
    clipLook: "el reflejo rojo a través de la pupila",
    focus:
      "La pupila y su reflejo rojo: una pupila blanca (leucocoria) obliga a descartar retinoblastoma.",
  },
  "PED-02": {
    station: "PED-02",
    zone: "posterior",
    structure: "fovea",
    marker: [0, -10.9, 0],
    view: V.fovea,
    clip: "S04D",
    focus:
      "La fóvea: si no recibe una imagen nítida en la infancia, la vía visual no madura (ambliopía).",
  },
  "PED-01": {
    station: "PED-01",
    zone: "adnexa",
    structure: "extraocular_muscles",
    marker: [-12.2, 5.6, 0],
    view: V.musclesFront,
    adnexa: "orbit",
    clip: "A03",
    focus:
      "Los rectos y sus inserciones en la esclera (espiral de Tillaux): aquí se opera el estrabismo.",
  },
  "NEU-03": {
    station: "NEU-03",
    zone: "adnexa",
    structure: "extraocular_muscles",
    marker: [7, -30, -2],
    view: V.apex,
    adnexa: "orbit",
    clip: "A05",
    focus:
      "El vértice orbitario y el anillo de Zinn: por aquí entran el III, el IV y el VI par hacia sus músculos.",
  },
  "NEU-02": {
    station: "NEU-02",
    zone: "posterior",
    structure: "optic_disc",
    marker: [4.4, -10.0, -1.3],
    view: V.disc,
    clip: "S04",
    focus: "El disco óptico: bordes borrados y vasos ocultos cuando sube la presión intracraneal.",
  },
  "NEU-01": {
    station: "NEU-01",
    zone: "nerve",
    structure: "optic_nerve",
    marker: [6, -22, -0.8],
    view: V.nerveTop,
    adnexa: "orbit",
    clip: "A05",
    focus:
      "El nervio óptico intraorbitario: la neuritis retrobulbar ocurre aquí, con el disco normal.",
  },
  // — Oculoplastia + Órbita
  "OCP-01": {
    station: "OCP-01",
    zone: "adnexa",
    structure: "eyelids",
    marker: [0, 13.9, -6.5],
    view: V.lidsFront,
    adnexa: "full",
    clip: "A01",
    focus:
      "El párpado superior: altura del borde (MRD1) y función del elevador, las dos medidas de la ptosis.",
  },
  "OCP-02": {
    station: "OCP-02",
    zone: "adnexa",
    structure: "lacrimal",
    marker: [16.5, 4.5, 1],
    view: V.lacrimal,
    adnexa: "full",
    clip: "A02",
    focus:
      "Puntos, canalículos, saco y conducto nasolagrimal: localiza dónde se obstruye la lágrima.",
  },
  "OCP-03": {
    station: "OCP-03",
    zone: "adnexa",
    structure: "extraocular_muscles",
    marker: [12.5, -12, -0.5],
    view: V.musclesTop,
    adnexa: "orbit",
    clip: "A03",
    clipLook: "los vientres de los rectos, que se engrosan en la orbitopatía tiroidea",
    focus:
      "Los vientres musculares en la órbita: en la orbitopatía tiroidea se engrosan (sobre todo el recto inferior y el medio).",
  },
  "OCP-05": {
    station: "OCP-05",
    zone: "adnexa",
    structure: "orbit",
    marker: [10, 6, -13],
    view: V.septum,
    adnexa: "full",
    clip: "A01",
    clipLook:
      "párpados y reborde orbitario: delante del septo, celulitis preseptal; detrás, orbitaria",
    focus:
      "El reborde y el septo orbitario: la frontera entre la celulitis preseptal y la orbitaria.",
  },
  "OCP-04": {
    station: "OCP-04",
    zone: "adnexa",
    structure: "orbit",
    marker: [-3, -20, 4],
    view: V.intraconal,
    adnexa: "orbit",
    clip: "A04",
    focus:
      "El espacio intraconal, detrás del globo y entre los rectos: allí crecen muchos tumores orbitarios.",
  },
};

export interface EyeTrackStation extends HuntStationSeed {
  anchor: EyeAnchor;
  /** Posición dentro de su recorrido (1…n). */
  order: number;
}

export function getEyeTrack(code: string | undefined): EyeTrack | undefined {
  return EYE_TRACKS.find((t) => t.code === code);
}

export function trackStations(track: string): EyeTrackStation[] {
  const t = getEyeTrack(track);
  if (!t) return [];
  return t.route.map((code, i) => {
    const seed = HUNT_STATIONS.find((s) => s.code === code);
    if (!seed) throw new Error(`Estación desconocida en el recorrido ${track}: ${code}`);
    return { ...seed, anchor: EYE_ANCHORS[code], order: i + 1 };
  });
}

export function findTrackStation(code: string | undefined): EyeTrackStation | undefined {
  const seed = HUNT_STATIONS.find((s) => s.code === code);
  return seed ? trackStations(seed.track).find((s) => s.code === code) : undefined;
}

/** Estaciones de los Hunts que se apoyan en una estructura del ojo (para la ficha anatómica). */
export function stationsForStructure(structure: StructureCode): EyeTrackStation[] {
  return EYE_TRACKS.flatMap((t) => trackStations(t.code)).filter(
    (s) => s.anchor.structure === structure,
  );
}

// --------------------------------------------------------------------- superación e insignias

/** Una estación cuenta como superada cuando su mejor práctica alcanza el 80 % de aciertos. */
export const EYE_PASS_RATIO = 0.8;

/** Umbral en porcentaje, para los textos («80 %»). */
export const EYE_PASS_PCT = Math.round(EYE_PASS_RATIO * 100);

export function isStationPassed(p: EyeStationProgress | undefined): boolean {
  return !!p && p.total > 0 && p.bestCorrect / p.total >= EYE_PASS_RATIO - 1e-9;
}

/** Aciertos necesarios para superar una práctica de `total` preguntas. */
export function passMark(total: number): number {
  return Math.ceil(total * EYE_PASS_RATIO - 1e-9);
}

export interface TrackProgress {
  track: string;
  passed: number;
  practiced: number;
  total: number;
  complete: boolean;
}

export function trackProgress(
  track: EyeTrack,
  progress: Map<string, EyeStationProgress>,
): TrackProgress {
  const passed = track.route.filter((c) => isStationPassed(progress.get(c))).length;
  const practiced = track.route.filter((c) => progress.has(c)).length;
  return {
    track: track.code,
    passed,
    practiced,
    total: track.route.length,
    complete: passed === track.route.length,
  };
}

/** Nombre de la insignia de cada recorrido. */
export const TRACK_BADGE_NAMES: Record<string, string> = {
  general: "Ruta general",
  anterior: "Ruta del segmento anterior",
  retina: "Ruta de la retina",
  glaucoma: "Ruta del glaucoma",
  neuroped: "Ruta neuro-pediátrica",
  oculoplastia: "Ruta de la órbita",
};

export interface TrackBadge extends Badge {
  /** Recorrido de la insignia (ausente en la insignia global). */
  track?: string;
  color: string;
}

/**
 * Insignias del Eye Universe: una por recorrido (todas sus estaciones superadas) y una global
 * por las 23. Se calculan a partir del progreso guardado; no dan RP ni puntos de temporada.
 */
export function computeTrackBadges(list: EyeStationProgress[]): TrackBadge[] {
  const map = new Map(list.map((p) => [p.station, p]));
  const pct = EYE_PASS_PCT;
  const perTrack = EYE_TRACKS.map((t): TrackBadge => {
    const tp = trackProgress(t, map);
    return {
      id: `track-${t.code}`,
      track: t.code,
      color: t.color,
      name: TRACK_BADGE_NAMES[t.code] ?? `Ruta ${t.short}`,
      description: `Supera (≥ ${pct} %) las ${tp.total} estaciones de ${t.label} en el Eye Universe.`,
      progress: tp.passed / tp.total,
      earned: tp.complete,
      hint: tp.complete ? "Conseguida" : `${tp.passed} de ${tp.total} estaciones superadas`,
    };
  });
  const total = EYE_TRACKS.reduce((n, t) => n + t.route.length, 0);
  const passed = EYE_TRACKS.reduce((n, t) => n + trackProgress(t, map).passed, 0);
  return [
    ...perTrack,
    {
      id: "track-all",
      color: "#22d3ee",
      name: "Eye Universe completo",
      description: `Supera las ${total} estaciones de los seis recorridos.`,
      progress: passed / total,
      earned: passed === total,
      hint: passed === total ? "Conseguida" : `${passed} de ${total} estaciones superadas`,
    },
  ];
}
