import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface KnowledgeSourceItem {
  id: string;
  title: string;
  description: string | null;
  source_type: string;
  subspecialty: string;
  approval_status: string;
  is_active: boolean;
  language: string;
  author: string | null;
  created_at: string;
  updated_at: string;
}

const EMERGENCY_KEYWORDS = [
  "endoftalmitis",
  "endophthalmitis",
  "desprendimiento",
  "retinal detachment",
  "oclusión",
  "occlusion",
  "glaucoma agudo",
  "acute glaucoma",
  "angle closure",
  "cierre angular",
  "hifema",
  "hyphema",
  "trauma",
  "quemadura",
  "burn",
  "perforación",
  "perforation",
  "neuritis óptica",
  "optic neuritis",
  "arteritis",
];

export const listKnowledgeSources = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        source_type: z.string().min(1).max(64).optional(),
        approval_status: z
          .enum(["Approved", "Pending Review", "pending_review", "Draft", "Rejected", "Archived"])
          .optional(),
        is_active: z.boolean().optional(),
        search: z.string().max(200).optional(),
        subspecialty: z.string().min(1).max(64).optional(),
        urgency: z.enum(["emergency"]).optional(),
        date_from: z.string().datetime().optional(),
        date_to: z.string().datetime().optional(),
        limit: z.number().int().min(1).max(200).default(100),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }): Promise<KnowledgeSourceItem[]> => {
    const { supabase } = context;
    let q = supabase
      .from("ai_knowledge_sources")
      .select(
        "id,title,description,source_type,subspecialty,approval_status,is_active,language,author,created_at,updated_at",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.source_type) q = q.eq("source_type", data.source_type);
    if (data.approval_status) q = q.eq("approval_status", data.approval_status);
    if (typeof data.is_active === "boolean") q = q.eq("is_active", data.is_active);
    if (data.search) q = q.ilike("title", `%${data.search}%`);
    if (data.subspecialty) {
      const s = data.subspecialty.toLowerCase();
      const variants = Array.from(new Set([s, s.charAt(0).toUpperCase() + s.slice(1)]));
      q = q.in("subspecialty", variants);
    }
    if (data.urgency === "emergency") {
      const ors = EMERGENCY_KEYWORDS.map((k) => `title.ilike.%${k}%,description.ilike.%${k}%`).join(
        ",",
      );
      q = q.or(ors);
    }
    if (data.date_from) q = q.gte("created_at", data.date_from);
    if (data.date_to) q = q.lte("created_at", data.date_to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as KnowledgeSourceItem[];
  });

export const approveAndActivateSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        source_id: z.string().uuid(),
        comment: z.string().trim().max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: audit, error } = await supabase.rpc("approve_and_activate_source", {
      p_source_id: data.source_id,
      p_comment: data.comment ?? undefined,
    });
    if (error) throw new Error(error.message);
    return audit;
  });

export const logSourceDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        source_id: z.string().uuid(),
        decision: z.enum([
          "request_changes",
          "reject",
          "kol_verify",
          "reactivate",
          "deactivate",
          "comment",
        ]),
        comment: z.string().trim().max(1000).optional(),
        new_status: z.enum(["Approved", "Pending Review", "Rejected", "Archived"]).optional(),
        new_active: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: audit, error } = await supabase.rpc("log_source_decision", {
      p_source_id: data.source_id,
      p_decision: data.decision,
      p_comment: data.comment ?? undefined,
      p_new_status: data.new_status ?? undefined,
      p_new_active: data.new_active ?? undefined,
    });
    if (error) throw new Error(error.message);
    return audit;
  });

export interface SourceAuditRow {
  id: string;
  source_id: string;
  actor_user_id: string | null;
  actor_role: string | null;
  decision: string;
  prev_status: string | null;
  new_status: string | null;
  prev_is_active: boolean | null;
  new_is_active: boolean | null;
  comment: string | null;
  created_at: string;
  source_title?: string | null;
}

export const listSourceAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        source_id: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(200).default(100),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }): Promise<SourceAuditRow[]> => {
    const { supabase } = context;
    let q = supabase
      .from("ai_source_audit")
      .select(
        "id,source_id,actor_user_id,actor_role,decision,prev_status,new_status,prev_is_active,new_is_active,comment,created_at,ai_knowledge_sources(title)",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.source_id) q = q.eq("source_id", data.source_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      source_id: r.source_id,
      actor_user_id: r.actor_user_id,
      actor_role: r.actor_role,
      decision: r.decision,
      prev_status: r.prev_status,
      new_status: r.new_status,
      prev_is_active: r.prev_is_active,
      new_is_active: r.new_is_active,
      comment: r.comment,
      created_at: r.created_at,
      source_title: r.ai_knowledge_sources?.title ?? null,
    }));
  });
