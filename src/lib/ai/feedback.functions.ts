import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RATINGS = ["useful", "not_useful", "needs_kol", "incomplete", "error"] as const;

const inputSchema = z.object({
  interaction_id: z.string().uuid(),
  rating: z.enum(RATINGS),
  comment: z.string().max(2000).optional(),
});

export const submitAIFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("ai_feedback").insert({
      interaction_id: data.interaction_id,
      rating: data.rating,
      comment: data.comment ?? null,
      user_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
