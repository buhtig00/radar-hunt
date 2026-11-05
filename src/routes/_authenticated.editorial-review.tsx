import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { SafetyBadge } from "@/components/badges";
import { EDITORIAL_QUEUE } from "@/lib/mock-data";
import type { ReviewQueueItem, SafetyFlag } from "@/lib/types";
import {
  Check,
  X,
  MessageSquareWarning,
  BadgeCheck,
  Archive,
  Edit3,
  ShieldAlert,
  Database,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { tr } from "@/lib/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { indexEvidenceCorpus, getEvidenceQualityReport } from "@/lib/ai/index.functions";
import {
  listPendingEditorial,
  setEditorialStatus,
  listFlaggedAIAnswers,
} from "@/lib/editorial.functions";
import { RoleBootstrapCard } from "@/components/role-bootstrap-card";
import { SourcesReviewQueue } from "@/components/sources-review-queue";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/editorial-review")({
  head: () => ({
    meta: [
      { title: "Revisión editorial · Ophthalmology Radar" },
      {
        name: "description",
        content:
          "Espacio del editor médico para revisar fuentes de conocimiento, respuestas de IA, alertas de seguridad y derivaciones a KOL.",
      },
      { property: "og:title", content: "Revisión editorial" },
      {
        property: "og:description",
        content: "Superficie de control editorial de la Capa de Inteligencia de OR.",
      },
    ],
  }),
  component: EditorialPage,
});

const sources = EDITORIAL_QUEUE.filter((i) => i.kind === "source");
const answers = EDITORIAL_QUEUE.filter((i) => i.kind === "answer");

const FAQS = [
  {
    q: "¿La IA debe sugerir dosis?",
    a: "No. El sistema rechaza recomendaciones de tratamiento individual y deriva a KOLs y a las guías de origen.",
  },
  {
    q: "¿Puede la IA interpretar imágenes de OCT?",
    a: "No. La interpretación de imágenes está bloqueada en este MVP.",
  },
  {
    q: "¿Qué activa una revisión KOL?",
    a: "Respuestas con evidencia limitada, alertas de seguridad o revisiones solicitadas por el médico.",
  },
];

function EditorialPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        eyebrow="Revisión editorial"
        title="Revisión editorial"
        description="Aprueba y cura las entradas y salidas de la Capa de Inteligencia."
      />
      <RoleBootstrapCard />
      <IndexEvidencePanel />
      <SourcesReviewQueue />
      <LivePendingPanel />
      <Tabs defaultValue="sources">
        <TabsList className="bg-muted">
          <TabsTrigger value="sources">
            Fuentes pendientes (demo) <Pill>{sources.length}</Pill>
          </TabsTrigger>
          <TabsTrigger value="answers">
            Respuestas de IA <Pill>{answers.length}</Pill>
          </TabsTrigger>
          <TabsTrigger value="safety">
            Alertas de seguridad <Pill>3</Pill>
          </TabsTrigger>
          <TabsTrigger value="faqs">
            Preguntas frecuentes <Pill>{FAQS.length}</Pill>
          </TabsTrigger>
          <TabsTrigger value="kol">
            Revisiones KOL sugeridas <Pill>4</Pill>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="mt-4 space-y-3">
          {sources.map((s) => (
            <SourceReviewCard key={s.id} item={s} />
          ))}
        </TabsContent>
        <TabsContent value="answers" className="mt-4 space-y-3">
          <FlaggedAnswersPanel />
          {answers.map((s) => (
            <AnswerReviewCard key={s.id} item={s} />
          ))}
        </TabsContent>
        <TabsContent value="safety" className="mt-4 space-y-3">
          <SafetySummary />
        </TabsContent>
        <TabsContent value="faqs" className="mt-4 grid gap-3 md:grid-cols-2">
          {FAQS.map((f) => (
            <Card key={f.q} className="border-border bg-surface p-5">
              <p className="font-medium text-foreground">{f.q}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="kol" className="mt-4 space-y-3">
          {answers.map((s) => (
            <Card
              key={s.id}
              className="border-border bg-surface p-5 flex items-start justify-between gap-4"
            >
              <div>
                <p className="font-medium text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground">
                  {s.subspecialty} · KOL sugerido: Dr. M. Teus
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => toast.success(tr("toast.editorial.assigned_kol"))}
                className="gap-2"
              >
                <BadgeCheck className="h-4 w-4" /> Asignar
              </Button>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1.5 rounded-full bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
      {children}
    </span>
  );
}

function SourceReviewCard({ item }: { item: ReviewQueueItem }) {
  return (
    <Card className="border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">{item.title}</p>
          <p className="text-xs text-muted-foreground">
            {item.subspecialty} · {item.author} · Subido el {item.uploaded_at}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => toast.success(tr("toast.editorial.approved"))}
            className="gap-1.5"
          >
            <Check className="h-4 w-4" /> Aprobar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.success(tr("toast.editorial.changes_requested"))}
          >
            <Edit3 className="h-4 w-4 mr-1.5" /> Solicitar cambios
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.success(tr("toast.editorial.assigned_kol"))}
          >
            <BadgeCheck className="h-4 w-4 mr-1.5" /> Asignar KOL
          </Button>
          <Button size="sm" variant="ghost" onClick={() => toast("Marcado como desactualizado")}>
            Marcar desactualizado
          </Button>
          <Button size="sm" variant="ghost" onClick={() => toast("Rechazado")}>
            <X className="h-4 w-4 mr-1.5" /> Rechazar
          </Button>
        </div>
      </div>
      <p className="mt-3 text-sm text-foreground">{item.summary}</p>
      {item.risk_notes?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.risk_notes.map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-1 rounded-md border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs text-[color:var(--warning)]"
            >
              <ShieldAlert className="h-3 w-3" />
              {r}
            </span>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function AnswerReviewCard({ item }: { item: ReviewQueueItem }) {
  return (
    <Card className="border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Consulta del usuario
          </p>
          <p className="text-sm text-foreground">{item.query}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => toast.success(tr("toast.editorial.or_reviewed"))}
            className="gap-1.5"
          >
            <BadgeCheck className="h-4 w-4" /> Marcar como Revisado por OR
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.success(tr("toast.editorial.editing"))}
          >
            <Edit3 className="h-4 w-4 mr-1.5" /> Editar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.success(tr("toast.editorial.sent_kol"))}
          >
            Enviar a KOL
          </Button>
          <Button size="sm" variant="ghost" onClick={() => toast("Archivado")}>
            <Archive className="h-4 w-4 mr-1.5" /> Archivar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => toast.error(tr("toast.editorial.unsafe"))}
          >
            <MessageSquareWarning className="h-4 w-4 mr-1.5" /> Marcar inseguro
          </Button>
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Respuesta de la IA</p>
        <p className="mt-1 text-sm text-foreground">{item.answer}</p>
      </div>
      {item.safety_flags?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.safety_flags.map((f) => (
            <SafetyBadge key={f} flag={f} />
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function SafetySummary() {
  const events = [
    {
      id: 1,
      severity: "high",
      type: "Síntoma de urgencia detectado",
      query: "Pérdida súbita de visión en el ojo izquierdo",
      time: "hace 2h",
    },
    {
      id: 2,
      severity: "medium",
      type: "Solicitud de dosis de tratamiento",
      query: "¿Qué dosis de bevacizumab para EMD?",
      time: "hace 1d",
    },
    {
      id: 3,
      severity: "medium",
      type: "Solicitud de interpretación de imagen",
      query: "Interprétame este OCT",
      time: "hace 2d",
    },
  ];
  return (
    <div className="space-y-2">
      {events.map((e) => (
        <Card key={e.id} className="border-border bg-surface p-4 flex items-start gap-3">
          <ShieldAlert
            className={
              e.severity === "high"
                ? "h-5 w-5 text-destructive"
                : "h-5 w-5 text-[color:var(--warning)]"
            }
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{e.type}</p>
            <p className="text-xs text-muted-foreground">
              Consulta: "{e.query}" · {e.time}
            </p>
          </div>
          <Button size="sm" variant="outline">
            Revisar
          </Button>
        </Card>
      ))}
    </div>
  );
}

function IndexEvidencePanel() {
  const queryClient = useQueryClient();
  const indexFn = useServerFn(indexEvidenceCorpus);
  const reportFn = useServerFn(getEvidenceQualityReport);

  const status = useQuery({
    queryKey: ["evidence-index-status"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("ai_knowledge_sources")
        .select("id", { count: "exact", head: true })
        .eq("metadata->>imported_from", "ophthalmology-evidence")
        .eq("is_active", true);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const report = useQuery({
    queryKey: ["evidence-quality-report"],
    queryFn: () => reportFn(),
  });

  const mutation = useMutation({
    mutationFn: () => indexFn(),
    onSuccess: (res) => {
      const tone = res.ok ? toast.success : toast.warning;
      tone(
        `Evidencia indexada: ${res.sources_inserted} fuentes · ${res.chunks_inserted} fragmentos · ${res.issues.length} avisos`,
      );
      queryClient.invalidateQueries({ queryKey: ["evidence-index-status"] });
      queryClient.invalidateQueries({ queryKey: ["evidence-quality-report"] });
    },
    onError: (err: Error) => toast.error(`Error al indexar: ${err.message}`),
  });

  const indexed = status.data ?? 0;
  const isIndexed = indexed > 0;
  const r = report.data;

  return (
    <Card className="border-border bg-surface p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Database className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Corpus de evidencia (RAG)</p>
            <p className="text-xs text-muted-foreground">
              {status.isLoading
                ? "Comprobando estado…"
                : isIndexed
                  ? `Indexado: ${indexed} fuentes aprobadas con embeddings activos. Reindexado automático semanal (lunes 03:00 UTC).`
                  : "El corpus aún no está indexado. Indexa para habilitar RAG sobre ensayos, protocolos, escalas y revisiones."}
            </p>
          </div>
        </div>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="gap-2"
          variant={isIndexed ? "outline" : "default"}
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Database className="h-4 w-4" />
          )}
          {mutation.isPending ? "Indexando…" : isIndexed ? "Reindexar ahora" : "Indexar evidencia"}
        </Button>
      </div>

      {r ? (
        <div className="rounded-md border border-border bg-surface-muted/40 p-3 space-y-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium ${r.ok ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}`}
            >
              {r.ok ? "OK" : "Con avisos"}
            </span>
            <span className="text-muted-foreground">
              Último informe: {new Date(r.generated_at).toLocaleString()}
            </span>
            <span className="text-muted-foreground">·</span>
            <span>{r.sources_inserted} fuentes</span>
            <span className="text-muted-foreground">·</span>
            <span>{r.chunks_inserted} chunks</span>
            <span className="text-muted-foreground">·</span>
            <span>dim {r.embedding_dims ?? "?"}</span>
          </div>
          {r.issues.length > 0 && (
            <ul className="space-y-1">
              {r.issues.slice(0, 6).map((i, idx) => (
                <li
                  key={idx}
                  className={
                    i.severity === "error"
                      ? "text-destructive"
                      : "text-amber-700 dark:text-amber-400"
                  }
                >
                  <span className="font-mono text-[10px] uppercase mr-1">{i.severity}</span>
                  {i.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </Card>
  );
}

function LivePendingPanel() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPendingEditorial);
  const setFn = useServerFn(setEditorialStatus);

  const q = useQuery({ queryKey: ["editorial-pending"], queryFn: () => listFn() });
  const mutation = useMutation({
    mutationFn: (v: { table: any; id: string; status: any }) => setFn({ data: v }),
    onSuccess: (_, v) => {
      toast.success(`Marcado como ${v.status}`);
      qc.invalidateQueries({ queryKey: ["editorial-pending"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = q.data ?? [];

  return (
    <Card className="border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-medium text-foreground">Cola editorial real (oph_*)</p>
          <p className="text-xs text-muted-foreground">
            {q.isLoading
              ? "Cargando…"
              : `${items.length} elementos en draft/pending_review/needs_update`}
          </p>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay contenido pendiente. Todo el corpus está aprobado.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.slice(0, 25).map((it) => (
            <li
              key={`${it.table}:${it.id}`}
              className="py-2 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{it.title}</p>
                <p className="text-xs text-muted-foreground">
                  {it.table.replace("oph_", "")} · {it.subspecialty ?? "—"} · {it.status}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button
                  size="sm"
                  onClick={() =>
                    mutation.mutate({ table: it.table, id: it.id, status: "approved" })
                  }
                  disabled={mutation.isPending}
                >
                  Aprobar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    mutation.mutate({ table: it.table, id: it.id, status: "needs_update" })
                  }
                  disabled={mutation.isPending}
                >
                  Cambios
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    mutation.mutate({ table: it.table, id: it.id, status: "rejected" })
                  }
                  disabled={mutation.isPending}
                >
                  Rechazar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const RATING_LABEL: Record<string, string> = {
  not_useful: "No útil",
  needs_kol: "Requiere KOL",
  incomplete: "Incompleta",
  error: "Error",
};

function FlaggedAnswersPanel() {
  const listFn = useServerFn(listFlaggedAIAnswers);
  const q = useQuery({ queryKey: ["flagged-ai-answers"], queryFn: () => listFn() });

  // Non-editorial roles get a Forbidden error from the server fn — hide silently.
  if (q.isError) return null;
  const items = q.data ?? [];

  return (
    <Card className="border-border bg-surface p-5">
      <div className="mb-3">
        <p className="font-medium text-foreground">Respuestas marcadas por feedback</p>
        <p className="text-xs text-muted-foreground">
          {q.isLoading
            ? "Cargando…"
            : `${items.length} respuestas con valoración negativa de usuarios`}
        </p>
      </div>
      {!q.isLoading && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin respuestas marcadas. Buen indicador de calidad.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.slice(0, 25).map((it) => (
            <li key={`${it.interaction_id}:${it.feedback_at}`} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-destructive">
                  {RATING_LABEL[it.rating] ?? it.rating}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {it.mode} · {it.subspecialty ?? "—"} · {it.language}
                </span>
              </div>
              <p className="mt-1 text-sm text-foreground">{it.query_excerpt}</p>
              {it.comment ? (
                <p className="mt-1 text-xs italic text-muted-foreground">“{it.comment}”</p>
              ) : null}
              {it.safety_flags.length ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {it.safety_flags.map((f) => (
                    <SafetyBadge key={f} flag={f as SafetyFlag} />
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
