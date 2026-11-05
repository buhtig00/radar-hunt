// Server-only persistence for AI interactions, safety events and feedback.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function persistInteraction(args: {
  mode: string;
  subspecialty?: string | null;
  language: string;
  query: string;
  answer: Record<string, unknown>;
  validation_level?: string;
  safety_flags?: string[];
  sources_used?: string[];
  latency_ms?: number;
  user_id?: string | null;
  role?: string | null;
}): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("ai_interactions")
    .insert({
      mode: args.mode,
      subspecialty: args.subspecialty ?? null,
      language: args.language,
      query: args.query,
      answer: args.answer as never,
      validation_level: args.validation_level ?? "AI Generated",
      safety_flags: args.safety_flags ?? [],
      sources_used: args.sources_used ?? [],
      latency_ms: args.latency_ms ?? null,
      user_id: args.user_id ?? null,
      role: args.role ?? null,
    })
    .select("id")
    .single();
  if (error) {
    console.error("persistInteraction error", error);
    return null;
  }
  return data?.id ?? null;
}

export async function persistSafetyEvent(args: {
  interaction_id: string | null;
  severity: "info" | "warning" | "critical";
  categories: string[];
  matched_terms: string[];
  query_excerpt?: string;
  action_taken?: string;
  user_id?: string | null;
}): Promise<void> {
  if (!args.categories.length && !args.matched_terms.length) return;
  const { error } = await supabaseAdmin.from("ai_safety_events").insert({
    interaction_id: args.interaction_id,
    severity: args.severity,
    categories: args.categories,
    matched_terms: args.matched_terms,
    query_excerpt: args.query_excerpt ?? null,
    action_taken: args.action_taken ?? null,
    user_id: args.user_id ?? null,
  });
  if (error) console.error("persistSafetyEvent error", error);
}
