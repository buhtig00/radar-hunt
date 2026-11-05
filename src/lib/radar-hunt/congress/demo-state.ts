// RADAR HUNT — estado de la demo del modo congreso (localStorage). Módulo sin
// dependencias del servicio de juego para que ambos puedan compartirlo sin ciclos.
import { emptyCongressState, memoryStationAccess, type CongressMemoryState } from "./repo-memory";

// v2: estaciones de la matriz de 8 estaciones por perfil.
export const CONGRESS_DEMO_KEY = "rh-congress-demo-v2";

let state: CongressMemoryState | null = null;

export function congressDemoState(): CongressMemoryState {
  if (state) return state;
  state = emptyCongressState();
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(CONGRESS_DEMO_KEY);
      if (raw) state = { ...emptyCongressState(), ...(JSON.parse(raw) as CongressMemoryState) };
    } catch {
      /* sin almacenamiento: la demo sigue en memoria */
    }
  }
  return state;
}

export function saveCongressDemo() {
  if (typeof window === "undefined" || !state) return;
  try {
    window.localStorage.setItem(CONGRESS_DEMO_KEY, JSON.stringify(state));
  } catch {
    /* almacenamiento lleno o bloqueado */
  }
}

/** Vuelve a leer el estado (otra pestaña lo ha cambiado: moderador ↔ pantalla de sala). */
export function reloadCongressDemo() {
  state = null;
  return congressDemoState();
}

export function resetCongressDemo() {
  state = emptyCongressState();
  saveCongressDemo();
}

export const demoStationAccess = memoryStationAccess;
