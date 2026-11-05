// RADAR HUNT — componentes compartidos de la interfaz.
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, BadgeCheck, Clock, FlaskConical, ShieldAlert } from "lucide-react";
import { SUBSPECIALTY_LABELS } from "@/lib/radar-hunt/catalog";
import { RH_MODE } from "@/lib/radar-hunt/service";
import type { SubspecialtyCode, VerificationStatus } from "@/lib/radar-hunt/types";
import type { ProfileView } from "@/lib/radar-hunt/views";

export function RhHero({
  eyebrow,
  title,
  children,
  actions,
}: {
  eyebrow?: string;
  /** Admite <em> para el acento en Instrument Serif cursiva. */
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="rh-hero-bg rh-on-ink relative overflow-hidden rounded-3xl border border-white/10 px-6 py-9 text-white shadow-[var(--shadow-card)] md:px-10 md:py-12">
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10"
        aria-hidden
      >
        <div className="absolute inset-10 rounded-full border border-white/10" />
        <div className="absolute inset-20 rounded-full border border-white/10" />
        <div className="rh-sweep absolute inset-0 rounded-full" />
      </div>
      {eyebrow && (
        <div className="relative text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--rh-radar-300)]">
          {eyebrow}
        </div>
      )}
      <h1 className="relative mt-3 max-w-3xl text-3xl leading-[1.08] md:text-5xl">{title}</h1>
      {children && (
        <div className="relative mt-4 max-w-2xl text-sm text-white/72 md:text-base">{children}</div>
      )}
      {actions && <div className="relative mt-7 flex flex-wrap gap-3">{actions}</div>}
    </section>
  );
}

/** Insignia de puesto: oro solo para el podio (1–3). */
export function RankBadge({ rank }: { rank: number }) {
  const podium = rank >= 1 && rank <= 3;
  return (
    <span
      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full border px-1.5 font-mono text-xs font-semibold ${
        podium ? "rh-podium" : "border-border text-muted-foreground"
      }`}
    >
      {rank}
    </span>
  );
}

export function SubBadge({ code }: { code: SubspecialtyCode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
      {SUBSPECIALTY_LABELS[code]}
    </span>
  );
}

export function DemoModeNotice() {
  if (RH_MODE !== "demo") return null;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/10 px-3 py-2 text-xs text-foreground">
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--gold)]" />
      <span>
        <strong>Modo demostración.</strong> Tu progreso se guarda solo en este navegador. Las
        preguntas son de demostración, con referencia, pero{" "}
        <strong>pendientes de validación KOL</strong>. Los «participantes demo» de las
        clasificaciones son ficticios. Para aprobar tu verificación en la demo, cambia el rol a
        Administrador en la barra superior.
      </span>
    </div>
  );
}

export function UnvalidatedNotice() {
  return (
    <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--warning)]" />
      <span>
        Pregunta de demostración pendiente de validación por el comité editorial y KOL. Contenido
        educativo, no asistencial.
      </span>
    </div>
  );
}

const STATUS_UI: Record<
  VerificationStatus,
  { label: string; cls: string; icon: typeof BadgeCheck }
> = {
  verified: {
    label: "Verificado",
    cls: "border-success/40 bg-success/10 text-[color:var(--success)]",
    icon: BadgeCheck,
  },
  pending: {
    label: "Verificación pendiente",
    cls: "border-warning/40 bg-warning/10 text-[color:var(--warning)]",
    icon: Clock,
  },
  rejected: {
    label: "Verificación rechazada",
    cls: "border-destructive/40 bg-destructive/10 text-destructive",
    icon: ShieldAlert,
  },
  unverified: {
    label: "Sin verificar",
    cls: "border-border bg-muted text-muted-foreground",
    icon: ShieldAlert,
  },
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const s = STATUS_UI[status];
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${s.cls}`}
    >
      <Icon className="h-3.5 w-3.5" /> {s.label}
    </span>
  );
}

export function VerificationGate({ profile }: { profile: ProfileView | null }) {
  if (profile?.status === "verified") return null;
  const text =
    profile?.status === "pending"
      ? "Tu solicitud de verificación está en revisión. Mientras tanto puedes jugar la práctica libre y los retos BOSS."
      : profile?.status === "rejected"
        ? "Tu verificación fue rechazada. Revisa tus datos y vuelve a enviarla."
        : "Las ligas oficiales son solo para médicos verificados. Verifícate con tu número de colegiado.";
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <VerificationBadge status={profile?.status ?? "unverified"} />
        <span className="text-muted-foreground">{text}</span>
      </div>
      {profile?.status !== "pending" && (
        <Link
          to="/radar-hunt/perfil"
          className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          Verificarme
        </Link>
      )}
    </div>
  );
}
