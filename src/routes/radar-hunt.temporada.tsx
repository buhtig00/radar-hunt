import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Crown, MapPin, Radio, Trophy } from "lucide-react";
import { useSeason } from "@/lib/radar-hunt/congress/hooks";
import { LoadingState } from "@/components/empty-loading";
import { RankBadge, RhHero } from "@/components/radar-hunt/ui";
import { RH_IMAGES } from "@/lib/radar-hunt/palette";

export const Route = createFileRoute("/radar-hunt/temporada")({
  head: () => ({ meta: [{ title: "Temporada · Radar Hunt" }] }),
  component: SeasonPage,
});

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
const STATE = {
  open: { label: "En curso", cls: "bg-success/15 text-[color:var(--success)]" },
  upcoming: { label: "Próximo", cls: "bg-[color:var(--gold)]/15 text-foreground" },
  closed: { label: "Terminado", cls: "bg-muted text-muted-foreground" },
} as const;

function SeasonPage() {
  const q = useSeason();
  if (q.isLoading) return <LoadingState label="Cargando la temporada…" />;
  if (!q.data) return <p className="text-sm text-destructive">{(q.error as Error)?.message}</p>;
  const { plan, hunts, rows } = q.data;
  const slots = Math.max(plan.huntsPlanned, hunts.length);
  const me = rows.find((r) => r.isMe);
  return (
    <div className="flex flex-col gap-6">
      <RhHero
        image={RH_IMAGES.macula}
        eyebrow={plan.name}
        title={
          <>
            {plan.huntsPlanned} Hunts. <em>Una final.</em>
          </>
        }
      >
        Cada congreso es un Hunt. Cuentan tus {plan.bestHunts} mejores, así que perderte un congreso
        no te deja fuera. La temporada termina en la {plan.final.name}.
      </RhHero>

      <section className="grid gap-3 md:grid-cols-4">
        <Rule n={`${plan.bestHunts} de ${plan.huntsPlanned}`} t="Hunts que cuentan">
          Se suman tus mejores resultados de la temporada.
        </Rule>
        <Rule n={`0–${plan.eventScoreMax}`} t="Event Score">
          En cada Hunt, el ganador suma {plan.eventScoreMax}; el resto, en proporción. Un congreso
          grande no pesa más que uno pequeño.
        </Rule>
        <Rule n="Acierto" t="Lo que puntúa">
          Cuentan el acierto y la dificultad. La rapidez no suma ni desempata.
        </Rule>
        <Rule n={`Top ${plan.finalists}`} t="A la Gran Final">
          Los {plan.finalists} primeros de la temporada y el podio de cada liga.
        </Rule>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl">
          La ruta <em>de la temporada</em>
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hunts.map((h, i) => (
            <li key={h.id}>
              <Link
                to="/radar-hunt/congresos/$slug"
                params={{ slug: h.slug }}
                className="rh-card rh-card-hover flex h-full flex-col gap-1.5 rounded-2xl p-5 text-sm"
                style={
                  h.gameState === "open" ? { borderColor: "oklch(0.72 0.15 158 / 0.5)" } : undefined
                }
              >
                <span className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-[0.16em] text-[color:var(--rh-radar-300)]">
                    HUNT {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATE[h.gameState].cls}`}
                  >
                    {h.gameState === "open" && <Radio className="h-3 w-3" />}
                    {STATE[h.gameState].label}
                  </span>
                </span>
                <span className="text-lg font-semibold leading-snug text-white">{h.name}</span>
                <span className="flex items-center gap-1.5 text-white/55">
                  <MapPin className="h-3.5 w-3.5" /> {h.venue} · {h.city}
                </span>
                <span className="flex items-center gap-1.5 text-white/55">
                  <CalendarDays className="h-3.5 w-3.5" /> {fmt(h.startsAt)}
                </span>
                {h.isDemo && (
                  <span className="mt-1 self-start rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/55">
                    Ficticio (demostración)
                  </span>
                )}
              </Link>
            </li>
          ))}
          {slots > hunts.length && (
            <li
              className={`flex flex-col justify-between gap-4 rounded-2xl border border-dashed border-white/12 p-5 text-sm ${
                hunts.length % 3 === 0
                  ? "sm:col-span-2 lg:col-span-3"
                  : hunts.length % 3 === 1
                    ? "lg:col-span-2"
                    : ""
              }`}
            >
              <div>
                <div className="font-semibold text-white">
                  {slots - hunts.length} Hunts por anunciar
                </div>
                <p className="mt-1 text-white/55">
                  Las sociedades socias se anuncian al confirmarse cada acuerdo.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: slots - hunts.length }, (_, k) => (
                  <span
                    key={k}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 text-xs font-semibold tabular-nums text-white/45"
                  >
                    {String(hunts.length + k + 1).padStart(2, "0")}
                  </span>
                ))}
              </div>
            </li>
          )}
          <li className="rh-podium relative flex flex-col gap-1 overflow-hidden rounded-2xl border p-5 text-sm sm:col-span-2 lg:col-span-3">
            <Crown className="absolute -right-3 -top-4 h-28 w-28 opacity-10" aria-hidden />
            <span className="flex items-center gap-2 text-base font-semibold">
              <Crown className="h-5 w-5" /> {plan.final.name} · {plan.final.city} {plan.final.when}
            </span>
            <span className="text-white/75">
              Los mejores de la temporada y de cada liga compiten en directo en un caso BOSS final.
              {!plan.final.confirmed && " Sede y fecha pendientes de confirmación."}
            </span>
          </li>
        </ol>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xl">
            Clasificación <em>de temporada</em>
          </h2>
          {me && (
            <span className="text-sm text-muted-foreground">
              Tu puesto: <strong className="text-foreground">{me.rank}.º</strong> · {me.score} pts
              de temporada · {me.huntsPlayed} Hunt{me.huntsPlayed === 1 ? "" : "s"}
            </span>
          )}
        </div>
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            La clasificación aparecerá con los primeros resultados de los Hunts.
          </p>
        ) : (
          <div className="rh-card overflow-x-auto rounded-2xl">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-white/45">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Participante</th>
                  <th className="px-3 py-2">Hunts que cuentan</th>
                  <th className="px-3 py-2 text-right">Temporada</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r) => (
                  <tr
                    key={r.userId}
                    className={`border-t border-white/[0.06] ${r.isMe ? "bg-[color:var(--rh-radar-500)]/12 font-semibold" : ""}`}
                  >
                    <td className="px-3 py-2">
                      <RankBadge rank={r.rank} />
                    </td>
                    <td className="px-3 py-2">
                      {r.name}
                      {r.isMe && " (tú)"}
                      {r.isFinalist && (
                        <Trophy
                          className="ml-1 inline h-3.5 w-3.5 text-[color:var(--rh-podium)]"
                          aria-label="Plaza de Gran Final"
                        />
                      )}
                      {r.hospital && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          {r.hospital}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs tabular-nums text-white/45">
                      {r.counted.map((c) => c.eventScore).join(" + ")}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-white">
                      {r.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          La clasificación de temporada es independiente de las ligas online, que mantienen su
          propio calendario de rondas. Los nombres respetan el consentimiento de clasificación
          pública de cada congreso.
        </p>
      </section>
    </div>
  );
}

function Rule({ n, t, children }: { n: string; t: string; children: React.ReactNode }) {
  return (
    <div className="rh-card rounded-2xl p-5">
      <div className="text-2xl font-semibold tabular-nums tracking-tight text-[color:var(--rh-radar-300)]">
        {n}
      </div>
      <div className="mt-1 text-sm font-semibold text-white">{t}</div>
      <p className="mt-1 text-xs leading-relaxed text-white/55">{children}</p>
    </div>
  );
}
