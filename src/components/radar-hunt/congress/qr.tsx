// RADAR HUNT — códigos QR: generación (pósteres de estación y acceso a la sala) y lectura
// con la cámara (BarcodeDetector nativo o jsQR como alternativa), más código manual.
import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Keyboard } from "lucide-react";

export function QrImage({
  text,
  size = 220,
  className,
}: {
  text: string;
  size?: number;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    import("qrcode")
      .then((m) =>
        m.toDataURL(text, {
          width: size * 2,
          margin: 1,
          errorCorrectionLevel: "M",
          color: { dark: "#0b1f3a", light: "#ffffff" },
        }),
      )
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(null));
    return () => {
      alive = false;
    };
  }, [text, size]);
  return src ? (
    <img src={src} width={size} height={size} alt="Código QR" className={className} />
  ) : (
    <div
      style={{ width: size, height: size }}
      className={`animate-pulse rounded bg-muted ${className ?? ""}`}
    />
  );
}

type Detector = { detect(src: CanvasImageSource): Promise<{ rawValue: string }[]> };

export function QrScanner({
  onResult,
  busy,
}: {
  onResult: (text: string) => void;
  busy?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"idle" | "starting" | "on" | "denied" | "unsupported">("idle");
  const [manual, setManual] = useState("");
  const stop = useRef<() => void>(() => {});
  const cb = useRef(onResult);
  cb.current = onResult;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => () => stop.current(), []);

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) return setState("unsupported");
    setState("starting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
    } catch {
      return setState("denied");
    }
    const el = video.current!;
    el.srcObject = stream;
    await el.play().catch(() => {});
    setState("on");
    const W = window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector };
    const native = W.BarcodeDetector ? new W.BarcodeDetector({ formats: ["qr_code"] }) : null;
    const jsqr = native ? null : (await import("jsqr")).default;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let raf = 0;
    let last = "";
    const tick = async () => {
      if (el.readyState >= 2 && !busyRef.current) {
        try {
          let value: string | undefined;
          if (native) value = (await native.detect(el))[0]?.rawValue;
          else if (jsqr && ctx) {
            canvas.width = el.videoWidth;
            canvas.height = el.videoHeight;
            ctx.drawImage(el, 0, 0);
            value = jsqr(
              ctx.getImageData(0, 0, canvas.width, canvas.height).data,
              canvas.width,
              canvas.height,
            )?.data;
          }
          if (value && value !== last) {
            last = value;
            cb.current(value);
          }
        } catch {
          /* fotograma ilegible: seguimos */
        }
      }
      raf = window.setTimeout(() => requestAnimationFrame(tick), 180) as unknown as number;
    };
    tick();
    stop.current = () => {
      clearTimeout(raf);
      stream.getTracks().forEach((t) => t.stop());
    };
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square w-full max-w-sm self-center overflow-hidden rounded-2xl border border-border bg-black">
        <video
          ref={video}
          className="h-full w-full object-cover"
          playsInline
          muted
          aria-label="Cámara para escanear el código QR"
        />
        {state !== "on" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-white/80">
            {state === "denied" || state === "unsupported" ? (
              <>
                <CameraOff className="h-8 w-8" />
                {state === "denied"
                  ? "No hay permiso para usar la cámara. Escribe el código que aparece bajo el QR."
                  : "Este navegador no permite usar la cámara. Escribe el código de la estación."}
              </>
            ) : (
              <button
                type="button"
                onClick={start}
                disabled={state === "starting"}
                className="flex items-center gap-2 rounded-md bg-[color:var(--gold)] px-4 py-2 font-semibold text-[color:var(--navy)]"
              >
                <Camera className="h-4 w-4" />{" "}
                {state === "starting" ? "Abriendo la cámara…" : "Activar la cámara"}
              </button>
            )}
          </div>
        )}
        {state === "on" && (
          <div className="pointer-events-none absolute inset-[18%] rounded-xl border-2 border-[color:var(--gold)]/80" />
        )}
      </div>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) onResult(manual.trim());
        }}
      >
        <label
          className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground"
          htmlFor="rh-manual-code"
        >
          <span className="flex items-center gap-1">
            <Keyboard className="h-3.5 w-3.5" /> O escribe el código de la estación
          </span>
          <input
            id="rh-manual-code"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="ABCD-EFGH"
            autoComplete="off"
            className="rounded-md border border-border bg-background px-3 py-2 font-mono text-sm uppercase tracking-widest text-foreground"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !manual.trim()}
          className="rounded-md bg-[color:var(--navy)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Validar
        </button>
      </form>
    </div>
  );
}
