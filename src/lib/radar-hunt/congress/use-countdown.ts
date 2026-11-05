import { useEffect, useState } from "react";
import type { LiveView } from "./types";

/** Cuenta atrás local sincronizada con el reloj del servidor. */
export function useCountdown(view: LiveView | null | undefined) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!view || view.phase !== "open" || view.remainingMs === undefined) return setLeft(0);
    const deadline = performance.now() + view.remainingMs;
    const id = window.setInterval(() => setLeft(Math.max(0, deadline - performance.now())), 200);
    setLeft(view.remainingMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se reprograma solo al cambiar de fase o ítem
  }, [view?.phase, view?.remainingMs, view?.itemIndex, view?.session.id]);
  return left;
}
