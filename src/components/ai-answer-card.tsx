import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SafetyBadge, ValidationBadge, ModeChip } from "./badges";
import { DisclaimerBox } from "./disclaimers";
import { FeedbackButtons } from "./feedback-buttons";
import type { AIAnswer } from "@/lib/types";
import { BookOpen, FileText, ExternalLink, Quote, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";

function Section({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-baseline gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </h3>
        {kicker && <span className="text-[10px] text-border">{kicker}</span>}
      </div>
      <div className="text-[14px] leading-relaxed text-foreground">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-2 text-[14px] text-foreground">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[color:var(--ring)]" />
          <span className="leading-relaxed">{it}</span>
        </li>
      ))}
    </ul>
  );
}

export function AIAnswerCard({
  answer,
  interactionId,
}: {
  answer: AIAnswer;
  interactionId?: string | null;
}) {
  return (
    <Card className="relative overflow-hidden border-border bg-surface shadow-[var(--shadow-card)]">
      <span
        aria-hidden
        className={
          answer.validation_level === "KOL Verified"
            ? "absolute inset-x-0 top-0 h-[3px] bg-gradient-gold"
            : answer.validation_level === "OR Reviewed"
              ? "absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[color:var(--ring)] to-[color:var(--ring)]/40"
              : "absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-border to-transparent"
        }
      />

      <div className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <ValidationBadge level={answer.validation_level} />
            <ModeChip label="IA Educativa" tone="blue" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {answer.safety_flags.map((f) => (
              <SafetyBadge key={f} flag={f} />
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <div className="relative rounded-md border border-border bg-surface-muted p-4">
            <Quote className="absolute -top-2 left-3 h-4 w-4 bg-surface-muted text-[color:var(--ring)]/60" />
            <p className="text-[15px] leading-relaxed text-foreground">{answer.summary}</p>
          </div>

          <Section title="Consideraciones clave">
            <Bullets items={answer.considerations} />
          </Section>

          {answer.missing_information?.length ? (
            <Section title="Información faltante" kicker="para una respuesta educativa completa">
              <Bullets items={answer.missing_information} />
            </Section>
          ) : null}

          {answer.differential?.length ? (
            <Section title="Diferencial educativo" kicker="no es un diagnóstico">
              <Bullets items={answer.differential} />
            </Section>
          ) : null}

          <Section title="Panorama de la evidencia">{answer.evidence_overview}</Section>

          {answer.red_flags?.length ? (
            <Section title="Signos de alarma">
              <Bullets items={answer.red_flags} />
            </Section>
          ) : null}

          <Separator />

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Fuentes utilizadas
              </h3>
              <ul className="space-y-2.5">
                {answer.sources_used.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-start gap-2.5 rounded-md border border-border bg-surface-muted/60 p-2.5 text-[13px]"
                  >
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--ring)]" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground leading-snug">{s.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                        <span>
                          {s.type}
                          {s.year ? ` · ${s.year}` : ""}
                          {s.author ? ` · ${s.author}` : ""}
                        </span>
                        <span
                          title="Indexada desde una fuente Approved + is_active en ai_knowledge_sources"
                          className="inline-flex items-center gap-1 rounded-md border border-success/40 bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-[color:var(--success)]"
                        >
                          <ShieldCheck className="h-3 w-3" />
                          Fuente verificada
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Contenido relacionado de Ophthalmology Radar
              </h3>
              <ul className="space-y-2.5">
                {answer.related_or_content.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-start gap-2.5 rounded-md border border-border bg-surface-muted/60 p-2.5 text-[13px]"
                  >
                    <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--gold)]" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground leading-snug">{r.title}</div>
                      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                        {r.type}
                      </div>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[11px]">
                      <Link to="/knowledge-base">
                        Abrir <ExternalLink className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <DisclaimerBox />
          <FeedbackButtons interactionId={interactionId} />
        </div>
      </div>
    </Card>
  );
}
