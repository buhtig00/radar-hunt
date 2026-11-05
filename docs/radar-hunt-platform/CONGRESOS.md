# Radar Hunt: modo congreso (pilar 3), producto mínimo v1

Experiencia para jugar **dentro de un congreso**:

- **estaciones** repartidas por la sede, que se desbloquean escaneando su QR y tienen un reto de hasta 5 preguntas;
- **sesiones en directo**, donde el moderador lanza retos y encuestas de sala y la gente responde desde el móvil;
- **pantalla de sala** para el proyector;
- **clasificación del congreso**, individual y por centros;
- **valoración** del congreso.

Rutas (en español):

| Ruta                                     | Para quién   | Qué hace                                                                                                                                                                                                                         |
| ---------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/radar-hunt/congresos`                  | Todos        | Congresos publicados. La organización puede crear uno en borrador                                                                                                                                                                |
| `/radar-hunt/congresos/{slug}`           | Participante | Inscripción con consentimientos separados, plano por plantas, estaciones, directo, clasificación, valoración, bases y privacidad                                                                                                 |
| `/radar-hunt/congresos/{slug}/escanear`  | Participante | Cámara (BarcodeDetector nativo o jsQR) o código manual de 8 caracteres                                                                                                                                                           |
| `/radar-hunt/congresos/{slug}/e/{token}` | Participante | Destino del QR impreso: acredita la visita y abre el reto                                                                                                                                                                        |
| `/radar-hunt/jugar/cs:{estación}`        | Participante | El reto de la estación: **mismo motor que las ligas** (tiempo medido en el servidor, orden de opciones propio, explicación con referencia)                                                                                       |
| `/radar-hunt/congresos/{slug}/admin`     | Organización | Resumen y KPIs, estaciones (colocación en el plano, preguntas del banco, patrocinio con transparencia, rotación del QR), sesiones en directo (editor y consola del moderador), participantes, exportación CSV y datos del evento |
| `/radar-hunt/congresos/{slug}/qr`        | Organización | Pósteres imprimibles: QR + código manual por estación                                                                                                                                                                            |
| `/sala/{slug}`                           | Proyector    | Pantalla completa: pregunta en curso, cuenta atrás, recuento, revelación con referencia, top 10, QR de acceso y transparencia de patrocinio                                                                                      |

## Reglas de diseño (y de dónde salen)

- **El contenido es editorial.**
  - Las estaciones y los retos de sala solo usan preguntas del banco.
  - En producción se exige `approved`, nivel `or_reviewed` o `kol_verified` y al menos una referencia (`isPlayableInCompetition`).
  - Los patrocinadores no eligen ni revisan preguntas. Su estación muestra siempre un texto de transparencia fijo.
- **Sin premios en metálico, sorteos ni regalos de valor.**
  - Política de reconocimiento por defecto: diploma digital y mención en la clausura.
  - **Pendiente de revisión legal** (Farmaindustria, EFPIA, MedTech Europe).
- **Consentimientos separados** al inscribirse:
  - participación (obligatorio);
  - aparecer en la clasificación pública (opcional; si no, «Participante anónimo»);
  - comunicaciones de Ophthalmology Radar (opcional).
  - **Nunca** se ceden datos a patrocinadores.
- **Sin geolocalización.** La presencia se acredita con el QR, cuyos tokens son:
  - aleatorios, de 100 bits;
  - rotables;
  - invisibles para el cliente (RLS).
- **Encuestas de sala ≠ estudios de mercado.**
  - No dan puntos.
  - Se muestran agregadas.
  - Si un dato debe llegar a la industria, se hace como estudio del pilar 4, con su propio consentimiento.
- **El servidor tiene la autoridad:**
  - la fase en directo (`rh_live_state`) es la única fuente de verdad;
  - la pregunta solo se entrega con el ítem abierto;
  - la correcta solo se ve al revelar;
  - el tiempo se mide desde la apertura con el reloj del servidor;
  - cada persona responde una sola vez por ítem;
  - el ítem se cierra solo al agotarse el tiempo.
- **Clasificación del congreso** (Live Score): no computa en las ligas.
  - Puntuación = retos de estación + retos de sala.
  - Desempate: aciertos y luego tiempo.
  - **Centros:** media de sus 5 mejores puntuaciones, con un mínimo de 3 participantes (para no premiar solo el tamaño ni exponer a una persona).
- **Exportaciones:**
  - quedan en la auditoría (`rh_audit_log`);
  - las valoraciones salen sin identificar y en orden aleatorio;
  - el CSV es para Excel en español (`;`, BOM UTF-8, protección contra fórmulas).

## Arquitectura

Mismo patrón que el juego: **un núcleo, dos repositorios**.

```
src/lib/radar-hunt/congress/
  types.ts            dominio y vistas
  core.ts             lógica (inscripción, escaneo, directo, sala, organización, exportación)
  ranking.ts          clasificación individual y por centros, recuentos
  tokens.ts           tokens QR, código manual, interpretación de lo escaneado
  csv.ts              exportación
  repo-memory.ts      repositorio en memoria (demo y tests)
  demo.ts             congreso FICTICIO de demostración + participantes demo que responden en directo
  repo-supabase.server.ts   repositorio de producción (service_role, solo servidor)
  congress.functions.ts     funciones de servidor (auth + roles + zod)
  service.ts          fachada demo/producción (misma regla RH_MODE que el juego)
  hooks.ts            React Query (directo por sondeo de 1–1,5 s; sincronización entre pestañas en la demo)
supabase/migrations/20261105090000_radar_hunt_congress.sql   11 tablas rh_*, RLS, Realtime de la fase
```

El reto de estación reutiliza el **núcleo del juego** con un tipo de ronda nuevo (`congress_station`). El juego solo deja empezarlo si existe la visita, es decir, si se ha escaneado el QR (`GameRepo.hasRoundAccess`).

**Organización:** `admin` o `medical_editor` (global), o personal del evento (`rh_event_staff`: `moderator` u `organizer`).

## Demo

Sin Supabase (o con `VITE_RH_DEMO=true`):

- hay un **«Congreso Demo de Oftalmología»** ficticio, con sus fechas siempre alrededor de hoy;
- tiene 6 estaciones en 2 plantas y 2 sesiones (retos y encuesta);
- 18 «participantes demo» responden en directo a lo largo del tiempo de cada pregunta.

Para verlo como en el congreso:

1. Abre la **pantalla de sala** en una pestaña.
2. Abre **Organización → Sesiones en directo** en otra y lanza las preguntas.
3. Responde desde la página del congreso en una tercera.

Las pestañas se sincronizan solas. Para la organización, deja el rol en Administrador (barra superior).

## Verificación (4 nov 2026)

- **Tests:** 16 nuevos en `congress.test.ts` y 71/71 en total. Cubren:
  - tokens y códigos;
  - CSV;
  - clasificación y centros;
  - consentimiento;
  - inscripción y escaneo obligatorios;
  - QR rotado;
  - ventana de juego;
  - solo preguntas validadas en producción;
  - transparencia del patrocinio;
  - anonimato;
  - no entrega antes de abrir;
  - tiempo del servidor;
  - una respuesta por persona;
  - cierre automático;
  - revelación;
  - encuesta sin puntos;
  - moderación solo por la organización;
  - valoración única;
  - exportación sin identificar.
- **Migración:** aplicada dos veces en Postgres 16 (idempotente). Las pruebas de RLS están en `supabase/tests/radar_hunt_congress_rls.sql`:
  - anónimo: ve el evento publicado y sus estaciones, no los tokens;
  - participante: ve solo lo suyo y no puede escribir;
  - moderador: ve su borrador;
  - admin: no ve las respuestas ajenas;
  - las restricciones de consentimiento, respuesta única, formato del token y rangos funcionan.
- **E2E con Playwright**, 0 errores de consola:
  - listado;
  - inscripción con el botón bloqueado sin consentimiento;
  - código erróneo y luego el bueno;
  - reto de estación;
  - vuelta al congreso;
  - directo en 3 pestañas (sala, moderación y participante) con lanzar, responder y revelar;
  - encuesta;
  - clasificación individual y por centros;
  - valoración;
  - CSV con BOM;
  - edición de estación en el plano;
  - nueva sesión;
  - acceso denegado a no organizadores;
  - móvil sin desplazamiento horizontal.

## Pendiente

1. **Probar contra un Supabase real**, igual que el resto de funciones de servidor:
   - aplicar la migración y regenerar los tipos;
   - dar de alta el personal del evento en `rh_event_staff`.
2. **Realtime:** la tabla `rh_live_state` ya está publicada, pero la interfaz usa sondeo de 1–1,5 s. Para más de unos cientos de personas por sala hay que:
   - pasar a una suscripción por canal;
   - hacer una prueba de carga (k6) con el patrón real.

   Objetivo de la arquitectura: 2.000 participantes, y de 300 a 800 respuestas en 20 s.

3. **Banco validado:** sin preguntas aprobadas por KOL no hay estaciones jugables en producción.
4. **Revisión legal** de las bases, la privacidad y la política de reconocimiento (los textos actuales son provisionales).
5. **Planos de la sede:** subir una imagen con derechos de uso por planta (URL en «Evento»).
6. **Edición de salas y planos** desde la interfaz. Hoy se editan la URL del plano y los nombres de las plantas; las salas del esquema vienen en los datos.

## Demo estática (sin servidor)

Para enseñar la demo sin desplegar nada, existe una versión solo de navegador:

```bash
RH_STATIC_OUT=dist-static npx vite build -c scripts/radar-hunt/static-demo/vite.config.ts
```

**Cómo funciona:**
- Las funciones de servidor y los módulos `*.server` se sustituyen por versiones vacías que no hacen nada.
- La navegación va en memoria.
- Se puede entrar por atajos en la URL: `#ojo`, `#ligas`, `#boss`, `#congreso`, `#organizacion`, `#sala`.
- Los vídeos se cargan con ruta relativa.

**Límites cuando se publica como artefacto de claude.ai:**
- no hay cámara: el código de la estación se escribe a mano;
- no se puede imprimir ni descargar CSV;
- no aparecen los cuadros de confirmación, así que no se puede borrar.

## Contenido de los Hunts: matriz de 8 estaciones por perfil

Se ha importado el documento **«Radar Hunt Palma 2026 — Matriz 8 estaciones por perfil — Sin ZEISS + relleno científico de patologías» (21/09/2026)**.

**Qué se ha importado**
- **23 estaciones científicas y 182 preguntas cerradas**, en `src/lib/radar-hunt/seed-hunt-matrix.ts`.
- El fichero lo genera `scripts/radar-hunt/import-hunt-matrix.py` y no se edita a mano.
- La semilla SQL es `supabase/seed/radar_hunt_hunt_matrix.sql`, generada con `scripts/radar-hunt/generate-hunt-seed.ts`.

**Recorridos (perfiles de liga), con sus estaciones científicas**

| Recorrido | Estaciones científicas |
|---|---|
| Oftalmología general / residentes | GEN-01, GEN-02 |
| Segmento anterior | ANT-01, ANT-02 |
| Retina | RET-01 a RET-03 |
| Glaucoma | GLA-01 a GLA-05 |
| Neuro + Pediatría | PED-01 a PED-03 y NEU-01 a NEU-03 |
| Oculoplastia + Órbita | OCP-01 a OCP-05 |

- Cada estación tiene un campo `track` (migración `20261107090000_radar_hunt_tracks.sql`).
- En la página del congreso, el participante filtra por su recorrido.

**Estructura de cada estación**
- **Q1–Q5 (RADARS)** forman el reto de la estación, que puntúa.
- **Q6–Q8 (Science XP)** se usan para profundizar: práctica libre y retos en sala.

**Lo que no se ha importado**
- **Las estaciones de marca** de la matriz (25 huecos): la organización las crea con su acuerdo y su texto de transparencia, y con preguntas del banco editorial.
- **Dos preguntas de ordenar** (GEN-02 Q7 y ANT-01 Q8), porque el motor aún no admite ese formato.
- **La capa de «market intelligence»** (Insight Pulse), que va aparte, en el pilar 4.

**Estado**
- Todo es **contenido candidato**: `pending_review`, sin explicación ni referencia. No es jugable en competición hasta la validación Medical/KOL, que debe añadir la explicación y al menos una referencia por pregunta.
- En la demo se juega con el aviso de «pendiente de validación».
- La respuesta correcta está repartida casi por igual entre A, B, C y D (46/46/45/45).
