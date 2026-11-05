# Pruebas del borrador de modelo de datos

Validan `../modelo-datos-rh_v0.sql` contra un **Postgres 16** desechable. No necesitan Supabase.

```bash
psql -v ON_ERROR_STOP=1 -f 00_esqueleto_motor_existente.sql   # auth, roles y oph_* mínimos del motor actual
psql -v ON_ERROR_STOP=1 -f ../modelo-datos-rh_v0.sql
psql -f 01_pruebas_privacidad_y_banco.sql                     # algunos ERROR son esperados (ver los \echo)
```

## Resultado (3 nov 2026, v0.1)
- **Esquema:** se aplica sin errores (33 tablas `rh_*` + 6 en `rh_insights`).
- **Agregación interna:** solo la pueden usar los administradores; el analista del patrocinador recibe `not authorized`.
- **Tablas publicadas:** el patrocinador lee las de su estudio; un usuario ajeno ve 0 filas.
- **Esquema privado:** el rol `authenticated` recibe `permission denied for schema rh_insights`.
- **Regla de pregunta jugable:** `approved` + `or_reviewed` sin referencia → `f`; con referencia → `t`.
- **Hallazgo de la v0:** con consulta libre, la supresión por celda se podía saltar por diferencia (27 − 22 = 5 en un segmento suprimido). Por eso la industria solo lee tablas publicadas con supresión complementaria.

Con la v0.1 ya aplicada, las primeras consultas de `01_` devuelven `not authorized`: es el comportamiento esperado.
