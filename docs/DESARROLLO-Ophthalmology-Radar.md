# Ophthalmology Radar — Intelligence Layer · Informe de desarrollo

> Documento único que consolida todo el trabajo realizado sobre el paquete
> **Ophtha Insight Layer**: análisis de áreas de mejora e implementación.
> Rama: `claude/peaceful-goldberg-7j73lk` · 19 commits.
> **Toolchain verificado en verde**: `tsc --noEmit` 0 errores · 21/21 tests
> (Vitest) · `vite build` de producción OK.

---

## 1. Resumen ejecutivo

Se partió de un repositorio **vacío** y del paquete `Ophtha Insight Layer` (la
capa de inteligencia de _Ophthalmology Radar_: TanStack Start + Supabase +
RAG sobre pgvector, con gobernanza editorial y roles). Tras analizar todo el
código, esquema SQL, migraciones, detectores de seguridad y el documento
maestro, se implementó una hoja de ruta priorizada en tres bloques:

- **P0 — Seguridad** (exposición de datos, PII, citas, secretos): **completo**.
- **P1 — Calidad del RAG** (bug de recuperación, chunking, cross-lingual,
  ingesta de conocimiento): **completo**.
- **P2 — Robustez y cumplimiento** (GDPR, cuotas, guardarraíl, tests/CI,
  feedback, analítica): **completo en su parte de código**.

Lo único que queda fuera son tareas **no técnicas** (redacción de contenido
clínico por médicos/KOL, DPA/residencia legal) y cosmética menor.

---

## 2. Estado inicial y alcance

- Repo `/home/user/IA` vacío (sin commits). El proyecto llegó como ZIP.
- Primer commit: importación del proyecto **excluyendo `.env`** (que viajaba sin
  estar en `.gitignore`) + endurecimiento P0.
- **Acción pendiente del equipo:** rotar cualquier secreto del `.env` original.

Arquitectura encontrada (sólida): server functions con middleware de auth,
cliente Supabase server/cliente separados, RAG (`match_ai_chunks`), salida
estructurada por _tool-calling_, esquema clínico bilingüe `oph_*`, roles y
niveles de validación (AI Generated → OR Reviewed → KOL Verified).

---

## 3. Análisis — áreas de mejora detectadas

### 🔴 P0 (crítico)

1. **Corpus RAG legible por `anon`**: `ai_chunks` y `match_ai_chunks` concedidos
   a `anon` → fuga del contenido curado con la publishable key.
2. **Detectores de seguridad divergentes**: el backend usaba uno débil (12
   términos) mientras existía uno rico sin usar.
3. **Sin validación de citas**: riesgo de fuentes inventadas (alucinación).
4. **Webhook de reindex** con comparación de secreto vulnerable a _timing_.
5. **`.env`** sin `.gitignore`.
6. **PII** solo avisaba en cliente; no bloqueaba en servidor.

### 🟠 P1

7. **Bug: subespecialidad invisible** — el contenido curado `oph_*` se guardaba
   con código enum minúscula (`cornea`) y la UI filtra por etiqueta (`Cornea`):
   nunca se recuperaba.
8. **Sin umbral de similitud** ni chunking (1 doc = 1 vector).
9. **Recuperación monolingüe**.
10. **Knowledge-blocks** sin ingerir; su SQL de import **roto** contra el esquema.

### 🟡 P2

11. GDPR/retención, cuotas, guardarraíl de salida, feedback loop, tests/CI,
    analítica en vivo.

---

## 4. Implementación detallada

### 🔴 P0 — Seguridad

| Mejora                                                                                               | Archivos                                                                             |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Cierre del acceso `anon` al RAG; lectura solo con rol clínico verificado (`oph_has_clinical_access`) | `supabase/migrations/20260622120000_harden_rag_access.sql`                           |
| Detector de seguridad **unificado** (el rico) + normalización de acentos (NFD)                       | `src/lib/safety.ts`, `clinical.functions.ts`, `case.functions.ts`                    |
| **Validación de citas**: se descartan fuentes fuera del corpus recuperado; flag `Evidence limited`   | `clinical.functions.ts`, `case.functions.ts`, `rag.server.ts` (`retrievedSourceIds`) |
| **Gate de PII en servidor**: bloquea el envío al LLM si hay datos identificables                     | `case.functions.ts`                                                                  |
| Webhook con comparación en **tiempo constante**                                                      | `src/routes/api/public/hooks/reindex-evidence.ts`                                    |
| `.env` ignorado + `.env.example` sin secretos                                                        | `.gitignore`, `.env.example`                                                         |

### 🟠 P1 — Calidad del RAG

| Mejora                                                                                                               | Archivos                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Fix subespecialidad** (código enum → etiqueta UI)                                                                  | `src/lib/ophthalmology-subspecialty.ts`, `reindex.server.ts`                                                                       |
| **Umbral de similitud** mínima (`DEFAULT_MIN_SIMILARITY`)                                                            | `rag.server.ts`                                                                                                                    |
| **Chunking con solape** (párrafo/frase, ~1200 chars / 150 solape)                                                    | `src/lib/ai/chunk.ts`, `reindex.server.ts`                                                                                         |
| **Recuperación cross-lingual** (pool ampliado + rerank con `SAME_LANGUAGE_BOOST`)                                    | `rag.server.ts`                                                                                                                    |
| **Ingesta knowledge-blocks** a RAG (idempotente, solo monografías)                                                   | `src/lib/knowledge-block-seeds.ts` (274 seeds), `src/lib/ai/seed-blocks.server.ts`, `index.functions.ts` (`seedKnowledgeBlocksFn`) |
| **Import SQL schema-correcto** a `oph_*` (198 filas, enums normalizados, casts, idempotente) — reemplaza el SQL roto | `docs/knowledge-blocks/extracted/oph_import_all_blocks.sql`, `README.md`, `_ALL_rag_seeds.jsonl`                                   |

### 🟡 P2 — Robustez y cumplimiento

| Mejora                                                               | Archivos                                                                                          |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Retención GDPR** (`purge_old_ai_data` + `pg_cron`)                 | `supabase/migrations/20260622130000_data_retention.sql`                                           |
| **Derecho de supresión** self-service                                | `src/lib/privacy.functions.ts`, `settings.tsx`                                                    |
| **Cuotas por usuario** (`enforceDailyQuota`, `AI_DAILY_QUERY_LIMIT`) | `src/lib/ai/quota.server.ts`, clinical/case/tutor                                                 |
| **Guardarraíl de salida** (marca deriva a consejo individualizado)   | `src/lib/ai/output-guard.ts`, clinical/case                                                       |
| **Circuito de feedback** → cola editorial real                       | `editorial.functions.ts` (`listFlaggedAIAnswers`), `editorial-review.tsx` (`FlaggedAnswersPanel`) |
| **Analítica en vivo (KPIs)**                                         | `src/lib/analytics.functions.ts`, `analytics.tsx`                                                 |
| **Tests + CI**                                                       | `vitest.config.ts`, `*.test.ts` (×4), `.github/workflows/ci.yml`, `package.json`                  |

---

## 5. Commits (cronológico)

```
59f4e44  Import Ophthalmology Radar Intelligence Layer + P0/P1 hardening
7b8a093  Add typecheck script; correct ROADMAP on oph_* ingestion
cdb40b4  RAG: fix subspecialty mismatch, add chunking, seed knowledge blocks
635555f  Add schema-correct oph_* import SQL for knowledge blocks
1259bf7  RAG cross-lingual retrieval + GDPR data-retention job
9d02e60  Add per-user AI quota and educational output guardrail
f8a0d60  Add Vitest unit tests for critical pure logic + CI workflow
c1bd4a2  Close the AI feedback loop into editorial review
accd4d7  Live analytics KPIs + GDPR right-to-erasure
```

---

## 6. Inventario de archivos

**Nuevos (lógica)**

- `src/lib/ai/chunk.ts` — troceado con solape.
- `src/lib/ai/output-guard.ts` — guardarraíl de salida.
- `src/lib/ai/quota.server.ts` — cuota diaria por usuario.
- `src/lib/ai/seed-blocks.server.ts` — seeder idempotente de bloques.
- `src/lib/ophthalmology-subspecialty.ts` — canonicalización de subespecialidad.
- `src/lib/knowledge-block-seeds.ts` — 274 seeds (88 monografías + 186 stubs).
- `src/lib/analytics.functions.ts` — KPIs reales.
- `src/lib/privacy.functions.ts` — derecho de supresión.

**Nuevos (tests/CI/infra)**

- `src/lib/safety.test.ts`, `src/lib/ai/chunk.test.ts`,
  `src/lib/ai/output-guard.test.ts`, `src/lib/ophthalmology-subspecialty.test.ts`.
- `vitest.config.ts`, `.github/workflows/ci.yml`, `.env.example`.

**Nuevos (migraciones SQL)**

- `supabase/migrations/20260622120000_harden_rag_access.sql`.
- `supabase/migrations/20260622130000_data_retention.sql`.

**Nuevos (datos/docs)**

- `docs/knowledge-blocks/extracted/oph_import_all_blocks.sql`
- `docs/knowledge-blocks/extracted/_ALL_rag_seeds.jsonl`
- `docs/knowledge-blocks/extracted/README.md`
- `docs/ROADMAP-mejoras.md`, `docs/DESARROLLO-Ophthalmology-Radar.md` (este).

**Modificados**: `reindex.server.ts`, `rag.server.ts`, `clinical.functions.ts`,
`case.functions.ts`, `tutor.functions.ts`, `index.functions.ts`,
`editorial.functions.ts`, `safety.ts`, `reindex-evidence.ts`, rutas
`analytics`/`editorial-review`/`settings`, `package.json`, `.gitignore`.

---

## 7. Despliegue (orden recomendado)

1. **Variables de entorno** (ver `.env.example`): Supabase, `LOVABLE_API_KEY`,
   `REINDEX_WEBHOOK_SECRET` (secreto fuerte), `AI_DAILY_QUERY_LIMIT` (opcional).
   **Rotar** los secretos del `.env` original.
2. **Migraciones SQL** (aplicar en orden): las del proyecto +
   `20260622120000_harden_rag_access.sql` + `20260622130000_data_retention.sql`.
3. **Contenido clínico** (opcional, recomendado): ejecutar
   `docs/knowledge-blocks/extracted/oph_import_all_blocks.sql` en el SQL editor
   de Supabase → puebla `oph_*` como _pending_review_. **No** ejecutar los
   `*_supabase_import_v1.sql` de los ZIP (rotos).
4. **Aprobación editorial** del contenido → cambiar a `approved`/`is_active`.
5. **Indexar RAG**: `indexEvidenceCorpus` (admin) vectoriza el contenido
   aprobado con la subespecialidad ya corregida y chunking. Alternativamente
   `seedKnowledgeBlocksFn` carga las 88 monografías directo al RAG.
6. **CI**: en cada push, GitHub Actions corre `typecheck + lint + test`.

> Gobernanza: **nada** llega al usuario sin aprobación editorial/KOL. Todo lo
> ingerido entra como _pending review / inactive_.

---

## 8. Verificación

- **Tests de lógica pura: 21/21 en verde**, ejecutados con el type-stripping
  nativo de Node (`node --experimental-strip-types`) en este entorno.
- El resto (server functions con Supabase, UI) se validó por **revisión manual**
  y siguiendo patrones del propio código; **no fue posible** correr `tsc`/`eslint`
  aquí porque el registro npm estaba bloqueado (403).
- El **workflow de CI** añadido cubre justo ese hueco: `npm install + typecheck
  - lint + test` con red real. Probar también las migraciones SQL y el import en
    un Supabase de **staging** antes de producción.

---

## 9. Pendiente (no técnico / fuera de alcance del código)

- **Rellenar los 186 stubs** de catálogo como monografías reales con referencias
  → trabajo clínico/editorial humano (no se debe fabricar contenido médico).
- **DPA/residencia de datos** del proveedor de IA → decisión legal/contractual;
  evaluar redacción de PII antes de enviar a terceros.
- **Series de los gráficos** de analítica (hoy ilustrativos) → cosmético.
- **Vínculo SmPC** obligatorio en medicación activa antes de ser recuperable
  (regla del KB maestro) → enforcement opcional.

---

## 10. Ajustes tras revisión visual (deploy Lovable) + verificación real

Al recuperar acceso a `npm install`, se ejecutó el toolchain completo (no solo
revisión): se corrigieron **2 errores reales de typecheck** y se dejó todo en
verde. Sobre capturas del deploy en vivo se detectaron y arreglaron
incoherencias:

- **Modelo de IA coherente.** El gateway usaba `openai/gpt-5` mientras Settings
  mostraba `gpt-4.1-mini`. Ahora el modelo es **configurable por env
  `AI_CHAT_MODEL`** y, mejor, **persistido en BD** (`or_ai_settings`) y aplicado
  de verdad en las llamadas (`resolveChatModel`). Embeddings fijos a 1536 dims.
- **Settings deja de ser solo visual.** Migración `20260622140000_platform_settings.sql`
  (tabla singleton `or_ai_settings`, RLS de lectura editorial); server functions
  `getPlatformSettingsFn` (gated) y `savePlatformSettingsFn` (admin, zod, **merge**
  para no pisar pestañas). Pestañas **Proveedor de IA** y **Límites de uso**
  cargan/guardan valores reales.
- **Cuota diaria gobernada desde la UI.** `enforceDailyQuota` resuelve el límite
  con precedencia **BD → env → default**.
- **Disclaimer contextual.** Variante `context="catalog"` ("Estos contenidos…")
  para las vistas de listado (Evidencia, Atlas), distinta de la de respuesta.
- **Previews reales.** `preview/app/` contiene renders SSR reales de las 10
  pantallas (públicas + autenticadas vía bypass temporal del guard, revertido) con
  el CSS de producción inlineado + galería navegable.

### Verificación (this environment)
`tsc --noEmit` **0 errores** · **21/21 tests** (Vitest) · `vite build` **OK**.
Auditoría de las server functions con service-role: **todas** tras gate de rol o
scoped a `context.userId`.

### Cierre recomendado
El siguiente paso de mayor valor no es más código sino **abrir un PR** para
revisar el conjunto con el CI en verde y mergear. Trabajo restante: pestañas
Settings restantes (Seguridad/Roles/Retención) con el mismo patrón, y los puntos
no-técnicos de la sección 9.
