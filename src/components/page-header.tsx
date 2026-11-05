import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 border-b border-border pb-6 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="space-y-2 max-w-3xl">
        {eyebrow && (
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--gold)]">
            <span className="h-px w-6 bg-[color:var(--gold)]/50" />
            {eyebrow}
          </p>
        )}
        <h1 className="font-serif text-[28px] font-semibold leading-tight text-foreground md:text-[34px]">
          {title}
        </h1>
        {description && (
          <p className="text-[14px] leading-relaxed text-muted-foreground md:text-[15px]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
