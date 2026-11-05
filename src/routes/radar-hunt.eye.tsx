import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Award,
  Box,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clapperboard,
  Compass,
  Droplets,
  Dumbbell,
  List,
  Lock,
  MapPin,
  Route as RouteIcon,
  Scissors,
  Sun,
  Trophy,
} from "lucide-react";
import { Eye3D, type CameraPreset } from "@/components/radar-hunt/eye-3d";
import { EyeFilm } from "@/components/radar-hunt/eye-film";
import { pupilReflexFactor, type StructureCode } from "@/components/radar-hunt/eye-anim";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  EYE_CHAPTERS,
  EYE_STATIONS,
  EYE_STRUCTURES,
  getStation,
  getStructure,
} from "@/lib/radar-hunt/eye-universe";
import {
  EYE_TRACKS,
  EYE_ZONE_LABELS,
  findTrackStation,
  getEyeTrack,
  EYE_PASS_PCT,
  isStationPassed,
  passMark,
  TRACK_BADGE_NAMES,
  trackProgress,
  stationsForStructure,
  trackStations,
  type AdnexaMode,
  type EyeTrack,
  type EyeTrackStation,
} from "@/lib/radar-hunt/eye-tracks";
import { leagueId, SUBSPECIALTY_LABELS } from "@/lib/radar-hunt/catalog";
import { useEyeProgress, useMyProfile } from "@/lib/radar-hunt/hooks";
import { rh } from "@/lib/radar-hunt/service";
import type { EyeStationProgress, SubspecialtyCode } from "@/lib/radar-hunt/types";

type Mode = "recorridos" | "viaje" | "3d" | "pelicula";
const MODES: Mode[] = ["recorridos", "viaje", "3d", "pelicula"];

interface EyeSearch {
  modo?: Mode;
  recorrido?: string;
  estacion?: string;
  vista?: "3d" | "lista";
}

export const Route = createFileRoute("/radar-hunt/eye")({
  validateSearch: (s: Record<string, unknown>): EyeSearch => ({
    modo: MODES.includes(s.modo as Mode) ? (s.modo as Mode) : undefined,
    recorrido: typeof s.recorrido === "string" ? s.recorrido : undefined,
    estacion: typeof s.estacion === "string" ? s.estacion : undefined,
    vista: s.vista === "lista" ? "lista" : s.vista === "3d" ? "3d" : undefined,
  }),
  head: () => ({ meta: [{ title: "Eye Universe · Radar Hunt" }] }),
  component: EyeUniversePage,
});

const CHAPTER_VIEW: Record<
  string,
  { preset: CameraPreset; cutaway: boolean; structure: StructureCode }
> = {
  S01: { preset: "cornea", cutaway: false, structure: "cornea" },
  S02A: { preset: "iris", cutaway: false, structure: "iris" },
  S02P: { preset: "iris", cutaway: false, structure: "pupil" },
  S02Z: { preset: "sagittal", cutaway: true, structure: "zonule" },
  S02: { preset: "lens", cutaway: true, structure: "lens" },
  S03: { preset: "sagittal", cutaway: true, structure: "vitreous" },
  S04: { preset: "fundus", cutaway: false, structure: "macula" },
  S04C: { preset: "sagittal", cutaway: true, structure: "retina" },
  S04D: { preset: "fovea", cutaway: false, structure: "fovea" },
};

const DONE_KEY = "rh-eye-stations-done-v1";

const PRESET_LABELS: [CameraPreset, string][] = [
  ["front", "Vista frontal"],
  ["cornea", "Córnea"],
  ["iris", "Iris"],
  ["sagittal", "Corte sagital"],
  ["lens", "Cristalino"],
  ["fundus", "Fondo de ojo"],
  ["fovea", "Fóvea"],
  ["posterior", "Polo posterior"],
  ["orbit", "Órbita"],
];

/** Recorrido por defecto según la subespecialidad principal del perfil. */
const TRACK_OF_SUB: Partial<Record<SubspecialtyCode, string>> = {
  retina: "retina",
  glaucoma: "glaucoma",
  cornea: "anterior",
  ocular_surface: "anterior",
  refractive: "anterior",
  cataract: "anterior",
  contactology: "anterior",
  neuro_ophthalmology: "neuroped",
  pediatric_ophthalmology: "neuroped",
  strabismus: "neuroped",
  oculoplastics: "oculoplastia",
  ocular_oncology: "oculoplastia",
};

function EyeUniversePage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/radar-hunt/eye" });
  const profile = useMyProfile();
  const progress = useEyeProgress();
  const mode: Mode = search.modo ?? "recorridos";
  const setSearch = (patch: Partial<EyeSearch>) =>
    void navigate({ search: (prev: EyeSearch) => ({ ...prev, ...patch }), replace: true });

  const tab = (m: Mode, label: string, Icon: typeof Box) => (
    <button
      type="button"
      onClick={() => setSearch({ modo: m === "recorridos" ? undefined : m })}
      aria-pressed={mode === m}
      className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 ${mode === m ? "bg-[color:var(--navy)] text-white" : "text-muted-foreground hover:text-foreground"}`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <h1 className="font-serif text-2xl font-semibold">Eye Universe</h1>
          <p className="text-sm text-muted-foreground">
            Recorre el ojo por especialidad: cada estación de los Hunts tiene su sitio en la
            anatomía, del párpado al vértice orbitario. Arrastra para girar y rueda para acercar.
          </p>
        </div>
        <div className="rh-scroll-x flex max-w-full overflow-x-auto rounded-lg border border-border bg-surface p-1 text-sm">
          {tab("recorridos", "Por especialidad", Compass)}
          {tab("viaje", "Viaje anatómico", RouteIcon)}
          {tab("3d", "Ojo 3D libre", Box)}
          {tab("pelicula", "Película", Clapperboard)}
        </div>
      </div>

      {mode === "recorridos" ? (
        <TracksMode
          search={search}
          setSearch={setSearch}
          progress={progress.data ?? []}
          primary={profile.data?.primarySubspecialty}
          stage={profile.data?.careerStage ?? "attending"}
        />
      ) : (
        <ClassicModes
          mode={mode}
          stage={profile.data?.careerStage ?? "attending"}
          openStation={(code) =>
            setSearch({ modo: undefined, estacion: code, recorrido: undefined })
          }
          setMode={(m) => setSearch({ modo: m })}
        />
      )}
    </div>
  );
}

// =========================================================================== por especialidad

function TracksMode({
  search,
  setSearch,
  progress,
  primary,
  stage,
}: {
  search: EyeSearch;
  setSearch: (p: Partial<EyeSearch>) => void;
  progress: EyeStationProgress[];
  primary?: SubspecialtyCode;
  stage: "resident" | "attending";
}) {
  const navigate = useNavigate();
  const byStation = useMemo(() => new Map(progress.map((p) => [p.station, p])), [progress]);
  const fromStation = findTrackStation(search.estacion);
  const track: EyeTrack =
    getEyeTrack(fromStation?.track) ??
    getEyeTrack(search.recorrido) ??
    getEyeTrack(primary ? TRACK_OF_SUB[primary] : undefined) ??
    EYE_TRACKS[0];
  const stations = useMemo(() => trackStations(track.code), [track.code]);
  const current: EyeTrackStation =
    (fromStation && fromStation.track === track.code ? fromStation : undefined) ??
    stations.find((s) => !isStationPassed(byStation.get(s.code))) ??
    stations[0];
  const idx = stations.findIndex((s) => s.code === current.code);
  const view = search.vista ?? "3d";
  const [selected, setSelected] = useState<StructureCode | null>(current.anchor.structure);
  useEffect(() => setSelected(current.anchor.structure), [current.code, current.anchor.structure]);

  const go = (code: string) => setSearch({ estacion: code, recorrido: undefined });
  const goTrack = (t: string) => setSearch({ recorrido: t, estacion: undefined });

  // ← → para moverse por el recorrido (fuera de campos de texto)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (e.key === "ArrowRight" && idx < stations.length - 1) go(stations[idx + 1].code);
      if (e.key === "ArrowLeft" && idx > 0) go(stations[idx - 1].code);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const practice = async (code: string) => {
    try {
      const rid = await rh.startStationPractice(code);
      navigate({ to: "/radar-hunt/jugar/$roundId", params: { roundId: rid } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const doneIn = (t: EyeTrack) => trackProgress(t, byStation).passed;
  const tp = trackProgress(track, byStation);
  useBadgeCelebration(byStation, progress.length > 0);
  const totalDone = EYE_TRACKS.reduce((n, t) => n + doneIn(t), 0);
  const totalStations = EYE_TRACKS.reduce((n, t) => n + t.route.length, 0);
  const markers = useMemo(
    () =>
      stations.map((s) => ({
        code: s.code,
        number: s.order,
        position: s.anchor.marker,
        label: `${s.order}. ${s.title}`,
        color: track.color,
      })),
    [stations, track.color],
  );
  const done = useMemo(
    () => stations.filter((s) => isStationPassed(byStation.get(s.code))).map((s) => s.code),
    [stations, byStation],
  );
  const a = current.anchor;
  const picked = selected && selected !== a.structure ? getStructure(selected) : undefined;

  return (
    <div className="flex flex-col gap-4">
      {/* Selector de recorrido */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="font-semibold uppercase tracking-wide">Tu recorrido</span>
          <span>
            {totalDone}/{totalStations} estaciones superadas
          </span>
        </div>
        <div className="rh-scroll-x -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist">
          {EYE_TRACKS.map((t) => {
            const on = t.code === track.code;
            return (
              <button
                key={t.code}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => goTrack(t.code)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-transparent text-[color:var(--navy)]" : "border-border bg-surface text-foreground hover:bg-muted"}`}
                style={on ? { background: t.color } : undefined}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: on ? "var(--navy)" : t.color }}
                />
                <span className="font-medium">{t.short}</span>
                {trackProgress(t, byStation).complete ? (
                  <Award className="h-4 w-4" aria-label="Insignia conseguida" />
                ) : (
                  <span className={`text-xs ${on ? "opacity-80" : "text-muted-foreground"}`}>
                    {doneIn(t)}/{t.route.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          <h2 className="font-serif text-xl font-semibold">{track.label}</h2>
          <p className="text-sm text-muted-foreground">{track.intro}</p>
          <div
            className={`mt-2 flex max-w-md items-center gap-2.5 rounded-lg border px-3 py-1.5 text-xs ${tp.complete ? "border-transparent" : "border-border bg-surface"}`}
            style={tp.complete ? { background: `${track.color}26` } : undefined}
          >
            <Award className="h-4 w-4 shrink-0" style={{ color: track.color }} />
            <span className="min-w-0 flex-1">
              <span className="font-semibold">Insignia «{TRACK_BADGE_NAMES[track.code]}»</span>
              {tp.complete ? (
                <span> · conseguida</span>
              ) : (
                <span className="text-muted-foreground">
                  {" "}
                  · {tp.passed}/{tp.total} superadas (≥ {EYE_PASS_PCT} % en cada estación)
                </span>
              )}
              <span className="mt-1 block h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${(tp.passed / tp.total) * 100}%`, background: track.color }}
                />
              </span>
            </span>
          </div>
        </div>
        <div className="flex rounded-lg border border-border bg-surface p-1 text-xs">
          <button
            type="button"
            onClick={() => setSearch({ vista: undefined })}
            aria-pressed={view === "3d"}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 ${view === "3d" ? "bg-[color:var(--navy)] text-white" : "text-muted-foreground"}`}
          >
            <Box className="h-3.5 w-3.5" /> Ojo 3D
          </button>
          <button
            type="button"
            onClick={() => setSearch({ vista: "lista" })}
            aria-pressed={view === "lista"}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 ${view === "lista" ? "bg-[color:var(--navy)] text-white" : "text-muted-foreground"}`}
          >
            <List className="h-3.5 w-3.5" /> Lista
          </button>
        </div>
      </div>

      {view === "lista" ? (
        <StationList
          stations={stations}
          track={track}
          progress={byStation}
          current={current.code}
          onOpen={(code) => setSearch({ estacion: code, vista: undefined })}
          onPractice={practice}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-3">
            <Eye3D
              className="h-[340px] sm:h-[420px] lg:h-[520px]"
              accommodation={0}
              pupilFactor={1}
              cutaway={!!a.cutaway}
              aqueousFlow={!!a.aqueous}
              adnexa={a.adnexa ?? "off"}
              preset="front"
              view={{ ...a.view, key: current.code }}
              selected={selected}
              onSelect={setSelected}
              stations={markers}
              activeStation={current.code}
              doneStations={done}
              onStation={go}
            />
            {/* Paso a paso del recorrido */}
            <ol
              className="rh-scroll-x flex gap-1.5 overflow-x-auto pb-1"
              aria-label="Estaciones del recorrido"
            >
              {stations.map((s) => {
                const on = s.code === current.code;
                const ok = isStationPassed(byStation.get(s.code));
                return (
                  <li key={s.code} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => go(s.code)}
                      aria-current={on ? "step" : undefined}
                      className={`flex max-w-[220px] items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs ${on ? "border-transparent bg-[color:var(--navy)] text-white" : "border-border bg-surface hover:bg-muted"}`}
                    >
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-[color:var(--navy)]"
                        style={{ background: track.color }}
                      >
                        {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.order}
                      </span>
                      <span className="truncate">{s.title}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="text-[11px] text-muted-foreground">
              Atajos: ← → para cambiar de estación. Pulsa un número del ojo para saltar a esa
              estación o una estructura para ver su ficha.
            </p>
          </div>

          <aside className="flex flex-col gap-3">
            <StationCard
              station={current}
              track={track}
              total={stations.length}
              progress={byStation.get(current.code)}
              stage={stage}
              onPrev={idx > 0 ? () => go(stations[idx - 1].code) : undefined}
              onNext={idx < stations.length - 1 ? () => go(stations[idx + 1].code) : undefined}
              onPractice={() => practice(current.code)}
            />
            {picked && (
              <StructureCard
                code={picked.code as StructureCode}
                stage={stage}
                compact
                onStation={(code) => go(code)}
              />
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function ProgressBadge({ p }: { p?: EyeStationProgress }) {
  if (!p)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Circle className="h-3.5 w-3.5" /> Pendiente
      </span>
    );
  const tries = p.attempts > 1 ? ` (${p.attempts} intentos)` : "";
  if (isStationPassed(p))
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--success)]">
        <CheckCircle2 className="h-3.5 w-3.5" /> Superada · mejor {p.bestCorrect}/{p.total}
        {tries}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
      <Circle className="h-3.5 w-3.5" /> Practicada · mejor {p.bestCorrect}/{p.total}
      {tries} · necesitas {passMark(p.total)}/{p.total}
    </span>
  );
}

const BADGES_SEEN_KEY = "rh-eye-badges-seen-v1";

/** Avisa una sola vez (por navegador) al conseguir la insignia de un recorrido. */
function useBadgeCelebration(byStation: Map<string, EyeStationProgress>, ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    let seen: string[] = [];
    try {
      seen = JSON.parse(window.localStorage.getItem(BADGES_SEEN_KEY) ?? "[]") as string[];
    } catch {
      seen = [];
    }
    const fresh = EYE_TRACKS.filter(
      (t) => trackProgress(t, byStation).complete && !seen.includes(t.code),
    );
    if (fresh.length === 0) return;
    for (const t of fresh)
      toast.success(`Insignia conseguida: ${TRACK_BADGE_NAMES[t.code]}`, {
        description: `Has superado las ${t.route.length} estaciones de ${t.label}.`,
      });
    try {
      window.localStorage.setItem(
        BADGES_SEEN_KEY,
        JSON.stringify([...seen, ...fresh.map((t) => t.code)]),
      );
    } catch {
      /* sin almacenamiento: el aviso puede repetirse, la insignia no cambia */
    }
  }, [byStation, ready]);
}

function StationCard({
  station,
  track,
  total,
  progress,
  stage,
  onPrev,
  onNext,
  onPractice,
}: {
  station: EyeTrackStation;
  track: EyeTrack;
  total: number;
  progress?: EyeStationProgress;
  stage: "resident" | "attending";
  onPrev?: () => void;
  onNext?: () => void;
  onPractice: () => void;
}) {
  const a = station.anchor;
  const structure = getStructure(a.structure);
  const clip = getStation(a.clip);
  const [showClip, setShowClip] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => setShowClip(false), [station.code]);
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: track.color }}
        >
          Estación {station.order} de {total} · {track.short}
        </span>
        <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
          {station.code}
        </span>
      </div>
      <h3 className="mt-1 font-serif text-xl font-semibold leading-tight">{station.title}</h3>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5">
          <MapPin className="h-3 w-3" /> {EYE_ZONE_LABELS[a.zone]}
          {structure ? ` · ${structure.name}` : ""}
        </span>
        <ProgressBadge p={progress} />
      </div>
      <p className="mt-3 text-sm">{a.focus}</p>

      {clip && (
        <div className="mt-3">
          {showClip ? (
            <video
              key={clip.code}
              className="aspect-video w-full rounded-lg bg-black"
              src={clip.video}
              poster={clip.poster}
              controls
              autoPlay
              playsInline
              muted
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowClip(true)}
              className="flex items-start gap-1.5 text-left text-sm font-medium text-primary"
            >
              <Clapperboard className="mt-0.5 h-4 w-4 shrink-0" /> Ver el tramo de película (
              {EYE_CHAPTERS.find((c) => c.code === clip.code)?.title})
            </button>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onPractice();
            } finally {
              setBusy(false);
            }
          }}
          className="rh-cta flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60"
        >
          <Dumbbell className="h-4 w-4" /> Practicar la estación
        </button>
        <p className="text-[11px] text-muted-foreground">
          Profundización (Science XP) de la estación y práctica de{" "}
          {SUBSPECIALTY_LABELS[station.subspecialty].toLowerCase()}. Con un {EYE_PASS_PCT} % de
          aciertos la estación queda superada y cuenta para la insignia del recorrido. No suma
          puntos de temporada.
        </p>
        <div className="flex items-start gap-2 rounded-lg border border-dashed border-border p-2.5 text-xs text-muted-foreground">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            El reto RADARS ({station.radarIds.length} preguntas) se juega en el Hunt presencial,
            escaneando el QR de la estación; no se publica aquí para que la competición sea justa.{" "}
            <Link to="/radar-hunt/congresos" className="font-medium text-primary underline">
              Ver congresos
            </Link>
          </span>
        </div>
        <Link
          to="/radar-hunt/ligas/$leagueId"
          params={{ leagueId: leagueId(station.subspecialty, stage) }}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
        >
          <Trophy className="h-4 w-4" /> Liga de {SUBSPECIALTY_LABELS[station.subspecialty]}
        </Link>
      </div>

      {structure && (
        <details className="mt-4 rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <summary className="cursor-pointer font-medium">Anatomía: {structure.name}</summary>
          <p className="mt-2 text-muted-foreground">{structure.summary}</p>
          <ul className="mt-2 space-y-1">
            {structure.facts.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                {f}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={!onPrev}
          onClick={onPrev}
          className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </button>
        <button
          type="button"
          disabled={!onNext}
          onClick={onNext}
          className="flex items-center gap-1 rounded-md bg-[color:var(--navy)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          Siguiente <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Contenido de la matriz pendiente de validación por el comité médico (KOL). Modelo 3D
        educativo pendiente de validación anatómica.
      </p>
    </div>
  );
}

function StationList({
  stations,
  track,
  progress,
  current,
  onOpen,
  onPractice,
}: {
  stations: EyeTrackStation[];
  track: EyeTrack;
  progress: Map<string, EyeStationProgress>;
  current: string;
  onOpen: (code: string) => void;
  onPractice: (code: string) => void;
}) {
  return (
    <ol className="flex flex-col gap-2" aria-label={`Estaciones de ${track.label}`}>
      {stations.map((s) => (
        <li
          key={s.code}
          className={`flex flex-col gap-3 rounded-xl border bg-surface p-4 sm:flex-row sm:items-center ${s.code === current ? "border-primary" : "border-border"}`}
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-[color:var(--navy)]"
            style={{ background: track.color }}
            aria-hidden
          >
            {s.order}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{s.code}</span>
              <span className="font-medium">{s.title}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>
                {EYE_ZONE_LABELS[s.anchor.zone]} · {getStructure(s.anchor.structure)?.name}
              </span>
              <ProgressBadge p={progress.get(s.code)} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{s.anchor.focus}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => onOpen(s.code)}
              className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm"
            >
              <Box className="h-4 w-4" /> Ver en el ojo
            </button>
            <button
              type="button"
              onClick={() => onPractice(s.code)}
              className="flex items-center gap-1 rounded-md bg-[color:var(--navy)] px-3 py-1.5 text-sm font-semibold text-white"
            >
              <Dumbbell className="h-4 w-4" /> Practicar
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}

// =========================================================================== ficha de estructura

function StructureCard({
  code,
  stage,
  compact = false,
  onChapter,
  onStation,
}: {
  code: StructureCode | null;
  stage: "resident" | "attending";
  compact?: boolean;
  onChapter?: (chapter: string) => void;
  onStation: (code: string) => void;
}) {
  const navigate = useNavigate();
  const structure = getStructure(code ?? undefined);
  const practice = async (sub: SubspecialtyCode) => {
    try {
      const rid = await rh.startPractice(sub);
      navigate({ to: "/radar-hunt/jugar/$roundId", params: { roundId: rid } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  if (!structure)
    return (
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-serif text-lg font-semibold">Elige una estructura</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Haz clic en el ojo o en la lista para ver su ficha, sus estaciones y sus ligas.
        </p>
      </div>
    );
  const hunts = stationsForStructure(structure.code as StructureCode);
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--gold)]">
        {compact ? "Has seleccionado" : "Estructura"}
      </div>
      <h2 className="mt-1 font-serif text-xl font-semibold">{structure.name}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{structure.summary}</p>
      {!compact && (
        <ul className="mt-3 space-y-1 text-sm">
          {structure.facts.map((f) => (
            <li key={f} className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
              {f}
            </li>
          ))}
        </ul>
      )}
      {hunts.length > 0 && (
        <>
          <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Estaciones de los Hunts aquí
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {hunts.map((s) => (
              <button
                key={s.code}
                type="button"
                onClick={() => onStation(s.code)}
                className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs hover:bg-muted"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: getEyeTrack(s.track)?.color }}
                />
                {s.code} · {s.title}
              </button>
            ))}
          </div>
        </>
      )}
      {!compact && (
        <>
          <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ligas y práctica
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {structure.subspecialties.map((s) => (
              <div
                key={s}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="font-medium">{SUBSPECIALTY_LABELS[s]}</span>
                <span className="flex gap-1">
                  <Link
                    to="/radar-hunt/ligas/$leagueId"
                    params={{ leagueId: leagueId(s, stage) }}
                    className="rounded-md bg-[color:var(--navy)] p-1.5 text-white"
                    title="Ver la liga"
                    aria-label={`Liga de ${SUBSPECIALTY_LABELS[s]}`}
                  >
                    <Trophy className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => practice(s)}
                    className="rounded-md border border-border p-1.5"
                    title="Práctica libre"
                    aria-label={`Práctica libre de ${SUBSPECIALTY_LABELS[s]}`}
                  >
                    <Dumbbell className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            ))}
          </div>
          {structure.chapter && onChapter && (
            <button
              type="button"
              onClick={() => onChapter(structure.chapter!)}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary"
            >
              <Clapperboard className="h-4 w-4" /> Ir a la estación{" "}
              {getStation(structure.chapter)?.number} del viaje ({structure.chapter})
            </button>
          )}
        </>
      )}
    </div>
  );
}

function StructureChips({
  selected,
  onSelect,
}: {
  selected: StructureCode | null;
  onSelect: (c: StructureCode) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Estructuras
      </div>
      <div className="flex flex-wrap gap-1.5">
        {EYE_STRUCTURES.map((s) => (
          <button
            key={s.code}
            type="button"
            onClick={() => onSelect(s.code as StructureCode)}
            className={`rounded-md border px-2 py-1 text-xs ${selected === s.code ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// =========================================================================== viaje, 3D libre y película

const ADNEXA_STRUCTURES = new Set<string>([
  "eyelids",
  "lacrimal",
  "extraocular_muscles",
  "orbit",
  "optic_nerve",
]);

function ClassicModes({
  mode,
  stage,
  openStation,
  setMode,
}: {
  mode: Exclude<Mode, "recorridos">;
  stage: "resident" | "attending";
  openStation: (code: string) => void;
  setMode: (m: Mode) => void;
}) {
  const [chapter, setChapter] = useState("S01");
  const [done, setDone] = useState<string[]>([]);
  const [autoAdvance, setAutoAdvance] = useState(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DONE_KEY);
      if (raw) setDone(JSON.parse(raw) as string[]);
    } catch {
      /* sin almacenamiento: el progreso vive solo en esta sesión */
    }
  }, []);
  const markDone = (code: string) =>
    setDone((prev) => {
      if (prev.includes(code)) return prev;
      const next = [...prev, code];
      try {
        window.localStorage.setItem(DONE_KEY, JSON.stringify(next));
      } catch {
        /* ignorar */
      }
      return next;
    });
  const markers = useMemo(
    () =>
      EYE_STATIONS.map((x) => ({
        code: x.code,
        number: x.number,
        position: x.marker,
        label: `${x.number}. ${EYE_CHAPTERS.find((c) => c.code === x.code)?.title ?? x.code}`,
      })),
    [],
  );
  const [preset, setPreset] = useState<CameraPreset>("front");
  const [cutaway, setCutaway] = useState(false);
  const [aqueous, setAqueous] = useState(false);
  const [adnexa, setAdnexa] = useState<AdnexaMode>("off");
  const [accommodation, setAccommodation] = useState(0);
  const [pupil, setPupil] = useState(1);
  const [selected, setSelected] = useState<StructureCode | null>(null);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  // Seleccionar una estructura de los anejos los muestra
  useEffect(() => {
    if (selected && ADNEXA_STRUCTURES.has(selected) && adnexa === "off")
      setAdnexa(selected === "eyelids" ? "full" : "orbit");
  }, [selected, adnexa]);

  const animate = (fn: (t: number) => boolean) => {
    cancelAnimationFrame(raf.current);
    const t0 = performance.now();
    const step = () => {
      if (fn((performance.now() - t0) / 1000)) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };
  const runReflex = () =>
    animate((t) => {
      setPupil(pupilReflexFactor(t));
      return t < 4;
    });
  const runAccommodation = () =>
    animate((t) => {
      // reposo 0,5 s → acomoda 1,5 s → mantiene 1,5 s → relaja 1,5 s (como S02Z)
      const e = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, u)));
      const a =
        t < 0.5 ? 0 : t < 2 ? e((t - 0.5) / 1.5) : t < 3.5 ? 1 : t < 5 ? e(1 - (t - 3.5) / 1.5) : 0;
      setAccommodation(a);
      return t < 5.2;
    });

  const goChapter = (code: string) => {
    setChapter(code);
    const v = CHAPTER_VIEW[code];
    if (!v) return;
    setPreset(v.preset);
    setCutaway(v.cutaway);
    setAdnexa("off");
    setSelected(v.structure);
    if (mode !== "pelicula" && code === "S02P") runReflex();
    if (mode !== "pelicula" && code === "S02Z") runAccommodation();
  };

  const st = getStation(chapter) ?? EYE_STATIONS[0];
  const ch = EYE_CHAPTERS.find((c) => c.code === st.code)!;
  const idx = EYE_STATIONS.findIndex((x) => x.code === st.code);
  const allDone = EYE_STATIONS.every((x) => done.includes(x.code));
  const chapterHunts = useMemo(() => {
    const seen = new Set<string>();
    return ch.structures
      .flatMap((s) => stationsForStructure(s as StructureCode))
      .filter((s) => (seen.has(s.code) ? false : (seen.add(s.code), true)));
  }, [ch]);
  const eye3d = (cls: string, withStations: boolean) => (
    <Eye3D
      className={cls}
      accommodation={accommodation}
      pupilFactor={pupil}
      cutaway={cutaway}
      aqueousFlow={aqueous}
      adnexa={adnexa}
      preset={preset}
      selected={selected}
      onSelect={setSelected}
      stations={withStations ? markers : undefined}
      activeStation={withStations ? st.code : null}
      doneStations={withStations ? done : undefined}
      onStation={withStations ? goChapter : undefined}
    />
  );

  if (mode === "pelicula")
    return (
      <EyeFilm
        station={st.code}
        autoAdvance
        onStation={goChapter}
        onStructure={(c) => setSelected(c as StructureCode)}
        onStationEnded={markDone}
      />
    );

  if (mode === "viaje")
    return (
      <>
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Progreso del viaje">
          {EYE_STATIONS.map((x) => (
            <button
              key={x.code}
              type="button"
              onClick={() => goChapter(x.code)}
              title={EYE_CHAPTERS.find((c) => c.code === x.code)?.title}
              className={`flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-xs font-semibold ${
                x.code === st.code
                  ? "border-[color:var(--gold)] bg-[color:var(--gold)] text-[color:var(--navy)]"
                  : done.includes(x.code)
                    ? "border-success bg-success/15 text-[color:var(--success)]"
                    : "border-border bg-surface text-muted-foreground"
              }`}
            >
              {done.includes(x.code) && x.code !== st.code ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                x.number
              )}
            </button>
          ))}
          <span className="ml-2 text-xs text-muted-foreground">
            {done.length}/{EYE_STATIONS.length} tramos vistos
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {eye3d("h-[340px] md:h-[460px]", true)}
          <div className="flex flex-col gap-3">
            <EyeFilm
              station={st.code}
              autoAdvance={autoAdvance}
              showChapterBar={false}
              onStation={goChapter}
              onStructure={(c) => setSelected(c as StructureCode)}
              onStationEnded={markDone}
            />
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--gold)]">
                Tramo {st.number} de {EYE_STATIONS.length}
              </div>
              <h2 className="mt-1 font-serif text-xl font-semibold">{ch.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{ch.summary}</p>
              {chapterHunts.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Estaciones de los Hunts en esta zona
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {chapterHunts.map((s) => (
                      <button
                        key={s.code}
                        type="button"
                        onClick={() => openStation(s.code)}
                        className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs hover:bg-muted"
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: getEyeTrack(s.track)?.color }}
                        />
                        {s.code} · {s.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => goChapter(EYE_STATIONS[idx - 1].code)}
                  className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </button>
                <button
                  type="button"
                  disabled={idx === EYE_STATIONS.length - 1}
                  onClick={() => goChapter(EYE_STATIONS[idx + 1].code)}
                  className="flex items-center gap-1 rounded-md bg-[color:var(--navy)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Siguiente tramo <ChevronRight className="h-4 w-4" />
                </button>
                <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                  Reproducción continua
                  <Switch
                    checked={autoAdvance}
                    onCheckedChange={setAutoAdvance}
                    aria-label="Reproducción continua"
                  />
                </label>
              </div>
              {allDone && (
                <p className="mt-3 rounded-md bg-success/10 px-3 py-2 text-sm text-[color:var(--success)]">
                  Viaje completado: has visto los 9 tramos. Sigue por especialidad para practicar
                  las estaciones de los Hunts.
                </p>
              )}
            </div>
            {selected && (
              <StructureCard code={selected} stage={stage} compact onStation={openStation} />
            )}
          </div>
        </div>
      </>
    );

  // Ojo 3D libre
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-3">
        {eye3d("h-[400px] md:h-[560px]", false)}
        <div className="grid gap-3 rounded-xl border border-border bg-surface p-4 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              {PRESET_LABELS.map(([p, label]) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPreset(p);
                    setCutaway(p === "sagittal" || p === "lens");
                    if (p === "orbit" && adnexa === "off") setAdnexa("orbit");
                  }}
                  className={`rounded-md border px-2.5 py-1 text-xs ${preset === p ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div>
              <div className="mb-1 text-sm">Anejos y órbita</div>
              <div className="flex rounded-lg border border-border p-0.5 text-xs">
                {(
                  [
                    ["off", "Solo el globo"],
                    ["orbit", "Órbita y músculos"],
                    ["full", "+ párpados"],
                  ] as [AdnexaMode, string][]
                ).map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setAdnexa(m)}
                    aria-pressed={adnexa === m}
                    className={`flex-1 rounded-md px-2 py-1 ${adnexa === m ? "bg-[color:var(--navy)] text-white" : "text-muted-foreground"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2">
                <Scissors className="h-4 w-4" /> Corte sagital
              </span>
              <Switch checked={cutaway} onCheckedChange={setCutaway} aria-label="Corte sagital" />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="flex flex-col">
                <span className="flex items-center gap-2">
                  <Droplets className="h-4 w-4" /> Flujo del humor acuoso
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Procesos ciliares → cámara posterior → pupila → ángulo: vía trabecular (cian, ~80
                  %) y uveoescleral (violeta, ~20 %).
                </span>
              </span>
              <Switch
                checked={aqueous}
                onCheckedChange={(on) => {
                  setAqueous(on);
                  if (on) {
                    setPreset("sagittal");
                    setCutaway(true);
                  }
                }}
                aria-label="Flujo del humor acuoso"
              />
            </label>
            <div className="text-sm">
              <div className="mb-1 flex items-center justify-between">
                <span>Acomodación (lejos → cerca)</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {(3.6 + 0.45 * accommodation).toFixed(2)} mm
                </span>
              </div>
              <Slider
                value={[accommodation * 100]}
                max={100}
                step={1}
                onValueChange={([v]) => setAccommodation(v / 100)}
                aria-label="Acomodación"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={runReflex}
                className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted"
              >
                <Sun className="h-3.5 w-3.5" /> Reflejo fotomotor
              </button>
              <button
                type="button"
                onClick={runAccommodation}
                className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted"
              >
                Animar acomodación
              </button>
            </div>
          </div>
        </div>
      </div>
      <aside className="flex flex-col gap-3">
        <StructureCard
          code={selected}
          stage={stage}
          onStation={openStation}
          onChapter={(c) => {
            setMode("viaje");
            goChapter(c);
          }}
        />
        <StructureChips selected={selected} onSelect={setSelected} />
        <p className="text-[11px] text-muted-foreground">
          Modelo procedural educativo con medidas de un adulto sano (córnea, cámara anterior,
          cristalino con su perfil de acomodación, disco óptico a ≈ 4,5 mm nasal de la fóvea, órbita
          de ≈ 40 × 35 mm y rectos con la espiral de Tillaux). Pendiente de validación anatómica por
          un oftalmólogo.
        </p>
      </aside>
    </div>
  );
}
