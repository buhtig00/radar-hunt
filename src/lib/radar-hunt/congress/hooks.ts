// RADAR HUNT — hooks de datos del modo congreso (React Query sobre la fachada `rhc`).
// El directo se actualiza por sondeo corto (1–1,5 s). En la demo, además, los cambios
// de otra pestaña (moderación ↔ pantalla de sala) llegan por el evento «storage».
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CONGRESS_DEMO_KEY } from "./demo-state";
import { rhc } from "./service";

export const rhcKeys = {
  all: ["rhc"] as const,
  events: ["rhc", "events"] as const,
  event: (slug: string) => ["rhc", "event", slug] as const,
  ranking: (slug: string) => ["rhc", "ranking", slug] as const,
  live: (slug: string) => ["rhc", "live", slug] as const,
  sala: (slug: string) => ["rhc", "sala", slug] as const,
  admin: (slug: string) => ["rhc", "admin", slug] as const,
  season: ["rhc", "season"] as const,
  progress: ["rhc", "progress"] as const,
};

/** Demo: refresca al cambiar los datos en otra pestaña del mismo navegador. */
export function useCrossTabSync() {
  const qc = useQueryClient();
  useEffect(() => {
    if (rhc.mode !== "demo" || typeof window === "undefined") return;
    const on = (e: StorageEvent) => {
      if (e.key === CONGRESS_DEMO_KEY || e.key === "rh-demo-v1")
        void qc.invalidateQueries({ queryKey: rhcKeys.all });
    };
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, [qc]);
}

export const useEvents = () =>
  useQuery({ queryKey: rhcKeys.events, queryFn: () => rhc.listEvents() });
export const useEventView = (slug: string) =>
  useQuery({
    queryKey: rhcKeys.event(slug),
    queryFn: () => rhc.eventView(slug),
    refetchInterval: 15_000,
  });
export const useRanking = (slug: string) =>
  useQuery({
    queryKey: rhcKeys.ranking(slug),
    queryFn: () => rhc.ranking(slug),
    refetchInterval: 10_000,
  });
export const useLive = (slug: string, enabled = true) =>
  useQuery({
    queryKey: rhcKeys.live(slug),
    queryFn: () => rhc.liveView(slug),
    refetchInterval: 1500,
    enabled,
  });
export const useSala = (slug: string) =>
  useQuery({ queryKey: rhcKeys.sala(slug), queryFn: () => rhc.sala(slug), refetchInterval: 1000 });
export const useAdmin = (slug: string) =>
  useQuery({
    queryKey: rhcKeys.admin(slug),
    queryFn: () => rhc.adminOverview(slug),
    refetchInterval: (q) => (q.state.error ? false : 3000),
    // «Solo la organización…» no se arregla reintentando.
    retry: false,
  });

/** Recuerda a qué congreso volver al terminar el reto de una estación. */
export function rememberReturn(roundId: string, slug: string) {
  try {
    window.sessionStorage.setItem(`rh-return:${roundId}`, slug);
  } catch {
    /* sin almacenamiento */
  }
}
export function returnSlug(roundId: string): string | null {
  try {
    return window.sessionStorage.getItem(`rh-return:${roundId}`);
  } catch {
    return null;
  }
}

export const useSeason = () =>
  useQuery({ queryKey: rhcKeys.season, queryFn: () => rhc.season(), refetchInterval: 20_000 });
export const useProgress = () =>
  useQuery({ queryKey: rhcKeys.progress, queryFn: () => rhc.myProgress() });
