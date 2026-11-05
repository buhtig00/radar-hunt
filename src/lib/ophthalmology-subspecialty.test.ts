import { describe, it, expect } from "vitest";
import { ophCodeToSubspecialtyLabel } from "./ophthalmology-subspecialty";

describe("ophCodeToSubspecialtyLabel", () => {
  it("maps enum codes to UI labels", () => {
    expect(ophCodeToSubspecialtyLabel("ocular_surface")).toBe("Ocular Surface");
    expect(ophCodeToSubspecialtyLabel("cornea")).toBe("Cornea");
    expect(ophCodeToSubspecialtyLabel("neuro_ophthalmology")).toBe("Neuro-Ophthalmology");
  });

  it("is idempotent for values already in UI-label form", () => {
    expect(ophCodeToSubspecialtyLabel("Cornea")).toBe("Cornea");
    expect(ophCodeToSubspecialtyLabel("Ocular Surface")).toBe("Ocular Surface");
  });

  it("routes codes without a dedicated bucket to a sensible label", () => {
    expect(ophCodeToSubspecialtyLabel("strabismus")).toBe("Pediatric Ophthalmology");
    expect(ophCodeToSubspecialtyLabel("pediatric")).toBe("Pediatric Ophthalmology");
  });

  it("falls back to General for unknown or empty input", () => {
    expect(ophCodeToSubspecialtyLabel("low_vision")).toBe("General");
    expect(ophCodeToSubspecialtyLabel("totally_unknown")).toBe("General");
    expect(ophCodeToSubspecialtyLabel(null)).toBe("General");
    expect(ophCodeToSubspecialtyLabel(undefined)).toBe("General");
  });
});
