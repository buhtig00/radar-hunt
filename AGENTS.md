# Ophthalmology Radar · Radar Hunt: instrucciones para agentes

- **Mantén la app en modo demostración.** `APP_FORCE_DEMO = true` (`src/lib/app-deploy.ts`)
  hace que la app ignore las credenciales de Supabase del entorno.
  - Si se regeneran `src/integrations/supabase/client.ts`, `client.server.ts` o
    `auth-middleware.ts`, conserva la compuerta `demoGatedEnv(...)` alrededor de las variables
    de entorno.
  - No conectes este proyecto a la base de datos del evento Radar Hunt Palma 2026: tiene cuentas
    y resultados reales.
- Radar Hunt tiene además su propio interruptor, `RH_FORCE_DEMO` (`src/lib/radar-hunt/deploy.ts`).
- Antes de dar un cambio por bueno: `npm run typecheck`, `npm test` y `npm run build`.
- La interfaz está en español. El dorado del sistema de diseño se reserva al podio.
