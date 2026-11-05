/**
 * Knowledge Source service.
 *
 * REAL BACKEND INTEGRATION STARTS HERE ⬇
 * When Supabase is configured, this module talks to `public.ai_knowledge_sources`
 * via the anon key (RLS-enforced). When not configured, it returns mock data
 * so demos keep working.
 */

import { supabase, isSupabaseConfigured } from "@/lib/db/client";
import type { AIKnowledgeSourceRow, DBApprovalStatus } from "@/lib/db/types";
import { KNOWLEDGE_SOURCES } from "@/lib/mock-data";
import type { KnowledgeSource } from "@/lib/types";

function rowToSource(r: AIKnowledgeSourceRow): KnowledgeSource {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    source_type: r.source_type,
    subspecialty: r.subspecialty as KnowledgeSource["subspecialty"],
    pathology: r.pathology ?? undefined,
    language: r.language,
    author: r.author ?? "—",
    external_url: r.external_url ?? undefined,
    publication_date: r.publication_date ?? undefined,
    evidence_level: r.evidence_level ?? undefined,
    approval_status: r.approval_status,
    is_active: r.is_active,
    last_reviewed_at: r.last_reviewed_at ?? undefined,
    kol_validator: r.kol_validator ?? undefined,
    validation_level: r.validation_level ?? undefined,
  };
}

export async function fetchKnowledgeSources(): Promise<KnowledgeSource[]> {
  if (!isSupabaseConfigured || !supabase) {
    // MOCK FALLBACK
    return KNOWLEDGE_SOURCES;
  }
  const { data, error } = await supabase
    .from("ai_knowledge_sources")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as AIKnowledgeSourceRow[]).map(rowToSource);
}

export type CreateKnowledgeSourceInput = Omit<
  KnowledgeSource,
  "id" | "is_active" | "approval_status" | "last_reviewed_at"
> & {
  approval_status?: DBApprovalStatus;
};

export async function createKnowledgeSource(
  input: CreateKnowledgeSourceInput,
): Promise<KnowledgeSource> {
  if (!isSupabaseConfigured || !supabase) {
    // MOCK FALLBACK — return a local representation only
    return {
      ...input,
      id: `mock-${Date.now()}`,
      is_active: true,
      approval_status: input.approval_status ?? "Pending Review",
    };
  }
  const { data, error } = await supabase
    .from("ai_knowledge_sources")
    .insert({
      title: input.title,
      description: input.description,
      source_type: input.source_type,
      subspecialty: input.subspecialty,
      pathology: input.pathology,
      language: input.language,
      author: input.author,
      external_url: input.external_url,
      publication_date: input.publication_date,
      evidence_level: input.evidence_level,
      validation_level: input.validation_level,
      approval_status: input.approval_status ?? "Pending Review",
      is_active: false,
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToSource(data as AIKnowledgeSourceRow);
}

export async function updateApprovalStatus(id: string, status: DBApprovalStatus): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from("ai_knowledge_sources")
    .update({
      approval_status: status,
      is_active: status === "Approved",
      last_reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}
