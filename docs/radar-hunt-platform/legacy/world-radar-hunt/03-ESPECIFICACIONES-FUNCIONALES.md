# World Radar Hunt — Especificaciones Funcionales (Lovable + Supabase)

**Versión 1.0** · Documento técnico para construir la plataforma multi-congreso.
Stack objetivo: **Lovable** (frontend, React/TanStack) + **Supabase** (Postgres, Auth, RLS, Edge/RPC, Realtime, Storage).

---

## 1. Principios de arquitectura

1. **Multi-tenant por congreso.** Muchas Hunts (congresos) sobre **una** liga global. Casi todas las tablas de contenido llevan `congress_edition_id`.
2. **Server-authoritative.** El cliente **nunca** decide puntos ni respuestas correctas. Toda puntuación se calcula en **RPCs transaccionales** (`SECURITY DEFINER`) con validación en servidor.
3. **Separación de monedas.** `world_points` (ranking) ≠ `radar_credits` (recompensas) ≠ `badges`. Ledgers independientes, append-only.
4. **Equidad codificada.** El World Score se calcula tomando los **5 mejores Event Scores**, normalizando por puntos disponibles y topando cada componente.
5. **Privacidad por diseño.** RLS estricta; la industria solo ve **agregados anonimizados**; datos identificables solo con consentimiento explícito.
6. **i18n + PWA + offline-friendly.** Preguntas y textos traducibles; captura offline con sincronización.

---

## 2. Modelo de datos (Supabase / Postgres)

### 2.1 Organización y congresos

```
organizations            (id, name, type[society|agency|hospital|sponsor|central], country)
congress_editions        (id, organization_id, name, slug, format[world_major|regional|satellite|digital],
                          tier[starter|congress|premium|world_major|white_label],
                          starts_at, ends_at, city, country, status[draft|live|closed],
                          theme_json, live_points_max default 200)
ambassadors              (id, congress_edition_id, user_id, role[lead|support], status)
```

### 2.2 Contenido puntuable

```
areas                    (id, key[knowledge|cases|industry|sessions|exploration|collaborative|completion],
                          weight_pct, points_max)          -- pesos maestros por defecto
stations                 (id, congress_edition_id, area_key, sponsor_org_id nullable, title, order,
                          points_max, geo_lat, geo_lng, qr_token, nfc_token)
questions                (id, station_id, type[knowledge|case|industry|survey|session|prediction],
                          difficulty[1..5], points_max, is_survey bool, i18n_json, media_url,
                          correct_option_id nullable)      -- survey => sin correcta
options                  (id, question_id, order, i18n_json, is_correct bool)
cases                    (id, congress_edition_id, title, steps_json)   -- dx→prueba→terapia→seguimiento
```

### 2.3 Jugadores, equipos y participaciones

```
players                  (id, user_id, display_name, country, league[residents|specialists|experts|industry],
                          credential_status[pending|verified|rejected], is_industry bool)
teams                    (id, name, type[hospital|clinic|university|society|event], country)
team_members             (player_id, team_id, role)
participations           (id, player_id, congress_edition_id, mode[onsite|remote|hybrid],
                          started_at, finished_at, status)
answers                  (id, participation_id, question_id, option_id nullable, value_json,
                          awarded_points, correct bool, answered_at, token_used, device_fingerprint)
```

### 2.4 Puntuaciones (todas derivadas por RPC)

```
event_scores             (id, participation_id, player_id, congress_edition_id,
                          raw_points, points_available, event_score[0..1000],  -- normalizado
                          science_pct, live_points, computed_at)
world_scores             (player_id, season_id,
                          best5_points,           -- suma de 5 mejores event_score (máx 5000)
                          global_points,          -- retos globales (máx 1000)
                          regularity_points,      -- (máx 500)
                          team_points,            -- (máx 500)
                          world_score,            -- total (máx 7000)
                          updated_at)
global_challenges        (id, season_id, key, title_i18n, points_max default 100, opens_at, closes_at)
global_challenge_results (player_id, global_challenge_id, points, completed_at)
regularity_months        (player_id, season_id, year_month)   -- unique(player, year_month), máx 5 cuentan
seasons                  (id, name, starts_at, ends_at, is_current)
```

### 2.5 Recompensas y reconocimiento

```
world_points_ledger      (id, player_id, delta, reason, source_ref, created_at)   -- append-only
radar_credits_ledger     (id, player_id, delta, reason, congress_edition_id nullable, expires_at, created_at)
badges                   (id, key, name_i18n)               -- Retina Master, ... Radar Legend
player_badges            (player_id, badge_id, awarded_at)
prizes                   (id, scope[congress|world], congress_edition_id nullable, title, kind, criteria_json)
prize_awards             (id, prize_id, player_id nullable, team_id nullable, awarded_at)
```

### 2.6 Industria e insights

```
sponsors                 (id, organization_id, congress_edition_id, station_id, plan)
sponsor_insights_mv      (materialized view por sponsor: participants, profile buckets, countries,
                          specialties, completion_rate, anonymized_answers_json, benchmarks)
consents                 (id, player_id, sponsor_id, scope, granted bool, granted_at)  -- datos identificables
```

### 2.7 Antifraude y auditoría

```
qr_tokens                (id, station_id, token, single_use bool, expires_at, used_by nullable)
audit_log                (id, actor, action, entity, entity_id, meta_json, created_at)
fraud_flags              (id, player_id, participation_id, kind, severity, resolved bool, notes)
```

---

## 3. Motor de puntuación (RPCs, `SECURITY DEFINER`)

Toda escritura de puntos pasa por estas funciones; el cliente solo envía respuestas.

1. **`answer_question(participation_id, question_id, option_id|value)`**
   - Valida token/QR (un solo uso, no expirado), límite de intentos, ventana de tiempo.
   - Calcula `awarded_points` (acierto × dificultad para knowledge/case; participación para survey/industry).
   - Inserta en `answers` de forma idempotente. Registra `device_fingerprint`.

2. **`compute_event_score(participation_id)`**
   - Suma puntos válidos por área, aplica **techos por área** (400/200/150/100/75/50/25).
   - `points_available` = suma de máximos realmente ofrecidos en esa Hunt.
   - **Normaliza:** `event_score = raw_points ÷ points_available × 1000`.
   - Verifica **garantía científica**: `science_pct = (knowledge+cases) ÷ raw ≥ 0.60` (marca aviso si la Hunt no cumple el diseño).
   - `live_points` se acumulan aparte (máx 200) y **no** entran en `event_score`.

3. **`recompute_world_score(player_id, season_id)`** (idempotente; se dispara tras cada `compute_event_score`, reto global o cambio de equipo)
   - `best5_points = Σ top5(event_score)` (máx 5.000).
   - `global_points = min(1000, Σ global_challenge_results)`.
   - `regularity_points = min(5, count(distinct regularity_months)) × 100` (máx 500).
   - `team_points` = aporte de retos de hospital/equipo (máx 500).
   - `world_score = best5 + global + regularity + team` (máx 7.000).

4. **`compute_team_score(team_id, season_id)`**
   - **No** es la suma de miembros. Usa: promedio de los **5 mejores** jugadores del centro, % de participación, precisión científica, retos colectivos y diversidad de categorías.

5. **`award_radar_credits(player_id, delta, reason, congress_edition_id, expires_at)`**
   - Independiente del resultado científico; respeta **límite por congreso** y **caducidad**.

6. **`grant_badge(player_id, badge_key)`** — idempotente.

Todas registran en `audit_log`. Los recomputes usan bloqueo por fila para evitar condiciones de carrera.

---

## 4. Seguridad y RLS

- **Auth:** Supabase Auth. Verificación de **acreditación sanitaria** obliga `credential_status = verified` para competir por premios clínicos; industria en su propia liga.
- **Una cuenta por profesional** (unicidad por credencial + email; detección de duplicados).
- **RLS por rol y tenant:**
  - *Jugador* → ve solo sus `participations`, `answers`, sus ledgers y los rankings públicos.
  - *Ambassador* → lee/gestiona su `congress_edition_id` (estaciones, tokens, incidencias), sin acceso a datos personales de otros congresos.
  - *Sponsor* → **solo** su `sponsor_insights_mv` (agregado/anonimizado); nunca `answers` crudas ni identidad, salvo `consents.granted = true`.
  - *Equipo central* → administración global; acceso a antifraude y auditoría.
- **World Points / RP:** ledgers append-only; sin `UPDATE/DELETE` desde cliente; solo vía RPC.

---

## 5. Antifraude (implementación)

- QR **dinámicos** + `qr_tokens` de un solo uso con expiración.
- Preguntas **aleatorizadas** por participante; **límite de intentos**.
- Control de **tiempos anómalos** y **fingerprint** de dispositivo (bloqueo de duplicados).
- **Geolocalización solo para validar Live Points** (nunca para bloquear la participación online).
- Detección de ubicaciones incompatibles; `fraud_flags`.
- **Revisión manual de los primeros clasificados** y **auditoría de ganadores**; anulación de puntos y bloqueo temporal/definitivo.

---

## 6. Desempates (orden aplicado por la query de ranking)

1. `science_points` desc → 2. `case_points` desc → 3. nº de congresos con `event_score > 800` desc → 4. precisión en retos globales desc → 5. respuestas incorrectas asc → 6. posición compartida / reto final.

La **velocidad no es criterio principal** (equidad idiomática).

---

## 7. Pantallas / rutas (Lovable)

### App del participante (PWA)
- `/` onboarding + verificación de acreditación + selección de liga.
- `/hunt/:slug` mapa de la Hunt (estaciones por planta / mapa digital), estados de misión.
- `/hunt/:slug/scan` escaneo QR/NFC (con código manual de respaldo).
- `/station/:id` preguntas / caso / encuesta con feedback inmediato y explicación.
- `/challenges` retos globales de temporada.
- `/me` perfil, badges, RP, Event Scores y World Score.
- `/rankings` local/nacional/continental/mundial + por hospital, liga y subespecialidad.

### Panel del embajador (`/ambassador/:congress`)
- Estado de estaciones, activación de QR/NFC, incidencias, subida de fotos/vídeos, verificación de premios locales.

### Panel del congreso / admin (`/admin/:congress`)
- Editor de mapa y estaciones, banco de preguntas/casos, patrocinadores, premios, ranking en directo (**Live Pulse** vía Realtime), panel de datos, exportaciones.

### Panel del patrocinador (`/sponsor/:id`)
- **Solo insights agregados**: participantes, perfiles, países, especialidades, tasa de finalización, comparativas globales, informe descargable.

### Consola central (`/central`)
- Ranking mundial, temporadas, validación de preguntas, gestión de recompensas, antifraude/auditoría, informes globales.

---

## 8. Realtime y contenido

- **Live Pulse / ranking en directo:** canales Supabase Realtime por `congress_edition_id`.
- **Storage:** media de preguntas, cartelería, shareables generados por el embajador.
- **Shareables:** tarjetas de resultado por jugador/hospital (imagen) para redes.

---

## 9. Configuración maestra (defaults, parametrizables por Hunt)

| Parámetro | Valor por defecto |
| --- | --- |
| Event Score máximo | 1.000 |
| Pesos por área | 400 / 200 / 150 / 100 / 75 / 50 / 25 |
| Ciencia mínima | ≥ 60 % (knowledge + cases) |
| Live Points máx | 200 (no computa al mundial) |
| Mejores congresos que cuentan | 5 |
| Retos globales / temporada | 10 × 100 (máx 1.000) |
| Regularidad | 5 meses × 100 (máx 500) |
| Retos de equipo | máx 500 |
| **World Score máximo** | **7.000** |

Estos valores viven en `areas` y en una tabla `season_config` para poder ajustarlos sin tocar código.

---

## 10. Roadmap de implementación

1. **Núcleo multi-tenant:** organizations, congress_editions, stations, questions, players, participations, answers + RLS.
2. **Motor de puntuación:** RPCs `answer_question`, `compute_event_score` (con normalización), `recompute_world_score`.
3. **App participante (PWA):** onboarding, mapa, scan, estación, perfil, rankings.
4. **Panel embajador + kit de activación** (QR/NFC dinámicos, incidencias, media).
5. **Retos globales + regularidad + equipos** (`compute_team_score`).
6. **Recompensas:** RP (límites/caducidad), badges, premios.
7. **Insights de industria** (materialized views + consents) y panel de patrocinador.
8. **Antifraude + auditoría + desempates + Live Pulse (Realtime).**
9. **Consola central + informes globales + White Label.**

---

## Apéndice A — Entidades de las mecánicas de experiencia

Extensiones para el [Diseño de Experiencia (doc 04)](04-EXPERIENCIA-E-IDENTIDAD.md). Mismas reglas: **server-authoritative**, RLS por tenant/rol, agregación anonimizada. Ninguna de estas tablas permite comprar posición mundial.

```
-- Identidad y narrativa
passports              (player_id, level, science_accuracy, seasons_json, updated_at)
passport_seals         (id, player_id, congress_edition_id, seal_key, mode[onsite|digital], awarded_at)
territories            (id, season_id, key[retina|cornea|glaucoma|orbit|anterior|neuro|inflammation|pediatric|innovation|surgical], color)
territory_progress     (season_id, territory_id, points_contributed, completion_pct)      -- World Vision Map
season_themes          (season_id, name, concept_i18n, visual_json)

-- El contenido como aventura
world_case_chapters    (id, season_id, congress_edition_id, order, unlock_kind, content_json)
world_case_answers     (player_id, season_id, dx, differential, plan, therapy, prevention, prognosis, score)
boss_battles           (id, congress_edition_id, kol_user_id, title, difficulty)
boss_battle_phases     (id, boss_battle_id, order, kind[id|tests|differential|decision|complication], rubric_json)
kol_secret_missions    (id, congress_edition_id, kol_user_id, hint_json, reward_kind)
branching_nodes        (id, question_id, decision_id, next_node_id, quality_json)          -- seguridad/evidencia/eficiencia...

-- Progresión
routes                 (id, key[surgical|clinical|imaging|innovation|research|leadership|young], name_i18n)
player_routes          (player_id, route_id, is_primary)
skill_tree_nodes       (id, route_id, key, parent_id)
player_skills          (player_id, skill_node_id, level[explorer|practitioner|advanced|expert|master])
collections            (id, key[anatomy|instruments|great_cases], name_i18n)
collection_items       (id, collection_id, key, name_i18n)
player_items           (player_id, collection_item_id, awarded_at)
radar_capsules         (id, player_id, unlock_reason, contents_json, opened_at)

-- Competición y comunidad
guilds                 (team_id, crest_url, captains_json, history_json)                   -- extiende teams
continent_duels        (id, season_id, region_a, region_b, metric_json, result_json)
predictions            (id, session_ref, prompt_i18n, opens_at, closes_at)
foresight_scores       (player_id, season_id, calibration, points)
flash_missions         (id, congress_edition_id, opens_at, closes_at, cap_players, digital_window_json)
mystery_missions       (id, congress_edition_id, unlock_condition_json, contents_json, rarity)
community_case_subs    (id, author_user_id, anonymized_json, status[submitted|review|accepted|published], reviewer)

-- Datos e impacto
pulse_snapshots        (id, congress_edition_id, question_ref, buckets_json, captured_at)  -- Radar Pulse en directo
impact_meter           (season_id, science_points_total, unlocked_actions_json)            -- Global Vision Impact
```

**Notas de integración**
- `passport_seals.mode = onsite` puede llevar animación especial pero **no** World Points extra.
- `boss_battle_phases.rubric_json` y `branching_nodes.quality_json` implementan la **puntuación por calidad** (corrección, seguridad, evidencia, eficiencia, recursos, experiencia del paciente, riesgos) — alimentan el Event Score dentro de sus áreas y techos.
- `pulse_snapshots` y `sponsor_insights_mv` comparten pipeline de anonimización; los `predictions`/`foresight_scores` no tienen relación con apuestas ni dinero.
- `flash_missions.digital_window_json` garantiza ventana equivalente para participantes remotos.
- `community_case_subs` y `kol_secret_missions` requieren **revisión del comité** antes de publicarse (antifraude de contenido).

---

*Documento vivo. Los valores de puntuación y pesos son fieles al Reglamento Oficial v1.0 y deben mantenerse sincronizados con él.*
