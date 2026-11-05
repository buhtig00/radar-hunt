import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Database } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { RoleGuard } from "@/components/role-guard";
import { getSystemStatus, type CheckStatus } from "@/lib/system-status.functions";

export const Route = createFileRoute("/_authenticated/system-status")({
  head: () => ({
    meta: [
      { title: "Estado del sistema · Ophthalmology Radar" },
      {
        name: "description",
        content:
          "Verificación en vivo de la conexión a Lovable Cloud: base de datos, auth, storage y RPC.",
      },
    ],
  }),
  component: () => (
    <RoleGuard capability="manage_settings">
      <StatusPage />
    </RoleGuard>
  ),
});

const STATUS_ICON: Record<CheckStatus, React.ComponentType<{ className?: string }>> = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  error: XCircle,
};
const STATUS_COLOR: Record<CheckStatus, string> = {
  ok: "text-emerald-500",
  warn: "text-amber-500",
  error: "text-destructive",
};
const STATUS_LABEL: Record<CheckStatus, string> = {
  ok: "OK",
  warn: "AVISO",
  error: "ERROR",
};

function StatusPage() {
  const fn = useServerFn(getSystemStatus);
  const { data, isFetching, refetch, error } = useQuery({
    queryKey: ["system-status"],
    queryFn: () => fn(),
    refetchOnWindowFocus: false,
  });

  const overall: CheckStatus = !data
    ? "warn"
    : data.checks.some((c) => c.status === "error")
      ? "error"
      : data.checks.some((c) => c.status === "warn")
        ? "warn"
        : "ok";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        eyebrow="Configuración"
        title="Estado del sistema"
        description="Diagnóstico en vivo de la conexión a Lovable Cloud: variables, base de datos, autenticación, almacenamiento, RPC y RAG."
      />

      <Card className="border-border bg-surface p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Lovable Cloud</p>
              <p className="text-xs text-muted-foreground break-all">{data?.supabase_url || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant={
                overall === "ok" ? "default" : overall === "warn" ? "secondary" : "destructive"
              }
            >
              {STATUS_LABEL[overall]}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Volver a comprobar
            </Button>
          </div>
        </div>
        {data?.generated_at && (
          <p className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">
            Última comprobación: {new Date(data.generated_at).toLocaleString("es-ES")}
          </p>
        )}
      </Card>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {(error as Error).message}
        </Card>
      )}

      <Card className="border-border bg-surface shadow-[var(--shadow-card)]">
        <div className="divide-y divide-border">
          {(data?.checks ?? []).map((c) => {
            const Icon = STATUS_ICON[c.status];
            return (
              <div key={c.key} className="flex items-start justify-between gap-4 p-4">
                <div className="flex items-start gap-3">
                  <Icon className={`mt-0.5 h-5 w-5 ${STATUS_COLOR[c.status]}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.detail}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      c.status === "ok"
                        ? "default"
                        : c.status === "warn"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {STATUS_LABEL[c.status]}
                  </Badge>
                  {typeof c.latency_ms === "number" && (
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {c.latency_ms} ms
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {!data && !error && (
            <div className="p-6 text-sm text-muted-foreground">Comprobando estado…</div>
          )}
        </div>
      </Card>

      {data && Object.keys(data.counts).length > 0 && (
        <Card className="border-border bg-surface p-6 shadow-[var(--shadow-card)]">
          <h2 className="font-serif text-lg font-semibold text-foreground">
            Inventario de contenido
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(data.counts).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-border bg-background p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</p>
                <p className="mt-1 font-serif text-2xl font-semibold text-foreground">
                  {v === null ? "—" : v.toLocaleString("es-ES")}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
