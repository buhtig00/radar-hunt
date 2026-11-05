// RADAR HUNT — verificación profesional de médicos.
// Datos: nombre, apellidos, número de colegiado, correo, especialidad y hospital
// (+ etapa profesional para asignar liga). Las señales automáticas AYUDAN al
// revisor; la decisión final es siempre humana, contrastando el número de colegiado
// con el registro oficial (colegio provincial / CGCOM).
import { z } from "zod";
import type { VerificationRequest, VerificationSignals } from "./types";

const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "hotmail.es",
  "outlook.com",
  "outlook.es",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.es",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "gmx.es",
  "telefonica.net",
  "movistar.es",
]);

/** Normaliza el número de colegiado: quita espacios, puntos y guiones. */
export function normalizeLicense(raw: string): string {
  return raw.replace(/[\s.\-/]/g, "").toUpperCase();
}

/**
 * Formato plausible de número de colegiado: 6–10 dígitos. Es una comprobación
 * laxa a propósito (los formatos varían según colegio y antigüedad); la validez
 * real se confirma en el registro oficial.
 */
export function licenseFormatOk(raw: string): boolean {
  return /^\d{6,10}$/.test(normalizeLicense(raw));
}

export function isInstitutionalEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  if (!domain || PERSONAL_EMAIL_DOMAINS.has(domain)) return false;
  return domain.includes(".");
}

export function specialtyIsOphthalmology(specialty: string): boolean {
  const s = specialty.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return /oftalmolog|ophthalmolog/.test(s);
}

export const verificationSchema = z
  .object({
    firstName: z.string().trim().min(2, "Indica tu nombre").max(80),
    lastName: z.string().trim().min(2, "Indica tus apellidos").max(120),
    licenseNumber: z
      .string()
      .trim()
      .refine(licenseFormatOk, "El número de colegiado debe tener entre 6 y 10 dígitos"),
    licenseCollege: z.string().trim().max(80).optional(),
    email: z.string().trim().toLowerCase().email("Correo no válido").max(160),
    specialty: z.string().trim().min(3, "Indica tu especialidad").max(120),
    hospital: z.string().trim().min(3, "Indica tu hospital o centro").max(160),
    careerStage: z.enum(["resident", "attending"]),
    residencyYear: z.number().int().min(1).max(5).optional(),
    primarySubspecialty: z.string().optional(),
  })
  .refine((v) => v.careerStage !== "resident" || v.residencyYear !== undefined, {
    message: "Indica tu año de residencia (R1–R5)",
    path: ["residencyYear"],
  });

export function computeSignals(
  req: VerificationRequest,
  accountEmail?: string | null,
): VerificationSignals {
  return {
    institutionalEmail: isInstitutionalEmail(req.email),
    emailMatchesAccount:
      !!accountEmail && accountEmail.trim().toLowerCase() === req.email.trim().toLowerCase(),
    licenseFormatOk: licenseFormatOk(req.licenseNumber),
    specialtyIsOphthalmology: specialtyIsOphthalmology(req.specialty),
  };
}
