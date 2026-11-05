import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

export interface MetricCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  trend?: string;
  trendDirection?: "up" | "down" | "flat";
  accent?: "default" | "gold";
  className?: string;
}

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  trendDirection = "up",
  accent = "default",
  className,
}: MetricCardProps) {
  const TrendIcon = trendDirection === "down" ? TrendingDown : TrendingUp;
  const trendTone =
    trendDirection === "down"
      ? "text-[color:var(--destructive)]"
      : trendDirection === "flat"
        ? "text-muted-foreground"
        : "text-[color:var(--success)]";

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-border bg-surface p-5 shadow-[var(--shadow-card)] transition-colors hover:border-[color:var(--ring)]/30",
        className,
      )}
    >
      <span
        className={cn(
          "absolute inset-x-0 top-0 h-px",
          accent === "gold"
            ? "bg-gradient-gold"
            : "bg-gradient-to-r from-transparent via-[color:var(--ring)]/40 to-transparent",
        )}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2.5 font-serif text-[28px] font-semibold leading-none text-foreground tabular-nums">
            {value}
          </p>
        </div>
        {Icon && (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border",
              accent === "gold"
                ? "border-gold/30 bg-gold/10 text-[color:var(--gold)]"
                : "border-border bg-muted text-[color:var(--ring)]",
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
          </div>
        )}
      </div>
      {(hint || trend) && (
        <div className="mt-4 flex items-center gap-2 text-xs">
          {trend && (
            <span className={cn("inline-flex items-center gap-1 font-medium", trendTone)}>
              <TrendIcon className="h-3 w-3" />
              {trend}
            </span>
          )}
          {trend && hint && <span className="text-border">·</span>}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      )}
    </Card>
  );
}
