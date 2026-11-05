#!/usr/bin/env python3
"""Importa la «Matriz de 8 estaciones por perfil» (texto exportado del documento de OR)
y genera src/lib/radar-hunt/seed-hunt-matrix.ts.

Uso: python3 -I scripts/radar-hunt/import-hunt-matrix.py <matriz.txt>

- Solo importa las estaciones CIENTÍFICAS (sin marcas). Las estaciones de marca de la
  matriz se crean desde la organización del evento, con su acuerdo y transparencia.
- Las preguntas de ordenar (sin opciones A–D) se omiten: el motor aún no las admite.
- Todo entra como contenido candidato: pending_review, sin referencia ni explicación
  (pendientes de Medical/KOL). No es jugable en competición hasta su aprobación.
"""
import json, re, sys, collections

SRC = sys.argv[1]
OUT = "src/lib/radar-hunt/seed-hunt-matrix.ts"
TRACKS = {
    "GEN": ("general", "Oftalmología general / residentes"),
    "ANT": ("anterior", "Segmento anterior"),
    "RET": ("retina", "Retina"),
    "GLA": ("glaucoma", "Glaucoma"),
    "PED": ("neuroped", "Neuro + Pediatría"),
    "NEU": ("neuroped", "Neuro + Pediatría"),
    "OCP": ("oculoplastia", "Oculoplastia + Órbita"),
}
SUB = {
    "GEN-01": "uveitis", "GEN-02": "general_ophthalmology",
    "ANT-01": "cornea", "ANT-02": "cornea",
    "RET-01": "retina", "RET-02": "retina", "RET-03": "retina",
    "GLA-01": "glaucoma", "GLA-02": "glaucoma", "GLA-03": "glaucoma", "GLA-04": "glaucoma", "GLA-05": "glaucoma",
    "PED-01": "strabismus", "PED-02": "pediatric_ophthalmology", "PED-03": "pediatric_ophthalmology",
    "NEU-01": "neuro_ophthalmology", "NEU-02": "neuro_ophthalmology", "NEU-03": "neuro_ophthalmology",
    "OCP-01": "oculoplastics", "OCP-02": "oculoplastics", "OCP-03": "oculoplastics", "OCP-04": "oculoplastics", "OCP-05": "oculoplastics",
}
# Estructura anatómica del ojo 3D más cercana (para enlazar la estación con el Eye Universe).
STRUCT = {
    "GEN-01": "iris", "GEN-02": "vitreous", "ANT-01": "cornea", "ANT-02": "cornea",
    "RET-01": "macula", "RET-02": "retina", "RET-03": "retina",
    "GLA-01": "optic_disc", "GLA-02": "iris", "GLA-03": "optic_disc", "GLA-04": "lens", "GLA-05": "optic_disc",
    "PED-01": "cornea", "PED-02": "fovea", "PED-03": "lens",
    "NEU-01": "optic_disc", "NEU-02": "optic_disc", "NEU-03": "optic_disc",
}

def sentence(s: str) -> str:
    s = s.strip().lower()
    return s[:1].upper() + s[1:]

def difficulty(layer: str, kind: str) -> int:
    k = kind.upper()
    if "BOSS" in k: return 4
    if layer == "SCIENCE XP": return 3
    if k in ("MCQ", "DEFINICIÓN", "CONCEPTO", "ANATOMÍA", "SÍNTOMAS"): return 2
    return 3

def cognitive(kind: str) -> str:
    k = kind.upper()
    if "BOSS" in k or "DIFERENCIAL" in k: return "analysis"
    if k in ("MCQ", "DEFINICIÓN", "CONCEPTO", "ANATOMÍA"): return "recall"
    if k in ("CASO", "DECISIÓN", "TRATAMIENTO", "URGENCIA", "SEGURIDAD", "SECUENCIA"): return "application"
    return "understanding"

text = open(SRC, encoding="utf8").read().replace("\\", "")
st_re = re.compile(r"^([A-Z]{3}-\d{2}) · (.+)$")
q_re = re.compile(r"^Q(\d) · (RADARS|SCIENCE XP) · (.+)$")
opt_re = re.compile(r"^([A-D])\) (.+)$")
cor_re = re.compile(r"^Correcta: ([A-D])$")
stations, cur, q = [], None, None
for raw in text.split("\n"):
    l = raw.strip()
    if not l:
        continue
    m = st_re.match(l)
    if m:
        cur = {"code": m.group(1), "title": m.group(2), "questions": []}
        stations.append(cur)
        q = None
        continue
    m = q_re.match(l)
    if m and cur is not None:
        q = {"n": int(m.group(1)), "layer": m.group(2), "kind": m.group(3).strip(), "stem": "", "options": {}, "correct": None}
        cur["questions"].append(q)
        continue
    if q is None:
        continue
    m = opt_re.match(l)
    if m:
        q["options"][m.group(1)] = m.group(2).strip()
        continue
    m = cor_re.match(l)
    if m:
        q["correct"] = m.group(1)
        q = None
        continue
    if not q["options"]:
        q["stem"] = (q["stem"] + " " + l).strip()

out_st, out_q, skipped = [], [], []
for s in stations:
    prefix = s["code"].split("-")[0]
    track, track_label = TRACKS[prefix]
    qids = []
    for x in s["questions"]:
        if sorted(x["options"]) != ["A", "B", "C", "D"] or x["correct"] not in x["options"]:
            skipped.append(f'{s["code"]} Q{x["n"]} ({x["kind"]})')
            continue
        qid = f'hm-{s["code"].lower()}-q{x["n"]}'
        qids.append(qid)
        out_q.append({
            "id": qid,
            "type": "single_choice",
            "subspecialty": SUB[s["code"]],
            "careerLevel": "both",
            "difficulty": difficulty(x["layer"], x["kind"]),
            "cognitiveLevel": cognitive(x["kind"]),
            **({"structure": STRUCT[s["code"]]} if s["code"] in STRUCT else {}),
            "stem": x["stem"],
            "options": [{"id": f"{qid}-{k.lower()}", "text": v, "isCorrect": k == x["correct"]} for k, v in sorted(x["options"].items())],
            "explanation": "Explicación y referencia pendientes de redacción por el comité editorial. Contenido candidato de la matriz de estaciones de Ophthalmology Radar (21/09/2026), pendiente de validación Medical/KOL.",
            "references": [],
            "status": "pending_review",
            "validationLevel": "ai_generated",
            "aiAssisted": False,
            "layer": "radars" if x["layer"] == "RADARS" else "science_xp",
            "kind": sentence(x["kind"]),
        })
    out_st.append({
        "code": s["code"], "title": sentence(s["title"]), "track": track, "trackLabel": track_label,
        "subspecialty": SUB[s["code"]], "radarIds": [i for i in qids if int(i[-1]) <= 5], "scienceXpIds": [i for i in qids if int(i[-1]) > 5],
    })

dist = collections.Counter(next(o["id"][-1] for o in q["options"] if o["isCorrect"]) for q in out_q)
header = f"""// RADAR HUNT — banco de los Hunts importado de la «Matriz de 8 estaciones por perfil»
// (documento de Ophthalmology Radar, 21/09/2026). GENERADO por
// scripts/radar-hunt/import-hunt-matrix.py: no editar a mano.
//
// CONTENIDO CANDIDATO · PENDIENTE DE VALIDACIÓN MEDICAL/KOL. Sin explicación ni referencia
// todavía: en producción NO es jugable en competición (isPlayableInCompetition) hasta que el
// comité lo apruebe y añada al menos una referencia. En la demo se juega con el aviso.
// {len(out_st)} estaciones científicas · {len(out_q)} preguntas · omitidas (formato «ordenar»): {", ".join(skipped) or "ninguna"}.
// Reparto de la correcta: {dict(sorted(dist.items()))}.
import type {{ Question, SubspecialtyCode }} from "./types";

export interface HuntQuestion extends Question {{
  /** Q1–Q5: capa competitiva (RADARS). Q6–Q8: profundización (Science XP). */
  layer: "radars" | "science_xp";
  kind: string;
}}

export interface HuntStationSeed {{
  code: string;
  title: string;
  /** Recorrido (perfil de la liga) al que pertenece la estación. */
  track: string;
  trackLabel: string;
  subspecialty: SubspecialtyCode;
  radarIds: string[];
  scienceXpIds: string[];
}}

"""
body = (
    "export const HUNT_TRACKS: Record<string, string> = "
    + json.dumps({v[0]: v[1] for v in TRACKS.values()}, ensure_ascii=False, indent=2)
    + ";\n\nexport const HUNT_STATIONS: HuntStationSeed[] = "
    + json.dumps(out_st, ensure_ascii=False, indent=2)
    + ";\n\nexport const HUNT_QUESTIONS: HuntQuestion[] = "
    + json.dumps(out_q, ensure_ascii=False, indent=2)
    + ";\n"
)
open(OUT, "w", encoding="utf8").write(header + body)
print(f"{len(out_st)} estaciones, {len(out_q)} preguntas, omitidas: {skipped}, correctas: {dict(dist)}")
