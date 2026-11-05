import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PageHeader } from "@/components/page-header";
import { DisclaimerBox } from "@/components/disclaimers";
import { ATLAS_KOLS } from "@/lib/ophthalmology-atlas";
import {
  useAtlasPathologies,
  useAtlasDrugs,
  useAtlasDevices,
  useAtlasGuidelines,
  useAtlasClassifications,
} from "@/hooks/use-atlas-data";
import { SUBSPECIALTIES } from "@/lib/types";
import {
  Search,
  Pill,
  Microscope,
  BookMarked,
  Users,
  Layers,
  Stethoscope,
  Database,
} from "lucide-react";

function LiveBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Badge variant="secondary" className="gap-1 text-[10px]">
      <Database className="h-3 w-3" />
      {count} desde la base de conocimiento
    </Badge>
  );
}

export const Route = createFileRoute("/_authenticated/atlas")({
  head: () => ({
    meta: [
      { title: "Atlas oftalmológico · Ophthalmology Radar" },
      {
        name: "description",
        content:
          "Base de conocimiento oftalmológica: patologías, fármacos, dispositivos, guías clínicas, KOLs y clasificaciones por subespecialidad.",
      },
      { property: "og:title", content: "Atlas oftalmológico de OR" },
    ],
  }),
  component: AtlasPage,
});

function AtlasPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        eyebrow="Atlas"
        title="Atlas oftalmológico"
        description="Base de conocimiento extensa con patologías, fármacos, dispositivos, guías clínicas, clasificaciones y KOLs por subespecialidad. Modo demo: datos clínicamente plausibles para presentaciones; en producción se servirá desde Supabase con validación editorial y KOL."
      />
      <DisclaimerBox context="catalog" />

      <Tabs defaultValue="pathologies" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
          <TabsTrigger value="pathologies" className="gap-2">
            <Stethoscope className="h-3.5 w-3.5" />
            Patologías
          </TabsTrigger>
          <TabsTrigger value="drugs" className="gap-2">
            <Pill className="h-3.5 w-3.5" />
            Fármacos
          </TabsTrigger>
          <TabsTrigger value="devices" className="gap-2">
            <Microscope className="h-3.5 w-3.5" />
            Dispositivos
          </TabsTrigger>
          <TabsTrigger value="guidelines" className="gap-2">
            <BookMarked className="h-3.5 w-3.5" />
            Guías
          </TabsTrigger>
          <TabsTrigger value="classifications" className="gap-2">
            <Layers className="h-3.5 w-3.5" />
            Clasificaciones
          </TabsTrigger>
          <TabsTrigger value="kols" className="gap-2">
            <Users className="h-3.5 w-3.5" />
            KOLs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pathologies" className="mt-4">
          <PathologiesTab />
        </TabsContent>
        <TabsContent value="drugs" className="mt-4">
          <DrugsTab />
        </TabsContent>
        <TabsContent value="devices" className="mt-4">
          <DevicesTab />
        </TabsContent>
        <TabsContent value="guidelines" className="mt-4">
          <GuidelinesTab />
        </TabsContent>
        <TabsContent value="classifications" className="mt-4">
          <ClassificationsTab />
        </TabsContent>
        <TabsContent value="kols" className="mt-4">
          <KOLsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- Patologías ---------- */
function PathologiesTab() {
  const [q, setQ] = useState("");
  const [sub, setSub] = useState<string>("all");
  const { items, dbCount } = useAtlasPathologies();

  const filtered = useMemo(() => {
    return items.filter((p) => {
      if (sub !== "all" && p.subspecialty !== sub) return false;
      if (q) {
        const s = q.toLowerCase();
        return (
          p.name_es.toLowerCase().includes(s) ||
          p.name_en.toLowerCase().includes(s) ||
          (p.icd10 ?? "").toLowerCase().includes(s) ||
          p.etiology.join(" ").toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [q, sub, items]);

  return (
    <div className="flex flex-col gap-4">
      <Filters
        q={q}
        setQ={setQ}
        sub={sub}
        setSub={setSub}
        placeholder="Buscar patología, ICD-10, etiología…"
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{filtered.length} patología(s)</span>
        <LiveBadge count={dbCount} />
      </div>
      <Accordion type="multiple" className="space-y-2">
        {filtered.map((p) => (
          <AccordionItem
            key={p.id}
            value={p.id}
            className="rounded-lg border border-border bg-surface px-4 shadow-[var(--shadow-card)]"
          >
            <AccordionTrigger className="hover:no-underline">
              <div className="flex flex-1 flex-wrap items-center justify-between gap-2 pr-4">
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-semibold text-foreground">{p.name_es}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.name_en} · {p.prevalence}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">
                    {p.subspecialty}
                  </Badge>
                  {p.icd10 && (
                    <Badge variant="secondary" className="text-[10px]">
                      ICD-10 {p.icd10}
                    </Badge>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="grid gap-4 pt-2 sm:grid-cols-2">
              <Block title="Etiología" items={p.etiology} />
              <Block title="Síntomas" items={p.symptoms} />
              <Block title="Signos" items={p.signs} />
              <Block title="Diagnóstico" items={p.diagnostics} />
              <Block title="Diagnóstico diferencial" items={p.differential} />
              <Block title="Tratamiento escalonado" items={p.treatment_steps} ordered />
              <Block title="Complicaciones" items={p.complications} />
              <Block title="Signos de alarma" items={p.red_flags} tone="danger" />
              <Block title="Guías de referencia" items={p.guidelines} />
              <div className="sm:col-span-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Pronóstico: </span>
                {p.prognosis}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

/* ---------- Fármacos ---------- */
function DrugsTab() {
  const [q, setQ] = useState("");
  const { items, dbCount } = useAtlasDrugs();
  const filtered = items.filter(
    (d) =>
      !q ||
      d.inn.toLowerCase().includes(q.toLowerCase()) ||
      d.drug_class.toLowerCase().includes(q.toLowerCase()) ||
      d.brand_examples.join(" ").toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="flex flex-col gap-4">
      <SearchOnly q={q} setQ={setQ} placeholder="Buscar fármaco, clase o marca…" />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{filtered.length} fármaco(s)</span>
        <LiveBadge count={dbCount} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((d) => (
          <Card key={d.id} className="border-border bg-surface p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{d.inn}</h3>
                <p className="text-xs text-muted-foreground">{d.drug_class}</p>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {d.brand_examples[0]}
              </Badge>
            </div>
            <div className="mt-3 space-y-2 text-xs">
              <KV k="Indicaciones" v={d.indications.join(" · ")} />
              <KV k="Posología" v={d.posology} />
              <KV k="Mecanismo" v={d.mechanism} />
              <KV k="Contraindicaciones" v={d.contraindications.join(" · ")} />
              <KV k="Efectos adversos" v={d.adverse_effects.join(" · ")} />
              {d.notes && <KV k="Notas" v={d.notes} />}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------- Dispositivos ---------- */
function DevicesTab() {
  const [q, setQ] = useState("");
  const { items, dbCount } = useAtlasDevices();
  const filtered = items.filter(
    (d) =>
      !q ||
      d.name.toLowerCase().includes(q.toLowerCase()) ||
      d.manufacturer.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="flex flex-col gap-4">
      <SearchOnly q={q} setQ={setQ} placeholder="Buscar dispositivo o fabricante…" />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{filtered.length} dispositivo(s)</span>
        <LiveBadge count={dbCount} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((d) => (
          <Card key={d.id} className="border-border bg-surface p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{d.name}</h3>
              <Badge variant="secondary" className="text-[10px]">
                {d.category}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{d.manufacturer}</p>
            <div className="mt-3 space-y-2 text-xs">
              <KV k="Indicaciones" v={d.indications.join(" · ")} />
              {d.parameters && <KV k="Parámetros" v={d.parameters.join(" · ")} />}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------- Guías ---------- */
function GuidelinesTab() {
  const { items, dbCount } = useAtlasGuidelines();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <LiveBadge count={dbCount} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((g) => (
          <Card key={g.id} className="border-border bg-surface p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{g.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {g.society} · {g.year}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {g.subspecialty}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{g.scope}</p>
            <ul className="mt-3 list-disc space-y-1 pl-4 text-xs">
              {g.key_recommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
            {g.url_hint && (
              <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                {g.url_hint}
              </p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------- Clasificaciones ---------- */
function ClassificationsTab() {
  const { items, dbCount } = useAtlasClassifications();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <LiveBadge count={dbCount} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((c) => (
          <Card key={c.id} className="border-border bg-surface p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{c.name}</h3>
              <Badge variant="outline" className="text-[10px]">
                {c.subspecialty}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{c.use}</p>
            <div className="mt-3 space-y-1.5 text-xs">
              {c.stages.map((s) => (
                <div key={s.code} className="flex gap-2">
                  <span className="min-w-[60px] font-medium text-foreground">{s.code}</span>
                  <span className="text-muted-foreground">{s.description}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------- KOLs ---------- */
function KOLsTab() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {ATLAS_KOLS.map((k) => (
        <Card key={k.id} className="border-border bg-surface p-4 shadow-[var(--shadow-card)]">
          <h3 className="text-sm font-semibold text-foreground">{k.name}</h3>
          <p className="text-xs text-muted-foreground">
            {k.affiliation} · {k.country}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {k.subspecialties.map((s) => (
              <Badge key={s} variant="outline" className="text-[10px]">
                {s}
              </Badge>
            ))}
          </div>
          <p className="mt-3 text-xs">
            <span className="font-medium text-foreground">Áreas: </span>
            <span className="text-muted-foreground">{k.expertise.join(" · ")}</span>
          </p>
          {k.h_index && (
            <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              h-index ~{k.h_index}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}

/* ---------- helpers ---------- */
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
          <SelectTrigger className="w-[200px]">
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

function SearchOnly({
  q,
  setQ,
  placeholder,
}: {
  q: string;
  setQ: (v: string) => void;
  placeholder: string;
}) {
  return (
    <Card className="border-border bg-surface p-3 shadow-[var(--shadow-card)]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
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
    <div>
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
