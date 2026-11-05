// Interruptor de despliegue de TODA la app (Ophthalmology Radar + Radar Hunt).
//
// Mientras sea `true`, la app ignora las credenciales de Supabase que inyecte el entorno
// (Lovable Cloud, variables de despliegue) y funciona en modo demostración, como si no hubiera
// base de datos: no inicia sesión, no registra usuarios y no lee ni escribe en ninguna tabla.
//
// Motivo: el proyecto de Lovable donde se publica (radar-hunt-palma) está enlazado a la base
// de datos del evento Radar Hunt Palma 2026, con cuentas y resultados reales que esta app no
// debe tocar. Para pasar a producción, usar un Supabase propio con las migraciones de
// supabase/migrations aplicadas y poner este valor (y RH_FORCE_DEMO) a `false`.
export const APP_FORCE_DEMO = true;

/** Devuelve `undefined` en modo demo forzado (como si la variable no existiera). */
export function demoGatedEnv(value: string | undefined): string | undefined {
  return APP_FORCE_DEMO ? undefined : value;
}
