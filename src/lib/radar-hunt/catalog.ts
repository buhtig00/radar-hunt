// RADAR HUNT — catálogo: subespecialidades, temporada y las 34 ligas oficiales.
import type { CareerStage, League, LeagueRules, SubspecialtyCode } from "./types";

export const SUBSPECIALTY_LABELS: Record<SubspecialtyCode, string> = {
  retina: "Retina y vítreo",
  glaucoma: "Glaucoma",
  cornea: "Córnea",
  ocular_surface: "Superficie ocular",
  cataract: "Catarata",
  refractive: "Cirugía refractiva",
  uveitis: "Uveítis e inflamación ocular",
  oculoplastics: "Oculoplástica",
  neuro_ophthalmology: "Neurooftalmología",
  pediatric_ophthalmology: "Oftalmología pediátrica",
  strabismus: "Estrabismo",
  contactology: "Contactología",
  low_vision: "Baja visión",
  ocular_oncology: "Oncología ocular y órbita",
  ocular_trauma: "Traumatología ocular",
  emergency_ophthalmology: "Urgencias oftalmológicas",
  general_ophthalmology: "Oftalmología general",
};

export const SUBSPECIALTIES = Object.keys(SUBSPECIALTY_LABELS) as SubspecialtyCode[];

export const CAREER_LABELS: Record<CareerStage, string> = {
  resident: "Residentes",
  attending: "Adjuntos",
};

export const CURRENT_SEASON = {
  id: "season-2026-27",
  name: "Temporada 2026–2027",
  startsAt: "2026-11-02T00:00:00Z",
  endsAt: "2027-06-30T23:59:59Z",
};

export const DEFAULT_RULES: LeagueRules = {
  bestN: 8,
  totalRounds: 10,
  finalistsK: 16,
  // La rapidez no da puntos ni desempata (equidad entre idiomas y ritmos de lectura).
  speedLambda: 0,
  timeLimitS: 30,
  questionsPerRound: 5,
};

export function leagueId(sub: SubspecialtyCode, level: CareerStage): string {
  return `${CURRENT_SEASON.id}:${sub}:${level}`;
}

/** 17 subespecialidades × residentes/adjuntos = 34 ligas por temporada. */
export const LEAGUES: League[] = SUBSPECIALTIES.flatMap((sub) =>
  (["resident", "attending"] as CareerStage[]).map((level) => ({
    id: leagueId(sub, level),
    seasonId: CURRENT_SEASON.id,
    subspecialty: sub,
    careerLevel: level,
    name: `Liga ${SUBSPECIALTY_LABELS[sub]} · ${CAREER_LABELS[level]}`,
    rules: DEFAULT_RULES,
  })),
);

export function getLeague(id: string): League | undefined {
  return LEAGUES.find((l) => l.id === id);
}
