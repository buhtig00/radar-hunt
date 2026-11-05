import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Play } from "lucide-react";
import { SUBSPECIALTY_LABELS } from "@/lib/radar-hunt/catalog";
import { RH_IMAGES, subColor } from "@/lib/radar-hunt/palette";
import type { SubspecialtyCode } from "@/lib/radar-hunt/types";
import { useBossList } from "@/lib/radar-hunt/hooks";
import { LoadingState } from "@/components/empty-loading";
import { RhHero } from "@/components/radar-hunt/ui";

/** Imagen de cabecera de cada caso según su subespecialidad. */
const BOSS_IMAGE: Partial<Record<SubspecialtyCode, string>> = {
  retina: RH_IMAGES.oct,
  glaucoma: RH_IMAGES.fundus,
  neuro_ophthalmology: RH_IMAGES.redReflex,
  cornea: RH_IMAGES.cornea,
  cataract: RH_IMAGES.lens,
  uveitis: RH_IMAGES.iris,
};

export const Route = createFileRoute("/radar-hunt/boss")({
  head: () => ({ meta: [{ title: "Retos BOSS · Radar Hunt" }] }),
  component: BossPage,
});

function BossPage() {
  const q = useBossList();
  return (
    <div className="flex flex-col gap-5">
      <RhHero
        image={RH_IMAGES.oct}
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
          {q.data?.map((b) => {
            const color = subColor(b.bossCase.subspecialty);
            return (
              <article
                key={b.bossCase.id}
                className="rh-card rh-card-hover group flex flex-col overflow-hidden rounded-3xl"
              >
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={BOSS_IMAGE[b.bossCase.subspecialty] ?? RH_IMAGES.oct}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.17_0.03_252)] to-transparent" />
                  <span
                    className="absolute left-4 top-4 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur"
                    style={{ background: `${color}33`, color }}
                  >
                    {SUBSPECIALTY_LABELS[b.bossCase.subspecialty]}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5 pt-1">
                  <h2 className="text-xl text-white">{b.bossCase.title}</h2>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-white/60">
                    {b.bossCase.intro}
                  </p>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs text-white/50">
                      {Array.from({ length: b.bossCase.steps }, (_, i) => (
                        <span
                          key={i}
                          className="h-1.5 w-4 rounded-full"
                          style={{ background: `${color}88` }}
                        />
                      ))}
                      <span className="ml-1">{b.bossCase.steps} pasos</span>
                    </span>
                    {b.myAttempt?.submitted ? (
                      <span className="flex items-center gap-1 text-sm font-semibold text-[color:var(--success)]">
                        <CheckCircle2 className="h-4 w-4" /> {b.myAttempt.score.toFixed(0)} RP
                      </span>
                    ) : (
                      <Link
                        to="/radar-hunt/jugar/$roundId"
                        params={{ roundId: b.roundId }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-[color:var(--rh-navy-950)] hover:opacity-90"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />{" "}
                        {b.myAttempt ? "Continuar" : "Aceptar el reto"}
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
