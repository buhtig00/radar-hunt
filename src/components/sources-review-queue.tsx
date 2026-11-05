import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  approveAndActivateSource,
  listKnowledgeSources,
  logSourceDecision,
  type KnowledgeSourceItem,
} from "@/lib/sources.functions";
import { CheckCircle2, ShieldCheck, XCircle, Loader2, Inbox } from "lucide-react";

const SOURCE_TYPE_OPTIONS = [
  { value: "all", label: "Todos los tipos" },
  { value: "protocol", label: "Protocolo" },
  { value: "case", label: "Caso educativo" },
  { value: "guideline", label: "Guía" },
  { value: "trial", label: "Ensayo" },
  { value: "review", label: "Revisión" },
  { value: "scale", label: "Escala" },
] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  { value: "pending_review", label: "Pendiente de revisión" },
  { value: "Approved", label: "Aprobado" },
  { value: "Rejected", label: "Rechazado" },
] as const;

const SUBSPECIALTY_OPTIONS = [
  { value: "all", label: "Todas las especialidades" },
  { value: "retina", label: "Retina" },
  { value: "glaucoma", label: "Glaucoma" },
  { value: "uveitis", label: "Uveítis" },
  { value: "refractive", label: "Refractiva" },
  { value: "cornea", label: "Córnea" },
  { value: "cataract", label: "Catarata" },
  { value: "oculoplastics", label: "Oculoplástica" },
  { value: "neuro_ophthalmology", label: "Neuro-oftalmología" },
] as const;

const URGENCY_OPTIONS = [
  { value: "all", label: "Cualquier urgencia" },
  { value: "emergency", label: "Solo emergencias" },
] as const;

function statusTone(status: string) {
  if (status === "Approved") return "bg-success/10 text-[color:var(--success)] border-success/30";
  if (status === "Rejected") return "bg-destructive/10 text-destructive border-destructive/30";
  if (status === "pending_review" || status === "Pending Review")
    return "bg-warning/10 text-[color:var(--warning)] border-warning/30";
  return "bg-muted text-muted-foreground border-border";
}

export function SourcesReviewQueue() {
  const qc = useQueryClient();
  const listFn = useServerFn(listKnowledgeSources);
  const approveFn = useServerFn(approveAndActivateSource);
  const rejectFn = useServerFn(logSourceDecision);

  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("pending_review");
  const [subspecialty, setSubspecialty] = useState<string>("all");
  const [urgency, setUrgency] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [search, setSearch] = useState("");

  const [target, setTarget] = useState<KnowledgeSourceItem | null>(null);
  const [comment, setComment] = useState("");

  const q = useQuery({
    queryKey: ["ai-sources", type, status, subspecialty, urgency, dateFrom, dateTo, search],
    queryFn: () =>
      listFn({
        data: {
          source_type: type === "all" ? undefined : type,
          approval_status: status === "all" ? undefined : (status as any),
          subspecialty: subspecialty === "all" ? undefined : subspecialty,
          urgency: urgency === "all" ? undefined : (urgency as "emergency"),
          date_from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
          date_to: dateTo ? new Date(dateTo + "T23:59:59").toISOString() : undefined,
          search: search.trim() || undefined,
          limit: 100,
        },
      }),
  });

  const approve = useMutation({
    mutationFn: (v: { source_id: string; comment?: string }) => approveFn({ data: v }),
    onSuccess: () => {
      toast.success("Fuente aprobada y activada — fragmentos visibles para RAG");
      qc.invalidateQueries({ queryKey: ["ai-sources"] });
      qc.invalidateQueries({ queryKey: ["source-audit"] });
      setTarget(null);
      setComment("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: (v: { source_id: string; comment?: string }) =>
      rejectFn({ data: { ...v, decision: "reject", new_status: "Rejected", new_active: false } }),
    onSuccess: () => {
      toast.success("Fuente rechazada");
      qc.invalidateQueries({ queryKey: ["ai-sources"] });
      qc.invalidateQueries({ queryKey: ["source-audit"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = q.data ?? [];

  return (
    <>
      <Card className="border-border bg-surface p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-medium text-foreground">Fuentes importadas (ai_knowledge_sources)</p>
            <p className="text-xs text-muted-foreground">
              {q.isLoading ? "Cargando…" : `${items.length} fuentes con los filtros actuales`}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Tipo
              </Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Estado
              </Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 w-48 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Especialidad
              </Label>
              <Select value={subspecialty} onValueChange={setSubspecialty}>
                <SelectTrigger className="h-8 w-48 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBSPECIALTY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Urgencia
              </Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {URGENCY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Desde
              </Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 w-36 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Hasta
              </Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8 w-36 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Buscar
              </Label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Título…"
                className="h-8 w-52 text-xs"
              />
            </div>
            {(subspecialty !== "all" ||
              urgency !== "all" ||
              dateFrom ||
              dateTo ||
              search ||
              type !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 self-end text-xs"
                onClick={() => {
                  setType("all");
                  setSubspecialty("all");
                  setUrgency("all");
                  setDateFrom("");
                  setDateTo("");
                  setSearch("");
                }}
              >
                Limpiar
              </Button>
            )}
          </div>
        </div>

        {q.isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <Inbox className="h-6 w-6" />
            <p className="text-sm">No hay fuentes con esos filtros.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Subesp.</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Activa</TableHead>
                  <TableHead>Importada</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="max-w-[340px]">
                      <p className="truncate font-medium text-foreground">{s.title}</p>
                      {s.description && (
                        <p className="truncate text-xs text-muted-foreground">{s.description}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{s.source_type}</TableCell>
                    <TableCell className="text-xs">{s.subspecialty}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium ${statusTone(
                          s.approval_status,
                        )}`}
                      >
                        {s.approval_status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {s.is_active ? (
                        <Badge
                          variant="outline"
                          className="border-success/40 text-[color:var(--success)]"
                        >
                          activa
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          inactiva
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => {
                            setTarget(s);
                            setComment("");
                          }}
                          disabled={s.approval_status === "Approved" && s.is_active}
                          className="gap-1.5"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Aprobar y activar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            reject.mutate({ source_id: s.id, comment: "Rechazada desde la cola" })
                          }
                          disabled={reject.isPending}
                          title="Rechazar"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <AlertDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[color:var(--gold)]" />
              Aprobar y activar fuente
            </AlertDialogTitle>
            <AlertDialogDescription>
              Marcará <span className="font-medium text-foreground">{target?.title}</span> como
              <span className="font-medium"> Approved </span> e{" "}
              <span className="font-medium">is_active=true</span> en{" "}
              <code>ai_knowledge_sources</code> y propagará la activación a sus fragmentos en{" "}
              <code>ai_chunks</code>. Quedará registrado en el historial de auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Comentario del revisor (opcional)
            </Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Motivo de la aprobación, fuentes consultadas, advertencias…"
              className="min-h-[90px]"
              maxLength={1000}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approve.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={approve.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (!target) return;
                approve.mutate({ source_id: target.id, comment: comment.trim() || undefined });
              }}
            >
              {approve.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
              )}
              Confirmar aprobación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
