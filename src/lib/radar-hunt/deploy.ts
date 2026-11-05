import { APP_FORCE_DEMO } from "../app-deploy";

// RADAR HUNT — interruptor de despliegue.
//
// Mientras sea `true`, Radar Hunt funciona SIEMPRE en modo demostración (datos en el navegador),
// aunque el proyecto tenga Supabase o Lovable Cloud conectado. Así el sitio publicado en Lovable
// no falla por no tener aún las tablas rh_*.
//
// Para pasar a producción:
//   1. aplicar en el Supabase de producción las migraciones supabase/migrations/2026110*_radar_hunt_*
//      (y las semillas de supabase/seed/radar_hunt_*.sql);
//   2. poner RH_DEMO_ONLY (abajo) y APP_FORCE_DEMO (src/lib/app-deploy.ts) a `false`.
//      VITE_RH_DEMO=false no basta: estos interruptores mandan.
// Queda en demo mientras toda la app esté en demo forzado (src/lib/app-deploy.ts) o mientras
// RH_DEMO_ONLY sea true (Supabase propio sin las tablas rh_* todavía).
const RH_DEMO_ONLY = true;
export const RH_FORCE_DEMO: boolean = APP_FORCE_DEMO || RH_DEMO_ONLY;
