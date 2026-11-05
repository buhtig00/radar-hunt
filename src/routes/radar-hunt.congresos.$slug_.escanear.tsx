import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ScanLine } from "lucide-react";
import { QrScanner } from "@/components/radar-hunt/congress/qr";
import { useScan } from "@/components/radar-hunt/congress/use-scan";

export const Route = createFileRoute("/radar-hunt/congresos/$slug_/escanear")({
  head: () => ({ meta: [{ title: "Escanear estación · Radar Hunt" }] }),
  component: ScanPage,
});

function ScanPage() {
  const { slug } = Route.useParams();
  const scan = useScan(slug);
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <Link
        to="/radar-hunt/congresos/$slug"
        params={{ slug }}
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al congreso
      </Link>
      <div>
        <h1 className="flex items-center gap-2 font-serif text-2xl font-semibold">
          <ScanLine className="h-6 w-6 text-[color:var(--gold)]" /> Escanear estación
        </h1>
        <p className="text-sm text-muted-foreground">
          Apunta al código QR del póster de la estación. No usamos tu ubicación.
        </p>
      </div>
      <QrScanner onResult={scan.handle} busy={scan.busy} />
      {scan.busy && <p className="text-center text-sm text-muted-foreground">Validando…</p>}
      {scan.error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm"
        >
          {scan.error.message}{" "}
          {scan.error.needsJoin && (
            <Link
              to="/radar-hunt/congresos/$slug"
              params={{ slug }}
              className="font-semibold underline"
            >
              Ir a la inscripción
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
