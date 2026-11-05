import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Eye,
  ListChecks,
  MonitorPlay,
  Play,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Square,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import { SUBSPECIALTIES, SUBSPECIALTY_LABELS } from "@/lib/radar-hunt/catalog";
import { rhc } from "@/lib/radar-hunt/congress/service";
import { rhcKeys, useAdmin, useCrossTabSync } from "@/lib/radar-hunt/congress/hooks";
import type { ExportKind } from "@/lib/radar-hunt/congress/service-types";
import type {
  AdminOverview,
  AdminStation,
  CongressEvent,
  LiveItem,
  LiveSession,
  Station,
} from "@/lib/radar-hunt/congress/types";
import type { ModeratorAction } from "@/lib/radar-hunt/congress/core";
import type { SubspecialtyCode } from "@/lib/radar-hunt/types";
import { LoadingState } from "@/components/empty-loading";
import { SalaLink } from "@/components/radar-hunt/congress/sala-link";
import { HUNT_TRACKS } from "@/lib/radar-hunt/seed-hunt-matrix";
import { VenueMap } from "@/components/radar-hunt/congress/venue-map";
import { PhaseLabel } from "@/components/radar-hunt/congress/live";

export const Route = createFileRoute("/radar-hunt/congresos/$slug_/admin")({
  head: () => ({ meta: [{ title: "Organización del congreso · Radar Hunt" }] }),
  component: AdminPage,
});

type Tab = "resumen" | "estaciones" | "directo" | "participantes" | "exportar" | "evento";
const TABS: [Tab, string][] = [
  ["resumen", "Resumen"],
  ["estaciones", "Estaciones y QR"],
  ["directo", "Sesiones en directo"],
  ["participantes", "Participantes"],
  ["exportar", "Exportar"],
  ["evento", "Evento"],
];
const input = "rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground";
const btn =
  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50";
const uid = (p: string) =>
  `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function useRun() {
  const qc = useQueryClient();
  return async <T,>(fn: () => Promise<T>, ok?: string) => {
    try {
      const r = await fn();
      if (ok) toast.success(ok);
      await qc.invalidateQueries({ queryKey: rhcKeys.all });
      return r;
    } catch (e) {
      toast.error((e as Error).message);
      return undefined;
    }
  };
}

function AdminPage() {
  const { slug } = Route.useParams();
  useCrossTabSync();
  const ov = useAdmin(slug);
  const [tab, setTab] = useState<Tab>("resumen");
  if (ov.isLoading) return <LoadingState label="Cargando la organización…" />;
  if (ov.error || !ov.data)
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-sm">
        {(ov.error as Error)?.message ?? "No disponible."}{" "}
        <Link
          to="/radar-hunt/congresos/$slug"
          params={{ slug }}
          className="font-semibold underline"
        >
          Volver
        </Link>
      </div>
    );
  const o = ov.data;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link
            to="/radar-hunt/congresos/$slug"
            params={{ slug }}
            className="flex items-center gap-1 text-sm text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> {o.event.name}
          </Link>
          <h1 className="font-serif text-2xl font-semibold">Organización del congreso</h1>
        </div>
        <div className="flex gap-2">
          <Link
            to="/radar-hunt/congresos/$slug/qr"
            params={{ slug }}
            className={`${btn} border border-border`}
          >
            <Printer className="h-4 w-4" /> Imprimir QR
          </Link>
          <SalaLink slug={slug} className={`${btn} bg-[color:var(--navy)] text-white`}>
            <MonitorPlay className="h-4 w-4" /> Pantalla de sala
          </SalaLink>
        </div>
      </div>
      <nav
        className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1"
        aria-label="Organización"
      >
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${tab === id ? "bg-[color:var(--navy)] text-white" : "text-muted-foreground hover:bg-muted"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "resumen" && <Summary o={o} />}
      {tab === "estaciones" && <StationsAdmin o={o} />}
      {tab === "directo" && <LiveAdmin o={o} slug={slug} />}
      {tab === "participantes" && <Participants o={o} />}
      {tab === "exportar" && <Exports slug={slug} />}
      {tab === "evento" && <EventSettings e={o.event} />}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-serif text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Summary({ o }: { o: AdminOverview }) {
  const k = o.kpis;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Participantes" value={k.participants} />
        <Kpi label="Escaneos" value={k.scans} />
        <Kpi label="Retos completados" value={k.completions} />
        <Kpi label="Respuestas en sala" value={k.liveAnswers} />
        <Kpi label="Valoraciones" value={k.feedback} />
        <Kpi label="Aceptan comunicaciones OR" value={k.communicationsOptIn} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-4 text-sm">
          <h2 className="mb-2 font-semibold">Estaciones</h2>
          {o.stations.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between border-t border-border py-1.5 first:border-0"
            >
              <span>
                <span className="mr-2 font-mono text-xs text-muted-foreground">{s.label}</span>
                {s.title}
                {!s.active && (
                  <span className="ml-2 text-xs text-muted-foreground">(inactiva)</span>
                )}
              </span>
              <span className="font-mono text-xs">
                {s.scans} escaneos · {s.completions} completadas · {s.avgScore} RP
              </span>
            </div>
          ))}
        </section>
        <section className="rounded-xl border border-border bg-surface p-4 text-sm">
          <h2 className="mb-2 font-semibold">Valoración del congreso</h2>
          {o.feedback.count === 0 ? (
            <p className="text-muted-foreground">Todavía no hay valoraciones.</p>
          ) : (
            <ul className="space-y-1">
              <li>Global: {o.feedback.overall} / 5</li>
              <li>Estaciones: {o.feedback.stations} / 5</li>
              <li>Sesiones en directo: {o.feedback.live} / 5</li>
              <li>
                NPS: {o.feedback.nps} ({o.feedback.count} respuestas)
              </li>
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ estaciones
function emptyStation(e: CongressEvent, n: number): Station {
  return {
    id: uid("st"),
    eventId: e.id,
    label: `E${n}`,
    title: "",
    description: "",
    floorId: e.floors[0]?.id ?? "",
    x: 50,
    y: 50,
    subspecialty: "general_ophthalmology",
    questionIds: [],
    active: true,
  };
}

function StationsAdmin({ o }: { o: AdminOverview }) {
  const run = useRun();
  const [edit, setEdit] = useState<Station | null>(null);
  const [floorId, setFloorId] = useState(o.event.floors[0]?.id ?? "");
  useEffect(() => {
    if (edit) setFloorId(edit.floorId);
  }, [edit?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const pins = o.stations.map((s) => (edit && s.id === edit.id ? { ...s, ...edit } : s));
  if (edit && !o.stations.some((s) => s.id === edit.id)) pins.push({ ...(edit as AdminStation) });
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-3">
        <VenueMap
          floors={o.event.floors}
          floorId={floorId}
          onFloor={(f) => {
            setFloorId(f);
            if (edit) setEdit({ ...edit, floorId: f });
          }}
          pins={pins}
          selectedId={edit?.id}
          onPin={(id) => {
            const s = o.stations.find((x) => x.id === id);
            if (s) setEdit({ ...s });
          }}
          onPlace={edit ? (x, y) => setEdit({ ...edit, x, y, floorId }) : undefined}
        />
        {edit && (
          <p className="text-xs text-muted-foreground">
            Haz clic en el plano para colocar la estación «{edit.label}».
          </p>
        )}
        <div className="flex flex-col gap-2">
          {o.stations.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            >
              <button type="button" className="text-left" onClick={() => setEdit({ ...s })}>
                <span className="mr-2 font-mono text-xs">{s.label}</span>
                <span className="font-medium">{s.title}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {SUBSPECIALTY_LABELS[s.subspecialty]} · {s.questionIds.length} preguntas
                  {s.active ? "" : " · inactiva"}
                </span>
              </button>
              <span className="flex items-center gap-2">
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs" title="Código manual">
                  {s.manualCode}
                </code>
                <button
                  type="button"
                  title="Rotar el QR (invalida el anterior)"
                  className="rounded border border-border p-1"
                  onClick={() =>
                    run(() => rhc.rotateToken(s.id), "QR rotado: imprime el nuevo póster.")
                  }
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setEdit(emptyStation(o.event, o.stations.length + 1))}
            className={`${btn} self-start border border-dashed border-border`}
          >
            <Plus className="h-4 w-4" /> Nueva estación
          </button>
        </div>
      </div>
      {edit ? (
        <StationEditor
          key={edit.id}
          st={edit}
          e={o.event}
          onChange={setEdit}
          onSaved={() => setEdit(null)}
          canDelete={o.stations.some((s) => s.id === edit.id && s.scans === 0)}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          Elige una estación para editarla o crea una nueva. Las preguntas salen del banco editorial
          (en producción, solo aprobadas, validadas y con referencia). Los patrocinadores no eligen
          las preguntas.
        </p>
      )}
    </div>
  );
}

function StationEditor({
  st,
  e,
  onChange,
  onSaved,
  canDelete,
}: {
  st: Station;
  e: CongressEvent;
  onChange: (s: Station) => void;
  onSaved: () => void;
  canDelete: boolean;
}) {
  const run = useRun();
  const bank = useQuery({
    queryKey: ["rhc", "bank", st.subspecialty],
    queryFn: () => rhc.questionBank(st.subspecialty),
  });
  const set = (p: Partial<Station>) => onChange({ ...st, ...p });
  const toggleQ = (id: string) =>
    set({
      questionIds: st.questionIds.includes(id)
        ? st.questionIds.filter((x) => x !== id)
        : [...st.questionIds, id].slice(0, 5),
    });
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <h2 className="font-semibold">{st.title || "Nueva estación"}</h2>
      <div className="grid grid-cols-[80px_1fr] gap-2">
        <Labeled id="se-label" label="Etiqueta">
          <input
            id="se-label"
            className={input}
            value={st.label}
            maxLength={6}
            onChange={(x) => set({ label: x.target.value })}
          />
        </Labeled>
        <Labeled id="se-title" label="Título">
          <input
            id="se-title"
            className={input}
            value={st.title}
            maxLength={80}
            onChange={(x) => set({ title: x.target.value })}
          />
        </Labeled>
      </div>
      <Labeled id="se-desc" label="Descripción breve">
        <input
          id="se-desc"
          className={input}
          value={st.description}
          maxLength={280}
          onChange={(x) => set({ description: x.target.value })}
        />
      </Labeled>
      <div className="grid grid-cols-2 gap-2">
        <Labeled id="se-sub" label="Subespecialidad">
          <select
            id="se-sub"
            className={input}
            value={st.subspecialty}
            onChange={(x) =>
              set({ subspecialty: x.target.value as SubspecialtyCode, questionIds: [] })
            }
          >
            {SUBSPECIALTIES.map((s) => (
              <option key={s} value={s}>
                {SUBSPECIALTY_LABELS[s]}
              </option>
            ))}
          </select>
        </Labeled>
        <Labeled id="se-floor" label="Planta">
          <select
            id="se-floor"
            className={input}
            value={st.floorId}
            onChange={(x) => set({ floorId: x.target.value })}
          >
            {e.floors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </Labeled>
      </div>
      <Labeled id="se-track" label="Recorrido (perfil de liga)">
        <select
          id="se-track"
          className={input}
          value={st.track ?? ""}
          onChange={(x) => set({ track: x.target.value || undefined })}
        >
          <option value="">Todos los recorridos</option>
          {Object.entries(HUNT_TRACKS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </Labeled>
      <Labeled id="se-sponsor" label="Patrocinio de la estación (opcional)">
        <input
          id="se-sponsor"
          className={input}
          value={st.sponsor?.name ?? ""}
          maxLength={60}
          placeholder="Nombre del patrocinador"
          onChange={(x) =>
            set({ sponsor: x.target.value ? { name: x.target.value, disclosure: "" } : undefined })
          }
        />
      </Labeled>
      {st.sponsor?.name && (
        <p className="rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground">
          Se mostrará siempre: «Estación con el apoyo de {st.sponsor.name}. {st.sponsor.name} no ha
          elaborado, seleccionado ni revisado las preguntas y no recibe datos personales de los
          participantes.»
        </p>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={st.active}
          onChange={(x) => set({ active: x.target.checked })}
        />{" "}
        Estación activa
      </label>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Preguntas ({st.questionIds.length}/5)</span>
        <button
          type="button"
          className={`${btn} border border-border text-xs`}
          onClick={async () => {
            const ids = await run(() =>
              rhc.suggestQuestions(st.subspecialty, `${st.id}:${Date.now()}`),
            );
            if (ids) set({ questionIds: ids });
          }}
        >
          <ListChecks className="h-3.5 w-3.5" /> Sugerir del banco
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
        {bank.isLoading ? (
          <p className="p-3 text-xs text-muted-foreground">Cargando banco…</p>
        ) : (bank.data ?? []).length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">
            No hay preguntas de esta subespecialidad.
          </p>
        ) : (
          bank.data!.map((q) => (
            <label
              key={q.id}
              className="flex items-start gap-2 border-t border-border px-3 py-2 text-xs first:border-0"
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={st.questionIds.includes(q.id)}
                onChange={() => toggleQ(q.id)}
                disabled={!q.playable && rhc.mode === "live"}
              />
              <span className="flex-1">
                {q.stem}
                <span className="block text-muted-foreground">
                  Dificultad {q.difficulty} ·{" "}
                  {q.playable ? "validada" : "pendiente de validación KOL"}
                </span>
              </span>
            </label>
          ))
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`${btn} bg-[color:var(--navy)] text-white`}
          onClick={async () => {
            if (await run(() => rhc.saveStation(st), "Estación guardada")) onSaved();
          }}
        >
          <Save className="h-4 w-4" /> Guardar
        </button>
        <button type="button" className={`${btn} border border-border`} onClick={onSaved}>
          Cancelar
        </button>
        {canDelete && (
          <button
            type="button"
            className={`${btn} border border-destructive/40 text-destructive`}
            onClick={async () => {
              if (
                window.confirm("¿Borrar esta estación?") &&
                (await run(() => rhc.deleteStation(st.id), "Estación borrada")) !== undefined
              )
                onSaved();
            }}
          >
            <Trash2 className="h-4 w-4" /> Borrar
          </button>
        )}
      </div>
    </div>
  );
}

function Labeled({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

// ------------------------------------------------------------------ directo
function LiveAdmin({ o, slug }: { o: AdminOverview; slug: string }) {
  const [sel, setSel] = useState<string | null>(o.sessions[0]?.id ?? null);
  const [editing, setEditing] = useState<LiveSession | null>(null);
  const session = o.sessions.find((s) => s.id === sel);
  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="flex flex-col gap-2">
        {o.sessions.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setSel(s.id);
              setEditing(null);
            }}
            className={`rounded-lg border px-3 py-2 text-left text-sm ${s.id === sel ? "border-[color:var(--gold)] bg-[color:var(--gold)]/10" : "border-border bg-surface"}`}
          >
            <span className="block font-medium">{s.title}</span>
            <span className="text-xs text-muted-foreground">
              {s.room} · {s.items.length} ítems · {s.state.phase}
            </span>
          </button>
        ))}
        <button
          type="button"
          className={`${btn} border border-dashed border-border`}
          onClick={() =>
            setEditing({ id: uid("ses"), eventId: o.event.id, title: "", room: "", items: [] })
          }
        >
          <Plus className="h-4 w-4" /> Nueva sesión
        </button>
      </div>
      {editing ? (
        <SessionEditor
          s={editing}
          onDone={(id) => {
            setEditing(null);
            if (id) setSel(id);
          }}
        />
      ) : session ? (
        <Console session={session} slug={slug} onEdit={() => setEditing({ ...session })} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Crea una sesión para lanzar retos y encuestas en directo.
        </p>
      )}
    </div>
  );
}

function Console({
  session,
  slug,
  onEdit,
}: {
  session: AdminOverview["sessions"][number];
  slug: string;
  onEdit: () => void;
}) {
  const run = useRun();
  const live = useQuery({
    queryKey: ["rhc", "console", session.id],
    queryFn: () => rhc.liveView(slug, session.id),
    refetchInterval: 1000,
  });
  const st = session.state;
  const act = (a: ModeratorAction, i?: number) => run(() => rhc.moderate(session.id, a, i));
  const v = live.data;
  const next = st.itemIndex + 1 < session.items.length;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">{session.title}</h2>
          <p className="text-xs text-muted-foreground">
            {session.room}
            {session.speaker ? ` · ${session.speaker}` : ""}
          </p>
        </div>
        {v && <PhaseLabel view={v} />}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`${btn} bg-[color:var(--navy)] text-white`}
          disabled={!next}
          onClick={() => act("next")}
        >
          <Play className="h-4 w-4" />{" "}
          {st.itemIndex < 0 ? "Lanzar la primera" : "Lanzar la siguiente"}
        </button>
        <button
          type="button"
          className={`${btn} border border-border`}
          disabled={v?.phase !== "open"}
          onClick={() => act("close")}
        >
          <Square className="h-4 w-4" /> Cerrar respuestas
        </button>
        <button
          type="button"
          className={`${btn} border border-border`}
          disabled={!(v?.phase === "open" || v?.phase === "closed")}
          onClick={() => act("reveal")}
        >
          <Eye className="h-4 w-4" /> Revelar
        </button>
        <button
          type="button"
          className={`${btn} border border-border`}
          onClick={() => act("leaderboard")}
        >
          <Trophy className="h-4 w-4" /> Clasificación
        </button>
        <button type="button" className={`${btn} border border-border`} onClick={() => act("end")}>
          Terminar sesión
        </button>
        <button
          type="button"
          className={`${btn} text-muted-foreground`}
          onClick={() => act("reset")}
        >
          Reiniciar
        </button>
        <button type="button" className={`${btn} text-muted-foreground`} onClick={onEdit}>
          Editar ítems
        </button>
      </div>
      {v?.item && (
        <div className="rounded-lg bg-muted p-3 text-sm">
          <div className="text-xs text-muted-foreground">
            Ítem {v.itemIndex + 1}/{v.itemCount} · {v.item.kind === "poll" ? "Encuesta" : "Reto"} ·{" "}
            {v.answered} respuestas de {v.participants} inscritos
            {v.remainingMs !== undefined && ` · ${Math.ceil(v.remainingMs / 1000)} s`}
          </div>
          <p className="mt-1 font-medium">{v.item.stem}</p>
          {v.reveal && (
            <ul className="mt-2 space-y-1 text-xs">
              {v.item.options.map((op) => (
                <li
                  key={op.id}
                  className={
                    v.reveal!.correctOptionIds.includes(op.id)
                      ? "font-semibold text-[color:var(--success)]"
                      : ""
                  }
                >
                  {op.text}: {v.reveal!.tally[op.id] ?? 0}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <ol className="flex flex-col gap-1 text-sm">
        {session.items.map((it, i) => (
          <li
            key={it.id}
            className={`flex items-center justify-between rounded border px-3 py-1.5 ${i === st.itemIndex ? "border-[color:var(--gold)]" : "border-border"}`}
          >
            <span>
              <span className="mr-2 font-mono text-xs">{i + 1}</span>
              {it.kind === "poll" ? `Encuesta: ${it.prompt}` : `Reto: ${it.questionId}`} ·{" "}
              {it.timeLimitS} s
            </span>
            <button
              type="button"
              className="text-xs font-medium text-primary"
              onClick={() => act("open", i)}
            >
              Lanzar
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SessionEditor({ s, onDone }: { s: LiveSession; onDone: (id?: string) => void }) {
  const run = useRun();
  const [x, setX] = useState<LiveSession>(s);
  const [sub, setSub] = useState<SubspecialtyCode>("general_ophthalmology");
  const bank = useQuery({ queryKey: ["rhc", "bank", sub], queryFn: () => rhc.questionBank(sub) });
  const [qid, setQid] = useState("");
  const [prompt, setPrompt] = useState("");
  const [opts, setOpts] = useState("");
  const add = (it: LiveItem) => setX({ ...x, items: [...x.items, it] });
  const stems = useMemo(() => new Map((bank.data ?? []).map((q) => [q.id, q.stem])), [bank.data]);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="grid gap-2 md:grid-cols-3">
        <Labeled id="ss-title" label="Título">
          <input
            id="ss-title"
            className={input}
            value={x.title}
            onChange={(e) => setX({ ...x, title: e.target.value })}
          />
        </Labeled>
        <Labeled id="ss-room" label="Sala">
          <input
            id="ss-room"
            className={input}
            value={x.room}
            onChange={(e) => setX({ ...x, room: e.target.value })}
          />
        </Labeled>
        <Labeled id="ss-speaker" label="Ponente o moderador">
          <input
            id="ss-speaker"
            className={input}
            value={x.speaker ?? ""}
            onChange={(e) => setX({ ...x, speaker: e.target.value || undefined })}
          />
        </Labeled>
      </div>
      <ol className="flex flex-col gap-1 text-sm">
        {x.items.map((it, i) => (
          <li
            key={it.id}
            className="flex items-center justify-between gap-2 rounded border border-border px-3 py-1.5"
          >
            <span className="flex-1">
              {i + 1}.{" "}
              {it.kind === "poll"
                ? `Encuesta: ${it.prompt}`
                : `Reto: ${stems.get(it.questionId ?? "") ?? it.questionId}`}
            </span>
            <input
              aria-label="Segundos"
              type="number"
              min={10}
              max={120}
              className={`${input} w-20 py-1`}
              value={it.timeLimitS}
              onChange={(e) =>
                setX({
                  ...x,
                  items: x.items.map((y) =>
                    y.id === it.id ? { ...y, timeLimitS: Number(e.target.value) } : y,
                  ),
                })
              }
            />
            <button
              type="button"
              aria-label="Quitar"
              onClick={() => setX({ ...x, items: x.items.filter((y) => y.id !== it.id) })}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ol>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <span className="text-sm font-medium">Añadir reto (del banco editorial)</span>
          <select
            aria-label="Subespecialidad"
            className={input}
            value={sub}
            onChange={(e) => {
              setSub(e.target.value as SubspecialtyCode);
              setQid("");
            }}
          >
            {SUBSPECIALTIES.map((c) => (
              <option key={c} value={c}>
                {SUBSPECIALTY_LABELS[c]}
              </option>
            ))}
          </select>
          <select
            aria-label="Pregunta"
            className={input}
            value={qid}
            onChange={(e) => setQid(e.target.value)}
          >
            <option value="">Elige una pregunta…</option>
            {(bank.data ?? []).map((q) => (
              <option key={q.id} value={q.id} disabled={!q.playable && rhc.mode === "live"}>
                {q.stem.slice(0, 90)}
                {q.playable ? "" : " (pendiente KOL)"}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!qid}
            className={`${btn} self-start border border-border`}
            onClick={() => {
              add({ id: uid("q"), kind: "quiz", questionId: qid, timeLimitS: 20 });
              setQid("");
            }}
          >
            <Plus className="h-4 w-4" /> Añadir reto
          </button>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <span className="text-sm font-medium">Añadir encuesta de sala (opinión, no da RP)</span>
          <input
            aria-label="Enunciado"
            className={input}
            placeholder="Enunciado"
            value={prompt}
            maxLength={200}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <textarea
            aria-label="Opciones"
            className={`${input} min-h-20`}
            placeholder={"Una opción por línea (2 a 6)"}
            value={opts}
            onChange={(e) => setOpts(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            No uses encuestas de sala como estudio de mercado: los estudios para la industria van
            por el módulo de inteligencia de mercado, con su propio consentimiento.
          </p>
          <button
            type="button"
            disabled={!prompt.trim()}
            className={`${btn} self-start border border-border`}
            onClick={() => {
              const options = opts
                .split("\n")
                .map((t) => t.trim())
                .filter(Boolean)
                .slice(0, 6)
                .map((text, i) => ({ id: String.fromCharCode(97 + i), text }));
              add({ id: uid("p"), kind: "poll", prompt: prompt.trim(), options, timeLimitS: 15 });
              setPrompt("");
              setOpts("");
            }}
          >
            <Plus className="h-4 w-4" /> Añadir encuesta
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className={`${btn} bg-[color:var(--navy)] text-white`}
          onClick={async () => {
            const r = await run(() => rhc.saveSession(x), "Sesión guardada");
            if (r) onDone(r.id);
          }}
        >
          <Save className="h-4 w-4" /> Guardar sesión
        </button>
        <button type="button" className={`${btn} border border-border`} onClick={() => onDone()}>
          Cancelar
        </button>
        <button
          type="button"
          className={`${btn} text-destructive`}
          onClick={async () => {
            if (
              window.confirm("¿Borrar la sesión?") &&
              (await run(() => rhc.deleteSession(x.id), "Sesión borrada")) !== undefined
            )
              onDone();
          }}
        >
          <Trash2 className="h-4 w-4" /> Borrar
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ participantes y exportación
function Participants({ o }: { o: AdminOverview }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Nombre</th>
            <th className="px-3 py-2">Centro</th>
            <th className="px-3 py-2">Etapa</th>
            <th className="px-3 py-2">Clasificación pública</th>
            <th className="px-3 py-2">Comunicaciones OR</th>
          </tr>
        </thead>
        <tbody>
          {o.participants.map((p) => (
            <tr key={p.userId} className="border-t border-border">
              <td className="px-3 py-2">
                {p.displayName}
                {p.alias && <span className="text-xs text-muted-foreground"> ({p.alias})</span>}
              </td>
              <td className="px-3 py-2">{p.hospital ?? "—"}</td>
              <td className="px-3 py-2">
                {p.careerStage === "resident"
                  ? "Residente"
                  : p.careerStage === "attending"
                    ? "Adjunto/a"
                    : "—"}
              </td>
              <td className="px-3 py-2">{p.consents.publicRanking ? "Sí" : "No"}</td>
              <td className="px-3 py-2">{p.consents.communications ? "Sí" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="flex items-center gap-1 px-3 py-2 text-xs text-muted-foreground">
        <Users className="h-3.5 w-3.5" /> {o.participants.length} inscritos. Datos personales: uso
        exclusivo de la organización.
      </p>
    </div>
  );
}

const EXPORTS: [ExportKind, string, string][] = [
  [
    "participants",
    "Participantes",
    "Datos personales y consentimientos (uso interno de la organización).",
  ],
  ["ranking", "Clasificación", "Nombres según el consentimiento de clasificación pública."],
  ["stations", "Estaciones", "Escaneos, retos completados y puntuación media por estación."],
  [
    "live",
    "Sesiones en directo",
    "Agregados por ítem: respuestas, % de aciertos y recuento por opción.",
  ],
  ["feedback", "Valoraciones", "Puntuaciones y comentarios, sin identificar y en orden aleatorio."],
];

function Exports({ slug }: { slug: string }) {
  const run = useRun();
  const download = async (k: ExportKind) => {
    const r = await run(() => rhc.exportCsv(slug, k));
    if (!r) return;
    const url = URL.createObjectURL(new Blob([r.csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = r.filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex flex-col gap-2">
      {EXPORTS.map(([k, label, hint]) => (
        <div
          key={k}
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3"
        >
          <div>
            <div className="font-medium">{label}</div>
            <div className="text-xs text-muted-foreground">{hint}</div>
          </div>
          <button
            type="button"
            className={`${btn} border border-border`}
            onClick={() => download(k)}
          >
            <Download className="h-4 w-4" /> CSV
          </button>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Cada exportación queda registrada en la auditoría. Los patrocinadores no reciben estos
        ficheros.
      </p>
    </div>
  );
}

function EventSettings({ e }: { e: CongressEvent }) {
  const run = useRun();
  const [x, setX] = useState<CongressEvent>(e);
  const local = (iso: string) => iso.slice(0, 16);
  const toIso = (v: string) => new Date(v).toISOString();
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      {e.isDemo && (
        <p className="rounded bg-[color:var(--gold)]/10 px-3 py-2 text-xs">
          Congreso de demostración: sus fechas se ajustan solas a hoy.
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-3">
        <Labeled id="ev-name" label="Nombre">
          <input
            id="ev-name"
            className={input}
            value={x.name}
            onChange={(v) => setX({ ...x, name: v.target.value })}
          />
        </Labeled>
        <Labeled id="ev-venue" label="Sede">
          <input
            id="ev-venue"
            className={input}
            value={x.venue}
            onChange={(v) => setX({ ...x, venue: v.target.value })}
          />
        </Labeled>
        <Labeled id="ev-city" label="Ciudad">
          <input
            id="ev-city"
            className={input}
            value={x.city}
            onChange={(v) => setX({ ...x, city: v.target.value })}
          />
        </Labeled>
        <Labeled id="ev-open" label="Apertura del juego (UTC)">
          <input
            id="ev-open"
            type="datetime-local"
            className={input}
            value={local(x.gameOpensAt)}
            onChange={(v) => setX({ ...x, gameOpensAt: toIso(v.target.value) })}
          />
        </Labeled>
        <Labeled id="ev-close" label="Cierre del juego (UTC)">
          <input
            id="ev-close"
            type="datetime-local"
            className={input}
            value={local(x.gameClosesAt)}
            onChange={(v) => setX({ ...x, gameClosesAt: toIso(v.target.value) })}
          />
        </Labeled>
        <Labeled id="ev-status" label="Estado">
          <select
            id="ev-status"
            className={input}
            value={x.status}
            onChange={(v) => setX({ ...x, status: v.target.value as CongressEvent["status"] })}
          >
            <option value="draft">Borrador (solo organización)</option>
            <option value="published">Publicado</option>
            <option value="closed">Cerrado</option>
          </select>
        </Labeled>
      </div>
      <Labeled
        id="ev-rec"
        label="Política de reconocimiento (sin premios en metálico ni regalos de valor)"
      >
        <textarea
          id="ev-rec"
          className={`${input} min-h-16`}
          value={x.recognition}
          onChange={(v) => setX({ ...x, recognition: v.target.value })}
        />
      </Labeled>
      <Labeled
        id="ev-floors"
        label="Planos: URL de la imagen de cada planta (opcional, con derechos de uso)"
      >
        <div className="flex flex-col gap-2">
          {x.floors.map((f, i) => (
            <div key={f.id} className="grid grid-cols-[160px_1fr] gap-2">
              <input
                aria-label="Nombre de la planta"
                className={input}
                value={f.name}
                onChange={(v) =>
                  setX({
                    ...x,
                    floors: x.floors.map((g, j) => (j === i ? { ...g, name: v.target.value } : g)),
                  })
                }
              />
              <input
                aria-label="URL del plano"
                className={input}
                placeholder="https://…/plano.png"
                value={f.imageUrl ?? ""}
                onChange={(v) =>
                  setX({
                    ...x,
                    floors: x.floors.map((g, j) =>
                      j === i ? { ...g, imageUrl: v.target.value || undefined } : g,
                    ),
                  })
                }
              />
            </div>
          ))}
          <button
            type="button"
            className={`${btn} self-start border border-dashed border-border`}
            onClick={() =>
              setX({
                ...x,
                floors: [
                  ...x.floors,
                  {
                    id: uid("f"),
                    name: `Planta ${x.floors.length + 1}`,
                    order: x.floors.length,
                    rooms: [],
                  },
                ],
              })
            }
          >
            <Plus className="h-4 w-4" /> Añadir planta
          </button>
        </div>
      </Labeled>
      <button
        type="button"
        className={`${btn} self-start bg-[color:var(--navy)] text-white`}
        onClick={() => run(() => rhc.saveEvent(x), "Congreso guardado")}
      >
        <Save className="h-4 w-4" /> Guardar
      </button>
    </div>
  );
}
