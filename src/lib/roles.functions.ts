import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OphRole = "admin" | "medical_editor" | "kol" | "verified_doctor" | "industry_user";

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OphRole[]> => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("get_my_roles");
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<{ role: OphRole }>).map((r) => r.role);
  });

export const claimAdminIfEmpty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ roles: OphRole[]; claimed: boolean }> => {
    const { supabase } = context;
    const before = await supabase.rpc("get_my_roles");
    const hadAdmin = ((before.data ?? []) as Array<{ role: OphRole }>).some(
      (r) => r.role === "admin",
    );
    const { data, error } = await supabase.rpc("claim_admin_if_empty");
    if (error) throw new Error(error.message);
    const roles = ((data ?? []) as Array<{ role: OphRole; is_active: boolean }>)
      .filter((r) => r.is_active)
      .map((r) => r.role);
    return { roles, claimed: !hadAdmin && roles.includes("admin") };
  });
