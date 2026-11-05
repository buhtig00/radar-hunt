// Post-generation guardrail. Detects whether an "educational/bibliographic"
// answer drifted into individualized clinical advice (specific dosing, explicit
// prescription instructions, definitive diagnosis). We do NOT rewrite the
// model output — we flag drifted answers so the editorial/KOL layer reviews
// them, which helps keep the product within its educational, non-medical-device
// positioning.

export interface OutputScreen {
  drifted: boolean;
  codes: string[];
}

const PATTERNS: Array<{ code: string; re: RegExp }> = [
  // Concrete posology (numeric dose + unit).
  {
    code: "dosing",
    re: /\b\d+(?:[.,]\d+)?\s?(?:mg|mcg|µg|g|ml|gotas?|drops?|ui|iu|units?|unidades?)\b/i,
  },
  // Dosing frequency / schedule.
  {
    code: "frequency",
    re: /\b(?:cada|every|c\/)\s*\d+\s*(?:h|horas?|hours?|días?|days?|semanas?|weeks?)\b/i,
  },
  // Imperative treatment / prescription instructions.
  {
    code: "prescription",
    re: /\b(?:prescrib\w*|recet\w*|paut\w*|administr\w*|inici\w+\s+tratamiento|comience\s+con|start\s+the\s+patient\s+on|administer)\b/i,
  },
  // Definitive individual diagnosis.
  {
    code: "definitive_diagnosis",
    re: /\b(?:el\s+paciente\s+tiene|the\s+patient\s+has|diagn[óo]stico\s+definitivo|definitive\s+diagnosis|se\s+confirma\s+el\s+diagn[óo]stico)\b/i,
  },
];

/**
 * Screen free-text answer fields for individualized-advice drift.
 */
export function screenEducationalOutput(text: string): OutputScreen {
  const codes = PATTERNS.filter((p) => p.re.test(text)).map((p) => p.code);
  return { drifted: codes.length > 0, codes };
}
