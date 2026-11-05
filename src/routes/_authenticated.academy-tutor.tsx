import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { DisclaimerBox } from "@/components/disclaimers";
import { ValidationBadge } from "@/components/badges";
import { LoadingState, EmptyState } from "@/components/empty-loading";
import { ACADEMY_COURSES } from "@/lib/mock-data";
import { askAcademyTutor } from "@/lib/services/ai";
import type { TutorAnswer, TutorMode } from "@/lib/types";
import { GraduationCap, Lightbulb, Layers, CheckCircle2, BookMarked, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/academy-tutor")({
  head: () => ({
    meta: [
      { title: "Tutor IA Academy · Ophthalmology Radar" },
      {
        name: "description",
        content:
          "Tutor de IA específico por curso para OR Academy — resúmenes, flashcards, MCQ y simulacros de examen para residentes y oftalmólogos.",
      },
      { property: "og:title", content: "Tutor IA OR Academy" },
      {
        property: "og:description",
        content:
          "Aprendizaje estructurado y preparación de exámenes sobre los cursos de OR Academy.",
      },
    ],
  }),
  component: AcademyTutorPage,
});

const MODE_LABEL: Record<TutorMode, string> = {
  "Ask about this module": "Preguntar sobre este módulo",
  "Summarise module": "Resumir el módulo",
  "Generate MCQs": "Generar preguntas MCQ",
  "Create flashcards": "Crear flashcards",
  "Prepare mock exam": "Preparar simulacro de examen",
  "Explain key concepts": "Explicar conceptos clave",
};

const MODES: TutorMode[] = [
  "Ask about this module",
  "Summarise module",
  "Generate MCQs",
  "Create flashcards",
  "Prepare mock exam",
  "Explain key concepts",
];

function AcademyTutorPage() {
  const [courseId, setCourseId] = useState(ACADEMY_COURSES[0].id);
  const [moduleId, setModuleId] = useState(ACADEMY_COURSES[0].modules[0].id);
  const [mode, setMode] = useState<TutorMode>("Summarise module");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<TutorAnswer | null>(null);

  const course = useMemo(() => ACADEMY_COURSES.find((c) => c.id === courseId)!, [courseId]);
  const moduleObj = useMemo(
    () => course.modules.find((m) => m.id === moduleId) ?? course.modules[0],
    [course, moduleId],
  );

  const mutation = useMutation({
    mutationFn: () =>
      askAcademyTutor({ courseTitle: course.title, moduleTitle: moduleObj.title, mode, question }),
    onSuccess: setAnswer,
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        eyebrow="Tutor Academy"
        title="Tutor IA OR Academy"
        description="Un tutor de IA integrado en los cursos de OR Academy. Elige un curso y un módulo, y selecciona un modo de aprendizaje."
      />

      <Card className="border-border bg-surface p-5 shadow-[var(--shadow-card)]">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Curso</Label>
            <Select
              value={courseId}
              onValueChange={(v) => {
                setCourseId(v);
                const c = ACADEMY_COURSES.find((c) => c.id === v)!;
                setModuleId(c.modules[0].id);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACADEMY_COURSES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Módulo</Label>
            <Select value={moduleId} onValueChange={setModuleId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {course.modules.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Modo del tutor
            </Label>
            <Select value={mode} onValueChange={(v) => setMode(v as TutorMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {MODE_LABEL[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {mode === "Ask about this module" && (
          <div className="mt-4 space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Tu pregunta
            </Label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-[100px]"
              placeholder="Ej.: ¿Cuándo se prefiere SF6 sobre aire en DMEK?"
            />
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Uso educativo exclusivo. Las respuestas del tutor siguen el currículo de OR Academy y
            pueden actualizarse.
          </p>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-2">
            <Sparkles className="h-4 w-4" />
            {mutation.isPending ? "Generando…" : "Ejecutar tutor"}
          </Button>
        </div>
      </Card>

      {mutation.isPending ? (
        <Card className="border-border bg-surface p-8">
          <LoadingState label="El tutor está preparando tus materiales de estudio…" />
        </Card>
      ) : answer ? (
        <TutorOutput answer={answer} />
      ) : (
        <EmptyState
          icon={<GraduationCap className="h-8 w-8" />}
          title="Elige un curso, un módulo y un modo de tutor"
          description="Luego ejecuta el tutor para generar resúmenes, MCQ, flashcards o simulacros de examen."
        />
      )}
    </div>
  );
}

function TutorOutput({ answer }: { answer: TutorAnswer }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card className="border-border bg-surface p-6 shadow-[var(--shadow-card)] space-y-5">
        <div className="flex items-center justify-between">
          <ValidationBadge level="AI Generated" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5 text-[color:var(--gold)]" /> Salida del tutor
          </div>
        </div>

        <Section title="Respuesta breve">{answer.short_answer}</Section>
        <Section title="Explicación ampliada">{answer.expanded_explanation}</Section>

        <div className="rounded-lg border border-gold/30 bg-gold/5 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--gold)]">
            Perla clínica
          </div>
          <p className="mt-1 text-sm text-foreground">{answer.clinical_pearl}</p>
        </div>

        <SelfAssessment mcq={answer.self_assessment} />

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Contenido recomendado de OR
          </h3>
          <ul className="space-y-1.5 text-sm">
            {answer.recommended_content.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-foreground">
                <BookMarked className="h-4 w-4 text-[color:var(--ring)]" /> {r.title}
              </li>
            ))}
          </ul>
        </div>

        <DisclaimerBox />
      </Card>

      <div className="space-y-4">
        <Card className="border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-base font-semibold">Preparación para el examen</h3>
            <span className="text-sm text-muted-foreground">{answer.exam_readiness}%</span>
          </div>
          <Progress value={answer.exam_readiness} className="mt-3" />
          <p className="mt-3 text-xs text-muted-foreground">
            Basado en los conceptos clave cubiertos y los resultados de la autoevaluación.
          </p>
        </Card>

        <Tabs defaultValue="concepts" className="w-full">
          <TabsList className="grid grid-cols-3 bg-muted">
            <TabsTrigger value="concepts">Conceptos clave</TabsTrigger>
            <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
            <TabsTrigger value="mcqs">Preguntas MCQ</TabsTrigger>
          </TabsList>
          <TabsContent value="concepts">
            <Card className="border-border bg-surface p-5">
              <ul className="space-y-2">
                {answer.key_concepts.map((k) => (
                  <li key={k} className="flex items-start gap-2 text-sm text-foreground">
                    <Layers className="mt-0.5 h-4 w-4 text-[color:var(--ring)]" /> {k}
                  </li>
                ))}
              </ul>
            </Card>
          </TabsContent>
          <TabsContent value="flashcards">
            <div className="grid gap-3 sm:grid-cols-2">
              {answer.flashcards.map((f, i) => (
                <Card key={i} className="border-border bg-surface p-4">
                  <p className="text-sm font-medium text-foreground">{f.front}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{f.back}</p>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="mcqs">
            <div className="space-y-3">
              {answer.mcqs.map((m, i) => (
                <Card key={i} className="border-border bg-surface p-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">{m.question}</p>
                  <ul className="space-y-1 text-sm">
                    {m.options.map((o) => (
                      <li
                        key={o.label}
                        className={`flex gap-2 ${o.label === m.correct ? "text-[color:var(--success)] font-medium" : "text-foreground"}`}
                      >
                        <span className="w-5 text-muted-foreground">{o.label}.</span>
                        {o.text}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    <CheckCircle2 className="inline h-3 w-3 mr-1 text-[color:var(--success)]" />
                    {m.explanation}
                  </p>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="text-sm leading-relaxed text-foreground">{children}</div>
    </div>
  );
}

function SelfAssessment({ mcq }: { mcq: TutorAnswer["self_assessment"] }) {
  const [picked, setPicked] = useState<"A" | "B" | "C" | "D" | null>(null);
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Autoevaluación
      </div>
      <p className="mt-1 text-sm font-medium text-foreground">{mcq.question}</p>
      <div className="mt-3 grid gap-1.5">
        {mcq.options.map((o) => {
          const isPicked = picked === o.label;
          const isCorrect = picked && o.label === mcq.correct;
          const isWrongPick = isPicked && o.label !== mcq.correct;
          return (
            <button
              key={o.label}
              onClick={() => setPicked(o.label)}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                isCorrect
                  ? "border-success/40 bg-success/10 text-[color:var(--success)]"
                  : isWrongPick
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : "border-border bg-surface hover:bg-muted"
              }`}
            >
              <span className="font-mono text-xs text-muted-foreground">{o.label}.</span>
              <span>{o.text}</span>
            </button>
          );
        })}
      </div>
      {picked && (
        <p className="mt-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Explicación: </span>
          {mcq.explanation}
        </p>
      )}
    </div>
  );
}
