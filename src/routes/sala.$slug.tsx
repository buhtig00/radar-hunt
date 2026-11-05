// Pantalla de sala (proyector): a pantalla completa, sin la interfaz de la aplicación.
import { createFileRoute, Link } from "@tanstack/react-router";
import { IS_STATIC_DEMO } from "@/lib/radar-hunt/static";
import { BookOpen, CheckCircle2, Radio, Timer, Trophy, Users } from "lucide-react";
import { useCrossTabSync, useSala } from "@/lib/radar-hunt/congress/hooks";
import { QrImage } from "@/components/radar-hunt/congress/qr";
import { PhaseLabel } from "@/components/radar-hunt/congress/live";
import { useCountdown } from "@/lib/radar-hunt/congress/use-countdown";
import type { SalaView } from "@/lib/radar-hunt/congress/types";

export const Route = createFileRoute("/sala/$slug")({
  head: () => ({
    meta: [{ title: "Pantalla de sala · Radar Hunt" }, { name: "robots", content: "noindex" }],
  }),
  component: SalaScreen,
});

const LETTERS = "ABCDEF";

function SalaScreen() {
  const { slug } = Route.useParams();
  useCrossTabSync();
  const q = useSala(slug);
  const s = q.data;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <div className="rh-theme rh-hero-bg rh-on-ink flex min-h-screen flex-col p-6 text-white md:p-10">
      {!s ? (
        <div className="m-auto text-white/70">
          {q.error ? (q.error as Error).message : "Conectando…"}
        </div>
      ) : (
        <>
          {IS_STATIC_DEMO && (
            <Link
              to="/radar-hunt/congresos/$slug"
              params={{ slug }}
              className="mb-4 self-start rounded-md border border-white/30 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
            >
              ← Volver al congreso
            </Link>
          )}
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--gold)]">
                Radar Hunt · Play. Learn. Discover.
              </div>
              <h1 className="font-serif text-3xl font-semibold md:text-4xl">{s.event.name}</h1>
            </div>
            <div className="flex items-center gap-6 text-sm text-white/80">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5" /> {s.participants} participantes
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" /> {s.stationsCompleted} retos de estación
              </span>
            </div>
          </header>
          <main className="mt-8 grid flex-1 gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <LivePanel s={s} />
            <aside className="flex flex-col gap-6">
              <div className="flex items-center gap-4 rounded-2xl bg-white p-4 text-[#0b1f3a]">
                <QrImage text={`${origin}/radar-hunt/congresos/${s.event.slug}`} size={130} />
                <div>
                  <div className="font-serif text-xl font-semibold">¡Participa!</div>
                  <p className="text-sm">Escanea, inscríbete y responde desde tu móvil.</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                <h2 className="mb-3 flex items-center gap-2 font-semibold">
                  <Trophy className="h-5 w-5 text-[color:var(--gold)]" /> Clasificación del congreso
                </h2>
                <ol className="flex flex-col gap-1.5">
                  {s.top.length === 0 && (
                    <li className="text-sm text-white/60">Aún no hay puntuaciones.</li>
                  )}
                  {s.top.map((r) => (
                    <li key={r.userId} className="flex items-center justify-between text-lg">
                      <span className="truncate">
                        <span
                          className={`mr-3 inline-block w-6 font-mono ${r.rank <= 3 ? "text-[color:var(--rh-podium)]" : "text-[color:var(--rh-radar-300)]"}`}
                        >
                          {r.rank}
                        </span>
                        {r.name}
                      </span>
                      <span className="font-mono">{Math.round(r.score)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </aside>
          </main>
          <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-white/60">
            <span>{s.event.recognition}</span>
            {s.event.sponsors.length > 0 && (
              <span>
                Con el apoyo de {s.event.sponsors.map((x) => x.name).join(", ")}. Los patrocinadores
                no elaboran ni seleccionan las preguntas.
              </span>
            )}
          </footer>
        </>
      )}
    </div>
  );
}

function LivePanel({ s }: { s: SalaView }) {
  const v = s.live;
  const left = useCountdown(v);
  if (!v || !v.item)
    return (
      <section className="flex flex-col items-center justify-center rounded-3xl border border-white/15 bg-white/5 p-10 text-center">
        <Radio className="h-12 w-12 text-[color:var(--gold)]" />
        <p className="mt-4 font-serif text-3xl">
          {v ? v.session.title : "Recorre las estaciones del congreso"}
        </p>
        <p className="mt-2 text-white/70">
          {v
            ? "Esperando el siguiente reto…"
            : "Escanea el QR de cada estación y resuelve su reto. Los retos en sala aparecerán aquí."}
        </p>
      </section>
    );
  const it = v.item;
  const pct = (id: string) =>
    v.reveal && v.reveal.answered
      ? Math.round(((v.reveal.tally[id] ?? 0) / v.reveal.answered) * 100)
      : null;
  return (
    <section className="flex flex-col gap-5 rounded-3xl border border-white/15 bg-white/5 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-white/70">
          {v.session.room} · {v.session.title} · {it.kind === "poll" ? "Encuesta" : "Reto"}{" "}
          {v.itemIndex + 1}/{v.itemCount}
        </div>
        <div className="flex items-center gap-3">
          <PhaseLabel view={v} />
          {v.phase === "open" && (
            <span className="flex items-center gap-1 font-mono text-3xl font-bold text-[color:var(--gold)]">
              <Timer className="h-7 w-7" /> {Math.ceil(left / 1000)}
            </span>
          )}
        </div>
      </div>
      <h2 className="font-serif text-3xl font-semibold leading-snug md:text-4xl">{it.stem}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {it.options.map((o, i) => {
          const right = v.reveal?.correctOptionIds.includes(o.id);
          const p = pct(o.id);
          return (
            <div
              key={o.id}
              className={`relative overflow-hidden rounded-xl border-2 px-5 py-4 text-xl ${right ? "border-[#1f9d6b] bg-[#1f9d6b]/20" : "border-white/15 bg-white/5"}`}
            >
              {p !== null && (
                <span
                  className="absolute inset-y-0 left-0 bg-[color:var(--gold)]/25"
                  style={{ width: `${p}%` }}
                  aria-hidden
                />
              )}
              <span className="relative flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 font-bold">
                  {LETTERS[i]}
                </span>
                <span className="flex-1">{o.text}</span>
                {p !== null && <span className="font-mono">{p} %</span>}
                {right && <CheckCircle2 className="h-6 w-6 text-[#1f9d6b]" />}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-white/70">
        <span className="text-lg">
          {v.answered} {v.answered === 1 ? "respuesta" : "respuestas"}
        </span>
        {it.unvalidated && (
          <span className="text-xs">Pregunta de demostración pendiente de validación KOL</span>
        )}
      </div>
      {v.reveal?.explanation && (
        <div className="rounded-xl bg-white/10 p-4">
          <p className="text-lg">{v.reveal.explanation}</p>
          {v.reveal.references.map((r) => (
            <p key={r.citation} className="mt-2 flex items-start gap-2 text-sm text-white/70">
              <BookOpen className="mt-0.5 h-4 w-4 shrink-0" /> {r.citation}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
