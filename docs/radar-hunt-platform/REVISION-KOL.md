# Revisión Medical/KOL del banco de los Hunts

Las 182 preguntas de las 23 estaciones científicas (`seed-hunt-matrix.ts`) entran como
**contenido candidato** (`pending_review`, sin explicación ni referencia). Ninguna se juega en
competición hasta que un KOL la aprueba con **explicación y al menos una referencia**
(`isPlayableInCompetition`).

La revisión se hace en seis hojas de Google Drive, una por recorrido: «Revisión KOL ·
General y residentes», «Segmento anterior», «Retina», «Glaucoma», «Neuro y Pediatría» y
«Oculoplastia y Órbita». Cada hoja tiene una pestaña **Revisión** con las columnas A–S y
otra **Resumen** con el recuento.

## Cómo importar las hojas devueltas

1. En Drive, abre cada hoja y elige **Archivo › Descargar › Microsoft Excel (.xlsx)**.
   Descarga las seis, aunque alguna no haya cambiado: cada importación sustituye a la anterior.
2. Extrae las filas:

   ```bash
   python3 -I scripts/radar-hunt/import-kol-review.py ~/Descargas/Revisión\ KOL*.xlsx
   ```

   Esto genera `src/lib/radar-hunt/hunt-kol-review.ts`, con el texto de cada celda tal cual.
   Necesita `openpyxl`. Como alternativa, acepta un `.csv` de la pestaña Revisión.

3. Genera el informe y el SQL de producción:

   ```bash
   npx vite-node scripts/radar-hunt/kol-review-report.ts
   ```

   El informe muestra, por estación, cuántas preguntas RADARS y Science XP son jugables y
   cuántas se han rechazado, seguido de los **errores** (filas no aplicadas y su motivo) y
   los **avisos**. Además escribe `supabase/seed/radar_hunt_kol_review.sql`. Si hay
   errores, el comando termina con código 1.

4. Corrige los errores en la hoja (o pide al KOL que lo haga) y repite desde el paso 1. El
   test `kol-review.test.ts › la importación actual se aplica sin errores` impide fusionar
   una importación con filas sin aplicar.
5. Ejecuta `npm run typecheck && npm test && npm run build` y abre un PR a `main`.
6. En producción, aplica `radar_hunt_kol_review.sql` después de `radar_hunt_hunt_matrix.sql`.
   Es idempotente: solo actualiza lo aprobado o rechazado. **Nunca** lo apliques en la base
   del evento Palma 2026.

## Reglas (en `src/lib/radar-hunt/kol-review.ts`, con tests)

| Estado en la hoja                                                     | Resultado                                        |
| --------------------------------------------------------------------- | ------------------------------------------------ |
| Pendiente o vacío                                                     | Sin cambios. Si hay algo escrito, se avisa.      |
| Aprobada / Aprobada con cambios, con explicación (O) y referencia (P) | `approved` + `kol_verified`: pasa a competición. |
| Aprobada sin explicación o sin referencia                             | Sigue pendiente, con un error en el informe.     |
| Rechazada                                                             | `rejected`: sale de ligas, Hunts y prácticas.    |

- **Correcta tras revisión (M):** A–D sustituye a la correcta de la matriz. Cualquier otra
  letra es un error, y el cambio de respuesta se señala siempre como aviso.
- **Cambios (N):** se aplican solo si están estructurados, una línea por cambio
  (`Enunciado: …`, `A: …` … `D: …`). También se aplica el texto editado directamente en las
  celdas E–I. Cualquier otro texto libre deja la pregunta pendiente para editarla a mano.
- **Referencias:** se pone una cita por línea en P y, en Q, sus DOI o URL en el mismo
  orden. Un DOI suelto (`10.xxxx/…` o `doi:…`) se convierte en `https://doi.org/…`.
- **Hoja desfasada:** si «Correcta (matriz)» (J) no coincide con el banco, la fila se
  ignora, porque las letras podrían apuntar a otras opciones. En ese caso hay que
  regenerar la hoja.
- Un id desconocido o duplicado entre hojas, o un estado que no viene del desplegable, es
  un error.

## Dónde se usa

`src/lib/radar-hunt/hunt-bank.ts` exporta `HUNT_BANK`, que es el banco con la revisión
aplicada. La demo (`demo-service.ts`) lo usa para ligas, Hunts y prácticas, de modo que
las preguntas aprobadas muestran la explicación y la referencia del KOL. `seed-hunt-matrix.ts`
sigue siendo la fuente original y no se edita a mano.
