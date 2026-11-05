-- =============================================================================
-- RADAR HUNT — temporada e industria.
-- 1) Solicitudes de propuesta desde la página «Industria» (sin acceso de clientes:
--    solo service_role escribe y solo la organización lee).
-- 2) Puntuación por acierto: las ligas dejan de dar bonus de rapidez (speedLambda 0).
--    La rapidez tampoco desempata (lógica en el servidor, src/lib/radar-hunt/ranking.ts).
-- =============================================================================

create table if not exists public.rh_proposal_requests (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),
  name         text not null check (length(name) between 2 and 80),
  organization text not null check (length(organization) between 2 and 120),
  role         text not null default '' check (length(role) <= 80),
  kind         text not null check (kind in ('sociedad','congreso','industria','otro')),
  email        text not null check (length(email) <= 120 and email like '%@%'),
  message      text not null check (length(message) between 10 and 1500),
  consent_at   timestamptz not null,
  handled_at   timestamptz,
  handled_by   uuid references auth.users(id)
);
alter table public.rh_proposal_requests enable row level security;
drop policy if exists rh_proposal_requests_staff on public.rh_proposal_requests;
create policy rh_proposal_requests_staff on public.rh_proposal_requests for select to authenticated
  using (public.rh_has_role(array['admin','medical_editor']::public.or_ai_role[]));
grant select on public.rh_proposal_requests to authenticated;
grant all on public.rh_proposal_requests to service_role;
grant usage, select on sequence public.rh_proposal_requests_id_seq to service_role;

update public.rh_leagues
   set rules = jsonb_set(rules, '{speedLambda}', '0'::jsonb)
 where (rules->>'speedLambda')::numeric <> 0;
