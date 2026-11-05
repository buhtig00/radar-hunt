import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Play, Swords } from "lucide-react";
import { useBossList } from "@/lib/radar-hunt/hooks";
import { LoadingState } from "@/components/empty-loading";
import { RhHero, SubBadge } from "@/components/radar-hunt/ui";

export const Route = createFileRoute("/radar-hunt/boss")({
  head: () => ({ meta: [{ title: "Retos BOSS · Radar Hunt" }] }),
  component: BossPage,
});

function BossPage() {
  const q = useBossList();
  return (
    <div className="flex flex-col gap-5">
      <RhHero
        eyebrow="Retos BOSS"
        title={
          <>
            Casos clínicos <em>en varios pasos.</em>
          </>
        }
      >
        Cada paso revela información nueva, como en la consulta real. Hasta 60 s por paso. Si
        resuelves el caso entero sin errores, ganas un 20 % extra.
      </RhHero>
      {q.isLoading ? (
        <LoadingState label="Cargando retos…" />
      ) : q.data?.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no hay casos BOSS publicados.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {q.data?.map((b) => (
            <div
              key={b.bossCase.id}
              className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center justify-between">
                <Swords className="h-6 w-6 text-[color:var(--gold)]" />
                <SubBadge code={b.bossCase.subspecialty} />
              </div>
              <h2 className="mt-3 font-serif text-xl font-semibold">{b.bossCase.title}</h2>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{b.bossCase.intro}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{b.bossCase.steps} pasos</span>
                {b.myAttempt?.submitted ? (
                  <span className="flex items-center gap-1 text-sm font-medium text-[color:var(--success)]">
                    <CheckCircle2 className="h-4 w-4" /> {b.myAttempt.score.toFixed(0)} RP
                  </span>
                ) : (
                  <Link
                    to="/radar-hunt/jugar/$roundId"
                    params={{ roundId: b.roundId }}
                    className="flex items-center gap-1 rounded-md bg-[color:var(--navy)] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    <Play className="h-3.5 w-3.5" /> {b.myAttempt ? "Continuar" : "Aceptar el reto"}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
