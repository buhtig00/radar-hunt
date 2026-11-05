import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRoles, claimAdminIfEmpty } from "@/lib/roles.functions";
import { toast } from "sonner";

export function RoleBootstrapCard() {
  const qc = useQueryClient();
  const getRoles = useServerFn(getMyRoles);
  const claim = useServerFn(claimAdminIfEmpty);

  const rolesQ = useQuery({ queryKey: ["my-roles"], queryFn: () => getRoles(), retry: false });

  const mutation = useMutation({
    mutationFn: () => claim(),
    onSuccess: (res) => {
      if (res.claimed) toast.success("Reclamado: ahora eres admin");
      else toast.info(`Roles activos: ${res.roles.join(", ") || "ninguno"}`);
      qc.invalidateQueries({ queryKey: ["my-roles"] });
    },
    onError: (e: Error) => toast.error(`Error: ${e.message}`),
  });

  if (rolesQ.isLoading) return null;
  const roles = rolesQ.data ?? [];
  const hasEditor = roles.some((r) => r === "admin" || r === "medical_editor" || r === "kol");

  return (
    <Card className="border-border bg-surface p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Tus roles: {roles.length ? roles.join(", ") : "ninguno"}
          </p>
          <p className="text-xs text-muted-foreground">
            {hasEditor
              ? "Puedes aprobar, rechazar y validar contenido."
              : "Sin rol editorial. Reclama admin si eres el primer usuario o pide a un admin que te asigne rol."}
          </p>
        </div>
      </div>
      {!hasEditor && (
        <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reclamar admin"}
        </Button>
      )}
    </Card>
  );
}
