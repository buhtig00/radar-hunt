import { cn } from "@/lib/utils";
import type { ApprovalStatus, SafetyFlag, ValidationLevel } from "@/lib/types";
import { CheckCircle2, ShieldCheck, Sparkles, AlertTriangle, Info } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function StatusBadge({ status }: { status: ApprovalStatus }) {
  const { statusLabel } = useI18n();
  const styles: Record<ApprovalStatus, string> = {
    Draft: "bg-muted text-muted-foreground border-border",
    "Pending Review": "bg-warning/10 text-[color:var(--warning)] border-warning/30",
    Approved: "bg-success/10 text-[color:var(--success)] border-success/30",
    Rejected: "bg-destructive/10 text-destructive border-destructive/30",
    Archived: "bg-muted text-muted-foreground border-border opacity-70",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
        styles[status],
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

export function ValidationBadge({ level, kolName }: { level: ValidationLevel; kolName?: string }) {
  const { t, validationLabel } = useI18n();
  if (level === "KOL Verified") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-gold/40 bg-gradient-to-br from-gold/15 to-gold/5 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[color:var(--gold-foreground)] shadow-[inset_0_1px_0_0_oklch(1_0_0_/_0.4)]">
        <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--gold)]" />
        {t("validation.KOL_with_name")}
        {kolName ? ` · ${kolName}` : ""}
      </span>
    );
  }
  if (level === "OR Reviewed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-ring/30 bg-ring/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[color:var(--ring)]">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {validationLabel(level)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      <Sparkles className="h-3.5 w-3.5" />
      {validationLabel(level)}
    </span>
  );
}

export function SafetyBadge({ flag }: { flag: SafetyFlag }) {
  const { safetyLabel } = useI18n();
  const tone =
    flag === "Emergency symptom" || flag === "Red flag" || flag === "Patient-identifiable data risk"
      ? "bg-destructive/10 text-destructive border-destructive/30"
      : flag === "Needs specialist review" || flag === "KOL review recommended"
        ? "bg-warning/10 text-[color:var(--warning)] border-warning/30"
        : "bg-muted text-muted-foreground border-border";
  const Icon = flag === "Emergency symptom" || flag === "Red flag" ? AlertTriangle : Info;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium",
        tone,
      )}
    >
      <Icon className="h-3 w-3" />
      {safetyLabel(flag)}
    </span>
  );
}

/** Chip tipo píldora para superficies como separadores de modo "IA Educativa" / "Búsqueda de evidencia". */
export function ModeChip({
  label,
  tone = "blue",
}: {
  label: string;
  tone?: "blue" | "gold" | "neutral";
}) {
  const toneCls =
    tone === "gold"
      ? "border-gold/40 bg-gold/10 text-[color:var(--gold-foreground)]"
      : tone === "blue"
        ? "border-ring/30 bg-ring/10 text-[color:var(--ring)]"
        : "border-border bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
        toneCls,
      )}
    >
      {label}
    </span>
  );
}
