// Pantalla de sala (proyector): a pantalla completa, sin la interfaz de la aplicación.
// Diseñada para leerse desde el fondo de un auditorio: tipografía grande, mucho contraste,
// QR grande cuando no hay reto en curso y clasificación con podio.
import { createFileRoute, Link } from "@tanstack/react-router";
import { IS_STATIC_DEMO } from "@/lib/radar-hunt/static";
import { BookOpen, CheckCircle2, Crown, Radio, ScanLine, Timer, Trophy, Users } from "lucide-react";
import { useCrossTabSync, useSala } from "@/lib/radar-hunt/congress/hooks";
import { QrImage } from "@/components/radar-hunt/congress/qr";
import { PhaseLabel } from "@/components/radar-hunt/congress/live";
import { RhLogo } from "@/components/radar-hunt/rh-shell";
import { useCountdown } from "@/lib/radar-hunt/congress/use-countdown";
import { RH_IMAGES } from "@/lib/radar-hunt/palette";
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
  const joinUrl = s ? `${origin}/radar-hunt/congresos/${s.event.slug}` : "";
  const liveItem = !!s?.live?.item;
  return (
    <div className="rh-theme rh-on-ink relative isolate flex min-h-screen flex-col overflow-hidden bg-[oklch(0.13_0.03_252)] p-6 text-white md:p-10">
      <img
        src={RH_IMAGES.congress}
        alt=""
        aria-hidden
        className="absolute inset-0 -z-20 h-full w-full object-cover opacity-25"
      />
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(90%_80%_at_70%_0%,oklch(0.3_0.07_230/0.55),transparent_60%),linear-gradient(180deg,oklch(0.13_0.03_252/0.4),oklch(0.12_0.03_252)_75%)]"
        aria-hidden
      />
      {!s ? (
        <div className="m-auto flex items-center gap-3 text-2xl text-white/70">
          <RhLogo className="h-10 w-10 animate-pulse text-[color:var(--rh-radar-500)]" />
          {q.error ? (q.error as Error).message : "Conectando…"}
        </div>
      ) : (
        <>
          {IS_STATIC_DEMO && (
            <Link
              to="/radar-hunt/congresos/$slug"
              params={{ slug }}
              className="mb-4 self-start rounded-full border border-white/30 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
            >
              ← Volver al congreso
            </Link>
          )}
          <header className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <RhLogo className="h-14 w-14 shrink-0 text-[color:var(--rh-radar-500)]" />
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.3em] text-[color:var(--rh-radar-300)]">
                  Radar Hunt · Play. Learn. Discover.
                </div>
                <h1 className="mt-1 text-4xl leading-tight xl:text-5xl">{s.event.name}</h1>
              </div>
            </div>
            <div className="flex gap-3">
              <Kpi icon={Users} value={s.participants} label="participantes" />
              <Kpi icon={CheckCircle2} value={s.stationsCompleted} label="retos de estación" />
            </div>
          </header>

          <main className="mt-8 grid flex-1 gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            {liveItem ? <LivePanel s={s} /> : <JoinPanel s={s} joinUrl={joinUrl} />}
            <aside className="flex flex-col gap-6">
              {liveItem && (
                <div className="flex items-center gap-5 rounded-3xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                  <div className="rounded-2xl bg-white p-2.5">
                    <QrImage text={joinUrl} size={120} />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">¡Participa!</div>
                    <p className="mt-1 text-base text-white/70">
                      Escanea y responde desde tu móvil.
                    </p>
                  </div>
                </div>
              )}
              <Leaderboard s={s} limit={liveItem ? 7 : 10} />
            </aside>
          </main>

          <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-sm text-white/55">
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

function Kpi({ icon: Icon, value, label }: { icon: typeof Users; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 backdrop-blur">
      <Icon className="h-6 w-6 text-[color:var(--rh-radar-300)]" />
      <div className="leading-tight">
        <div className="text-3xl font-semibold tabular-nums">{value}</div>
        <div className="text-sm text-white/60">{label}</div>
      </div>
    </div>
  );
}

/** Sin reto en curso: invitación a participar con un QR grande y los tres pasos. */
function JoinPanel({ s, joinUrl }: { s: SalaView; joinUrl: string }) {
  const v = s.live;
  return (
    <section className="flex flex-col justify-center gap-10 rounded-[32px] border border-white/10 bg-white/[0.05] p-10 backdrop-blur xl:flex-row xl:items-center xl:p-14">
      <div className="mx-auto shrink-0 rounded-[28px] bg-white p-5 shadow-[0_0_80px_-10px_var(--rh-radar-500)]">
        <QrImage text={joinUrl} size={300} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 text-base font-semibold uppercase tracking-[0.2em] text-[color:var(--rh-radar-300)]">
          <Radio className="h-5 w-5 animate-pulse" />
          {v ? v.session.title : "Juego abierto"}
        </div>
        <h2 className="mt-3 text-5xl leading-[1.05] xl:text-6xl">
          Escanea <em>y juega.</em>
        </h2>
        <p className="mt-3 text-xl text-white/70">
          {v
            ? "El siguiente reto aparecerá aquí en unos instantes."
            : "Los retos en sala aparecerán aquí durante las sesiones."}
        </p>
        <ol className="mt-8 flex flex-col gap-4">
          {[
            [
              "Escanea este código",
              "Te inscribes en el congreso desde tu móvil, sin instalar nada.",
            ],
            [
              "Recorre las estaciones",
              "Cada estación de la sede tiene su QR y su reto científico.",
            ],
            [
              "Responde en directo",
              "Durante las sesiones, contesta los retos que ves en pantalla.",
            ],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--rh-radar-500)] text-xl font-bold text-[color:var(--rh-navy-950)]">
                {i + 1}
              </span>
              <div>
                <div className="text-2xl font-semibold">{t}</div>
                <div className="text-lg text-white/60">{d}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Leaderboard({ s, limit }: { s: SalaView; limit: number }) {
  const podium = s.top.slice(0, 3);
  const rest = s.top.slice(3, limit);
  return (
    <div className="flex flex-1 flex-col rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur">
      <h2 className="flex items-center gap-2 text-2xl font-semibold">
        <Trophy className="h-6 w-6 text-[color:var(--rh-podium)]" /> Clasificación
      </h2>
      {s.top.length === 0 ? (
        <p className="mt-6 text-lg text-white/60">Aún no hay puntuaciones. ¡Sé el primero!</p>
      ) : (
        <>
          <ol className="mt-5 flex flex-col gap-2.5">
            {podium.map((r) => (
              <li
                key={r.userId}
                className="rh-podium flex items-center gap-4 rounded-2xl border px-4 py-3"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--rh-podium)] text-lg font-bold text-[color:var(--rh-podium-ink)]">
                  {r.rank === 1 ? <Crown className="h-5 w-5" /> : r.rank}
                </span>
                <span className="min-w-0 flex-1 truncate text-2xl font-semibold text-white">
                  {r.name}
                </span>
                <span className="text-2xl font-semibold tabular-nums text-white">
                  {Math.round(r.score)}
                </span>
              </li>
            ))}
          </ol>
          <ol className="mt-3 flex flex-col">
            {rest.map((r) => (
              <li
                key={r.userId}
                className="flex items-center gap-4 border-b border-white/[0.06] px-4 py-2.5 text-xl last:border-0"
              >
                <span className="w-10 text-center tabular-nums text-[color:var(--rh-radar-300)]">
                  {r.rank}
                </span>
                <span className="min-w-0 flex-1 truncate text-white/85">{r.name}</span>
                <span className="tabular-nums text-white/85">{Math.round(r.score)}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

function LivePanel({ s }: { s: SalaView }) {
  const v = s.live!;
  const left = useCountdown(v);
  const it = v.item!;
  const secs = Math.ceil(left / 1000);
  const pct = (id: string) =>
    v.reveal && v.reveal.answered
      ? Math.round(((v.reveal.tally[id] ?? 0) / v.reveal.answered) * 100)
      : null;
  return (
    <section className="flex flex-col gap-6 rounded-[32px] border border-white/10 bg-white/[0.05] p-8 backdrop-blur xl:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-lg text-white/65">
          {v.session.room} · {v.session.title} ·{" "}
          <span className="text-white">
            {it.kind === "poll" ? "Encuesta" : "Reto"} {v.itemIndex + 1}/{v.itemCount}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <PhaseLabel view={v} size="lg" />
          {v.phase === "open" && (
            <span
              className={`flex items-center gap-2 rounded-full border px-5 py-2 text-4xl font-bold tabular-nums ${
                secs <= 10
                  ? "border-[color:var(--warning)]/60 bg-[color:var(--warning)]/15 text-[color:var(--warning)]"
                  : "border-white/15 bg-white/[0.06] text-white"
              }`}
            >
              <Timer className="h-8 w-8" /> {secs}
            </span>
          )}
        </div>
      </div>
      <h2 className="text-4xl leading-tight xl:text-5xl">{it.stem}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {it.options.map((o, i) => {
          const right = v.reveal?.correctOptionIds.includes(o.id);
          const p = pct(o.id);
          return (
            <div
              key={o.id}
              className={`relative overflow-hidden rounded-2xl border-2 px-5 py-5 text-2xl ${
                right
                  ? "border-[color:var(--success)] bg-[color:var(--success)]/15"
                  : "border-white/12 bg-white/[0.04]"
              }`}
            >
              {p !== null && (
                <span
                  className={`absolute inset-y-0 left-0 transition-[width] duration-1000 ${right ? "bg-[color:var(--success)]/25" : "bg-[color:var(--rh-radar-500)]/20"}`}
                  style={{ width: `${p}%` }}
                  aria-hidden
                />
              )}
              <span className="relative flex items-center gap-4">
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-bold ${
                    right
                      ? "bg-[color:var(--success)] text-[color:var(--rh-navy-950)]"
                      : "bg-white/10 text-white"
                  }`}
                >
                  {LETTERS[i]}
                </span>
                <span className="flex-1">{o.text}</span>
                {p !== null && <span className="font-semibold tabular-nums">{p} %</span>}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-white/70">
        <span className="flex items-center gap-2 text-2xl">
          <ScanLine className="h-6 w-6 text-[color:var(--rh-radar-300)]" />
          <span className="font-semibold tabular-nums text-white">{v.answered}</span>
          {v.answered === 1 ? "respuesta" : "respuestas"}
        </span>
        {it.unvalidated && (
          <span className="text-sm">Pregunta de demostración pendiente de validación KOL</span>
        )}
      </div>
      {v.reveal?.explanation && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-6">
          <p className="text-2xl leading-snug">{v.reveal.explanation}</p>
          {v.reveal.references.map((r) => (
            <p key={r.citation} className="mt-3 flex items-start gap-2 text-base text-white/65">
              <BookOpen className="mt-1 h-4 w-4 shrink-0" /> {r.citation}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
