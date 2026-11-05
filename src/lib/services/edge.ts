/**
 * Supabase Edge Function bindings.
 *
 * REAL BACKEND INTEGRATION STARTS HERE ⬇
 * - `or-clinical-ai`  → RAG over pgvector, returns structured AIAnswer JSON
 * - `ingest-ai-source` → chunks + embeds a new knowledge source
 *
 * Both calls require the user's anon-key session; service-role lives only
 * inside the edge function runtime.
 */

import { supabase, isSupabaseConfigured } from "@/lib/db/client";

export interface InvokeError {
  message: string;
  status?: number;
}

export async function invokeOrClinicalAI<TResult>(payload: {
  query: string;
  subspecialty: string;
  language: "en" | "es";
  mode: string;
}): Promise<TResult> {
  if (!isSupabaseConfigured || !supabase) {
    throw Object.assign(new Error("Supabase not configured"), { code: "MOCK_MODE" });
  }
  const { data, error } = await supabase.functions.invoke<TResult>("or-clinical-ai", {
    body: payload,
  });
  if (error) throw error;
  return data as TResult;
}

export async function invokeIngestAISource(payload: {
  source_id: string;
  reembed?: boolean;
}): Promise<{ chunks: number }> {
  if (!isSupabaseConfigured || !supabase) {
    throw Object.assign(new Error("Supabase not configured"), { code: "MOCK_MODE" });
  }
  const { data, error } = await supabase.functions.invoke<{ chunks: number }>("ingest-ai-source", {
    body: payload,
  });
  if (error) throw error;
  return data ?? { chunks: 0 };
}
