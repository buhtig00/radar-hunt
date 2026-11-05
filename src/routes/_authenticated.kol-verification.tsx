import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PageHeader } from "@/components/page-header";
import { ValidationBadge } from "@/components/badges";
import { DisclaimerBox } from "@/components/disclaimers";
import { KOL_QUEUE } from "@/lib/mock-data";
import type { KOLQueueItem } from "@/lib/types";
import { ShieldCheck, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { tr } from "@/lib/i18n";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listKolQueue, markKolVerified } from "@/lib/kol.functions";
import { RoleBootstrapCard } from "@/components/role-bootstrap-card";
import { SourceAuditHistory } from "@/components/source-audit-history";

export const Route = createFileRoute("/_authenticated/kol-verification")({
  head: () => ({
    meta: [
      { title: "Verificación KOL · Ophthalmology Radar" },
      {
        name: "description",
        content:
          "Espacio de trabajo de los líderes de opinión (KOL) para validar respuestas de IA y protocolos de la Capa de Inteligencia de OR.",
      },
      { property: "og:title", content: "Verificación KOL" },
      {
        property: "og:description",
        content: "Capa de validación experta para las respuestas y protocolos de la IA de OR.",
      },
    ],
  }),
  component: KOLPage,
});

const STATUS_LABEL: Record<KOLQueueItem["status"], string> = {
  "Awaiting review": "Pendiente de revisión",
  "Approved as KOL Verified": "Aprobado como Verificado por KOL",
  "Changes requested": "Cambios solicitados",
  Rejected: "Rechazado",
  "Needs update": "Requiere actualización",
};

function KOLPage() {
  const [items, setItems] = useState(KOL_QUEUE);
  const [selected, setSelected] = useState<KOLQueueItem | null>(null);
  const [decision, setDecision] = useState<string>("approve");
  const [comment, setComment] = useState("");

  const submit = () => {
    if (!selected) return;
    const statusMap: Record<string, KOLQueueItem["status"]> = {
      approve: "Approved as KOL Verified",
      changes: "Changes requested",
      reject: "Rejected",
      update: "Needs update",
    };
    setItems((arr) =>
      arr.map((i) => (i.id === selected.id ? { ...i, status: statusMap[decision] } : i)),
    );
    toast.success(`${tr("toast.kol.saved")}: ${STATUS_LABEL[statusMap[decision]]}`);
    setSelected(null);
    setComment("");
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        eyebrow="Verificación KOL"
        title="Validación por líderes de opinión clínica"
        description="Los elementos aprobados reciben el sello Verificado por KOL con nombre del validador, subespecialidad y próxima fecha de revisión — haciendo visible el conocimiento validado por expertos en toda la plataforma."
      />

      <RoleBootstrapCard />
      <LiveKolPanel />
      <SourceAuditHistory />

      <Card className="relative overflow-hidden border-gold/30 bg-gradient-to-br from-gold/10 via-surface to-surface p-5 shadow-[var(--shadow-card)]">
        <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-gradient-gold" />
        <div className="flex flex-wrap items-center justify-between gap-4 pl-3">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-gold text-[color:var(--gold-foreground)] shadow-[inset_0_1px_0_0_oklch(1_0_0_/_0.5)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--gold)]">
                Sello Verificado por KOL
              </p>
              <h3 className="font-serif text-lg font-semibold text-foreground">
                Respuestas validadas por expertos, con trazabilidad completa
              </h3>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Cada aprobación se firma con el nombre del KOL, su subespecialidad y las fechas de
                validez y próxima revisión.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <Stat
              label="En cola"
              value={items.filter((i) => i.status === "Awaiting review").length.toString()}
            />
            <Stat
              label="Verificadas"
              value={items.filter((i) => i.status === "Approved as KOL Verified").length.toString()}
            />
            <Stat
              label="Subespecialidades"
              value={new Set(items.map((i) => i.subspecialty)).size.toString()}
            />
          </div>
        </div>
      </Card>

      <Card className="border-border bg-surface shadow-[var(--shadow-card)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pregunta / Protocolo</TableHead>
              <TableHead>Subespecialidad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>KOL asignado</TableHead>
              <TableHead>Fecha de asignación</TableHead>
              <TableHead>Próxima revisión</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((i) => (
              <TableRow key={i.id} className="cursor-pointer" onClick={() => setSelected(i)}>
                <TableCell className="max-w-[360px]">
                  <p className="font-medium text-foreground">{i.question}</p>
                  {i.status === "Approved as KOL Verified" && (
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <ValidationBadge level="KOL Verified" />
                      <span>
                        {i.assigned_kol} · {i.subspecialty} · Válido hasta {i.next_review_date}
                      </span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm">{i.subspecialty}</TableCell>
                <TableCell className="text-sm">{STATUS_LABEL[i.status]}</TableCell>
                <TableCell className="text-sm">{i.assigned_kol}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{i.date_assigned}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {i.next_review_date}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline">
                    Revisar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[color:var(--gold)]" /> Revisión KOL
                </SheetTitle>
                <SheetDescription>
                  {selected.subspecialty} · Asignado a {selected.assigned_kol}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-5 space-y-4">
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Pregunta original
                  </Label>
                  <p className="mt-1 text-sm text-foreground">{selected.question}</p>
                </div>

                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Respuesta generada por IA
                  </Label>
                  <p className="mt-1 rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground">
                    {selected.ai_answer}
                  </p>
                </div>

                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Fuentes utilizadas
                  </Label>
                  {selected.sources_used.length ? (
                    <ul className="mt-1 space-y-1.5">
                      {selected.sources_used.map((s) => (
                        <li key={s.id} className="flex items-start gap-2 text-sm">
                          <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                          <span>
                            {s.title}{" "}
                            <span className="text-xs text-muted-foreground">
                              · {s.type}
                              {s.year ? ` · ${s.year}` : ""}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">Aún no hay fuentes.</p>
                  )}
                </div>

                {selected.editor_notes && (
                  <div>
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Notas del editor
                    </Label>
                    <p className="mt-1 text-sm text-muted-foreground">{selected.editor_notes}</p>
                  </div>
                )}

                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Comentario del KOL
                  </Label>
                  <Textarea
                    className="mt-1 min-h-[100px]"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Añade tu comentario de validación, referencias o ediciones requeridas."
                  />
                </div>

                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Decisión
                  </Label>
                  <RadioGroup
                    value={decision}
                    onValueChange={setDecision}
                    className="mt-2 grid gap-2"
                  >
                    {[
                      { v: "approve", l: "Aprobar como Verificado por KOL" },
                      { v: "changes", l: "Solicitar cambios" },
                      { v: "reject", l: "Rechazar" },
                      { v: "update", l: "Marcar como requiere actualización" },
                    ].map((o) => (
                      <label
                        key={o.v}
                        className="flex items-center gap-2 rounded-md border border-border bg-surface p-2.5 text-sm"
                      >
                        <RadioGroupItem value={o.v} id={o.v} />
                        {o.l}
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                <DisclaimerBox />

                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setSelected(null)}>
                    Cancelar
                  </Button>
                  <Button onClick={submit}>Guardar decisión</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface/60 px-3 py-2">
      <div className="font-serif text-xl font-semibold text-foreground tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function LiveKolPanel() {
  const qc = useQueryClient();
  const listFn = useServerFn(listKolQueue);
  const markFn = useServerFn(markKolVerified);

  const q = useQuery({
    queryKey: ["kol-pending"],
    queryFn: () => listFn({ data: { scope: "pending", limit: 50 } }),
  });
  const mutation = useMutation({
    mutationFn: (v: { table: any; id: string }) => markFn({ data: v }),
    onSuccess: () => {
      toast.success("Marcado como Verificado por KOL");
      qc.invalidateQueries({ queryKey: ["kol-pending"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = q.data ?? [];
  return (
    <Card className="border-border bg-surface p-5">
      <div className="mb-3">
        <p className="font-medium text-foreground">Cola KOL real (oph_*)</p>
        <p className="text-xs text-muted-foreground">
          {q.isLoading ? "Cargando…" : `${items.length} elementos aprobados sin validador KOL`}
        </p>
      </div>
      {q.isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay elementos pendientes de validación KOL.
        </p>
      ) : (
        <ul className="divide-y divide-border max-h-[420px] overflow-auto">
          {items.slice(0, 50).map((it) => (
            <li
              key={`${it.table}:${it.id}`}
              className="py-2 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{it.title}</p>
                <p className="text-xs text-muted-foreground">
                  {it.table.replace("oph_", "")} · {it.subspecialty ?? "—"}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => mutation.mutate({ table: it.table, id: it.id })}
                disabled={mutation.isPending}
                className="shrink-0 gap-1.5"
              >
                <ShieldCheck className="h-4 w-4" /> Verificar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
