// RADAR HUNT — hooks de datos (React Query) sobre la fachada `rh`.
import { useQuery } from "@tanstack/react-query";
import { rh } from "./service";

export const rhKeys = {
  profile: ["rh", "profile"] as const,
  league: (id: string) => ["rh", "league", id] as const,
  boss: ["rh", "boss"] as const,
  competency: ["rh", "competency"] as const,
  eyeProgress: ["rh", "eye-progress"] as const,
  verifications: (s: string) => ["rh", "verifications", s] as const,
};

export function useMyProfile() {
  return useQuery({ queryKey: rhKeys.profile, queryFn: () => rh.getMyProfile() });
}
export function useLeagueView(id: string) {
  return useQuery({ queryKey: rhKeys.league(id), queryFn: () => rh.getLeagueView(id) });
}
export function useBossList() {
  return useQuery({ queryKey: rhKeys.boss, queryFn: () => rh.listBoss() });
}
export function useEyeProgress() {
  return useQuery({ queryKey: rhKeys.eyeProgress, queryFn: () => rh.eyeProgress() });
}
export function useCompetency() {
  return useQuery({ queryKey: rhKeys.competency, queryFn: () => rh.myCompetency() });
}
