import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Award, Check, Clock, Dumbbell, Eye, ShieldCheck, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useCompetency, useEyeProgress, useMyProfile, rhKeys } from "@/lib/radar-hunt/hooks";
import { useSeason } from "@/lib/radar-hunt/congress/hooks";
import { computeTrackBadges, isStationPassed } from "@/lib/radar-hunt/eye-tracks";
import { subColor } from "@/lib/radar-hunt/palette";
import { HUNT_STATIONS } from "@/lib/radar-hunt/seed-hunt-matrix";
import { rh } from "@/lib/radar-hunt/service";
import { SUBSPECIALTIES, SUBSPECIALTY_LABELS } from "@/lib/radar-hunt/catalog";
import { verificationSchema } from "@/lib/radar-hunt/verification";
import { weakAreas, ELO_START } from "@/lib/radar-hunt/competency";
import { EYE_STRUCTURES } from "@/lib/radar-hunt/eye-universe";
import type { SubspecialtyCode } from "@/lib/radar-hunt/types";
import type { ProfileView } from "@/lib/radar-hunt/views";
import { LoadingState } from "@/components/empty-loading";
import { VerificationBadge } from "@/components/radar-hunt/ui";

export const Route = createFileRoute("/radar-hunt/perfil")({
  head: () => ({ meta: [{ title: "Mi perfil · Radar Hunt" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const profile = useMyProfile();
  if (profile.isLoading) return <LoadingState label="Cargando tu perfil…" />;
  const p = profile.data ?? null;
  return (
    <div className="flex flex-col gap-6">
      <PlayerCard p={p} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          {p && p.status !== "rejected" ? (
            <ProfileDetails p={p} />
          ) : (
            <VerificationForm previous={p} />
          )}
        </div>
        <div className="flex flex-col gap-6">
          <CompetencyPanel />
          <BadgesPanel />
        </div>
      </div>
    </div>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "RH";

/** Ficha de jugador: identidad, estado de verificación y cifras de progreso. */
function PlayerCard({ p }: { p: ProfileView | null }) {
  const eye = useEyeProgress().data ?? [];
  const comp = useCompetency().data ?? [];
  const me = useSeason().data?.rows.find((r) => r.isMe);
  const badges = computeTrackBadges(eye);
  const stats = [
    {
      n: `${eye.filter(isStationPassed).length}`,
      d: `/${HUNT_STATIONS.length}`,
      t: "estaciones superadas",
    },
    { n: `${badges.filter((b) => b.earned).length}`, d: `/${badges.length}`, t: "insignias" },
    { n: `${comp.length}`, d: `/${SUBSPECIALTIES.length}`, t: "subespecialidades jugadas" },
    { n: me ? `${me.rank}.º` : "—", d: "", t: "en la temporada" },
  ];
  const name = p?.displayName || "Tu perfil";
  return (
    <section className="rh-hero-bg relative isolate overflow-hidden rounded-[28px] border border-white/10 p-6 md:p-8">
      <div
        className="pointer-events-none absolute -right-20 -top-20 -z-10 h-72 w-72 rounded-full border border-white/10"
        aria-hidden
      >
        <div className="absolute inset-10 rounded-full border border-white/10" />
        <div className="rh-sweep absolute inset-0 rounded-full" />
      </div>
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[color:var(--rh-radar-300)] to-[color:var(--rh-radar-700)] text-xl font-bold text-[color:var(--rh-navy-950)] shadow-[0_10px_30px_-10px_var(--rh-radar-500)]">
            {p ? initials(name) : <UserRound className="h-7 w-7" />}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl text-white md:text-3xl">{name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-white/60">
              <VerificationBadge status={p?.status ?? "unverified"} />
              {p && (
                <span>
                  {p.careerStage === "resident" ? `Residente R${p.residencyYear}` : "Adjunto/a"}
                  {p.primarySubspecialty && ` · ${SUBSPECIALTY_LABELS[p.primarySubspecialty]}`}
                </span>
              )}
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
          {stats.map((x) => (
            <div key={x.t}>
              <dd className="text-2xl font-semibold tabular-nums text-white">
                {x.n}
                <span className="text-base text-white/35">{x.d}</span>
              </dd>
              <dt className="text-xs text-white/50">{x.t}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function ProfileDetails({ p }: { p: ProfileView }) {
  return (
    <div className="rh-card rounded-3xl p-6">
      <h2 className="text-lg text-white">Datos profesionales</h2>
      <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
        <Item k="Hospital o centro" v={`${p.hospital} · ${p.specialty}`} />
        <Item k="Nº de colegiado" v={p.licenseNumber} />
        <Item k="Colegio" v={p.licenseCollege ?? "—"} />
        <Item k="Correo profesional" v={p.email} />
        <Item
          k="Subespecialidad principal"
          v={p.primarySubspecialty ? SUBSPECIALTY_LABELS[p.primarySubspecialty] : "—"}
        />
        <Item k="Solicitud enviada" v={new Date(p.submittedAt).toLocaleString("es-ES")} />
      </dl>
      {p.status === "pending" && (
        <p className="mt-5 flex items-start gap-2 rounded-2xl border border-[color:var(--warning)]/25 bg-[color:var(--warning)]/[0.07] px-4 py-3 text-sm text-white/80">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--warning)]" />
          El equipo de verificación comprobará tu número de colegiado en el registro oficial.
          Mientras tanto puedes jugar la práctica libre y los retos BOSS.
        </p>
      )}
      {p.status === "verified" && (
        <p className="mt-5 flex items-center gap-2 rounded-2xl border border-[color:var(--success)]/25 bg-[color:var(--success)]/[0.08] px-4 py-3 text-sm text-white/85">
          <ShieldCheck className="h-4 w-4 text-[color:var(--success)]" /> Puedes competir en las
          ligas oficiales.
        </p>
      )}
      {p.reviewerNote && (
        <p className="mt-3 text-xs text-white/50">Nota del revisor: {p.reviewerNote}</p>
      )}
    </div>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-white/45">{k}</dt>
      <dd className="mt-0.5 font-medium text-white/90">{v}</dd>
    </div>
  );
}

function VerificationForm({ previous }: { previous: ProfileView | null }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    firstName: previous?.firstName ?? "",
    lastName: previous?.lastName ?? "",
    licenseNumber: previous?.licenseNumber ?? "",
    licenseCollege: previous?.licenseCollege ?? "",
    email: previous?.email ?? "",
    specialty: previous?.specialty ?? "Oftalmología",
    hospital: previous?.hospital ?? "",
    careerStage: (previous?.careerStage ?? "attending") as "resident" | "attending",
    residencyYear: previous?.residencyYear ? String(previous.residencyYear) : "",
    primarySubspecialty: previous?.primarySubspecialty ?? "",
  });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const m = useMutation({
    mutationFn: (payload: unknown) => rh.submitVerification(payload),
    onSuccess: () => {
      toast.success("Solicitud enviada. Te avisaremos cuando esté verificada.");
      qc.invalidateQueries({ queryKey: rhKeys.profile });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    const payload = {
      ...f,
      licenseCollege: f.licenseCollege || undefined,
      residencyYear:
        f.careerStage === "resident" && f.residencyYear ? Number(f.residencyYear) : undefined,
      primarySubspecialty: f.primarySubspecialty || undefined,
    };
    const parsed = verificationSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    if (!consent) {
      setErrors({ consent: "Debes confirmar la declaración para continuar" });
      return;
    }
    setErrors({});
    m.mutate(payload);
  };

  return (
    <div className="rh-card rounded-3xl p-6 md:p-7">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--rh-radar-500)]/15 text-[color:var(--rh-radar-300)]">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <h2 className="text-xl text-white">Verificación profesional</h2>
      </div>
      <p className="mt-3 text-sm text-white/60">
        Las ligas oficiales son solo para médicos verificados. Comprobamos tu número de colegiado en
        el registro oficial antes de activar tu cuenta.
      </p>
      <ul className="mt-4 flex flex-wrap gap-2 text-xs text-white/75">
        {["Compite en tu liga", "Aparece en las clasificaciones", "Opta a la Gran Final"].map(
          (t) => (
            <li
              key={t}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1"
            >
              <Check className="h-3.5 w-3.5 text-[color:var(--rh-radar-300)]" /> {t}
            </li>
          ),
        )}
      </ul>
      {previous?.status === "rejected" && (
        <p className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-white/85">
          Tu solicitud anterior fue rechazada
          {previous.reviewerNote ? `: ${previous.reviewerNote}` : "."} Corrige los datos y vuelve a
          enviarla.
        </p>
      )}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field id="rh-first" label="Nombre" error={errors.firstName}>
          <Input
            id="rh-first"
            aria-invalid={!!errors.firstName}
            aria-describedby={errors.firstName ? "rh-first-error" : undefined}
            value={f.firstName}
            onChange={(e) => set("firstName")(e.target.value)}
            autoComplete="given-name"
          />
        </Field>
        <Field id="rh-last" label="Apellidos" error={errors.lastName}>
          <Input
            id="rh-last"
            aria-invalid={!!errors.lastName}
            aria-describedby={errors.lastName ? "rh-last-error" : undefined}
            value={f.lastName}
            onChange={(e) => set("lastName")(e.target.value)}
            autoComplete="family-name"
          />
        </Field>
        <Field id="rh-license" label="Número de colegiado" error={errors.licenseNumber}>
          <Input
            id="rh-license"
            aria-invalid={!!errors.licenseNumber}
            aria-describedby={errors.licenseNumber ? "rh-license-error" : undefined}
            value={f.licenseNumber}
            onChange={(e) => set("licenseNumber")(e.target.value)}
            inputMode="numeric"
            placeholder="Ej. 282812345"
          />
        </Field>
        <Field
          id="rh-college"
          label="Colegio de Médicos (provincia)"
          hint="Recomendado para comprobarlo"
        >
          <Input
            id="rh-college"
            value={f.licenseCollege}
            onChange={(e) => set("licenseCollege")(e.target.value)}
            placeholder="Ej. Madrid"
          />
        </Field>
        <Field
          id="rh-email"
          label="Correo profesional"
          error={errors.email}
          hint="Mejor el institucional"
        >
          <Input
            id="rh-email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "rh-email-error" : undefined}
            type="email"
            value={f.email}
            onChange={(e) => set("email")(e.target.value)}
            autoComplete="email"
          />
        </Field>
        <Field id="rh-specialty" label="Especialidad" error={errors.specialty}>
          <Input
            id="rh-specialty"
            aria-invalid={!!errors.specialty}
            aria-describedby={errors.specialty ? "rh-specialty-error" : undefined}
            value={f.specialty}
            onChange={(e) => set("specialty")(e.target.value)}
          />
        </Field>
        <Field
          id="rh-hospital"
          label="Hospital o centro"
          error={errors.hospital}
          className="sm:col-span-2"
        >
          <Input
            id="rh-hospital"
            aria-invalid={!!errors.hospital}
            aria-describedby={errors.hospital ? "rh-hospital-error" : undefined}
            value={f.hospital}
            onChange={(e) => set("hospital")(e.target.value)}
            autoComplete="organization"
          />
        </Field>
        <Field label="Etapa profesional (define tu liga)">
          <div className="flex rounded-full border border-white/10 bg-white/[0.04] p-1">
            {(["resident", "attending"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set("careerStage")(s)}
                aria-pressed={f.careerStage === s}
                className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${f.careerStage === s ? "bg-white text-[color:var(--rh-navy-950)]" : "text-white/60 hover:text-white"}`}
              >
                {s === "resident" ? "Residente" : "Adjunto/a"}
              </button>
            ))}
          </div>
        </Field>
        {f.careerStage === "resident" && (
          <Field id="rh-year" label="Año de residencia" error={errors.residencyYear}>
            <select
              id="rh-year"
              value={f.residencyYear}
              onChange={(e) => set("residencyYear")(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Selecciona…</option>
              {[1, 2, 3, 4].map((y) => (
                <option key={y} value={y}>
                  R{y}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field id="rh-sub" label="Subespecialidad principal (opcional)">
          <select
            id="rh-sub"
            value={f.primarySubspecialty}
            onChange={(e) => set("primarySubspecialty")(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">—</option>
            {SUBSPECIALTIES.map((s) => (
              <option key={s} value={s}>
                {SUBSPECIALTY_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <label className="mt-6 flex items-start gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/75">
        <Checkbox
          checked={consent}
          onCheckedChange={(v) => setConsent(v === true)}
          className="mt-0.5"
        />
        <span>
          Declaro que los datos son veraces y autorizo a Ophthalmology Radar a comprobarlos en el
          registro de colegiados con el único fin de verificar mi condición profesional.
        </span>
      </label>
      {errors.consent && <p className="mt-1 text-xs text-destructive">{errors.consent}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={m.isPending}
        className="rh-cta mt-6 rounded-full px-6 py-3 text-sm font-semibold disabled:opacity-60"
      >
        {m.isPending ? "Enviando…" : "Enviar verificación"}
      </button>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id?: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={id} className="text-sm">
        {label}
        {hint && <span className="ml-1 font-normal text-muted-foreground">· {hint}</span>}
      </Label>
      {children}
      {error && (
        <p id={id ? `${id}-error` : undefined} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function CompetencyPanel() {
  const comp = useCompetency();
  const navigate = useNavigate();
  const list = comp.data ?? [];
  const weak = weakAreas(list, 3, 3);
  const practice = async (sub: SubspecialtyCode) => {
    try {
      const rid = await rh.startPractice(sub);
      navigate({ to: "/radar-hunt/jugar/$roundId", params: { roundId: rid } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <>
      <div className="rh-card rounded-3xl p-6">
        <h2 className="text-lg text-white">
          Mapa de <em>competencias</em>
        </h2>
        <p className="mt-1 text-xs text-white/50">
          Puntuación tipo Elo por subespecialidad (parte de {ELO_START}). Orientación formativa, no
          una evaluación oficial.
        </p>
        {list.length === 0 ? (
          <div className="mt-5">
            <div className="flex flex-wrap gap-1.5" aria-hidden>
              {SUBSPECIALTIES.map((s) => (
                <span
                  key={s}
                  className="h-2 w-6 rounded-full opacity-30"
                  style={{ background: subColor(s) }}
                />
              ))}
            </div>
            <p className="mt-4 text-sm text-white/70">
              Tu mapa se dibuja a medida que juegas: cada respuesta ajusta tu nivel en esa
              subespecialidad.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to="/radar-hunt/eye"
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[color:var(--rh-navy-950)] hover:opacity-90"
              >
                <Eye className="h-3.5 w-3.5" /> Practicar en el Eye Universe
              </Link>
              <Link
                to="/radar-hunt/boss"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-white hover:bg-white/[0.06]"
              >
                Probar un reto BOSS
              </Link>
            </div>
          </div>
        ) : (
          <ul className="mt-5 flex flex-col gap-3">
            {[...list]
              .sort((a, b) => b.rating - a.rating)
              .map((c) => {
                const w = Math.max(4, Math.min(100, ((c.rating - 700) / 600) * 100));
                const color = subColor(c.subspecialty);
                return (
                  <li key={c.subspecialty} className="text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-white/85">{SUBSPECIALTY_LABELS[c.subspecialty]}</span>
                      <span className="text-xs tabular-nums text-white/50">
                        <span className="font-semibold text-white">{Math.round(c.rating)}</span> ·{" "}
                        {c.correct}/{c.items}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${w}%`, background: color }}
                      />
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </div>
      {weak.length > 0 && (
        <div className="rh-card rounded-3xl p-6">
          <h2 className="text-lg text-white">
            Tu itinerario <em>recomendado</em>
          </h2>
          <ul className="mt-4 flex flex-col gap-2">
            {weak.map((c) => {
              const st = EYE_STRUCTURES.find((s) => s.subspecialties.includes(c.subspecialty));
              const color = subColor(c.subspecialty);
              return (
                <li
                  key={c.subspecialty}
                  className="flex items-center justify-between gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm"
                >
                  <span className="flex items-center gap-2 font-medium text-white">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                    {SUBSPECIALTY_LABELS[c.subspecialty]}
                  </span>
                  <span className="flex gap-1.5">
                    {st && (
                      <Link
                        to="/radar-hunt/eye"
                        className="flex items-center gap-1 rounded-full border border-white/12 px-2.5 py-1 text-xs text-white/75 hover:text-white"
                      >
                        <Eye className="h-3.5 w-3.5" /> {st.name}
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => practice(c.subspecialty)}
                      className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[color:var(--rh-navy-950)]"
                    >
                      <Dumbbell className="h-3.5 w-3.5" /> Practicar
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

const badgeLabel = (name: string) => {
  const short = name.replace(/^Ruta (del |de la )?/i, "");
  return short.charAt(0).toUpperCase() + short.slice(1);
};

/** Insignias del Eye Universe: anillo de progreso con el color de cada recorrido. */
function BadgesPanel() {
  const eye = useEyeProgress().data ?? [];
  const badges = computeTrackBadges(eye);
  return (
    <div className="rh-card rounded-3xl p-6">
      <div className="flex items-end justify-between gap-2">
        <h2 className="text-lg text-white">
          Tus <em>insignias</em>
        </h2>
        <Link to="/radar-hunt/premios" className="text-xs text-white/50 hover:text-white">
          Ver todas
        </Link>
      </div>
      <ul className="mt-5 grid grid-cols-4 gap-x-2 gap-y-5 sm:grid-cols-7 lg:grid-cols-4 xl:grid-cols-7">
        {badges.map((b) => (
          <li key={b.id} className="flex flex-col items-center gap-2 text-center" title={b.hint}>
            <span
              className="relative flex h-14 w-14 items-center justify-center rounded-full p-[3px]"
              style={{
                background: `conic-gradient(${b.color} ${b.progress * 360}deg, oklch(1 0 0 / 0.08) 0)`,
                boxShadow: b.earned ? `0 0 24px -4px ${b.color}` : undefined,
              }}
            >
              <span className="flex h-full w-full items-center justify-center rounded-full bg-[oklch(0.17_0.03_252)]">
                <Award
                  className="h-6 w-6"
                  style={{ color: b.earned ? b.color : "oklch(1 0 0 / 0.3)" }}
                />
              </span>
            </span>
            <span
              className={`text-[11px] leading-tight ${b.earned ? "text-white" : "text-white/45"}`}
            >
              {badgeLabel(b.name)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
