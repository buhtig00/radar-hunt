// RADAR HUNT — Eye Universe: estructuras anatómicas (comunes al ojo 3D, a la película
import { PUBLIC_BASE } from "./static";
// y a las preguntas), capítulos de la película máster v4 y puntos interactivos.
import type { SubspecialtyCode } from "./types";

export interface EyeStructure {
  code: string;
  name: string;
  summary: string;
  /** Datos clave a escala real (adulto sano), para la ficha educativa. */
  facts: string[];
  subspecialties: SubspecialtyCode[];
  /** Capítulo de la película (las estructuras de los anejos no tienen tramo de película). */
  chapter?: string;
}

export const EYE_STRUCTURES: EyeStructure[] = [
  {
    code: "cornea",
    name: "Córnea",
    summary:
      "Ventana transparente y avascular: aporta unas dos terceras partes de la potencia óptica del ojo.",
    facts: [
      "Radio anterior ≈ 7,8 mm · posterior ≈ 6,5 mm",
      "Grosor central ≈ 550 µm",
      "≈ 43 D de potencia",
      "Capas: epitelio, Bowman, estroma, Descemet, endotelio",
    ],
    subspecialties: ["cornea", "refractive", "contactology"],
    chapter: "S01",
  },
  {
    code: "ocular_surface",
    name: "Superficie ocular y película lagrimal",
    summary:
      "Película lagrimal, epitelio corneal y conjuntival: la primera interfaz óptica e inmunológica.",
    facts: [
      "Película lagrimal: capa lipídica y capa mucoacuosa",
      "Lípidos de las glándulas de Meibomio",
    ],
    subspecialties: ["ocular_surface", "contactology"],
    chapter: "S01",
  },
  {
    code: "sclera",
    name: "Esclera",
    summary: "Capa fibrosa externa que da forma y resistencia al globo ocular.",
    facts: ["Radio del globo ≈ 12 mm", "Espolón escleral en el ángulo"],
    subspecialties: ["general_ophthalmology", "ocular_trauma"],
    chapter: "S01",
  },
  {
    code: "iris",
    name: "Iris",
    summary: "Diafragma pigmentado con criptas y collarete; regula la entrada de luz.",
    facts: [
      "Esfínter (parasimpático) y dilatador (simpático)",
      "Raíz insertada en el cuerpo ciliar",
    ],
    subspecialties: ["uveitis", "glaucoma"],
    chapter: "S02A",
  },
  {
    code: "pupil",
    name: "Pupila y reflejo fotomotor",
    summary:
      "Apertura del iris; su contracción ante la luz explora la vía visual aferente y la eferente.",
    facts: ["Diámetro típico 2–4 mm con luz", "Latencia del reflejo ≈ 0,2–0,3 s"],
    subspecialties: ["neuro_ophthalmology", "emergency_ophthalmology"],
    chapter: "S02P",
  },
  {
    code: "angle",
    name: "Ángulo iridocorneal",
    summary: "Vía de drenaje del humor acuoso: malla trabecular y canal de Schlemm.",
    facts: [
      "Gonioscopia: Schwalbe → trabécula → espolón → cuerpo ciliar",
      "Cámara anterior ≈ 3 mm",
    ],
    subspecialties: ["glaucoma"],
    chapter: "S02Z",
  },
  {
    code: "ciliary_body",
    name: "Cuerpo ciliar",
    summary: "Produce el humor acuoso y, con su músculo, controla la acomodación.",
    facts: ["Pars plicata (procesos) y pars plana", "La contracción relaja la zónula"],
    subspecialties: ["glaucoma", "refractive", "uveitis"],
    chapter: "S02Z",
  },
  {
    code: "zonule",
    name: "Zónula de Zinn",
    summary: "Fibras que suspenden el cristalino desde el cuerpo ciliar.",
    facts: [
      "Fibras anteriores, ecuatoriales y posteriores",
      "Tensas en reposo; destensadas al acomodar",
    ],
    subspecialties: ["cataract", "refractive"],
    chapter: "S02Z",
  },
  {
    code: "lens",
    name: "Cristalino",
    summary: "Lente biconvexa que cambia de forma para enfocar de cerca (acomodación).",
    facts: [
      "Relajado: 3,6 mm de grosor · 9,3 mm de diámetro",
      "Acomodado: 4,05 mm · 8,9 mm",
      "≈ 20 D en reposo",
    ],
    subspecialties: ["cataract", "refractive"],
    chapter: "S02",
  },
  {
    code: "vitreous",
    name: "Vítreo",
    summary: "Gel transparente que ocupa la cavidad posterior del ojo.",
    facts: ["≈ 80 % del volumen del globo", "Fibrillas de colágeno y ácido hialurónico"],
    subspecialties: ["retina", "uveitis"],
    chapter: "S03",
  },
  {
    code: "retina",
    name: "Retina",
    summary: "Tejido neural que convierte la luz en señal; diez capas desde la MLI hasta el EPR.",
    facts: ["Grosor ≈ 250–300 µm perifoveal", "Arcadas vasculares temporales"],
    subspecialties: ["retina", "pediatric_ophthalmology", "ocular_oncology"],
    chapter: "S04",
  },
  {
    code: "macula",
    name: "Mácula",
    summary: "Zona central de la retina, especializada en la visión de detalle y del color.",
    facts: ["≈ 5,5 mm de diámetro", "Pigmento lúteo (luteína, zeaxantina)"],
    subspecialties: ["retina", "low_vision", "emergency_ophthalmology"],
    chapter: "S04",
  },
  {
    code: "fovea",
    name: "Fóvea",
    summary: "Depresión central sin vasos, solo con conos: máxima agudeza visual.",
    facts: ["Zona avascular foveal", "Foveola ≈ 0,35 mm", "Capas internas desplazadas"],
    subspecialties: ["retina"],
    chapter: "S04D",
  },
  {
    code: "optic_disc",
    name: "Disco óptico",
    summary: "Salida del nervio óptico y entrada de los vasos centrales de la retina.",
    facts: [
      "≈ 1,5–1,8 mm de diámetro",
      "A ≈ 2,5 diámetros papilares de la fóvea",
      "Punto ciego fisiológico",
    ],
    subspecialties: ["glaucoma", "neuro_ophthalmology"],
    chapter: "S04",
  },
  {
    code: "choroid",
    name: "Coroides",
    summary: "Capa vascular que nutre la retina externa.",
    facts: [
      "Uno de los flujos sanguíneos más altos del organismo",
      "Lugar de origen del melanoma uveal",
    ],
    subspecialties: ["retina", "uveitis", "ocular_oncology"],
    chapter: "S04C",
  },
  {
    code: "optic_nerve",
    name: "Nervio óptico",
    summary:
      "Lleva la señal de la retina al quiasma; su vaina meníngea comunica con el espacio subaracnoideo.",
    facts: [
      "Longitud total ≈ 45–50 mm: intraocular, intraorbitaria, intracanalicular e intracraneal",
      "Porción intraorbitaria ≈ 25 mm, sinuosa: permite los movimientos del globo",
      "La presión intracraneal se transmite por la vaina hasta el disco (papiledema)",
    ],
    subspecialties: ["neuro_ophthalmology", "glaucoma"],
  },
  {
    code: "eyelids",
    name: "Párpados",
    summary:
      "Protegen la superficie ocular y reparten la lágrima; el elevador y el músculo de Müller abren la hendidura.",
    facts: [
      "Hendidura palpebral ≈ 10 mm de alto × 28–30 mm de ancho",
      "El párpado superior cubre ≈ 1–2 mm de la córnea superior",
      "Elevador del párpado superior (III par) y músculo de Müller (simpático)",
      "Tarso superior ≈ 10 mm de alto · inferior ≈ 4–5 mm",
    ],
    subspecialties: ["oculoplastics", "neuro_ophthalmology"],
  },
  {
    code: "lacrimal",
    name: "Sistema lagrimal",
    summary:
      "La glándula lagrimal secreta la lágrima y la vía lagrimal la drena desde los puntos hasta la nariz.",
    facts: [
      "Glándula en la fosa lagrimal superotemporal (lóbulos orbitario y palpebral)",
      "Puntos lagrimales → canalículos (≈ 2 mm verticales + 8 mm horizontales) → saco",
      "Saco ≈ 12 mm · conducto nasolagrimal ≈ 12–18 mm hasta el meato inferior (válvula de Hasner)",
    ],
    subspecialties: ["oculoplastics", "ocular_surface", "pediatric_ophthalmology"],
  },
  {
    code: "extraocular_muscles",
    name: "Músculos extraoculares",
    summary:
      "Cuatro rectos y dos oblicuos mueven el globo; los rectos nacen en el anillo de Zinn, en el vértice orbitario.",
    facts: [
      "Espiral de Tillaux: recto medio 5,5 · inferior 6,5 · lateral 6,9 · superior 7,7 mm del limbo",
      "Oblicuo superior: IV par, a través de la tróclea · recto lateral: VI par · resto: III par",
      "Oblicuo inferior: nace en el suelo orbitario anteromedial, junto a la fosa lagrimal",
    ],
    subspecialties: [
      "strabismus",
      "neuro_ophthalmology",
      "oculoplastics",
      "pediatric_ophthalmology",
    ],
  },
  {
    code: "orbit",
    name: "Órbita",
    summary:
      "Cavidad ósea piramidal que aloja el globo, la grasa, los músculos, los nervios y los vasos.",
    facts: [
      "Volumen ≈ 30 cm³",
      "Reborde ≈ 40 mm de ancho × 35 mm de alto · profundidad ≈ 40–45 mm hasta el vértice",
      "El septo orbitario separa la celulitis preseptal de la orbitaria (postseptal)",
      "Vértice: anillo de Zinn, canal óptico y fisura orbitaria superior",
    ],
    subspecialties: ["oculoplastics", "ocular_oncology", "emergency_ophthalmology"],
  },
];

export function getStructure(code: string | undefined): EyeStructure | undefined {
  return EYE_STRUCTURES.find((s) => s.code === code);
}

export interface EyeChapter {
  code: string;
  title: string;
  summary: string;
  /** Tramo en la película máster v4 (49 s); aproximado, a fijar al fotograma. */
  startS: number;
  endS: number;
  structures: string[];
  subspecialties: SubspecialtyCode[];
}

export const EYE_CHAPTERS: EyeChapter[] = [
  {
    code: "S01",
    title: "Puerta corneal",
    summary: "De la superficie del ojo a través del epitelio, el estroma y el endotelio.",
    startS: 0,
    endS: 9,
    structures: ["cornea", "ocular_surface"],
    subspecialties: ["cornea", "ocular_surface", "contactology", "refractive"],
  },
  {
    code: "S02A",
    title: "Iris y pupila",
    summary: "La cámara anterior y el iris azul grisáceo con su collarete dorado.",
    startS: 9,
    endS: 13,
    structures: ["iris"],
    subspecialties: ["uveitis", "glaucoma"],
  },
  {
    code: "S02P",
    title: "Reflejo fotomotor",
    summary: "La pupila se contrae ante la luz y vuelve a dilatarse.",
    startS: 13,
    endS: 16.5,
    structures: ["pupil"],
    subspecialties: ["neuro_ophthalmology"],
  },
  {
    code: "S02Z",
    title: "Zónula y acomodación",
    summary:
      "Corte sagital: el cuerpo ciliar se contrae, la zónula se destensa y el cristalino se abomba.",
    startS: 16.5,
    endS: 22,
    structures: ["ciliary_body", "zonule", "angle"],
    subspecialties: ["cataract", "refractive", "glaucoma"],
  },
  {
    code: "S02",
    title: "Cristalino",
    summary: "Travesía por la cápsula, el córtex y el núcleo.",
    startS: 22,
    endS: 28,
    structures: ["lens"],
    subspecialties: ["cataract"],
  },
  {
    code: "S03",
    title: "Vítreo",
    summary: "El gel transparente y sus fibrillas camino del polo posterior.",
    startS: 28,
    endS: 37,
    structures: ["vitreous"],
    subspecialties: ["retina"],
  },
  {
    code: "S04",
    title: "Mácula y disco",
    summary: "El polo posterior: disco óptico, arcadas vasculares y mácula.",
    startS: 37,
    endS: 43,
    structures: ["macula", "optic_disc", "retina"],
    subspecialties: ["retina", "glaucoma", "neuro_ophthalmology"],
  },
  {
    code: "S04C",
    title: "Capas de la retina",
    summary: "Corte foveal: de la MLI al EPR y la coroides.",
    startS: 43,
    endS: 46,
    structures: ["retina", "choroid"],
    subspecialties: ["retina"],
  },
  {
    code: "S04D",
    title: "Fóvea",
    summary: "El centro avascular donde la visión es más nítida.",
    startS: 46,
    endS: 49,
    structures: ["fovea"],
    subspecialties: ["retina"],
  },
];

export interface EyeHotspot {
  id: string;
  chapter: string;
  startS: number;
  endS: number;
  /** Posición normalizada en el fotograma (0–1). */
  x: number;
  y: number;
  label: string;
  structure: string;
}

export const EYE_HOTSPOTS: EyeHotspot[] = [
  {
    id: "h-cornea",
    chapter: "S01",
    startS: 0.5,
    endS: 4,
    x: 0.5,
    y: 0.42,
    label: "Córnea y película lagrimal",
    structure: "cornea",
  },
  {
    id: "h-iris",
    chapter: "S02A",
    startS: 9.5,
    endS: 13,
    x: 0.66,
    y: 0.5,
    label: "Iris y collarete",
    structure: "iris",
  },
  {
    id: "h-pupil",
    chapter: "S02P",
    startS: 13.2,
    endS: 16.5,
    x: 0.5,
    y: 0.5,
    label: "Pupila: reflejo fotomotor",
    structure: "pupil",
  },
  {
    id: "h-zonule",
    chapter: "S02Z",
    startS: 17.5,
    endS: 22,
    x: 0.47,
    y: 0.38,
    label: "Zónula",
    structure: "zonule",
  },
  {
    id: "h-ciliary",
    chapter: "S02Z",
    startS: 17.5,
    endS: 22,
    x: 0.43,
    y: 0.18,
    label: "Cuerpo ciliar",
    structure: "ciliary_body",
  },
  {
    id: "h-lens",
    chapter: "S02",
    startS: 22.5,
    endS: 27.5,
    x: 0.5,
    y: 0.5,
    label: "Cristalino",
    structure: "lens",
  },
  {
    id: "h-vitreous",
    chapter: "S03",
    startS: 28.5,
    endS: 36.5,
    x: 0.35,
    y: 0.35,
    label: "Vítreo",
    structure: "vitreous",
  },
  {
    id: "h-disc",
    chapter: "S04",
    startS: 37.5,
    endS: 42.5,
    x: 0.72,
    y: 0.5,
    label: "Disco óptico",
    structure: "optic_disc",
  },
  {
    id: "h-macula",
    chapter: "S04",
    startS: 37.5,
    endS: 42.5,
    x: 0.45,
    y: 0.5,
    label: "Mácula",
    structure: "macula",
  },
  {
    id: "h-layers",
    chapter: "S04C",
    startS: 43.5,
    endS: 45.5,
    x: 0.5,
    y: 0.78,
    label: "Capas de la retina",
    structure: "retina",
  },
  {
    id: "h-fovea",
    chapter: "S04D",
    startS: 46.2,
    endS: 48.8,
    x: 0.5,
    y: 0.5,
    label: "Fóvea",
    structure: "fovea",
  },
];

/**
 * Película completa externa (opcional): HLS o MP4 del máster v4 servido desde una CDN.
 * Sin ella, la película se reproduce encadenando los vídeos de las estaciones (/eye/stations).
 */
export const EYE_VIDEO_URL: string | undefined =
  (typeof import.meta !== "undefined" &&
    (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_EYE_VIDEO_URL) ||
  undefined;

/**
 * Estaciones del viaje por el ojo: un corte de la película máster v4 por capítulo (1080p, con
 * su etalonaje), sin los fundidos de transición. `marker` es la posición del marcador en el
 * ojo 3D (mm, ejes del modelo: y = eje óptico anterior, z < 0 = superior en pantalla).
 */
export interface EyeStation {
  code: string;
  number: number;
  video: string;
  poster: string;
  /** Tramo exacto del corte dentro de la película (s). */
  clipStartS: number;
  clipEndS: number;
  marker: [number, number, number];
}

const st = (
  code: string,
  number: number,
  clipStartS: number,
  clipEndS: number,
  marker: [number, number, number],
): EyeStation => ({
  code,
  number,
  video: `${PUBLIC_BASE}eye/stations/${code}.mp4`,
  poster: `${PUBLIC_BASE}eye/stations/${code}.jpg`,
  clipStartS,
  clipEndS,
  marker,
});

// Marcadores repartidos alrededor del eje óptico para que no se tapen en las vistas frontales:
// cada uno junto a su estructura (la fóvea es la única en el eje).
export const EYE_STATIONS: EyeStation[] = [
  st("S01", 1, 0, 9, [-4.6, 12.2, -3.4]), // superficie corneal
  st("S02A", 2, 9, 13, [0, 9.7, -4.8]), // iris superior
  st("S02P", 3, 13, 16.5, [1.8, 10.0, 1.2]), // borde pupilar
  st("S02Z", 4, 17, 22, [5.6, 8.0, 0]), // ecuador del cristalino y zónula
  st("S02", 5, 22.5, 28, [-3.2, 7.4, 2.4]), // cristalino
  st("S03", 6, 28, 37, [3.6, 1.0, 5.0]), // vítreo medio
  st("S04", 7, 37, 43, [-2.6, -10.4, -2.2]), // mácula
  st("S04C", 8, 43, 46, [0, -10.2, 4.2]), // corte de la retina
  st("S04D", 9, 46, 49, [0, -10.9, 0]), // fóvea
];

export function getStation(code: string | undefined): EyeStation | undefined {
  return EYE_STATIONS.find((x) => x.code === code);
}
