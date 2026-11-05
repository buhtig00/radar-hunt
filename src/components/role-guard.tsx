import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { useRole, ROLE_LABELS } from "@/lib/role-context";
import { can, type Capability } from "@/lib/permissions";

/**
 * Envuelve una página para que los usuarios sin el permiso requerido vean una
 * pantalla profesional de "Acceso restringido" en lugar del contenido protegido.
 * El selector de rol del top bar sigue funcionando para que los revisores puedan
 * demostrar el control de acceso en vivo.
 */
export function RoleGuard({
  capability,
  children,
}: {
  capability: Capability;
  children: ReactNode;
}) {
  const { role } = useRole();
  if (can(role, capability)) return <>{children}</>;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 py-16">
      <Card className="border-border bg-surface p-10 text-center shadow-[var(--shadow-card)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
          <Lock className="h-5 w-5" />
        </div>
        <h1 className="mt-5 font-serif text-2xl font-semibold text-foreground">
          Acceso restringido
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          El rol <span className="font-medium text-foreground">{ROLE_LABELS[role]}</span> no tiene
          permiso para ver este espacio de trabajo. Cambia el rol desde el top bar para continuar la
          demo, o contacta a tu administrador.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild variant="outline">
            <Link to="/">Volver al panel</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
