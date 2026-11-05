-- RADAR HUNT — Eye Universe por especialidades: progreso de las estaciones de los Hunts.
-- Una fila por usuario y estación (GEN-01 … OCP-05) con el mejor resultado de su práctica.
-- Las escrituras van por funciones de servidor (service_role); el usuario solo lee lo suyo.

create table if not exists public.rh_eye_progress (
  user_id       uuid not null references auth.users(id) on delete cascade,
  station_code  text not null check (station_code ~ '^[A-Z]{3}-[0-9]{2}$'),
  best_correct  integer not null default 0 check (best_correct >= 0),
  total         integer not null default 0 check (total >= 0 and best_correct <= total),
  attempts      integer not null default 0 check (attempts >= 0),
  completed_at  timestamptz not null default now(),
  primary key (user_id, station_code)
);

alter table public.rh_eye_progress enable row level security;

drop policy if exists rh_eye_progress_self on public.rh_eye_progress;
create policy rh_eye_progress_self on public.rh_eye_progress for select to authenticated
  using (user_id = auth.uid());

revoke insert, update, delete on public.rh_eye_progress from anon, authenticated;
