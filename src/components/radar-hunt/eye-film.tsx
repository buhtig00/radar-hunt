// RADAR HUNT — reproductor de estaciones del Eye Universe. Cada estación es un corte de la
// película máster v4 (1080p). En modo continuo encadena las 9 estaciones (la película completa).
// Con VITE_EYE_VIDEO_URL (HLS o MP4 de la película completa) se reproduce ese archivo saltando
// a cada capítulo.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  EYE_CHAPTERS,
  EYE_HOTSPOTS,
  EYE_STATIONS,
  EYE_VIDEO_URL,
  getStation,
} from "@/lib/radar-hunt/eye-universe";

export interface EyeFilmProps {
  station: string;
  /** Encadenar automáticamente la siguiente estación al terminar. */
  autoAdvance?: boolean;
  onStation: (code: string) => void;
  onStructure: (code: string) => void;
  /** Se llama cuando la estación se ha visto completa. */
  onStationEnded?: (code: string) => void;
  showChapterBar?: boolean;
  className?: string;
}

export function EyeFilm({
  station,
  autoAdvance = false,
  onStation,
  onStructure,
  onStationEnded,
  showChapterBar = true,
  className,
}: EyeFilmProps) {
  const video = useRef<HTMLVideoElement>(null);
  const [t, setT] = useState(0);
  const st = getStation(station) ?? EYE_STATIONS[0];
  const ch = EYE_CHAPTERS.find((c) => c.code === st.code)!;
  const film = EYE_VIDEO_URL; // película completa externa (opcional)
  const src = film ?? st.video;

  // HLS para navegadores sin soporte nativo
  useEffect(() => {
    const el = video.current;
    if (!el || !src) return;
    let hls: { destroy(): void } | null = null;
    if (src.endsWith(".m3u8") && !el.canPlayType("application/vnd.apple.mpegurl")) {
      import("hls.js").then(({ default: Hls }) => {
        if (!Hls.isSupported()) return;
        const h = new Hls();
        h.loadSource(src);
        h.attachMedia(el);
        hls = h;
      });
    } else if (el.getAttribute("src") !== src) {
      el.src = src;
    }
    return () => hls?.destroy();
  }, [src]);

  // Película externa: saltar al tramo de la estación
  useEffect(() => {
    const el = video.current;
    if (el && film) {
      el.currentTime = st.clipStartS;
      void el.play().catch(() => {});
    }
  }, [film, st.code, st.clipStartS]);

  // Estación local: reproducir al cambiar
  useEffect(() => {
    const el = video.current;
    if (el && !film) {
      el.currentTime = 0;
      void el.play().catch(() => {});
    }
  }, [film, st.code]);

  const next = () => {
    const i = EYE_STATIONS.findIndex((x) => x.code === st.code);
    return EYE_STATIONS[i + 1];
  };

  const onTime = () => {
    const el = video.current;
    if (!el) return;
    setT(el.currentTime);
    if (film && el.currentTime >= st.clipEndS) {
      onStationEnded?.(st.code);
      const n = next();
      if (autoAdvance && n) onStation(n.code);
      else el.pause();
    }
  };
  const onEnded = () => {
    if (film) return;
    onStationEnded?.(st.code);
    const n = next();
    if (autoAdvance && n) onStation(n.code);
  };

  // Tiempo en la película (para los puntos interactivos)
  const filmTime = film ? t : st.clipStartS + t;
  const hotspots = useMemo(
    () =>
      EYE_HOTSPOTS.filter(
        (h) => h.chapter === st.code && filmTime >= h.startS && filmTime <= h.endS,
      ),
    [st.code, filmTime],
  );

  return (
    <div className={`space-y-3 ${className ?? ""}`}>
      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
        <video
          ref={video}
          className="h-full w-full object-contain"
          poster={film ? undefined : st.poster}
          controls
          playsInline
          muted
          preload="auto"
          onTimeUpdate={onTime}
          onEnded={onEnded}
          aria-label={`Eye Universe · Estación ${st.number}: ${ch.title}`}
        />
        <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
          Estación {st.number} · {ch.title}
        </div>
        {hotspots.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => onStructure(h.structure)}
            className="group absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%` }}
          >
            <span className="relative flex h-5 w-5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400/60" />
              <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-sky-500" />
            </span>
            <span className="absolute left-6 top-0 whitespace-nowrap rounded bg-black/70 px-2 py-0.5 text-xs text-white opacity-90 group-hover:opacity-100">
              {h.label}
            </span>
          </button>
        ))}
      </div>
      {showChapterBar && (
        <ol className="flex gap-2 overflow-x-auto pb-1" aria-label="Estaciones de la película">
          {EYE_STATIONS.map((x) => {
            const c = EYE_CHAPTERS.find((k) => k.code === x.code)!;
            return (
              <li key={x.code}>
                <button
                  type="button"
                  onClick={() => onStation(x.code)}
                  className={`min-w-[150px] rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                    x.code === st.code
                      ? "border-sky-400 bg-sky-500/15 text-foreground"
                      : "border-border bg-surface text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <span className="block font-mono text-[10px] opacity-60">
                    {String(x.number).padStart(2, "0")} · {x.code}
                  </span>
                  <span className="block font-medium">{c.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
