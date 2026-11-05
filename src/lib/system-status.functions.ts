import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { demoGatedEnv } from "@/lib/app-deploy";

export type CheckStatus = "ok" | "warn" | "error";
export interface Check {
  key: string;
  label: string;
  status: CheckStatus;
  detail: string;
  latency_ms?: number;
}
export interface SystemStatus {
  generated_at: string;
  supabase_url: string;
  checks: Check[];
  counts: Record<string, number | null>;
}

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const t0 = Date.now();
  const result = await fn();
  return { result, ms: Date.now() - t0 };
}

export const getSystemStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SystemStatus> => {
    const { data: rolesData, error: rolesErr } = await context.supabase.rpc("get_my_roles");
    if (rolesErr) throw new Error(rolesErr.message);
    const roles = (rolesData ?? []) as Array<{ role: string }>;
    if (!roles.some((r) => r.role === "admin")) {
      throw new Error("Forbidden: admin role required");
    }
    const checks: Check[] = [];
    const counts: Record<string, number | null> = {};

    // 1. Env
    const url = demoGatedEnv(process.env.SUPABASE_URL) ?? "";
    const hasService = !!demoGatedEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const hasPub = !!demoGatedEnv(process.env.SUPABASE_PUBLISHABLE_KEY);
    checks.push({
      key: "env",
      label: "Variables de entorno",
      status: url && hasService && hasPub ? "ok" : "error",
      detail: `URL ${url ? "✓" : "✗"} · publishable ${hasPub ? "✓" : "✗"} · service role ${hasService ? "✓" : "✗"}`,
    });

    // 2. DB
    try {
      const { ms } = await timed(async () => {
        const { error } = await supabaseAdmin
          .from("oph_pathologies")
          .select("id", { count: "exact", head: true });
        if (error) throw error;
      });
      checks.push({
        key: "db",
        label: "Base de datos (PostgREST)",
        status: "ok",
        detail: "Consulta de prueba OK",
        latency_ms: ms,
      });
    } catch (e) {
      checks.push({
        key: "db",
        label: "Base de datos (PostgREST)",
        status: "error",
        detail: (e as Error).message,
      });
    }

    // 3. Counts of oph_* tables
    const tables = [
      "oph_pathologies",
      "oph_medications",
      "oph_guidelines",
      "oph_classifications",
      "oph_protocols",
      "oph_devices",
    ] as const;
    for (const t of tables) {
      try {
        const { count, error } = await supabaseAdmin
          .from(t)
          .select("id", { count: "exact", head: true });
        if (error) throw error;
        counts[t] = count ?? 0;
      } catch {
        counts[t] = null;
      }
    }
    const totalCounts = Object.values(counts).reduce<number>((a, b) => a + (b ?? 0), 0);
    checks.push({
      key: "oph_tables",
      label: "Tablas clínicas oph_*",
      status: Object.values(counts).every((v) => v !== null)
        ? totalCounts > 0
          ? "ok"
          : "warn"
        : "error",
      detail: `${totalCounts} registros en ${tables.length} tablas`,
    });

    // 4. Auth
    try {
      const { ms, result } = await timed(async () => {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
        if (error) throw error;
        return data;
      });
      checks.push({
        key: "auth",
        label: "Autenticación",
        status: "ok",
        detail: `Servicio activo · ${result.users.length} usuario(s) en página 1`,
        latency_ms: ms,
      });
    } catch (e) {
      checks.push({
        key: "auth",
        label: "Autenticación",
        status: "error",
        detail: (e as Error).message,
      });
    }

    // 5. Storage
    try {
      const { ms, result } = await timed(async () => {
        const { data, error } = await supabaseAdmin.storage.listBuckets();
        if (error) throw error;
        return data;
      });
      checks.push({
        key: "storage",
        label: "Almacenamiento",
        status: result.length > 0 ? "ok" : "warn",
        detail:
          result.length > 0
            ? `${result.length} bucket(s): ${result.map((b) => b.name).join(", ")}`
            : "Sin buckets configurados",
        latency_ms: ms,
      });
    } catch (e) {
      checks.push({
        key: "storage",
        label: "Almacenamiento",
        status: "error",
        detail: (e as Error).message,
      });
    }

    // 6. RPC
    try {
      const { ms } = await timed(async () => {
        const { error } = await supabaseAdmin.rpc("get_my_roles");
        // expected to "succeed" (returns empty) when service role calls — auth.uid() is null
        if (error && !/auth\.uid/i.test(error.message)) throw error;
      });
      checks.push({
        key: "rpc",
        label: "Funciones RPC",
        status: "ok",
        detail: "get_my_roles accesible",
        latency_ms: ms,
      });
    } catch (e) {
      checks.push({
        key: "rpc",
        label: "Funciones RPC",
        status: "error",
        detail: (e as Error).message,
      });
    }

    // 7. AI gateway key
    checks.push({
      key: "ai_key",
      label: "Lovable AI Gateway",
      status: process.env.LOVABLE_API_KEY ? "ok" : "warn",
      detail: process.env.LOVABLE_API_KEY
        ? "API key configurada"
        : "LOVABLE_API_KEY no configurada",
    });

    // 8. Vector / RAG
    try {
      const { count, error } = await supabaseAdmin
        .from("ai_chunks")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      counts["ai_chunks"] = count ?? 0;
      const { count: srcCount } = await supabaseAdmin
        .from("ai_knowledge_sources")
        .select("id", { count: "exact", head: true });
      counts["ai_knowledge_sources"] = srcCount ?? 0;
      checks.push({
        key: "rag",
        label: "RAG · embeddings",
        status: (count ?? 0) > 0 ? "ok" : "warn",
        detail: `${count ?? 0} chunks · ${srcCount ?? 0} fuentes`,
      });
    } catch (e) {
      checks.push({
        key: "rag",
        label: "RAG · embeddings",
        status: "error",
        detail: (e as Error).message,
      });
    }

    return {
      generated_at: new Date().toISOString(),
      supabase_url: url,
      checks,
      counts,
    };
  });
