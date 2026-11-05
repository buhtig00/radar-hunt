import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Check, ExternalLink, X } from "lucide-react";
import { useRole } from "@/lib/role-context";
import { rh } from "@/lib/radar-hunt/service";
import { rhKeys } from "@/lib/radar-hunt/hooks";
import type { VerificationQueueItem } from "@/lib/radar-hunt/views";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/empty-loading";
import { VerificationBadge } from "@/components/radar-hunt/ui";

export const Route = createFileRoute("/radar-hunt/verificaciones")({
  head: () => ({ meta: [{ title: "Verificaciones · Radar Hunt" }] }),
  component: VerificationsPage,
});

const FILTERS = [
  ["pending", "Pendientes"],
  ["verified", "Verificados"],
  ["rejected", "Rechazados"],
  ["all", "Todos"],
] as const;

function VerificationsPage() {
  const { role } = useRole();
  const [status, setStatus] = useState<(typeof FILTERS)[number][0]>("pending");
  const canReview = role === "admin" || role === "medical_editor";
  const q = useQuery({
    queryKey: rhKeys.verifications(status),
    queryFn: () => rh.listVerifications(status),
    enabled: canReview,
  });

  if (!canReview) {
    return (
      <p className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">
        Solo administradores y editores médicos pueden revisar verificaciones.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-2xl font-semibold">Verificación de médicos</h1>
        <p className="text-sm text-muted-foreground">
          Comprueba el número de colegiado en el registro oficial (colegio provincial o CGCOM) antes
          de aprobar. Las señales automáticas ayudan, pero no deciden.
        </p>
      </div>
      <div className="flex gap-1">
        {FILTERS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setStatus(k)}
            className={`rounded-md border px-3 py-1.5 text-sm ${status === k ? "border-[color:var(--navy)] bg-[color:var(--navy)] text-white" : "border-border text-muted-foreground hover:bg-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {q.isLoading ? (
        <LoadingState label="Cargando solicitudes…" />
      ) : q.data?.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay solicitudes en este estado.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {q.data?.map((item) => (
            <Row key={item.userId} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function Signal({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${ok ? "border-success/40 bg-success/10 text-[color:var(--success)]" : "border-warning/40 bg-warning/10 text-[color:var(--warning)]"}`}
    >
      {ok ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />} {label}
    </span>
  );
}

function Row({ item }: { item: VerificationQueueItem }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const m = useMutation({
    mutationFn: (decision: "approve" | "reject") =>
      rh.reviewVerification(item.userId, decision, note || undefined),
    onSuccess: (p) => {
      toast.success(
        p.status === "verified" ? `${p.displayName} verificado/a` : `${p.displayName} rechazado/a`,
      );
      qc.invalidateQueries({ queryKey: ["rh"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{item.displayName}</span>
            <VerificationBadge status={item.status} />
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {item.specialty} · {item.hospital} ·{" "}
            {item.careerStage === "resident" ? `Residente R${item.residencyYear}` : "Adjunto/a"}
          </div>
          <div className="mt-1 text-sm">
            Colegiado <span className="font-mono font-semibold">{item.licenseNumber}</span>
            {item.licenseCollege && <> · Colegio de {item.licenseCollege}</>} · {item.email}
          </div>
        </div>
        <a
          href="https://www.cgcom.es/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary"
        >
          Comprobar en el registro <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Signal ok={item.signals.licenseFormatOk} label="Formato de colegiado" />
        <Signal ok={item.signals.institutionalEmail} label="Correo institucional" />
        <Signal ok={item.signals.emailMatchesAccount} label="Coincide con la cuenta" />
        <Signal ok={item.signals.specialtyIsOphthalmology} label="Oftalmología" />
        {item.duplicateLicense && <Signal ok={false} label="Colegiado repetido en otra cuenta" />}
      </div>
      {item.status === "pending" && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota (obligatoria si rechazas)"
            className="flex-1"
          />
          <button
            type="button"
            disabled={m.isPending}
            onClick={() => m.mutate("approve")}
            className="flex items-center justify-center gap-1 rounded-md bg-[color:var(--success)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            <Check className="h-4 w-4" /> Aprobar
          </button>
          <button
            type="button"
            disabled={m.isPending || note.trim().length < 3}
            onClick={() => m.mutate("reject")}
            className="flex items-center justify-center gap-1 rounded-md border border-destructive px-3 py-2 text-sm font-medium text-destructive disabled:opacity-50"
          >
            <X className="h-4 w-4" /> Rechazar
          </button>
        </div>
      )}
    </div>
  );
}
