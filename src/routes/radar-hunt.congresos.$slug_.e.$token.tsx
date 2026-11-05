// Destino de los QR impresos: /radar-hunt/congresos/{slug}/e/{token}
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { LoadingState } from "@/components/empty-loading";
import { useScan } from "@/components/radar-hunt/congress/use-scan";

export const Route = createFileRoute("/radar-hunt/congresos/$slug_/e/$token")({
  head: () => ({
    meta: [{ title: "Estación · Radar Hunt" }, { name: "robots", content: "noindex" }],
  }),
  component: TokenLanding,
});

function TokenLanding() {
  const { slug, token } = Route.useParams();
  const scan = useScan(slug);
  const once = useRef(false);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    void scan.handle(token);
  }, [token, scan]);
  if (!scan.error) return <LoadingState label="Desbloqueando la estación…" />;
  return (
    <div className="mx-auto max-w-md rounded-xl border border-border bg-surface p-6 text-center">
      <p className="text-sm">{scan.error.message}</p>
      <div className="mt-4 flex justify-center gap-2">
        <Link
          to="/radar-hunt/congresos/$slug"
          params={{ slug }}
          className="rounded-md bg-[color:var(--navy)] px-4 py-2 text-sm font-semibold text-white"
        >
          {scan.error.needsJoin ? "Inscribirme y volver a escanear" : "Ir al congreso"}
        </Link>
      </div>
    </div>
  );
}
