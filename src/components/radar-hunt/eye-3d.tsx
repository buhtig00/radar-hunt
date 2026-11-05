// RADAR HUNT — visor 3D del ojo (three.js). Carga perezosa en el navegador (SSR seguro).
import { useEffect, useRef, useState } from "react";
import type * as T3 from "three";
import type { EyeModel, StationMarker } from "./eye-model";
import type { StructureCode } from "./eye-anim";
import { getStructure } from "@/lib/radar-hunt/eye-universe";
import type { AdnexaMode, EyeView } from "@/lib/radar-hunt/eye-tracks";

export type CameraPreset =
  | "front"
  | "cornea"
  | "iris"
  | "sagittal"
  | "lens"
  | "fundus"
  | "fovea"
  | "posterior"
  | "orbit";

const PRESETS: Record<
  CameraPreset,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  front: { pos: [0, 4, 46], target: [0, 0, 0] },
  cornea: { pos: [9, 4, 24], target: [0, 0, 11] },
  iris: { pos: [0, 0, 23], target: [0, 0, 9] },
  sagittal: { pos: [52, 6, 6], target: [0, 0, 4] },
  lens: { pos: [24, 7, 15], target: [0, 0, 8] },
  fundus: { pos: [0, 0, 5], target: [0, 0, -11] },
  fovea: { pos: [0, 0, -4], target: [0, 0, -11] },
  posterior: { pos: [14, 10, -44], target: [0, 0, -4] },
  orbit: { pos: [-62, 40, 66], target: [0, 0, -8] },
};

/** Volúmenes translúcidos: no deben tapar lo que hay detrás al seleccionar. */
const SEE_THROUGH = new Set<string>(["vitreous", "orbit"]);

function visibleInScene(o: T3.Object3D): boolean {
  for (let x: T3.Object3D | null = o; x; x = x.parent) if (!x.visible) return false;
  return true;
}

export interface Eye3DProps {
  accommodation: number;
  pupilFactor: number;
  cutaway: boolean;
  preset: CameraPreset;
  selected: StructureCode | null;
  onSelect: (code: StructureCode | null) => void;
  /** Viaje por estaciones: marcadores y estación activa/completadas. */
  stations?: StationMarker[];
  activeStation?: string | null;
  doneStations?: string[];
  onStation?: (code: string) => void;
  /** Modo didáctico: flujo animado del humor acuoso (producción → pupila → drenaje). */
  aqueousFlow?: boolean;
  /** Anejos y órbita: órbita, músculos, nervio y vía lagrimal ("orbit") y párpados ("full"). */
  adnexa?: AdnexaMode;
  /** Cámara concreta (estación de un recorrido): tiene prioridad sobre `preset` al cambiar `key`. */
  view?: EyeView & { key: string };
  className?: string;
}

export function Eye3D({
  accommodation,
  pupilFactor,
  cutaway,
  preset,
  selected,
  onSelect,
  stations,
  activeStation = null,
  doneStations,
  onStation,
  aqueousFlow = false,
  adnexa = "off",
  view,
  className,
}: Eye3DProps) {
  const host = useRef<HTMLDivElement>(null);
  const model = useRef<EyeModel | null>(null);
  const goTo = useRef<((p: CameraPreset) => void) | null>(null);
  const flyTo = useRef<((v: EyeView) => void) | null>(null);
  const hoveredRef = useRef<StructureCode | null>(null);
  const invalidateRef = useRef<(() => void) | null>(null);
  const selectedRef = useRef<StructureCode | null>(selected);
  const onSelectRef = useRef(onSelect);
  const onStationRef = useRef(onStation);
  onStationRef.current = onStation;
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [hover, setHover] = useState<string | null>(null);
  const [hoverStation, setHoverStation] = useState<string | null>(null);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      try {
        const THREE = await import("three");
        const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
        const { buildEye } = await import("./eye-model");
        if (disposed || !host.current) return;
        const el = host.current;
        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        renderer.setSize(el.clientWidth, el.clientHeight);
        renderer.localClippingEnabled = true;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        el.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x070b12);
        const camera = new THREE.PerspectiveCamera(38, el.clientWidth / el.clientHeight, 0.1, 400);
        camera.position.set(...PRESETS.front.pos);
        scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1a0f0c, 0.9));
        const key = new THREE.DirectionalLight(0xffffff, 1.4);
        key.position.set(20, 30, 40);
        scene.add(key);
        const coaxial = new THREE.PointLight(0xfff1e0, 60, 120, 1.6); // luz coaxial (lámpara de hendidura)
        coaxial.position.set(0, 0, 30);
        scene.add(coaxial);
        const inner = new THREE.PointLight(0xffd9c0, 25, 40, 1.4); // ilumina el fondo de ojo
        inner.position.set(0, 0, 2);
        scene.add(inner);

        const eye = buildEye();
        model.current = eye;
        scene.add(eye.root);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.minDistance = 1.5;
        controls.maxDistance = 120;
        controls.target.set(0, 0, 0);

        let anim: {
          from: T3.Vector3;
          to: T3.Vector3;
          tFrom: T3.Vector3;
          tTo: T3.Vector3;
          t0: number;
        } | null = null;
        const fly = (v: EyeView) => {
          anim = {
            from: camera.position.clone(),
            to: new THREE.Vector3(...v.pos),
            tFrom: controls.target.clone(),
            tTo: new THREE.Vector3(...v.target),
            t0: performance.now(),
          };
        };
        goTo.current = (p: CameraPreset) => fly(PRESETS[p]);

        const ray = new THREE.Raycaster();
        ray.params.Line = { threshold: 0.15 };
        const ndc = new THREE.Vector2();
        const pick = (ev: PointerEvent): StructureCode | null => {
          const rect = renderer.domElement.getBoundingClientRect();
          ndc.set(
            ((ev.clientX - rect.left) / rect.width) * 2 - 1,
            -((ev.clientY - rect.top) / rect.height) * 2 + 1,
          );
          ray.setFromCamera(ndc, camera);
          const hits = ray.intersectObjects(eye.pickables, true).filter((h) => {
            if (!visibleInScene(h.object)) return false;
            const mat = (h.object as T3.Mesh).material as T3.Material | undefined;
            const planes = mat?.clippingPlanes ?? [];
            return planes.every((pl: T3.Plane) => pl.distanceToPoint(h.point) >= 0);
          });
          for (const h of hits) {
            const code = (h.object.userData.structure ?? h.object.parent?.userData.structure) as
              | StructureCode
              | undefined;
            // los volúmenes transparentes no deben tapar lo que hay detrás
            if (code && SEE_THROUGH.has(code) && hits.length > 1) continue;
            if (code) return code;
          }
          return null;
        };
        // Las estaciones (sprites) tienen prioridad: se ven y se pulsan a través del ojo
        const pickStation = (ev: PointerEvent): string | null => {
          const rect = renderer.domElement.getBoundingClientRect();
          ndc.set(
            ((ev.clientX - rect.left) / rect.width) * 2 - 1,
            -((ev.clientY - rect.top) / rect.height) * 2 + 1,
          );
          ray.setFromCamera(ndc, camera);
          const sprites = eye.pickables.filter((o) => o.userData.station);
          const hit = ray.intersectObjects(sprites, false)[0];
          return (hit?.object.userData.station as string | undefined) ?? null;
        };
        let down = { x: 0, y: 0 };
        const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
        const onUp = (e: PointerEvent) => {
          if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return; // fue un arrastre
          const st = onStationRef.current ? pickStation(e) : null;
          if (st) onStationRef.current?.(st);
          else onSelectRef.current(pick(e));
        };
        const onMove = (e: PointerEvent) => {
          const c = pick(e);
          if (c !== hoveredRef.current) {
            hoveredRef.current = c;
            setHover(c);
            eye.highlight(selectedRef.current, c);
            invalidateRef.current?.();
            renderer.domElement.style.cursor = c ? "pointer" : "grab";
          }
          const stHover = onStationRef.current ? pickStation(e) : null;
          setHoverStation((prev) => (prev === stHover ? prev : stHover));
          if (stHover) renderer.domElement.style.cursor = "pointer";
        };
        renderer.domElement.addEventListener("pointerdown", onDown);
        renderer.domElement.addEventListener("pointerup", onUp);
        renderer.domElement.addEventListener("pointermove", onMove);

        const ro = new ResizeObserver(() => {
          if (!invalidateRef.current) return;
          const w = el.clientWidth,
            h = el.clientHeight;
          if (!w || !h) return;
          renderer.setSize(w, h);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          invalidateRef.current();
        });
        ro.observe(el);

        // Render bajo demanda: solo cuando algo cambia (cámara, animación, props).
        let raf = 0;
        let dirtyFrames = 2;
        const invalidate = () => {
          dirtyFrames = Math.max(dirtyFrames, 2);
          if (!raf) raf = requestAnimationFrame(frame);
        };
        const frame = () => {
          raf = 0;
          let moving = false;
          if (anim) {
            const u = Math.min(1, (performance.now() - anim.t0) / 1100);
            const e = 0.5 - 0.5 * Math.cos(Math.PI * u);
            camera.position.lerpVectors(anim.from, anim.to, e);
            controls.target.lerpVectors(anim.tFrom, anim.tTo, e);
            if (u >= 1) anim = null;
            moving = true;
          }
          if (controls.update()) moving = true; // amortiguación en curso
          renderer.render(scene, camera);
          // como mucho UN fotograma pendiente (los eventos "change" de update() ya pueden haberlo pedido)
          if ((moving || --dirtyFrames > 0) && !raf) raf = requestAnimationFrame(frame);
        };
        controls.addEventListener("change", invalidate);
        eye.onChange = invalidate;
        invalidateRef.current = invalidate;
        const prevGoTo = goTo.current;
        goTo.current = (p: CameraPreset) => {
          prevGoTo?.(p);
          invalidate();
        };
        flyTo.current = (v: EyeView) => {
          fly(v);
          invalidate();
        };
        invalidate();
        setStatus("ready");

        // Gancho de depuración (solo en desarrollo) para verificar modos sin interfaz
        const dbgWin = window as unknown as { __rhEyeDebug?: unknown };
        if (import.meta.env.DEV) {
          dbgWin.__rhEyeDebug = {
            setAqueousFlow: (on: boolean) => {
              eye.setAqueousFlow(on);
              invalidate();
            },
            setCutaway: (on: boolean) => {
              eye.setCutaway(on);
              invalidate();
            },
            goTo: (p: CameraPreset) => goTo.current?.(p),
            view: (pos: [number, number, number], target: [number, number, number]) => {
              anim = null;
              camera.position.set(...pos);
              controls.target.set(...target);
              invalidate();
            },
          };
        }

        cleanup = () => {
          if (import.meta.env.DEV) delete dbgWin.__rhEyeDebug;
          cancelAnimationFrame(raf);
          invalidateRef.current = null;
          controls.removeEventListener("change", invalidate);
          ro.disconnect();
          renderer.domElement.removeEventListener("pointerdown", onDown);
          renderer.domElement.removeEventListener("pointerup", onUp);
          renderer.domElement.removeEventListener("pointermove", onMove);
          controls.dispose();
          eye.dispose();
          renderer.dispose();
          el.removeChild(renderer.domElement);
          model.current = null;
          goTo.current = null;
          flyTo.current = null;
        };
      } catch (e) {
        console.error(e);
        if (!disposed) setStatus("error");
      }
    })();
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  useEffect(() => {
    model.current?.setAccommodation(accommodation);
    invalidateRef.current?.();
  }, [accommodation, status]);
  useEffect(() => {
    model.current?.setPupilFactor(pupilFactor);
    invalidateRef.current?.();
  }, [pupilFactor, status]);
  useEffect(() => {
    model.current?.setCutaway(cutaway);
    invalidateRef.current?.();
  }, [cutaway, status]);
  useEffect(() => {
    model.current?.setAqueousFlow(!!aqueousFlow);
    invalidateRef.current?.();
  }, [aqueousFlow, status]);
  useEffect(() => {
    selectedRef.current = selected;
    model.current?.highlight(selected, hoveredRef.current);
    invalidateRef.current?.();
  }, [selected, status]);
  useEffect(() => {
    if (status === "ready" && !view) goTo.current?.(preset);
  }, [preset, status, view]);
  // La cámara de estación se vuelve a aplicar solo cuando cambia su clave (no en cada render)
  const viewRef = useRef(view);
  viewRef.current = view;
  useEffect(() => {
    if (status === "ready" && viewRef.current) flyTo.current?.(viewRef.current);
  }, [view?.key, status]);
  useEffect(() => {
    model.current?.setAdnexa(adnexa);
    invalidateRef.current?.();
  }, [adnexa, status]);
  const stationLabel = hoverStation
    ? stations?.find((x) => x.code === hoverStation)?.label
    : undefined;
  useEffect(() => {
    model.current?.setStations(stations ?? [], activeStation, doneStations ?? []);
    invalidateRef.current?.();
  }, [stations, activeStation, doneStations, status]);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-white/10 bg-[#070b12] ${className ?? ""}`}
    >
      <div
        ref={host}
        className="absolute inset-0"
        aria-label="Modelo 3D interactivo del ojo humano"
        role="img"
      />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
          Cargando el ojo 3D…
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/80">
          Tu navegador no ha podido iniciar WebGL. Prueba con otro navegador o activa la aceleración
          por hardware.
        </div>
      )}
      {(stationLabel || hover) && status === "ready" && (
        <div className="pointer-events-none absolute left-3 top-3 max-w-[80%] rounded-md bg-black/65 px-2 py-1 text-xs font-medium text-white">
          {stationLabel ?? getStructure(hover ?? undefined)?.name ?? hover}
        </div>
      )}
    </div>
  );
}
