import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  invalidatePlatformSettingsCache,
  type PlatformSettings,
} from "@/lib/ai/platform-settings.server";

async function requireRole(
  supabase: { rpc: (fn: string) => Promise<{ data: unknown; error: { message: string } | null }> },
  allowed: string[],
) {
  const { data, error } = await supabase.rpc("get_my_roles");
  if (error) throw new Error(error.message);
  const roles = (data ?? []) as Array<{ role: string }>;
  if (!roles.some((r) => allowed.includes(r.role))) {
    throw new Error("Forbidden");
  }
}

export const getPlatformSettingsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlatformSettings> => {
    await requireRole(context.supabase as never, ["admin", "medical_editor", "kol"]);
    const { data, error } = await (supabaseAdmin as any)
      .from("or_ai_settings")
      .select("settings")
      .eq("id", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return ((data?.settings as PlatformSettings | null) ?? {}) as PlatformSettings;
  });

const settingsSchema = z.object({
  ai_provider: z.string().max(50).optional(),
  chat_model: z.string().max(120).optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).max(32000).optional(),
  daily_query_limit: z.number().int().min(0).max(100000).optional(),
  monthly_free: z.number().int().min(0).max(1000000).optional(),
  monthly_pro: z.number().int().min(0).max(1000000).optional(),
  monthly_expert: z.number().int().min(0).max(1000000).optional(),
  monthly_cost_usd: z.number().min(0).max(10000000).optional(),
  alert_threshold_pct: z.number().min(0).max(100).optional(),
});

export const savePlatformSettingsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => settingsSchema.parse(d))
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    await requireRole(context.supabase as never, ["admin"]);
    // Merge with the existing settings so a partial save from one Settings tab
    // does not wipe fields owned by another tab.
    const { data: current } = await (supabaseAdmin as any)
      .from("or_ai_settings")
      .select("settings")
      .eq("id", true)
      .maybeSingle();
    const merged = { ...((current?.settings as PlatformSettings | null) ?? {}), ...data };
    const { error } = await (supabaseAdmin as any)
      .from("or_ai_settings")
      .update({
        settings: merged,
        updated_at: new Date().toISOString(),
        updated_by: context.userId,
      })
      .eq("id", true);
    if (error) throw new Error(error.message);
    invalidatePlatformSettingsCache();
    return { ok: true };
  });
