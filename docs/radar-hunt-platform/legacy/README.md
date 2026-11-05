# Legado: documentación rescatada del PR buhtig00/IA#2

> **Propuesta no validada.** Estos documentos vienen del PR #2 («Radar Hunt — experiencia clínica gamificada para el congreso SEO Palma 2026» y «World Radar Hunt»). Se conservan como **referencia de diseño**. **Prevalecen** [`ARQUITECTURA-Radar-Hunt.md`](../ARQUITECTURA-Radar-Hunt.md) y sus principios: sin premios en metálico, separación entre competición e inteligencia de mercado, contenido validado por KOL y servidor con la autoridad.

## Qué hay aquí

| Documento                                                                                                    | Para qué sirve                                                                                                                                                | Cómo usarlo                                                                        |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [`world-radar-hunt/01-REGLAMENTO-OFICIAL.md`](world-radar-hunt/01-REGLAMENTO-OFICIAL.md)                     | Temporada multi-congreso con Event Score normalizado (0–1000), «5 mejores congresos», Live Score que no computa al mundial y participación remota equivalente | Base para decidir la temporada global (§15 de la arquitectura)                     |
| [`world-radar-hunt/02-DOSSIER-COMERCIAL.md`](world-radar-hunt/02-DOSSIER-COMERCIAL.md)                       | Formatos (World Major, Regional, Satellite, Digital), paquetes (Starter, Congress, Premium, White Label), patrocinio y figura del Radar Ambassador            | Borrador comercial; **quitar** el «lead sharing» a patrocinadores                  |
| [`world-radar-hunt/03-ESPECIFICACIONES-FUNCIONALES.md`](world-radar-hunt/03-ESPECIFICACIONES-FUNCIONALES.md) | Esquema de temporadas, normalización y regularidad                                                                                                            | Solo referencia técnica: el modelo vigente es el de `supabase/migrations/2026110*` |
| [`world-radar-hunt/04-EXPERIENCIA-E-IDENTIDAD.md`](world-radar-hunt/04-EXPERIENCIA-E-IDENTIDAD.md)           | 8 pilares de experiencia, garantía científica (conocimiento ≥ 60 %, industria ≤ 15 %), desempates sin primar la velocidad                                     | Inspiración de producto                                                            |
| [`world-radar-hunt/05-PREMIOS-Y-RECOMPENSAS.md`](world-radar-hunt/05-PREMIOS-Y-RECOMPENSAS.md)               | Premios **no monetarios**: observership, mentoría, aceleradora de publicaciones, becas administradas contra proyecto; «lo valioso se gana, no se sortea»      | Base de la política de reconocimiento, **pendiente de revisión legal**             |
| [`world-radar-hunt/BRAND_KIT.md`](world-radar-hunt/BRAND_KIT.md)                                             | Paleta, tipografía y tono                                                                                                                                     | Referencia visual                                                                  |

## Datos que hay que verificar antes de usarlos

Los documentos citan organizaciones, fechas e importes **sin confirmación documentada**:

- **Congresos:**
  - SEO Palma 2026 (Palacio de Congresos de Palma);
  - Simposio de Oculoplastia de La Laguna (2–3 oct 2026, «confirmada»);
  - Lisboa y Milán 2027 como «candidatas»;
  - World Majors candidatos: SEO, ESCRS, EURETINA, AAO, ASCRS, ARVO, WGC, CBO, PAAO, APAO, SOE, ASRS, Trends in Retina y FLORetina.
- **Patrocinadores** citados como «partners confirmados»: Brill, Ophtec, MicroREC, Equipsa y Bausch + Lomb. Hay otras marcas en las estaciones de los prototipos.
- **Hospitales reales** con jugadores ficticios en los prototipos (no se han portado).
- **Importes** de la World Radar Fellowship, la bolsa inaugural, becas y premios por categoría.
- **Acreditación:** SEAFORMEC.

## Qué NO se ha portado del PR #2, y por qué

| Elemento                                                                               | Motivo                                                                                                                            |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Premios en metálico (5.700 €; de 1.000 € a 250 €), cajas sorpresa y sorteos            | Incompatibles con los códigos de Farmaindustria, EFPIA y MedTech Europe                                                           |
| Bancos de preguntas (131 / 230)                                                        | Sin referencias ni validación. La correcta casi siempre era la primera opción. Había preguntas de producto (promoción encubierta) |
| Encuestas de mercado que puntúan, «lead sharing» y estudios por marca                  | Rompen la separación entre competición y mercado                                                                                  |
| Geovalla GPS con seguimiento continuo                                                  | Desproporcionado (RGPD): la presencia se acredita con el QR                                                                       |
| Credenciales de admin fijas en el código y QR con códigos adivinables                  | Inseguro. Ahora hay tokens aleatorios rotables y roles en el servidor                                                             |
| Planos y foto aérea de la sede real (`public/floors/*.webp`)                           | Derechos de uso no documentados. Cada evento puede subir su propio plano                                                          |
| Apps paralelas (`radar-hunt/`, `world-radar-hunt-app/`), port a Unreal y maquetas HTML | Duplican la plataforma o son demos con marcas reales                                                                              |

El código útil se ha **reimplementado** sobre la arquitectura actual en lugar de copiarlo. Se ve en [`CONGRESOS.md`](../CONGRESOS.md):

- escáner QR con BarcodeDetector y jsQR;
- plano por plantas;
- pantalla de sala;
- administración del evento;
- exportación CSV;
- ventanas de juego;
- ranking por centros;
- encuesta de satisfacción.
