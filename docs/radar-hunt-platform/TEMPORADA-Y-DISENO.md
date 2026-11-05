# Radar Hunt: temporada, premios, industria y sistema de diseño (4 nov 2026)

Decisiones tomadas tras analizar la plataforma estática de un compañero: `radar-hunt-deploy`, con su showroom y su juego de 27 pantallas. Se han incorporado **su diseño y su relato de temporada** sobre **nuestro motor y nuestro cumplimiento**.

## 1. Sistema de diseño (`src/styles.css`, clase `.rh-theme`)

El tema se aplica a `/radar-hunt/*` y a `/sala/*`.

- **Paleta en oklch:**
  - navy `--rh-navy-950/900/800`;
  - cian de marca `--rh-radar-700…100`;
  - **oro solo para el podio** (`--rh-podium`, clase `.rh-podium` y el componente `RankBadge`).
  - Dentro del tema, el antiguo `--gold` de acento pasa a ser el cian de marca.
- **Tipografía:** Inter para todo. **Instrument Serif en cursiva** solo para los acentos, que se marcan con `<em>` en los títulos.
- **Superficies y animación:**
  - cristal: `.rh-glass` (desenfoque, filo interior y sombra suave);
  - botón principal: `.rh-cta` (degradado radial cian con brillo interior);
  - héroe: `.rh-hero-bg`, con anillos de radar y un barrido lento (`.rh-sweep`) que respeta `prefers-reduced-motion`.

## 2. Temporada en Hunts (`src/lib/radar-hunt/season.ts`, `/radar-hunt/temporada`)

- **Cada congreso es un Hunt.** La temporada 2026–2027 prevé 8 Hunts y **cuentan los 5 mejores** de cada persona.
- **Event Score normalizado (0–1000):** el ganador de cada Hunt suma 1000 y el resto, en proporción. Así, un congreso grande no pesa más que uno pequeño.
- **Desempate:** gana quien ha jugado más Hunts (constancia); si persiste, se comparte el puesto. La rapidez nunca desempata.
- **Gran Final** en Barcelona 2027, con **sede y fecha pendientes de confirmación**. Se clasifican los 16 primeros de la temporada y el podio de cada liga.
- **Sin congresos reales sin acuerdo:** los huecos aparecen como «Congreso por anunciar». La plataforma del compañero citaba SEO, SERV, AAO, ESCRS, EURETINA, ARVO, APAO y CEM sin constancia de acuerdo.

## 3. RP, la única moneda, y Premios ≠ Recompensas (`/radar-hunt/premios`)

- **Los RP miden lo que sabes** y no se canjean por regalos. Los suman:
  - las ligas;
  - los retos BOSS;
  - las estaciones de congreso;
  - los retos en sala.

  La práctica libre no suma.
- **Premios (por clasificación):** son académicos y formativos (diploma, mención, observership, mentoría con KOL), y los gestiona y financia la sociedad científica.
  - **Sin premios en metálico, sorteos ni regalos de valor.** La plataforma del compañero ofrecía becas de 800 € a 3.000 €.
  - Política **pendiente de revisión legal** (Farmaindustria, EFPIA, MedTech Europe).
- **Recompensas (por progreso):** 8 insignias calculadas a partir del progreso real del usuario:
  - Explorador del ojo;
  - Primer Hunt;
  - Rastreador;
  - En la sala;
  - Constancia;
  - Caso resuelto;
  - Dominio (Elo ≥ 1100 con al menos 10 respuestas);
  - Temporada.

## 4. Puntuación por acierto

- **Ligas, estaciones y BOSS:**
  - `speedLambda = 0`: la rapidez **no suma RP** y el tiempo **no desempata**;
  - se mantiene el límite de 30 s por pregunta;
  - motivo: equidad entre idiomas y ritmos de lectura;
  - migración: `20261106090000_radar_hunt_season_industry.sql`.
- **Retos en sala (directo):** conservan el pequeño extra por rapidez, que es parte de la dinámica de la sesión.

## 5. Industria (`/radar-hunt/industria`)

Recoge el mensaje del showroom del compañero, «Tu stand, *una estación*», con nuestras salvaguardas:

- **Estación con apoyo:** da los **mismos RP** que cualquier otra (en el showroom del compañero daba más) y lleva siempre su texto de transparencia; la marca no toca las preguntas.
- **Sesión en directo:** los retos salen del banco validado y las encuestas son de opinión, nunca de producto.
- **Estudios de mercado:** **aparte**, sin RP, con consentimiento propio y agregados con un mínimo de 20 respuestas por celda. Nunca datos individuales ni contactos.
- **Reglas de la competición:** Expositor ≠ Partner, Ciencia sin marca, Premios ≠ Recompensas, El servidor manda, Datos agregados y Sin GPS.
- **Formulario de propuesta:**
  - la validación es la misma en demo y servidor (`src/lib/radar-hunt/proposal.ts`);
  - tiene una trampa para bots;
  - los datos se guardan en `rh_proposal_requests`, que solo lee la organización;
  - en la demo se guarda solo en el navegador.

## 6. Eye Universe

Se añade el **modo «Flujo del humor acuoso»**, que muestra las dos vías de salida:
- la **trabecular**, hacia el canal de Schlemm;
- la **uveoescleral**, que la plataforma del compañero omitía.

Del ojo del compañero quedan como posibles mejoras la calidad adaptativa, las microsacadas de la cámara y los modos Corte y Explosión.

## Qué NO se ha incorporado de la plataforma del compañero

- La corrección en el cliente (la respuesta estaba en el HTML).
- El acceso sin contraseña y el panel de administración sin protección.
- Los premios en euros.
- Los retos de marca que dan más RP que los científicos.
- La encuesta de mercado dentro del juego.
- Los médicos inventados en hospitales reales.
- Los congresos reales sin acuerdo.

## Pendiente

- **Revisión legal** de los premios y de las bases.
- **Contenido validado por KOL** para los Hunts. Hay un borrador del usuario, «Matriz 8 estaciones por perfil», marcado como pendiente de validación.
- **Confirmación de la sede y la fecha** de la Gran Final.
- Una ficha de cada Hunt con sus ligas.
