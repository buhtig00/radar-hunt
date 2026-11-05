// RADAR HUNT — lógica compartida del escaneo: interpreta lo leído, lo valida en el
// servidor y lleva al reto de la estación (o explica qué falta).
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { rhc } from "@/lib/radar-hunt/congress/service";
import { rememberReturn, rhcKeys } from "@/lib/radar-hunt/congress/hooks";
import { parseScan } from "@/lib/radar-hunt/congress/tokens";

export function useScan(slug?: string) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{
    message: string;
    needsJoin?: boolean;
    slug?: string;
  } | null>(null);

  async function handle(raw: string) {
    const parsed = parseScan(raw);
    if (!parsed) {
      setError({ message: "Ese código no es de una estación de Radar Hunt." });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await rhc.scan({ ...parsed, slug });
      rememberReturn(r.roundId, r.eventSlug);
      await qc.invalidateQueries({ queryKey: rhcKeys.all });
      void navigate({ to: "/radar-hunt/jugar/$roundId", params: { roundId: r.roundId } });
    } catch (e) {
      const message = (e as Error).message;
      const needsJoin = /Inscríbete/.test(message);
      // Tras inscribirse, el escaneo pendiente se completa solo.
      if (needsJoin && slug)
        try {
          window.sessionStorage.setItem(`rh-pending-scan:${slug}`, raw);
        } catch {
          /* sin almacenamiento */
        }
      setError({ message, needsJoin, slug });
    } finally {
      setBusy(false);
    }
  }
  /** Completa el escaneo que quedó pendiente de la inscripción, si lo hay. */
  async function resumePending() {
    if (!slug) return false;
    let raw: string | null = null;
    try {
      raw = window.sessionStorage.getItem(`rh-pending-scan:${slug}`);
      window.sessionStorage.removeItem(`rh-pending-scan:${slug}`);
    } catch {
      /* sin almacenamiento */
    }
    if (!raw) return false;
    await handle(raw);
    return true;
  }
  return { handle, resumePending, busy, error };
}
