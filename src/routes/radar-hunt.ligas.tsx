import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Star } from "lucide-react";
import {
  CAREER_LABELS,
  CURRENT_SEASON,
  DEFAULT_RULES,
  leagueId,
  SUBSPECIALTIES,
  SUBSPECIALTY_LABELS,
} from "@/lib/radar-hunt/catalog";
import { useMyProfile } from "@/lib/radar-hunt/hooks";
import { RH_IMAGES, subColor } from "@/lib/radar-hunt/palette";
import { DEMO_QUESTIONS } from "@/lib/radar-hunt/seed-questions";
import { RH_MODE } from "@/lib/radar-hunt/service";
import type { CareerStage } from "@/lib/radar-hunt/types";
import { RhHero, RhSectionTitle, VerificationGate } from "@/components/radar-hunt/ui";

export const Route = createFileRoute("/radar-hunt/ligas")({
  head: () => ({ meta: [{ title: "Ligas · Radar Hunt" }] }),
  component: LeaguesLayout,
});

function LeaguesLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isIndex = /\/radar-hunt\/ligas\/?$/.test(path);
  return isIndex ? <LeaguesIndex /> : <Outlet />;
}

function LeaguesIndex() {
  const profile = useMyProfile();
  const [stage, setStage] = useState<CareerStage>("attending");
  useEffect(() => {
    if (profile.data?.careerStage) setStage(profile.data.careerStage);
  }, [profile.data?.careerStage]);
  const mine = profile.data?.primarySubspecialty;
  // Tu subespecialidad primero; el resto en el orden del catálogo.
  const subs = mine ? [mine, ...SUBSPECIALTIES.filter((s) => s !== mine)] : SUBSPECIALTIES;

  return (
    <div className="flex flex-col gap-8">
      <RhHero
        eyebrow={CURRENT_SEASON.name}
        title={
          <>
            Compite en <em>tu especialidad.</em>
          </>
        }
        image={RH_IMAGES.fundus}
        footer={
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:flex sm:flex-wrap">
            <Fact n={`${DEFAULT_RULES.totalRounds}`} t="rondas semanales" />
            <Fact n={`${DEFAULT_RULES.questionsPerRound}`} t="preguntas por ronda" />
            <Fact n={`${DEFAULT_RULES.bestN}`} t="mejores rondas cuentan" />
            <Fact n={`${DEFAULT_RULES.finalistsK}`} t="pasan a la final" />
          </dl>
        }
      >
        Una liga por subespecialidad, separada para residentes y adjuntos. Puntúan el acierto y la
        dificultad, nunca la rapidez.
      </RhHero>

      {profile.data !== undefined && <VerificationGate profile={profile.data} />}

      <section className="flex flex-col gap-4">
        <RhSectionTitle
          eyebrow={`${SUBSPECIALTIES.length} ligas`}
          title={
            <>
              Elige <em>tu liga</em>
            </>
          }
          action={
            <div
              className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1"
              role="tablist"
              aria-label="Nivel"
            >
              {(["resident", "attending"] as CareerStage[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={stage === s}
                  onClick={() => setStage(s)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    stage === s
                      ? "bg-white text-[color:var(--rh-navy-950)]"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {CAREER_LABELS[s]}
                  {profile.data?.careerStage === s && (
                    <Star className="h-3 w-3 fill-current" aria-label="tu nivel" />
                  )}
                </button>
              ))}
            </div>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subs.map((sub) => {
            const color = subColor(sub);
            const n =
              RH_MODE === "demo"
                ? DEMO_QUESTIONS.filter((q) => q.subspecialty === sub).length
                : undefined;
            const isMine = sub === mine;
            return (
              <Link
                key={sub}
                to="/radar-hunt/ligas/$leagueId"
                params={{ leagueId: leagueId(sub, stage) }}
                className="rh-card rh-card-hover group relative flex items-center gap-4 overflow-hidden rounded-2xl p-4"
                style={isMine ? { borderColor: `${color}66` } : undefined}
              >
                <span
                  className="absolute inset-y-0 left-0 w-1"
                  style={{ background: color }}
                  aria-hidden
                />
                <span
                  className="pointer-events-none absolute -left-10 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full opacity-25 blur-2xl transition-opacity group-hover:opacity-50"
                  style={{ background: color }}
                  aria-hidden
                />
                <span
                  className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                  style={{ background: `${color}22`, color }}
                >
                  {SUBSPECIALTY_LABELS[sub]
                    .split(/\s+/)
                    .filter((w) => w.length > 2)
                    .slice(0, 2)
                    .map((w) => w[0].toUpperCase())
                    .join("")}
                </span>
                <span className="relative min-w-0 flex-1">
                  <span className="block truncate font-medium text-white">
                    {SUBSPECIALTY_LABELS[sub]}
                  </span>
                  <span className="mt-0.5 block text-xs text-white/50">
                    {isMine ? (
                      <span style={{ color }}>Tu subespecialidad</span>
                    ) : (
                      CAREER_LABELS[stage]
                    )}
                    {n !== undefined && ` · ${n} preguntas demo`}
                  </span>
                </span>
                <ArrowRight className="relative h-4 w-4 shrink-0 text-white/40 transition-transform group-hover:translate-x-1 group-hover:text-white" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Fact({ n, t }: { n: string; t: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="sr-only">{t}</dt>
      <dd className="text-xl font-semibold tabular-nums text-white">{n}</dd>
      <span className="text-white/55">{t}</span>
    </div>
  );
}
