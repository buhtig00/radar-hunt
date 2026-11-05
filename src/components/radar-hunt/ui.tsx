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
  image,
  footer,
}: {
  eyebrow?: string;
  /** Admite <em> para el acento en Instrument Serif cursiva. */
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  /** Fotograma de fondo (lado derecho, fundido hacia el texto). */
  image?: string;
  /** Fila inferior (cifras, chips). */
  footer?: ReactNode;
}) {
  return (
    <section className="rh-hero-bg rh-on-ink relative isolate overflow-hidden rounded-[28px] border border-white/10 px-6 py-9 text-white md:px-10 md:py-12">
      {image ? (
        <div
          className="rh-hero-image absolute inset-y-0 right-0 -z-10 w-full md:w-[62%]"
          aria-hidden
        >
          <img
            src={image}
            alt=""
            className="h-full w-full object-cover object-[72%_center] md:object-center"
            loading="eager"
          />
        </div>
      ) : (
        <div
          className="pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full border border-white/10"
          aria-hidden
        >
          <div className="absolute inset-10 rounded-full border border-white/10" />
          <div className="absolute inset-20 rounded-full border border-white/10" />
          <div className="rh-sweep absolute inset-0 rounded-full" />
        </div>
      )}
      {eyebrow && (
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--rh-radar-300)]">
          {eyebrow}
        </div>
      )}
      <h1 className="mt-3 max-w-3xl text-[2.1rem] leading-[1.05] md:text-[3.4rem]">{title}</h1>
      {children && (
        <div className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/72 md:text-base">
          {children}
        </div>
      )}
      {actions && <div className="mt-7 flex flex-wrap gap-3">{actions}</div>}
      {footer && <div className="mt-8 border-t border-white/10 pt-5">{footer}</div>}
    </section>
  );
}

/** Título de sección con acento opcional (<em>) y enlace o acción a la derecha. */
export function RhSectionTitle({
  title,
  eyebrow,
  action,
}: {
  title: ReactNode;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        {eyebrow && (
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--rh-radar-300)]">
            {eyebrow}
          </div>
        )}
        <h2 className="text-xl md:text-2xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

/** Barra de progreso fina con color propio. */
export function RhProgress({ value, color }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{
          width: `${pct}%`,
          background: color ?? "linear-gradient(90deg, var(--rh-radar-300), var(--rh-radar-600))",
        }}
      />
    </div>
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
      ? "Tu solicitud está en revisión. Mientras tanto puedes jugar la práctica libre y los retos BOSS."
      : profile?.status === "rejected"
        ? "Tu verificación fue rechazada. Revisa tus datos y vuelve a enviarla."
        : "Las ligas oficiales son solo para médicos verificados. Verifícate con tu número de colegiado.";
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--warning)]/25 bg-[color:var(--warning)]/[0.07] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5 sm:items-center">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--warning)] sm:mt-0" />
        <span className="text-foreground/80">{text}</span>
      </div>
      {profile?.status !== "pending" && (
        <Link
          to="/radar-hunt/perfil"
          className="shrink-0 self-start rounded-full bg-[color:var(--warning)] px-4 py-1.5 text-xs font-semibold text-[color:var(--rh-navy-950)] hover:opacity-90 sm:self-auto"
        >
          Verificarme
        </Link>
      )}
    </div>
  );
}
