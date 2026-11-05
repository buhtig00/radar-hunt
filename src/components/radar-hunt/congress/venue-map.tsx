// RADAR HUNT — plano de la sede por plantas. Si la planta tiene un plano propio (imagen
// con derechos de uso) se muestra debajo; si no, se dibuja el esquema de salas.
import { CheckCircle2, Lock, ScanLine } from "lucide-react";
import type { Floor, StationStatus } from "@/lib/radar-hunt/congress/types";

export interface MapPin {
  id: string;
  label: string;
  title: string;
  floorId: string;
  x: number;
  y: number;
  status?: StationStatus;
}

const PIN: Record<StationStatus | "admin", string> = {
  locked: "fill-[#0b1f3a] stroke-white",
  unlocked: "fill-[#c9a227] stroke-white",
  done: "fill-[#1f9d6b] stroke-white",
  admin: "fill-[#0b1f3a] stroke-[#c9a227]",
};

export function VenueMap({
  floors,
  floorId,
  onFloor,
  pins,
  selectedId,
  onPin,
  onPlace,
}: {
  floors: Floor[];
  floorId: string;
  onFloor: (id: string) => void;
  pins: MapPin[];
  selectedId?: string;
  onPin?: (id: string) => void;
  /** Modo edición: clic en el plano para colocar la estación seleccionada. */
  onPlace?: (x: number, y: number) => void;
}) {
  const floor = floors.find((f) => f.id === floorId) ?? floors[0];
  if (!floor) return null;
  const here = pins.filter((p) => p.floorId === floor.id);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Plantas">
        {[...floors]
          .sort((a, b) => a.order - b.order)
          .map((f) => {
            const n = pins.filter((p) => p.floorId === f.id).length;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={f.id === floor.id}
                onClick={() => onFloor(f.id)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                  f.id === floor.id
                    ? "border-[color:var(--navy)] bg-[color:var(--navy)] text-white"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {f.name} · {n}
              </button>
            );
          })}
      </div>
      <div className="relative w-full overflow-hidden rounded-xl border border-border bg-[#f4f6fa] dark:bg-[#0d1626]">
        {floor.imageUrl && (
          <img
            src={floor.imageUrl}
            alt={`Plano: ${floor.name}`}
            className="absolute inset-0 h-full w-full object-contain opacity-80"
          />
        )}
        <svg
          viewBox="0 0 100 62"
          className={`relative block w-full ${onPlace ? "cursor-crosshair" : ""}`}
          role="img"
          aria-label={`Plano de ${floor.name} con ${here.length} estaciones`}
          onClick={(e) => {
            if (!onPlace) return;
            const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            onPlace(
              Math.round(((e.clientX - r.left) / r.width) * 1000) / 10,
              Math.round(((e.clientY - r.top) / r.height) * 1000) / 10,
            );
          }}
        >
          {!floor.imageUrl &&
            floor.rooms.map((rm) => (
              <g key={rm.id}>
                <rect
                  x={rm.x}
                  y={rm.y * 0.62}
                  width={rm.w}
                  height={rm.h * 0.62}
                  rx={1.2}
                  className="fill-white stroke-[#c8d0dc] dark:fill-[#13213a] dark:stroke-[#2a3a55]"
                  strokeWidth={0.3}
                />
                <text
                  x={rm.x + 1.5}
                  y={rm.y * 0.62 + 3.2}
                  className="fill-[#6b778a] text-[2.2px] font-medium dark:fill-[#8fa0ba]"
                >
                  {rm.name}
                </text>
              </g>
            ))}
          {here.map((p) => {
            const st = p.status ?? "admin";
            const sel = p.id === selectedId;
            return (
              <g
                key={p.id}
                transform={`translate(${p.x} ${p.y * 0.62})`}
                className={onPin ? "cursor-pointer" : undefined}
                onClick={(e) => {
                  if (!onPin) return;
                  e.stopPropagation();
                  onPin(p.id);
                }}
                role={onPin ? "button" : undefined}
                aria-label={`${p.label} · ${p.title}`}
              >
                {st === "unlocked" && (
                  <circle r={4.2} className="fill-[#c9a227]/25">
                    <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle r={sel ? 3.6 : 3} strokeWidth={sel ? 0.8 : 0.5} className={PIN[st]} />
                <text textAnchor="middle" dy="1" className="fill-white text-[2.6px] font-bold">
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Lock className="h-3 w-3" /> Por descubrir
        </span>
        <span className="flex items-center gap-1">
          <ScanLine className="h-3 w-3 text-[color:var(--gold)]" /> Desbloqueada (reto pendiente)
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-[color:var(--success)]" /> Completada
        </span>
      </div>
    </div>
  );
}
