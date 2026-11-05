import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, ValidationBadge } from "@/components/badges";
import { KNOWLEDGE_SOURCES } from "@/lib/mock-data";
import {
  SUBSPECIALTIES,
  type ApprovalStatus,
  type KnowledgeSource,
  type Language,
  type SourceType,
  type Subspecialty,
} from "@/lib/types";
import { Plus, MoreHorizontal, Upload, Search } from "lucide-react";
import { toast } from "sonner";
import { tr } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/knowledge-base")({
  head: () => ({
    meta: [
      { title: "Base de conocimiento · Ophthalmology Radar" },
      {
        name: "description",
        content:
          "Panel de administración para gestionar cursos, módulos, guías, protocolos y comentarios KOL que alimentan la capa de IA de Ophthalmology Radar.",
      },
      { property: "og:title", content: "Base de conocimiento de IA" },
      {
        property: "og:description",
        content: "Gestiona las fuentes educativas y bibliográficas aprobadas para la IA de OR.",
      },
    ],
  }),
  component: KnowledgeBasePage,
});

const SOURCE_TYPES: SourceType[] = [
  "Course",
  "Course Module",
  "Webinar",
  "Clinical Case",
  "Paper",
  "Guideline",
  "Protocol",
  "Test Question",
  "Industry Material",
  "KOL Commentary",
];

const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  Course: "Curso",
  "Course Module": "Módulo de curso",
  Webinar: "Webinar",
  "Clinical Case": "Caso clínico",
  Paper: "Artículo científico",
  Guideline: "Guía clínica",
  Protocol: "Protocolo",
  "Test Question": "Pregunta de test",
  "Industry Material": "Material de industria",
  "KOL Commentary": "Comentario KOL",
};

const STATUSES: ApprovalStatus[] = ["Draft", "Pending Review", "Approved", "Rejected", "Archived"];
const STATUS_LABEL: Record<ApprovalStatus, string> = {
  Draft: "Borrador",
  "Pending Review": "Pendiente de revisión",
  Approved: "Aprobado",
  Rejected: "Rechazado",
  Archived: "Archivado",
};

function KnowledgeBasePage() {
  const [rows, setRows] = useState<KnowledgeSource[]>(KNOWLEDGE_SOURCES);
  const [q, setQ] = useState("");
  const [sub, setSub] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [type, setType] = useState<string>("all");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (
        q &&
        !`${r.title} ${r.author} ${r.pathology ?? ""}`.toLowerCase().includes(q.toLowerCase())
      )
        return false;
      if (sub !== "all" && r.subspecialty !== sub) return false;
      if (status !== "all" && r.approval_status !== status) return false;
      if (type !== "all" && r.source_type !== type) return false;
      return true;
    });
  }, [rows, q, sub, status, type]);

  const handleAction = (action: string, row: KnowledgeSource) => {
    if (action === "approve") {
      setRows((rs) =>
        rs.map((r) =>
          r.id === row.id ? { ...r, approval_status: "Approved", is_active: true } : r,
        ),
      );
      toast.success(`${tr("toast.kb.approved")}: "${row.title}"`);
    } else if (action === "reject") {
      setRows((rs) =>
        rs.map((r) =>
          r.id === row.id ? { ...r, approval_status: "Rejected", is_active: false } : r,
        ),
      );
      toast.success(`${tr("toast.kb.rejected")}: "${row.title}"`);
    } else if (action === "archive") {
      setRows((rs) =>
        rs.map((r) =>
          r.id === row.id ? { ...r, approval_status: "Archived", is_active: false } : r,
        ),
      );
      toast.success(`${tr("toast.kb.archived")}: "${row.title}"`);
    } else if (action === "deactivate") {
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, is_active: false } : r)));
      toast.success(`${tr("toast.kb.deactivated")}: "${row.title}"`);
    } else if (action === "kol") {
      toast.success(`${tr("toast.kb.sent_kol")}: "${row.title}"`);
    } else if (action === "embeddings") {
      toast.success(`${tr("toast.kb.embeddings")}: "${row.title}"`);
    } else {
      toast(`${action} · ${row.title}`);
    }
  };

  const onUpload = (s: KnowledgeSource) => setRows((rs) => [s, ...rs]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        eyebrow="Base de conocimiento"
        title="Base de conocimiento de IA"
        description="Gestiona cursos, módulos, guías, protocolos y comentarios KOL que alimentan la capa de IA de OR."
        actions={<UploadSourceDialog onUpload={onUpload} />}
      />

      <Card className="border-border bg-surface p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar título, autor, patología…"
              className="pl-9"
            />
          </div>
          <Select value={sub} onValueChange={setSub}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Subespecialidad" />
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
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {SOURCE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {SOURCE_TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="border-border bg-surface shadow-[var(--shadow-card)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Subespecialidad</TableHead>
              <TableHead>Patología</TableHead>
              <TableHead>Idioma</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead>Última revisión</TableHead>
              <TableHead>KOL</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="max-w-[280px]">
                  <div className="font-medium text-foreground">{r.title}</div>
                  {r.validation_level && (
                    <div className="mt-1">
                      <ValidationBadge level={r.validation_level} />
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {SOURCE_TYPE_LABEL[r.source_type]}
                </TableCell>
                <TableCell className="text-sm">{r.subspecialty}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.pathology ?? "—"}
                </TableCell>
                <TableCell className="text-sm uppercase">{r.language}</TableCell>
                <TableCell className="text-sm">{r.author}</TableCell>
                <TableCell>
                  <StatusBadge status={r.approval_status} />
                </TableCell>
                <TableCell>
                  <span
                    className={
                      r.is_active
                        ? "text-[color:var(--success)] text-sm"
                        : "text-muted-foreground text-sm"
                    }
                  >
                    {r.is_active ? "Sí" : "No"}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.last_reviewed_at ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.kol_validator ?? "—"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleAction("view", r)}>
                        Ver
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction("edit", r)}>
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction("approve", r)}>
                        Aprobar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction("reject", r)}>
                        Rechazar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction("archive", r)}>
                        Archivar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction("kol", r)}>
                        Enviar a KOL
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction("embeddings", r)}>
                        Generar embeddings
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction("deactivate", r)}>
                        Desactivar fuente
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="py-10 text-center text-sm text-muted-foreground">
                  Ninguna fuente coincide con los filtros actuales.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function UploadSourceDialog({ onUpload }: { onUpload: (s: KnowledgeSource) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    source_type: "Course" as SourceType,
    subspecialty: "Cornea" as Subspecialty,
    pathology: "",
    language: "es" as Language,
    author: "",
    publication_date: "",
    evidence_level: "Consenso de expertos",
    copyright_status: "Verificado",
    external_url: "",
    notes: "",
  });

  const submit = () => {
    if (!form.title || !form.author) {
      toast.error(tr("toast.kb.required"));
      return;
    }
    onUpload({
      id: `ks-${Date.now()}`,
      title: form.title,
      description: form.description,
      source_type: form.source_type,
      subspecialty: form.subspecialty,
      pathology: form.pathology,
      language: form.language,
      author: form.author,
      publication_date: form.publication_date || undefined,
      evidence_level: form.evidence_level,
      approval_status: "Pending Review",
      is_active: false,
      external_url: form.external_url || undefined,
    });
    toast.success(tr("toast.kb.sent_editorial"));
    setOpen(false);
  };

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Subir fuente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Subir fuente de conocimiento</DialogTitle>
          <DialogDescription>
            La fuente entrará en la cola de revisión editorial antes de activarse.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2 max-h-[60vh] overflow-y-auto pr-1">
          <F label="Título">
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </F>
          <F label="Autor">
            <Input
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
            />
          </F>
          <F label="Tipo de fuente">
            <Select
              value={form.source_type}
              onValueChange={(v) => setForm({ ...form, source_type: v as SourceType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {SOURCE_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </F>
          <F label="Subespecialidad">
            <Select
              value={form.subspecialty}
              onValueChange={(v) => setForm({ ...form, subspecialty: v as Subspecialty })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBSPECIALTIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </F>
          <F label="Patología">
            <Input
              value={form.pathology}
              onChange={(e) => setForm({ ...form, pathology: e.target.value })}
            />
          </F>
          <F label="Idioma">
            <Select
              value={form.language}
              onValueChange={(v) => setForm({ ...form, language: v as Language })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="en">Inglés</SelectItem>
              </SelectContent>
            </Select>
          </F>
          <F label="Fecha de publicación">
            <Input
              type="date"
              value={form.publication_date}
              onChange={(e) => setForm({ ...form, publication_date: e.target.value })}
            />
          </F>
          <F label="Nivel de evidencia">
            <Input
              value={form.evidence_level}
              onChange={(e) => setForm({ ...form, evidence_level: e.target.value })}
            />
          </F>
          <F label="Estado de copyright">
            <Input
              value={form.copyright_status}
              onChange={(e) => setForm({ ...form, copyright_status: e.target.value })}
            />
          </F>
          <F label="URL externa">
            <Input
              value={form.external_url}
              onChange={(e) => setForm({ ...form, external_url: e.target.value })}
              placeholder="https://"
            />
          </F>
          <div className="sm:col-span-2">
            <F label="Descripción">
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </F>
          </div>
          <div className="sm:col-span-2">
            <F label="Subida de archivo">
              <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                <Upload className="h-4 w-4" /> Arrastra un PDF o documento (solo UI — se conecta a
                la ingestión en una iteración posterior)
              </div>
            </F>
          </div>
          <div className="sm:col-span-2">
            <F label="Notas para el revisor">
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </F>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>Enviar a revisión</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
