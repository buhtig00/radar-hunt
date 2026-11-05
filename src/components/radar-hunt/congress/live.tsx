// RADAR HUNT — directo en sala: vista del participante (móvil) y tablero de la pantalla.
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookOpen, CheckCircle2, Radio, Timer, XCircle } from "lucide-react";
import { rhc } from "@/lib/radar-hunt/congress/service";
import { rhcKeys, useLive } from "@/lib/radar-hunt/congress/hooks";
import { useCountdown } from "@/lib/radar-hunt/congress/use-countdown";
import type { LiveView } from "@/lib/radar-hunt/congress/types";
import { UnvalidatedNotice } from "@/components/radar-hunt/ui";

const LETTERS = "ABCDEF";

export function PhaseLabel({ view, size = "sm" }: { view: LiveView; size?: "sm" | "lg" }) {
  const label =
    view.phase === "open"
      ? "Pregunta abierta"
      : view.phase === "closed"
        ? "Respuestas cerradas"
        : view.phase === "reveal"
          ? "Respuesta"
          : view.phase === "leaderboard"
            ? "Clasificación"
            : view.phase === "ended"
              ? "Sesión terminada"
              : "En espera";
  return (
    <span
      className={`inline-flex items-center rounded-full bg-[color:var(--navy)] font-semibold uppercase tracking-wide text-white ${
        size === "lg" ? "gap-2 px-4 py-2 text-lg" : "gap-1.5 px-2.5 py-1 text-[11px]"
      }`}
    >
      <Radio
        className={`${size === "lg" ? "h-5 w-5" : "h-3 w-3"} ${view.phase === "open" ? "animate-pulse text-[color:var(--gold)]" : ""}`}
      />
      {label}
    </span>
  );
}

export function LiveParticipant({ slug, joined }: { slug: string; joined: boolean }) {
  const q = useLive(slug);
  const qc = useQueryClient();
  const v = q.data;
  const left = useCountdown(v);
  const [picked, setPicked] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const itemKey = `${v?.session.id}:${v?.item?.id}`;
  useEffect(() => setPicked([]), [itemKey]);

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Conectando con la sala…</p>;
  if (!v)
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Ahora no hay ninguna sesión en directo. Cuando el moderador lance un reto o una encuesta,
        aparecerá aquí automáticamente.
      </div>
    );

  const item = v.item;
  const answered = !!v.myAnswer;
  const canAnswer = joined && v.phase === "open" && !answered && left > 0;
  const submit = async () => {
    if (!item || picked.length === 0) return;
    setSending(true);
    try {
      await rhc.answerLive(slug, v.session.id, item.id, picked);
      toast.success("Respuesta enviada");
      await qc.invalidateQueries({ queryKey: rhcKeys.live(slug) });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs text-muted-foreground">
            {v.session.room}
            {v.session.speaker ? ` · ${v.session.speaker}` : ""}
          </div>
          <div className="font-serif text-lg font-semibold">{v.session.title}</div>
        </div>
        <PhaseLabel view={v} />
      </div>
      {!item ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
          {v.phase === "ended"
            ? "La sesión ha terminado. ¡Gracias por participar!"
            : "Esperando a que el moderador lance la siguiente pregunta…"}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {item.kind === "poll" ? "Encuesta de la sesión (anónima, no da RP)" : "Reto en sala"}{" "}
              · {v.itemIndex + 1}/{v.itemCount}
            </span>
            {v.phase === "open" && (
              <span className="flex items-center gap-1 font-mono">
                <Timer className="h-3.5 w-3.5" /> {Math.ceil(left / 1000)} s
              </span>
            )}
          </div>
          {item.unvalidated && <UnvalidatedNotice />}
          <h3 className="mt-2 font-serif text-lg font-semibold leading-snug">{item.stem}</h3>
          {item.multiple && (
            <p className="mt-1 text-xs text-muted-foreground">Puede haber varias correctas.</p>
          )}
          <div className="mt-4 grid gap-2">
            {item.options.map((o, i) => {
              const chosen = (v.myAnswer?.selected ?? picked).includes(o.id);
              const right = v.reveal?.correctOptionIds.includes(o.id);
              const n = v.reveal?.tally[o.id];
              const pct =
                v.reveal && v.reveal.answered
                  ? Math.round(((n ?? 0) / v.reveal.answered) * 100)
                  : null;
              return (
                <button
                  key={o.id}
                  type="button"
                  disabled={!canAnswer}
                  onClick={() =>
                    setPicked((p) =>
                      item.multiple
                        ? p.includes(o.id)
                          ? p.filter((x) => x !== o.id)
                          : [...p, o.id]
                        : [o.id],
                    )
                  }
                  className={`relative overflow-hidden rounded-lg border px-3 py-3 text-left text-sm transition-colors ${
                    right
                      ? "border-success bg-success/10"
                      : chosen
                        ? "border-[color:var(--navy)] bg-[color:var(--navy)]/10"
                        : "border-border hover:bg-muted"
                  } disabled:cursor-default`}
                >
                  {pct !== null && (
                    <span
                      className="absolute inset-y-0 left-0 bg-[color:var(--gold)]/15"
                      style={{ width: `${pct}%` }}
                      aria-hidden
                    />
                  )}
                  <span className="relative flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold">
                      {LETTERS[i]}
                    </span>
                    <span className="flex-1">{o.text}</span>
                    {pct !== null && <span className="font-mono text-xs">{pct} %</span>}
                    {right && <CheckCircle2 className="h-4 w-4 text-[color:var(--success)]" />}
                  </span>
                </button>
              );
            })}
          </div>
          {canAnswer && (
            <button
              type="button"
              onClick={submit}
              disabled={sending || picked.length === 0}
              className="mt-4 w-full rounded-md bg-[color:var(--navy)] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {sending ? "Enviando…" : "Responder"}
            </button>
          )}
          {!joined && v.phase === "open" && (
            <p className="mt-3 text-xs text-muted-foreground">
              Inscríbete en el congreso para responder.
            </p>
          )}
          {answered && v.phase === "open" && (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Respuesta registrada. Espera a la corrección en pantalla.
            </p>
          )}
          {v.myAnswer &&
            item.kind === "quiz" &&
            (v.phase === "reveal" || v.phase === "leaderboard") && (
              <p
                className={`mt-3 flex items-center justify-center gap-1 text-sm font-semibold ${v.myAnswer.isCorrect ? "text-[color:var(--success)]" : "text-destructive"}`}
              >
                {v.myAnswer.isCorrect ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {v.myAnswer.isCorrect
                  ? `¡Correcta! +${Math.round(v.myAnswer.points)} RP`
                  : "No era esa"}
              </p>
            )}
          {v.reveal?.explanation && (
            <div className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm">
              <p>{v.reveal.explanation}</p>
              {v.reveal.references.map((r) => (
                <p
                  key={r.citation}
                  className="mt-1 flex items-start gap-1 text-xs text-muted-foreground"
                >
                  <BookOpen className="mt-0.5 h-3 w-3 shrink-0" />
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noreferrer" className="underline">
                      {r.citation}
                    </a>
                  ) : (
                    r.citation
                  )}
                </p>
              ))}
            </div>
          )}
          <p className="mt-3 text-right text-[11px] text-muted-foreground">
            {v.answered} de {v.participants} participantes han respondido
          </p>
        </div>
      )}
    </div>
  );
}
