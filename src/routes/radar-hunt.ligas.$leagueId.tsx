import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, Check, Crown, Lock, Play } from "lucide-react";
import { useLeagueView, useMyProfile } from "@/lib/radar-hunt/hooks";
import { CAREER_LABELS, SUBSPECIALTY_LABELS } from "@/lib/radar-hunt/catalog";
import { DEMO_USER_ID } from "@/lib/radar-hunt/demo-service";
import { subColor } from "@/lib/radar-hunt/palette";
import { rh, RH_MODE } from "@/lib/radar-hunt/service";
import type { LeaderboardRow } from "@/lib/radar-hunt/types";
import type { RoundView } from "@/lib/radar-hunt/views";
import { LoadingState } from "@/components/empty-loading";
import { RankBadge, RhSectionTitle, VerificationGate } from "@/components/radar-hunt/ui";
import { fmtDate } from "@/lib/radar-hunt/format";

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
  const color = subColor(league.subspecialty);
  const current = rounds.find((rd) => rd.state === "open" && rd.questionCount > 0);
  const played = rounds.filter((rd) => rd.myAttempt?.submitted).length;
  const myRow = leaderboard.find((row) => row.userId === me);

  const play = async (roundId: string) => {
    try {
      await rh.startRound(roundId);
      navigate({ to: "/radar-hunt/jugar/$roundId", params: { roundId } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/radar-hunt/ligas"
        className="inline-flex items-center gap-1 self-start text-sm text-white/55 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Todas las ligas
      </Link>

      <header
        className="relative isolate overflow-hidden rounded-[28px] border border-white/10 p-6 md:p-9"
        style={{
          background: `radial-gradient(120% 140% at 100% 0%, ${color}40 0%, transparent 55%), linear-gradient(180deg, oklch(0.2 0.035 252), oklch(0.15 0.03 252))`,
        }}
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color }}>
          Liga de {CAREER_LABELS[league.careerLevel].toLowerCase()}
        </div>
        <h1 className="mt-2 text-3xl text-white md:text-[2.6rem]">
          {SUBSPECIALTY_LABELS[league.subspecialty]}
        </h1>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/70">
          {[
            `${r.totalRounds} rondas · cuentan ${r.bestN}`,
            `${r.questionsPerRound} preguntas por ronda`,
            `${r.timeLimitS} s por pregunta`,
            "Puntúa el acierto, no la rapidez",
          ].map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/12 bg-white/[0.05] px-2.5 py-1"
            >
              {t}
            </span>
          ))}
          <span className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.05] px-2.5 py-1">
            <Crown className="h-3 w-3" /> {r.finalistsK} finalistas
          </span>
        </div>

        <div className="mt-7 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <dl className="flex gap-8">
            <div>
              <dt className="text-xs text-white/50">Tu puesto</dt>
              <dd className="text-2xl font-semibold tabular-nums text-white">
                {myRow ? `${myRow.rank}.º` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-white/50">Rondas jugadas</dt>
              <dd className="text-2xl font-semibold tabular-nums text-white">
                {played}
                <span className="text-base text-white/40">/{r.totalRounds}</span>
              </dd>
            </div>
            {myRow && (
              <div>
                <dt className="text-xs text-white/50">Puntos</dt>
                <dd className="text-2xl font-semibold tabular-nums text-white">
                  {myRow.score.toFixed(0)}
                </dd>
              </div>
            )}
          </dl>
          {current && !current.myAttempt?.submitted && (
            <button
              type="button"
              onClick={() => play(current.id)}
              className="rh-cta inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
            >
              <Play className="h-4 w-4 fill-current" />
              {current.myAttempt ? "Continuar" : "Jugar"} {current.title.toLowerCase()}
            </button>
          )}
        </div>
        {!isMyLeague && profile.data && (
          <p className="mt-4 text-sm text-white/55">
            Puedes ver esta liga, pero compites en la de{" "}
            {CAREER_LABELS[profile.data.careerStage].toLowerCase()}.
          </p>
        )}
      </header>

      {profile.data !== undefined && <VerificationGate profile={profile.data} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="flex flex-col gap-4">
          <RhSectionTitle title="Rondas" />
          <ol className="relative flex flex-col">
            {rounds.map((rd, i) => (
              <RoundRow
                key={rd.id}
                rd={rd}
                color={color}
                last={i === rounds.length - 1}
                onPlay={() => play(rd.id)}
              />
            ))}
          </ol>
        </section>

        <section className="flex flex-col gap-4">
          <RhSectionTitle title="Clasificación" />
          {leaderboard.length === 0 ? (
            <p className="rh-card rounded-2xl p-6 text-center text-sm text-white/55">
              Aún no hay participantes. Sé el primero.
            </p>
          ) : (
            <>
              <Podium rows={leaderboard.slice(0, 3)} me={me} />
              <div className="rh-card overflow-hidden rounded-2xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-white/45">
                      <th className="px-4 py-2.5">#</th>
                      <th className="py-2.5 pr-2">Participante</th>
                      <th className="py-2.5 pr-2 text-right">Aciertos</th>
                      <th className="px-4 py-2.5 text-right">Puntos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.slice(3, 25).map((row) => (
                      <tr
                        key={row.userId}
                        className={`border-t border-white/[0.06] ${row.userId === me ? "bg-[color:var(--rh-radar-500)]/12" : ""}`}
                      >
                        <td className="px-4 py-2">
                          <RankBadge rank={row.rank} />
                        </td>
                        <td className="py-2 pr-2">
                          <span
                            className={
                              row.userId === me ? "font-semibold text-white" : "text-white/85"
                            }
                          >
                            {row.displayName}
                          </span>
                          {row.isFinalist && (
                            <span
                              className="ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                              style={{ background: `${color}22`, color }}
                            >
                              finalista
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums text-white/60">
                          {row.correct}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold tabular-nums text-white">
                          {row.score.toFixed(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <p className="text-[11.5px] text-white/45">
            Desempate: más aciertos. La rapidez no suma ni desempata. Puedes ocultar tu nombre en tu
            perfil.
          </p>
        </section>
      </div>
    </div>
  );
}

function RoundRow({
  rd,
  color,
  last,
  onPlay,
}: {
  rd: RoundView;
  color: string;
  last: boolean;
  onPlay: () => void;
}) {
  const done = rd.myAttempt?.submitted;
  const empty = rd.questionCount === 0;
  const playable = rd.state === "open" && !empty && !done;
  return (
    <li className="relative flex gap-4 pb-3">
      {!last && (
        <span className="absolute bottom-0 left-[17px] top-9 w-px bg-white/10" aria-hidden />
      )}
      <span
        className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums ${
          done
            ? "border-transparent text-[color:var(--rh-navy-950)]"
            : playable
              ? "border-transparent text-[color:var(--rh-navy-950)]"
              : "border-white/12 bg-white/[0.03] text-white/45"
        }`}
        style={done || playable ? { background: color } : undefined}
      >
        {done ? <Check className="h-4 w-4" /> : rd.number}
        {playable && (
          <span
            className="absolute inset-0 animate-ping rounded-full opacity-30"
            style={{ background: color }}
            aria-hidden
          />
        )}
      </span>
      <div
        className={`flex min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl px-4 py-3 ${
          playable ? "rh-card" : ""
        }`}
        style={playable ? { borderColor: `${color}55` } : undefined}
      >
        <div className="min-w-0">
          <div className={`font-medium ${playable || done ? "text-white" : "text-white/60"}`}>
            {rd.title}
          </div>
          <div className="text-xs text-white/45">
            {fmtDate(rd.opensAt)} – {fmtDate(rd.closesAt)}
            {empty ? " · pendiente de publicación" : ` · ${rd.questionCount} preguntas`}
          </div>
        </div>
        {done ? (
          <span className="text-sm font-semibold tabular-nums" style={{ color }}>
            {rd.myAttempt!.score.toFixed(0)} pts
          </span>
        ) : playable ? (
          <button
            type="button"
            onClick={onPlay}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-[color:var(--rh-navy-950)] hover:opacity-90"
          >
            <Play className="h-3.5 w-3.5 fill-current" /> {rd.myAttempt ? "Continuar" : "Jugar"}
          </button>
        ) : (
          <span className="flex items-center gap-1 text-xs text-white/40">
            <Lock className="h-3.5 w-3.5" />
            {rd.state === "upcoming" ? "Próximamente" : empty ? "Sin publicar" : "Cerrada"}
          </span>
        )}
      </div>
    </li>
  );
}

/** Podio de los tres primeros: oro solo aquí. */
function Podium({ rows, me }: { rows: LeaderboardRow[]; me?: string }) {
  const order = [rows[1], rows[0], rows[2]].filter(Boolean) as LeaderboardRow[];
  const height = (rank: number) => (rank === 1 ? "h-24" : rank === 2 ? "h-16" : "h-12");
  return (
    <div className="rh-card grid grid-cols-3 items-end gap-2 rounded-2xl px-3 pt-5">
      {order.map((row) => (
        <div key={row.userId} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
          {row.rank === 1 && <Crown className="h-5 w-5 text-[color:var(--rh-podium)]" />}
          <span
            className={`max-w-full truncate px-1 text-xs ${row.userId === me ? "font-semibold text-white" : "text-white/80"}`}
          >
            {row.displayName}
          </span>
          <span className="text-sm font-semibold tabular-nums text-white">
            {row.score.toFixed(0)}
          </span>
          <div
            className={`rh-podium flex w-full items-start justify-center rounded-t-xl border border-b-0 pt-2 text-lg font-bold ${height(row.rank)}`}
          >
            {row.rank}
          </div>
        </div>
      ))}
    </div>
  );
}
