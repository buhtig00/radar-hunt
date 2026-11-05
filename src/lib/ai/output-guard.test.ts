import { describe, it, expect } from "vitest";
import { screenEducationalOutput } from "./output-guard";

describe("screenEducationalOutput", () => {
  it("flags concrete dosing and frequency", () => {
    const r = screenEducationalOutput("Administrar 0.5 mg cada 8 horas durante una semana.");
    expect(r.drifted).toBe(true);
    expect(r.codes).toContain("dosing");
    expect(r.codes).toContain("frequency");
    expect(r.codes).toContain("prescription");
  });

  it("flags a definitive individual diagnosis", () => {
    const r = screenEducationalOutput(
      "Based on the exam, the patient has acute angle-closure glaucoma.",
    );
    expect(r.drifted).toBe(true);
    expect(r.codes).toContain("definitive_diagnosis");
  });

  it("does not flag a neutral educational overview", () => {
    const r = screenEducationalOutput(
      "Panorama educativo de la evidencia sobre el cross-linking corneal y sus indicaciones generales.",
    );
    expect(r.drifted).toBe(false);
    expect(r.codes).toHaveLength(0);
  });
});
