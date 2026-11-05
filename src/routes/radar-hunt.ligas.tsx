import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trophy, Users } from "lucide-react";
import {
  CAREER_LABELS,
  CURRENT_SEASON,
  DEFAULT_RULES,
  leagueId,
  SUBSPECIALTIES,
  SUBSPECIALTY_LABELS,
} from "@/lib/radar-hunt/catalog";
import { useMyProfile } from "@/lib/radar-hunt/hooks";
import { DEMO_QUESTIONS } from "@/lib/radar-hunt/seed-questions";
import { RH_MODE } from "@/lib/radar-hunt/service";
import type { CareerStage } from "@/lib/radar-hunt/types";
import { RhHero, VerificationGate } from "@/components/radar-hunt/ui";

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

  return (
    <div className="flex flex-col gap-5">
      <RhHero
        eyebrow={CURRENT_SEASON.name}
        title={
          <>
            Ligas internacionales de <em>oftalmología.</em>
          </>
        }
      >
        17 subespecialidades × residentes y adjuntos. {DEFAULT_RULES.totalRounds} rondas semanales
        de {DEFAULT_RULES.questionsPerRound} preguntas; cuentan tus mejores {DEFAULT_RULES.bestN}.
        Los {DEFAULT_RULES.finalistsK} primeros de cada liga pasan a la final.
      </RhHero>
      {profile.data !== undefined && <VerificationGate profile={profile.data} />}
      <div className="flex items-center gap-2">
        {(["resident", "attending"] as CareerStage[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStage(s)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium ${stage === s ? "border-[color:var(--navy)] bg-[color:var(--navy)] text-white" : "border-border bg-surface text-muted-foreground hover:bg-muted"}`}
          >
            <Users className="h-4 w-4" /> {CAREER_LABELS[s]}
            {profile.data?.careerStage === s && (
              <span className="rounded-full bg-[color:var(--gold)] px-1.5 text-[10px] font-semibold text-[color:var(--navy)]">
                tu liga
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SUBSPECIALTIES.map((sub) => {
          const n =
            RH_MODE === "demo"
              ? DEMO_QUESTIONS.filter((q) => q.subspecialty === sub).length
              : undefined;
          return (
            <Link
              key={sub}
              to="/radar-hunt/ligas/$leagueId"
              params={{ leagueId: leagueId(sub, stage) }}
              className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-shadow hover:shadow-md"
            >
              <div>
                <div className="font-medium">{SUBSPECIALTY_LABELS[sub]}</div>
                <div className="text-xs text-muted-foreground">
                  {CAREER_LABELS[stage]}
                  {n !== undefined && ` · ${n} preguntas demo`}
                </div>
              </div>
              <Trophy className="h-5 w-5 text-[color:var(--gold)] transition-transform group-hover:scale-110" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
