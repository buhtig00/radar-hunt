import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Crown, Lock, Play, Timer } from "lucide-react";
import { useLeagueView, useMyProfile } from "@/lib/radar-hunt/hooks";
import { CAREER_LABELS, SUBSPECIALTY_LABELS } from "@/lib/radar-hunt/catalog";
import { DEMO_USER_ID } from "@/lib/radar-hunt/demo-service";
import { rh, RH_MODE } from "@/lib/radar-hunt/service";
import { LoadingState } from "@/components/empty-loading";
import { RankBadge, VerificationGate } from "@/components/radar-hunt/ui";
import { fmtMs, fmtDate } from "@/lib/radar-hunt/format";

export const Route = createFileRoute("/radar-hunt/ligas/$leagueId")({
  component: LeaguePage,
});

function LeaguePage() {
  const { leagueId } = Route.useParams();
  const navigate = useNavigate();
  const view = useLeagueView(leagueId);
  const profile = useMyProfile();
  if (view.isLoading) return <LoadingState label="Cargando la liga…" />;
  if (view.error || !view.data)
    return (
      <p className="text-sm text-destructive">
        {(view.error as Error)?.message ?? "Liga no encontrada"}
      </p>
    );
  const { league, rounds, leaderboard, isMyLeague } = view.data;
  const r = league.rules;
  const me = RH_MODE === "demo" ? DEMO_USER_ID : profile.data?.userId;

  const play = async (roundId: string) => {
    try {
      await rh.startRound(roundId);
      navigate({ to: "/radar-hunt/jugar/$roundId", params: { roundId } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/radar-hunt/ligas"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Todas las ligas
      </Link>
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
        <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--gold)]">
          {CAREER_LABELS[league.careerLevel]}
        </div>
        <h1 className="mt-1 font-serif text-2xl font-semibold">
          {SUBSPECIALTY_LABELS[league.subspecialty]}
        </h1>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-border px-2 py-0.5">
            {r.totalRounds} rondas · mejores {r.bestN}
          </span>
          <span className="rounded-full border border-border px-2 py-0.5">
            {r.questionsPerRound} preguntas por ronda
          </span>
          <span className="rounded-full border border-border px-2 py-0.5">
            <Timer className="mr-1 inline h-3 w-3" />
            {r.timeLimitS} s por pregunta
          </span>
          <span className="rounded-full border border-border px-2 py-0.5">
            {r.speedLambda > 0
              ? `Rapidez: hasta +${Math.round(r.speedLambda * 100)} %`
              : "Cuenta el acierto, no la rapidez"}
          </span>
          <span className="rounded-full border border-border px-2 py-0.5">
            <Crown className="mr-1 inline h-3 w-3" />
            {r.finalistsK} finalistas
          </span>
        </div>
        {!isMyLeague && profile.data && (
          <p className="mt-3 text-sm text-muted-foreground">
            Puedes ver esta liga, pero compites en la de{" "}
            {CAREER_LABELS[profile.data.careerStage].toLowerCase()}.
          </p>
        )}
      </div>
      {profile.data !== undefined && <VerificationGate profile={profile.data} />}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-3 font-serif text-lg font-semibold">Rondas</h2>
          <ol className="flex flex-col gap-2">
            {rounds.map((rd) => {
              const done = rd.myAttempt?.submitted;
              const empty = rd.questionCount === 0;
              return (
                <li
                  key={rd.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="font-medium">{rd.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtDate(rd.opensAt)} – {fmtDate(rd.closesAt)} ·{" "}
                      {empty ? "pendiente de publicación" : `${rd.questionCount} preguntas`}
                    </div>
                  </div>
                  {done ? (
                    <span className="flex items-center gap-1 text-sm font-medium text-[color:var(--success)]">
                      <CheckCircle2 className="h-4 w-4" /> {rd.myAttempt!.score.toFixed(0)} RP
                    </span>
                  ) : rd.state === "open" && !empty ? (
                    <button
                      type="button"
                      onClick={() => play(rd.id)}
                      className="flex items-center gap-1 rounded-md bg-[color:var(--navy)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                    >
                      <Play className="h-3.5 w-3.5" /> {rd.myAttempt ? "Continuar" : "Jugar"}
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" />{" "}
                      {rd.state === "upcoming"
                        ? "Próximamente"
                        : empty
                          ? "Sin publicar"
                          : "Cerrada"}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-3 font-serif text-lg font-semibold">Clasificación</h2>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay participantes. Sé el primero.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-1.5 pr-2">#</th>
                  <th className="py-1.5 pr-2">Participante</th>
                  <th className="py-1.5 pr-2 text-right">Puntos</th>
                  <th className="hidden py-1.5 pr-2 text-right sm:table-cell">Aciertos</th>
                  <th className="hidden py-1.5 text-right sm:table-cell">Tiempo</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.slice(0, 25).map((row) => (
                  <tr
                    key={row.userId}
                    className={`border-t border-border ${row.userId === me ? "bg-[color:var(--gold)]/15 font-semibold" : ""}`}
                  >
                    <td className="py-1.5 pr-2">
                      <RankBadge rank={row.rank} />
                    </td>
                    <td className="py-1.5 pr-2">
                      {row.displayName}
                      {row.isFinalist && (
                        <span className="ml-2 rounded bg-[color:var(--navy)] px-1 text-[10px] font-medium text-white">
                          finalista
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2 text-right font-mono">{row.score.toFixed(0)}</td>
                    <td className="hidden py-1.5 pr-2 text-right sm:table-cell">{row.correct}</td>
                    <td className="hidden py-1.5 text-right font-mono text-xs text-muted-foreground sm:table-cell">
                      {fmtMs(row.totalMs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            Desempate: más aciertos y, después, menos tiempo total. Puedes ocultar tu nombre en tu
            perfil.
          </p>
        </section>
      </div>
    </div>
  );
}
