import { ShieldAlert, Stethoscope, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

/**
 * Compact disclaimer used inline under AI responses. Phrased as a credible
 * medical statement, not a generic chatbot footer.
 */
export function DisclaimerBox({
  className,
  context = "answer",
}: {
  className?: string;
  /** "answer" under an AI response; "catalog" for library/list views. */
  context?: "answer" | "catalog";
}) {
  const { t } = useI18n();
  const bodyKey =
    context === "catalog" ? "disclaimer.educational_body_catalog" : "disclaimer.educational_body";
  return (
    <div
      className={cn(
        "flex gap-3 rounded-md border border-border bg-surface-muted p-3.5 text-[12px] leading-relaxed text-muted-foreground",
        className,
      )}
    >
      <ScrollText className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--gold)]" />
      <div className="space-y-1">
        <p className="font-medium text-foreground/85">{t("disclaimer.educational_title")}</p>
        <p>{t(bodyKey)}</p>
      </div>
    </div>
  );
}

export function SafetyNoticeBanner({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md border border-warning/40 bg-warning/10 p-3.5 text-[13px] text-foreground",
        className,
      )}
    >
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--warning)]" />
      <div className="space-y-0.5">
        <p className="font-semibold text-foreground">{t("disclaimer.safety_title")}</p>
        <p className="text-muted-foreground">{t("disclaimer.safety_body")}</p>
      </div>
    </div>
  );
}

/**
 * Dashboard-level clinical responsibility statement.
 * Designed to convey the voice of a medical platform, not a chatbot.
 */
export function EducationalUseBanner() {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gold/30 bg-gold/10 text-[color:var(--gold)]">
          <Stethoscope className="h-5 w-5" />
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--gold)]">
            Declaración de responsabilidad clínica
          </p>
          <p className="text-[14px] leading-relaxed text-foreground">
            La Capa de Inteligencia de Ophthalmology Radar es un sistema educativo y bibliográfico
            para oftalmólogos verificados. <span className="font-semibold">No</span> emite
            diagnósticos definitivos, no interpreta imágenes médicas ni recomienda tratamientos
            individualizados. Las decisiones clínicas son responsabilidad exclusiva del profesional
            tratante.
          </p>
          <p className="text-[12px] text-muted-foreground">
            Todas las respuestas se generan a partir de fuentes aprobadas, se muestran con sus citas
            correspondientes y pueden ser revisadas por el comité editorial médico o validadas por
            un líder de opinión clínica (KOL).
          </p>
        </div>
      </div>
    </div>
  );
}
