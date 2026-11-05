import { expect, it, vi } from "vitest";
import { RH_FORCE_DEMO } from "./deploy";

// Salvaguarda del despliegue en Lovable: mientras RH_FORCE_DEMO = true, Radar Hunt no debe
// pasar a producción aunque el proyecto tenga Supabase conectado (aún sin las tablas rh_*).
it("con RH_FORCE_DEMO y Supabase configurado, Radar Hunt sigue en modo demo", async () => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://ejemplo.supabase.co");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "clave-publica");
  vi.stubEnv("VITE_RH_DEMO", "false");
  const { RH_MODE } = await import("./service");
  expect(RH_MODE).toBe(RH_FORCE_DEMO ? "demo" : "live");
  vi.unstubAllEnvs();
});
