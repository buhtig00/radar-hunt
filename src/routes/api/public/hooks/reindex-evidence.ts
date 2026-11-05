import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import { reindexEvidenceCorpus } from "@/lib/ai/reindex.server";

// Comparación en tiempo constante para evitar timing attacks sobre el secreto.
// Las cadenas de distinta longitud se rechazan sin filtrar información temporal.
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

// Public hook called by pg_cron weekly. Auth via dedicated REINDEX_WEBHOOK_SECRET.
export const Route = createFileRoute("/api/public/hooks/reindex-evidence")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? request.headers.get("x-api-key");
        const expected = process.env.REINDEX_WEBHOOK_SECRET;
        if (!expected || !apikey || !safeEqual(apikey, expected)) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        try {
          const report = await reindexEvidenceCorpus();
          return new Response(
            JSON.stringify({
              ok: report.ok,
              sources_inserted: report.sources_inserted,
              chunks_inserted: report.chunks_inserted,
              issues: report.issues.length,
              generated_at: report.generated_at,
            }),
            { status: report.ok ? 200 : 207, headers: { "Content-Type": "application/json" } },
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : "reindex_failed";
          console.error("reindex-evidence failed", msg);
          return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
