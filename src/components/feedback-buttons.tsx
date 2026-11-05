import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, AlertCircle, FilePlus, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { submitAIFeedback } from "@/lib/ai/feedback.functions";

const OPTIONS = [
  { id: "useful", rating: "useful" as const, labelKey: "feedback.useful", icon: ThumbsUp },
  {
    id: "not-useful",
    rating: "not_useful" as const,
    labelKey: "feedback.not-useful",
    icon: ThumbsDown,
  },
  {
    id: "incomplete",
    rating: "incomplete" as const,
    labelKey: "feedback.incomplete",
    icon: FilePlus,
  },
  { id: "error", rating: "error" as const, labelKey: "feedback.error", icon: AlertCircle },
  { id: "kol", rating: "needs_kol" as const, labelKey: "feedback.kol", icon: BadgeCheck },
] as const;

export function FeedbackButtons({ interactionId }: { interactionId?: string | null }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground mr-1">
        {t("feedback.label")}
      </span>
      {OPTIONS.map((o) => {
        const Icon = o.icon;
        const active = selected === o.id;
        const label = t(o.labelKey);
        return (
          <Button
            key={o.id}
            variant={active ? "default" : "outline"}
            size="sm"
            className="h-8 gap-1.5"
            disabled={pending !== null}
            onClick={async () => {
              if (!interactionId) {
                setSelected(o.id);
                toast.success(`${t("feedback.toast")}: ${label}`);
                return;
              }
              try {
                setPending(o.id);
                await submitAIFeedback({
                  data: { interaction_id: interactionId, rating: o.rating },
                });
                setSelected(o.id);
                toast.success(`${t("feedback.toast")}: ${label}`);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "No se pudo enviar el feedback");
              } finally {
                setPending(null);
              }
            }}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Button>
        );
      })}
      {interactionId ? (
        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
          ID {interactionId.slice(0, 8)}
        </span>
      ) : null}
    </div>
  );
}
