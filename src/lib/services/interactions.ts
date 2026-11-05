/**
 * AI Interactions service — query history, feedback, safety events.
 *
 * REAL BACKEND INTEGRATION STARTS HERE ⬇
 */

import { supabase, isSupabaseConfigured } from "@/lib/db/client";
import type { AIFeedbackRow, AIInteractionRow, AISafetyEventRow } from "@/lib/db/types";

export async function fetchAIInteractions(limit = 50): Promise<AIInteractionRow[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from("ai_interactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as AIInteractionRow[];
}

export interface FeedbackInput {
  interaction_id: string;
  rating: AIFeedbackRow["rating"];
  comment?: string;
}

export async function sendFeedback(input: FeedbackInput): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    // MOCK FALLBACK — silently accept feedback in demo mode
    console.info("[mock] feedback recorded", input);
    return;
  }
  const { error } = await supabase.from("ai_feedback").insert({
    interaction_id: input.interaction_id,
    rating: input.rating,
    comment: input.comment ?? null,
  });
  if (error) throw error;
}

export async function logSafetyEvent(
  event: Omit<AISafetyEventRow, "id" | "created_at">,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.from("ai_safety_events").insert(event);
  if (error) throw error;
}
