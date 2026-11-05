# Pruebas SQL de Radar Hunt

Se validan sobre un **Postgres 16** desechable con un esqueleto mínimo del esquema existente. Las migraciones originales necesitan `pgvector` y `pg_cron`, que no hace falta para estas pruebas.

```bash
psql -c "create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as \$\$ select nullif(current_setting('test.uid', true),'')::uuid \$\$; create role anon; create role authenticated; create role service_role; create extension pgcrypto;"
psql -v ON_ERROR_STOP=1 -f radar_hunt_00_skeleton.sql
psql -v ON_ERROR_STOP=1 -f ../migrations/20261104090000_radar_hunt_game.sql
psql -v ON_ERROR_STOP=1 -f ../seed/radar_hunt_demo_bank.sql
psql -f radar_hunt_rls.sql     # algunos ERROR son esperados: ver los \echo
psql -v ON_ERROR_STOP=1 -f ../migrations/20261105090000_radar_hunt_congress.sql
psql -f radar_hunt_congress_rls.sql   # modo congreso; los ERROR marcados con \echo son esperados
```

## Resultado (4 nov 2026)
- **Migración:** aplica sin errores y es idempotente (15 tablas `rh_*`, 34 ligas).
- **Banco demo:** se carga (60 preguntas, 3 casos BOSS) y queda con 0 preguntas jugables en competición, porque todas están pendientes de KOL.
- **RLS:**
  - un jugador ve solo su perfil, ninguna pregunta y las 34 ligas;
  - un editor ve todos los perfiles y todo el banco;
  - nadie puede verificarse a sí mismo (`permission denied`);
  - los usuarios anónimos ven las ligas pero no las rondas;
  - un mismo número de colegiado no puede quedar verificado en dos cuentas.

## Modo congreso (4 nov 2026)
- **Migración:** aplica sin errores dos veces seguidas (idempotente) y añade 11 tablas `rh_*` (26 en total).
- **RLS y restricciones:**
  - un anónimo ve el evento publicado y su estación, pero no los borradores;
  - nadie salvo `service_role` lee `rh_station_tokens` ni `rh_audit_log`;
  - un participante ve solo su inscripción y su respuesta, y no puede escribir respuestas ni cambiar la fase;
  - un moderador de un evento en borrador lo ve, con sus estaciones;
  - un admin ve todas las inscripciones, pero no las respuestas ajenas;
  - se rechaza la inscripción sin consentimiento, la segunda respuesta al mismo ítem, un token con formato adivinable y una valoración fuera de rango.

## Temporada e industria (4 nov 2026)
- `20261106090000_radar_hunt_season_industry.sql` aplica dos veces sin errores.
- Las 34 ligas quedan con `speedLambda = 0`.
- Un participante no puede insertar ni leer `rh_proposal_requests`; un admin sí puede leerla.
- Se rechaza un correo sin «@».
