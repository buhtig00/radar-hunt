import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listSourceAudit } from "@/lib/sources.functions";
import { History, ShieldCheck, CheckCircle2, XCircle, Edit3, Eye, Loader2 } from "lucide-react";

const DECISION_META: Record<string, { label: string; tone: string; icon: typeof ShieldCheck }> = {
  approve_activate: {
    label: "Aprobada y activada",
    tone: "text-[color:var(--success)]",
    icon: CheckCircle2,
  },
  kol_verify: { label: "Verificada por KOL", tone: "text-[color:var(--gold)]", icon: ShieldCheck },
  request_changes: {
    label: "Cambios solicitados",
    tone: "text-[color:var(--warning)]",
    icon: Edit3,
  },
  reject: { label: "Rechazada", tone: "text-destructive", icon: XCircle },
  reactivate: { label: "Reactivada", tone: "text-[color:var(--success)]", icon: CheckCircle2 },
  deactivate: { label: "Desactivada", tone: "text-muted-foreground", icon: XCircle },
  comment: { label: "Comentario", tone: "text-muted-foreground", icon: Eye },
};

export function SourceAuditHistory({ sourceId, title }: { sourceId?: string; title?: string }) {
  const listFn = useServerFn(listSourceAudit);
  const q = useQuery({
    queryKey: ["source-audit", sourceId ?? "all"],
    queryFn: () => listFn({ data: { source_id: sourceId, limit: 100 } }),
  });

  const items = q.data ?? [];

  return (
    <Card className="border-border bg-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <p className="font-medium text-foreground">
          {title ?? "Historial de decisiones KOL / editoriales"}
        </p>
        <span className="text-xs text-muted-foreground">
          {q.isLoading ? "Cargando…" : `${items.length} entradas`}
        </span>
      </div>

      {q.isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin decisiones registradas todavía. Las aprobaciones, rechazos y verificaciones KOL
          aparecerán aquí.
        </p>
      ) : (
        <ol className="relative space-y-3 border-l border-border pl-4">
          {items.map((it) => {
            const meta = DECISION_META[it.decision] ?? DECISION_META.comment;
            const Icon = meta.icon;
            const statusChanged = it.prev_status !== it.new_status;
            const activeChanged = it.prev_is_active !== it.new_is_active;
            return (
              <li key={it.id} className="relative">
                <span className="absolute -left-[22px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-surface ring-2 ring-border">
                  <Icon className={`h-3 w-3 ${meta.tone}`} />
                </span>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className={`text-sm font-medium ${meta.tone}`}>{meta.label}</span>
                  {it.actor_role && (
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                      {it.actor_role}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(it.created_at).toLocaleString()}
                  </span>
                </div>
                {it.source_title && !sourceId && (
                  <p className="mt-0.5 text-xs text-foreground/80">
                    <span className="text-muted-foreground">Fuente:</span> {it.source_title}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {statusChanged && (
                    <>
                      Estado: <span className="text-foreground">{it.prev_status ?? "—"}</span> →{" "}
                      <span className="text-foreground">{it.new_status ?? "—"}</span>
                    </>
                  )}
                  {statusChanged && activeChanged && " · "}
                  {activeChanged && (
                    <>
                      Activa: <span className="text-foreground">{String(it.prev_is_active)}</span> →{" "}
                      <span className="text-foreground">{String(it.new_is_active)}</span>
                    </>
                  )}
                  {!statusChanged && !activeChanged && "Sin cambios estructurales"}
                </p>
                {it.comment && (
                  <p className="mt-1 rounded-md border border-border bg-muted/40 p-2 text-xs text-foreground">
                    {it.comment}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
