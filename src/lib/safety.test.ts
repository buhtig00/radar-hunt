import { describe, it, expect } from "vitest";
import { detectSafety, detectPII, normalizeForMatch } from "./safety";

describe("normalizeForMatch", () => {
  it("lowercases and strips diacritics", () => {
    expect(normalizeForMatch("Pérdida Súbita")).toBe("perdida subita");
  });
});

describe("detectSafety", () => {
  it("flags an emergency term written without accents", () => {
    const r = detectSafety("Paciente con perdida subita de vision", "es");
    expect(r.emergency).toBe(true);
    expect(r.flags).toContain("Emergency symptom");
    expect(r.flags).toContain("Red flag");
    expect(r.categories).toContain("Síntoma de urgencia");
  });

  it("flags the same emergency term with accents", () => {
    const r = detectSafety("pérdida súbita de visión en ojo derecho", "es");
    expect(r.emergency).toBe(true);
    expect(r.matchedTerms.length).toBeGreaterThan(0);
  });

  it("flags requests for a definitive diagnosis", () => {
    const r = detectSafety("Can you diagnose this patient?", "en");
    expect(r.flags).toContain("Needs specialist review");
    expect(r.categories).toContain("Solicitud de diagnóstico definitivo");
  });

  it("flags individual dosing/treatment requests", () => {
    const r = detectSafety("what dosage should I prescribe", "en");
    expect(r.flags).toContain("Needs specialist review");
  });

  it("returns no emergency for a neutral educational question", () => {
    const r = detectSafety("resumen de la evidencia sobre cross-linking corneal", "es");
    expect(r.emergency).toBe(false);
    expect(r.flags).not.toContain("Emergency symptom");
  });
});

describe("detectPII", () => {
  it("detects an email address", () => {
    const m = detectPII("contacto del paciente: juan.perez@mail.com");
    expect(m.some((x) => x.type === "email")).toBe(true);
  });

  it("detects a name preceded by a title", () => {
    const m = detectPII("El Dr. García evaluó el caso");
    expect(m.some((x) => x.type === "patient_name")).toBe(true);
  });

  it("detects a medical record number", () => {
    const m = detectPII("NHC: AB12345 ingresa por uveítis");
    expect(m.some((x) => x.type === "medical_record")).toBe(true);
  });

  it("returns nothing for a properly anonymised case", () => {
    const m = detectPII("Mujer de 60-70 años con visión borrosa progresiva bilateral");
    expect(m).toHaveLength(0);
  });
});
