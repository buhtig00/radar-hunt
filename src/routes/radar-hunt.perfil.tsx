import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dumbbell, Eye, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useCompetency, useMyProfile, rhKeys } from "@/lib/radar-hunt/hooks";
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
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        {p && p.status !== "rejected" ? <ProfileCard p={p} /> : <VerificationForm previous={p} />}
      </div>
      <CompetencyPanel />
    </div>
  );
}

function ProfileCard({ p }: { p: ProfileView }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold">{p.displayName}</h1>
          <p className="text-sm text-muted-foreground">
            {p.specialty} · {p.hospital}
          </p>
        </div>
        <VerificationBadge status={p.status} />
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Item k="Nº de colegiado" v={p.licenseNumber} />
        <Item k="Colegio" v={p.licenseCollege ?? "—"} />
        <Item k="Correo profesional" v={p.email} />
        <Item
          k="Etapa"
          v={p.careerStage === "resident" ? `Residente R${p.residencyYear}` : "Adjunto/a"}
        />
        <Item
          k="Subespecialidad principal"
          v={p.primarySubspecialty ? SUBSPECIALTY_LABELS[p.primarySubspecialty] : "—"}
        />
        <Item k="Enviada" v={new Date(p.submittedAt).toLocaleString("es-ES")} />
      </dl>
      {p.status === "pending" && (
        <p className="mt-4 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          El equipo de verificación comprobará tu número de colegiado en el registro oficial.
          Mientras tanto puedes jugar la práctica libre y los retos BOSS.
        </p>
      )}
      {p.status === "verified" && (
        <p className="mt-4 flex items-center gap-2 text-sm text-[color:var(--success)]">
          <ShieldCheck className="h-4 w-4" /> Puedes competir en las ligas oficiales.
        </p>
      )}
      {p.reviewerNote && (
        <p className="mt-2 text-xs text-muted-foreground">Nota del revisor: {p.reviewerNote}</p>
      )}
    </div>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
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
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
      <h1 className="font-serif text-2xl font-semibold">Verificación profesional</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Las ligas oficiales son solo para médicos verificados. Comprobamos tu número de colegiado en
        el registro oficial antes de activar tu cuenta.
      </p>
      {previous?.status === "rejected" && (
        <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
          <div className="flex gap-2">
            {(["resident", "attending"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set("careerStage")(s)}
                className={`flex-1 rounded-md border px-3 py-2 text-sm ${f.careerStage === s ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
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
      <label className="mt-5 flex items-start gap-2 text-sm">
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
        className="mt-5 rounded-md bg-[color:var(--navy)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
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
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="font-serif text-lg font-semibold">Mapa de competencias</h2>
        <p className="text-xs text-muted-foreground">
          Puntuación tipo Elo por subespecialidad (parte de {ELO_START}). Orientación formativa, no
          una evaluación oficial.
        </p>
        {list.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Juega una ronda o una práctica para empezar tu mapa.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {[...list]
              .sort((a, b) => b.rating - a.rating)
              .map((c) => {
                const w = Math.max(4, Math.min(100, ((c.rating - 700) / 600) * 100));
                return (
                  <li key={c.subspecialty} className="text-sm">
                    <div className="flex justify-between">
                      <span>{SUBSPECIALTY_LABELS[c.subspecialty]}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {Math.round(c.rating)} · {c.correct}/{c.items}
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-[color:var(--navy)]"
                        style={{ width: `${w}%` }}
                      />
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </div>
      {weak.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-serif text-lg font-semibold">Tu itinerario recomendado</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {weak.map((c) => {
              const st = EYE_STRUCTURES.find((s) => s.subspecialties.includes(c.subspecialty));
              return (
                <li
                  key={c.subspecialty}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{SUBSPECIALTY_LABELS[c.subspecialty]}</span>
                  <span className="flex gap-1">
                    {st && (
                      <Link
                        to="/radar-hunt/eye"
                        className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" /> {st.name}
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => practice(c.subspecialty)}
                      className="flex items-center gap-1 rounded-md bg-[color:var(--navy)] px-2 py-1 text-xs text-white"
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
    </div>
  );
}
