import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const OPH_TABLES = [
  "oph_pathologies",
  "oph_medications",
  "oph_guidelines",
  "oph_classifications",
  "oph_protocols",
  "oph_devices",
] as const;
type OphTable = (typeof OPH_TABLES)[number];

const TITLE_COLUMN: Record<OphTable, string> = {
  oph_pathologies: "name_es",
  oph_medications: "generic_name_es",
  oph_guidelines: "title",
  oph_classifications: "name",
  oph_protocols: "title_es",
  oph_devices: "name",
};

export interface EditorialItem {
  table: OphTable;
  id: string;
  title: string;
  subspecialty: string | null;
  status: string;
  updated_at: string;
}

export const listPendingEditorial = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EditorialItem[]> => {
    const { supabase } = context;
    const out: EditorialItem[] = [];
    for (const table of OPH_TABLES) {
      const titleCol = TITLE_COLUMN[table];
      const { data, error } = await (supabase as any)
        .from(table)
        .select(`id, ${titleCol}, subspecialty, status, updated_at`)
        .in("status", ["draft", "pending_review", "needs_update"])
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) continue;
      for (const row of (data ?? []) as Array<Record<string, unknown>>) {
        out.push({
          table,
          id: String(row.id),
          title: String(row[titleCol] ?? "(sin título)"),
          subspecialty: (row.subspecialty as string) ?? null,
          status: String(row.status),
          updated_at: String(row.updated_at),
        });
      }
    }
    return out;
  });

export const setEditorialStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        table: z.enum(OPH_TABLES),
        id: z.string().uuid(),
        status: z.enum([
          "draft",
          "pending_review",
          "approved",
          "needs_update",
          "rejected",
          "archived",
        ]),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc("oph_set_status", {
      p_table: data.table,
      p_id: data.id,
      p_status: data.status,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Closed feedback loop: surface AI answers that received negative feedback so
// the editorial/KOL team can review them. RLS restricts each user to their own
// interactions, so this reads cross-user data with the service role behind an
// explicit editorial-role gate.
// ---------------------------------------------------------------------------
const NEGATIVE_RATINGS = ["not_useful", "needs_kol", "incomplete", "error"] as const;

export interface FlaggedAIAnswer {
  interaction_id: string;
  mode: string;
  subspecialty: string | null;
  language: string;
  query_excerpt: string;
  validation_level: string;
  safety_flags: string[];
  rating: string;
  comment: string | null;
  feedback_at: string;
}

async function requireEditorialRole(supabase: {
  rpc: (fn: string) => Promise<{ data: unknown; error: { message: string } | null }>;
}) {
  const { data, error } = await supabase.rpc("get_my_roles");
  if (error) throw new Error(error.message);
  const roles = (data ?? []) as Array<{ role: string }>;
  if (!roles.some((r) => ["admin", "medical_editor", "kol"].includes(r.role))) {
    throw new Error("Forbidden: editorial role required");
  }
}

export const listFlaggedAIAnswers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FlaggedAIAnswer[]> => {
    await requireEditorialRole(context.supabase as never);

    // `as any` mirrors the embed-select pattern used elsewhere in this file to
    // avoid PostgREST relationship typing friction on the nested join.
    const { data, error } = await (supabaseAdmin as any)
      .from("ai_feedback")
      .select(
        "rating, comment, created_at, interaction_id, ai_interactions(mode, subspecialty, language, query, validation_level, safety_flags)",
      )
      .in("rating", NEGATIVE_RATINGS as unknown as string[])
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const out: FlaggedAIAnswer[] = [];
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      const it = row.ai_interactions as Record<string, unknown> | null;
      if (!it) continue;
      out.push({
        interaction_id: String(row.interaction_id ?? ""),
        mode: String(it.mode ?? ""),
        subspecialty: (it.subspecialty as string) ?? null,
        language: String(it.language ?? ""),
        query_excerpt: String(it.query ?? "").slice(0, 240),
        validation_level: String(it.validation_level ?? ""),
        safety_flags: (it.safety_flags as string[]) ?? [],
        rating: String(row.rating ?? ""),
        comment: (row.comment as string) ?? null,
        feedback_at: String(row.created_at ?? ""),
      });
    }
    return out;
  });
