import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { AIAnswerCard } from "@/components/ai-answer-card";
import { SafetyNoticeBanner } from "@/components/disclaimers";
import { LoadingState, EmptyState } from "@/components/empty-loading";
import { ModeChip } from "@/components/badges";
import { askClinicalAI } from "@/lib/services/ai";
import { detectSafety } from "@/lib/safety";
import {
  SUBSPECIALTIES,
  type AIAnswer,
  type ClinicalAIMode,
  type Language,
  type Subspecialty,
} from "@/lib/types";
import { Send, Stethoscope, ShieldAlert, BookOpen, FileSearch, ListChecks } from "lucide-react";

export const Route = createFileRoute("/_authenticated/clinical-ai")({
  head: () => ({
    meta: [
      { title: "OR IA Clínica · Ophthalmology Radar" },
      {
        name: "description",
        content:
          "IA educativa y bibliográfica para oftalmólogos verificados — búsqueda de evidencia, apoyo a protocolos y razonamiento clínico estructurado, con guardarraíles de seguridad.",
      },
      { property: "og:title", content: "OR IA Clínica" },
      {
        property: "og:description",
        content:
          "Asistente de IA vertical basado en fuentes para oftalmología. No apto para diagnóstico ni tratamiento.",
      },
    ],
  }),
  component: ClinicalAIPage,
});

const MODE_META: Record<
  ClinicalAIMode,
  { label: string; description: string; icon: typeof BookOpen }
> = {
  "Clinical AI Assistant": {
    label: "Asistente IA Clínica",
    description: "Respuesta educativa estructurada con citas, consideraciones y signos de alarma.",
    icon: Stethoscope,
  },
  "Evidence Search": {
    label: "Búsqueda de evidencia",
    description: "Recuperación curada en fuentes aprobadas, ordenada por nivel de evidencia.",
    icon: FileSearch,
  },
  "Protocol Support": {
    label: "Apoyo a protocolos",
    description: "Recorre protocolos educativos de guías aprobadas por OR.",
    icon: ListChecks,
  },
};

const MODES = Object.keys(MODE_META) as ClinicalAIMode[];

const EXAMPLES = [
  "¿Cuál es la evidencia para DMEK en pacientes con trabeculectomía previa?",
  "Compara SLT vs. latanoprost sin conservantes como primera línea en GPAA.",
  "Resumen educativo de los intervalos treat-and-extend con anti-VEGF en DMAE neovascular.",
];

function ClinicalAIPage() {
  const [query, setQuery] = useState("");
  const [subspecialty, setSubspecialty] = useState<Subspecialty>("Cornea");
  const [language, setLanguage] = useState<Language>("es");
  const [mode, setMode] = useState<ClinicalAIMode>("Clinical AI Assistant");
  const [answer, setAnswer] = useState<AIAnswer | null>(null);

  const safety = detectSafety(query, language);

  const mutation = useMutation({
    mutationFn: askClinicalAI,
    onSuccess: setAnswer,
    onError: (err: Error) => toast.error(err.message ?? "Error al consultar la IA"),
  });

  const onAsk = () => {
    if (!query.trim()) return;
    mutation.mutate({ query, subspecialty, language, mode });
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <PageHeader
        eyebrow="IA Clínica"
        title="OR IA Clínica"
        description="Un asistente de IA controlado y basado en fuentes para oftalmología — únicamente educativo y bibliográfico. No apto para diagnóstico definitivo, interpretación de imágenes ni tratamiento individualizado."
      />

      <div className="grid gap-2 sm:grid-cols-3">
        {MODES.map((m) => {
          const meta = MODE_META[m];
          const Icon = meta.icon;
          const active = mode === m;
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={
                active
                  ? "group flex items-start gap-3 rounded-md border border-[color:var(--ring)]/40 bg-ring/[0.06] p-3.5 text-left shadow-[inset_0_1px_0_0_oklch(1_0_0_/_0.6)]"
                  : "group flex items-start gap-3 rounded-md border border-border bg-surface p-3.5 text-left transition-colors hover:border-[color:var(--ring)]/30"
              }
            >
              <div
                className={
                  active
                    ? "flex h-8 w-8 items-center justify-center rounded-md bg-[color:var(--ring)]/10 text-[color:var(--ring)]"
                    : "flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:text-[color:var(--ring)]"
                }
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-foreground">{meta.label}</div>
                <div className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                  {meta.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Card className="h-fit border-border bg-surface p-5 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-base font-semibold text-foreground">
              Plantea una pregunta
            </h2>
            <ModeChip label={MODE_META[mode].label} tone="blue" />
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Subespecialidad
                </Label>
                <Select
                  value={subspecialty}
                  onValueChange={(v) => setSubspecialty(v as Subspecialty)}
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
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Idioma
                </Label>
                <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">Inglés</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Tu pregunta
              </Label>
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ejemplo: ¿Cuál es la evidencia del DMEK en pacientes con cirugía previa de glaucoma?"
                className="min-h-[160px] resize-none border-border bg-surface-muted/40 text-[14px] focus-visible:border-[color:var(--ring)]"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setQuery(ex)}
                    className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-[color:var(--ring)]/30 hover:text-foreground"
                  >
                    {ex.length > 56 ? `${ex.slice(0, 54)}…` : ex}
                  </button>
                ))}
              </div>
            </div>

            {safety.emergency && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-[12px] text-destructive">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Posibles términos de urgencia detectados (
                  {safety.matchedTerms.slice(0, 3).join(", ")}). La respuesta se mantendrá
                  únicamente educativa — deriva la atención urgente a evaluación presencial.
                </span>
              </div>
            )}

            <Button
              onClick={onAsk}
              disabled={!query.trim() || mutation.isPending}
              className="w-full gap-2 bg-[color:var(--navy)] text-[color:var(--navy-foreground)] hover:bg-[color:var(--navy)]/90"
            >
              <Send className="h-4 w-4" />
              {mutation.isPending ? "Generando respuesta educativa…" : "Preguntar a OR IA Clínica"}
            </Button>

            <p className="text-[11px] leading-snug text-muted-foreground">
              Las respuestas son únicamente educativas y bibliográficas. Este sistema no proporciona
              diagnósticos definitivos, interpretación de imágenes ni recomendaciones de tratamiento
              individualizado.
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          {safety.emergency && <SafetyNoticeBanner />}
          {mutation.isPending ? (
            <Card className="border-border bg-surface p-8">
              <LoadingState label="Recuperando fuentes aprobadas y redactando una respuesta educativa…" />
            </Card>
          ) : answer ? (
            <AIAnswerCard
              answer={answer}
              interactionId={
                (answer as AIAnswer & { interaction_id?: string | null }).interaction_id
              }
            />
          ) : (
            <EmptyState
              icon={<Stethoscope className="h-8 w-8" />}
              title="Plantea una pregunta clínica para empezar"
              description="Prueba uno de los ejemplos de la izquierda o escribe el tuyo. Las respuestas se basan en fuentes aprobadas por Ophthalmology Radar."
            />
          )}
        </div>
      </div>
    </div>
  );
}
