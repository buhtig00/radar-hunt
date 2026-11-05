/**
 * Supabase client (browser-safe, anon key only).
 *
 * Falls back to `null` when env vars are not configured — the service layer
 * detects this and serves mock data instead, so the UI keeps working during
 * design reviews, investor demos and pharma walkthroughs.
 *
 * NEVER import the service role key in this file. Service-role operations
 * belong in Supabase Edge Functions (or-clinical-ai, ingest-ai-source).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { demoGatedEnv } from "@/lib/app-deploy";

// APP_FORCE_DEMO (src/lib/app-deploy.ts) desactiva Supabase aunque haya variables.
const url = demoGatedEnv(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const anonKey = demoGatedEnv(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

/** Resolved at runtime so consumers can show a clear "Mock mode" indicator. */
export const SUPABASE_MODE: "live" | "mock" = isSupabaseConfigured ? "live" : "mock";
