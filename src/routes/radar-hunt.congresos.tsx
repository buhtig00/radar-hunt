import { RH_IMAGES } from "@/lib/radar-hunt/palette";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, MapPin, Plus, Radio } from "lucide-react";
import { useEvents, rhcKeys } from "@/lib/radar-hunt/congress/hooks";
import { rhc } from "@/lib/radar-hunt/congress/service";
import { RECOGNITION_POLICY } from "@/lib/radar-hunt/congress/core";
import { useRole } from "@/lib/role-context";
import { LoadingState } from "@/components/empty-loading";
import { RhHero } from "@/components/radar-hunt/ui";

export const Route = createFileRoute("/radar-hunt/congresos")({
  head: () => ({ meta: [{ title: "Congresos · Radar Hunt" }] }),
  component: CongressLayout,
});

function CongressLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return /\/radar-hunt\/congresos\/?$/.test(path) ? <CongressIndex /> : <Outlet />;
}

const STATE = {
  open: { label: "Juego abierto", cls: "bg-success/15 text-[color:var(--success)]" },
  upcoming: { label: "Próximamente", cls: "bg-muted text-muted-foreground" },
  closed: { label: "Finalizado", cls: "bg-muted text-muted-foreground" },
} as const;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });

function CongressIndex() {
  const events = useEvents();
  return (
    <div className="flex flex-col gap-5">
      <RhHero
        image={RH_IMAGES.congress}
        eyebrow="Pilar 3 · Congresos interactivos"
        title={
          <>
            Un congreso que <em>se recorre.</em>
          </>
        }
      >
        Recorre las estaciones de la sede, escanea su código QR y resuelve su reto. En las sesiones,
        responde en directo a los retos y encuestas del moderador. Reconocimiento no monetario:
        diploma y mención en la clausura.
      </RhHero>
      <CreateEvent />
      {events.isLoading ? (
        <LoadingState label="Cargando congresos…" />
      ) : events.error ? (
        <p className="text-sm text-destructive">{(events.error as Error).message}</p>
      ) : (events.data ?? []).length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Todavía no hay congresos publicados.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.data!.map((e) => (
            <Link
              key={e.id}
              to="/radar-hunt/congresos/$slug"
              params={{ slug: e.slug }}
              className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-card)] transition-colors hover:border-[color:var(--gold)]"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-serif text-xl font-semibold group-hover:text-primary">
                  {e.name}
                </h2>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATE[e.gameState].cls}`}
                >
                  {STATE[e.gameState].label}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {e.venue} · {e.city}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" /> {fmtDate(e.startsAt)} – {fmtDate(e.endsAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Radio className="h-4 w-4" /> {e.stations} estaciones
                </span>
              </div>
              {e.isDemo && (
                <span className="self-start rounded bg-[color:var(--gold)]/15 px-2 py-0.5 text-[11px] font-medium text-foreground">
                  Congreso ficticio de demostración
                </span>
              )}
              {e.status === "draft" && (
                <span className="self-start rounded bg-muted px-2 py-0.5 text-[11px]">
                  Borrador (solo organización)
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** Alta rápida de un congreso en borrador (solo organización; el servidor lo comprueba). */
function CreateEvent() {
  const { role } = useRole();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  if (rhc.mode === "demo" ? role !== "admin" && role !== "medical_editor" : false) return null;
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const cls = "rounded-md border border-border bg-background px-3 py-2 text-sm";
  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 self-start rounded-md border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
      >
        <Plus className="h-4 w-4" /> Crear congreso (organización)
      </button>
    );
  return (
    <form
      className="grid gap-2 rounded-xl border border-border bg-surface p-4 md:grid-cols-5"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          const startsAt = new Date(`${start}T07:00:00Z`).toISOString();
          const endsAt = new Date(`${end}T19:00:00Z`).toISOString();
          await rhc.saveEvent({
            id: `ev-${slug}-${Date.now().toString(36)}`,
            slug,
            name: name.trim(),
            venue: venue.trim(),
            city: city.trim(),
            timezone: "Europe/Madrid",
            startsAt,
            endsAt,
            gameOpensAt: startsAt,
            gameClosesAt: endsAt,
            status: "draft",
            floors: [{ id: "pb", name: "Planta principal", order: 0, rooms: [] }],
            sponsors: [],
            recognition: RECOGNITION_POLICY,
          });
          await qc.invalidateQueries({ queryKey: rhcKeys.all });
          toast.success("Congreso creado en borrador");
          void navigate({ to: "/radar-hunt/congresos/$slug/admin", params: { slug } });
        } catch (err) {
          toast.error((err as Error).message);
        }
      }}
    >
      <input
        aria-label="Nombre del congreso"
        required
        minLength={3}
        className={cls}
        placeholder="Nombre del congreso"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        aria-label="Sede"
        className={cls}
        placeholder="Sede"
        value={venue}
        onChange={(e) => setVenue(e.target.value)}
      />
      <input
        aria-label="Ciudad"
        className={cls}
        placeholder="Ciudad"
        value={city}
        onChange={(e) => setCity(e.target.value)}
      />
      <input
        aria-label="Primer día"
        required
        type="date"
        className={cls}
        value={start}
        onChange={(e) => setStart(e.target.value)}
      />
      <input
        aria-label="Último día"
        required
        type="date"
        className={cls}
        value={end}
        onChange={(e) => setEnd(e.target.value)}
      />
      <div className="flex gap-2 md:col-span-5">
        <button
          type="submit"
          disabled={slug.length < 3}
          className="rounded-md bg-[color:var(--navy)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Crear en borrador
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-border px-4 py-2 text-sm"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
