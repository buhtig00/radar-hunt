// RADAR HUNT — formato de tiempos y fechas para la interfaz.
export function fmtMs(ms: number) {
  return `${(ms / 1000).toFixed(1)} s`;
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}
