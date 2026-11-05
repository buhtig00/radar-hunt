import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { reindexEvidenceCorpus, getLastQualityReport, type QualityReport } from "./reindex.server";
import { seedKnowledgeBlocks, type SeedBlocksReport } from "./seed-blocks.server";

async function requireAdmin(supabase: {
  rpc: (fn: string) => Promise<{ data: unknown; error: { message: string } | null }>;
}) {
  const { data, error } = await supabase.rpc("get_my_roles");
  if (error) throw new Error(error.message);
  const roles = (data ?? []) as Array<{ role: string }>;
  if (!roles.some((r) => r.role === "admin")) {
    throw new Error("Forbidden: admin role required");
  }
}

export const indexEvidenceCorpus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<QualityReport> => {
    await requireAdmin(context.supabase as never);
    return reindexEvidenceCorpus();
  });

export const getEvidenceQualityReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<QualityReport | null> => {
    await requireAdmin(context.supabase as never);
    return getLastQualityReport();
  });

export const seedKnowledgeBlocksFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SeedBlocksReport> => {
    await requireAdmin(context.supabase as never);
    return seedKnowledgeBlocks();
  });
