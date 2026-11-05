import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SUBSPECIALTY = z.enum([
  "retina",
  "glaucoma",
  "cornea",
  "ocular_surface",
  "cataract",
  "refractive",
  "uveitis",
  "oculoplastics",
  "neuro_ophthalmology",
  "pediatric_ophthalmology",
  "strabismus",
  "contactology",
  "low_vision",
  "ocular_oncology",
  "ocular_trauma",
  "emergency_ophthalmology",
  "general_ophthalmology",
]);

const MED_CLASS = z.enum([
  "anti_vegf",
  "corticosteroid",
  "antibiotic",
  "antiviral",
  "antifungal",
  "anti_inflammatory_nsaid",
  "immunomodulator",
  "immunosuppressant",
  "glaucoma_prostaglandin",
  "glaucoma_beta_blocker",
  "glaucoma_alpha_agonist",
  "glaucoma_carbonic_anhydrase_inhibitor",
  "glaucoma_rho_kinase_inhibitor",
  "glaucoma_miotic",
  "mydriatic_cycloplegic",
  "lubricant_artificial_tear",
  "osmotic_agent",
  "diagnostic_dye",
  "local_anesthetic",
  "anti_allergic",
  "anti_fibrotic",
  "other",
]);

const MED_ROUTE = z.enum([
  "topical",
  "intravitreal",
  "subconjunctival",
  "subtenon",
  "intracameral",
  "periocular",
  "oral",
  "intravenous",
  "implant",
  "other",
]);

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const PathologyInput = z.object({
  id: z.string().uuid().optional(),
  name_es: z.string().min(2).max(200),
  name_en: z.string().min(2).max(200),
  subspecialty: SUBSPECIALTY,
  definition_es: z.string().max(4000).optional().nullable(),
  definition_en: z.string().max(4000).optional().nullable(),
  clinical_features_es: z.string().max(8000).optional().nullable(),
  treatment_overview_es: z.string().max(8000).optional().nullable(),
  red_flags_es: z.string().max(4000).optional().nullable(),
});

export const upsertPathology = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => PathologyInput.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const payload: any = {
      ...data,
      slug: slugify(`${data.name_en}-${data.subspecialty}`),
      status: "draft",
      is_active: false,
    };
    if (data.id) {
      const { id, ...rest } = payload;
      const { error } = await supabase.from("oph_pathologies").update(rest).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabase
      .from("oph_pathologies")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id as string };
  });

const MedicationInput = z.object({
  id: z.string().uuid().optional(),
  generic_name_en: z.string().min(2).max(200),
  generic_name_es: z.string().max(200).optional().nullable(),
  brand_names: z.array(z.string().max(120)).max(20).default([]),
  medication_class: MED_CLASS,
  route: MED_ROUTE,
  mechanism_es: z.string().max(4000).optional().nullable(),
  common_uses_es: z.string().max(4000).optional().nullable(),
  warnings_es: z.string().max(4000).optional().nullable(),
  adverse_effects_es: z.string().max(4000).optional().nullable(),
  is_prescription: z.boolean().default(true),
});

export const upsertMedication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => MedicationInput.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const payload: any = { ...data, status: "draft", is_active: false };
    if (data.id) {
      const { id, ...rest } = payload;
      const { error } = await supabase.from("oph_medications").update(rest).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabase
      .from("oph_medications")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id as string };
  });

export const listRecentContent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [p, m] = await Promise.all([
      supabase
        .from("oph_pathologies")
        .select("id, name_es, subspecialty, status, updated_at")
        .order("updated_at", { ascending: false })
        .limit(15),
      supabase
        .from("oph_medications")
        .select("id, generic_name_es, generic_name_en, medication_class, status, updated_at")
        .order("updated_at", { ascending: false })
        .limit(15),
    ]);
    return {
      pathologies: (p.data ?? []) as any[],
      medications: (m.data ?? []) as any[],
    };
  });
