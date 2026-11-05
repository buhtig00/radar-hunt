#!/usr/bin/env python3
"""Importa las hojas «Revisión KOL · <recorrido>» y genera src/lib/radar-hunt/hunt-kol-review.ts.

Uso:
  python3 -I scripts/radar-hunt/import-kol-review.py <hoja.xlsx|hoja.csv> [...]
  npx vite-node scripts/radar-hunt/kol-review-report.ts     # informe + SQL de producción

- Entrada: cada hoja de Google Drive descargada como .xlsx (Archivo › Descargar › Microsoft
  Excel). Se lee la pestaña «Revisión». También admite .csv de esa pestaña.
- Las columnas se localizan por su CABECERA (no por la letra), así que añadir o mover
  columnas en la hoja no rompe la importación.
- Este script NO decide nada: copia el texto de cada celda. Las reglas (qué pasa a
  competición, qué queda pendiente) están en src/lib/radar-hunt/kol-review.ts, con tests.
- Solo se guardan las filas con decisión o con algo escrito; las «Pendiente» vacías no.
- Reimportar sustituye la importación anterior: pasa SIEMPRE todas las hojas a la vez.
"""
import csv, datetime, json, os, subprocess, sys

OUT = "src/lib/radar-hunt/hunt-kol-review.ts"

# Cabecera de la hoja → campo de KolReviewRow (comparación sin mayúsculas ni espacios extra).
COLUMNS = {
    "id pregunta": "id",
    "enunciado": "stem",
    "a": "opt0",
    "b": "opt1",
    "c": "opt2",
    "d": "opt3",
    "correcta (matriz)": "matrixCorrect",
    "estado de revisión": "state",
    "correcta tras revisión": "correct",
    "cambios en enunciado u opciones": "changes",
    "explicación (perla clínica)": "explanation",
    "referencia (cita completa)": "reference",
    "doi o url": "url",
    "revisor/a (kol)": "reviewer",
    "fecha de revisión": "date",
}
REQUIRED = {"id", "state", "matrixCorrect", "correct", "explanation", "reference"}
REVIEW_FIELDS = ("correct", "changes", "explanation", "reference", "url", "reviewer")


def die(msg):
    sys.exit(f"ERROR: {msg}")


def cell_text(v):
    if v is None:
        return ""
    if isinstance(v, datetime.datetime):
        return v.date().isoformat()
    if isinstance(v, datetime.date):
        return v.isoformat()
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return str(v).replace("\r\n", "\n").strip()


def read_xlsx(path):
    try:
        import openpyxl
    except ImportError:
        die("falta openpyxl (pip install openpyxl) o exporta la pestaña «Revisión» como .csv")
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    names = [n for n in wb.sheetnames if n.strip().lower().startswith("revisi")]
    if not names:
        die(f"{path}: no hay pestaña «Revisión» (pestañas: {', '.join(wb.sheetnames)})")
    ws = wb[names[0]]
    return names[0], [[cell_text(v) for v in r] for r in ws.iter_rows(values_only=True)]


def read_csv(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return "csv", [[cell_text(v) for v in r] for r in csv.reader(f)]


def rows_of(path):
    if not os.path.isfile(path):
        die(f"no existe el archivo {path}")
    tab, table = read_xlsx(path) if path.lower().endswith((".xlsx", ".xlsm")) else read_csv(path)
    head_i = next(
        (i for i, r in enumerate(table) if r and r[0].strip().lower() == "id pregunta"), None
    )
    if head_i is None:
        die(f"{path}: no encuentro la cabecera «ID pregunta» en la columna A")
    cols = {}
    for j, h in enumerate(table[head_i]):
        key = COLUMNS.get(" ".join(h.split()).lower())
        if key:
            cols.setdefault(key, j)
    missing = REQUIRED - cols.keys()
    if missing:
        die(f"{path}: faltan columnas {sorted(missing)}")

    name = os.path.basename(path)
    out, total = [], 0
    for i, r in enumerate(table[head_i + 1 :], start=head_i + 2):
        get = lambda k: r[cols[k]] if k in cols and cols[k] < len(r) else ""
        if not get("id"):
            continue
        total += 1
        state = get("state")
        if state.lower() in ("", "pendiente") and not any(get(k) for k in REVIEW_FIELDS):
            continue
        row = {"id": get("id"), "source": f"{name} › {tab} fila {i}", "state": state}
        if get("stem"):
            row["stem"] = get("stem")
        opts = [get(f"opt{k}") for k in range(4)]
        if any(opts):
            row["options"] = opts
        for k in ("matrixCorrect", *REVIEW_FIELDS, "date"):
            if get(k):
                row[k] = get(k)
        out.append(row)
    return out, total


def main(paths):
    if not paths:
        die(__doc__)
    rows, total = [], 0
    for p in paths:
        r, t = rows_of(p)
        rows += r
        total += t
        print(f"{os.path.basename(p)}: {t} preguntas, {len(r)} con revisión")
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    sources = [os.path.basename(p) for p in paths]
    ts = (
        "// RADAR HUNT — filas de las hojas «Revisión KOL» (Google Drive), tal cual.\n"
        "// GENERADO por scripts/radar-hunt/import-kol-review.py: no editar a mano.\n"
        "// Las reglas que las convierten en preguntas aprobadas están en kol-review.ts.\n"
        'import type { KolReviewRow } from "./kol-review";\n\n'
        "/** Fecha de la última importación (null: aún no hay revisiones). */\n"
        f"export const KOL_REVIEW_IMPORTED_AT: string | null = {json.dumps(now)};\n\n"
        "/** Archivos de los que salieron las filas. */\n"
        f"export const KOL_REVIEW_SOURCES: string[] = {json.dumps(sources, ensure_ascii=False)};\n\n"
        "/** Solo filas con decisión o con algo escrito; las «Pendiente» vacías no se guardan. */\n"
        f"export const KOL_REVIEW_ROWS: KolReviewRow[] = {json.dumps(rows, ensure_ascii=False, indent=2)};\n"
    )
    with open(OUT, "w", encoding="utf8") as f:
        f.write(ts)
    try:  # mismo formato que el resto del repositorio (si hay node_modules)
        subprocess.run(["npx", "--no-install", "prettier", "--write", OUT], check=False, capture_output=True)
    except OSError:
        pass
    print(f"{total} preguntas leídas, {len(rows)} filas con revisión → {OUT}")
    print("Siguiente paso: npx vite-node scripts/radar-hunt/kol-review-report.ts")


if __name__ == "__main__":
    main(sys.argv[1:])
