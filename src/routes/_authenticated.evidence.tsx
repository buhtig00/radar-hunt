import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { DisclaimerBox } from "@/components/disclaimers";
import {
  LANDMARK_TRIALS,
  CLINICAL_SCALES,
  SYSTEMATIC_REVIEWS,
  IV_DOSING_TABLE,
  EVIDENCE_SOURCES,
  type LandmarkTrial,
  type ClinicalProtocol,
} from "@/lib/ophthalmology-evidence";
import { useClinicalProtocols, useRichMedications } from "@/hooks/use-atlas-data";
import { SUBSPECIALTIES } from "@/lib/types";
import {
  MEDICATION_FAMILIES,
  MEDICATION_CLASS_LABEL_ES,
  ROUTE_LABEL_ES,
  familyForClass,
  prettyLineOfTherapy,
  prettyEvidenceLevel,
} from "@/lib/medication-families";
import {
  Search,
  FlaskConical,
  ClipboardList,
  Ruler,
  BookOpen,
  Syringe,
  Library,
  GitCompare,
  X,
  Database,
  Pill,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/evidence")({
  head: () => ({
    meta: [
      { title: "Evidencia clínica · Ophthalmology Radar" },
      {
        name: "description",
        content:
          "Biblioteca de ensayos pivotales, protocolos, escalas, revisiones sistemáticas y posología intravítrea en oftalmología.",
      },
    ],
  }),
  component: EvidencePage,
});

function EvidencePage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        eyebrow="Evidencia"
        title="Biblioteca de evidencia clínica"
        description="Ensayos pivotales, protocolos, escalas, revisiones Cochrane/NICE y posología intravítrea de referencia. Datos resumidos con fines educativos: verificar siempre con la fuente original antes de uso clínico."
      />
      <DisclaimerBox context="catalog" />

      <Tabs defaultValue="trials" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-7">
          <TabsTrigger value="trials" className="gap-2">
            <FlaskConical className="h-3.5 w-3.5" />
            Ensayos
          </TabsTrigger>
          <TabsTrigger value="protocols" className="gap-2">
            <ClipboardList className="h-3.5 w-3.5" />
            Protocolos
          </TabsTrigger>
          <TabsTrigger value="drugs" className="gap-2">
            <Pill className="h-3.5 w-3.5" />
            Fármacos
          </TabsTrigger>
          <TabsTrigger value="scales" className="gap-2">
            <Ruler className="h-3.5 w-3.5" />
            Escalas
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-2">
            <BookOpen className="h-3.5 w-3.5" />
            Revisiones
          </TabsTrigger>
          <TabsTrigger value="dosing" className="gap-2">
            <Syringe className="h-3.5 w-3.5" />
            Posología IV
          </TabsTrigger>
          <TabsTrigger value="sources" className="gap-2">
            <Library className="h-3.5 w-3.5" />
            Fuentes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trials" className="mt-4">
          <TrialsTab />
        </TabsContent>
        <TabsContent value="protocols" className="mt-4">
          <ProtocolsTab />
        </TabsContent>
        <TabsContent value="drugs" className="mt-4">
          <DrugsByFamilyTab />
        </TabsContent>
        <TabsContent value="scales" className="mt-4">
          <ScalesTab />
        </TabsContent>
        <TabsContent value="reviews" className="mt-4">
          <ReviewsTab />
        </TabsContent>
        <TabsContent value="dosing" className="mt-4">
          <DosingTab />
        </TabsContent>
        <TabsContent value="sources" className="mt-4">
          <SourcesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function useCompareSelection<T extends { id: string }>(max = 3) {
  const [ids, setIds] = useState<string[]>([]);
  const toggle = (id: string) =>
    setIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= max ? prev : [...prev, id],
    );
  const clear = () => setIds([]);
  const isSelected = (id: string) => ids.includes(id);
  const canAddMore = ids.length < max;
  const pick = (items: T[]) => ids.map((id) => items.find((x) => x.id === id)!).filter(Boolean);
  return { ids, toggle, clear, isSelected, canAddMore, pick };
}

function TrialsTab() {
  const [q, setQ] = useState("");
  const [sub, setSub] = useState<string>("all");
  const [openCompare, setOpenCompare] = useState(false);
  const sel = useCompareSelection<LandmarkTrial>(3);

  const filtered = useMemo(
    () =>
      LANDMARK_TRIALS.filter((t) => {
        if (sub !== "all" && t.subspecialty !== sub) return false;
        if (!q) return true;
        const s = q.toLowerCase();
        return (
          t.acronym.toLowerCase().includes(s) ||
          t.full_name.toLowerCase().includes(s) ||
          t.topic.toLowerCase().includes(s)
        );
      }),
    [q, sub],
  );
  const selected = sel.pick(LANDMARK_TRIALS);

  return (
    <div className="flex flex-col gap-4">
      <Filters
        q={q}
        setQ={setQ}
        sub={sub}
        setSub={setSub}
        placeholder="Buscar acrónimo, fármaco, tema…"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{filtered.length} ensayo(s) · selecciona hasta 3 para comparar</span>
        <span className="text-foreground/80">{sel.ids.length}/3 seleccionados</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((t) => {
          const { intervention, comparator } = splitIntervention(t.intervention);
          const checked = sel.isSelected(t.id);
          return (
            <Card
              key={t.id}
              className={`flex flex-col border-border bg-surface p-5 shadow-[var(--shadow-card)] transition-colors ${checked ? "ring-2 ring-primary/60" : ""}`}
            >
              <header className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3">
                <div className="flex min-w-0 items-start gap-2">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => sel.toggle(t.id)}
                    disabled={!checked && !sel.canAddMore}
                    aria-label={`Seleccionar ${t.acronym} para comparar`}
                    className="mt-1"
                  />
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-base font-semibold text-foreground">{t.acronym}</h3>
                      <span className="text-xs font-medium text-muted-foreground">· {t.year}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t.full_name}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">
                    {t.subspecialty}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {t.topic}
                  </Badge>
                </div>
              </header>

              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <KV k="Diseño" v={t.design} />
                <KV k="Año" v={String(t.year)} />
                <KV k="Población (P)" v={t.population} />
                <KV k="Intervención (I)" v={intervention} />
                <KV k="Comparador (C)" v={comparator ?? "Brazo único / no aplicable"} />
                <div className="sm:col-span-2">
                  <KV k="Endpoint primario (O)" v={t.primary_endpoint} />
                </div>
                {t.sponsor && <KV k="Promotor" v={t.sponsor} />}
              </dl>

              <div className="mt-4 rounded-md border border-border/60 bg-muted/30 p-3">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Resultados clave
                </h4>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-foreground/90">
                  {t.key_results.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-3">
                <KV k="Impacto clínico" v={t.clinical_impact} />
              </div>

              <footer className="mt-auto border-t border-border pt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                {t.reference}
              </footer>
            </Card>
          );
        })}
      </div>

      <CompareBar
        count={sel.ids.length}
        onCompare={() => setOpenCompare(true)}
        onClear={sel.clear}
      />
      <Dialog open={openCompare} onOpenChange={setOpenCompare}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Comparar ensayos ({selected.length})</DialogTitle>
            <DialogDescription>
              Comparación lado a lado de población, intervención, comparador, endpoint y resultados
              clave.
            </DialogDescription>
          </DialogHeader>
          <CompareTable
            columns={selected.map((t) => {
              const { intervention, comparator } = splitIntervention(t.intervention);
              return {
                id: t.id,
                title: `${t.acronym} · ${t.year}`,
                subtitle: t.full_name,
                badges: [t.subspecialty, t.topic],
                rows: [
                  ["Diseño", t.design],
                  ["Población", t.population],
                  ["Intervención", intervention],
                  ["Comparador", comparator ?? "Brazo único / no aplicable"],
                  ["Endpoint primario", t.primary_endpoint],
                ],
                results: t.key_results,
                impact: t.clinical_impact,
                footer: t.reference,
              };
            })}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function splitIntervention(raw: string): { intervention: string; comparator: string | null } {
  const re = /\s+vs\.?\s+/i;
  if (re.test(raw)) {
    const parts = raw.split(re);
    return { intervention: parts[0].trim(), comparator: parts.slice(1).join(" vs ").trim() };
  }
  return { intervention: raw, comparator: null };
}

function ProtocolsTab() {
  const [openCompare, setOpenCompare] = useState(false);
  const { items: protocols, dbCount } = useClinicalProtocols();
  const sel = useCompareSelection<ClinicalProtocol>(3);
  const selected = sel.pick(protocols);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{protocols.length} protocolo(s) · selecciona hasta 3 para comparar</span>
        <div className="flex items-center gap-2">
          {dbCount > 0 && (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Database className="h-3 w-3" />
              {dbCount} desde la base de conocimiento
            </Badge>
          )}
          <span className="text-foreground/80">{sel.ids.length}/3 seleccionados</span>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {protocols.map((p) => {
          const checked = sel.isSelected(p.id);
          return (
            <Card
              key={p.id}
              className={`flex flex-col border-border bg-surface p-5 shadow-[var(--shadow-card)] transition-colors ${checked ? "ring-2 ring-primary/60" : ""}`}
            >
              <header className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3">
                <div className="flex min-w-0 items-start gap-2">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => sel.toggle(p.id)}
                    disabled={!checked && !sel.canAddMore}
                    aria-label={`Seleccionar ${p.title} para comparar`}
                    className="mt-0.5"
                  />
                  <h3 className="text-sm font-semibold text-foreground">{p.title}</h3>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {p.subspecialty}
                </Badge>
              </header>
              <div className="mt-3">
                <KV k="Población / contexto" v={p.context} />
              </div>
              <Block title="Pasos" items={p.steps} ordered />
              <Block title="Monitorización" items={p.monitoring} />
              <Block title="Errores frecuentes" items={p.pitfalls} tone="danger" />
              <footer className="mt-auto border-t border-border pt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                {p.source}
              </footer>
            </Card>
          );
        })}
      </div>

      <CompareBar
        count={sel.ids.length}
        onCompare={() => setOpenCompare(true)}
        onClear={sel.clear}
      />
      <Dialog open={openCompare} onOpenChange={setOpenCompare}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Comparar protocolos ({selected.length})</DialogTitle>
            <DialogDescription>
              Comparación lado a lado de contexto, pasos, monitorización y errores frecuentes.
            </DialogDescription>
          </DialogHeader>
          <CompareTable
            columns={selected.map((p) => ({
              id: p.id,
              title: p.title,
              subtitle: p.subspecialty,
              badges: [p.subspecialty],
              rows: [["Población / contexto", p.context]],
              lists: [
                { label: "Pasos", items: p.steps, ordered: true },
                { label: "Monitorización", items: p.monitoring },
                { label: "Errores frecuentes", items: p.pitfalls, tone: "danger" as const },
              ],
              footer: p.source,
            }))}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CompareColumn {
  id: string;
  title: string;
  subtitle?: string;
  badges?: string[];
  rows: [string, string][];
  results?: string[];
  impact?: string;
  lists?: { label: string; items: string[]; ordered?: boolean; tone?: "danger" }[];
  footer?: string;
}

function CompareTable({ columns }: { columns: CompareColumn[] }) {
  if (columns.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Selecciona al menos 2 elementos para comparar.
      </p>
    );
  }
  const allLabels = Array.from(new Set(columns.flatMap((c) => c.rows.map(([k]) => k))));
  const allListLabels = Array.from(
    new Set(columns.flatMap((c) => (c.lists ?? []).map((l) => l.label))),
  );
  return (
    <div className="max-h-[70vh] overflow-auto">
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
      >
        {columns.map((c) => (
          <div key={c.id} className="rounded-md border border-border bg-surface p-3">
            <h4 className="text-sm font-semibold text-foreground">{c.title}</h4>
            {c.subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{c.subtitle}</p>}
            {c.badges && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {c.badges.map((b, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">
                    {b}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
        {allLabels.map((label) => (
          <FieldRow key={label} label={label} columns={columns} />
        ))}
        {columns.some((c) => c.results?.length) && (
          <ListRow label="Resultados clave" columns={columns} getItems={(c) => c.results ?? []} />
        )}
        {columns.some((c) => c.impact) && (
          <FieldRow label="Impacto clínico" columns={columns} accessor={(c) => c.impact ?? "—"} />
        )}
        {allListLabels.map((label) => (
          <ListRow
            key={label}
            label={label}
            columns={columns}
            getItems={(c) => c.lists?.find((l) => l.label === label)?.items ?? []}
            ordered={columns.some((c) => c.lists?.find((l) => l.label === label)?.ordered)}
            tone={
              columns
                .find((c) => c.lists?.find((l) => l.label === label)?.tone)
                ?.lists?.find((l) => l.label === label)?.tone
            }
          />
        ))}
        {columns.some((c) => c.footer) && (
          <FieldRow
            label="Referencia / fuente"
            columns={columns}
            accessor={(c) => c.footer ?? "—"}
          />
        )}
      </div>
    </div>
  );
}

function FieldRow({
  label,
  columns,
  accessor,
}: {
  label: string;
  columns: CompareColumn[];
  accessor?: (c: CompareColumn) => string;
}) {
  return (
    <>
      {columns.map((c) => {
        const value = accessor ? accessor(c) : (c.rows.find(([k]) => k === label)?.[1] ?? "—");
        return (
          <div key={c.id + label} className="rounded-md border border-border/60 bg-muted/20 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-xs text-foreground/90">{value}</p>
          </div>
        );
      })}
    </>
  );
}

function ListRow({
  label,
  columns,
  getItems,
  ordered,
  tone,
}: {
  label: string;
  columns: CompareColumn[];
  getItems: (c: CompareColumn) => string[];
  ordered?: boolean;
  tone?: "danger";
}) {
  const ListTag = ordered ? "ol" : "ul";
  return (
    <>
      {columns.map((c) => {
        const items = getItems(c);
        return (
          <div key={c.id + label} className="rounded-md border border-border/60 bg-muted/20 p-3">
            <p
              className={`text-[10px] font-semibold uppercase tracking-wide ${tone === "danger" ? "text-[color:var(--destructive)]" : "text-muted-foreground"}`}
            >
              {label}
            </p>
            {items.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">—</p>
            ) : (
              <ListTag
                className={`mt-1.5 ${ordered ? "list-decimal" : "list-disc"} space-y-1 pl-4 text-xs text-foreground/90`}
              >
                {items.map((it, i) => (
                  <li key={i}>{it}</li>
                ))}
              </ListTag>
            )}
          </div>
        );
      })}
    </>
  );
}

function CompareBar({
  count,
  onCompare,
  onClear,
}: {
  count: number;
  onCompare: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="sticky bottom-4 z-30 mx-auto flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 shadow-[var(--shadow-card)]">
      <span className="text-xs font-medium text-foreground">
        {count} seleccionado{count > 1 ? "s" : ""}
      </span>
      <Button size="sm" onClick={onCompare} disabled={count < 2} className="gap-1.5">
        <GitCompare className="h-3.5 w-3.5" /> Comparar
      </Button>
      <Button size="sm" variant="ghost" onClick={onClear} className="gap-1.5">
        <X className="h-3.5 w-3.5" /> Limpiar
      </Button>
    </div>
  );
}

function ScalesTab() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {CLINICAL_SCALES.map((s) => (
        <Card key={s.id} className="border-border bg-surface p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">{s.name}</h3>
            <Badge variant="outline" className="text-[10px]">
              {s.subspecialty}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{s.purpose}</p>
          <div className="mt-3 space-y-1.5 text-xs">
            {s.items.map((it) => (
              <div key={it.code} className="flex gap-2">
                <span className="min-w-[80px] font-medium text-foreground">{it.code}</span>
                <span className="text-muted-foreground">{it.description}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] uppercase tracking-wide text-muted-foreground">
            {s.source}
          </p>
        </Card>
      ))}
    </div>
  );
}

function ReviewsTab() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {SYSTEMATIC_REVIEWS.map((r) => (
        <Card key={r.id} className="border-border bg-surface p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">{r.title}</h3>
            <Badge variant="outline" className="text-[10px]">
              {r.subspecialty}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {r.source} · {r.year}
          </p>
          <p className="mt-3 text-xs text-foreground/90">{r.conclusion}</p>
        </Card>
      ))}
    </div>
  );
}

function DosingTab() {
  return (
    <Card className="border-border bg-surface p-0 shadow-[var(--shadow-card)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2 font-semibold">Fármaco</th>
              <th className="px-3 py-2 font-semibold">Indicación</th>
              <th className="px-3 py-2 font-semibold">Dosis</th>
              <th className="px-3 py-2 font-semibold">Pauta</th>
              <th className="px-3 py-2 font-semibold">Notas</th>
              <th className="px-3 py-2 font-semibold">Fuente</th>
            </tr>
          </thead>
          <tbody>
            {IV_DOSING_TABLE.map((d) => (
              <tr key={d.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium text-foreground">{d.drug}</td>
                <td className="px-3 py-2 text-muted-foreground">{d.indication}</td>
                <td className="px-3 py-2">{d.dose}</td>
                <td className="px-3 py-2">{d.schedule}</td>
                <td className="px-3 py-2 text-muted-foreground">{d.notes}</td>
                <td className="px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {d.source}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SourcesTab() {
  return (
    <Card className="border-border bg-surface p-4 shadow-[var(--shadow-card)]">
      <h3 className="text-sm font-semibold text-foreground">Plataformas y fuentes de referencia</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Toda la evidencia mostrada se resume a partir de las siguientes fuentes públicas y
        contrastadas. En producción cada chunk se vinculará a su fuente y se versionará con revisión
        editorial/KOL.
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-foreground/90">
        {EVIDENCE_SOURCES.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </Card>
  );
}

/* helpers */
function Filters({
  q,
  setQ,
  sub,
  setSub,
  placeholder,
}: {
  q: string;
  setQ: (v: string) => void;
  sub: string;
  setSub: (v: string) => void;
  placeholder: string;
}) {
  return (
    <Card className="border-border bg-surface p-3 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder}
            className="pl-9"
          />
        </div>
        <Select value={sub} onValueChange={setSub}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las subespecialidades</SelectItem>
            {SUBSPECIALTIES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}

function Block({
  title,
  items,
  ordered,
  tone,
}: {
  title: string;
  items: string[];
  ordered?: boolean;
  tone?: "danger";
}) {
  if (!items?.length) return null;
  const ListTag = ordered ? "ol" : "ul";
  return (
    <div className="mt-3">
      <h4
        className={`text-[11px] font-semibold uppercase tracking-wide ${tone === "danger" ? "text-[color:var(--destructive)]" : "text-muted-foreground"}`}
      >
        {title}
      </h4>
      <ListTag
        className={`mt-1.5 ${ordered ? "list-decimal" : "list-disc"} space-y-1 pl-4 text-xs text-foreground/90`}
      >
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ListTag>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {k}
      </span>
      <p className="text-xs text-foreground/90">{v}</p>
    </div>
  );
}

/* ============================================================
 *               FÁRMACOS por familia + indicaciones
 * ============================================================ */
function DrugsByFamilyTab() {
  const { items, dbCount, isLoading } = useRichMedications();
  const [family, setFamily] = useState<string>("all");
  const [klass, setKlass] = useState<string>("all");
  const [pathology, setPathology] = useState<string>("all");
  const [q, setQ] = useState("");

  // Reset subclase cuando cambia familia
  const familyDef = useMemo(() => MEDICATION_FAMILIES.find((f) => f.id === family), [family]);

  // Lista de patologías presentes en las indicaciones (para el selector)
  const pathologyOptions = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((m) =>
      m.indications.forEach((i) => {
        if (i.pathology_id && i.pathology_name) {
          map.set(i.pathology_id, i.pathology_name);
        }
      }),
    );
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [items]);

  // Conteo de fármacos por familia (para badges del selector)
  const familyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((m) => {
      const f = familyForClass(m.medication_class);
      if (f) counts.set(f.id, (counts.get(f.id) ?? 0) + 1);
    });
    return counts;
  }, [items]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items
      .filter((m) => {
        // Familia
        if (family !== "all") {
          const f = familyForClass(m.medication_class);
          if (!f || f.id !== family) return false;
        }
        // Subclase
        if (klass !== "all" && m.medication_class !== klass) return false;
        // Patología
        if (pathology !== "all") {
          if (!m.indications.some((i) => i.pathology_id === pathology)) return false;
        }
        // Texto libre (nombre, marca, indicación, patología)
        if (needle) {
          const hay = [
            m.inn,
            m.generic_name_en ?? "",
            m.brand_names.join(" "),
            m.common_uses_es ?? "",
            ...m.indications.map((i) => `${i.pathology_name ?? ""} ${i.indication_es ?? ""}`),
          ]
            .join(" ")
            .toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const fa = familyForClass(a.medication_class)?.label_es ?? "zz";
        const fb = familyForClass(b.medication_class)?.label_es ?? "zz";
        if (fa !== fb) return fa.localeCompare(fb, "es");
        return a.inn.localeCompare(b.inn, "es");
      });
  }, [items, family, klass, pathology, q]);

  const hasFilters = family !== "all" || klass !== "all" || pathology !== "all" || q.trim() !== "";
  const clearFilters = () => {
    setFamily("all");
    setKlass("all");
    setPathology("all");
    setQ("");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros en cascada */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Familia farmacológica
          </label>
          <Select
            value={family}
            onValueChange={(v) => {
              setFamily(v);
              setKlass("all");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas las familias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las familias ({items.length})</SelectItem>
              {MEDICATION_FAMILIES.map((f) => {
                const c = familyCounts.get(f.id) ?? 0;
                return (
                  <SelectItem key={f.id} value={f.id} disabled={c === 0}>
                    {f.label_es} {c > 0 ? `(${c})` : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Subclase
          </label>
          <Select
            value={klass}
            onValueChange={setKlass}
            disabled={!familyDef || familyDef.classes.length <= 1}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={familyDef && familyDef.classes.length > 1 ? "Todas" : "—"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las subclases</SelectItem>
              {(familyDef?.classes ?? []).map((c) => (
                <SelectItem key={c} value={c}>
                  {MEDICATION_CLASS_LABEL_ES[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Patología / indicación
          </label>
          <Select value={pathology} onValueChange={setPathology}>
            <SelectTrigger>
              <SelectValue placeholder="Todas las patologías" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">Todas las patologías</SelectItem>
              {pathologyOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Buscar
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="DCI, marca, indicación…"
              className="pl-7"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {filtered.length} fármaco(s){family !== "all" ? ` · ${familyDef?.label_es}` : ""}
          {pathology !== "all"
            ? ` · ${pathologyOptions.find((p) => p.id === pathology)?.name}`
            : ""}
        </span>
        <div className="flex items-center gap-3">
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2 text-xs">
              Limpiar filtros
            </Button>
          )}
          <span className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            {isLoading ? "Cargando…" : `${dbCount} en base aprobada`}
          </span>
        </div>
      </div>

      {/* Resultados */}
      <div className="grid gap-3 lg:grid-cols-2">
        {filtered.map((m) => {
          const fam = familyForClass(m.medication_class);
          const matchingIndications =
            pathology !== "all"
              ? m.indications.filter((i) => i.pathology_id === pathology)
              : m.indications;
          return (
            <Card key={m.id} className="border-border bg-surface p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{m.inn}</h3>
                  <p className="text-xs text-muted-foreground">
                    {fam?.label_es ?? "—"} ·{" "}
                    {MEDICATION_CLASS_LABEL_ES[
                      m.medication_class as keyof typeof MEDICATION_CLASS_LABEL_ES
                    ] ?? m.medication_class}
                    {" · "}
                    {ROUTE_LABEL_ES[m.route] ?? m.route}
                  </p>
                </div>
                <div className="flex max-w-[55%] flex-col items-end gap-1">
                  {m.indications.length > 0 && (
                    <Badge className="bg-primary/10 text-[10px] text-primary hover:bg-primary/20">
                      {m.indications.length} indicación(es)
                    </Badge>
                  )}
                  {m.is_intravitreal && (
                    <Badge variant="secondary" className="text-[10px]">
                      Intravítreo
                    </Badge>
                  )}
                  {m.brand_names.length > 0 && (
                    <div className="flex flex-wrap justify-end gap-1">
                      {m.brand_names.slice(0, 4).map((b) => (
                        <Badge key={b} variant="outline" className="text-[10px]">
                          {b}
                        </Badge>
                      ))}
                      {m.brand_names.length > 4 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{m.brand_names.length - 4}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {matchingIndications.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Indicaciones por patología ({matchingIndications.length})
                  </p>
                  <ul className="space-y-1.5">
                    {matchingIndications.map((i, idx) => (
                      <li
                        key={idx}
                        className="rounded-md border border-border/60 bg-background/40 p-2 text-xs"
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium text-foreground">
                            {i.pathology_name ?? "—"}
                          </span>
                          {i.line_of_therapy && (
                            <Badge variant="outline" className="text-[10px]">
                              {prettyLineOfTherapy(i.line_of_therapy)}
                            </Badge>
                          )}
                          {i.evidence_level && (
                            <Badge variant="secondary" className="text-[10px]">
                              {prettyEvidenceLevel(i.evidence_level)}
                            </Badge>
                          )}
                        </div>
                        {i.indication_es && (
                          <p className="mt-1 text-muted-foreground">{i.indication_es}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {m.mechanism_es && (
                <div className="mt-3 text-xs">
                  <KV k="Mecanismo" v={m.mechanism_es} />
                </div>
              )}
            </Card>
          );
        })}
        {!isLoading && filtered.length === 0 && (
          <Card className="col-span-full border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            No hay fármacos que coincidan con los filtros seleccionados.
          </Card>
        )}
      </div>
    </div>
  );
}
