import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Award,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Map as MapIcon,
  MapPin,
  MonitorPlay,
  Radio,
  ScanLine,
  Settings,
  Star,
  Trophy,
} from "lucide-react";
import { rhc } from "@/lib/radar-hunt/congress/service";
import {
  rememberReturn,
  rhcKeys,
  useCrossTabSync,
  useEventView,
  useRanking,
} from "@/lib/radar-hunt/congress/hooks";
import type { EventView } from "@/lib/radar-hunt/congress/types";
import type { CareerStage } from "@/lib/radar-hunt/types";
import { LoadingState } from "@/components/empty-loading";
import { SalaLink } from "@/components/radar-hunt/congress/sala-link";
import { RankBadge, SubBadge } from "@/components/radar-hunt/ui";
import { VenueMap } from "@/components/radar-hunt/congress/venue-map";
import { LiveParticipant } from "@/components/radar-hunt/congress/live";
import { useScan } from "@/components/radar-hunt/congress/use-scan";
import { HUNT_TRACKS } from "@/lib/radar-hunt/seed-hunt-matrix";

export const Route = createFileRoute("/radar-hunt/congresos/$slug")({
  head: () => ({ meta: [{ title: "Congreso · Radar Hunt" }] }),
  component: EventPage,
});

type Tab = "estaciones" | "directo" | "clasificacion" | "valoracion" | "bases";
const TABS: { id: Tab; label: string; icon: typeof MapIcon }[] = [
  { id: "estaciones", label: "Estaciones", icon: MapIcon },
  { id: "directo", label: "Directo", icon: Radio },
  { id: "clasificacion", label: "Clasificación", icon: Trophy },
  { id: "valoracion", label: "Valoración", icon: Star },
  { id: "bases", label: "Bases y privacidad", icon: ClipboardList },
];

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long" });

function EventPage() {
  const { slug } = Route.useParams();
  useCrossTabSync();
  const view = useEventView(slug);
  const [tab, setTab] = useState<Tab>("estaciones");
  useEffect(() => {
    const h = window.location.hash.replace("#", "") as Tab;
    if (TABS.some((t) => t.id === h)) setTab(h);
  }, []);
  const choose = (t: Tab) => {
    setTab(t);
    history.replaceState(null, "", `#${t}`);
  };

  if (view.isLoading) return <LoadingState label="Cargando el congreso…" />;
  if (view.error || !view.data)
    return (
      <p className="text-sm text-destructive">
        {(view.error as Error)?.message ?? "Congreso no encontrado."}
      </p>
    );
  const v = view.data;
  const e = v.event;
  const live = v.sessions.find((s) => s.phase !== "idle" && s.phase !== "ended");

  return (
    <div className="flex flex-col gap-5">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(120%_140%_at_85%_0%,#1d3a66_0%,#0b1f3a_45%,#07111f_100%)] px-6 py-7 text-white shadow-[var(--shadow-card)] md:px-8">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--gold)]">
          Radar Hunt · Congreso{e.isDemo ? " (demostración)" : ""}
        </div>
        <h1 className="mt-1 font-serif text-3xl font-semibold">{e.name}</h1>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/75">
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" /> {e.venue} · {e.city}
          </span>
          <span className="flex items-center gap-1">
            <CalendarDays className="h-4 w-4" /> {fmtDate(e.startsAt)} – {fmtDate(e.endsAt)}
          </span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to="/radar-hunt/congresos/$slug/escanear"
            params={{ slug }}
            className="flex items-center gap-2 rounded-md bg-[color:var(--gold)] px-4 py-2 text-sm font-semibold text-[color:var(--navy)]"
          >
            <ScanLine className="h-4 w-4" /> Escanear estación
          </Link>
          <button
            type="button"
            onClick={() => choose("directo")}
            className="flex items-center gap-2 rounded-md border border-white/30 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
          >
            <Radio className={`h-4 w-4 ${live ? "animate-pulse text-[color:var(--gold)]" : ""}`} />
            {live ? `En directo: ${live.title}` : "Directo"}
          </button>
          {v.canManage && (
            <>
              <Link
                to="/radar-hunt/congresos/$slug/admin"
                params={{ slug }}
                className="flex items-center gap-2 rounded-md border border-white/30 px-4 py-2 text-sm text-white hover:bg-white/10"
              >
                <Settings className="h-4 w-4" /> Organización
              </Link>
              <SalaLink
                slug={slug}
                className="flex items-center gap-2 rounded-md border border-white/30 px-4 py-2 text-sm text-white hover:bg-white/10"
              >
                <MonitorPlay className="h-4 w-4" /> Pantalla de sala
              </SalaLink>
            </>
          )}
        </div>
      </section>

      {v.participant ? <MyProgress v={v} /> : <JoinCard slug={slug} />}

      <nav
        className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1"
        aria-label="Secciones del congreso"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => choose(t.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
                tab === t.id
                  ? "bg-[color:var(--navy)] text-white"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </nav>

      {tab === "estaciones" && <StationsTab v={v} slug={slug} />}
      {tab === "directo" && <LiveParticipant slug={slug} joined={!!v.participant} />}
      {tab === "clasificacion" && <RankingTab slug={slug} />}
      {tab === "valoracion" && <FeedbackTab slug={slug} v={v} />}
      {tab === "bases" && <RulesTab v={v} />}
    </div>
  );
}

function MyProgress({ v }: { v: EventView }) {
  const total = v.stations.length;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Stat label="Tus RP" value={Math.round(v.me?.score ?? 0).toString()} />
      <Stat label="Tu puesto" value={v.me?.rank ? `${v.me.rank}.º` : "—"} />
      <Stat label="Estaciones" value={`${v.me?.stationsDone ?? 0}/${total}`} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-serif text-2xl font-semibold">{value}</div>
    </div>
  );
}

function JoinCard({ slug }: { slug: string }) {
  const qc = useQueryClient();
  const scan = useScan(slug);
  const [name, setName] = useState("");
  const [alias, setAlias] = useState("");
  const [hospital, setHospital] = useState("");
  const [stage, setStage] = useState<CareerStage | "">("");
  const [participation, setParticipation] = useState(false);
  const [publicRanking, setPublicRanking] = useState(false);
  const [communications, setCommunications] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    rhc.myDefaults().then((d) => {
      if (d.displayName) setName((n) => n || d.displayName!);
      if (d.hospital) setHospital((h) => h || d.hospital!);
      if (d.careerStage) setStage((s) => s || d.careerStage!);
    });
  }, []);
  const submit = async () => {
    setBusy(true);
    try {
      await rhc.join(slug, {
        displayName: name,
        alias: alias || undefined,
        hospital: hospital || undefined,
        careerStage: stage || undefined,
        consents: { participation, publicRanking, communications },
      });
      toast.success("¡Inscripción completada! Ya puedes escanear las estaciones.");
      await qc.invalidateQueries({ queryKey: rhcKeys.all });
      await scan.resumePending();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const input = "rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground";
  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border border-[color:var(--gold)]/50 bg-surface p-5 shadow-[var(--shadow-card)]"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div>
        <h2 className="font-serif text-xl font-semibold">Inscríbete para jugar</h2>
        <p className="text-sm text-muted-foreground">
          Un minuto. Solo pedimos lo necesario para la clasificación.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field id="rhc-name" label="Nombre y apellidos *">
          <input
            id="rhc-name"
            className={input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
          />
        </Field>
        <Field id="rhc-alias" label="Alias público (opcional)">
          <input
            id="rhc-alias"
            className={input}
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            maxLength={40}
            placeholder="Se mostrará en lugar de tu nombre"
          />
        </Field>
        <Field
          id="rhc-hospital"
          label="Centro de trabajo (opcional, para la clasificación por centros)"
        >
          <input
            id="rhc-hospital"
            className={input}
            value={hospital}
            onChange={(e) => setHospital(e.target.value)}
            maxLength={120}
          />
        </Field>
        <Field id="rhc-stage" label="Etapa profesional (opcional)">
          <select
            id="rhc-stage"
            className={input}
            value={stage}
            onChange={(e) => setStage(e.target.value as CareerStage | "")}
          >
            <option value="">Prefiero no indicarlo</option>
            <option value="resident">Residente</option>
            <option value="attending">Adjunto/a</option>
          </select>
        </Field>
      </div>
      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Consentimientos
        </legend>
        <Check id="rhc-c1" checked={participation} onChange={setParticipation}>
          <strong>Obligatorio.</strong> Acepto las bases del juego y el tratamiento de mis datos
          para participar y calcular la clasificación (ver «Bases y privacidad»).
        </Check>
        <Check id="rhc-c2" checked={publicRanking} onChange={setPublicRanking}>
          Opcional. Quiero aparecer con mi nombre o alias en la clasificación pública y en la
          pantalla de sala. Si no lo marcas, compites igual como «Participante anónimo».
        </Check>
        <Check id="rhc-c3" checked={communications} onChange={setCommunications}>
          Opcional. Quiero recibir comunicaciones de Ophthalmology Radar. Nunca compartimos tus
          datos con patrocinadores.
        </Check>
      </fieldset>
      <button
        type="submit"
        disabled={busy || !participation || !name.trim()}
        className="self-start rounded-md bg-[color:var(--navy)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Inscribiendo…" : "Inscribirme"}
      </button>
    </form>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function Check({
  id,
  checked,
  onChange,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <input
        id={id}
        type="checkbox"
        className="mt-1 h-4 w-4"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={id} className="text-muted-foreground">
        {children}
      </label>
    </div>
  );
}

/** Recorrido elegido (perfil de liga), recordado en este navegador. */
function useTrack(slug: string) {
  const key = `rh-track:${slug}`;
  const [track, setTrack] = useState<string>("all");
  useEffect(() => {
    try {
      setTrack(window.localStorage.getItem(key) ?? "all");
    } catch {
      /* sin almacenamiento */
    }
  }, [key]);
  const choose = (t: string) => {
    setTrack(t);
    try {
      window.localStorage.setItem(key, t);
    } catch {
      /* sin almacenamiento */
    }
  };
  return [track, choose] as const;
}

function StationsTab({ v, slug }: { v: EventView; slug: string }) {
  const navigate = useNavigate();
  const [floorId, setFloorId] = useState(v.event.floors[0]?.id ?? "");
  const [sel, setSel] = useState<string | undefined>();
  const [track, setTrack] = useTrack(slug);
  const tracks = [...new Set(v.stations.map((s) => s.track).filter(Boolean))] as string[];
  const stations =
    track === "all" || !tracks.includes(track)
      ? v.stations
      : v.stations.filter((s) => s.track === track);
  const selected = stations.find((s) => s.id === sel);
  const play = (roundId: string) => {
    rememberReturn(roundId, slug);
    void navigate({ to: "/radar-hunt/jugar/$roundId", params: { roundId } });
  };
  return (
    <div className="flex flex-col gap-4">
      {tracks.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tu recorrido · {stations.length} estaciones
          </span>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Recorrido">
            {["all", ...tracks].map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={track === t || (t === "all" && !tracks.includes(track))}
                onClick={() => {
                  setTrack(t);
                  const first = v.stations.find((x) => t === "all" || x.track === t);
                  if (first) setFloorId(first.floorId);
                }}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  track === t || (t === "all" && !tracks.includes(track))
                    ? "border-[color:var(--navy)] bg-[color:var(--navy)] text-white"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {t === "all" ? "Todas" : (HUNT_TRACKS[t] ?? t)}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <VenueMap
            floors={v.event.floors}
            floorId={floorId}
            onFloor={setFloorId}
            pins={stations}
            selectedId={sel}
            onPin={(id) => {
              setSel(id);
              const st = stations.find((s) => s.id === id);
              if (st) setFloorId(st.floorId);
            }}
          />
          {selected && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <StationCard s={selected} onPlay={play} slug={slug} />
            </div>
          )}
        </div>
        <ul className="flex flex-col gap-2" aria-label="Estaciones">
          {stations.map((s) => (
            <li
              key={s.id}
              className={`rounded-xl border bg-surface p-3 ${s.id === sel ? "border-[color:var(--gold)]" : "border-border"}`}
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => {
                  setSel(s.id);
                  setFloorId(s.floorId);
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">{s.label}</span>
                    {s.title}
                  </span>
                  {s.status === "done" ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-[color:var(--success)]">
                      <CheckCircle2 className="h-4 w-4" /> {Math.round(s.myScore ?? 0)} RP
                    </span>
                  ) : s.status === "unlocked" ? (
                    <span className="text-xs font-semibold text-[color:var(--gold)]">
                      Reto pendiente
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {v.event.floors.find((f) => f.id === s.floorId)?.name}
                    </span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StationCard({
  s,
  onPlay,
  slug,
}: {
  s: EventView["stations"][number];
  onPlay: (roundId: string) => void;
  slug: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="rounded bg-[color:var(--navy)] px-2 py-0.5 font-mono text-xs text-white">
          {s.label}
        </span>
        <h3 className="font-serif text-lg font-semibold">{s.title}</h3>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SubBadge code={s.subspecialty} />
        <span className="text-xs text-muted-foreground">{s.questionCount} preguntas</span>
      </div>
      <p className="text-sm text-muted-foreground">{s.description}</p>
      {s.sponsor && (
        <p className="rounded-md bg-muted px-3 py-2 text-[11px] text-muted-foreground">
          {s.sponsor.disclosure}
        </p>
      )}
      {s.status === "locked" && (
        <Link
          to="/radar-hunt/congresos/$slug/escanear"
          params={{ slug }}
          className="mt-1 flex items-center gap-2 self-start rounded-md bg-[color:var(--gold)] px-3 py-1.5 text-sm font-semibold text-[color:var(--navy)]"
        >
          <ScanLine className="h-4 w-4" /> Ve a la estación y escanea su QR
        </Link>
      )}
      {s.status === "unlocked" && (
        <button
          type="button"
          onClick={() => onPlay(s.roundId)}
          className="mt-1 self-start rounded-md bg-[color:var(--navy)] px-3 py-1.5 text-sm font-semibold text-white"
        >
          Resolver el reto
        </button>
      )}
      {s.status === "done" && (
        <p className="text-sm font-medium text-[color:var(--success)]">
          Completada · {Math.round(s.myScore ?? 0)} RP
        </p>
      )}
    </div>
  );
}

function RankingTab({ slug }: { slug: string }) {
  const r = useRanking(slug);
  const [mode, setMode] = useState<"individual" | "centros">("individual");
  if (r.isLoading) return <LoadingState label="Calculando la clasificación…" />;
  if (!r.data) return null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1">
        {(["individual", "centros"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium ${mode === m ? "border-[color:var(--navy)] bg-[color:var(--navy)] text-white" : "border-border text-muted-foreground"}`}
          >
            {m === "individual" ? "Individual" : "Centros"}
          </button>
        ))}
      </div>
      {mode === "individual" ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Participante</th>
                <th className="px-3 py-2 text-right">Estaciones</th>
                <th className="px-3 py-2 text-right">Sala</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {r.data.individual.map((x) => (
                <tr
                  key={x.userId}
                  className={`border-t border-border ${x.isMe ? "bg-[color:var(--gold)]/10 font-semibold" : ""}`}
                >
                  <td className="px-3 py-2">
                    <RankBadge rank={x.rank} />
                  </td>
                  <td className="px-3 py-2">
                    {x.name}
                    {x.isMe && " (tú)"}
                    {x.hospital && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {x.hospital}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{Math.round(x.stationScore)}</td>
                  <td className="px-3 py-2 text-right font-mono">{Math.round(x.liveScore)}</td>
                  <td className="px-3 py-2 text-right font-mono">{Math.round(x.score)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            Media de las 5 mejores puntuaciones de cada centro. Solo aparecen centros con al menos{" "}
            {r.data.hospitalMin} participantes.
          </p>
          {r.data.hospitals.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Aún no hay centros con participantes suficientes.
            </p>
          ) : (
            r.data.hospitals.map((h) => (
              <div
                key={h.hospital}
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2 text-sm"
              >
                <span>
                  <span className="mr-2">
                    <RankBadge rank={h.rank} />
                  </span>
                  {h.hospital}{" "}
                  <span className="text-xs text-muted-foreground">
                    · {h.participants} participantes
                  </span>
                </span>
                <span className="font-mono font-semibold">{Math.round(h.score)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function FeedbackTab({ slug, v }: { slug: string; v: EventView }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ overall: 0, stations: 0, live: 0, recommend: -1, comment: "" });
  const [busy, setBusy] = useState(false);
  if (!v.participant)
    return <p className="text-sm text-muted-foreground">Inscríbete para valorar el congreso.</p>;
  if (v.hasFeedback)
    return (
      <p className="rounded-xl border border-border bg-surface p-5 text-sm">
        ¡Gracias! Ya hemos recibido tu valoración.
      </p>
    );
  const stars = (k: "overall" | "stations" | "live", label: string) => (
    <div className="flex flex-col gap-1">
      <span className="text-sm">{label}</span>
      <div className="flex gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={f[k] === n}
            aria-label={`${n} de 5`}
            onClick={() => setF({ ...f, [k]: n })}
          >
            <Star
              className={`h-6 w-6 ${f[k] >= n ? "fill-[color:var(--gold)] text-[color:var(--gold)]" : "text-muted-foreground"}`}
            />
          </button>
        ))}
      </div>
    </div>
  );
  const ok = f.overall && f.stations && f.live && f.recommend >= 0;
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <p className="text-sm text-muted-foreground">
        Valoración del congreso para la organización. Es anónima en los informes, no da RP y no es
        un estudio de mercado.
      </p>
      {stars("overall", "Valoración global")}
      {stars("stations", "Estaciones y retos")}
      {stars("live", "Sesiones en directo")}
      <div className="flex flex-col gap-1">
        <span className="text-sm">¿Recomendarías esta experiencia a un colega? (0–10)</span>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 11 }, (_, n) => (
            <button
              key={n}
              type="button"
              onClick={() => setF({ ...f, recommend: n })}
              className={`h-8 w-8 rounded border text-xs ${f.recommend === n ? "border-[color:var(--navy)] bg-[color:var(--navy)] text-white" : "border-border"}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <label htmlFor="rhc-comment" className="flex flex-col gap-1 text-sm">
        Comentario (opcional)
        <textarea
          id="rhc-comment"
          maxLength={500}
          value={f.comment}
          onChange={(e) => setF({ ...f, comment: e.target.value })}
          className="min-h-20 rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </label>
      <button
        type="button"
        disabled={!ok || busy}
        onClick={async () => {
          setBusy(true);
          try {
            await rhc.submitFeedback(slug, { ...f, comment: f.comment || undefined });
            toast.success("¡Gracias por tu valoración!");
            await qc.invalidateQueries({ queryKey: rhcKeys.event(slug) });
          } catch (e) {
            toast.error((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
        className="self-start rounded-md bg-[color:var(--navy)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        Enviar valoración
      </button>
    </div>
  );
}

function RulesTab({ v }: { v: EventView }) {
  const e = v.event;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Box title="Cómo se juega" icon={<ScanLine className="h-4 w-4" />}>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Cada estación tiene un código QR: escanéalo (o escribe su código) para desbloquear su
            reto.
          </li>
          <li>
            Cada reto tiene hasta 5 preguntas, 30 s por pregunta y un solo intento. Cuenta el
            acierto y la dificultad; la rapidez no suma RP ni desempata (solo en los retos en sala
            da un pequeño extra).
          </li>
          <li>
            En las sesiones, el moderador lanza retos y encuestas en directo; respondes desde el
            móvil.
          </li>
          <li>El tiempo lo mide el servidor. Las encuestas de sala no dan RP.</li>
          <li>Esta clasificación es del congreso y no cuenta en las ligas.</li>
        </ul>
      </Box>
      <Box title="Reconocimiento" icon={<Award className="h-4 w-4" />}>
        <p>{e.recognition}</p>
      </Box>
      <Box title="Privacidad" icon={<ClipboardList className="h-4 w-4" />}>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Tratamos tu nombre, alias, centro y etapa profesional (si los indicas), tus respuestas y
            los escaneos, solo para el juego y la clasificación.
          </li>
          <li>No usamos tu ubicación: la presencia se acredita con el QR.</li>
          <li>
            No cedemos datos a patrocinadores. La organización solo recibe agregados y, si lo
            autorizas, tu nombre en la clasificación.
          </li>
          <li>Puedes pedir la retirada de tus datos a la organización del congreso.</li>
        </ul>
        <p className="mt-2 text-xs">
          Texto provisional pendiente de revisión por asesoría legal (RGPD).
        </p>
      </Box>
      <Box title="Patrocinio y contenido" icon={<Star className="h-4 w-4" />}>
        <p>
          Las preguntas salen del banco editorial de Ophthalmology Radar: aprobadas, validadas por
          KOL y con referencia. Los patrocinadores no las elaboran, seleccionan ni revisan.
        </p>
        {e.sponsors.map((s) => (
          <p key={s.name} className="mt-2 rounded bg-muted px-2 py-1 text-xs">
            <strong>{s.name}.</strong> {s.disclosure}
          </p>
        ))}
      </Box>
    </div>
  );
}

function Box({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 text-sm text-muted-foreground">
      <h3 className="mb-2 flex items-center gap-2 font-semibold text-foreground">
        {icon} {title}
      </h3>
      {children}
    </section>
  );
}
