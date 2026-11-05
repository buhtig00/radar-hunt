import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { DisclaimerBox } from "@/components/disclaimers";
import { SafetyBadge, ValidationBadge } from "@/components/badges";
import { LoadingState, EmptyState } from "@/components/empty-loading";
import { RoleGuard } from "@/components/role-guard";
import { analyseCase } from "@/lib/services/ai";
import { detectPII, type PIIMatch } from "@/lib/safety";
import {
  SUBSPECIALTIES,
  type CaseAIAnalysis,
  type ClinicalCaseInput,
  type Subspecialty,
} from "@/lib/types";
import { ClipboardList, ShieldAlert, BookOpen, FileText } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/case-analysis")({
  head: () => ({
    meta: [
      { title: "Análisis de casos clínicos · Ophthalmology Radar" },
      {
        name: "description",
        content:
          "Envía casos clínicos anonimizados para un análisis educativo con IA: hipótesis estructuradas, pruebas complementarias y alertas de seguridad.",
      },
      { property: "og:title", content: "Análisis de casos clínicos" },
      {
        property: "og:description",
        content:
          "Análisis educativo de casos por IA para oftalmólogos verificados — solo casos anonimizados.",
      },
    ],
  }),
  component: () => (
    <RoleGuard capability="use_case_analysis">
      <CaseAnalysisPage />
    </RoleGuard>
  ),
});

const AGE_RANGES = ["0–5", "6–17", "18–39", "40–59", "60–79", "80+"];

function CaseAnalysisPage() {
  const { t } = useI18n();
  const [confirmed, setConfirmed] = useState(false);
  const [form, setForm] = useState<ClinicalCaseInput>({
    title: "",
    subspecialty: "Retina",
    age_range: "60–79",
    complaint: "",
    history: "",
    examination: "",
    imaging: "",
    previous_treatments: "",
    question: "",
  });
  const [result, setResult] = useState<CaseAIAnalysis | null>(null);

  const mutation = useMutation({
    mutationFn: () => analyseCase(form),
    onSuccess: (r) => {
      setResult(r);
      toast.success(t("toast.case.success"));
    },
    onError: () => toast.error(t("toast.case.error")),
  });

  const set = <K extends keyof ClinicalCaseInput>(k: K, v: ClinicalCaseInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const piiMatches: PIIMatch[] = useMemo(() => {
    const combined = [
      form.title,
      form.complaint,
      form.history,
      form.examination,
      form.imaging,
      form.previous_treatments,
      form.question,
    ]
      .filter(Boolean)
      .join("\n");
    return combined.length > 5 ? detectPII(combined) : [];
  }, [form]);

  const canSubmit =
    confirmed &&
    form.complaint.trim().length > 0 &&
    form.question.trim().length > 0 &&
    piiMatches.length === 0 &&
    !mutation.isPending;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        eyebrow="Análisis de casos"
        title="Análisis de casos clínicos"
        description="Análisis educativo por IA de casos clínicos anonimizados — hipótesis estructuradas, pruebas complementarias y alertas de seguridad."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <Card className="border-warning/30 bg-warning/10 p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--warning)]" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-foreground">Anonimización obligatoria</p>
                <p className="text-muted-foreground">
                  No incluyas nombres, fechas de nacimiento, número de historia clínica, teléfonos,
                  emails, direcciones, imágenes identificables ni ninguna información que pueda
                  identificar al paciente.
                </p>
                <label className="mt-1 flex items-start gap-2 text-foreground">
                  <Checkbox
                    checked={confirmed}
                    onCheckedChange={(v) => setConfirmed(Boolean(v))}
                    className="mt-0.5"
                  />
                  <span className="text-sm">
                    Confirmo que este caso no contiene datos identificables del paciente.
                  </span>
                </label>
              </div>
            </div>
          </Card>

          {piiMatches.length > 0 && (
            <Card className="border-destructive/40 bg-destructive/5 p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-destructive">{t("pii.title")}</p>
                  <p className="text-foreground">{t("pii.body")}</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {piiMatches.map((m, i) => (
                      <li
                        key={i}
                        className="flex flex-col rounded-md border border-destructive/20 bg-surface p-2"
                      >
                        <span className="font-medium text-foreground">{t(`pii.${m.type}`)}</span>
                        <span className="font-mono text-[11px] text-destructive">
                          "{m.excerpt}"
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          <Card className="border-border bg-surface p-5 space-y-3 shadow-[var(--shadow-card)]">
            <Field label="Título del caso">
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Ej.: Engrosamiento macular bilateral"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Subespecialidad">
                <Select
                  value={form.subspecialty}
                  onValueChange={(v) => set("subspecialty", v as Subspecialty)}
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
              </Field>
              <Field label="Rango de edad del paciente">
                <Select value={form.age_range} onValueChange={(v) => set("age_range", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_RANGES.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Motivo de consulta principal">
              <Textarea
                value={form.complaint}
                onChange={(e) => set("complaint", e.target.value)}
                className="min-h-[60px]"
              />
            </Field>
            <Field label="Antecedentes clínicos">
              <Textarea
                value={form.history}
                onChange={(e) => set("history", e.target.value)}
                className="min-h-[60px]"
              />
            </Field>
            <Field label="Hallazgos exploratorios">
              <Textarea
                value={form.examination}
                onChange={(e) => set("examination", e.target.value)}
                className="min-h-[60px]"
              />
            </Field>
            <Field label="Resumen de imágenes / pruebas">
              <Textarea
                value={form.imaging}
                onChange={(e) => set("imaging", e.target.value)}
                className="min-h-[60px]"
              />
            </Field>
            <Field label="Tratamientos previos">
              <Textarea
                value={form.previous_treatments}
                onChange={(e) => set("previous_treatments", e.target.value)}
                className="min-h-[60px]"
              />
            </Field>
            <Field label="Pregunta clínica">
              <Textarea
                value={form.question}
                onChange={(e) => set("question", e.target.value)}
                className="min-h-[60px]"
                placeholder="¿Qué aporte educativo ayudaría a tu razonamiento?"
              />
            </Field>

            <Button
              onClick={() => mutation.mutate()}
              disabled={!canSubmit}
              className="w-full gap-2"
            >
              <ClipboardList className="h-4 w-4" />
              {mutation.isPending ? "Analizando el caso…" : "Analizar caso"}
            </Button>
          </Card>
        </div>

        <div className="space-y-4">
          {mutation.isPending ? (
            <Card className="border-border bg-surface p-8">
              <LoadingState label="Construyendo el análisis educativo del caso…" />
            </Card>
          ) : result ? (
            <CaseResultCard result={result} />
          ) : (
            <EmptyState
              icon={<ClipboardList className="h-8 w-8" />}
              title="Aún no hay análisis"
              description="Confirma la anonimización, rellena el formulario y ejecuta el análisis educativo del caso."
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="text-sm leading-relaxed text-foreground">{children}</div>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2 text-sm text-foreground">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[color:var(--ring)]" />
          {it}
        </li>
      ))}
    </ul>
  );
}

function CaseResultCard({ result }: { result: CaseAIAnalysis }) {
  return (
    <Card className="border-border bg-surface p-6 shadow-[var(--shadow-card)] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ValidationBadge level="AI Generated" />
        <div className="flex flex-wrap gap-1.5">
          {result.safety_flags.map((f) => (
            <SafetyBadge key={f} flag={f} />
          ))}
        </div>
      </div>

      <Block title="Resumen del caso">{result.case_summary}</Block>
      <Block title="Datos clínicos relevantes">
        <Bullets items={result.relevant_data} />
      </Block>
      <Block title="Información faltante">
        <Bullets items={result.missing_information} />
      </Block>

      <div>
        <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Hipótesis diagnósticas educativas
        </h3>
        <ul className="space-y-2">
          {result.diagnostic_hypotheses.map((h, i) => (
            <li key={i} className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-sm font-medium text-foreground">{h.name}</p>
              <p className="text-xs text-muted-foreground">{h.rationale}</p>
            </li>
          ))}
        </ul>
      </div>

      <Block title="Pruebas complementarias razonables">
        <Bullets items={result.complementary_tests} />
      </Block>
      <Block title="Signos de alarma">
        <Bullets items={result.red_flags} />
      </Block>
      <Block title="Preguntas para discusión">
        <Bullets items={result.discussion_questions} />
      </Block>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Bibliografía sugerida
          </h3>
          <ul className="space-y-1.5">
            {result.bibliography.map((b) => (
              <li key={b.id} className="flex gap-2 text-sm">
                <FileText className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <div className="text-foreground">{b.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {b.type}
                    {b.year ? ` · ${b.year}` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Contenido relacionado de OR
          </h3>
          <ul className="space-y-1.5">
            {result.related_or_content.map((r) => (
              <li key={r.id} className="flex gap-2 text-sm">
                <BookOpen className="mt-0.5 h-4 w-4 text-[color:var(--gold)] shrink-0" />
                <div>
                  <div className="text-foreground">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.type}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <DisclaimerBox />
    </Card>
  );
}
