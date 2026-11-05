# Radar Hunt: implementación v1 (4 nov 2026)

Se ha construido sobre el motor existente de Ophthalmology Radar, sin reescribirlo. Rutas nuevas bajo `/radar-hunt`, en español.

## Qué incluye

| Área | Ruta | Estado |
|---|---|---|
| Inicio | `/radar-hunt` | ✅ |
| **Eye Universe 3D** | `/radar-hunt/eye` | ✅ |
| **Ligas** | `/radar-hunt/ligas` y `/radar-hunt/ligas/$leagueId` | ✅ |
| **Juego** | `/radar-hunt/jugar/$roundId` | ✅ |
| **Retos BOSS** | `/radar-hunt/boss` | ✅ |
| **Mi perfil** (verificación + competencias) | `/radar-hunt/perfil` | ✅ |
| **Verificaciones** (cola de revisión, solo admin/editor) | `/radar-hunt/verificaciones` | ✅ |
| **Congresos en directo** (estaciones QR, directo en sala, pantalla de sala, organización) | `/radar-hunt/congresos`, `/sala/{slug}` | ✅ v1 (ver [`CONGRESOS.md`](./CONGRESOS.md)) |
| Inteligencia de mercado | — | Pendiente (fase 4; requiere visto bueno legal) |

### Eye Universe 3D
- **Modelo:** ojo derecho procedural en three.js, a escala real (mm), con las mismas medidas que la película y S02Z:
  - córnea R 7,8/6,5 mm y 0,55 mm de grosor;
  - cámara anterior de 3 mm;
  - cristalino 3,60 → 4,05 mm con el perfil S02Z;
  - zónula, cuerpo ciliar, iris con collarete y criptas, y reflejo rojo coaxial;
  - vítreo, retina, mácula con gradación, fóvea, disco nasal a 4,5 mm con excavación, arcadas vasculares, coroides, esclera y nervio óptico.
- **Interacción:**
  - 8 vistas: frontal, córnea, iris, corte sagital, cristalino, fondo de ojo, fóvea y polo posterior;
  - corte sagital;
  - selección de estructuras con clic y resaltado;
  - deslizador de acomodación;
  - animación del reflejo fotomotor (la curva de S02P) y de la acomodación (la curva de S02Z).
- **Ficha de cada estructura:** datos clave, ligas de sus subespecialidades, práctica libre y capítulo de la película.
- **Viaje por estaciones** (vista por defecto de `/radar-hunt/eye`):
  - 9 estaciones (S01–S04D), una por capítulo, con su vídeo en `public/eye/stations/` (cortes exactos por fotograma del máster v4, 1080p24 H.264, ~32 MB en total) y su póster.
  - Cada estación tiene un marcador numerado en el ojo 3D, junto a su estructura y de tamaño constante en pantalla. Al pulsarlo, la cámara va a esa zona y se reproduce su tramo.
  - Progreso del viaje (guardado en el navegador), estación anterior/siguiente, «Reto de la estación» (práctica de su subespecialidad) y «Reproducción continua».
  - Tres modos: viaje por estaciones, ojo 3D libre y película (las 9 estaciones encadenadas).
  - Con `VITE_EYE_VIDEO_URL` (HLS o MP4 del máster completo en una CDN), el reproductor usa ese archivo y salta al tramo de cada estación.
- **Rendimiento:**
  - three.js (688 kB) se carga solo al abrir el 3D;
  - el render es bajo demanda: solo cuando hay cambios, con como mucho un fotograma pendiente;
  - el corte no recompila shaders.

### Ligas y juego
- **34 ligas:** 17 subespecialidades × residentes/adjuntos, en la temporada 2026–2027.
- **Calendario:** 10 rondas semanales de 5 preguntas; cuentan las 8 mejores y los 16 primeros son finalistas.
- **Puntuación** (`src/lib/radar-hunt/scoring.ts`):
  - base 100–200 según dificultad;
  - sin bonus de rapidez en ligas, estaciones y BOSS (decisión del 4 nov: equidad entre idiomas y ritmos); solo los retos en sala lo mantienen (hasta +50 %);
  - crédito parcial en selección múltiple;
  - fuera de tiempo = 0;
  - BOSS +20 % si el caso es perfecto.
- **Clasificación:** mejores N de M. Desempate por aciertos, luego tiempo y luego nombre. Los empates exactos comparten puesto.
- **Reglas de juego en el servidor:**
  - el tiempo se mide desde la entrega de la pregunta;
  - orden fijo de preguntas y sin repetir;
  - un intento por ronda;
  - orden de opciones aleatorio por usuario;
  - la respuesta correcta nunca viaja al cliente antes de responder.
- **Elegibilidad en ligas oficiales:** perfil verificado, etapa coincidente y ronda abierta. La práctica libre y los BOSS no exigen verificación.
- **Impugnaciones** de preguntas, que llegan al comité editorial.
- **Mapa de competencias** (Elo por subespecialidad) e **itinerario recomendado** hacia el ojo 3D y la práctica.

### Verificación de médicos
- **Datos:**
  - **nombre, apellidos, número de colegiado, correo, especialidad y hospital**;
  - además, la etapa profesional (residente R1–R4 o adjunto), que asigna la liga;
  - el colegio provincial y la subespecialidad principal son opcionales.
- **Declaración de veracidad** y autorización de comprobación, obligatorias.
- **Señales automáticas para el revisor:**
  - formato del colegiado (6–10 dígitos);
  - correo institucional (no gmail/hotmail…);
  - coincidencia con el correo de la cuenta;
  - especialidad de Oftalmología;
  - **colegiado repetido en otra cuenta**.

  La decisión es siempre humana, tras comprobar el número en el registro oficial.
- **Restricción en base de datos:** un número de colegiado no puede quedar verificado en dos cuentas.
- **Al aprobar** se concede el rol `verified_doctor`. Al rechazar es obligatoria una nota, y el usuario puede corregir los datos y reenviar.

## Dos modos con el mismo núcleo
`src/lib/radar-hunt/game-core.ts` contiene toda la lógica del juego sobre un repositorio abstracto:
- **Demo** (sin Supabase o con `VITE_RH_DEMO=true`):
  - repositorio en memoria + `localStorage`;
  - 60 preguntas y 3 BOSS de demostración;
  - 12 «participantes demo» ficticios por liga;
  - para aprobar tu propia verificación, cambia el rol a Administrador.
- **Producción** (Supabase configurado): funciones de servidor (`game.functions.ts`) con `service_role` y el repositorio `repo-supabase.server.ts`. El cliente nunca puntúa ni mide tiempos.

## Puesta en marcha en producción
0. **Interruptor de demo:** `src/lib/radar-hunt/deploy.ts` tiene `RH_FORCE_DEMO = true`. Así,
   el sitio publicado en Lovable funciona en modo demostración aunque tenga Supabase
   conectado. Pásalo a `false` solo cuando estén aplicadas **todas** las migraciones
   `supabase/migrations/2026110*_radar_hunt_*` (juego, congresos, temporada, recorridos y
   progreso del ojo).
1. **Migración:** aplicar `supabase/migrations/20261104090000_radar_hunt_game.sql`. Crea las 15 tablas `rh_*` con RLS, la temporada y las 34 ligas.
2. **Banco de demostración (opcional):** `supabase/seed/radar_hunt_demo_bank.sql`. Entra todo como pendiente de KOL, así que no es jugable en competición hasta aprobarlo. Se regenera con:

   ```bash
   npx vite-node scripts/radar-hunt/generate-demo-seed.ts
   ```
3. **Tipos:** regenerar los tipos de Supabase (`supabase gen types`) para tipar las tablas `rh_*`.
4. **Flujo editorial:** los editores y KOL aprueban preguntas (`status = approved` + `validation_level` `or_reviewed`/`kol_verified` + ≥1 referencia).
5. **Rondas:** publicarlas con `rhPublishLeagueRounds` (admin/editor). Congela el reparto de las rondas con preguntas suficientes.
6. **Película:** generar el HLS del máster y configurar `VITE_EYE_VIDEO_URL`:

   ```bash
   scripts/radar-hunt/make-eye-hls.sh RH_EYE_S01-S04_MASTER_v4_2160p24_ProRes422HQ.mov eye-hls/
   ```

## Verificación realizada
- **`tsc --noEmit`:** 0 errores.
- **Vitest:** **54/54** (33 tests nuevos de motor, núcleo, contenido y flujo demo, más los 21 previos).
- **`vite build`:** OK. Sin código de servidor ni `service_role` en el paquete del navegador.
- **ESLint:** 0 errores y 0 avisos en el código nuevo. El código previo ya tenía 38 errores y 11 avisos en archivos no tocados.
- **Migración:** validada en Postgres 16 (`supabase/tests/`), con RLS probada.
- **E2E con Playwright** (Chromium): inicio → ojo 3D (vistas, corte, fondo, selección, S02Z) → película → formulario (incluida la validación del consentimiento) → bloqueo de liga sin verificar → aprobación en la cola → ronda completa → clasificación → BOSS → perfil → móvil. **0 errores de consola.**

## Pendiente / limitaciones conocidas
- **Supabase real:** las funciones de servidor no se han probado contra un proyecto real porque no hay credenciales en este entorno. Están tipadas, compiladas y la migración está validada.
- **Contenido:** las 60 preguntas son de demostración y están pendientes de KOL. Una liga real necesita ≥ 50 preguntas validadas por subespecialidad para completar la temporada.
- **Validación anatómica** del ojo 3D y de la película por un oftalmólogo.
- **Inteligencia de mercado:** diseñada en la arquitectura, no implementada. **Congresos en directo:** v1 implementada (ver `CONGRESOS.md`), pendiente de probar con Supabase real y Realtime.
- **Dependencias:**
  - `package-lock.json` está actualizado con `three@0.170.0`, `hls.js@1.5.20` y `@types/three`, pero `bun.lock` no se ha podido regenerar porque el proxy bloquea el registro de bun. Hay que ejecutar `bun install` en un entorno con acceso.
  - `npm audit` marca 34 avisos que ya existían; las dependencias nuevas no añaden ninguno.
