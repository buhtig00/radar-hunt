// RADAR HUNT — color por subespecialidad (tema oscuro). Coherente con los colores de los
// recorridos del Eye Universe (eye-tracks.ts): retina rosa, glaucoma violeta, segmento
// anterior turquesa, neuro rosa intenso, oculoplastia naranja, general azul.
import { PUBLIC_BASE } from "./static";
import type { SubspecialtyCode } from "./types";

export const SUB_COLORS: Record<SubspecialtyCode, string> = {
  retina: "#fb7185",
  glaucoma: "#a78bfa",
  cornea: "#2dd4bf",
  ocular_surface: "#34d399",
  cataract: "#fbbf24",
  refractive: "#38bdf8",
  uveitis: "#60a5fa",
  oculoplastics: "#fb923c",
  neuro_ophthalmology: "#f472b6",
  pediatric_ophthalmology: "#e879f9",
  strabismus: "#c084fc",
  contactology: "#22d3ee",
  low_vision: "#a3e635",
  ocular_oncology: "#f87171",
  ocular_trauma: "#fdba74",
  emergency_ophthalmology: "#facc15",
  general_ophthalmology: "#818cf8",
};

export const subColor = (code: SubspecialtyCode) => SUB_COLORS[code] ?? "#22d3ee";

/** Fotogramas de la película del ojo (public/eye/stations), usados como imágenes de sección. */
export const RH_IMAGES = {
  iris: `${PUBLIC_BASE}eye/stations/S02A.jpg`,
  irisAlt: `${PUBLIC_BASE}eye/stations/S02P.jpg`,
  redReflex: `${PUBLIC_BASE}eye/stations/S02.jpg`,
  cornea: `${PUBLIC_BASE}eye/stations/S01.jpg`,
  lens: `${PUBLIC_BASE}eye/stations/S02Z.jpg`,
  fundus: `${PUBLIC_BASE}eye/stations/S04.jpg`,
  fundusFar: `${PUBLIC_BASE}eye/stations/S03.jpg`,
  oct: `${PUBLIC_BASE}eye/stations/S04C.jpg`,
  macula: `${PUBLIC_BASE}eye/stations/S04D.jpg`,
} as const;
