# Ophthalmology Radar · Radar Hunt

Plataforma **Ophthalmology Radar** con **Radar Hunt**:
- **Eye Universe por especialidad:** las 23 estaciones de los Hunts dentro del ojo 3D, con
  órbita, músculos, párpados y vía lagrimal.
- Ligas, retos BOSS, congresos en directo, temporada y Gran Final.
- Premios académicos e insignias por recorrido.
- Capa de inteligencia: OR IA Clínica, Tutor Academy y Análisis de casos.

**Funciona en modo demostración.** No hay registro ni base de datos: el progreso se guarda en el
navegador y el contenido de la matriz de estaciones está pendiente de validación por el comité
médico (KOL).

## Desarrollo
```sh
npm install
npm run dev
```
Pruebas: `npm test` · tipos: `npm run typecheck` · compilación: `npm run build`.

## Pasar a producción
Ver `docs/radar-hunt-platform/IMPLEMENTACION.md`, apartado «Puesta en marcha en producción». En
resumen:
1. Usar un Supabase propio y aplicar `supabase/migrations`.
2. Poner a `false` `APP_FORCE_DEMO` (`src/lib/app-deploy.ts`) y `RH_DEMO_ONLY`
   (`src/lib/radar-hunt/deploy.ts`).

## Origen
- Copiado de la rama principal de `buhtig00/IA` (commit `68e6e7b`), que conserva el historial
  completo y el material de producción de la película del Eye Universe (`docs/radar-hunt`, no
  incluido aquí).
- La web del evento Radar Hunt Palma 2026 es otro proyecto y no se ha modificado.
