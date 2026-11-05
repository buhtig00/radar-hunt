# Contexto completo para ChatGPT: RADAR HUNT (4 nov 2026)

> **Instrucciones para ChatGPT.** Eres un experto senior (producto, ingeniería y oftalmología educativa) que continúa un proyecto ya avanzado. Lee todo este documento antes de responder.
> - No rehagas lo que ya está hecho.
> - No inventes contenido clínico ni referencias.
> - Si algo no está claro, dilo y propón cómo verificarlo.
> - Responde en español, con estructura: contexto → análisis → recomendaciones → próximos pasos.
>
> El código y la documentación van en el zip adjunto (`RadarHunt_paquete.zip`); las rutas de este documento se refieren a ese zip.

---

## 1. Qué es Radar Hunt
**«El universo donde la oftalmología se convierte en conocimiento, competición e innovación».** Radar Hunt es una plataforma de **competición médica, formación interactiva e inteligencia de mercado** especializada en oftalmología, desarrollada por **Ophthalmology Radar**. Lema: **Play. Learn. Discover.**

**Los cinco pilares:**
1. **Eye Universe:** un ojo humano navegable que da acceso a cada subespecialidad.
2. **Ligas internacionales:** por subespecialidad, para residentes y adjuntos, con casos, retos BOSS, clasificaciones y finales.
3. **Congresos interactivos:** retos y encuestas en directo ligados a las ponencias.
4. **Inteligencia de mercado:** preguntas independientes de las pruebas y estudios agregados para la industria, respetando la privacidad.
5. **Formación personalizada:** áreas de mejora e itinerarios con contenido validado.

**Ecosistema:** los médicos aprenden y compiten; las sociedades difunden ciencia; la industria obtiene insights agregados.

**Situación de partida:**
- Existe una web pública en **radarhunt.app**, que anuncia el congreso **NOAPS 2026 (Valencia, 5–6 nov)**. **Su código no está en este repositorio.**
- Lo de este documento se construyó en un repositorio aparte (`buhtig00/IA`) y está publicado desde **Lovable**.

## 2. Qué se ha desarrollado (dos líneas de trabajo)

### 2A. Película «RADAR HUNT: The Human Eye Universe» (terminada a nivel de máster)
Viaje cinematográfico en primera persona, fotorrealista y anatómicamente riguroso, por el ojo derecho: **córnea → iris y pupila → cristalino → vítreo → mácula y fóvea**, con un corte educativo de las capas de la retina.

- **Máster v4:** 3840×2160, 24 fps, **49 s** (1.176 fotogramas).
  - **H.264**, 489,5 MB, para revisión y web.
  - **ProRes 422 HQ**, 4,55 GB, 10 bits, etiquetas BT.709 corregidas, para la plataforma o la posproducción.
  - Están en el PC del usuario, no en el zip.
- **Producción:**
  - fotogramas ancla con Grok Image y vídeo con **Kling O3** (primer y último fotograma) a través de la API de Higgsfield;
  - anatomía anclada en una retinografía real CC0 (Häggström);
  - etalonaje con una LUT propia;
  - reescalado a 4K con Lanczos, sin inventar anatomía.
- **Insertos procedurales** (Python, deterministas, sin IA generativa):
  - **S02P:** reflejo fotomotor.
  - **S02Z:** zónula y acomodación, en corte sagital a escala real. Cristalino de 3,60 → 4,05 mm, diámetro de 9,30 → 8,90 mm, pupila de radio 2,0 → 1,55 mm.
  - **S03D:** capas de profundidad del vítreo.
  - **S04C:** corte foveal por capas.
  - **B00R:** retoque de la esclera en el primer fotograma.
- **Documentación** en `docs/radar-hunt/`:
  - biblia de producción (anatomía canónica, prompts y control de calidad);
  - revisiones de cada ronda con costes;
  - plan de 4K;
  - etalonaje;
  - scripts.
- **Convenciones:**
  - ojo derecho, con el disco a la derecha de la cámara;
  - iris azul grisáceo con collarete dorado;
  - reflejo rojo coaxial en la pupila;
  - disco a unos 2,5 diámetros papilares de la fóvea.
- **Pendiente:** validación por un oftalmólogo, más una versión «premium» opcional con Topaz.

### 2B. Plataforma Radar Hunt v1 (funcional en modo demo)
Construida **sobre el motor existente de Ophthalmology Radar**, sin reescribirlo.

**El motor que ya existía (no rehacer):**
- TanStack Start (React 19) + Supabase (Postgres, Auth, RLS) + RAG con pgvector + pasarela de IA;
- roles: admin, medical_editor, kol, verified_doctor, industry_user;
- flujo editorial: generado por IA → revisado por OR → validado por KOL;
- catálogo clínico bilingüe `oph_*` y 14 bloques de conocimiento;
- seguridad, RGPD, cuotas y CI.

Su contexto anterior está en `docs/CONTEXTO-ChatGPT.md` y `docs/DESARROLLO-Ophthalmology-Radar.md`.

**Lo nuevo de Radar Hunt** (rutas `/radar-hunt/*`, todo en español):

| Módulo | Qué hace |
|---|---|
| **Eye Universe 3D** | Ojo derecho procedural en three.js a escala real: córnea, iris, cristalino con el perfil de S02Z, zónula, cuerpo ciliar, vítreo, retina con mácula, fóvea, disco nasal y arcadas, coroides y esclera. 8 vistas, corte sagital, clic en estructuras (ficha → ligas, práctica y capítulo), acomodación y reflejo fotomotor. **Película por capítulos** (9 capítulos con puntos interactivos; HLS con `VITE_EYE_VIDEO_URL`). |
| **Ligas** | **34 ligas** (17 subespecialidades × residentes/adjuntos), temporada 2026–2027. 10 rondas semanales de 5 preguntas; cuentan las 8 mejores; 16 finalistas. Desempate por aciertos y luego por tiempo. |
| **Juego** | 30 s por pregunta. Puntos = base por dificultad (100–200) × acierto × (1 + 0,5 × rapidez). Crédito parcial en selección múltiple. El servidor mide el tiempo; la respuesta correcta no llega al cliente antes de responder; el orden de opciones es aleatorio por usuario. Explicación con referencia e impugnaciones. |
| **Retos BOSS** | Casos de varios pasos que revelan información (glaucoma, retina, neurooftalmología), con un 20 % extra si el caso sale perfecto. |
| **Verificación de médicos** | Nombre, apellidos, **nº de colegiado**, correo, especialidad, hospital y etapa (residente R1–R4 o adjunto). Declaración de veracidad obligatoria. Señales para el revisor: formato del colegiado, correo institucional, especialidad y colegiado duplicado. La decisión siempre es humana y un colegiado no puede verificarse en dos cuentas. |
| **Formación personalizada** | Mapa de competencias (Elo por subespecialidad) e itinerario recomendado. |
| **Dos modos con el mismo núcleo** | **Demo** (sin backend, `localStorage`, preguntas y participantes de demostración) y **producción** (funciones de servidor con Supabase). |

**Base de datos:**
- migración `supabase/migrations/20261104090000_radar_hunt_game.sql`, con 15 tablas `rh_*`, RLS y las 34 ligas;
- banco de demostración en `supabase/seed/`;
- pruebas SQL en `supabase/tests/`.

**Calidad verificada:**
- `tsc` sin errores;
- **54/54 tests**;
- la versión de producción se genera bien;
- migración probada en Postgres 16;
- prueba de extremo a extremo con Playwright de todo el flujo, sin errores de consola.

**Estado:** fusionado en el repositorio (PR #6) y publicado en Lovable en **modo demo**. La revisión del link publicado está pendiente.

### 2C. Arquitectura completa (diseñada; solo parte implementada)
- `docs/radar-hunt-platform/ARQUITECTURA-Radar-Hunt.md`: actores, 10 dominios, tiempo real para congresos, modelo de datos, calidad científica, puntuación, inteligencia de mercado, privacidad, hoja de ruta en 7 fases, métricas y riesgos.
- **Decisión clave de privacidad:** la industria **no consulta datos libremente**. Solo recibe tablas publicadas, con un mínimo de 20 participantes por celda y supresión complementaria. En las pruebas del borrador se vio que la supresión por celda sola se podía saltar restando dos consultas.

## 3. Principios y restricciones (no negociables)
1. **No fabricar contenido clínico ni referencias.** Todo pasa por el flujo editorial y el KOL, con al menos una referencia verificable por pregunta.
2. **Educativo, no asistencial:** sin diagnóstico individual, posología ni interpretación de imágenes de pacientes.
3. **Separar competición y mercado:** esquemas, identificadores y consentimientos distintos; la industria nunca ve respuestas individuales.
4. **El servidor tiene la autoridad** sobre puntos y tiempos.
5. **Español primero**, con el contenido bilingüe ES/EN.
6. **A validar con asesoría legal:** RGPD y códigos de la industria (Farmaindustria, EFPIA o MedTech Europe), sobre todo para premios patrocinados y estudios de mercado.

## 4. Pendiente (aquí es donde más ayuda se necesita)
1. **Contenido:**
   - las 60 preguntas actuales son de demostración y **están pendientes de KOL**;
   - una temporada real necesita unas 50 preguntas validadas por liga;
   - el motor anterior tiene además **186 monografías en borrador**.

   Hay que planificar la capacidad de los KOL y el proceso editorial.
2. **Liga piloto:** elegir subespecialidad y sociedad científica socia.
3. **Producción con Supabase:**
   - aplicar la migración y regenerar los tipos;
   - aprobar preguntas y publicar rondas;
   - **probar las funciones de servidor contra un Supabase real**, que aún no se ha hecho.
4. **Congresos en directo** (pilar 3) e **inteligencia de mercado** (pilar 4): diseñados, sin implementar.
5. **Integrar o sustituir radarhunt.app:** su código no está disponible.
6. **Película:** subir el HLS del máster v4 a un CDN y configurar `VITE_EYE_VIDEO_URL`.
7. **Validación anatómica** del ojo 3D y de la película por un oftalmólogo.
8. **Higiene técnica:**
   - regenerar `bun.lock`;
   - 38 errores de lint en código anterior;
   - 34 avisos de `npm audit` anteriores a Radar Hunt;
   - **rotar la API key de Higgsfield**.

## 5. Mapa de archivos (en el zip)
- **Plataforma:**
  - `docs/radar-hunt-platform/`: arquitectura, implementación, modelo de datos, pruebas y capturas;
  - `src/lib/radar-hunt/`: motor del juego, servicios y contenido demo;
  - `src/components/radar-hunt/`: ojo 3D, película e interfaz;
  - `src/routes/radar-hunt*.tsx`: páginas.
- **Base de datos:** `supabase/migrations/20261104090000_radar_hunt_game.sql`, `supabase/seed/` y `supabase/tests/`.
- **Película:** `docs/radar-hunt/` (biblia, revisiones, 4K, etalonaje, insertos procedurales y scripts).
- **Motor previo:** `docs/CONTEXTO-ChatGPT.md`, `docs/DESARROLLO-Ophthalmology-Radar.md` y `docs/ROADMAP-mejoras.md`.
- **Excluido del zip por tamaño:** vídeos MP4/MOV, imágenes de producción, `node_modules`, el `.docx` y los `.zip` de los bloques de conocimiento.

## 6. Preguntas de partida sugeridas
- ¿Cómo diseñarías el plan editorial y de capacidad de los KOL para tener 3 ligas piloto con 50 preguntas validadas cada una en 8 semanas?
- Propón el modelo de negocio y los paquetes para sociedades y para la industria, compatibles con los códigos del sector.
- Revisa la arquitectura del modo congreso en directo (fase 3) y proponme el producto mínimo para el próximo congreso.
