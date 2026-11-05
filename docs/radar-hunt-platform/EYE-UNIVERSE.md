# Eye Universe por especialidad

El Eye Universe (`/radar-hunt/eye`) es la puerta de entrada anatómica a los Hunts. Su modo
por defecto, **Por especialidad**, sitúa las 23 estaciones de la matriz de 8 estaciones por
perfil dentro del ojo 3D. Los demás modos siguen disponibles como exploración: Viaje
anatómico (9 tramos de película), Ojo 3D libre y Película.

## Navegación en tres niveles

**Recorrido › zona del ojo › estación**

1. **Recorrido.** Los seis perfiles de la matriz se muestran en el selector «Tu recorrido»:
   General, Anterior, Retina, Glaucoma, Neuro + Pediatría y Oculoplastia. Se preselecciona
   el recorrido de la subespecialidad principal del perfil. Cada recorrido tiene su color
   (el dorado queda reservado al podio) y un orden clínico. Por ejemplo, glaucoma sigue al
   humor acuoso: producción → ángulo → material obstructivo → disco → progresión.
2. **Estación en el ojo.** Al elegir una estación, la cámara vuela a su vista: corte
   sagital, fondo de ojo, órbita, etc. Se activan los modos que la explican (flujo de humor
   acuoso, anejos) y se resalta la estructura. El ojo solo muestra los marcadores del
   recorrido, numerados en ese orden.
3. **Ficha de estación.** Incluye:
   - la zona y la estructura, qué mirar, el tramo de película si existe y la anatomía;
   - **Practicar la estación**: sus preguntas Science XP, completadas con práctica de la
     subespecialidad hasta 5;
   - enlace a la liga de la subespecialidad;
   - progreso: mejor resultado e intentos.

Las preguntas **RADARS (Q1–Q5) no se exponen en el ojo**. Son el reto competitivo de la
estación en el Hunt presencial y se juegan escaneando el QR. Publicarlas aquí permitiría
memorizarlas antes de competir.

Otros recursos:
- Vista **Lista** de cada recorrido, accesible y para equipos sin WebGL.
- Flechas ← → para pasar de una estación a otra.
- Enlaces directos:
  - `/radar-hunt/eye?recorrido=glaucoma`
  - `/radar-hunt/eye?estacion=GLA-02`
  - `&vista=lista`
  - en la demo estática: `#ojo-glaucoma` y `#estacion-GLA-02`

## Anclajes

`src/lib/radar-hunt/eye-tracks.ts` define, para cada estación, los siguientes campos:

| Campo | Qué es |
|---|---|
| `zone` | Segmento anterior, úvea, polo posterior, nervio óptico o anejos y órbita |
| `structure` | Estructura del modelo que se resalta |
| `marker` | Posición del marcador en mm (ejes de construcción: x nasal, y anterior, z inferior) |
| `view` | Cámara en ejes de escena (x nasal, y superior, z anterior) |
| `cutaway`, `aqueous`, `adnexa` | Modos de visualización de la estación |
| `clip` | Tramo de la película máster que la ilustra |
| `focus` | Una línea de qué mirar al llegar |

Los tests de `eye-tracks.test.ts` comprueban:
- que los 6 recorridos cubren las 23 estaciones;
- que cada anclaje apunta a una estructura y un tramo que existen;
- que las estaciones fuera del globo activan los anejos.

## Anejos y órbita (modelo 3D)

`eye-model.ts` añade una capa procedural de anejos, con medidas orientativas de adulto:

- **Órbita.** Pirámide desde el reborde (≈ 40 × 35 mm, con el lateral más posterior) hasta
  el vértice, a ≈ 40–45 mm.
- **Músculos.**
  - Cuatro rectos desde el anillo de Zinn, con inserciones según la espiral de Tillaux
    (5,5 / 6,5 / 6,9 / 7,7 mm del limbo).
  - Oblicuo superior con tróclea y tendón reflejo, y oblicuo inferior desde el suelo
    orbitario anteromedial.
  - Elevador del párpado superior.
- **Nervio óptico intraorbitario**, sinuoso, hasta el canal óptico.
- **Sistema lagrimal.** Glándula superotemporal, puntos, canalículos, saco y conducto
  nasolagrimal.
- **Párpados.** Hendidura de ≈ 10 mm; el borde superior cubre ≈ 1,5 mm de la córnea.

`setAdnexa("off" | "orbit" | "full")` muestra la órbita sin párpados o con ellos. Solo se
puede seleccionar lo visible. Los volúmenes translúcidos (vítreo y órbita) no tapan lo que
hay detrás. Como el resto del modelo, está **pendiente de validación anatómica** por un
oftalmólogo.

## Progreso

Al terminar una práctica de estación (id `practice:station:{CÓDIGO}:…`), el núcleo del juego
guarda el progreso con `GameRepo.recordEyeStation`. Se conserva el mejor resultado y se
cuentan los intentos.

- **Demo:** en el estado local.
- **Producción:** en `rh_eye_progress`
  (migración `20261108090000_radar_hunt_eye_progress.sql`). La RLS solo permite leer lo
  propio y las escrituras van por funciones de servidor.

No suma RP ni puntos de temporada: es práctica.

## Insignias por recorrido

- **Estación superada:** su mejor práctica alcanza el **80 %** de aciertos (`EYE_PASS_RATIO`).
  Por ejemplo, 4/5 o 3/3. El umbral lo fijó la dirección del proyecto; es un único valor.
  - Practicada sin llegar al 80 %: la ficha muestra «Practicada · necesitas 4/5».
  - Los contadores, los marcadores ✓ y la estación que abre por defecto se basan en las
    superadas.
- **Insignias** (`computeTrackBadges`, en `eye-tracks.ts`): una por recorrido y una global.

  | Recorrido | Insignia |
  |---|---|
  | General | Ruta general |
  | Anterior | Ruta del segmento anterior |
  | Retina | Ruta de la retina |
  | Glaucoma | Ruta del glaucoma |
  | Neuro + Pediatría | Ruta neuro-pediátrica |
  | Oculoplastia | Ruta de la órbita |
  | Las 23 estaciones | Eye Universe completo |

  Cada insignia se gana cuando todas las estaciones de su recorrido están superadas.
- Se calculan desde el progreso guardado (en producción, `rh_eye_progress`): no hay tabla de
  insignias que pueda desincronizarse. No dan RP ni puntos de temporada.
- **Dónde se ven:**
  - en el Eye Universe: barra de la insignia bajo el título del recorrido e icono en el
    selector;
  - un aviso único (por navegador) al conseguirla;
  - en Premios: sección «Insignias del Eye Universe», con enlace a cada recorrido.

## Pendiente

- Validación médica y anatómica.
- Marcar como completado el tramo de película visto (hoy se guarda solo en el navegador) y
  sumarlo al progreso del perfil.
