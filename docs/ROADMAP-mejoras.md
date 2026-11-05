# Ophthalmology Radar — Intelligence Layer · Hoja de ruta de mejoras

Análisis del paquete _Ophtha Insight Layer_ y plan de mejora priorizado
(P0 crítico → P2 robustez). Marcadas con ✅ las ya implementadas en esta rama.

## Estado actual (fortalezas)

- Arquitectura limpia: TanStack Start + server functions con middleware de auth,
  Supabase server/cliente separados, RAG sobre pgvector (`match_ai_chunks`),
  salida estructurada vía tool-calling.
- Esquema clínico bilingüe muy completo (`oph_*`), estados de aprobación y RLS.
- Gobernanza editorial: roles, niveles de validación (AI Generated → OR Reviewed
  → KOL Verified), disclaimer educativo único.
- Capa de seguridad: detección de urgencias ES/EN + PII, `ai_safety_events`,
  reindex con _quality report_.

---

## 🔴 P0 — Seguridad y exposición de datos

- ✅ **Corpus RAG legible por `anon`.** `ai_chunks` y `match_ai_chunks` estaban
  concedidos a `anon`. Migración `20260622120000_harden_rag_access.sql`: se retira
  `anon` y se exige rol clínico verificado (`oph_has_clinical_access`). La app no
  se ve afectada (la recuperación real va por `service_role` en servidor).
- ✅ **Detectores de seguridad divergentes.** El backend usaba un detector inline
  débil (12 términos). Unificado: `clinical.functions.ts` y `case.functions.ts`
  ahora importan `detectSafety` de `src/lib/safety.ts` (el detector rico), con
  normalización de acentos (NFD) para no perder variantes sin tilde.
- ✅ **Sin verificación de citas (alucinación de fuentes).** Se filtran las
  `sources_used`/`bibliography` contra los `source_id` realmente recuperados;
  las citas inventadas se descartan y se marca `Evidence limited`.
- ✅ **Webhook de reindex con comparación insegura.** `!==` sustituido por
  comparación en tiempo constante (`crypto.timingSafeEqual`).
- ✅ **`.env` no estaba en `.gitignore`.** Añadida regla + `.env.example` sin
  secretos. **Acción pendiente del equipo:** rotar cualquier secreto que haya
  estado expuesto.
- ✅ **PII solo avisaba en cliente.** Añadido gate de PII en servidor
  (`case.functions.ts`): si quedan datos identificables, se **bloquea** el envío
  al LLM antes de que el texto salga al proveedor.

## 🟠 P1 — Calidad clínica y circuito de conocimiento

- ✅ **Sin umbral de similitud.** `retrieveContext` ahora descarta chunks por
  debajo de `DEFAULT_MIN_SIMILARITY` (0.2) y se marca evidencia limitada cuando
  no hay contexto.
- ✅ **Ingestión del conocimiento clínico curado.** `reindex.server.ts` ya
  construye documentos desde las tablas `oph_*` aprobadas (`buildOphDocsFromDb`)
  y los mezcla con los `.ts` de evidencia antes de vectorizar.
- ✅ **Bug: subespecialidad invisible en RAG.** `buildOphDocsFromDb` guardaba el
  código enum en minúscula (`cornea`) mientras la UI filtra por etiqueta
  (`Cornea`); el contenido curado nunca se recuperaba. Corregido con
  `ophCodeToSubspecialtyLabel` (`src/lib/ophthalmology-subspecialty.ts`).
- ✅ **Chunking con solape.** Nuevo `src/lib/ai/chunk.ts`; `reindex` ahora trocea
  los documentos largos en varios `ai_chunks` (antes 1 doc = 1 chunk).
- ✅ **Ingesta de los knowledge-blocks.** Seeds extraídos a
  `src/lib/knowledge-block-seeds.ts` (274: 88 monografías + 186 stubs) y
  `seedKnowledgeBlocksFn` (admin, idempotente) los carga en
  `ai_knowledge_sources`/`ai_chunks` como _pending review_. El SQL de import de
  los bloques está roto contra el esquema (documentado en
  `docs/knowledge-blocks/extracted/README.md`).
- ✅ **Import schema-correcto de los CSV a `oph_*`.**
  `docs/knowledge-blocks/extracted/oph_import_all_blocks.sql` (198 filas, generado
  contra el esquema real, con enums normalizados y casts `text[]`/`jsonb`,
  idempotente y transaccional) sustituye al SQL roto de los bloques. ⏳ Pendiente:
  rellenar los stubs title-only (usan otro layout de CSV) como monografías reales.
- ✅ **Recuperación cross-lingual.** `retrieveContext` ya no filtra por idioma en
  SQL: recupera un pool más amplio y reordena en memoria con un pequeño impulso
  al idioma del usuario (`SAME_LANGUAGE_BOOST`), de modo que una consulta ES
  puede traer guías AAO/EGS en inglés sin perder la preferencia de idioma.
- ◑ **Urgencia.** La UI ya muestra un aviso destacado y el `SafetyNoticeBanner`
  que derivan a evaluación presencial inmediata. No se bloquea la respuesta
  educativa de forma intencional (coherencia con el encuadre educativo del
  producto). Pendiente si se desea: interstitial bloqueante opcional.
- ⏳ **Cobertura de contenido.** Sembrar 50 plantillas de caso/subespecialidad y
  exigir vínculo SmPC en medicación activa antes de ser recuperable.

## 🟡 P2 — Robustez, cumplimiento y operación

- ✅ **GDPR / retención.** Migración `20260622130000_data_retention.sql`: función
  `purge_old_ai_data(retention_days)` que borra `ai_interactions` antiguas
  (cascada a `ai_feedback`) y redacta `query_excerpt`/`matched_terms` de
  `ai_safety_events`, programada a diario vía `pg_cron` (con guarda si la
  extensión no existe). **Derecho de supresión**: `deleteMyAIData`
  (`src/lib/privacy.functions.ts`) borra los datos de IA del propio usuario
  (scoped a `context.userId`), con botón en Settings → Retención de datos.
- ✅ **Límites de uso / cuotas** por usuario. `enforceDailyQuota`
  (`src/lib/ai/quota.server.ts`) cuenta las interacciones del día en
  `ai_interactions` y corta antes del embedding/LLM al superar
  `AI_DAILY_QUERY_LIMIT` (def. 100). Aplicado en IA clínica, casos y tutor.
  Fail-open ante error de DB.
- ⏳ **DPA/residencia** del proveedor IA; redacción de PII antes de enviar.
- ✅ **Circuito de feedback.** `listFlaggedAIAnswers` (server, gated a rol
  editorial, lee cross-user con service-role) expone las respuestas con
  valoración negativa (`not_useful/needs_kol/incomplete/error`) y se muestran en
  la pestaña "Respuestas de IA" de `editorial-review` (`FlaggedAnswersPanel`).
  El feedback negativo es, en sí, la señal de encolado.
- ✅ **Tests + CI.** Vitest con tests de la lógica crítica pura: detectores de
  seguridad/PII (`safety.test.ts`), chunking (`chunk.test.ts`), guardarraíl de
  salida (`output-guard.test.ts`) y canonicalización de subespecialidad
  (`ophthalmology-subspecialty.test.ts`). Workflow `.github/workflows/ci.yml`
  ejecuta typecheck + lint + test en cada push/PR. (21 aserciones verificadas en
  verde con el type-stripping nativo de Node.)
- ✅ **Guardarraíl de salida** post-generación (`src/lib/ai/output-guard.ts`):
  `screenEducationalOutput` detecta deriva a consejo individualizado (posología,
  prescripción, diagnóstico definitivo) y marca la respuesta con
  `Needs specialist review` para revisión editorial/KOL, sin reescribir el
  contenido. Aplicado en IA clínica y casos.
- ⏳ **Auditoría inmutable** de transiciones de estado de contenido.
- ✅ **Analítica en vivo (KPIs).** `getAnalyticsKpis`
  (`src/lib/analytics.functions.ts`, gated a rol editorial) agrega totales reales
  de `ai_interactions`/`ai_safety_events`/`ai_feedback`/`ai_knowledge_sources`;
  las 8 tarjetas KPI del dashboard de Analítica los muestran. ⏳ Pendiente:
  conectar también las series de los gráficos (hoy ilustrativos).

---

## 🔵 Ajustes tras revisión visual del deploy + verificación real

- ✅ **Modelo de IA coherente y persistido.** El gateway usaba `openai/gpt-5`
  mientras Settings mostraba `gpt-4.1-mini`. Ahora: env `AI_CHAT_MODEL` +
  persistencia en `or_ai_settings` + `resolveChatModel` aplicado en las llamadas.
- ✅ **Settings persistente (no solo visual).** Migración
  `20260622140000_platform_settings.sql` + `get/savePlatformSettingsFn` (merge,
  gated). Pestañas Proveedor de IA y Límites de uso cargan/guardan real.
- ✅ **Cuota diaria desde la UI.** `enforceDailyQuota` resuelve BD → env → default.
- ✅ **Disclaimer contextual** (`context="catalog"`) en Evidencia y Atlas.
- ✅ **Previews SSR reales** de las 10 pantallas en `preview/app/` + galería.
- ✅ **Toolchain verde de verdad** (`npm install` recuperado): `tsc` 0 errores,
  21/21 tests, `vite build` OK. 2 errores de typecheck reales corregidos.
- ⏳ Pendiente menor: enviar temperatura/tokens al gateway (validar en vivo);
  persistir pestañas Seguridad/Roles/Retención con el mismo patrón.

---

## Implementado en esta rama (`claude/peaceful-goldberg-7j73lk`)

1. Migración `20260622120000_harden_rag_access.sql` (cierre de acceso anon al RAG).
2. `src/lib/safety.ts`: normalización NFD + helper `normalizeForMatch`.
3. `src/lib/ai/rag.server.ts`: umbral de similitud + `retrievedSourceIds`.
4. `src/lib/ai/clinical.functions.ts`: detector unificado + validación de citas.
5. `src/lib/ai/case.functions.ts`: detector unificado + gate PII servidor +
   validación de citas.
6. `src/routes/api/public/hooks/reindex-evidence.ts`: comparación en tiempo
   constante.
7. `.gitignore` + `.env.example`.
