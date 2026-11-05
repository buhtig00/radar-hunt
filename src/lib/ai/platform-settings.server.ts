// Server-only access to the persisted platform settings (or_ai_settings).
// Cached in-process with a short TTL so the AI gateway can read the configured
// model without a DB round-trip on every call.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface PlatformSettings {
  ai_provider?: string;
  chat_model?: string;
  temperature?: number;
  max_tokens?: number;
  // Usage limits. Only daily_query_limit is currently enforced (per user, in
  // enforceDailyQuota); the plan/cost fields are persisted for the admin UI.
  daily_query_limit?: number;
  monthly_free?: number;
  monthly_pro?: number;
  monthly_expert?: number;
  monthly_cost_usd?: number;
  alert_threshold_pct?: number;
}

// Fallback chain for the chat model: DB setting → env → default.
const DEFAULT_CHAT_MODEL = "openai/gpt-4.1-mini";

let cache: { at: number; value: PlatformSettings } | null = null;
const TTL_MS = 30_000;

export async function getPlatformSettings(): Promise<PlatformSettings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  // or_ai_settings is not in the generated Database types yet; cast like the
  // rest of the codebase does for newer tables.
  const { data, error } = await (supabaseAdmin as any)
    .from("or_ai_settings")
    .select("settings")
    .eq("id", true)
    .maybeSingle();
  if (error) {
    console.error("getPlatformSettings error", error);
    return cache?.value ?? {};
  }
  const value = ((data?.settings as PlatformSettings | null) ?? {}) as PlatformSettings;
  cache = { at: Date.now(), value };
  return value;
}

/** Invalidate the cache after a write so the next read is fresh. */
export function invalidatePlatformSettingsCache(): void {
  cache = null;
}

/** Resolve the chat model to use: DB → env → default. */
export async function resolveChatModel(): Promise<string> {
  const s = await getPlatformSettings();
  return s.chat_model || process.env.AI_CHAT_MODEL || DEFAULT_CHAT_MODEL;
}
