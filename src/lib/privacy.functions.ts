import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface ErasureReport {
  interactions_deleted: number;
  feedback_deleted: number;
  safety_events_deleted: number;
}

// GDPR right-to-erasure: lets a signed-in user delete their own AI data. Scoped
// strictly to context.userId (never a client-supplied id) and executed with the
// service role so the cascade is complete regardless of RLS read scope.
export const deleteMyAIData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ErasureReport> => {
    const userId = context.userId;
    if (!userId) throw new Error("Unauthorized");

    const db = supabaseAdmin as never as { from: (t: string) => any };

    const delCount = async (table: string): Promise<number> => {
      const { count, error } = await db
        .from(table)
        .delete({ count: "exact" })
        .eq("user_id", userId);
      if (error) throw new Error(`${table}: ${error.message}`);
      return count ?? 0;
    };

    // Feedback first (FK to interactions), then safety events, then interactions.
    const feedback_deleted = await delCount("ai_feedback");
    const safety_events_deleted = await delCount("ai_safety_events");
    const interactions_deleted = await delCount("ai_interactions");

    return { interactions_deleted, feedback_deleted, safety_events_deleted };
  });
