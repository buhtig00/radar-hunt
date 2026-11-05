// RADAR HUNT — modelo 3D procedural del ojo derecho (three.js), a escala real en mm.
// Mismas medidas que la película y el inserto S02Z:
//   córnea R 7,8/6,5 mm, 0,55 mm de grosor central · cámara anterior ≈ 3 mm
//   cristalino relajado 3,60 mm × 9,30 mm → acomodado 4,05 × 8,90 (perfil S02Z)
//   globo R 12 mm · disco óptico nasal a ≈ 4,5 mm de la fóvea (ojo derecho)
// Eje óptico = +Y en la construcción (anterior arriba); el grupo se gira para que
// la parte anterior mire a la cámara (+Z).
import * as THREE from "three";
export { pupilReflexFactor } from "./eye-anim";
export type { StructureCode } from "./eye-anim";

import type { StructureCode } from "./eye-anim";

export interface EyeModel {
  root: THREE.Group;
  /** Se llama cuando la geometría o el resaltado cambian (render bajo demanda). */
  onChange?: () => void;
  pickables: THREE.Object3D[];
  setAccommodation(a: number): void;
  setPupilFactor(f: number): void;
  setCutaway(on: boolean): void;
  highlight(code: StructureCode | null, hovered?: StructureCode | null): void;
  /** Marcadores numerados de las estaciones del viaje (siempre visibles, clicables). */
  setStations(stations: StationMarker[], active: string | null, done: string[]): void;
  /**
   * Modo didáctico del humor acuoso: partículas animadas desde los procesos ciliares,
   * cámara posterior → pupila → cámara anterior → vía trabecular (≈80 %) o uveoescleral (≈20 %).
   */
  setAqueousFlow(on: boolean): void;
  /**
   * Anejos y órbita: "orbit" muestra órbita, músculos, nervio óptico y sistema lagrimal;
   * "full" añade los párpados. Solo lo visible se puede seleccionar.
   */
  setAdnexa(mode: "off" | "orbit" | "full"): void;
  dispose(): void;
}

export interface StationMarker {
  code: string;
  number: number;
  /** Posición en mm en los ejes del modelo (y = eje óptico anterior). */
  position: [number, number, number];
  /** Nombre visible al pasar por encima. */
  label?: string;
  /** Color del recorrido (por defecto, cian de la marca). */
  color?: string;
}

const MARKER_DEFAULT = "#22d3ee";

function markerTexture(
  n: number,
  state: "idle" | "active" | "done",
  color = MARKER_DEFAULT,
): THREE.CanvasTexture {
  const S = 128;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  // activa: relleno del color del recorrido · pendiente: azul noche con aro de color ·
  // completada: aro de color y marca ✓ (el dorado queda reservado al podio)
  if (state === "active") {
    g.beginPath();
    g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
    g.fillStyle = "rgba(255,255,255,0.28)";
    g.fill();
  }
  g.beginPath();
  g.arc(S / 2, S / 2, S / 2 - 10, 0, Math.PI * 2);
  g.fillStyle = state === "active" ? color : "#0b1f3a";
  g.fill();
  g.lineWidth = 9;
  g.strokeStyle = state === "active" ? "#ffffff" : color;
  g.stroke();
  g.fillStyle = state === "active" ? "#07111f" : "#ffffff";
  g.font = "bold 62px Inter, Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(state === "done" ? "✓" : String(n), S / 2, S / 2 + 3);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const SOFT_HIGHLIGHT: Record<string, number> = {
  eyelids: 0.15,
  orbit: 0.35,
  extraocular_muscles: 0.45,
  lacrimal: 0.5,
  optic_nerve: 0.6,
};

// --- perfil del cristalino (idéntico a S02Z/make_accommodation.py) -------------
function lensParams(a: number) {
  return {
    Tf: lerp(1.45, 1.8, a),
    Tb: lerp(2.15, 2.25, a),
    h: lerp(4.65, 4.45, a),
    cf: lerp(0.325, 0.34, a),
    cb: lerp(0.508, 0.53, a),
  };
}
function prof(T: number, c: number, u: number) {
  const v = Math.max(0, 1 - u * u);
  return (T * Math.sqrt(v) * (1 + c * v)) / (1 + c);
}

// Posiciones axiales (mm, globo centrado en 0)
const LIMBUS_R = 5.85;
const SCLERA_R = 12.0;
const SCLERA_IN = 11.3;
const LIMBUS_A = Math.sqrt(SCLERA_R ** 2 - LIMBUS_R ** 2); // ≈ 10,48
const CORNEA_C = LIMBUS_A - Math.sqrt(7.8 ** 2 - LIMBUS_R ** 2);
const CORNEA_APEX = CORNEA_C + 7.8; // ≈ 13,1
const CORNEA_BACK_APEX = CORNEA_APEX - 0.55;
const LENS_FRONT_RELAXED = CORNEA_BACK_APEX - 3.0;
const LENS_EQ = LENS_FRONT_RELAXED - 1.45; // plano ecuatorial fijo
const RETINA_R = 11.0;
const ORA_POLAR = (62 * Math.PI) / 180; // ángulo polar (desde +Y) del borde anterior de la retina

type LensParams = ReturnType<typeof lensParams>;
const IRIS_ROOT_R = 5.55;

/** Altura axial de la cápsula anterior del cristalino a la distancia r del eje (−∞ fuera). */
function capsuleA(L: LensParams, r: number): number {
  return r < L.h ? LENS_EQ + prof(L.Tf, L.cf, Math.min(0.999, r / L.h)) : -Infinity;
}

/** Superficie del iris (ligeramente cónica, apoyada en la cápsula) a la distancia r del eje. */
function irisSurfaceA(L: LensParams, rp: number, r: number): number {
  const t = Math.min(1, Math.max(0, (r - rp) / (IRIS_ROOT_R - rp)));
  const marginA = LENS_EQ + prof(L.Tf, L.cf, Math.min(0.999, rp / L.h));
  const flat =
    lerp(marginA + 0.05, LIMBUS_A - 1.1, Math.pow(t, 0.8)) + 0.12 * Math.sin(Math.PI * t);
  // la cara posterior del iris se apoya en la cápsula anterior: nunca por detrás del cristalino
  return Math.max(flat, capsuleA(L, r) + 0.08);
}

/** Endotelio corneal (cara posterior de la córnea) a la distancia r del eje. */
function corneaBackA(r: number): number {
  return CORNEA_BACK_APEX - 6.5 + Math.sqrt(Math.max(0, 6.5 ** 2 - r * r));
}

// --- humor acuoso: vías de flujo -------------------------------------------------
// Conducto de Schlemm: justo por fuera de la malla trabecular, por delante del espolón escleral.
const SCHLEMM_R = LIMBUS_R + 0.27; // ≈ 6,12 mm del eje
const SCHLEMM_A = LIMBUS_A - 0.5;
const FLOW_SAMPLES = 192;
const FLOW_STRIDE = 6; // r, a, alfa, mezcla de color, convección, deriva circunferencial
const FLOW_MERIDIANS = 32;
const FLOW_CONV_N = 1440; // vía convencional (trabecular) ≈ 80 %
const FLOW_UVEO_N = 360; // vía no convencional (uveoescleral) ≈ 20 %

interface FlowNode {
  r: number;
  a: number;
  /** Velocidad (mm/s, esquemática) hasta el nodo siguiente. */
  v?: number;
  /** Duración fija (s) del tramo hasta el nodo siguiente (p. ej. recorrido dentro del conducto). */
  dur?: number;
  alpha?: number;
  mix?: number;
  conv?: number;
  drift?: number;
}

/** Muestrea una vía (perfil meridional r–a) uniformemente en el tiempo. */
function sampleFlowPath(nodes: FlowNode[]): { table: Float32Array; duration: number } {
  const curve = new THREE.CatmullRomCurve3(
    nodes.map((n) => new THREE.Vector3(n.r, n.a, 0)),
    false,
    "centripetal",
  );
  const T = [0];
  for (let i = 0; i < nodes.length - 1; i++) {
    const n = nodes[i];
    const d = Math.hypot(nodes[i + 1].r - n.r, nodes[i + 1].a - n.a);
    T.push(T[i] + Math.max(0.05, n.dur ?? d / (n.v ?? 0.6)));
  }
  const duration = T[T.length - 1];
  const table = new Float32Array(FLOW_SAMPLES * FLOW_STRIDE);
  const p = new THREE.Vector3();
  let seg = 0;
  for (let s = 0; s < FLOW_SAMPLES; s++) {
    const tau = (s / (FLOW_SAMPLES - 1)) * duration;
    while (seg < nodes.length - 2 && tau > T[seg + 1]) seg++;
    const w = Math.min(1, Math.max(0, (tau - T[seg]) / (T[seg + 1] - T[seg])));
    curve.getPoint((seg + w) / (nodes.length - 1), p);
    const n0 = nodes[seg];
    const n1 = nodes[seg + 1];
    const o = s * FLOW_STRIDE;
    table[o] = p.x;
    table[o + 1] = p.y;
    table[o + 2] = lerp(n0.alpha ?? 1, n1.alpha ?? 1, w);
    table[o + 3] = lerp(n0.mix ?? 0, n1.mix ?? 0, w);
    table[o + 4] = lerp(n0.conv ?? 0, n1.conv ?? 0, w);
    table[o + 5] = lerp(n0.drift ?? 0, n1.drift ?? 0, w);
  }
  return { table, duration };
}

/** Generador pseudoaleatorio determinista (mulberry32). */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function particleTexture(): THREE.CanvasTexture {
  const S = 64;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.3, "rgba(255,255,255,0.75)");
  grd.addColorStop(0.65, "rgba(255,255,255,0.18)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  } catch {
    return false;
  }
}

function lathe(points: [number, number][], segments = 128) {
  return new THREE.LatheGeometry(
    points.map(([r, a]) => new THREE.Vector2(Math.max(0, r), a)),
    segments,
  );
}

function lensGeometry(a: number, inset = 0) {
  const L = lensParams(a);
  const h = L.h - inset;
  const Tf = Math.max(0.05, L.Tf - inset);
  const Tb = Math.max(0.05, L.Tb - inset);
  const pts: [number, number][] = [];
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const u = 1 - i / n; // del ecuador al polo, cara anterior
    pts.push([u * h, LENS_EQ + prof(Tf, L.cf, u)]);
  }
  pts.reverse(); // polo anterior → ecuador
  const front = pts;
  const back: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    back.push([u * h, LENS_EQ - prof(Tb, L.cb, u)]);
  }
  // perfil cerrado: polo anterior → ecuador → polo posterior
  const profile = [...front, ...back.reverse().slice(1)];
  return lathe(profile, 96);
}

// --- texturas procedurales ------------------------------------------------------
function irisTexture(): THREE.CanvasTexture {
  const S = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const cx = S / 2;
  const grd = g.createRadialGradient(cx, cx, S * 0.1, cx, cx, S * 0.5);
  grd.addColorStop(0, "#5b6f80");
  grd.addColorStop(0.45, "#7f97a8");
  grd.addColorStop(0.8, "#8aa0b0");
  grd.addColorStop(1, "#4f6170");
  g.fillStyle = grd;
  g.fillRect(0, 0, S, S);
  // fibras radiales del estroma
  for (let i = 0; i < 1400; i++) {
    const ang = (i / 1400) * Math.PI * 2 + Math.sin(i * 7.1) * 0.01;
    const r0 = S * (0.18 + 0.03 * Math.sin(i * 1.7));
    const r1 = S * (0.46 + 0.03 * Math.cos(i * 2.3));
    g.strokeStyle = i % 3 === 0 ? "rgba(225,232,238,0.18)" : "rgba(40,55,68,0.16)";
    g.lineWidth = 1 + (i % 4 === 0 ? 1 : 0);
    g.beginPath();
    g.moveTo(cx + r0 * Math.cos(ang), cx + r0 * Math.sin(ang));
    g.quadraticCurveTo(
      cx + ((r0 + r1) / 2) * Math.cos(ang + 0.03),
      cx + ((r0 + r1) / 2) * Math.sin(ang + 0.03),
      cx + r1 * Math.cos(ang),
      cx + r1 * Math.sin(ang),
    );
    g.stroke();
  }
  // collarete dorado
  g.strokeStyle = "rgba(196,154,92,0.55)";
  for (let k = 0; k < 3; k++) {
    g.lineWidth = 10 - k * 3;
    g.beginPath();
    for (let i = 0; i <= 180; i++) {
      const ang = (i / 180) * Math.PI * 2;
      const r = S * (0.26 + 0.012 * Math.sin(ang * 14));
      const x = cx + r * Math.cos(ang);
      const y = cx + r * Math.sin(ang);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  // criptas
  for (let i = 0; i < 22; i++) {
    const ang = (i / 22) * Math.PI * 2 + 0.2;
    const r = S * (0.3 + (0.06 * ((i * 37) % 5)) / 5);
    g.fillStyle = "rgba(30,40,52,0.45)";
    g.beginPath();
    g.ellipse(
      cx + r * Math.cos(ang),
      cx + r * Math.sin(ang),
      S * 0.022,
      S * 0.01,
      ang,
      0,
      Math.PI * 2,
    );
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeMat(color: number, opts: Partial<THREE.MeshPhysicalMaterialParameters> = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.55,
    metalness: 0,
    side: THREE.DoubleSide,
    ...opts,
  });
}

/** Punto sobre la esfera de la retina a partir de ángulos (desde el polo posterior). */
function onRetina(theta: number, phi: number, r = RETINA_R - 0.02): THREE.Vector3 {
  // theta: distancia angular al polo posterior; phi: acimut (0 = nasal/derecha del observador)
  const polar = Math.PI - theta;
  return new THREE.Vector3(
    r * Math.sin(polar) * Math.cos(phi),
    r * Math.cos(polar),
    r * Math.sin(polar) * Math.sin(phi),
  );
}

export function buildEye(): EyeModel {
  const root = new THREE.Group();
  const eye = new THREE.Group();
  eye.rotation.x = Math.PI / 2; // +Y (anterior) → hacia la cámara (+Z)
  root.add(eye);
  const pickables: THREE.Object3D[] = [];
  const disposables: { dispose(): void }[] = [];
  // Plano de corte siempre asignado (sin recompilar shaders): se "aparta" cuando no hay corte.
  const CLIP_OFF = 1e4;
  const clip = new THREE.Plane(new THREE.Vector3(-1, 0, 0), CLIP_OFF); // activo: constante 0 → conserva x <= 0
  const clippable: THREE.Material[] = [];

  function add<T extends THREE.Object3D>(
    mesh: T,
    code: StructureCode,
    pick = true,
    clipIt = true,
    parent: THREE.Object3D = eye,
  ): T {
    mesh.userData.structure = code;
    parent.add(mesh);
    if (pick) pickables.push(mesh);
    const asMesh = mesh as unknown as THREE.Mesh;
    const m = asMesh.material as THREE.Material | THREE.Material[] | undefined;
    if (m && clipIt) (Array.isArray(m) ? m : [m]).forEach((x) => clippable.push(x));
    if (asMesh.geometry) disposables.push(asMesh.geometry);
    if (m) (Array.isArray(m) ? m : [m]).forEach((x) => disposables.push(x));
    return mesh;
  }

  // Esclera (desde el limbo hasta el polo posterior), con grosor
  const scleraPts: [number, number][] = [];
  const limbusPolar = Math.asin(LIMBUS_R / SCLERA_R);
  for (let i = 0; i <= 64; i++) {
    const p = limbusPolar + (i / 64) * (Math.PI - limbusPolar);
    scleraPts.push([SCLERA_R * Math.sin(p), SCLERA_R * Math.cos(p)]);
  }
  for (let i = 64; i >= 0; i--) {
    const p =
      Math.asin(Math.min(1, LIMBUS_R / SCLERA_IN)) +
      (i / 64) * (Math.PI - Math.asin(Math.min(1, LIMBUS_R / SCLERA_IN)));
    scleraPts.push([SCLERA_IN * Math.sin(p), SCLERA_IN * Math.cos(p)]);
  }
  const sclera = add(
    new THREE.Mesh(lathe(scleraPts), makeMat(0xeee6dd, { roughness: 0.75, sheen: 0.4 })),
    "sclera",
  );

  // Coroides (capa vascular fina bajo la retina)
  const choroid = add(
    new THREE.Mesh(
      new THREE.SphereGeometry(
        11.2,
        64,
        48,
        0,
        Math.PI * 2,
        ORA_POLAR - 0.02,
        Math.PI - ORA_POLAR + 0.02,
      ),
      makeMat(0x6e1f17, { roughness: 0.8 }),
    ),
    "choroid",
  );

  // Retina (cara interna; color de fondo de ojo)
  const retina = add(
    new THREE.Mesh(
      new THREE.SphereGeometry(RETINA_R, 96, 64, 0, Math.PI * 2, ORA_POLAR, Math.PI - ORA_POLAR),
      makeMat(0xd0582f, { roughness: 0.6, sheen: 0.6, sheenColor: new THREE.Color(0xffb08a) }),
    ),
    "retina",
  );

  // Mácula, fóvea y disco óptico (casquetes sobre la retina)
  const cap = (
    radiusDeg: number,
    offsetTheta: number,
    phi: number,
    color: number,
    r: number,
    code: StructureCode,
    opts: Partial<THREE.MeshPhysicalMaterialParameters> = {},
  ) => {
    const g = new THREE.SphereGeometry(
      r,
      64,
      32,
      0,
      Math.PI * 2,
      Math.PI - (radiusDeg * Math.PI) / 180,
      (radiusDeg * Math.PI) / 180,
    );
    const m = new THREE.Mesh(g, makeMat(color, opts));
    // gira el casquete (centrado en el polo posterior) hasta su posición
    const target = onRetina(offsetTheta, phi, 1).normalize();
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), target);
    return add(m, code);
  };
  // Mácula como sombreado gradual (capas translúcidas concéntricas), más oscura hacia la fóvea
  const macula = cap(13, 0, 0, 0x8f2c18, RETINA_R - 0.03, "macula", {
    roughness: 0.7,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  cap(8.5, 0, 0, 0x86281a, RETINA_R - 0.035, "macula", {
    roughness: 0.7,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  cap(4.5, 0, 0, 0x7a2416, RETINA_R - 0.04, "macula", {
    roughness: 0.6,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  const fovea = cap(1.6, 0, 0, 0x5e1a10, RETINA_R - 0.05, "fovea", {
    roughness: 0.35,
    clearcoat: 0.8,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  });
  const DISC_THETA = 4.5 / RETINA_R; // ≈ 4,5 mm nasal a la fóvea
  const disc = cap(4.2, DISC_THETA, 0, 0xf1c9a0, RETINA_R - 0.06, "optic_disc", {
    roughness: 0.5,
    emissive: new THREE.Color(0x3a1a08),
    emissiveIntensity: 0.25,
  });
  cap(1.9, DISC_THETA, 0, 0xfff0d8, RETINA_R - 0.08, "optic_disc", { roughness: 0.4 }); // excavación

  // Arcadas vasculares desde el disco (arterias más claras, venas más oscuras)
  const vessels = new THREE.Group();
  const vessel = (pts: THREE.Vector3[], radius: number, color: number) => {
    const curve = new THREE.CatmullRomCurve3(pts);
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 48, radius, 6, false),
      makeMat(color, { roughness: 0.35, clearcoat: 0.5 }),
    );
    mesh.userData.structure = "retina";
    vessels.add(mesh);
    disposables.push(mesh.geometry, mesh.material as THREE.Material);
    clippable.push(mesh.material as THREE.Material);
  };
  // Coordenadas de fondo de ojo en mm, centradas en la fóvea: u > 0 nasal (derecha del
  // observador en el ojo derecho), v > 0 superior. Se proyectan sobre la esfera.
  const fundus = (u: number, v: number, r = RETINA_R - 0.04) =>
    onRetina(Math.hypot(u, v) / RETINA_R, Math.atan2(-v, u), r);
  const ARCADES: [number, number][][] = [
    // temporal superior: rodea la mácula por arriba
    [
      [4.5, 0.25],
      [3.6, 1.5],
      [2.2, 2.6],
      [0.4, 3.2],
      [-1.8, 3.3],
      [-4.2, 2.9],
      [-6.6, 2.3],
      [-9, 1.6],
    ],
    // nasal superior
    [
      [4.6, 0.35],
      [5.6, 1.4],
      [7.2, 2.4],
      [9.4, 3.3],
    ],
  ];
  for (const sign of [1, -1]) {
    for (const path of ARCADES) {
      for (const artery of [true, false]) {
        const off = artery ? 0 : 0.28; // la vena discurre algo más periférica
        const pts = path.map(([u, v], i) => fundus(u, sign * (Math.abs(v) + (i === 0 ? 0 : off))));
        vessel(pts, artery ? 0.05 : 0.07, artery ? 0xd23b2a : 0x8d1f1a);
      }
    }
  }
  vessels.userData.structure = "retina";
  eye.add(vessels);
  pickables.push(vessels);

  // Nervio óptico (detrás del globo, en la posición del disco)
  const nerveDir = onRetina(DISC_THETA, 0, 1).normalize();
  const nerve = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.8, 6, 32),
    makeMat(0xe9d6c4, { roughness: 0.8 }),
  );
  nerve.position.copy(nerveDir.clone().multiplyScalar(SCLERA_R + 2.6));
  nerve.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nerveDir);
  add(nerve, "optic_disc");

  // Vítreo (gel transparente)
  const vitreous = add(
    new THREE.Mesh(
      new THREE.SphereGeometry(
        RETINA_R - 0.1,
        64,
        48,
        0,
        Math.PI * 2,
        ORA_POLAR - 0.25,
        Math.PI - ORA_POLAR + 0.25,
      ),
      makeMat(0xdfe9f2, { transparent: true, opacity: 0.08, roughness: 0.1, depthWrite: false }),
    ),
    "vitreous",
  );

  // Cuerpo ciliar: anillo triangular desde el espolón hasta la pars plana (ora serrata)
  const ora: [number, number] = [
    RETINA_R * Math.sin(ORA_POLAR) + 0.2,
    RETINA_R * Math.cos(ORA_POLAR),
  ];
  const ciliaryPts: [number, number][] = [
    [LIMBUS_R + 0.15, LIMBUS_A - 0.75], // espolón escleral
    [5.55, LENS_EQ + 0.9], // raíz del iris / cara anterior
    [5.25, LENS_EQ + 0.35], // cresta de los procesos (≈0,55 mm del ecuador)
    [5.6, LENS_EQ - 0.6],
    [ora[0] - 0.25, ora[1]], // pars plana
    [ora[0] + 0.15, ora[1] + 0.2],
    [8.6, 7.6],
    [LIMBUS_R + 0.9, LIMBUS_A - 0.95],
  ];
  const ciliary = add(
    new THREE.Mesh(
      lathe([...ciliaryPts, ciliaryPts[0]], 128),
      makeMat(0x3a1712, { roughness: 0.9 }),
    ),
    "ciliary_body",
  );

  // Ángulo iridocorneal: anillo trabecular fino
  const angle = add(
    new THREE.Mesh(
      new THREE.TorusGeometry(LIMBUS_R - 0.05, 0.16, 12, 128),
      makeMat(0xb9c7cf, { roughness: 0.6 }),
    ),
    "angle",
  );
  angle.rotation.x = Math.PI / 2;
  angle.position.y = LIMBUS_A - 0.55;

  // Cristalino: cápsula transparente + núcleo
  const lensMat = makeMat(0xf3ead2, {
    transparent: true,
    opacity: 0.55,
    roughness: 0.15,
    clearcoat: 1,
    depthWrite: false,
  });
  const lens = add(new THREE.Mesh(lensGeometry(0), lensMat), "lens");
  const nucleusMat = makeMat(0xe2cf9e, {
    transparent: true,
    opacity: 0.6,
    roughness: 0.3,
    depthWrite: false,
  });
  const nucleus = add(new THREE.Mesh(lensGeometry(0, 1.05), nucleusMat), "lens");

  // Zónula: fibras desde los procesos ciliares a la cápsula (pre y postecuatoriales)
  const zonuleMat = new THREE.LineBasicMaterial({
    color: 0xf4efe2,
    transparent: true,
    opacity: 0.55,
  });
  const zonuleGeo = new THREE.BufferGeometry();
  const zonule = new THREE.LineSegments(zonuleGeo, zonuleMat);
  zonule.userData.structure = "zonule";
  eye.add(zonule);
  pickables.push(zonule);
  clippable.push(zonuleMat);
  disposables.push(zonuleGeo, zonuleMat);

  // Iris (anillo con textura) y pupila
  const irisTex = irisTexture();
  disposables.push(irisTex);
  const irisMat = makeMat(0xffffff, { map: irisTex, roughness: 0.65 });
  const iris = new THREE.Mesh(new THREE.RingGeometry(2, 5.55, 160, 6), irisMat);
  add(iris, "iris");
  // Reflejo rojo coaxial en la pupila (como en la película): emisivo y algo translúcido
  const pupilMat = new THREE.MeshBasicMaterial({
    color: 0xc8461f,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });
  const pupilDisc = new THREE.Mesh(new THREE.CircleGeometry(1, 96), pupilMat);
  add(pupilDisc, "pupil");

  // Córnea (lente transparente)
  const corneaPts: [number, number][] = [];
  for (let i = 0; i <= 64; i++) {
    const r = (i / 64) * LIMBUS_R;
    corneaPts.push([r, CORNEA_C + Math.sqrt(7.8 ** 2 - r * r)]);
  }
  const backC = CORNEA_BACK_APEX - 6.5;
  for (let i = 64; i >= 0; i--) {
    const r = (i / 64) * Math.min(6.4, LIMBUS_R - 0.1);
    corneaPts.push([r, backC + Math.sqrt(6.5 ** 2 - r * r)]);
  }
  const cornea = add(
    new THREE.Mesh(
      lathe(corneaPts, 128),
      makeMat(0xcfe6f2, {
        transparent: true,
        opacity: 0.22,
        roughness: 0.02,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        depthWrite: false,
      }),
    ),
    "cornea",
  );

  // --- Humor acuoso (modo didáctico) ----------------------------------------------
  // Producción en los procesos ciliares (epitelio no pigmentado) → cámara posterior (entre la
  // cara posterior del iris y el cristalino/zónula) → pupila (entre el borde pupilar y la
  // cápsula anterior) → cámara anterior (convección térmica) → salida:
  //   · convencional/trabecular (≈80 %): ángulo → malla trabecular → conducto de Schlemm →
  //     canales colectores → venas acuosas epiesclerales;
  //   · no convencional/uveoescleral (≈20 %): receso del ángulo → cara del músculo ciliar →
  //     espacio supraciliar → supracoroideo.
  const flowGroup = new THREE.Group();
  flowGroup.visible = false;
  eye.add(flowGroup);

  // Conducto de Schlemm: anillo fino de sección elíptica (≈0,3 mm meridional), translúcido
  const canalPts: [number, number][] = [];
  for (let i = 0; i <= 24; i++) {
    const q = (i / 24) * Math.PI * 2;
    canalPts.push([SCHLEMM_R + 0.07 * Math.cos(q), SCHLEMM_A + 0.17 * Math.sin(q)]);
  }
  const canalMat = makeMat(0x59c8ff, {
    transparent: true,
    opacity: 0.5,
    roughness: 0.3,
    depthWrite: false,
    emissive: new THREE.Color(0x0b5a80),
    emissiveIntensity: 0.7,
  });
  const canal = new THREE.Mesh(lathe(canalPts, 160), canalMat);
  canal.userData.structure = "angle"; // se resalta con el ángulo, pero no es seleccionable
  flowGroup.add(canal);
  clippable.push(canalMat);
  disposables.push(canal.geometry, canalMat);

  // Partículas (no seleccionables: no se añaden a pickables)
  const FLOW_N = FLOW_CONV_N + FLOW_UVEO_N;
  const flowPos = new Float32Array(FLOW_N * 3);
  const flowCol = new Float32Array(FLOW_N * 3);
  const flowGeo = new THREE.BufferGeometry();
  const flowPosAttr = new THREE.BufferAttribute(flowPos, 3).setUsage(THREE.DynamicDrawUsage);
  const flowColAttr = new THREE.BufferAttribute(flowCol, 3).setUsage(THREE.DynamicDrawUsage);
  flowGeo.setAttribute("position", flowPosAttr);
  flowGeo.setAttribute("color", flowColAttr);
  flowGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), SCLERA_R + 2);
  const flowTex = particleTexture();
  const flowMat = new THREE.PointsMaterial({
    size: 0.55,
    map: flowTex,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    toneMapped: false,
  });
  const flowPoints = new THREE.Points(flowGeo, flowMat);
  flowPoints.renderOrder = 4;
  flowPoints.raycast = () => {}; // nunca intercepta rayos
  flowGroup.add(flowPoints);
  clippable.push(flowMat);
  disposables.push(flowGeo, flowMat, flowTex);

  // Variantes de trayectoria (punto de secreción, carril en cámara posterior y anterior)
  const rnd = seeded(0x0a9e0f);
  const CONV_VARIANTS = 24;
  const UVEO_VARIANTS = 10;
  interface FlowVariant {
    uveo: boolean;
    birth: number;
    pc: number;
    lane: number;
    table: Float32Array;
    duration: number;
  }
  const variants: FlowVariant[] = [];
  for (let k = 0; k < CONV_VARIANTS + UVEO_VARIANTS; k++) {
    const uveo = k >= CONV_VARIANTS;
    const j = uveo ? k - CONV_VARIANTS : k;
    variants.push({
      uveo,
      birth: rnd(),
      pc: 0.3 + 0.4 * rnd(),
      // carriles estratificados: 0 = junto al iris (cálido), 1 = junto a la córnea (fría)
      lane: 0.1 + (0.8 * ((j % 6) + rnd())) / 6,
      table: new Float32Array(FLOW_SAMPLES * FLOW_STRIDE),
      duration: 1,
    });
  }

  // Estado de cada partícula
  const pVar = new Uint16Array(FLOW_N);
  const pT = new Float32Array(FLOW_N);
  const pSpeed = new Float32Array(FLOW_N);
  const pPhi = new Float32Array(FLOW_N); // meridiano (360°)
  const pPhiCut = new Float32Array(FLOW_N); // meridiano junto al plano del corte sagital
  const pDrift = new Float32Array(FLOW_N); // desplazamiento circunferencial en el conducto
  const MER_STEP = (Math.PI * 2) / FLOW_MERIDIANS;
  for (let i = 0; i < FLOW_N; i++) {
    const uveo = i >= FLOW_CONV_N;
    pVar[i] = uveo
      ? CONV_VARIANTS + Math.floor(rnd() * UVEO_VARIANTS)
      : Math.floor(rnd() * CONV_VARIANTS);
    pT[i] = rnd();
    pSpeed[i] = 0.85 + 0.3 * rnd();
    pPhi[i] = Math.floor(rnd() * FLOW_MERIDIANS) * MER_STEP + (rnd() - 0.5) * 0.35 * MER_STEP;
    // plano x = 0 (φ = 90° inferior / 270° superior), siempre del lado conservado (x < 0)
    const off = 0.004 + 0.05 * rnd();
    pPhiCut[i] = i % 4 < 2 ? Math.PI / 2 + off : (3 * Math.PI) / 2 - off;
    pDrift[i] = (rnd() - 0.5) * 0.3;
  }

  let flowL = lensParams(0);
  let flowRp = 2;
  let flowDirty = true;
  let flowOn = false;
  let flowRaf = 0;
  let flowLast = 0;
  let cutOn = false;

  /** Cara interna de los procesos ciliares (perfil del cuerpo ciliar) a la altura a. */
  const ciliaryFaceR = (a: number) =>
    a >= LENS_EQ + 0.35
      ? lerp(5.25, 5.55, Math.min(1, (a - LENS_EQ - 0.35) / 0.55))
      : lerp(5.25, 5.6, Math.min(1, (LENS_EQ + 0.35 - a) / 0.95));
  const sph = (R: number, deg: number) => ({
    r: R * Math.sin((deg * Math.PI) / 180),
    a: R * Math.cos((deg * Math.PI) / 180),
  });

  function rebuildFlowPaths() {
    flowDirty = false;
    const L = (flowL = lensParams(accommodation));
    const rp = (flowRp = lerp(2.0, 1.55, accommodation) * pupilFactor);
    const iris = (r: number) => irisSurfaceA(L, rp, r);
    // cámara posterior: entre la cápsula (o el plano zonular anterior) y la cara posterior del iris
    const pc = (r: number, f: number) =>
      lerp(r < L.h - 0.1 ? capsuleA(L, r) + 0.06 : LENS_EQ + 0.75, iris(r), f);
    // cámara anterior: entre la cara anterior del iris y el endotelio
    const ac = (r: number, f: number) => lerp(iris(r) + 0.15, corneaBackA(r) - 0.2, f);
    for (const v of variants) {
      const birthA = LENS_EQ + 0.1 + 0.75 * v.birth;
      const nodes: FlowNode[] = [
        // secreción en el epitelio ciliar no pigmentado
        { r: ciliaryFaceR(birthA) - 0.06, a: birthA, v: 0.45, alpha: 0 },
        // cámara posterior, por delante de la zónula y detrás del iris
        { r: 4.9, a: pc(4.9, v.pc), v: 0.7 },
        { r: 4.2, a: pc(4.2, v.pc), v: 0.7 },
        { r: 3.4, a: pc(3.4, v.pc), v: 0.75 },
        { r: 2.7, a: pc(2.7, lerp(v.pc, 0.5, 0.5)), v: 0.8 },
        { r: rp + 0.3, a: pc(rp + 0.3, 0.5), v: 0.9 },
        // paso pupilar: entre el borde pupilar y la cápsula anterior
        { r: rp - 0.02, a: capsuleA(L, rp) + 0.04, v: 0.9 },
        { r: rp - 0.22, a: capsuleA(L, rp - 0.22) + 0.24, v: 0.8 },
        // cámara anterior: sube junto al iris (cálido) y baja junto a la córnea (fría)
        // los carriles próximos a la córnea ascienden enseguida hacia la cámara central
        {
          r: rp + 0.3 + 0.5 * (1 - v.lane),
          a: ac(rp + 0.3 + 0.5 * (1 - v.lane), v.lane * 0.8),
          v: 0.6,
          conv: 0.3,
        },
        { r: 3.3, a: ac(3.3, v.lane), v: 0.55, conv: 1 },
        { r: 4.3, a: ac(4.3, v.lane), v: 0.55, conv: 1 },
        { r: 4.95, a: ac(4.95, 0.15 + 0.7 * v.lane), v: 0.5, conv: 0.35, mix: 0.25 },
      ];
      if (!v.uveo) {
        nodes.push(
          { r: 5.3, a: ac(5.3, 0.55), v: 0.45, mix: 0.8 },
          // malla trabecular: uveal → corneoescleral → yuxtacanalicular (alta resistencia)
          { r: LIMBUS_R - 0.25, a: LIMBUS_A - 0.64, v: 0.28, mix: 1 },
          { r: LIMBUS_R - 0.03, a: LIMBUS_A - 0.55, v: 0.22, mix: 1 },
          // conducto de Schlemm: recorrido circunferencial antes de salir
          { r: SCHLEMM_R - 0.05, a: SCHLEMM_A - 0.03, dur: 1.6, mix: 1, drift: 0 },
          { r: SCHLEMM_R + 0.02, a: SCHLEMM_A + 0.03, v: 0.5, mix: 1, drift: 1 },
          // canales colectores → plexo intraescleral → venas acuosas (epiesclera)
          { ...sph(11.88, 32.3), v: 0.5, mix: 1, drift: 1, alpha: 0.9 },
          { ...sph(12.03, 33.4), v: 0.45, mix: 1, drift: 1, alpha: 0.6 },
          { ...sph(12.08, 35.6), v: 0.45, mix: 1, drift: 1, alpha: 0.35 },
          { ...sph(12.08, 39), mix: 1, drift: 1, alpha: 0 },
        );
      } else {
        const apexR = IRIS_ROOT_R + 0.09;
        nodes.push(
          { r: 5.32, a: ac(5.32, 0.3), v: 0.45, mix: 0.7 },
          // receso del ángulo, por encima de la raíz del iris
          {
            r: IRIS_ROOT_R,
            a: (iris(IRIS_ROOT_R) + corneaBackA(IRIS_ROOT_R)) / 2,
            v: 0.35,
            mix: 1,
          },
          // banda del cuerpo ciliar → entre los haces del músculo ciliar
          { r: apexR, a: corneaBackA(apexR) - 0.03, v: 0.25, mix: 1 },
          { r: 6.15, a: LENS_EQ + 0.93, v: 0.22, mix: 1 },
          { r: 6.9, a: LENS_EQ + 0.58, v: 0.3, mix: 1 },
          // espacio supraciliar → supracoroideo (entre coroides y esclera)
          { ...sph(11.27, 42.5), v: 0.5, mix: 1 },
          { ...sph(11.26, 50), v: 0.5, mix: 1 },
          { ...sph(11.25, 58), v: 0.5, mix: 1, alpha: 0.85 },
          { ...sph(11.25, 66), v: 0.5, mix: 1, alpha: 0.45 },
          { ...sph(11.25, 74), mix: 1, alpha: 0 },
        );
      }
      const s = sampleFlowPath(nodes);
      v.table = s.table;
      v.duration = s.duration;
    }
  }

  // Colores: tronco común (acuoso recién formado) → cian (trabecular) / violeta (uveoescleral)
  // (valores lineales: tras la conversión a sRGB quedan aguamarina pálido, cian y violeta suave)
  const STEM_C = [0.25, 0.62, 1.0];
  const CONV_C = [0.0, 0.62, 1.0];
  const UVEO_C = [0.45, 0.12, 1.0];
  const FLOW_GAIN = 0.95;
  const CONV_AMP = 0.4; // mm de desplazamiento vertical máximo por convección (sutil)

  function stepFlow(dt: number) {
    for (let i = 0; i < FLOW_N; i++) {
      const v = variants[pVar[i]];
      let t = pT[i] + (dt * pSpeed[i]) / v.duration;
      if (t >= 1) t -= Math.floor(t);
      pT[i] = t;
      const f = t * (FLOW_SAMPLES - 1);
      const j = Math.min(FLOW_SAMPLES - 2, Math.floor(f));
      const w = f - j;
      const o0 = j * FLOW_STRIDE;
      const o1 = o0 + FLOW_STRIDE;
      const tb = v.table;
      const r = lerp(tb[o0], tb[o1], w);
      let y = lerp(tb[o0 + 1], tb[o1 + 1], w);
      const alpha = lerp(tb[o0 + 2], tb[o1 + 2], w);
      const mix = lerp(tb[o0 + 3], tb[o1 + 3], w);
      const conv = lerp(tb[o0 + 4], tb[o1 + 4], w);
      const drift = lerp(tb[o0 + 5], tb[o1 + 5], w);
      const phi = (cutOn && i % 2 === 0 ? pPhiCut[i] : pPhi[i]) + pDrift[i] * drift;
      const x = r * Math.cos(phi);
      let z = r * Math.sin(phi);
      if (conv > 0.001) {
        // −z local = superior: asciende junto al iris, desciende junto a la córnea
        z -= CONV_AMP * conv * (1 - 2 * v.lane);
        const r2 = Math.hypot(x, z);
        if (r2 < IRIS_ROOT_R) {
          const lo = (r2 < flowRp ? capsuleA(flowL, r2) : irisSurfaceA(flowL, flowRp, r2)) + 0.1;
          y = Math.min(corneaBackA(r2) - 0.12, Math.max(lo, y));
        }
      }
      const k = i * 3;
      flowPos[k] = x;
      flowPos[k + 1] = y;
      flowPos[k + 2] = z;
      const tint = v.uveo ? UVEO_C : CONV_C;
      // con el corte sagital, se destacan las partículas junto al plano de corte
      const emph = cutOn && x < -0.9 ? 0.28 : 1;
      const g = alpha * emph * FLOW_GAIN;
      flowCol[k] = lerp(STEM_C[0], tint[0], mix) * g;
      flowCol[k + 1] = lerp(STEM_C[1], tint[1], mix) * g;
      flowCol[k + 2] = lerp(STEM_C[2], tint[2], mix) * g;
    }
    flowPosAttr.needsUpdate = true;
    flowColAttr.needsUpdate = true;
  }

  function flowTick(now: number) {
    flowRaf = 0;
    if (!flowOn) return;
    const dt = flowLast ? Math.min(0.05, (now - flowLast) / 1000) : 0;
    flowLast = now;
    stepFlow(dt);
    model.onChange?.();
    flowRaf = requestAnimationFrame(flowTick);
  }

  function setAqueousFlow(on: boolean) {
    if (on === flowOn) return;
    flowOn = on;
    flowGroup.visible = on;
    cancelAnimationFrame(flowRaf);
    flowRaf = 0;
    flowLast = 0;
    if (!on) return;
    if (flowDirty) rebuildFlowPaths();
    stepFlow(0);
    // con movimiento reducido: partículas estáticas repartidas a lo largo de las vías
    if (!prefersReducedMotion()) flowRaf = requestAnimationFrame(flowTick);
  }

  // --- Anejos y órbita (vista «Órbita») ------------------------------------------
  // Ejes de construcción: x > 0 nasal, y > 0 anterior, z > 0 inferior (ojo derecho).
  // Medidas orientativas de adulto: reborde ≈ 40 × 35 mm, profundidad ≈ 40–45 mm, vértice
  // medial y algo superior; rectos con la espiral de Tillaux; nervio óptico intraorbitario
  // sinuoso (≈ 25 mm). Procedural y educativo: pendiente de validación anatómica.
  const orbitGroup = new THREE.Group();
  orbitGroup.visible = false;
  eye.add(orbitGroup);
  const lidsGroup = new THREE.Group();
  lidsGroup.visible = false;
  eye.add(lidsGroup);

  const APEX = new THREE.Vector3(7, -31, -2);
  const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const tube = (
    pts: THREE.Vector3[],
    radius: number,
    color: number,
    code: StructureCode,
    parent: THREE.Object3D,
    opts: Partial<THREE.MeshPhysicalMaterialParameters> = {},
    closed = false,
  ) =>
    add(
      new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed), 64, radius, 12, closed),
        makeMat(color, { roughness: 0.6, ...opts }),
      ),
      code,
      true,
      true,
      parent,
    );
  /** Punto sobre la esclera a una distancia angular `polar` del eje óptico anterior. */
  const onSclera = (polar: number, dx: number, dz: number, r = SCLERA_R + 0.15) => {
    const n = Math.hypot(dx, dz) || 1;
    return v3((r * Math.sin(polar) * dx) / n, r * Math.cos(polar), (r * Math.sin(polar) * dz) / n);
  };

  // Reborde orbitario: el lateral queda más atrás que el medial (Hertel ≈ 16 mm)
  const rim = (t: number) => {
    const c = Math.cos(t);
    const sn = Math.sin(t);
    return v3(0.5 + 20 * c, 1.75 + 4.75 * c + (sn < 0 ? -4.25 * sn : 2.25 * sn), 0.5 + 17.5 * sn);
  };
  {
    const NT = 72;
    const NS = 26;
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= NS; i++) {
      const sv = i / NS;
      const k = (1 - sv) * (1 + 1.3 * sv); // la órbita es algo más ancha tras el reborde
      for (let j = 0; j <= NT; j++) {
        const r = rim((j / NT) * Math.PI * 2);
        const yAx = lerp(r.y, APEX.y, sv);
        pos.push(APEX.x + (r.x - APEX.x) * k, yAx, APEX.z + (r.z - APEX.z) * k);
      }
    }
    for (let i = 0; i < NS; i++)
      for (let j = 0; j < NT; j++) {
        const a = i * (NT + 1) + j;
        const b = a + NT + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    add(
      new THREE.Mesh(
        g,
        makeMat(0xd9cbb2, { transparent: true, opacity: 0.13, depthWrite: false, roughness: 0.9 }),
      ),
      "orbit",
      true,
      true,
      orbitGroup,
    );
    // líneas de pared (meridianos) para leer la forma de pirámide
    const lines: number[] = [];
    for (let j = 0; j < NT; j += 6)
      for (let i = 0; i < NS; i++) {
        const a = (i * (NT + 1) + j) * 3;
        const b = ((i + 1) * (NT + 1) + j) * 3;
        lines.push(pos[a], pos[a + 1], pos[a + 2], pos[b], pos[b + 1], pos[b + 2]);
      }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));
    const lm = new THREE.LineBasicMaterial({ color: 0xe8dcc4, transparent: true, opacity: 0.32 });
    const wall = new THREE.LineSegments(lg, lm);
    wall.userData.structure = "orbit";
    orbitGroup.add(wall);
    clippable.push(lm);
    disposables.push(lg, lm);
    const rimPts = Array.from({ length: 48 }, (_, j) => rim((j / 48) * Math.PI * 2));
    tube(rimPts, 0.6, 0xe2d5bd, "orbit", orbitGroup, { roughness: 0.85 }, true);
  }

  // Nervio óptico intraorbitario: del final del tramo retrobulbar al canal óptico
  {
    const start = nerveDir.clone().multiplyScalar(SCLERA_R + 5.4);
    tube(
      [start, v3(6.2, -21, 1.2), v3(7.9, -26, -1), APEX.clone(), v3(7, -34.5, -2.5)],
      1.75,
      0xe9d6c4,
      "optic_nerve",
      orbitGroup,
      { roughness: 0.8 },
    );
  }

  // Músculos extraoculares
  const MUSCLE = 0xa8443c;
  const TENDON = 0xf1e8d8;
  const RECTI: [number, number, number][] = [
    // [dx, dz, distancia de la inserción al limbo (mm)] — espiral de Tillaux
    [1, 0, 5.5], // recto medio (nasal)
    [0, 1, 6.5], // recto inferior
    [-1, 0, 6.9], // recto lateral (temporal)
    [0, -1, 7.7], // recto superior
  ];
  for (const [dx, dz, d] of RECTI) {
    const p0 = limbusPolar + d / SCLERA_R;
    const origin = APEX.clone().add(v3(dx * 2.2, 0, dz * 2.2));
    const wrap = onSclera(p0 + 0.95, dx, dz, SCLERA_R + 1.1);
    const belly = wrap
      .clone()
      .lerp(origin, 0.5)
      .add(v3(dx * 3.2, 0, dz * 3.2));
    // inserción tendinosa
    tube(
      [onSclera(p0, dx, dz), onSclera(p0 + 0.22, dx, dz, SCLERA_R + 0.35)],
      1.25,
      TENDON,
      "extraocular_muscles",
      orbitGroup,
    );
    tube(
      [
        onSclera(p0 + 0.18, dx, dz, SCLERA_R + 0.4),
        onSclera(p0 + 0.5, dx, dz, SCLERA_R + 0.7),
        wrap,
        belly,
        origin,
      ],
      1.6,
      MUSCLE,
      "extraocular_muscles",
      orbitGroup,
    );
  }
  // Oblicuo superior: vientre hasta la tróclea y tendón reflejo bajo el recto superior
  const TROCHLEA = v3(14, 3.5, -15);
  tube(
    [APEX.clone().add(v3(3, 1.5, -3.2)), v3(12.5, -14, -12.5), TROCHLEA],
    1.0,
    MUSCLE,
    "extraocular_muscles",
    orbitGroup,
  );
  tube(
    [TROCHLEA, v3(6, 4.2, -12.6), onSclera((104 * Math.PI) / 180, -0.55, -0.83)],
    0.45,
    TENDON,
    "extraocular_muscles",
    orbitGroup,
  );
  {
    const tr = add(
      new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.35, 10, 32), makeMat(0xe2d5bd)),
      "extraocular_muscles",
      true,
      true,
      orbitGroup,
    );
    tr.position.copy(TROCHLEA);
    tr.rotation.y = Math.PI / 4;
  }
  // Oblicuo inferior: del suelo orbitario anteromedial a la esclera posteroinferotemporal
  tube(
    [v3(13.5, 2.5, 14), v3(3, 0.5, 15.2), onSclera((122 * Math.PI) / 180, -0.7, 0.71)],
    1.1,
    MUSCLE,
    "extraocular_muscles",
    orbitGroup,
  );
  // Elevador del párpado superior (por encima del recto superior) — ficha «Párpados»
  tube(
    [APEX.clone().add(v3(0, 2.5, -5.5)), v3(0.5, -10, -15.5), v3(0, 6, -16), v3(0, 11.2, -12.2)],
    0.9,
    0xb4554b,
    "eyelids",
    orbitGroup,
  );

  // Sistema lagrimal: glándula superotemporal, canalículos, saco y conducto nasolagrimal
  {
    const gland = add(
      new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), makeMat(0xe8b4a0, { roughness: 0.7 })),
      "lacrimal",
      true,
      true,
      orbitGroup,
    );
    gland.position.set(-10.8, -1.6, -10.6);
    gland.scale.set(5.4, 2.4, 3.0);
    gland.rotation.y = -0.6;
  }
  const TEAR = 0x86c5e0;
  // párpados: superficie desplazada sobre el globo (córnea o casco elipsoidal)
  const lidY = (x: number, z: number) => {
    const r = Math.hypot(x, z);
    const corneaY = r < LIMBUS_R ? CORNEA_C + Math.sqrt(7.8 ** 2 - r * r) : -Infinity;
    // casco por delante del reborde orbitario: la piel periocular es casi un plano
    const hull = 12.6 * Math.sqrt(Math.max(0.3, 1 - (x / 21) ** 2 - (z / 20) ** 2));
    return Math.max(corneaY, hull) + 0.7;
  };
  const lidX = (u: number) => lerp(-14.5, 13.5, u);
  const canthusZ = (u: number) => lerp(-0.8, 0.6, u);
  const upperMargin = (u: number) => canthusZ(u) - 4.2 * Math.sin(Math.PI * u) ** 0.75;
  const lowerMargin = (u: number) => canthusZ(u) + 5.9 * Math.sin(Math.PI * u) ** 0.85;
  const PUNCTUM_U = (10.2 + 14.5) / 28;
  const punctum = (upper: boolean) => {
    const z = (upper ? upperMargin : lowerMargin)(PUNCTUM_U);
    return v3(lidX(PUNCTUM_U), lidY(lidX(PUNCTUM_U), z) - 0.4, z);
  };
  for (const upper of [true, false]) {
    const p = punctum(upper);
    const vz = upper ? -2 : 2;
    tube(
      [p, p.clone().add(v3(0.3, -0.6, vz)), v3(14.6, 3.6, upper ? -1.2 : 1.6), v3(16.2, 3.4, 0.6)],
      0.32,
      TEAR,
      "lacrimal",
      orbitGroup,
      { roughness: 0.3 },
    );
  }
  {
    const sac = add(
      new THREE.Mesh(
        new THREE.CapsuleGeometry(1.9, 7.5, 8, 20),
        makeMat(TEAR, { roughness: 0.35, transparent: true, opacity: 0.9 }),
      ),
      "lacrimal",
      true,
      true,
      orbitGroup,
    );
    sac.position.set(17, 3, 2.6);
    sac.rotation.x = Math.PI / 2; // eje vertical (z en construcción)
    tube(
      [v3(17, 2.9, 7.8), v3(16.6, 1.6, 15), v3(16, 0.4, 23)],
      1.45,
      TEAR,
      "lacrimal",
      orbitGroup,
      { roughness: 0.35 },
    );
  }

  // Párpados (solo en modo "full"): piel, borde libre y una hendidura de ≈ 10 mm
  {
    const lidSheet = (margin: (u: number) => number, far: (u: number) => number) => {
      const NU = 64;
      const NV = 18;
      const pos: number[] = [];
      const idx: number[] = [];
      for (let i = 0; i <= NV; i++) {
        const vv = i / NV;
        for (let j = 0; j <= NU; j++) {
          const u = j / NU;
          const x = lidX(u);
          const z = lerp(margin(u), far(u), vv);
          pos.push(x, lidY(x, z), z);
        }
      }
      for (let i = 0; i < NV; i++)
        for (let j = 0; j < NU; j++) {
          const a = i * (NU + 1) + j;
          const b = a + NU + 1;
          idx.push(a, b, a + 1, b, b + 1, a + 1);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      add(
        new THREE.Mesh(
          g,
          makeMat(0xdcae98, { roughness: 0.82, sheen: 0.5, transparent: true, opacity: 0.94 }),
        ),
        "eyelids",
        true,
        true,
        lidsGroup,
      );
      const edge = Array.from({ length: 33 }, (_, j) => {
        const u = j / 32;
        const z = margin(u);
        return v3(lidX(u), lidY(lidX(u), z), z);
      });
      tube(edge, 0.45, 0xc98f7c, "eyelids", lidsGroup, { roughness: 0.7 });
    };
    // hasta el surco palpebral/ceja por arriba y el surco palpebromalar por abajo
    lidSheet(upperMargin, (u) => canthusZ(u) - 13 * Math.sin(Math.PI * u) ** 0.55 - 1.2);
    lidSheet(lowerMargin, (u) => canthusZ(u) + 10.5 * Math.sin(Math.PI * u) ** 0.55 + 1.2);
    for (const upper of [true, false]) {
      const p = add(
        new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), makeMat(0x3a2a28)),
        "lacrimal",
        true,
        true,
        lidsGroup,
      );
      p.position.copy(punctum(upper)).add(v3(0, 0.45, 0));
    }
  }

  function setAdnexa(mode: "off" | "orbit" | "full") {
    orbitGroup.visible = mode !== "off";
    lidsGroup.visible = mode === "full";
  }

  for (const m of clippable) m.clippingPlanes = [clip];

  let accommodation = 0;
  let pupilFactor = 1;

  function rebuildAnterior() {
    const L = lensParams(accommodation);
    lens.geometry.dispose();
    lens.geometry = lensGeometry(accommodation);
    nucleus.geometry.dispose();
    nucleus.geometry = lensGeometry(accommodation, 1.05);
    // pupila: radio 2,0 → 1,55 mm con la acomodación (tríada de cerca) × reflejo fotomotor
    const rp = lerp(2.0, 1.55, accommodation) * pupilFactor;
    const front = LENS_EQ + L.Tf; // polo anterior del cristalino
    iris.geometry.dispose();
    const ring = new THREE.RingGeometry(rp, 5.55, 160, 6);
    // el iris es ligeramente cónico: el borde pupilar se apoya en la cápsula anterior
    const pos = ring.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setXYZ(i, x, y, irisSurfaceA(L, rp, Math.hypot(x, y)));
    }
    ring.computeVertexNormals();
    // RingGeometry está en XY: lo giramos para que su normal sea el eje óptico (+Y)
    ring.rotateX(-Math.PI / 2);
    // tras rotateX(-90°), la coordenada z se ha convertido en y: ya está colocada
    iris.geometry = ring;
    pupilDisc.scale.setScalar(rp);
    pupilDisc.position.set(0, front + 0.02, 0);
    pupilDisc.rotation.set(-Math.PI / 2, 0, 0);

    // zónula: procesos (r≈5,3) → cápsula cerca del ecuador; se destensa (curva) al acomodar
    const segs: number[] = [];
    const N = 90;
    const slack = accommodation;
    for (let k = 0; k < N; k++) {
      const ang = (k / N) * Math.PI * 2;
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      const from = { r: 5.28 - 0.35 * accommodation, a: LENS_EQ + 0.35 + ((k % 3) - 1) * 0.35 };
      const group = k % 3; // 0 anterior, 1 ecuatorial, 2 posterior
      const toA = group === 0 ? LENS_EQ + 0.55 : group === 1 ? LENS_EQ : LENS_EQ - 0.6;
      const toR = L.h * (group === 1 ? 0.995 : 0.93);
      const steps = 6;
      let prev: THREE.Vector3 | null = null;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const r = lerp(from.r, toR, t);
        const a =
          lerp(from.a, toA, t) - 0.18 * slack * Math.sin(Math.PI * t) * (group === 2 ? -1 : 1);
        const p = new THREE.Vector3(r * cos, a, r * sin);
        if (prev) segs.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
        prev = p;
      }
    }
    zonule.geometry.setAttribute("position", new THREE.Float32BufferAttribute(segs, 3));
    zonule.geometry.computeBoundingSphere();

    // las vías del acuoso siguen al cristalino y a la pupila
    flowDirty = true;
    if (flowOn) {
      rebuildFlowPaths();
      stepFlow(0);
    }
  }
  rebuildAnterior();

  const baseEmissive = new Map<THREE.Material, { c: THREE.Color; i: number }>();
  function highlight(code: StructureCode | null, hovered: StructureCode | null = null) {
    eye.traverse((o) => {
      const mesh = o as THREE.Mesh;
      const m = mesh.material as THREE.MeshPhysicalMaterial | undefined;
      if (!m || !("emissive" in m)) return;
      if (!baseEmissive.has(m))
        baseEmissive.set(m, { c: m.emissive.clone(), i: m.emissiveIntensity });
      const base = baseEmissive.get(m)!;
      const s = (o.userData.structure ?? o.parent?.userData.structure) as StructureCode | undefined;
      // las superficies grandes de los anejos se resaltan con suavidad para no perder su color
      const k = SOFT_HIGHLIGHT[s ?? ""] ?? 1;
      if (s && s === code) {
        m.emissive.set(0x2a7fff);
        m.emissiveIntensity = 0.55 * k;
      } else if (s && s === hovered) {
        m.emissive.set(0x6fb2ff);
        m.emissiveIntensity = 0.3 * k;
      } else {
        m.emissive.copy(base.c);
        m.emissiveIntensity = base.i;
      }
    });
  }

  // Marcadores de estaciones: sprites sin prueba de profundidad (se ven a través del ojo)
  const stationGroup = new THREE.Group();
  eye.add(stationGroup);
  const stationDisposables: { dispose(): void }[] = [];
  function setStations(list: StationMarker[], active: string | null, done: string[]) {
    for (const d of stationDisposables.splice(0)) d.dispose();
    for (const o of [...stationGroup.children]) {
      stationGroup.remove(o);
      const i = pickables.indexOf(o);
      if (i >= 0) pickables.splice(i, 1);
    }
    for (const st of list) {
      const state = st.code === active ? "active" : done.includes(st.code) ? "done" : "idle";
      const tex = markerTexture(st.number, state, st.color);
      const mat = new THREE.SpriteMaterial({
        map: tex,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        sizeAttenuation: false, // tamaño constante en pantalla, también con la cámara dentro del ojo
      });
      const sp = new THREE.Sprite(mat);
      sp.position.set(...st.position);
      sp.scale.setScalar(state === "active" ? 0.064 : 0.05);
      sp.renderOrder = 20;
      sp.userData.station = st.code;
      sp.userData.label = st.label;
      stationGroup.add(sp);
      pickables.push(sp);
      stationDisposables.push(tex, mat);
    }
  }

  const model: EyeModel = {
    root,
    pickables,
    setStations,
    setAqueousFlow,
    setAdnexa,
    setAccommodation(a: number) {
      accommodation = Math.min(1, Math.max(0, a));
      rebuildAnterior();
    },
    setPupilFactor(f: number) {
      pupilFactor = Math.min(1.2, Math.max(0.5, f));
      rebuildAnterior();
    },
    setCutaway(on: boolean) {
      clip.constant = on ? 0 : CLIP_OFF;
      cutOn = on;
      if (flowOn) stepFlow(0);
    },
    highlight,
    dispose() {
      flowOn = false;
      cancelAnimationFrame(flowRaf);
      flowRaf = 0;
      for (const d of stationDisposables.splice(0)) d.dispose();
      lens.geometry.dispose();
      nucleus.geometry.dispose();
      iris.geometry.dispose();
      disposables.forEach((d) => d.dispose());
      void sclera;
      void choroid;
      void retina;
      void macula;
      void fovea;
      void disc;
      void vitreous;
      void ciliary;
      void cornea;
    },
  };
  return model;
}

export const EYE_GEOMETRY = { CORNEA_APEX, LENS_EQ, LIMBUS_A, RETINA_R };
