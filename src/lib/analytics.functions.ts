import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface AnalyticsKpis {
  total_interactions: number;
  interactions_this_month: number;
  top_subspecialty: string | null;
  top_subspecialty_count: number;
  usefulness_pct: number | null;
  safety_events: number;
  safety_critical: number;
  kol_requests: number;
  approved_sources: number;
}

async function requireAnalyticsRole(supabase: {
  rpc: (fn: string) => Promise<{ data: unknown; error: { message: string } | null }>;
}) {
  const { data, error } = await supabase.rpc("get_my_roles");
  if (error) throw new Error(error.message);
  const roles = (data ?? []) as Array<{ role: string }>;
  if (!roles.some((r) => ["admin", "medical_editor", "kol"].includes(r.role))) {
    throw new Error("Forbidden: analytics role required");
  }
}

async function headCount(build: {
  count: number | null;
  error: { message: string } | null;
}): Promise<number> {
  if (build.error) return 0;
  return build.count ?? 0;
}

export const getAnalyticsKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AnalyticsKpis> => {
    await requireAnalyticsRole(context.supabase as never);

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

    const db = supabaseAdmin as never as {
      from: (t: string) => any;
    };

    const total_interactions = await headCount(
      await db.from("ai_interactions").select("id", { count: "exact", head: true }),
    );
    const interactions_this_month = await headCount(
      await db
        .from("ai_interactions")
        .select("id", { count: "exact", head: true })
        .gte("created_at", monthStart),
    );
    const safety_events = await headCount(
      await db.from("ai_safety_events").select("id", { count: "exact", head: true }),
    );
    const safety_critical = await headCount(
      await db
        .from("ai_safety_events")
        .select("id", { count: "exact", head: true })
        .eq("severity", "critical"),
    );
    const kol_requests = await headCount(
      await db
        .from("ai_feedback")
        .select("id", { count: "exact", head: true })
        .eq("rating", "needs_kol"),
    );
    const approved_sources = await headCount(
      await db
        .from("ai_knowledge_sources")
        .select("id", { count: "exact", head: true })
        .eq("approval_status", "Approved")
        .eq("is_active", true),
    );

    // Usefulness ratio from feedback.
    const totalFeedback = await headCount(
      await db.from("ai_feedback").select("id", { count: "exact", head: true }),
    );
    const usefulFeedback = await headCount(
      await db
        .from("ai_feedback")
        .select("id", { count: "exact", head: true })
        .eq("rating", "useful"),
    );
    const usefulness_pct =
      totalFeedback > 0 ? Math.round((usefulFeedback / totalFeedback) * 100) : null;

    // Most active subspecialty this month (tally over a bounded sample).
    const { data: subRows } = await db
      .from("ai_interactions")
      .select("subspecialty")
      .gte("created_at", monthStart)
      .not("subspecialty", "is", null)
      .limit(2000);
    const tally: Record<string, number> = {};
    for (const r of (subRows ?? []) as Array<{ subspecialty: string | null }>) {
      const s = r.subspecialty;
      if (s) tally[s] = (tally[s] ?? 0) + 1;
    }
    let top_subspecialty: string | null = null;
    let top_subspecialty_count = 0;
    for (const [s, n] of Object.entries(tally)) {
      if (n > top_subspecialty_count) {
        top_subspecialty = s;
        top_subspecialty_count = n;
      }
    }

    return {
      total_interactions,
      interactions_this_month,
      top_subspecialty,
      top_subspecialty_count,
      usefulness_pct,
      safety_events,
      safety_critical,
      kol_requests,
      approved_sources,
    };
  });
