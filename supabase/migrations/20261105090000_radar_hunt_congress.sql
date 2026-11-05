-- =============================================================================
-- RADAR HUNT — modo congreso (pilar 3): eventos, estaciones con QR, inscripción con
-- consentimientos separados, visitas, sesiones en directo (retos y encuestas de sala),
-- estado en vivo, respuestas, valoración del congreso y auditoría.
--
-- Principios (ARQUITECTURA-Radar-Hunt.md §4.3 y §8):
-- - El cliente nunca escribe en estas tablas: todo pasa por funciones de servidor
--   (service_role), que miden el tiempo y puntúan.
-- - Los tokens de los QR no son legibles por ningún cliente (solo service_role).
-- - Sin geolocalización. Sin premios en metálico. Las encuestas de sala no son
--   estudios de mercado (eso es D6, con su propio consentimiento y esquema).
-- - Las respuestas en sala son visibles solo para su autor; la organización ve
--   agregados (funciones de servidor).
--
-- Depende de 20261104090000_radar_hunt_game.sql (rh_rounds, rh_has_role, enums).
-- =============================================================================

-- Nuevo tipo de ronda: reto de estación (no se usa en esta misma transacción).
alter type public.rh_round_kind add value if not exists 'congress_station';

-- -----------------------------------------------------------------------------
-- 1. Eventos, organización y estaciones
-- -----------------------------------------------------------------------------
create table if not exists public.rh_events (
  id             text primary key,
  slug           text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,60}$'),
  name           text not null,
  venue          text not null default '',
  city           text not null default '',
  timezone       text not null default 'Europe/Madrid',
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  game_opens_at  timestamptz not null,
  game_closes_at timestamptz not null,
  status         text not null default 'draft' check (status in ('draft','published','closed')),
  floors         jsonb not null default '[]'::jsonb,   -- plantas y salas (coordenadas 0–100)
  sponsors       jsonb not null default '[]'::jsonb,   -- [{name, disclosure}] siempre con transparencia
  recognition    text not null default '',             -- política de reconocimiento (no monetario)
  is_demo        boolean not null default false,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (ends_at > starts_at),
  check (game_closes_at > game_opens_at)
);

-- Moderadores y organizadores de un evento concreto (además de admin/medical_editor).
create table if not exists public.rh_event_staff (
  event_id   text not null references public.rh_events(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'moderator' check (role in ('moderator','organizer')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table if not exists public.rh_event_stations (
  id           text primary key,
  event_id     text not null references public.rh_events(id) on delete cascade,
  label        text not null,
  title        text not null,
  description  text not null default '',
  floor_id     text not null,
  x            numeric(5,2) not null check (x between 0 and 100),
  y            numeric(5,2) not null check (y between 0 and 100),
  subspecialty public.oph_subspecialty not null,
  question_ids text[] not null default '{}',
  sponsor      jsonb,                                  -- {name, disclosure} o null
  active       boolean not null default true,
  updated_at   timestamptz not null default now(),
  check (cardinality(question_ids) <= 5)
);
create index if not exists rh_event_stations_event_idx on public.rh_event_stations (event_id);

-- Token del QR (100 bits, rotable). Solo service_role: ningún cliente puede leerlo.
create table if not exists public.rh_station_tokens (
  station_id text primary key references public.rh_event_stations(id) on delete cascade,
  token      text not null unique check (token ~ '^[0-9A-HJKMNP-TV-Z]{20}$'),
  code8      text generated always as (left(token, 8)) stored,
  rotated_at timestamptz not null default now()
);
create index if not exists rh_station_tokens_code_idx on public.rh_station_tokens (code8);

-- Rondas de estación: enlazadas al evento.
alter table public.rh_rounds add column if not exists event_id text references public.rh_events(id) on delete cascade;
create index if not exists rh_rounds_event_idx on public.rh_rounds (event_id);

-- -----------------------------------------------------------------------------
-- 2. Participantes (consentimientos separados) y visitas a estaciones
-- -----------------------------------------------------------------------------
create table if not exists public.rh_event_participants (
  event_id               text not null references public.rh_events(id) on delete cascade,
  user_id                uuid not null references auth.users(id) on delete cascade,
  display_name           text not null check (length(display_name) between 1 and 80),
  alias                  text check (alias is null or length(alias) <= 40),
  hospital               text check (hospital is null or length(hospital) <= 120),
  career_stage           public.rh_career_stage,
  joined_at              timestamptz not null default now(),
  consent_participation  boolean not null check (consent_participation),   -- obligatorio
  consent_public_ranking boolean not null default false,                   -- opcional
  consent_communications boolean not null default false,                   -- opcional (solo OR)
  consents_updated_at    timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table if not exists public.rh_station_visits (
  station_id text not null references public.rh_event_stations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  event_id   text not null references public.rh_events(id) on delete cascade,
  scanned_at timestamptz not null default now(),
  primary key (station_id, user_id)
);
create index if not exists rh_station_visits_event_idx on public.rh_station_visits (event_id);

-- -----------------------------------------------------------------------------
-- 3. Directo: sesiones, estado en vivo (única fuente de verdad) y respuestas
-- -----------------------------------------------------------------------------
create table if not exists public.rh_event_sessions (
  id         text primary key,
  event_id   text not null references public.rh_events(id) on delete cascade,
  title      text not null,
  room       text not null default '',
  speaker    text,
  starts_at  timestamptz,
  items      jsonb not null default '[]'::jsonb,   -- [{id, kind: quiz|poll, questionId?, prompt?, options?, timeLimitS}]
  updated_at timestamptz not null default now()
);
create index if not exists rh_event_sessions_event_idx on public.rh_event_sessions (event_id);

create table if not exists public.rh_live_state (
  session_id text primary key references public.rh_event_sessions(id) on delete cascade,
  item_index integer not null default -1,
  phase      text not null default 'idle' check (phase in ('idle','open','closed','reveal','leaderboard','ended')),
  opened_at  timestamptz,
  ends_at    timestamptz,
  version    integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.rh_live_answers (
  session_id  text not null references public.rh_event_sessions(id) on delete cascade,
  item_id     text not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  selected    text[] not null,
  response_ms integer not null check (response_ms >= 0),
  is_correct  boolean not null default false,
  points      numeric(8,2) not null default 0,
  answered_at timestamptz not null default now(),
  primary key (session_id, item_id, user_id)          -- una respuesta por persona e ítem
);

-- -----------------------------------------------------------------------------
-- 4. Valoración del congreso (no comercial) y auditoría
-- -----------------------------------------------------------------------------
create table if not exists public.rh_event_feedback (
  event_id     text not null references public.rh_events(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  overall      smallint not null check (overall between 1 and 5),
  stations     smallint not null check (stations between 1 and 5),
  live         smallint not null check (live between 1 and 5),
  recommend    smallint not null check (recommend between 0 and 10),
  comment      text check (comment is null or length(comment) <= 500),
  submitted_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table if not exists public.rh_audit_log (
  id       bigserial primary key,
  at       timestamptz not null default now(),
  actor_id uuid,
  action   text not null,
  details  jsonb not null default '{}'::jsonb
);
create index if not exists rh_audit_log_at_idx on public.rh_audit_log (at desc);

-- -----------------------------------------------------------------------------
-- 5. RLS: lectura mínima; ninguna escritura desde el cliente
-- -----------------------------------------------------------------------------
alter table public.rh_events             enable row level security;
alter table public.rh_event_staff        enable row level security;
alter table public.rh_event_stations     enable row level security;
alter table public.rh_station_tokens     enable row level security;
alter table public.rh_event_participants enable row level security;
alter table public.rh_station_visits     enable row level security;
alter table public.rh_event_sessions     enable row level security;
alter table public.rh_live_state         enable row level security;
alter table public.rh_live_answers       enable row level security;
alter table public.rh_event_feedback     enable row level security;
alter table public.rh_audit_log          enable row level security;

create or replace function public.rh_is_event_staff(ev text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.rh_has_role(array['admin','medical_editor']::public.or_ai_role[])
      or exists (select 1 from public.rh_event_staff s where s.event_id = ev and s.user_id = auth.uid());
$$;

drop policy if exists rh_events_read on public.rh_events;
create policy rh_events_read on public.rh_events for select to anon, authenticated
  using (status <> 'draft' or public.rh_is_event_staff(id));

drop policy if exists rh_event_staff_read on public.rh_event_staff;
create policy rh_event_staff_read on public.rh_event_staff for select to authenticated
  using (user_id = auth.uid() or public.rh_is_event_staff(event_id));

drop policy if exists rh_event_stations_read on public.rh_event_stations;
create policy rh_event_stations_read on public.rh_event_stations for select to anon, authenticated
  using ((active and exists (select 1 from public.rh_events e where e.id = event_id and e.status <> 'draft'))
         or public.rh_is_event_staff(event_id));
-- rh_station_tokens y rh_audit_log: sin políticas (solo service_role).

drop policy if exists rh_event_participants_self on public.rh_event_participants;
create policy rh_event_participants_self on public.rh_event_participants for select to authenticated
  using (user_id = auth.uid() or public.rh_is_event_staff(event_id));

drop policy if exists rh_station_visits_self on public.rh_station_visits;
create policy rh_station_visits_self on public.rh_station_visits for select to authenticated
  using (user_id = auth.uid());

drop policy if exists rh_event_sessions_read on public.rh_event_sessions;
create policy rh_event_sessions_read on public.rh_event_sessions for select to authenticated
  using (exists (select 1 from public.rh_events e where e.id = event_id and e.status <> 'draft')
         or public.rh_is_event_staff(event_id));

-- La fase es pública (para suscribirse por Realtime): no contiene respuestas.
drop policy if exists rh_live_state_read on public.rh_live_state;
create policy rh_live_state_read on public.rh_live_state for select to anon, authenticated using (true);

drop policy if exists rh_live_answers_self on public.rh_live_answers;
create policy rh_live_answers_self on public.rh_live_answers for select to authenticated
  using (user_id = auth.uid());

drop policy if exists rh_event_feedback_self on public.rh_event_feedback;
create policy rh_event_feedback_self on public.rh_event_feedback for select to authenticated
  using (user_id = auth.uid());

grant select on public.rh_events, public.rh_event_stations, public.rh_live_state to anon;
grant select on public.rh_events, public.rh_event_staff, public.rh_event_stations,
  public.rh_event_participants, public.rh_station_visits, public.rh_event_sessions,
  public.rh_live_state, public.rh_live_answers, public.rh_event_feedback to authenticated;
revoke all on public.rh_station_tokens, public.rh_audit_log from anon, authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- updated_at
drop trigger if exists trg_rh_events_updated_at on public.rh_events;
create trigger trg_rh_events_updated_at before update on public.rh_events
  for each row execute function public.set_updated_at();
drop trigger if exists trg_rh_event_stations_updated_at on public.rh_event_stations;
create trigger trg_rh_event_stations_updated_at before update on public.rh_event_stations
  for each row execute function public.set_updated_at();
drop trigger if exists trg_rh_event_sessions_updated_at on public.rh_event_sessions;
create trigger trg_rh_event_sessions_updated_at before update on public.rh_event_sessions
  for each row execute function public.set_updated_at();
drop trigger if exists trg_rh_live_state_updated_at on public.rh_live_state;
create trigger trg_rh_live_state_updated_at before update on public.rh_live_state
  for each row execute function public.set_updated_at();

-- Realtime: solo el cambio de fase (si existe la publicación de Supabase).
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and tablename = 'rh_live_state') then
    execute 'alter publication supabase_realtime add table public.rh_live_state';
  end if;
end $$;
