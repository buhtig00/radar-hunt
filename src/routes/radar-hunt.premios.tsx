import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Award, CheckCircle2, Compass, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { useProgress } from "@/lib/radar-hunt/congress/hooks";
import { computeBadges, PRIZE_POLICY, SEASON_PRIZES } from "@/lib/radar-hunt/season";
import { computeTrackBadges, EYE_PASS_PCT } from "@/lib/radar-hunt/eye-tracks";
import { useEyeProgress } from "@/lib/radar-hunt/hooks";
import { LoadingState } from "@/components/empty-loading";
import { RhHero } from "@/components/radar-hunt/ui";

export const Route = createFileRoute("/radar-hunt/premios")({
  head: () => ({ meta: [{ title: "Premios y recompensas · Radar Hunt" }] }),
  component: PrizesPage,
});

/** Estaciones del Eye Universe completadas (se guardan en este navegador). */
function useEyeStationsDone() {
  const [n, setN] = useState(0);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("rh-eye-stations-done-v1");
      setN(raw ? (JSON.parse(raw) as string[]).length : 0);
    } catch {
      setN(0);
    }
  }, []);
  return n;
}

function PrizesPage() {
  const progress = useProgress();
  const eyeDone = useEyeStationsDone();
  const eye = useEyeProgress();
  const trackBadges = computeTrackBadges(eye.data ?? []);
  const earnedTracks = trackBadges.filter((b) => b.earned && b.track).length;
  return (
    <div className="flex flex-col gap-6">
      <RhHero
        eyebrow="Premios ≠ Recompensas"
        title={
          <>
            Lo valioso <em>se gana.</em>
          </>
        }
      >
        Los <strong className="text-white">premios</strong> se ganan por clasificación y son
        académicos. Las <strong className="text-white">recompensas</strong> son insignias por tu
        progreso. Los RP son la única moneda: miden lo que sabes, no se canjean por regalos.
      </RhHero>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
          <h2 className="flex items-center gap-2 text-lg">
            <Award className="h-5 w-5 text-[color:var(--rh-podium)]" /> Premios{" "}
            <em>por clasificación</em>
          </h2>
          <ul className="flex flex-col gap-2">
            {SEASON_PRIZES.map((p) => (
              <li key={p.who} className="rounded-xl border border-border px-3 py-2 text-sm">
                <div className="font-semibold">{p.who}</div>
                <div className="text-muted-foreground">{p.what}</div>
              </li>
            ))}
          </ul>
          <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> {PRIZE_POLICY}
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-[color:var(--gold)]" /> Recompensas{" "}
              <em>por progreso</em>
            </h2>
            {progress.data && (
              <span className="rounded-full bg-[color:var(--navy)] px-3 py-1 font-mono text-sm text-white">
                {Math.round(progress.data.rp)} RP
              </span>
            )}
          </div>
          {progress.isLoading ? (
            <LoadingState label="Calculando tu progreso…" />
          ) : !progress.data ? (
            <p className="text-sm text-muted-foreground">Inicia sesión para ver tus insignias.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {computeBadges(progress.data, eyeDone).map((b) => (
                <li
                  key={b.id}
                  className={`flex flex-col gap-1.5 rounded-xl border px-3 py-2.5 text-sm ${b.earned ? "border-[color:var(--gold)] bg-[color:var(--gold)]/8" : "border-border"}`}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    {b.earned ? (
                      <CheckCircle2 className="h-4 w-4 text-[color:var(--gold)]" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                    {b.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{b.description}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <span
                      className="block h-full rounded-full bg-[color:var(--gold)]"
                      style={{ width: `${Math.round(b.progress * 100)}%` }}
                    />
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">{b.hint}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            La práctica libre no suma RP. Los RP de estaciones y retos en sala cuentan en la
            clasificación del congreso; los de ligas, en su liga.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg">
            <Compass className="h-5 w-5 text-[color:var(--gold)]" /> Insignias{" "}
            <em>del Eye Universe</em>
          </h2>
          <span className="text-sm text-muted-foreground">
            {earnedTracks}/{trackBadges.length - 1} recorridos completados
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Una por recorrido: supera todas sus estaciones con al menos un {EYE_PASS_PCT} % de
          aciertos en la práctica de cada una. Son reconocimiento de progreso: no dan RP ni puntos
          de temporada.
        </p>
        {eye.isLoading ? (
          <LoadingState label="Calculando tus recorridos…" />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {trackBadges.map((b) => (
              <li key={b.id}>
                <Link
                  to="/radar-hunt/eye"
                  search={b.track ? { recorrido: b.track } : {}}
                  className={`flex h-full flex-col gap-1.5 rounded-xl border px-3 py-2.5 text-sm transition hover:bg-muted/60 ${b.earned ? "border-transparent" : "border-border"}`}
                  style={
                    b.earned ? { background: `${b.color}22`, borderColor: b.color } : undefined
                  }
                >
                  <span className="flex items-center gap-2 font-semibold">
                    {b.earned ? (
                      <Award className="h-4 w-4" style={{ color: b.color }} />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                    {b.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{b.description}</span>
                  <span className="mt-auto h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${Math.round(b.progress * 100)}%`, background: b.color }}
                    />
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">{b.hint}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
