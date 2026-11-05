// Server-only per-user daily quota for AI calls. Counts today's interactions in
// ai_interactions (no extra table needed) and throws before any expensive
// embedding/LLM work once the limit is reached. Fails open on DB errors so an
// infrastructure hiccup never blocks legitimate clinical use.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getPlatformSettings } from "./platform-settings.server";

const DEFAULT_DAILY_LIMIT = 100;

async function resolveDailyLimit(): Promise<number> {
  // Precedence: persisted admin setting → env → default.
  const settings = await getPlatformSettings();
  if (typeof settings.daily_query_limit === "number") return settings.daily_query_limit;
  const raw = process.env.AI_DAILY_QUERY_LIMIT;
  return raw !== undefined ? Number(raw) : DEFAULT_DAILY_LIMIT;
}

export async function enforceDailyQuota(userId: string | null | undefined): Promise<void> {
  if (!userId) return;

  const limit = await resolveDailyLimit();
  // A non-positive / invalid limit disables the quota entirely.
  if (!Number.isFinite(limit) || limit <= 0) return;

  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabaseAdmin
    .from("ai_interactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", start.toISOString());

  if (error) {
    console.error("quota check error", error);
    return; // fail open
  }

  if ((count ?? 0) >= limit) {
    throw new Error(
      `Has alcanzado el límite diario de ${limit} consultas de IA. ` +
        "Inténtalo de nuevo mañana o contacta con tu administrador.",
    );
  }
}
