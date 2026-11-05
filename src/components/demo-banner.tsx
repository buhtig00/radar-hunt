import { Info } from "lucide-react";
import { SUPABASE_MODE } from "@/lib/db/client";
import { useI18n } from "@/lib/i18n";

/**
 * Banner shown only when Supabase env vars are NOT configured.
 * Confirms to reviewers that mock data is intentional.
 */
export function DemoModeBanner() {
  const { t } = useI18n();
  if (SUPABASE_MODE === "live") return null;
  return (
    <div className="flex items-center justify-center gap-2 border-b border-border bg-[color:var(--navy)]/95 px-4 py-1.5 text-[11.5px] font-medium text-[color:var(--navy-foreground)]">
      <Info className="h-3.5 w-3.5 text-[color:var(--gold)]" />
      <span>{t("demo.banner")}</span>
    </div>
  );
}
