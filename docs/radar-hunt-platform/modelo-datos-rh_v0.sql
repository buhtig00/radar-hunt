-- =============================================================================
-- RADAR HUNT — modelo de datos v0 (BORRADOR, NO APLICAR)
-- -----------------------------------------------------------------------------
-- Propuesta de esquema para ligas, retos BOSS, congresos en directo, inteligencia
-- de mercado, formación personalizada y Eye Universe, construida sobre el motor
-- existente de Ophthalmology Radar.
--
-- Reutiliza (ya existen en supabase/migrations):
--   public.or_ai_role, public.or_ai_user_roles, public.oph_has_clinical_access()
--   public.oph_subspecialty, public.oph_content_status
--   public.oph_references, public.oph_anatomical_sites, public.oph_pathologies
--   public.set_updated_at()
--
-- Este archivo vive en docs/ a propósito: NO está en supabase/migrations y no se
-- aplica. Cuando se apruebe, se dividirá en migraciones por fase (ver
-- ARQUITECTURA-Radar-Hunt.md §12) y se revisarán todas las políticas RLS.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Tipos
-- ---------------------------------------------------------------------------
create type public.rh_career_stage      as enum ('student','resident','fellow','attending','other_hcp');
create type public.rh_verification      as enum ('unverified','pending','verified','rejected');
create type public.rh_verification_method as enum ('license_number','institution_email','society_membership','document','manual');
create type public.rh_org_type          as enum ('society','sponsor','organizer','institution','platform');
create type public.rh_org_role          as enum ('owner','admin','editor','moderator','analyst','member');
create type public.rh_validation_level  as enum ('ai_generated','or_reviewed','kol_verified');
create type public.rh_question_type     as enum ('single_choice','multiple_choice','image_choice','ordering','numeric');
create type public.rh_career_level      as enum ('resident','attending','both');
create type public.rh_cognitive_level   as enum ('recall','understanding','application','analysis');
create type public.rh_review_decision   as enum ('approve','request_changes','reject');
create type public.rh_flag_status       as enum ('open','accepted','rejected');
create type public.rh_season_status     as enum ('draft','scheduled','active','finished','archived');
create type public.rh_round_kind        as enum ('league_round','boss_challenge','live_challenge','final','practice');
create type public.rh_round_status      as enum ('draft','scheduled','open','closed','scored','cancelled');
create type public.rh_attempt_status    as enum ('in_progress','submitted','expired','voided');
create type public.rh_event_status      as enum ('draft','published','live','finished','archived');
create type public.rh_join_via          as enum ('qr','code','link','invite');
create type public.rh_live_phase        as enum ('idle','question_open','reveal','leaderboard','poll_open','paused');
create type public.rh_sponsor_slot      as enum ('event_main','session','league','challenge','screen_break','report');

-- Los roles de plataforma siguen en or_ai_role (admin, medical_editor, kol,
-- verified_doctor, industry_user). Los roles por organización van en rh_org_members.

-- ---------------------------------------------------------------------------
-- 1. Identidad, verificación y organizaciones (D1)
-- ---------------------------------------------------------------------------
create table public.rh_profiles (
  user_id               uuid primary key references auth.users(id) on delete cascade,
  display_name          text not null,
  public_alias          text unique,                       -- nombre en clasificaciones públicas
  show_in_public_ranking boolean not null default true,
  country_code          char(2),
  preferred_language    text not null default 'es' check (preferred_language in ('es','en')),
  career_stage          public.rh_career_stage not null,
  residency_year        smallint check (residency_year between 1 and 6),
  years_experience_band text check (years_experience_band in ('0-5','6-10','11-20','>20')),
  primary_subspecialty  public.oph_subspecialty,
  institution           text,
  verification_status   public.rh_verification not null default 'unverified',
  verified_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table public.rh_verification_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  method      public.rh_verification_method not null,
  evidence    jsonb not null default '{}'::jsonb,          -- mínimo imprescindible; nunca documentos en claro aquí (Storage privado)
  status      public.rh_verification not null default 'pending',
  reviewer_id uuid references auth.users(id),
  reviewed_at timestamptz,
  notes       text,
  created_at  timestamptz not null default now()
);

create table public.rh_organizations (
  id          uuid primary key default gen_random_uuid(),
  type        public.rh_org_type not null,
  name        text not null,
  country_code char(2),
  website     text,
  logo_path   text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (type, name)
);

create table public.rh_org_members (
  org_id     uuid not null references public.rh_organizations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  org_role   public.rh_org_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- Ayudantes de autorización (security definer, search_path fijo)
create or replace function public.rh_has_platform_role(roles public.or_ai_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.or_ai_user_roles r
                 where r.user_id = auth.uid() and r.is_active and r.role = any(roles));
$$;

create or replace function public.rh_is_org_member(p_org uuid, roles public.rh_org_role[] default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.rh_org_members m
                 where m.org_id = p_org and m.user_id = auth.uid()
                   and (roles is null or m.org_role = any(roles)));
$$;

create or replace function public.rh_is_verified()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select p.verification_status = 'verified' from public.rh_profiles p where p.user_id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------------
-- 2. Banco de preguntas y casos BOSS (D3)
-- ---------------------------------------------------------------------------
create table public.rh_questions (
  id                  uuid primary key default gen_random_uuid(),
  type                public.rh_question_type not null default 'single_choice',
  stem_es             text not null,
  stem_en             text,
  explanation_es      text not null,
  explanation_en      text,
  media               jsonb not null default '[]'::jsonb,   -- imágenes (Storage) con licencia/consentimiento documentado
  subspecialty        public.oph_subspecialty not null,
  career_level        public.rh_career_level not null default 'both',
  difficulty_declared smallint not null check (difficulty_declared between 1 and 5),
  cognitive_level     public.rh_cognitive_level not null,
  anatomical_site_id  uuid references public.oph_anatomical_sites(id),
  pathology_id        uuid references public.oph_pathologies(id),
  status              public.oph_content_status not null default 'draft',
  validation_level    public.rh_validation_level not null default 'ai_generated',
  ai_assisted         boolean not null default false,
  author_id           uuid references auth.users(id),
  version             integer not null default 1,
  -- calibración (la rellena el trabajo programado)
  n_responses         integer not null default 0,
  p_value             numeric(5,4),                        -- proporción de aciertos
  discrimination      numeric(5,4),                        -- punto-biserial
  irt_difficulty      numeric(6,3),
  irt_discrimination  numeric(6,3),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  retired_at          timestamptz
);

create table public.rh_question_options (
  id            uuid primary key default gen_random_uuid(),
  question_id   uuid not null references public.rh_questions(id) on delete cascade,
  position      smallint not null,
  text_es       text not null,
  text_en       text,
  is_correct    boolean not null default false,
  rationale_es  text,
  rationale_en  text,
  unique (question_id, position)
);

create table public.rh_question_references (
  question_id  uuid not null references public.rh_questions(id) on delete cascade,
  reference_id uuid not null references public.oph_references(id),
  primary key (question_id, reference_id)
);

create table public.rh_question_reviews (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.rh_questions(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id),
  reviewer_role public.or_ai_role not null,                -- medical_editor | kol
  decision    public.rh_review_decision not null,
  comments    text,
  created_at  timestamptz not null default now()
);

create table public.rh_question_flags (                    -- impugnaciones
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.rh_questions(id) on delete cascade,
  round_id    uuid,                                        -- fk añadida tras crear rh_rounds
  user_id     uuid not null references auth.users(id) on delete cascade,
  reason      text not null,
  status      public.rh_flag_status not null default 'open',
  resolved_by uuid references auth.users(id),
  resolution  text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.rh_cases (                             -- retos BOSS (casos en varios pasos)
  id               uuid primary key default gen_random_uuid(),
  title_es         text not null,
  title_en         text,
  intro_es         text not null,
  intro_en         text,
  media            jsonb not null default '[]'::jsonb,
  subspecialty     public.oph_subspecialty not null,
  career_level     public.rh_career_level not null default 'both',
  status           public.oph_content_status not null default 'draft',
  validation_level public.rh_validation_level not null default 'ai_generated',
  author_id        uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.rh_case_steps (
  case_id     uuid not null references public.rh_cases(id) on delete cascade,
  step_no     smallint not null,
  reveal_es   text,                                        -- información nueva que se revela en este paso
  reveal_en   text,
  question_id uuid not null references public.rh_questions(id),
  primary key (case_id, step_no)
);

-- Regla de activación: approved + ≥1 referencia + validación humana
create or replace function public.rh_question_is_playable(q public.rh_questions)
returns boolean language sql stable as $$
  select q.status = 'approved'
     and q.validation_level in ('or_reviewed','kol_verified')
     and q.retired_at is null
     and exists (select 1 from public.rh_question_references r where r.question_id = q.id);
$$;

-- ---------------------------------------------------------------------------
-- 3. Competición (D4)
-- ---------------------------------------------------------------------------
create table public.rh_seasons (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  year       smallint not null,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  status     public.rh_season_status not null default 'draft',
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.rh_leagues (
  id               uuid primary key default gen_random_uuid(),
  season_id        uuid not null references public.rh_seasons(id) on delete cascade,
  subspecialty     public.oph_subspecialty not null,
  career_level     public.rh_career_level not null,         -- resident | attending (ligas separadas)
  name             text not null,
  organizer_org_id uuid references public.rh_organizations(id),
  rules            jsonb not null default '{"best_n_of_m": {"n": 8, "m": 10}, "finalists_k": 16, "speed_lambda": 0.5}'::jsonb,
  status           public.rh_season_status not null default 'draft',
  created_at       timestamptz not null default now(),
  unique (season_id, subspecialty, career_level)
);

create table public.rh_league_entries (
  league_id  uuid not null references public.rh_leagues(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  is_finalist boolean not null default false,
  primary key (league_id, user_id)
);

-- Eventos antes que rondas (una ronda puede pertenecer a una sesión de congreso)
create table public.rh_events (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  city             text,
  venue            text,
  starts_on        date not null,
  ends_on          date not null,
  organizer_org_id uuid references public.rh_organizations(id),
  society_org_id   uuid references public.rh_organizations(id),
  join_code        text not null unique,                   -- para /e/{codigo} y QR
  branding         jsonb not null default '{}'::jsonb,
  status           public.rh_event_status not null default 'draft',
  created_at       timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create table public.rh_event_sessions (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.rh_events(id) on delete cascade,
  title        text not null,
  speakers     text,
  room         text,
  subspecialty public.oph_subspecialty,
  starts_at    timestamptz,
  ends_at      timestamptz
);

create table public.rh_event_participants (
  event_id      uuid not null references public.rh_events(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  joined_via    public.rh_join_via not null default 'qr',
  checked_in_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table public.rh_rounds (
  id               uuid primary key default gen_random_uuid(),
  kind             public.rh_round_kind not null,
  league_id        uuid references public.rh_leagues(id) on delete cascade,
  event_session_id uuid references public.rh_event_sessions(id) on delete cascade,
  title            text not null,
  opens_at         timestamptz,
  closes_at        timestamptz,
  status           public.rh_round_status not null default 'draft',
  created_at       timestamptz not null default now(),
  check ((league_id is not null)::int + (event_session_id is not null)::int <= 1)  -- liga O congreso (o práctica libre)
);

alter table public.rh_question_flags
  add constraint rh_question_flags_round_fk foreign key (round_id) references public.rh_rounds(id) on delete set null;

create table public.rh_round_items (
  id           uuid primary key default gen_random_uuid(),
  round_id     uuid not null references public.rh_rounds(id) on delete cascade,
  position     smallint not null,
  question_id  uuid references public.rh_questions(id),
  case_id      uuid references public.rh_cases(id),
  time_limit_s smallint not null default 30 check (time_limit_s between 5 and 600),
  is_voided    boolean not null default false,              -- impugnación aceptada → anulada para todos
  unique (round_id, position),
  check ((question_id is null) <> (case_id is null))
);

create table public.rh_attempts (
  id            uuid primary key default gen_random_uuid(),
  round_id      uuid not null references public.rh_rounds(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  device_id     text,                                       -- un dispositivo activo por intento
  started_at    timestamptz not null default now(),
  submitted_at  timestamptz,
  status        public.rh_attempt_status not null default 'in_progress',
  total_score   numeric(10,2) not null default 0,
  correct_count integer not null default 0,
  total_ms      bigint not null default 0,
  unique (round_id, user_id)
);

create table public.rh_answers (
  id             uuid primary key default gen_random_uuid(),
  attempt_id     uuid not null references public.rh_attempts(id) on delete cascade,
  round_item_id  uuid not null references public.rh_round_items(id) on delete cascade,
  case_step_no   smallint,                                  -- si el ítem es un caso BOSS
  delivered_at   timestamptz not null,                      -- hora de servidor al entregar el enunciado
  answered_at    timestamptz not null default now(),        -- hora de servidor al recibir
  selected       jsonb not null,                            -- ids de opción / orden / valor
  is_correct     boolean not null,
  partial_credit numeric(4,3) not null default 0,
  response_ms    integer not null,
  points         numeric(8,2) not null default 0,
  unique (attempt_id, round_item_id, case_step_no)
);

create table public.rh_leaderboard_entries (                -- materializada por trabajo/función
  scope_type text not null check (scope_type in ('round','league','event','season')),
  scope_id   uuid not null,
  user_id    uuid not null references auth.users(id) on delete cascade,
  score      numeric(12,2) not null,
  correct    integer not null,
  total_ms   bigint not null,
  rank       integer not null,
  updated_at timestamptz not null default now(),
  primary key (scope_type, scope_id, user_id)
);

create table public.rh_badges (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name_es     text not null,
  name_en     text,
  description_es text,
  criteria    jsonb not null default '{}'::jsonb
);

create table public.rh_user_badges (
  user_id   uuid not null references auth.users(id) on delete cascade,
  badge_id  uuid not null references public.rh_badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- ---------------------------------------------------------------------------
-- 4. Congreso en directo (D5)
-- ---------------------------------------------------------------------------
create table public.rh_live_state (                          -- única fuente de verdad de la fase
  session_id            uuid primary key references public.rh_event_sessions(id) on delete cascade,
  round_id              uuid references public.rh_rounds(id),
  current_round_item_id uuid references public.rh_round_items(id),
  current_poll_id       uuid,
  phase                 public.rh_live_phase not null default 'idle',
  phase_started_at      timestamptz,
  phase_ends_at         timestamptz,
  updated_by            uuid references auth.users(id),
  updated_at            timestamptz not null default now()
);

create table public.rh_polls (                               -- opinión de sala (NO estudios de mercado)
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.rh_event_sessions(id) on delete cascade,
  question_es text not null,
  question_en text,
  options     jsonb not null,                               -- [{id, text_es, text_en}]
  is_open     boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.rh_live_state
  add constraint rh_live_state_poll_fk foreign key (current_poll_id) references public.rh_polls(id) on delete set null;

create table public.rh_poll_votes (
  poll_id   uuid not null references public.rh_polls(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  option_id text not null,
  voted_at  timestamptz not null default now(),
  primary key (poll_id, user_id)
);

-- ---------------------------------------------------------------------------
-- 5. Patrocinio y transparencia (D9)
-- ---------------------------------------------------------------------------
create table public.rh_sponsorships (
  id              uuid primary key default gen_random_uuid(),
  sponsor_org_id  uuid not null references public.rh_organizations(id),
  slot            public.rh_sponsor_slot not null,
  event_id        uuid references public.rh_events(id) on delete cascade,
  session_id      uuid references public.rh_event_sessions(id) on delete cascade,
  league_id       uuid references public.rh_leagues(id) on delete cascade,
  asset_path      text,
  disclosure_es   text not null,                            -- transparencia obligatoria
  disclosure_en   text,
  starts_at       timestamptz,
  ends_at         timestamptz,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 6. Inteligencia de mercado (D6) — ESQUEMA PRIVADO, no expuesto por la API
-- ---------------------------------------------------------------------------
create schema if not exists rh_insights;
revoke all on schema rh_insights from public, anon, authenticated;

create table rh_insights.studies (
  id              uuid primary key default gen_random_uuid(),
  sponsor_org_id  uuid not null references public.rh_organizations(id),
  title           text not null,
  objective       text not null,
  status          text not null default 'draft'
                  check (status in ('draft','in_review','approved','fielding','closed','reported','archived')),
  min_cell_size   integer not null default 20 check (min_cell_size >= 10),
  consent_text_es text not null,
  consent_text_en text,
  consent_version integer not null default 1,
  pseudonym_salt  bytea not null default gen_random_bytes(32),   -- secreto por estudio para la clave seudónima
  approved_by     uuid references auth.users(id),
  starts_at       timestamptz,
  ends_at         timestamptz,
  retention_until date,
  created_at      timestamptz not null default now()
);

create table rh_insights.study_items (
  id        uuid primary key default gen_random_uuid(),
  study_id  uuid not null references rh_insights.studies(id) on delete cascade,
  position  smallint not null,
  type      text not null check (type in ('single','multi','likert','ranking','open_text')),
  text_es   text not null,
  text_en   text,
  options   jsonb not null default '[]'::jsonb,
  unique (study_id, position)
);

create table rh_insights.consents (                          -- registro de consentimiento (con user_id: necesario para revocar)
  study_id        uuid not null references rh_insights.studies(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  consent_version integer not null,
  granted_at      timestamptz not null default now(),
  withdrawn_at    timestamptz,
  primary key (study_id, user_id)
);

create table rh_insights.respondents (                       -- seudónimo + segmento grueso; SIN user_id
  study_id       uuid not null references rh_insights.studies(id) on delete cascade,
  respondent_key bytea not null,                            -- hmac(user_id, pseudonym_salt)
  career_stage   public.rh_career_stage,
  country_code   char(2),
  subspecialty   public.oph_subspecialty,
  years_band     text,
  created_at     timestamptz not null default now(),
  primary key (study_id, respondent_key)
);

create table rh_insights.responses (
  id             uuid primary key default gen_random_uuid(),
  study_id       uuid not null references rh_insights.studies(id) on delete cascade,
  respondent_key bytea not null,
  item_id        uuid not null references rh_insights.study_items(id) on delete cascade,
  value          jsonb not null,
  created_at     timestamptz not null default now(),
  foreign key (study_id, respondent_key) references rh_insights.respondents(study_id, respondent_key) on delete cascade,
  unique (study_id, respondent_key, item_id)
);

-- Agregación INTERNA (analistas de Ophthalmology Radar = rol admin): recuentos de
-- celdas con n >= min_cell_size, group_by en lista blanca.
-- IMPORTANTE (prueba v0, 3 nov): la supresión por celda NO basta si la industria
-- puede consultar libremente. Una consulta sin segmentar y otra segmentada permiten
-- deducir por diferencia las celdas suprimidas, y el % revela el resto del segmento.
-- Por eso la industria NO llama a esta función. Recibe solo tablas publicadas
-- (rh_insights.released_tables) que un analista prepara, revisa (supresión
-- complementaria) y aprueba.
create or replace function public.rh_insights_aggregate(p_study uuid, p_item uuid, p_group_by text default null)
returns table (segment text, answer text, n bigint, pct numeric)
language plpgsql stable security definer set search_path = public, rh_insights as $$
declare
  v_min int; v_sponsor uuid;
begin
  select min_cell_size, sponsor_org_id into v_min, v_sponsor from rh_insights.studies where id = p_study;
  if v_min is null then raise exception 'study not found'; end if;
  if not public.rh_has_platform_role(array['admin']::public.or_ai_role[]) then   -- solo analistas internos
    raise exception 'not authorized';
  end if;
  if p_group_by is not null and p_group_by not in ('career_stage','country_code','subspecialty','years_band') then
    raise exception 'invalid group_by';
  end if;
  return query execute format($q$
    with base as (
      select coalesce(%s::text, 'all') as segment, r.value #>> '{}' as answer
      from rh_insights.responses r
      join rh_insights.respondents p on p.study_id = r.study_id and p.respondent_key = r.respondent_key
      join rh_insights.study_items i on i.id = r.item_id and i.type <> 'open_text'   -- el texto libre nunca sale en bruto
      where r.study_id = $1 and r.item_id = $2
    ), seg as (select segment, count(*) as seg_n from base group by segment)
    select b.segment, b.answer, count(*) as n,
           round(100.0 * count(*) / s.seg_n, 1) as pct
    from base b join seg s using (segment)
    group by b.segment, b.answer, s.seg_n
    having s.seg_n >= $3 and count(*) >= $3                    -- supresión de celdas pequeñas
    order by 1, 2
  $q$, coalesce('p.' || quote_ident(p_group_by), 'null'))
  using p_study, p_item, v_min;
  -- (Fase 4: registrar cada llamada en rh_audit_log)
end $$;

-- Tablas publicadas para el patrocinador: resultado revisado y aprobado de un estudio.
create table rh_insights.released_tables (
  id           uuid primary key default gen_random_uuid(),
  study_id     uuid not null references rh_insights.studies(id) on delete cascade,
  title        text not null,
  data         jsonb not null,          -- celdas ya con supresión primaria y complementaria
  sample_note  text not null,           -- tamaño de muestra, sesgos y límites declarados
  approved_by  uuid not null references auth.users(id),
  released_at  timestamptz not null default now()
);

-- Única puerta de lectura para la industria: tablas publicadas de SUS estudios.
create or replace function public.rh_insights_released(p_study uuid)
returns table (title text, data jsonb, sample_note text, released_at timestamptz)
language sql stable security definer set search_path = public, rh_insights as $$
  select t.title, t.data, t.sample_note, t.released_at
  from rh_insights.released_tables t
  join rh_insights.studies s on s.id = t.study_id
  where t.study_id = p_study
    and (public.rh_has_platform_role(array['admin']::public.or_ai_role[])
         or public.rh_is_org_member(s.sponsor_org_id, array['owner','admin','analyst']::public.rh_org_role[]))
  order by t.released_at;
$$;

-- ---------------------------------------------------------------------------
-- 7. Formación personalizada (D7)
-- ---------------------------------------------------------------------------
create table public.rh_competency (
  user_id       uuid not null references auth.users(id) on delete cascade,
  subspecialty  public.oph_subspecialty not null,
  ability       numeric(7,2) not null default 1000,         -- Elo inicial; luego TRI
  uncertainty   numeric(7,2) not null default 350,
  n_items       integer not null default 0,
  weak_topics   jsonb not null default '[]'::jsonb,          -- [{anatomical_site_id, cognitive_level, gap}]
  updated_at    timestamptz not null default now(),
  primary key (user_id, subspecialty)
);

create table public.rh_learning_paths (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  subspecialty public.oph_subspecialty not null,
  items        jsonb not null,      -- [{type: 'pathology'|'knowledge_source'|'eye_chapter'|'practice_round', id, why_es}]
  generated_at timestamptz not null default now(),
  dismissed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- 8. Eye Universe (D8) — común a la película interactiva y al futuro 3D
-- ---------------------------------------------------------------------------
create table public.rh_eye_chapters (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique,                   -- S01, S02A, S02P, S02Z, S02, S03, S04, S04C, S04D
  position           smallint not null unique,
  title_es           text not null,
  title_en           text,
  summary_es         text,
  summary_en         text,
  video_start_s      numeric(7,3) not null,
  video_end_s        numeric(7,3) not null,
  anatomical_site_id uuid references public.oph_anatomical_sites(id),
  subspecialties     public.oph_subspecialty[] not null default '{}',
  node_3d            text,                                   -- id del nodo en el glTF (fase 3D)
  check (video_end_s > video_start_s)
);

create table public.rh_eye_hotspots (
  id          uuid primary key default gen_random_uuid(),
  chapter_id  uuid not null references public.rh_eye_chapters(id) on delete cascade,
  t_start_s   numeric(7,3) not null,
  t_end_s     numeric(7,3) not null,
  x           numeric(4,3) not null check (x between 0 and 1),   -- posición normalizada en el fotograma
  y           numeric(4,3) not null check (y between 0 and 1),
  label_es    text not null,
  label_en    text,
  target_type text not null check (target_type in ('pathology','knowledge_source','anatomical_site','league','case','practice_round')),
  target_id   uuid not null,
  check (t_end_s > t_start_s)
);

-- ---------------------------------------------------------------------------
-- 9. Auditoría (D10)
-- ---------------------------------------------------------------------------
create table public.rh_audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid references auth.users(id),
  action     text not null,          -- p. ej. 'question.approve', 'flag.accept', 'insights.aggregate', 'verification.approve'
  entity     text not null,
  entity_id  uuid,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 10. RLS (patrón; completar tabla a tabla al migrar)
-- ---------------------------------------------------------------------------
alter table public.rh_profiles              enable row level security;
alter table public.rh_verification_requests enable row level security;
alter table public.rh_organizations         enable row level security;
alter table public.rh_org_members           enable row level security;
alter table public.rh_questions             enable row level security;
alter table public.rh_question_options      enable row level security;
alter table public.rh_question_references   enable row level security;
alter table public.rh_question_reviews      enable row level security;
alter table public.rh_question_flags        enable row level security;
alter table public.rh_cases                 enable row level security;
alter table public.rh_case_steps            enable row level security;
alter table public.rh_seasons               enable row level security;
alter table public.rh_leagues               enable row level security;
alter table public.rh_league_entries        enable row level security;
alter table public.rh_events                enable row level security;
alter table public.rh_event_sessions        enable row level security;
alter table public.rh_event_participants    enable row level security;
alter table public.rh_rounds                enable row level security;
alter table public.rh_round_items           enable row level security;
alter table public.rh_attempts              enable row level security;
alter table public.rh_answers               enable row level security;
alter table public.rh_leaderboard_entries   enable row level security;
alter table public.rh_badges                enable row level security;
alter table public.rh_user_badges           enable row level security;
alter table public.rh_live_state            enable row level security;
alter table public.rh_polls                 enable row level security;
alter table public.rh_poll_votes            enable row level security;
alter table public.rh_sponsorships          enable row level security;
alter table public.rh_competency            enable row level security;
alter table public.rh_learning_paths        enable row level security;
alter table public.rh_eye_chapters          enable row level security;
alter table public.rh_eye_hotspots          enable row level security;
alter table public.rh_audit_log             enable row level security;

-- Perfil: cada uno el suyo; administradores todo.
create policy rh_profiles_self on public.rh_profiles for all to authenticated
  using (user_id = auth.uid() or public.rh_has_platform_role(array['admin']::public.or_ai_role[]))
  with check (user_id = auth.uid() or public.rh_has_platform_role(array['admin']::public.or_ai_role[]));

-- Preguntas: editores/KOL leen y editan; los participantes NUNCA leen la tabla
-- (las preguntas solo se entregan por función de servidor durante la fase abierta,
-- sin la marca is_correct).
create policy rh_questions_editorial on public.rh_questions for all to authenticated
  using (public.rh_has_platform_role(array['admin','medical_editor','kol']::public.or_ai_role[]))
  with check (public.rh_has_platform_role(array['admin','medical_editor','kol']::public.or_ai_role[]));
create policy rh_options_editorial on public.rh_question_options for all to authenticated
  using (public.rh_has_platform_role(array['admin','medical_editor','kol']::public.or_ai_role[]))
  with check (public.rh_has_platform_role(array['admin','medical_editor','kol']::public.or_ai_role[]));

-- Respuestas e intentos: el participante ve los suyos; la escritura solo por
-- servidor (service_role), nunca desde el cliente.
create policy rh_attempts_self_read on public.rh_attempts for select to authenticated using (user_id = auth.uid());
create policy rh_answers_self_read on public.rh_answers for select to authenticated
  using (exists (select 1 from public.rh_attempts a where a.id = attempt_id and a.user_id = auth.uid()));

-- Clasificaciones: visibles para usuarios autenticados; la vista pública debe
-- respetar show_in_public_ranking y usar public_alias (función/vista aparte).
create policy rh_leaderboard_read on public.rh_leaderboard_entries for select to authenticated using (true);

-- Estado en directo: lectura para participantes del evento; escritura solo servidor.
create policy rh_live_state_read on public.rh_live_state for select to authenticated
  using (exists (select 1 from public.rh_event_sessions s
                 join public.rh_event_participants p on p.event_id = s.event_id
                 where s.id = session_id and p.user_id = auth.uid()));

-- Eye Universe: capítulos y puntos interactivos públicos (contenido de escaparate).
create policy rh_eye_chapters_public on public.rh_eye_chapters for select to anon, authenticated using (true);
create policy rh_eye_hotspots_public on public.rh_eye_hotspots for select to anon, authenticated using (true);

-- Auditoría: solo administradores.
create policy rh_audit_admin on public.rh_audit_log for select to authenticated
  using (public.rh_has_platform_role(array['admin']::public.or_ai_role[]));

-- rh_insights.*: sin políticas para anon/authenticated (esquema revocado). Solo
-- service_role y la función rh_insights_aggregate.

-- ---------------------------------------------------------------------------
-- 11. Disparadores updated_at (reutiliza public.set_updated_at)
-- ---------------------------------------------------------------------------
create trigger trg_rh_profiles_updated_at      before update on public.rh_profiles      for each row execute function public.set_updated_at();
create trigger trg_rh_organizations_updated_at before update on public.rh_organizations for each row execute function public.set_updated_at();
create trigger trg_rh_questions_updated_at     before update on public.rh_questions     for each row execute function public.set_updated_at();
create trigger trg_rh_cases_updated_at         before update on public.rh_cases         for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 12. Índices principales
-- ---------------------------------------------------------------------------
create index on public.rh_questions (subspecialty, career_level, status);
create index on public.rh_rounds (league_id, status);
create index on public.rh_rounds (event_session_id, status);
create index on public.rh_attempts (user_id);
create index on public.rh_answers (round_item_id);
create index on public.rh_leaderboard_entries (scope_type, scope_id, rank);
create index on rh_insights.responses (study_id, item_id);
