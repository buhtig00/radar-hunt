# Contexto para ChatGPT — Ophthalmology Radar (Intelligence Layer)

Eres un ingeniero senior que continúa un proyecto ya avanzado. Lee este contexto
completo antes de responder. No repitas trabajo ya hecho; céntrate en lo pendiente.

## Qué es el proyecto

"Ophthalmology Radar — Intelligence Layer": plataforma vertical de IA para
oftalmólogos. Stack: TanStack Start (React 19, file routes), Supabase
(Postgres + Auth + RLS), RAG sobre pgvector, embeddings y chat vía un AI Gateway
(modelo por defecto openai/gpt-5, text-embedding-3-small, 1536 dims). Salida de
IA estructurada por tool-calling. Roles: admin, medical_editor, kol,
verified_doctor, industry_user. Niveles de validación de contenido:
AI Generated → OR Reviewed → KOL Verified. Toda respuesta es "educativa /
bibliográfica" (no es producto sanitario / no MDR): nunca diagnóstico
individualizado, dosificación ni interpretación de imágenes.

## Modelo de datos clave

- RAG: `ai_knowledge_sources`, `ai_chunks` (vector 1536, índice hnsw),
  función `match_ai_chunks(query_embedding, match_count, filter_subspecialty,
filter_language)`. `ai_interactions`, `ai_feedback`, `ai_safety_events`.
- Catálogo clínico curado bilingüe (EN/ES): `oph_pathologies`, `oph_medications`,
  `oph_guidelines`, `oph_classifications`, `oph_protocols`, `oph_devices`,
  `oph_case_templates`, con enums (`oph_subspecialty`, `oph_content_status`,
  `oph_evidence_level`, etc.) y RLS. La subespecialidad en `oph_*` usa código
  enum minúscula (p.ej. `cornea`); la UI envía etiqueta TitleCase (p.ej. `Cornea`).
- Pipeline `reindex.server.ts` vectoriza evidencia estática (.ts) + tablas `oph_*`
  aprobadas hacia `ai_chunks`.

## Trabajo YA realizado (no rehacer) — rama claude/peaceful-goldberg-7j73lk

### Seguridad (P0) — completo

1. Cerrado el acceso `anon` a `ai_chunks` y `match_ai_chunks`; lectura solo con
   rol clínico verificado (`oph_has_clinical_access`). Migración
   `20260622120000_harden_rag_access.sql`.
2. Detector de seguridad unificado en un único módulo (`src/lib/safety.ts`,
   `detectSafety`/`detectPII`) usado por clinical y case server functions, con
   normalización de acentos (NFD).
3. Validación de citas anti-alucinación: se descartan las fuentes que el modelo
   devuelve y que NO están entre los chunks recuperados; se marca
   `Evidence limited`.
4. Gate de PII en servidor: bloquea el envío al LLM en análisis de casos si
   quedan datos identificables.
5. Webhook de reindex con comparación de secreto en tiempo constante.
6. `.env` añadido a `.gitignore` + `.env.example`. (Acción pendiente humana:
   rotar secretos del .env original.)

### Calidad del RAG (P1) — completo

7. Bug corregido: `buildOphDocsFromDb` guardaba subespecialidad en código enum
   minúscula y la UI filtra por etiqueta TitleCase, así que el contenido curado
   nunca se recuperaba. Solución: `ophCodeToSubspecialtyLabel`
   (`src/lib/ophthalmology-subspecialty.ts`).
8. Umbral de similitud mínima en `retrieveContext` (descarta ruido).
9. Chunking con solape (`src/lib/ai/chunk.ts`, ~1200 chars / 150 solape) integrado
   en reindex (varios `ai_chunks` por documento).
10. Recuperación cross-lingual: `retrieveContext` no filtra por idioma en SQL;
    recupera un pool mayor y reordena con un pequeño impulso al idioma del usuario
    (`SAME_LANGUAGE_BOOST`).
11. Ingesta de knowledge-blocks: seeds extraídos a `src/lib/knowledge-block-seeds.ts`
    (274 fuentes: 88 monografías reales + 186 stubs de catálogo) + server function
    admin idempotente `seedKnowledgeBlocksFn` que carga a `ai_knowledge_sources`/
    `ai_chunks` como pending_review/inactive (solo vectoriza monografías).
12. Import SQL schema-correcto a `oph_*`:
    `docs/knowledge-blocks/extracted/oph_import_all_blocks.sql` (198 filas, enums
    normalizados, casts text[]/jsonb, idempotente). IMPORTANTE: el SQL original de
    cada bloque (`*_supabase_import_v1.sql`) está ROTO contra el esquema (comillas
    dobles para literales + columnas inexistentes); no usarlo.

### Robustez y cumplimiento (P2) — completo en código

13. Retención GDPR: `purge_old_ai_data(retention_days)` + cron diario
    (`20260622130000_data_retention.sql`). Derecho de supresión self-service:
    `deleteMyAIData` (`src/lib/privacy.functions.ts`) + botón en Settings.
14. Cuotas por usuario: `enforceDailyQuota` (`src/lib/ai/quota.server.ts`,
    env `AI_DAILY_QUERY_LIMIT`, def. 100) en clinical/case/tutor; fail-open.
15. Guardarraíl de salida: `screenEducationalOutput` (`src/lib/ai/output-guard.ts`)
    marca deriva a consejo individualizado (posología/prescripción/diagnóstico
    definitivo) con `Needs specialist review`, sin reescribir contenido.
16. Circuito de feedback: `listFlaggedAIAnswers` (gated a rol editorial,
    service-role) expone respuestas con valoración negativa; panel real en
    editorial-review.
17. Analítica en vivo: `getAnalyticsKpis` agrega totales reales; 8 tarjetas KPI
    del dashboard ya muestran datos reales (gráficos siguen ilustrativos).
18. Tests + CI: Vitest con tests de lógica crítica (safety/PII, chunking,
    guardarraíl, subespecialidad) — 21 asserts verde. Workflow GitHub Actions
    `typecheck + lint + test`.

## Estado de verificación

- Tests de lógica pura ejecutados: 21/21 OK.
- No se pudo correr tsc/eslint localmente (registro npm bloqueado); el CI añadido
  lo cubre en el próximo push.

## PENDIENTE (es donde necesito tu ayuda)

A. Rellenar los 186 "stubs" de catálogo como monografías clínicas reales con
referencias verificables (AAO/EGS/TFOS/EURETINA/NICE/RCOphth/ICO). Es trabajo
de contenido clínico; necesito ayuda para estructurarlo y revisarlo, NO
inventar datos.
B. Conectar las SERIES de los gráficos de analítica (por subespecialidad, idioma,
tendencia, gaps) a datos reales de `ai_interactions`/`ai_safety_events`.
C. Enforcement opcional: exigir vínculo SmPC/ficha técnica en medicación activa
antes de que sea recuperable por el RAG.
D. Decisión legal: DPA/residencia de datos del proveedor de IA y posible
redacción de PII antes de enviar a terceros.

## Lo que NO se debe hacer

- No fabricar contenido clínico ni referencias falsas.
- No exponer contenido sin aprobación editorial/KOL (todo entra pending_review).
- No reactivar el acceso anon al corpus ni los SQL de import rotos de los bloques.

Pregunta de partida: ¿por dónde recomiendas empezar con el punto A o B, y qué
estructura/criterios propones?
