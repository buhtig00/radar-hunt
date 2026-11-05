// Hoja imprimible con un póster por estación: QR (token rotable) + código manual.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { rhc } from "@/lib/radar-hunt/congress/service";
import { stationUrl } from "@/lib/radar-hunt/congress/tokens";
import { LoadingState } from "@/components/empty-loading";
import { QrImage } from "@/components/radar-hunt/congress/qr";

export const Route = createFileRoute("/radar-hunt/congresos/$slug_/qr")({
  head: () => ({ meta: [{ title: "Códigos QR de las estaciones · Radar Hunt" }] }),
  component: QrSheet,
});

function QrSheet() {
  const { slug } = Route.useParams();
  const q = useQuery({
    queryKey: ["rhc", "tokens", slug],
    queryFn: () => rhc.stationTokens(slug),
    retry: false,
  });
  if (q.isLoading) return <LoadingState label="Generando los códigos…" />;
  if (q.error || !q.data)
    return <p className="text-sm text-destructive">{(q.error as Error)?.message}</p>;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <div className="flex flex-col gap-4">
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #rh-qr-sheet, #rh-qr-sheet * { visibility: visible !important; }
        #rh-qr-sheet { position: absolute; inset: 0; }
        .rh-poster { break-inside: avoid; page-break-inside: avoid; }
      }`}</style>
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          to="/radar-hunt/congresos/$slug/admin"
          params={{ slug }}
          className="flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Organización
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-md bg-[color:var(--navy)] px-4 py-2 text-sm font-semibold text-white"
        >
          <Printer className="h-4 w-4" /> Imprimir
        </button>
      </div>
      <p className="text-sm text-muted-foreground print:hidden">
        Si un código se filtra, rótalo desde «Estaciones y QR» y vuelve a imprimir: el anterior deja
        de funcionar.
      </p>
      <div id="rh-qr-sheet" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {q.data.stations.map((s) => (
          <div
            key={s.id}
            className="rh-poster flex flex-col items-center gap-2 rounded-2xl border-2 border-[#0b1f3a] bg-white p-5 text-center text-[#0b1f3a]"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#c9a227]">
              Radar Hunt · {q.data.event.name}
            </div>
            <div className="font-serif text-2xl font-bold">
              {s.label} · {s.title}
            </div>
            <QrImage text={stationUrl(origin, q.data.event.slug, s.token)} size={200} />
            <div className="text-xs">Escanea con la cámara del móvil o escribe el código:</div>
            <div className="font-mono text-xl font-bold tracking-[0.3em]">{s.manualCode}</div>
            <div className="text-[10px] text-[#6b778a]">Play. Learn. Discover.</div>
          </div>
        ))}
      </div>
    </div>
  );
}
