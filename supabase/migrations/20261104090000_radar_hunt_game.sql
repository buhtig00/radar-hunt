-- =============================================================================
-- RADAR HUNT — juego: verificación profesional, banco de preguntas, casos BOSS,
-- temporadas, 34 ligas, rondas, intentos, respuestas y competencias.
--
-- La lógica de puntuación y clasificación vive en el servidor (TypeScript,
-- src/lib/radar-hunt/*, con tests). Esta migración guarda los datos, fija los
-- tiempos en el servidor (rh_question_deliveries) y aplica RLS: el cliente nunca
-- escribe directamente en tablas de juego ni de verificación.
--
-- Reutiliza: public.or_ai_role / or_ai_user_roles (roles), oph_subspecialty,
-- oph_content_status y set_updated_at().
-- =============================================================================

do $$ begin
  create type public.rh_career_stage as enum ('resident','attending');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.rh_verification as enum ('unverified','pending','verified','rejected');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.rh_validation_level as enum ('ai_generated','or_reviewed','kol_verified');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.rh_round_kind as enum ('league_round','boss_challenge','practice','final');
exception when duplicate_object then null; end $$;

-- Ayudante de rol (security definer, search_path fijo)
create or replace function public.rh_has_role(roles public.or_ai_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select exists (select 1 from public.or_ai_user_roles r
                   where r.user_id = auth.uid() and r.is_active and r.role = any(roles))), false);
$$;

-- -----------------------------------------------------------------------------
-- 1. Perfil + verificación profesional
--    Datos pedidos: nombre, apellidos, nº de colegiado, correo, especialidad,
--    hospital (+ etapa profesional para asignar liga).
-- -----------------------------------------------------------------------------
create table if not exists public.rh_profiles (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  first_name              text not null,
  last_name               text not null,
  display_name            text generated always as (first_name || ' ' || last_name) stored,
  public_alias            text unique,
  show_in_public_ranking  boolean not null default true,
  license_number          text not null,                 -- normalizado (solo dígitos)
  license_college         text,                          -- colegio provincial (recomendado)
  professional_email      text not null,
  specialty               text not null,
  hospital                text not null,
  career_stage            public.rh_career_stage not null,
  residency_year          smallint check (residency_year between 1 and 5),
  primary_subspecialty    public.oph_subspecialty,
  verification_status     public.rh_verification not null default 'pending',
  verification_signals    jsonb not null default '{}'::jsonb,
  submitted_at            timestamptz not null default now(),
  reviewed_at             timestamptz,
  reviewed_by             uuid references auth.users(id),
  reviewer_note           text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  check (career_stage <> 'resident' or residency_year is not null)
);
-- Un mismo número de colegiado no puede verificarse en dos cuentas.
create unique index if not exists rh_profiles_license_verified_uniq
  on public.rh_profiles (license_number) where verification_status = 'verified';
create index if not exists rh_profiles_status_idx on public.rh_profiles (verification_status, submitted_at);

create table if not exists public.rh_verification_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  action     text not null check (action in ('submitted','approved','rejected','resubmitted')),
  actor_id   uuid references auth.users(id),
  note       text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2. Banco de preguntas y casos BOSS
-- -----------------------------------------------------------------------------
create table if not exists public.rh_questions (
  id               text primary key,
  type             text not null default 'single_choice' check (type in ('single_choice','multiple_choice')),
  subspecialty     public.oph_subspecialty not null,
  career_level     text not null default 'both' check (career_level in ('resident','attending','both')),
  difficulty       smallint not null check (difficulty between 1 and 5),
  cognitive_level  text not null check (cognitive_level in ('recall','understanding','application','analysis')),
  structure        text,                                  -- código de estructura del Eye Universe
  stem             text not null,
  explanation      text not null,
  "references"     jsonb not null default '[]'::jsonb,    -- [{citation, url}]
  status           public.oph_content_status not null default 'pending_review',
  validation_level public.rh_validation_level not null default 'ai_generated',
  ai_assisted      boolean not null default false,
  is_boss_step     boolean not null default false,
  author_id        uuid references auth.users(id),
  reviewed_by      uuid references auth.users(id),
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists rh_questions_pool_idx on public.rh_questions (subspecialty, career_level, status);

create table if not exists public.rh_question_options (
  id          text primary key,
  question_id text not null references public.rh_questions(id) on delete cascade,
  position    smallint not null,
  text        text not null,
  is_correct  boolean not null default false,
  unique (question_id, position)
);

-- Regla de competición: aprobada + revisada/validada + con referencia
create or replace function public.rh_question_playable(q public.rh_questions)
returns boolean language sql stable as $$
  select q.status = 'approved'
     and q.validation_level in ('or_reviewed','kol_verified')
     and jsonb_array_length(q."references") > 0;
$$;

create table if not exists public.rh_boss_cases (
  id               text primary key,
  title            text not null,
  subspecialty     public.oph_subspecialty not null,
  career_level     text not null default 'both' check (career_level in ('resident','attending','both')),
  intro            text not null,
  status           public.oph_content_status not null default 'pending_review',
  validation_level public.rh_validation_level not null default 'ai_generated',
  created_at       timestamptz not null default now()
);

create table if not exists public.rh_boss_steps (
  case_id     text not null references public.rh_boss_cases(id) on delete cascade,
  step_no     smallint not null,
  reveal      text not null,
  question_id text not null references public.rh_questions(id),
  primary key (case_id, step_no)
);

-- -----------------------------------------------------------------------------
-- 3. Temporadas, ligas y rondas
-- -----------------------------------------------------------------------------
create table if not exists public.rh_seasons (
  id        text primary key,
  name      text not null,
  starts_at timestamptz not null,
  ends_at   timestamptz not null,
  check (ends_at > starts_at)
);

create table if not exists public.rh_leagues (
  id            text primary key,                         -- '{season}:{subspecialty}:{career}'
  season_id     text not null references public.rh_seasons(id) on delete cascade,
  subspecialty  public.oph_subspecialty not null,
  career_stage  public.rh_career_stage not null,
  name          text not null,
  rules         jsonb not null,
  unique (season_id, subspecialty, career_stage)
);

create table if not exists public.rh_rounds (
  id         text primary key,
  kind       public.rh_round_kind not null,
  league_id  text references public.rh_leagues(id) on delete cascade,
  boss_case_id text references public.rh_boss_cases(id) on delete cascade,
  number     smallint,
  title      text not null,
  opens_at   timestamptz not null,
  closes_at  timestamptz not null,
  published_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (closes_at > opens_at)
);
create index if not exists rh_rounds_league_idx on public.rh_rounds (league_id, number);

create table if not exists public.rh_round_questions (
  round_id    text not null references public.rh_rounds(id) on delete cascade,
  position    smallint not null,
  question_id text not null references public.rh_questions(id),
  primary key (round_id, position),
  unique (round_id, question_id)
);

-- -----------------------------------------------------------------------------
-- 4. Intentos, entregas (reloj del servidor) y respuestas
-- -----------------------------------------------------------------------------
create table if not exists public.rh_attempts (
  id            uuid primary key default gen_random_uuid(),
  round_id      text not null references public.rh_rounds(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  started_at    timestamptz not null default now(),
  submitted_at  timestamptz,
  total_score   numeric(10,2) not null default 0,
  correct_count integer not null default 0,
  total_ms      bigint not null default 0,
  unique (round_id, user_id)
);
create index if not exists rh_attempts_user_idx on public.rh_attempts (user_id);

create table if not exists public.rh_question_deliveries (
  attempt_id   uuid not null references public.rh_attempts(id) on delete cascade,
  question_id  text not null references public.rh_questions(id),
  delivered_at timestamptz not null default now(),
  primary key (attempt_id, question_id)
);

create table if not exists public.rh_answers (
  attempt_id     uuid not null references public.rh_attempts(id) on delete cascade,
  question_id    text not null references public.rh_questions(id),
  selected       text[] not null,
  is_correct     boolean not null,
  partial_credit numeric(4,3) not null,
  response_ms    integer not null,
  points         numeric(8,2) not null,
  answered_at    timestamptz not null default now(),
  primary key (attempt_id, question_id)
);

create table if not exists public.rh_question_flags (       -- impugnaciones
  id          bigint generated always as identity primary key,
  question_id text not null references public.rh_questions(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  reason      text not null check (length(reason) between 5 and 2000),
  status      text not null default 'open' check (status in ('open','accepted','rejected')),
  created_at  timestamptz not null default now(),
  unique (question_id, user_id)
);

-- -----------------------------------------------------------------------------
-- 5. Competencias (formación personalizada)
-- -----------------------------------------------------------------------------
create table if not exists public.rh_competency (
  user_id      uuid not null references auth.users(id) on delete cascade,
  subspecialty public.oph_subspecialty not null,
  rating       numeric(7,1) not null default 1000,
  items        integer not null default 0,
  correct      integer not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (user_id, subspecialty)
);

-- -----------------------------------------------------------------------------
-- 6. RLS
--    Lecturas propias vía políticas; TODAS las escrituras van por funciones de
--    servidor con service_role (que validan, puntúan y auditan).
-- -----------------------------------------------------------------------------
alter table public.rh_profiles            enable row level security;
alter table public.rh_verification_events enable row level security;
alter table public.rh_questions           enable row level security;
alter table public.rh_question_options    enable row level security;
alter table public.rh_boss_cases          enable row level security;
alter table public.rh_boss_steps          enable row level security;
alter table public.rh_seasons             enable row level security;
alter table public.rh_leagues             enable row level security;
alter table public.rh_rounds              enable row level security;
alter table public.rh_round_questions     enable row level security;
alter table public.rh_attempts            enable row level security;
alter table public.rh_question_deliveries enable row level security;
alter table public.rh_answers             enable row level security;
alter table public.rh_question_flags      enable row level security;
alter table public.rh_competency          enable row level security;

drop policy if exists rh_profiles_read on public.rh_profiles;
create policy rh_profiles_read on public.rh_profiles for select to authenticated
  using (user_id = auth.uid() or public.rh_has_role(array['admin','medical_editor']::public.or_ai_role[]));

drop policy if exists rh_verif_events_read on public.rh_verification_events;
create policy rh_verif_events_read on public.rh_verification_events for select to authenticated
  using (user_id = auth.uid() or public.rh_has_role(array['admin','medical_editor']::public.or_ai_role[]));

-- Banco: solo editorial (los jugadores reciben preguntas por función de servidor,
-- sin la marca de correcta).
drop policy if exists rh_questions_editorial on public.rh_questions;
create policy rh_questions_editorial on public.rh_questions for select to authenticated
  using (public.rh_has_role(array['admin','medical_editor','kol']::public.or_ai_role[]));
drop policy if exists rh_options_editorial on public.rh_question_options;
create policy rh_options_editorial on public.rh_question_options for select to authenticated
  using (public.rh_has_role(array['admin','medical_editor','kol']::public.or_ai_role[]));

-- Catálogo público de temporada/ligas/rondas/casos (metadatos, sin preguntas)
drop policy if exists rh_seasons_read on public.rh_seasons;
create policy rh_seasons_read on public.rh_seasons for select to anon, authenticated using (true);
drop policy if exists rh_leagues_read on public.rh_leagues;
create policy rh_leagues_read on public.rh_leagues for select to anon, authenticated using (true);
drop policy if exists rh_rounds_read on public.rh_rounds;
create policy rh_rounds_read on public.rh_rounds for select to authenticated using (true);
drop policy if exists rh_boss_read on public.rh_boss_cases;
create policy rh_boss_read on public.rh_boss_cases for select to authenticated using (true);

-- Juego: cada uno ve lo suyo
drop policy if exists rh_attempts_self on public.rh_attempts;
create policy rh_attempts_self on public.rh_attempts for select to authenticated using (user_id = auth.uid());
drop policy if exists rh_answers_self on public.rh_answers;
create policy rh_answers_self on public.rh_answers for select to authenticated
  using (exists (select 1 from public.rh_attempts a where a.id = attempt_id and a.user_id = auth.uid()));
drop policy if exists rh_competency_self on public.rh_competency;
create policy rh_competency_self on public.rh_competency for select to authenticated using (user_id = auth.uid());
drop policy if exists rh_flags_self on public.rh_question_flags;
create policy rh_flags_self on public.rh_question_flags for select to authenticated
  using (user_id = auth.uid() or public.rh_has_role(array['admin','medical_editor','kol']::public.or_ai_role[]));
-- rh_round_questions y rh_question_deliveries: sin políticas (solo service_role).

grant select on public.rh_seasons, public.rh_leagues to anon;
grant select on public.rh_profiles, public.rh_verification_events, public.rh_questions, public.rh_question_options,
  public.rh_boss_cases, public.rh_seasons, public.rh_leagues, public.rh_rounds, public.rh_attempts,
  public.rh_answers, public.rh_question_flags, public.rh_competency to authenticated;
grant all on all tables in schema public to service_role;

-- updated_at
drop trigger if exists trg_rh_profiles_updated_at on public.rh_profiles;
create trigger trg_rh_profiles_updated_at before update on public.rh_profiles
  for each row execute function public.set_updated_at();
drop trigger if exists trg_rh_questions_updated_at on public.rh_questions;
create trigger trg_rh_questions_updated_at before update on public.rh_questions
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 7. Semilla: temporada 2026–2027 y las 34 ligas (17 subespecialidades × 2)
-- -----------------------------------------------------------------------------
insert into public.rh_seasons (id, name, starts_at, ends_at)
values ('season-2026-27', 'Temporada 2026–2027', '2026-11-02T00:00:00Z', '2027-06-30T23:59:59Z')
on conflict (id) do nothing;

insert into public.rh_leagues (id, season_id, subspecialty, career_stage, name, rules)
select 'season-2026-27:' || s::text || ':' || c::text,
       'season-2026-27', s, c,
       'Liga ' || s::text || ' · ' || case c when 'resident' then 'Residentes' else 'Adjuntos' end,
       '{"bestN":8,"totalRounds":10,"finalistsK":16,"speedLambda":0.5,"timeLimitS":30,"questionsPerRound":5}'::jsonb
from unnest(enum_range(null::public.oph_subspecialty)) s
cross join unnest(enum_range(null::public.rh_career_stage)) c
on conflict (id) do nothing;
