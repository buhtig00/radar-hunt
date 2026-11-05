// RADAR HUNT — versión estática de demostración (sin servidor), p. ej. publicada como
// artefacto: se navega en una sola pestaña y los recursos cuelgan de una ruta relativa.
const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
export const IS_STATIC_DEMO = env.VITE_STATIC_DEMO === "true";
/** Prefijo de los ficheros de /public ("/" en la app, "./" en la versión estática). */
export const PUBLIC_BASE = env.BASE_URL ?? "/";
