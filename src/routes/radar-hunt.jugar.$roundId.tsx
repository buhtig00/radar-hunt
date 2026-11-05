import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Flag,
  Sparkles,
  Timer,
  Trophy,
  XCircle,
} from "lucide-react";
import { rh } from "@/lib/radar-hunt/service";
import {
  eyeStationOfRound,
  type AnswerFeedback,
  type AttemptSummary,
  type QuestionPayload,
} from "@/lib/radar-hunt/game-core";
import { SUBSPECIALTY_LABELS } from "@/lib/radar-hunt/catalog";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState } from "@/components/empty-loading";
import { UnvalidatedNotice } from "@/components/radar-hunt/ui";
import { fmtMs } from "@/lib/radar-hunt/format";
import { returnSlug } from "@/lib/radar-hunt/congress/hooks";

/** Las rondas de estación vuelven a su congreso; el resto, a las ligas. */
function BackLink({ roundId, className }: { roundId: string; className: string }) {
  const slug =
    roundId.startsWith("cs:") && typeof window !== "undefined" ? returnSlug(roundId) : null;
  if (roundId.startsWith("cs:"))
    return slug ? (
      <Link to="/radar-hunt/congresos/$slug" params={{ slug }} className={className}>
        Volver al congreso
      </Link>
    ) : (
      <Link to="/radar-hunt/congresos" className={className}>
        Volver a los congresos
      </Link>
    );
  const eyeStation = eyeStationOfRound(roundId);
  if (eyeStation)
    return (
      <Link to="/radar-hunt/eye" search={{ estacion: eyeStation }} className={className}>
        Volver a la estación en el ojo
      </Link>
    );
  return (
    <Link to="/radar-hunt/ligas" className={className}>
      Ligas
    </Link>
  );
}

export const Route = createFileRoute("/radar-hunt/jugar/$roundId")({
  head: () => ({ meta: [{ title: "Jugar · Radar Hunt" }] }),
  component: PlayPage,
});

type Phase = "loading" | "question" | "feedback" | "done" | "error";

function PlayPage() {
  const { roundId } = Route.useParams();
  const qc = useQueryClient();
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [q, setQ] = useState<QuestionPayload | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [fb, setFb] = useState<AnswerFeedback | null>(null);
  const [summary, setSummary] = useState<AttemptSummary | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagText, setFlagText] = useState("");
  const t0 = useRef(0);
  const sending = useRef(false);

  const loadNext = useCallback(
    async (aid: string) => {
      const next = await rh.nextQuestion(aid);
      if (!next) {
        setSummary(await rh.summary(aid));
        setPhase("done");
        qc.invalidateQueries({ queryKey: ["rh"] });
        return;
      }
      setQ(next);
      setPicked([]);
      setFb(null);
      t0.current = performance.now();
      setRemaining(next.question.timeLimitS);
      setPhase("question");
    },
    [qc],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const aid = await rh.startRound(roundId);
        if (!alive) return;
        setAttemptId(aid);
        await loadNext(aid);
      } catch (e) {
        if (!alive) return;
        setError((e as Error).message);
        setPhase("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [roundId, loadNext]);

  const submit = useCallback(
    async (selected: string[]) => {
      if (!attemptId || !q || sending.current) return;
      sending.current = true;
      try {
        const res = await rh.answer(attemptId, q.question.id, selected);
        setFb(res);
        setPhase("feedback");
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        sending.current = false;
      }
    },
    [attemptId, q],
  );

  // Temporizador visual (el tiempo que cuenta lo mide el servidor)
  useEffect(() => {
    if (phase !== "question" || !q) return;
    const id = window.setInterval(() => {
      const left = q.question.timeLimitS - (performance.now() - t0.current) / 1000;
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        window.clearInterval(id);
        void submit(picked);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, q, picked, submit]);

  const flag = async () => {
    if (!q) return;
    try {
      await rh.flagQuestion(q.question.id, flagText);
      toast.success("Impugnación enviada al comité editorial");
      setFlagOpen(false);
      setFlagText("");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (phase === "loading") return <LoadingState label="Preparando la ronda…" />;
  if (phase === "error")
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <BackLink
          roundId={roundId}
          className="mt-4 inline-block text-sm font-medium text-primary"
        />
      </div>
    );

  if (phase === "done" && summary) {
    const a = summary.attempt;
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-8 text-center shadow-[var(--shadow-card)]">
        <Trophy className="h-10 w-10 text-[color:var(--gold)]" />
        <h1 className="font-serif text-2xl font-semibold">
          {roundId.startsWith("cs:") ? "Estación completada" : "Ronda completada"}
        </h1>
        <div className="grid w-full grid-cols-3 gap-3">
          <Big value={a.totalScore.toFixed(0)} label="RP" />
          <Big value={`${a.correctCount}/${a.answers.length}`} label="aciertos" />
          <Big value={fmtMs(a.totalMs)} label="tiempo" />
        </div>
        {summary.bossPerfect && (
          <p className="flex items-center gap-1 text-sm font-medium text-[color:var(--success)]">
            <Sparkles className="h-4 w-4" /> ¡Caso BOSS perfecto! +20 %
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          <BackLink
            roundId={roundId}
            className="rounded-md bg-[color:var(--navy)] px-4 py-2 text-sm font-semibold text-white"
          />
          <Link
            to="/radar-hunt/perfil"
            className="rounded-md border border-border px-4 py-2 text-sm"
          >
            Ver mi progreso
          </Link>
        </div>
      </div>
    );
  }

  if (!q) return null;
  const pq = q.question;
  const pct = (remaining / pq.timeLimitS) * 100;
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {SUBSPECIALTY_LABELS[pq.subspecialty as keyof typeof SUBSPECIALTY_LABELS]} · Pregunta{" "}
          {q.index + 1} de {q.total}
        </span>
        <span className="flex items-center gap-1 font-mono">
          <Timer className="h-4 w-4" /> {Math.ceil(remaining)} s
        </span>
      </div>
      <Progress value={phase === "question" ? pct : 0} className="h-1.5" />
      {q.reveal && (
        <div className="rounded-lg border-l-4 border-[color:var(--gold)] bg-[color:var(--gold)]/10 px-4 py-2 text-sm">
          <span className="font-semibold">Caso BOSS · </span>
          {q.reveal}
        </div>
      )}
      {pq.unvalidated && <UnvalidatedNotice />}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
        <h1 className="font-serif text-xl font-semibold leading-snug">{pq.stem}</h1>
        <div className="mt-5 grid gap-2">
          {pq.options.map((o, i) => {
            const chosen = picked.includes(o.id);
            const isRight = fb?.correctOptionIds.includes(o.id);
            const state =
              phase === "feedback"
                ? isRight
                  ? "right"
                  : chosen
                    ? "wrong"
                    : "idle"
                : chosen
                  ? "chosen"
                  : "idle";
            return (
              <button
                key={o.id}
                type="button"
                disabled={phase !== "question"}
                onClick={() => {
                  const sel =
                    pq.type === "multiple_choice"
                      ? chosen
                        ? picked.filter((x) => x !== o.id)
                        : [...picked, o.id]
                      : [o.id];
                  setPicked(sel);
                  if (pq.type === "single_choice") void submit(sel);
                }}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                  state === "right"
                    ? "border-success bg-success/10"
                    : state === "wrong"
                      ? "border-destructive bg-destructive/10"
                      : state === "chosen"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted"
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border font-mono text-xs">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{o.text}</span>
                {state === "right" && (
                  <CheckCircle2 className="h-5 w-5 text-[color:var(--success)]" />
                )}
                {state === "wrong" && <XCircle className="h-5 w-5 text-destructive" />}
              </button>
            );
          })}
        </div>
        {pq.type === "multiple_choice" && phase === "question" && (
          <button
            type="button"
            onClick={() => submit(picked)}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Responder
          </button>
        )}
      </div>

      {phase === "feedback" && fb && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              className={`flex items-center gap-2 font-semibold ${fb.record.isCorrect ? "text-[color:var(--success)]" : "text-destructive"}`}
            >
              {fb.record.isCorrect ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              {fb.record.isCorrect
                ? `¡Correcto! +${fb.record.points.toFixed(0)} RP`
                : fb.record.responseMs > pq.timeLimitS * 1000
                  ? "Tiempo agotado"
                  : "Incorrecto"}
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              {fmtMs(fb.record.responseMs)}
            </span>
          </div>
          <p className="mt-3 text-sm">{fb.explanation}</p>
          <ul className="mt-3 space-y-1">
            {fb.references.map((r) => (
              <li key={r.citation} className="flex gap-2 text-xs text-muted-foreground">
                <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {r.url ? (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline-offset-2 hover:underline"
                  >
                    {r.citation}
                  </a>
                ) : (
                  r.citation
                )}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setFlagOpen((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Flag className="h-3.5 w-3.5" /> Impugnar pregunta
            </button>
            <button
              type="button"
              onClick={() => attemptId && loadNext(attemptId)}
              className="flex items-center gap-1 rounded-md bg-[color:var(--navy)] px-4 py-2 text-sm font-semibold text-white"
            >
              {fb.isLast ? "Ver resultado" : "Siguiente"} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          {flagOpen && (
            <div className="mt-3 flex flex-col gap-2">
              <Textarea
                value={flagText}
                onChange={(e) => setFlagText(e.target.value)}
                placeholder="Explica por qué crees que la pregunta o la respuesta son incorrectas, con referencia si puedes."
              />
              <button
                type="button"
                disabled={flagText.trim().length < 5}
                onClick={flag}
                className="self-end rounded-md border border-border px-3 py-1.5 text-xs disabled:opacity-50"
              >
                Enviar impugnación
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Big({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border px-3 py-3">
      <div className="font-serif text-2xl font-semibold">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
