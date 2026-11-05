import { afterEach, expect, it, vi } from "vitest";
import { APP_FORCE_DEMO, demoGatedEnv } from "./app-deploy";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

// Salvaguarda del despliegue en el proyecto de Lovable de Palma: con APP_FORCE_DEMO la app
// no debe usar las credenciales de Supabase del entorno (base de datos real del evento).
it("APP_FORCE_DEMO anula las credenciales de Supabase del entorno", async () => {
  expect(APP_FORCE_DEMO).toBe(true);
  expect(demoGatedEnv("https://uqfyruqxpdkzipytdeta.supabase.co")).toBeUndefined();
  vi.stubEnv("VITE_SUPABASE_URL", "https://ejemplo.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "clave-anon");
  const db = await import("./db/client");
  expect(db.isSupabaseConfigured).toBe(false);
  expect(db.supabase).toBeNull();
});

it("el cliente de Supabase del navegador no se crea en modo demo forzado", async () => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://ejemplo.supabase.co");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "clave-publica");
  const { supabase } = await import("@/integrations/supabase/client");
  expect(() => supabase.auth).toThrow(/Missing Supabase/);
});
