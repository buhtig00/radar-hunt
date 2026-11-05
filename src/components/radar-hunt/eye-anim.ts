// RADAR HUNT — utilidades del ojo sin dependencias de three.js (para no cargarlo antes de tiempo).

export type StructureCode =
  | "cornea"
  | "sclera"
  | "iris"
  | "pupil"
  | "angle"
  | "ciliary_body"
  | "zonule"
  | "lens"
  | "vitreous"
  | "retina"
  | "macula"
  | "fovea"
  | "optic_disc"
  | "choroid"
  | "ocular_surface"
  // anejos y órbita (vista «Órbita» del Eye Universe)
  | "eyelids"
  | "lacrimal"
  | "extraocular_muscles"
  | "orbit"
  | "optic_nerve";

/** Línea temporal del reflejo fotomotor (S02P): latencia, contracción rápida, meseta, redilatación. */
export function pupilReflexFactor(t: number, T = 4, min = 0.68): number {
  const lat = 0.25,
    con = 0.8,
    plat = 0.45;
  const reStart = lat + con + plat;
  const reEnd = T - 0.25;
  if (t < lat) return 1;
  if (t < lat + con) {
    const u = (t - lat) / con;
    return 1 - (1 - min) * (1 - (1 - u) ** 3);
  }
  if (t < reStart) return min;
  if (t < reEnd) {
    const u = (t - reStart) / (reEnd - reStart);
    return min + (1 - min) * (0.5 - 0.5 * Math.cos(Math.PI * u));
  }
  return 1;
}
