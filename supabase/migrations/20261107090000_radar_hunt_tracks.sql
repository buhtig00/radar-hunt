-- =============================================================================
-- RADAR HUNT — recorridos por perfil de liga (matriz de 8 estaciones por perfil).
-- Cada estación de un Hunt puede pertenecer a un recorrido: general, anterior, retina,
-- glaucoma, neuroped u oculoplastia. El banco de la matriz se carga con
-- supabase/seed/radar_hunt_hunt_matrix.sql (pendiente de validación Medical/KOL).
-- =============================================================================
alter table public.rh_event_stations add column if not exists track text
  check (track is null or length(track) <= 30);
