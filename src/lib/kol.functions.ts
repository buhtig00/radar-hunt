import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

export interface KolItem {
  table: OphTable;
  id: string;
  title: string;
  subspecialty: string | null;
  reviewed_at: string | null;
  next_review_at: string | null;
  kol_verified: boolean;
}

export const listKolQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        scope: z.enum(["pending", "verified"]).default("pending"),
        limit: z.number().int().min(1).max(200).default(50),
      })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<KolItem[]> => {
    const { supabase } = context;
    const out: KolItem[] = [];
    for (const table of OPH_TABLES) {
      const titleCol = TITLE_COLUMN[table];
      let q = (supabase as any)
        .from(table)
        .select(`id, ${titleCol}, subspecialty, reviewed_at, next_review_at, kol_validator_id`)
        .eq("status", "approved")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(data.limit);
      q =
        data.scope === "pending"
          ? q.is("kol_validator_id", null)
          : q.not("kol_validator_id", "is", null);
      const { data: rows, error } = await q;
      if (error) continue;
      for (const row of (rows ?? []) as Array<Record<string, unknown>>) {
        out.push({
          table,
          id: String(row.id),
          title: String(row[titleCol] ?? "(sin título)"),
          subspecialty: (row.subspecialty as string) ?? null,
          reviewed_at: (row.reviewed_at as string) ?? null,
          next_review_at: (row.next_review_at as string) ?? null,
          kol_verified: row.kol_validator_id != null,
        });
      }
    }
    return out;
  });

export const markKolVerified = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ table: z.enum(OPH_TABLES), id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc("oph_mark_kol_verified", {
      p_table: data.table,
      p_id: data.id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
