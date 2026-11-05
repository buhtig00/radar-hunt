
-- ============================================================
-- OPHTHALMOLOGY RADAR CLINICAL KNOWLEDGE BASE
-- Supabase SQL Schema
-- Version: v1.0
-- Purpose:
-- Structured ophthalmology knowledge base for pathologies,
-- medications, protocols, devices, guidelines, classifications
-- and clinical case templates.
--
-- Designed to work alongside:
-- - ai_knowledge_sources
-- - ai_chunks
-- - ai_interactions
-- - ai_validated_answers
--
-- Paste this entire script into Supabase SQL Editor.
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

create extension if not exists pgcrypto;
create extension if not exists vector;

-- ============================================================
-- 2. UPDATED_AT TRIGGER FUNCTION
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 3. ENUM TYPES
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'oph_subspecialty') then
    create type public.oph_subspecialty as enum (
      'retina',
      'glaucoma',
      'cornea',
      'ocular_surface',
      'cataract',
      'refractive',
      'uveitis',
      'oculoplastics',
      'neuro_ophthalmology',
      'pediatric_ophthalmology',
      'strabismus',
      'contactology',
      'low_vision',
      'ocular_oncology',
      'ocular_trauma',
      'emergency_ophthalmology',
      'general_ophthalmology'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'oph_content_status') then
    create type public.oph_content_status as enum (
      'draft',
      'pending_review',
      'approved',
      'needs_update',
      'rejected',
      'archived'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'oph_evidence_level') then
    create type public.oph_evidence_level as enum (
      'guideline',
      'systematic_review',
      'randomized_trial',
      'prospective_study',
      'retrospective_study',
      'case_series',
      'case_report',
      'expert_consensus',
      'expert_opinion',
      'educational_reference',
      'not_applicable'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'oph_protocol_type') then
    create type public.oph_protocol_type as enum (
      'diagnostic',
      'therapeutic',
      'surgical',
      'follow_up',
      'emergency',
      'screening',
      'perioperative',
      'patient_selection',
      'complication_management',
      'educational'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'oph_device_category') then
    create type public.oph_device_category as enum (
      'diagnostic',
      'imaging',
      'laser',
      'surgical',
      'implant',
      'therapeutic',
      'monitoring',
      'optical',
      'software_ai',
      'simulation_training',
      'instrumentation',
      'other'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'oph_medication_route') then
    create type public.oph_medication_route as enum (
      'topical',
      'intravitreal',
      'subconjunctival',
      'subtenon',
      'intracameral',
      'periocular',
      'oral',
      'intravenous',
      'implant',
      'other'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'oph_medication_class') then
    create type public.oph_medication_class as enum (
      'anti_vegf',
      'corticosteroid',
      'antibiotic',
      'antiviral',
      'antifungal',
      'anti_inflammatory_nsaid',
      'immunomodulator',
      'immunosuppressant',
      'glaucoma_prostaglandin',
      'glaucoma_beta_blocker',
      'glaucoma_alpha_agonist',
      'glaucoma_carbonic_anhydrase_inhibitor',
      'glaucoma_rho_kinase_inhibitor',
      'glaucoma_miotic',
      'mydriatic_cycloplegic',
      'lubricant_artificial_tear',
      'osmotic_agent',
      'diagnostic_dye',
      'local_anesthetic',
      'anti_allergic',
      'anti_fibrotic',
      'other'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'oph_guideline_source_type') then
    create type public.oph_guideline_source_type as enum (
      'clinical_guideline',
      'preferred_practice_pattern',
      'consensus_statement',
      'classification_criteria',
      'society_recommendation',
      'regulatory_document',
      'textbook_reference',
      'other'
    );
  end if;
end $$;

-- ============================================================
-- 4. HELPER ROLE FUNCTIONS
-- These reuse or_ai_user_roles if you already created the AI schema.
-- If not, they still work as conservative false checks.
-- ============================================================

create or replace function public.oph_is_admin_or_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select exists (
      select 1
      from public.or_ai_user_roles r
      where r.user_id = auth.uid()
        and r.role in ('admin', 'medical_editor')
        and r.is_active = true
    )
  ), false);
$$;

create or replace function public.oph_is_admin_editor_or_kol()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select exists (
      select 1
      from public.or_ai_user_roles r
      where r.user_id = auth.uid()
        and r.role in ('admin', 'medical_editor', 'kol')
        and r.is_active = true
    )
  ), false);
$$;

-- ============================================================
-- 5. MASTER TAXONOMY TABLES
-- ============================================================

create table if not exists public.oph_subspecialties (
  id uuid primary key default gen_random_uuid(),
  code public.oph_subspecialty not null unique,
  name_en text not null,
  name_es text not null,
  description_en text,
  description_es text,
  sort_order integer default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_oph_subspecialties_updated_at on public.oph_subspecialties;
create trigger trg_oph_subspecialties_updated_at
before update on public.oph_subspecialties
for each row execute function public.set_updated_at();

create table if not exists public.oph_anatomical_sites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_en text not null,
  name_es text not null,
  description_en text,
  description_es text,
  parent_site_id uuid references public.oph_anatomical_sites(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_oph_anatomical_sites_updated_at on public.oph_anatomical_sites;
create trigger trg_oph_anatomical_sites_updated_at
before update on public.oph_anatomical_sites
for each row execute function public.set_updated_at();

-- ============================================================
-- 6. PATHOLOGIES
-- ============================================================

create table if not exists public.oph_pathologies (
  id uuid primary key default gen_random_uuid(),

  name_en text not null,
  name_es text not null,
  slug text not null unique,

  subspecialty public.oph_subspecialty not null,
  anatomical_site_id uuid references public.oph_anatomical_sites(id) on delete set null,

  synonyms_en text[] not null default '{}',
  synonyms_es text[] not null default '{}',
  icd10_codes text[] not null default '{}',
  snomed_codes text[] not null default '{}',

  definition_en text,
  definition_es text,
  epidemiology_en text,
  epidemiology_es text,
  risk_factors_en text,
  risk_factors_es text,
  clinical_features_en text,
  clinical_features_es text,
  differential_diagnosis_en text,
  differential_diagnosis_es text,
  diagnostic_workup_en text,
  diagnostic_workup_es text,
  treatment_overview_en text,
  treatment_overview_es text,
  follow_up_en text,
  follow_up_es text,
  red_flags_en text,
  red_flags_es text,

  evidence_level public.oph_evidence_level default 'educational_reference',
  source_summary text,
  references_json jsonb not null default '[]'::jsonb,

  status public.oph_content_status not null default 'draft',
  is_active boolean not null default false,

  reviewed_by uuid,
  kol_validator_id uuid,
  reviewed_at timestamptz,
  next_review_at timestamptz,

  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name_en, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(name_es, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(synonyms_en, ' '), '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(array_to_string(synonyms_es, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(definition_en, '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(definition_es, '')), 'C')
  ) stored,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(name_en, subspecialty),
  unique(name_es, subspecialty)
);

drop trigger if exists trg_oph_pathologies_updated_at on public.oph_pathologies;
create trigger trg_oph_pathologies_updated_at
before update on public.oph_pathologies
for each row execute function public.set_updated_at();

-- ============================================================
-- 7. MEDICATIONS
-- ============================================================

create table if not exists public.oph_medications (
  id uuid primary key default gen_random_uuid(),

  generic_name_en text not null,
  generic_name_es text,
  brand_names text[] not null default '{}',

  medication_class public.oph_medication_class not null,
  route public.oph_medication_route not null,

  mechanism_en text,
  mechanism_es text,
  common_uses_en text,
  common_uses_es text,
  contraindications_en text,
  contraindications_es text,
  warnings_en text,
  warnings_es text,
  adverse_effects_en text,
  adverse_effects_es text,
  monitoring_en text,
  monitoring_es text,
  pregnancy_lactation_notes text,
  regulatory_notes text,

  is_prescription boolean default true,
  is_intravitreal boolean default false,
  is_surgical_adjuvant boolean default false,

  references_json jsonb not null default '[]'::jsonb,

  status public.oph_content_status not null default 'draft',
  is_active boolean not null default false,

  reviewed_by uuid,
  kol_validator_id uuid,
  reviewed_at timestamptz,
  next_review_at timestamptz,

  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(generic_name_en, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(generic_name_es, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(brand_names, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(common_uses_en, '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(common_uses_es, '')), 'C')
  ) stored,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(generic_name_en, route, medication_class)
);

drop trigger if exists trg_oph_medications_updated_at on public.oph_medications;
create trigger trg_oph_medications_updated_at
before update on public.oph_medications
for each row execute function public.set_updated_at();

create table if not exists public.oph_medication_indications (
  id uuid primary key default gen_random_uuid(),

  medication_id uuid not null references public.oph_medications(id) on delete cascade,
  pathology_id uuid references public.oph_pathologies(id) on delete cascade,

  indication_en text not null,
  indication_es text,
  line_of_therapy text,
  evidence_level public.oph_evidence_level default 'educational_reference',
  notes_en text,
  notes_es text,

  status public.oph_content_status not null default 'draft',
  is_active boolean not null default false,

  references_json jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_oph_medication_indications_updated_at on public.oph_medication_indications;
create trigger trg_oph_medication_indications_updated_at
before update on public.oph_medication_indications
for each row execute function public.set_updated_at();

-- ============================================================
-- 8. PROTOCOLS
-- ============================================================

create table if not exists public.oph_protocols (
  id uuid primary key default gen_random_uuid(),

  title_en text not null,
  title_es text not null,
  slug text not null unique,

  subspecialty public.oph_subspecialty not null,
  pathology_id uuid references public.oph_pathologies(id) on delete set null,

  protocol_type public.oph_protocol_type not null,
  target_audience text default 'ophthalmologists',
  clinical_setting text,

  objective_en text,
  objective_es text,
  inclusion_criteria_en text,
  inclusion_criteria_es text,
  exclusion_criteria_en text,
  exclusion_criteria_es text,
  step_by_step_en text,
  step_by_step_es text,
  investigations_en text,
  investigations_es text,
  treatment_algorithm_en text,
  treatment_algorithm_es text,
  follow_up_en text,
  follow_up_es text,
  escalation_criteria_en text,
  escalation_criteria_es text,
  red_flags_en text,
  red_flags_es text,
  patient_safety_notes_en text,
  patient_safety_notes_es text,

  evidence_level public.oph_evidence_level default 'expert_consensus',
  references_json jsonb not null default '[]'::jsonb,

  status public.oph_content_status not null default 'draft',
  is_active boolean not null default false,

  reviewed_by uuid,
  kol_validator_id uuid,
  reviewed_at timestamptz,
  next_review_at timestamptz,

  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title_en, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(title_es, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(objective_en, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(objective_es, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(step_by_step_en, '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(step_by_step_es, '')), 'C')
  ) stored,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_oph_protocols_updated_at on public.oph_protocols;
create trigger trg_oph_protocols_updated_at
before update on public.oph_protocols
for each row execute function public.set_updated_at();

create table if not exists public.oph_protocol_steps (
  id uuid primary key default gen_random_uuid(),

  protocol_id uuid not null references public.oph_protocols(id) on delete cascade,
  step_order integer not null,
  step_title_en text,
  step_title_es text,
  step_body_en text not null,
  step_body_es text,
  decision_point boolean not null default false,
  warning_level text check (warning_level is null or warning_level in ('info', 'caution', 'urgent', 'critical')),
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(protocol_id, step_order)
);

drop trigger if exists trg_oph_protocol_steps_updated_at on public.oph_protocol_steps;
create trigger trg_oph_protocol_steps_updated_at
before update on public.oph_protocol_steps
for each row execute function public.set_updated_at();

-- ============================================================
-- 9. DEVICES
-- ============================================================

create table if not exists public.oph_devices (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  manufacturer text,
  device_category public.oph_device_category not null,
  subspecialty public.oph_subspecialty default 'general_ophthalmology',

  description_en text,
  description_es text,
  intended_use_en text,
  intended_use_es text,
  indications_en text,
  indications_es text,
  limitations_en text,
  limitations_es text,
  safety_notes_en text,
  safety_notes_es text,
  regulatory_status text,

  related_pathology_ids uuid[] not null default '{}',
  references_json jsonb not null default '[]'::jsonb,

  status public.oph_content_status not null default 'draft',
  is_active boolean not null default false,

  reviewed_by uuid,
  kol_validator_id uuid,
  reviewed_at timestamptz,
  next_review_at timestamptz,

  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(manufacturer, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description_en, '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(description_es, '')), 'C')
  ) stored,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(name, manufacturer)
);

drop trigger if exists trg_oph_devices_updated_at on public.oph_devices;
create trigger trg_oph_devices_updated_at
before update on public.oph_devices
for each row execute function public.set_updated_at();

create table if not exists public.oph_device_uses (
  id uuid primary key default gen_random_uuid(),

  device_id uuid not null references public.oph_devices(id) on delete cascade,
  pathology_id uuid references public.oph_pathologies(id) on delete set null,
  protocol_id uuid references public.oph_protocols(id) on delete set null,

  use_case_en text not null,
  use_case_es text,
  clinical_notes_en text,
  clinical_notes_es text,

  status public.oph_content_status not null default 'draft',
  is_active boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_oph_device_uses_updated_at on public.oph_device_uses;
create trigger trg_oph_device_uses_updated_at
before update on public.oph_device_uses
for each row execute function public.set_updated_at();

-- ============================================================
-- 10. GUIDELINES AND SOURCES
-- ============================================================

create table if not exists public.oph_guidelines (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  organization text not null,
  country_region text,
  source_type public.oph_guideline_source_type not null,

  subspecialty public.oph_subspecialty default 'general_ophthalmology',
  pathology_id uuid references public.oph_pathologies(id) on delete set null,

  publication_year integer,
  version text,
  url text,
  doi text,
  citation text,

  summary_en text,
  summary_es text,
  key_recommendations_en text,
  key_recommendations_es text,
  notes_on_use text,
  copyright_notes text,

  status public.oph_content_status not null default 'draft',
  is_active boolean not null default false,

  reviewed_by uuid,
  reviewed_at timestamptz,
  next_review_at timestamptz,

  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(organization, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary_en, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(summary_es, '')), 'B')
  ) stored,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(title, organization, publication_year)
);

drop trigger if exists trg_oph_guidelines_updated_at on public.oph_guidelines;
create trigger trg_oph_guidelines_updated_at
before update on public.oph_guidelines
for each row execute function public.set_updated_at();

create table if not exists public.oph_references (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  authors text,
  journal_or_source text,
  publication_year integer,
  doi text,
  pmid text,
  url text,
  source_type public.oph_guideline_source_type default 'other',

  abstract_summary_en text,
  abstract_summary_es text,
  copyright_notes text,

  status public.oph_content_status not null default 'draft',
  is_active boolean not null default false,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(title, publication_year)
);

drop trigger if exists trg_oph_references_updated_at on public.oph_references;
create trigger trg_oph_references_updated_at
before update on public.oph_references
for each row execute function public.set_updated_at();

create table if not exists public.oph_reference_links (
  id uuid primary key default gen_random_uuid(),

  reference_id uuid not null references public.oph_references(id) on delete cascade,

  pathology_id uuid references public.oph_pathologies(id) on delete cascade,
  medication_id uuid references public.oph_medications(id) on delete cascade,
  protocol_id uuid references public.oph_protocols(id) on delete cascade,
  device_id uuid references public.oph_devices(id) on delete cascade,
  guideline_id uuid references public.oph_guidelines(id) on delete cascade,

  relationship_type text not null default 'supports',
  notes text,

  created_at timestamptz not null default now(),

  check (
    pathology_id is not null
    or medication_id is not null
    or protocol_id is not null
    or device_id is not null
    or guideline_id is not null
  )
);

-- ============================================================
-- 11. CLASSIFICATIONS
-- ============================================================

create table if not exists public.oph_classifications (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  acronym text,
  subspecialty public.oph_subspecialty not null,
  pathology_id uuid references public.oph_pathologies(id) on delete set null,

  description_en text,
  description_es text,
  clinical_use_en text,
  clinical_use_es text,
  original_source text,
  references_json jsonb not null default '[]'::jsonb,

  status public.oph_content_status not null default 'draft',
  is_active boolean not null default false,

  reviewed_by uuid,
  kol_validator_id uuid,
  reviewed_at timestamptz,
  next_review_at timestamptz,

  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(acronym, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description_en, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(description_es, '')), 'B')
  ) stored,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(name, subspecialty)
);

drop trigger if exists trg_oph_classifications_updated_at on public.oph_classifications;
create trigger trg_oph_classifications_updated_at
before update on public.oph_classifications
for each row execute function public.set_updated_at();

create table if not exists public.oph_classification_items (
  id uuid primary key default gen_random_uuid(),

  classification_id uuid not null references public.oph_classifications(id) on delete cascade,
  item_order integer not null,
  code text,
  label_en text not null,
  label_es text,
  definition_en text,
  definition_es text,
  management_implication_en text,
  management_implication_es text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(classification_id, item_order)
);

drop trigger if exists trg_oph_classification_items_updated_at on public.oph_classification_items;
create trigger trg_oph_classification_items_updated_at
before update on public.oph_classification_items
for each row execute function public.set_updated_at();

-- ============================================================
-- 12. CLINICAL CASE TEMPLATES
-- These are templates for real anonymised cases.
-- They are not fabricated real patient cases.
-- ============================================================

create table if not exists public.oph_case_templates (
  id uuid primary key default gen_random_uuid(),

  title_en text not null,
  title_es text not null,
  slug text not null unique,

  subspecialty public.oph_subspecialty not null,
  pathology_id uuid references public.oph_pathologies(id) on delete set null,

  difficulty_level text not null default 'intermediate' check (
    difficulty_level in ('basic', 'intermediate', 'advanced', 'expert')
  ),

  learning_objectives_en text,
  learning_objectives_es text,
  case_prompt_en text,
  case_prompt_es text,

  required_fields jsonb not null default '[]'::jsonb,
  suggested_discussion_points_en text,
  suggested_discussion_points_es text,
  red_flags_en text,
  red_flags_es text,
  expected_protocol_links uuid[] not null default '{}',
  expected_classification_links uuid[] not null default '{}',

  status public.oph_content_status not null default 'draft',
  is_active boolean not null default false,

  reviewed_by uuid,
  kol_validator_id uuid,
  reviewed_at timestamptz,
  next_review_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_oph_case_templates_updated_at on public.oph_case_templates;
create trigger trg_oph_case_templates_updated_at
before update on public.oph_case_templates
for each row execute function public.set_updated_at();

create table if not exists public.oph_case_template_sections (
  id uuid primary key default gen_random_uuid(),

  case_template_id uuid not null references public.oph_case_templates(id) on delete cascade,
  section_order integer not null,

  section_key text not null,
  section_title_en text not null,
  section_title_es text,
  instructions_en text,
  instructions_es text,
  is_required boolean not null default true,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(case_template_id, section_order)
);

drop trigger if exists trg_oph_case_template_sections_updated_at on public.oph_case_template_sections;
create trigger trg_oph_case_template_sections_updated_at
before update on public.oph_case_template_sections
for each row execute function public.set_updated_at();

-- Optional table for real anonymised user-submitted cases later.
create table if not exists public.oph_clinical_cases (
  id uuid primary key default gen_random_uuid(),

  case_template_id uuid references public.oph_case_templates(id) on delete set null,
  submitted_by uuid,

  title text not null,
  subspecialty public.oph_subspecialty not null,
  pathology_id uuid references public.oph_pathologies(id) on delete set null,

  age_range text,
  sex text,
  chief_complaint text,
  history text,
  examination text,
  imaging_tests text,
  treatment_course text,
  outcome text,
  discussion_question text,

  anonymisation_confirmed boolean not null default false,
  pii_risk_detected boolean not null default false,
  pii_risk_details jsonb not null default '[]'::jsonb,

  status public.oph_content_status not null default 'draft',
  is_active boolean not null default false,

  reviewed_by uuid,
  kol_validator_id uuid,
  reviewed_at timestamptz,
  next_review_at timestamptz,

  references_json jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_oph_clinical_cases_updated_at on public.oph_clinical_cases;
create trigger trg_oph_clinical_cases_updated_at
before update on public.oph_clinical_cases
for each row execute function public.set_updated_at();

-- ============================================================
-- 13. RELATIONSHIP TABLES
-- ============================================================

create table if not exists public.oph_pathology_classifications (
  id uuid primary key default gen_random_uuid(),
  pathology_id uuid not null references public.oph_pathologies(id) on delete cascade,
  classification_id uuid not null references public.oph_classifications(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  unique(pathology_id, classification_id)
);

create table if not exists public.oph_pathology_guidelines (
  id uuid primary key default gen_random_uuid(),
  pathology_id uuid not null references public.oph_pathologies(id) on delete cascade,
  guideline_id uuid not null references public.oph_guidelines(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  unique(pathology_id, guideline_id)
);

create table if not exists public.oph_pathology_protocols (
  id uuid primary key default gen_random_uuid(),
  pathology_id uuid not null references public.oph_pathologies(id) on delete cascade,
  protocol_id uuid not null references public.oph_protocols(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  unique(pathology_id, protocol_id)
);

create table if not exists public.oph_pathology_devices (
  id uuid primary key default gen_random_uuid(),
  pathology_id uuid not null references public.oph_pathologies(id) on delete cascade,
  device_id uuid not null references public.oph_devices(id) on delete cascade,
  use_context text,
  created_at timestamptz not null default now(),
  unique(pathology_id, device_id)
);

-- ============================================================
-- 14. INTEGRATION WITH AI KNOWLEDGE SOURCES
-- Allows each structured item to be linked to ai_knowledge_sources.
-- ============================================================

create table if not exists public.oph_ai_source_links (
  id uuid primary key default gen_random_uuid(),

  ai_knowledge_source_id uuid references public.ai_knowledge_sources(id) on delete cascade,

  pathology_id uuid references public.oph_pathologies(id) on delete cascade,
  medication_id uuid references public.oph_medications(id) on delete cascade,
  protocol_id uuid references public.oph_protocols(id) on delete cascade,
  device_id uuid references public.oph_devices(id) on delete cascade,
  guideline_id uuid references public.oph_guidelines(id) on delete cascade,
  classification_id uuid references public.oph_classifications(id) on delete cascade,
  case_template_id uuid references public.oph_case_templates(id) on delete cascade,

  relationship_type text not null default 'indexed_as_source',
  created_at timestamptz not null default now(),

  check (
    pathology_id is not null
    or medication_id is not null
    or protocol_id is not null
    or device_id is not null
    or guideline_id is not null
    or classification_id is not null
    or case_template_id is not null
  )
);

-- ============================================================
-- 15. SEARCH FUNCTIONS
-- ============================================================

create or replace function public.search_oph_pathologies(
  search_query text,
  filter_subspecialty public.oph_subspecialty default null,
  result_limit int default 25
)
returns table (
  id uuid,
  name_en text,
  name_es text,
  slug text,
  subspecialty public.oph_subspecialty,
  rank real
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.name_en,
    p.name_es,
    p.slug,
    p.subspecialty,
    ts_rank(p.search_vector, websearch_to_tsquery('english', search_query)) +
    ts_rank(p.search_vector, websearch_to_tsquery('spanish', search_query)) as rank
  from public.oph_pathologies p
  where
    p.status = 'approved'
    and p.is_active = true
    and (filter_subspecialty is null or p.subspecialty = filter_subspecialty)
    and (
      p.search_vector @@ websearch_to_tsquery('english', search_query)
      or p.search_vector @@ websearch_to_tsquery('spanish', search_query)
      or p.name_en ilike '%' || search_query || '%'
      or p.name_es ilike '%' || search_query || '%'
    )
  order by rank desc, p.name_en asc
  limit result_limit;
$$;

create or replace function public.search_oph_medications(
  search_query text,
  result_limit int default 25
)
returns table (
  id uuid,
  generic_name_en text,
  generic_name_es text,
  medication_class public.oph_medication_class,
  route public.oph_medication_route,
  rank real
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id,
    m.generic_name_en,
    m.generic_name_es,
    m.medication_class,
    m.route,
    ts_rank(m.search_vector, websearch_to_tsquery('english', search_query)) +
    ts_rank(m.search_vector, websearch_to_tsquery('spanish', search_query)) as rank
  from public.oph_medications m
  where
    m.status = 'approved'
    and m.is_active = true
    and (
      m.search_vector @@ websearch_to_tsquery('english', search_query)
      or m.search_vector @@ websearch_to_tsquery('spanish', search_query)
      or m.generic_name_en ilike '%' || search_query || '%'
      or m.generic_name_es ilike '%' || search_query || '%'
      or exists (select 1 from unnest(m.brand_names) b where b ilike '%' || search_query || '%')
    )
  order by rank desc, m.generic_name_en asc
  limit result_limit;
$$;

create or replace function public.search_oph_global(
  search_query text,
  result_limit int default 50
)
returns table (
  entity_type text,
  entity_id uuid,
  title text,
  subtitle text,
  subspecialty text,
  status public.oph_content_status
)
language sql
stable
security definer
set search_path = public
as $$
  (
    select
      'pathology'::text,
      p.id,
      p.name_en,
      p.name_es,
      p.subspecialty::text,
      p.status
    from public.oph_pathologies p
    where p.status = 'approved' and p.is_active = true
      and (p.name_en ilike '%' || search_query || '%' or p.name_es ilike '%' || search_query || '%')
    limit result_limit
  )
  union all
  (
    select
      'medication'::text,
      m.id,
      m.generic_name_en,
      coalesce(m.generic_name_es, array_to_string(m.brand_names, ', ')),
      m.medication_class::text,
      m.status
    from public.oph_medications m
    where m.status = 'approved' and m.is_active = true
      and (
        m.generic_name_en ilike '%' || search_query || '%'
        or m.generic_name_es ilike '%' || search_query || '%'
        or exists (select 1 from unnest(m.brand_names) b where b ilike '%' || search_query || '%')
      )
    limit result_limit
  )
  union all
  (
    select
      'protocol'::text,
      pr.id,
      pr.title_en,
      pr.title_es,
      pr.subspecialty::text,
      pr.status
    from public.oph_protocols pr
    where pr.status = 'approved' and pr.is_active = true
      and (pr.title_en ilike '%' || search_query || '%' or pr.title_es ilike '%' || search_query || '%')
    limit result_limit
  )
  union all
  (
    select
      'device'::text,
      d.id,
      d.name,
      coalesce(d.manufacturer, d.device_category::text),
      d.subspecialty::text,
      d.status
    from public.oph_devices d
    where d.status = 'approved' and d.is_active = true
      and (d.name ilike '%' || search_query || '%' or d.manufacturer ilike '%' || search_query || '%')
    limit result_limit
  )
  limit result_limit;
$$;

-- ============================================================
-- 16. ANALYTICS VIEWS
-- ============================================================

create or replace view public.oph_kb_dashboard_metrics as
select
  (select count(*) from public.oph_pathologies) as total_pathologies,
  (select count(*) from public.oph_pathologies where status = 'approved' and is_active = true) as approved_pathologies,
  (select count(*) from public.oph_medications) as total_medications,
  (select count(*) from public.oph_medications where status = 'approved' and is_active = true) as approved_medications,
  (select count(*) from public.oph_protocols) as total_protocols,
  (select count(*) from public.oph_devices) as total_devices,
  (select count(*) from public.oph_guidelines) as total_guidelines,
  (select count(*) from public.oph_classifications) as total_classifications,
  (select count(*) from public.oph_case_templates) as total_case_templates,
  (select count(*) from public.oph_clinical_cases where anonymisation_confirmed = false) as cases_missing_anonymisation;

create or replace view public.oph_kb_by_subspecialty as
select
  s.code as subspecialty,
  s.name_en,
  s.name_es,
  coalesce(p.total_pathologies, 0) as pathologies,
  coalesce(pr.total_protocols, 0) as protocols,
  coalesce(d.total_devices, 0) as devices,
  coalesce(g.total_guidelines, 0) as guidelines,
  coalesce(c.total_classifications, 0) as classifications,
  coalesce(ct.total_case_templates, 0) as case_templates
from public.oph_subspecialties s
left join (
  select subspecialty, count(*) total_pathologies from public.oph_pathologies group by subspecialty
) p on p.subspecialty = s.code
left join (
  select subspecialty, count(*) total_protocols from public.oph_protocols group by subspecialty
) pr on pr.subspecialty = s.code
left join (
  select subspecialty, count(*) total_devices from public.oph_devices group by subspecialty
) d on d.subspecialty = s.code
left join (
  select subspecialty, count(*) total_guidelines from public.oph_guidelines group by subspecialty
) g on g.subspecialty = s.code
left join (
  select subspecialty, count(*) total_classifications from public.oph_classifications group by subspecialty
) c on c.subspecialty = s.code
left join (
  select subspecialty, count(*) total_case_templates from public.oph_case_templates group by subspecialty
) ct on ct.subspecialty = s.code
where s.is_active = true
order by s.sort_order, s.name_en;

create or replace view public.oph_pending_review_items as
select 'pathology' as entity_type, id, name_en as title, subspecialty::text, status, created_at from public.oph_pathologies where status = 'pending_review'
union all
select 'medication' as entity_type, id, generic_name_en as title, medication_class::text as subspecialty, status, created_at from public.oph_medications where status = 'pending_review'
union all
select 'protocol' as entity_type, id, title_en as title, subspecialty::text, status, created_at from public.oph_protocols where status = 'pending_review'
union all
select 'device' as entity_type, id, name as title, subspecialty::text, status, created_at from public.oph_devices where status = 'pending_review'
union all
select 'guideline' as entity_type, id, title, subspecialty::text, status, created_at from public.oph_guidelines where status = 'pending_review'
union all
select 'classification' as entity_type, id, name as title, subspecialty::text, status, created_at from public.oph_classifications where status = 'pending_review'
union all
select 'case_template' as entity_type, id, title_en as title, subspecialty::text, status, created_at from public.oph_case_templates where status = 'pending_review'
order by created_at desc;

-- ============================================================
-- 17. INDEXES
-- ============================================================

create index if not exists oph_pathologies_subspecialty_idx on public.oph_pathologies(subspecialty);
create index if not exists oph_pathologies_status_idx on public.oph_pathologies(status, is_active);
create index if not exists oph_pathologies_slug_idx on public.oph_pathologies(slug);
create index if not exists oph_pathologies_search_idx on public.oph_pathologies using gin(search_vector);

create index if not exists oph_medications_class_idx on public.oph_medications(medication_class);
create index if not exists oph_medications_route_idx on public.oph_medications(route);
create index if not exists oph_medications_status_idx on public.oph_medications(status, is_active);
create index if not exists oph_medications_search_idx on public.oph_medications using gin(search_vector);
create index if not exists oph_medications_brand_names_idx on public.oph_medications using gin(brand_names);

create index if not exists oph_medication_indications_medication_idx on public.oph_medication_indications(medication_id);
create index if not exists oph_medication_indications_pathology_idx on public.oph_medication_indications(pathology_id);

create index if not exists oph_protocols_subspecialty_idx on public.oph_protocols(subspecialty);
create index if not exists oph_protocols_pathology_idx on public.oph_protocols(pathology_id);
create index if not exists oph_protocols_type_idx on public.oph_protocols(protocol_type);
create index if not exists oph_protocols_status_idx on public.oph_protocols(status, is_active);
create index if not exists oph_protocols_search_idx on public.oph_protocols using gin(search_vector);

create index if not exists oph_protocol_steps_protocol_idx on public.oph_protocol_steps(protocol_id);

create index if not exists oph_devices_category_idx on public.oph_devices(device_category);
create index if not exists oph_devices_subspecialty_idx on public.oph_devices(subspecialty);
create index if not exists oph_devices_status_idx on public.oph_devices(status, is_active);
create index if not exists oph_devices_search_idx on public.oph_devices using gin(search_vector);

create index if not exists oph_guidelines_subspecialty_idx on public.oph_guidelines(subspecialty);
create index if not exists oph_guidelines_pathology_idx on public.oph_guidelines(pathology_id);
create index if not exists oph_guidelines_status_idx on public.oph_guidelines(status, is_active);
create index if not exists oph_guidelines_search_idx on public.oph_guidelines using gin(search_vector);

create index if not exists oph_classifications_subspecialty_idx on public.oph_classifications(subspecialty);
create index if not exists oph_classifications_pathology_idx on public.oph_classifications(pathology_id);
create index if not exists oph_classifications_status_idx on public.oph_classifications(status, is_active);
create index if not exists oph_classifications_search_idx on public.oph_classifications using gin(search_vector);

create index if not exists oph_classification_items_classification_idx on public.oph_classification_items(classification_id);

create index if not exists oph_case_templates_subspecialty_idx on public.oph_case_templates(subspecialty);
create index if not exists oph_case_templates_pathology_idx on public.oph_case_templates(pathology_id);
create index if not exists oph_case_templates_status_idx on public.oph_case_templates(status, is_active);

create index if not exists oph_clinical_cases_subspecialty_idx on public.oph_clinical_cases(subspecialty);
create index if not exists oph_clinical_cases_status_idx on public.oph_clinical_cases(status, is_active);
create index if not exists oph_clinical_cases_submitted_by_idx on public.oph_clinical_cases(submitted_by);

-- ============================================================
-- 18. ROW LEVEL SECURITY
-- ============================================================

alter table public.oph_subspecialties enable row level security;
alter table public.oph_anatomical_sites enable row level security;
alter table public.oph_pathologies enable row level security;
alter table public.oph_medications enable row level security;
alter table public.oph_medication_indications enable row level security;
alter table public.oph_protocols enable row level security;
alter table public.oph_protocol_steps enable row level security;
alter table public.oph_devices enable row level security;
alter table public.oph_device_uses enable row level security;
alter table public.oph_guidelines enable row level security;
alter table public.oph_references enable row level security;
alter table public.oph_reference_links enable row level security;
alter table public.oph_classifications enable row level security;
alter table public.oph_classification_items enable row level security;
alter table public.oph_case_templates enable row level security;
alter table public.oph_case_template_sections enable row level security;
alter table public.oph_clinical_cases enable row level security;
alter table public.oph_pathology_classifications enable row level security;
alter table public.oph_pathology_guidelines enable row level security;
alter table public.oph_pathology_protocols enable row level security;
alter table public.oph_pathology_devices enable row level security;
alter table public.oph_ai_source_links enable row level security;

-- ============================================================
-- 19. DROP POLICIES IF EXIST
-- ============================================================

do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'oph_subspecialties','oph_anatomical_sites','oph_pathologies','oph_medications',
        'oph_medication_indications','oph_protocols','oph_protocol_steps','oph_devices',
        'oph_device_uses','oph_guidelines','oph_references','oph_reference_links',
        'oph_classifications','oph_classification_items','oph_case_templates',
        'oph_case_template_sections','oph_clinical_cases','oph_pathology_classifications',
        'oph_pathology_guidelines','oph_pathology_protocols','oph_pathology_devices',
        'oph_ai_source_links'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- ============================================================
-- 20. RLS POLICIES
-- Public approved read + admin/editor write.
-- ============================================================

-- Master taxonomy: readable by authenticated users; admin/editor writes.
create policy "oph_subspecialties_select_active"
on public.oph_subspecialties for select
using (is_active = true or public.oph_is_admin_or_editor());

create policy "oph_subspecialties_admin_editor_all"
on public.oph_subspecialties for all
using (public.oph_is_admin_or_editor())
with check (public.oph_is_admin_or_editor());

create policy "oph_anatomical_sites_select_active"
on public.oph_anatomical_sites for select
using (is_active = true or public.oph_is_admin_or_editor());

create policy "oph_anatomical_sites_admin_editor_all"
on public.oph_anatomical_sites for all
using (public.oph_is_admin_or_editor())
with check (public.oph_is_admin_or_editor());

-- Core content: approved active readable, editors/KOLs can see all, admin/editor writes.
create policy "oph_pathologies_select_approved"
on public.oph_pathologies for select
using ((status = 'approved' and is_active = true) or public.oph_is_admin_editor_or_kol());

create policy "oph_pathologies_admin_editor_all"
on public.oph_pathologies for all
using (public.oph_is_admin_or_editor())
with check (public.oph_is_admin_or_editor());

create policy "oph_medications_select_approved"
on public.oph_medications for select
using ((status = 'approved' and is_active = true) or public.oph_is_admin_editor_or_kol());

create policy "oph_medications_admin_editor_all"
on public.oph_medications for all
using (public.oph_is_admin_or_editor())
with check (public.oph_is_admin_or_editor());

create policy "oph_medication_indications_select_approved"
on public.oph_medication_indications for select
using ((status = 'approved' and is_active = true) or public.oph_is_admin_editor_or_kol());

create policy "oph_medication_indications_admin_editor_all"
on public.oph_medication_indications for all
using (public.oph_is_admin_or_editor())
with check (public.oph_is_admin_or_editor());

create policy "oph_protocols_select_approved"
on public.oph_protocols for select
using ((status = 'approved' and is_active = true) or public.oph_is_admin_editor_or_kol());

create policy "oph_protocols_admin_editor_all"
on public.oph_protocols for all
using (public.oph_is_admin_or_editor())
with check (public.oph_is_admin_or_editor());

create policy "oph_protocol_steps_select_if_protocol_visible"
on public.oph_protocol_steps for select
using (
  exists (
    select 1 from public.oph_protocols p
    where p.id = oph_protocol_steps.protocol_id
      and ((p.status = 'approved' and p.is_active = true) or public.oph_is_admin_editor_or_kol())
  )
);

create policy "oph_protocol_steps_admin_editor_all"
on public.oph_protocol_steps for all
using (public.oph_is_admin_or_editor())
with check (public.oph_is_admin_or_editor());

create policy "oph_devices_select_approved"
on public.oph_devices for select
using ((status = 'approved' and is_active = true) or public.oph_is_admin_editor_or_kol());

create policy "oph_devices_admin_editor_all"
on public.oph_devices for all
using (public.oph_is_admin_or_editor())
with check (public.oph_is_admin_or_editor());

create policy "oph_device_uses_select_approved"
on public.oph_device_uses for select
using ((status = 'approved' and is_active = true) or public.oph_is_admin_editor_or_kol());

create policy "oph_device_uses_admin_editor_all"
on public.oph_device_uses for all
using (public.oph_is_admin_or_editor())
with check (public.oph_is_admin_or_editor());

create policy "oph_guidelines_select_approved"
on public.oph_guidelines for select
using ((status = 'approved' and is_active = true) or public.oph_is_admin_editor_or_kol());

create policy "oph_guidelines_admin_editor_all"
on public.oph_guidelines for all
using (public.oph_is_admin_or_editor())
with check (public.oph_is_admin_or_editor());

create policy "oph_references_select_approved"
on public.oph_references for select
using ((status = 'approved' and is_active = true) or public.oph_is_admin_editor_or_kol());

create policy "oph_references_admin_editor_all"
on public.oph_references for all
using (public.oph_is_admin_or_editor())
with check (public.oph_is_admin_or_editor());

create policy "oph_reference_links_select"
on public.oph_reference_links for select
using (true);

create policy "oph_reference_links_admin_editor_all"
on public.oph_reference_links for all
using (public.oph_is_admin_or_editor())
with check (public.oph_is_admin_or_editor());

create policy "oph_classifications_select_approved"
on public.oph_classifications for select
using ((status = 'approved' and is_active = true) or public.oph_is_admin_editor_or_kol());

create policy "oph_classifications_admin_editor_all"
on public.oph_classifications for all
using (public.oph_is_admin_or_editor())
with check (public.oph_is_admin_or_editor());

create policy "oph_classification_items_select_if_classification_visible"
on public.oph_classification_items for select
using (
  exists (
    select 1 from public.oph_classifications c
    where c.id = oph_classification_items.classification_id
      and ((c.status = 'approved' and c.is_active = true) or public.oph_is_admin_editor_or_kol())
  )
);

create policy "oph_classification_items_admin_editor_all"
on public.oph_classification_items for all
using (public.oph_is_admin_or_editor())
with check (public.oph_is_admin_or_editor());

create policy "oph_case_templates_select_approved"
on public.oph_case_templates for select
using ((status = 'approved' and is_active = true) or public.oph_is_admin_editor_or_kol());

create policy "oph_case_templates_admin_editor_all"
on public.oph_case_templates for all
using (public.oph_is_admin_or_editor())
with check (public.oph_is_admin_or_editor());

create policy "oph_case_template_sections_select_if_template_visible"
on public.oph_case_template_sections for select
using (
  exists (
    select 1 from public.oph_case_templates ct
    where ct.id = oph_case_template_sections.case_template_id
      and ((ct.status = 'approved' and ct.is_active = true) or public.oph_is_admin_editor_or_kol())
  )
);

create policy "oph_case_template_sections_admin_editor_all"
on public.oph_case_template_sections for all
using (public.oph_is_admin_or_editor())
with check (public.oph_is_admin_or_editor());

-- Real submitted clinical cases: owner/admin/editor/KOL only, not public by default.
create policy "oph_clinical_cases_select_owner_or_reviewers"
on public.oph_clinical_cases for select
using (
  submitted_by = auth.uid()
  or public.oph_is_admin_editor_or_kol()
);

create policy "oph_clinical_cases_insert_own"
on public.oph_clinical_cases for insert
with check (
  submitted_by = auth.uid()
  or public.oph_is_admin_or_editor()
);

create policy "oph_clinical_cases_update_owner_or_editor"
on public.oph_clinical_cases for update
using (
  submitted_by = auth.uid()
  or public.oph_is_admin_or_editor()
)
with check (
  submitted_by = auth.uid()
  or public.oph_is_admin_or_editor()
);

-- Relationship tables: readable when referenced content is visible; writes admin/editor.
create policy "oph_relationships_select_all"
on public.oph_pathology_classifications for select using (true);
create policy "oph_relationships_admin_editor_all"
on public.oph_pathology_classifications for all
using (public.oph_is_admin_or_editor()) with check (public.oph_is_admin_or_editor());

create policy "oph_pathology_guidelines_select_all"
on public.oph_pathology_guidelines for select using (true);
create policy "oph_pathology_guidelines_admin_editor_all"
on public.oph_pathology_guidelines for all
using (public.oph_is_admin_or_editor()) with check (public.oph_is_admin_or_editor());

create policy "oph_pathology_protocols_select_all"
on public.oph_pathology_protocols for select using (true);
create policy "oph_pathology_protocols_admin_editor_all"
on public.oph_pathology_protocols for all
using (public.oph_is_admin_or_editor()) with check (public.oph_is_admin_or_editor());

create policy "oph_pathology_devices_select_all"
on public.oph_pathology_devices for select using (true);
create policy "oph_pathology_devices_admin_editor_all"
on public.oph_pathology_devices for all
using (public.oph_is_admin_or_editor()) with check (public.oph_is_admin_or_editor());

create policy "oph_ai_source_links_select"
on public.oph_ai_source_links for select using (true);
create policy "oph_ai_source_links_admin_editor_all"
on public.oph_ai_source_links for all
using (public.oph_is_admin_or_editor()) with check (public.oph_is_admin_or_editor());

-- ============================================================
-- 21. SEED CORE TAXONOMY
-- ============================================================

insert into public.oph_subspecialties (code, name_en, name_es, description_en, description_es, sort_order)
values
('retina','Retina','Retina','Medical and surgical retina, macula, vitreoretinal disease.','Retina médica y quirúrgica, mácula y patología vitreorretiniana.',10),
('glaucoma','Glaucoma','Glaucoma','Optic neuropathy, ocular hypertension and glaucoma surgery.','Neuropatía óptica glaucomatosa, hipertensión ocular y cirugía de glaucoma.',20),
('cornea','Cornea','Córnea','Corneal disease, keratoplasty and anterior segment pathology.','Patología corneal, queratoplastia y segmento anterior.',30),
('ocular_surface','Ocular Surface','Superficie ocular','Dry eye, ocular surface inflammation and external disease.','Ojo seco, inflamación de superficie ocular y patología externa.',40),
('cataract','Cataract','Catarata','Cataract surgery, IOLs and perioperative complications.','Cirugía de catarata, LIOs y complicaciones perioperatorias.',50),
('refractive','Refractive Surgery','Cirugía refractiva','Laser vision correction, phakic IOLs and refractive complications.','Corrección visual láser, lentes fáquicas y complicaciones refractivas.',60),
('uveitis','Uveitis','Uveítis','Intraocular inflammation and immunologic/infectious uveitis.','Inflamación intraocular y uveítis inmunológica/infecciosa.',70),
('oculoplastics','Oculoplastics','Oculoplastia','Eyelid, lacrimal, orbital and aesthetic ophthalmic surgery.','Párpados, vía lagrimal, órbita y cirugía estética oftálmica.',80),
('neuro_ophthalmology','Neuro-ophthalmology','Neurooftalmología','Optic nerve, ocular motility and neurovisual pathways.','Nervio óptico, motilidad ocular y vías neurovisuales.',90),
('pediatric_ophthalmology','Pediatric Ophthalmology','Oftalmología pediátrica','Pediatric eye disease, amblyopia and congenital disorders.','Patología ocular pediátrica, ambliopía y trastornos congénitos.',100),
('strabismus','Strabismus','Estrabismo','Ocular alignment disorders and binocular vision.','Trastornos de alineación ocular y visión binocular.',110),
('contactology','Contactology','Contactología','Contact lenses, corneal optics and specialty lens fitting.','Lentes de contacto, óptica corneal y adaptación especializada.',120),
('low_vision','Low Vision','Baja visión','Visual rehabilitation and assistive technologies.','Rehabilitación visual y tecnologías de apoyo.',130),
('ocular_oncology','Ocular Oncology','Oncología ocular','Ocular tumors and ocular oncology.','Tumores oculares y oncología ocular.',140),
('ocular_trauma','Ocular Trauma','Trauma ocular','Ocular trauma and emergency surgical repair.','Trauma ocular y reparación quirúrgica urgente.',150),
('emergency_ophthalmology','Emergency Ophthalmology','Urgencias oftalmológicas','Urgent ophthalmic presentations and triage.','Presentaciones oftalmológicas urgentes y triaje.',160),
('general_ophthalmology','General Ophthalmology','Oftalmología general','General ophthalmology knowledge and cross-specialty content.','Conocimiento transversal de oftalmología general.',170)
on conflict (code) do update set
  name_en = excluded.name_en,
  name_es = excluded.name_es,
  description_en = excluded.description_en,
  description_es = excluded.description_es,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.oph_anatomical_sites (code, name_en, name_es, description_en, description_es)
values
('eyelid','Eyelid','Párpado','Upper and lower eyelids.','Párpados superior e inferior.'),
('lacrimal_system','Lacrimal System','Sistema lagrimal','Lacrimal gland and drainage system.','Glándula y vía lagrimal.'),
('conjunctiva','Conjunctiva','Conjuntiva','Bulbar and palpebral conjunctiva.','Conjuntiva bulbar y palpebral.'),
('cornea','Cornea','Córnea','Corneal epithelium, stroma, endothelium and limbus.','Epitelio, estroma, endotelio y limbo corneal.'),
('sclera','Sclera','Esclera','Scleral tissue and episclera.','Tejido escleral y episclera.'),
('anterior_chamber','Anterior Chamber','Cámara anterior','Anterior chamber, angle and aqueous outflow.','Cámara anterior, ángulo y drenaje acuoso.'),
('iris_ciliary_body','Iris and Ciliary Body','Iris y cuerpo ciliar','Iris and ciliary body.','Iris y cuerpo ciliar.'),
('lens','Lens','Cristalino','Natural lens and capsular bag.','Cristalino y saco capsular.'),
('vitreous','Vitreous','Vítreo','Vitreous body and vitreoretinal interface.','Cuerpo vítreo e interfaz vitreorretiniana.'),
('retina','Retina','Retina','Neural retina and retinal pigment epithelium.','Retina neurosensorial y epitelio pigmentario.'),
('macula','Macula','Mácula','Macular region and fovea.','Región macular y fóvea.'),
('choroid','Choroid','Coroides','Choroid and choriocapillaris.','Coroides y coriocapilar.'),
('optic_nerve','Optic Nerve','Nervio óptico','Optic nerve head and retrobulbar optic nerve.','Papila y nervio óptico retrobulbar.'),
('orbit','Orbit','Órbita','Orbital tissues, muscles and bony orbit.','Tejidos orbitarios, músculos y órbita ósea.'),
('ocular_surface','Ocular Surface','Superficie ocular','Tear film, conjunctiva, cornea and adnexa.','Película lagrimal, conjuntiva, córnea y anexos.')
on conflict (code) do update set
  name_en = excluded.name_en,
  name_es = excluded.name_es,
  description_en = excluded.description_en,
  description_es = excluded.description_es,
  is_active = true;

-- ============================================================
-- 22. SEED INITIAL STRUCTURED KNOWLEDGE
-- This is a starter set. Content should be expanded and KOL reviewed.
-- ============================================================

insert into public.oph_pathologies (
  name_en, name_es, slug, subspecialty, synonyms_en, synonyms_es,
  definition_en, definition_es, diagnostic_workup_en, diagnostic_workup_es,
  treatment_overview_en, treatment_overview_es, red_flags_en, red_flags_es,
  evidence_level, status, is_active, source_summary, references_json
)
values
(
  'Diabetic Macular Edema',
  'Edema macular diabético',
  'diabetic-macular-edema',
  'retina',
  array['DME','diabetic macular oedema'],
  array['EMD','edema macular diabético'],
  'Retinal thickening involving or threatening the macula caused by diabetic microvascular disease.',
  'Engrosamiento retiniano que afecta o amenaza la mácula secundario a microangiopatía diabética.',
  'Assessment typically includes visual acuity, slit-lamp and fundus examination, OCT, OCT biomarkers, diabetic retinopathy severity and systemic risk factors.',
  'La evaluación suele incluir agudeza visual, exploración con lámpara de hendidura y fondo de ojo, OCT, biomarcadores OCT, gravedad de la retinopatía diabética y factores sistémicos.',
  'Educational management discussion includes anti-VEGF therapy, corticosteroid implants in selected cases, laser in specific scenarios and systemic optimisation.',
  'El manejo educativo incluye anti-VEGF, implantes de corticosteroides en casos seleccionados, láser en escenarios concretos y optimización sistémica.',
  'Sudden severe vision loss, tractional components, advanced proliferative diabetic retinopathy or suspected endophthalmitis after injection require urgent assessment.',
  'La pérdida visual súbita, componente traccional, retinopatía diabética proliferativa avanzada o sospecha de endoftalmitis tras inyección requieren valoración urgente.',
  'guideline',
  'approved',
  true,
  'Structured from major retina guidelines and educational consensus; requires local protocol adaptation.',
  '[{"organization":"AAO","type":"Preferred Practice Pattern"},{"organization":"EURETINA","type":"clinical guidance"}]'::jsonb
),
(
  'Primary Open-Angle Glaucoma',
  'Glaucoma primario de ángulo abierto',
  'primary-open-angle-glaucoma',
  'glaucoma',
  array['POAG','open-angle glaucoma'],
  array['GPAA','glaucoma de ángulo abierto'],
  'Chronic progressive optic neuropathy associated with characteristic optic nerve damage and visual field loss, often related to intraocular pressure.',
  'Neuropatía óptica crónica progresiva con daño característico del nervio óptico y pérdida campimétrica, frecuentemente relacionada con la presión intraocular.',
  'Assessment includes IOP, gonioscopy, optic nerve evaluation, OCT RNFL/GCC, visual field testing, pachymetry and risk factor review.',
  'La evaluación incluye PIO, gonioscopia, evaluación del nervio óptico, OCT RNFL/GCC, campo visual, paquimetría y revisión de factores de riesgo.',
  'Educational management includes target IOP setting, topical therapy, laser trabeculoplasty, MIGS or filtering surgery depending on stage and risk.',
  'El manejo educativo incluye fijación de PIO objetivo, tratamiento tópico, trabeculoplastia láser, MIGS o cirugía filtrante según estadio y riesgo.',
  'Very high IOP, rapidly progressive visual field loss, painful red eye or angle closure signs require urgent assessment.',
  'PIO muy elevada, progresión rápida del campo visual, ojo rojo doloroso o signos de cierre angular requieren valoración urgente.',
  'guideline',
  'approved',
  true,
  'Structured from European Glaucoma Society and major glaucoma guidelines.',
  '[{"organization":"European Glaucoma Society","type":"guideline"},{"organization":"AAO","type":"Preferred Practice Pattern"}]'::jsonb
),
(
  'Dry Eye Disease',
  'Enfermedad de ojo seco',
  'dry-eye-disease',
  'ocular_surface',
  array['DED','dry eye'],
  array['EOS','ojo seco'],
  'Multifactorial ocular surface disease characterized by loss of tear film homeostasis and ocular symptoms.',
  'Enfermedad multifactorial de la superficie ocular caracterizada por pérdida de homeostasis de la película lagrimal y síntomas oculares.',
  'Assessment includes symptoms, tear breakup time, staining, tear volume, meibomian gland evaluation, inflammatory signs and differential diagnosis.',
  'La evaluación incluye síntomas, tiempo de ruptura lagrimal, tinciones, volumen lagrimal, glándulas de Meibomio, signos inflamatorios y diagnóstico diferencial.',
  'Educational management includes tear substitutes, lid hygiene, anti-inflammatory therapy, punctal occlusion, meibomian gland treatments and systemic factor management.',
  'El manejo educativo incluye sustitutos lagrimales, higiene palpebral, terapia antiinflamatoria, oclusión punctal, tratamientos de glándulas de Meibomio y factores sistémicos.',
  'Severe pain disproportionate to signs, corneal ulceration, neurotrophic disease or infectious keratitis suspicion require urgent review.',
  'Dolor intenso desproporcionado, ulceración corneal, enfermedad neurotrófica o sospecha de queratitis infecciosa requieren revisión urgente.',
  'guideline',
  'approved',
  true,
  'Structured from TFOS DEWS II and ocular surface educational guidance.',
  '[{"organization":"TFOS","type":"DEWS II"}]'::jsonb
),
(
  'Keratoconus',
  'Queratocono',
  'keratoconus',
  'cornea',
  array['corneal ectasia'],
  array['ectasia corneal'],
  'Progressive corneal ectatic disorder with stromal thinning and irregular astigmatism.',
  'Trastorno ectásico corneal progresivo con adelgazamiento estromal y astigmatismo irregular.',
  'Assessment includes refraction, slit-lamp signs, corneal topography/tomography, pachymetry and progression analysis.',
  'La evaluación incluye refracción, signos en lámpara de hendidura, topografía/tomografía corneal, paquimetría y análisis de progresión.',
  'Educational management includes glasses, contact lenses, corneal cross-linking for progression, intracorneal ring segments and keratoplasty in advanced cases.',
  'El manejo educativo incluye gafas, lentes de contacto, cross-linking ante progresión, segmentos intracorneales y queratoplastia en casos avanzados.',
  'Acute hydrops, rapid progression in young patients or severe scarring require specialist assessment.',
  'Hidrops agudo, progresión rápida en jóvenes o cicatrización severa requieren valoración especializada.',
  'guideline',
  'approved',
  true,
  'Structured from cornea consensus and educational guidance.',
  '[{"organization":"AAO","type":"clinical guidance"}]'::jsonb
),
(
  'Cataract',
  'Catarata',
  'cataract',
  'cataract',
  array['lens opacity'],
  array['opacidad cristaliniana'],
  'Opacification of the crystalline lens causing visual impairment or functional symptoms.',
  'Opacificación del cristalino que produce disminución visual o síntomas funcionales.',
  'Assessment includes visual acuity, refraction, slit-lamp examination, fundus assessment, biometry and surgical risk evaluation.',
  'La evaluación incluye agudeza visual, refracción, lámpara de hendidura, fondo de ojo, biometría y evaluación de riesgo quirúrgico.',
  'Educational management is surgical when symptoms and clinical findings justify intervention; IOL selection and risk counselling are key.',
  'El manejo educativo es quirúrgico cuando síntomas y hallazgos lo justifican; la selección de LIO y consentimiento son claves.',
  'Lens-induced glaucoma, trauma, phacolytic inflammation or severe pain require urgent assessment.',
  'Glaucoma facolítico, trauma, inflamación facogénica o dolor severo requieren valoración urgente.',
  'guideline',
  'approved',
  true,
  'Structured from cataract PPP and surgical educational references.',
  '[{"organization":"AAO","type":"Preferred Practice Pattern"},{"organization":"NICE","type":"guideline"}]'::jsonb
)
on conflict (slug) do nothing;

insert into public.oph_medications (
  generic_name_en, generic_name_es, brand_names, medication_class, route,
  mechanism_en, mechanism_es, common_uses_en, common_uses_es,
  warnings_en, warnings_es, adverse_effects_en, adverse_effects_es,
  is_prescription, is_intravitreal, status, is_active, references_json
)
values
(
  'Ranibizumab',
  'Ranibizumab',
  array['Lucentis'],
  'anti_vegf',
  'intravitreal',
  'Anti-VEGF monoclonal antibody fragment inhibiting VEGF-A.',
  'Fragmento de anticuerpo monoclonal anti-VEGF que inhibe VEGF-A.',
  'Educational use areas include neovascular AMD, diabetic macular edema, retinal vein occlusion macular edema and selected CNV scenarios.',
  'Áreas educativas de uso incluyen DMAE neovascular, edema macular diabético, edema por oclusión venosa retiniana y ciertos escenarios de NVC.',
  'Intravitreal therapy requires aseptic technique, patient counselling and urgent review if endophthalmitis symptoms occur.',
  'La terapia intravítrea requiere técnica aséptica, información al paciente y revisión urgente ante síntomas de endoftalmitis.',
  'Potential risks include endophthalmitis, intraocular inflammation, transient IOP elevation and systemic vascular concerns in high-risk patients.',
  'Riesgos potenciales incluyen endoftalmitis, inflamación intraocular, elevación transitoria de PIO y consideraciones vasculares sistémicas en pacientes de riesgo.',
  true,
  true,
  'approved',
  true,
  '[{"source":"regulatory label"},{"source":"retina guidelines"}]'::jsonb
),
(
  'Aflibercept',
  'Aflibercept',
  array['Eylea'],
  'anti_vegf',
  'intravitreal',
  'VEGF trap fusion protein binding VEGF-A, VEGF-B and placental growth factor.',
  'Proteína de fusión tipo trampa VEGF que se une a VEGF-A, VEGF-B y factor de crecimiento placentario.',
  'Educational use areas include neovascular AMD, diabetic macular edema and retinal vein occlusion macular edema.',
  'Áreas educativas de uso incluyen DMAE neovascular, edema macular diabético y edema por oclusión venosa retiniana.',
  'Use must follow approved indication, local protocol and injection safety standards.',
  'Debe usarse según indicación aprobada, protocolo local y estándares de seguridad de inyección.',
  'Potential risks include intraocular inflammation, endophthalmitis and transient IOP rise.',
  'Riesgos potenciales incluyen inflamación intraocular, endoftalmitis y elevación transitoria de PIO.',
  true,
  true,
  'approved',
  true,
  '[{"source":"regulatory label"},{"source":"retina guidelines"}]'::jsonb
),
(
  'Dexamethasone intravitreal implant',
  'Implante intravítreo de dexametasona',
  array['Ozurdex'],
  'corticosteroid',
  'implant',
  'Sustained-release corticosteroid implant with anti-inflammatory and anti-edematous effects.',
  'Implante de corticosteroide de liberación sostenida con efecto antiinflamatorio y antiedematoso.',
  'Educational use areas include diabetic macular edema, retinal vein occlusion macular edema and non-infectious uveitis affecting the posterior segment depending on approved indications.',
  'Áreas educativas incluyen edema macular diabético, edema por oclusión venosa retiniana y uveítis no infecciosa del segmento posterior según indicaciones aprobadas.',
  'Monitor intraocular pressure and lens status; avoid when infection is suspected.',
  'Monitorizar PIO y cristalino; evitar si se sospecha infección.',
  'IOP elevation, cataract progression, implant migration in selected anterior segment scenarios and infection risk.',
  'Elevación de PIO, progresión de catarata, migración del implante en ciertos escenarios de segmento anterior y riesgo infeccioso.',
  true,
  true,
  'approved',
  true,
  '[{"source":"regulatory label"},{"source":"retina and uveitis guidance"}]'::jsonb
),
(
  'Latanoprost',
  'Latanoprost',
  array['Xalatan'],
  'glaucoma_prostaglandin',
  'topical',
  'Prostaglandin analogue increasing uveoscleral outflow.',
  'Análogo de prostaglandina que aumenta el drenaje uveoescleral.',
  'Educational use includes intraocular pressure reduction in open-angle glaucoma and ocular hypertension.',
  'Uso educativo: reducción de PIO en glaucoma de ángulo abierto e hipertensión ocular.',
  'Assess contraindications, ocular inflammation history and prostaglandin-associated adverse effects.',
  'Valorar contraindicaciones, antecedente inflamatorio y efectos adversos asociados a prostaglandinas.',
  'Conjunctival hyperemia, eyelash growth, periocular pigmentation, iris pigmentation and rare inflammatory concerns.',
  'Hiperemia conjuntival, crecimiento de pestañas, pigmentación periocular, pigmentación iridiana y raras preocupaciones inflamatorias.',
  true,
  false,
  'approved',
  true,
  '[{"source":"glaucoma guidelines"},{"source":"regulatory label"}]'::jsonb
),
(
  'Timolol',
  'Timolol',
  array['Timoptic'],
  'glaucoma_beta_blocker',
  'topical',
  'Topical beta-blocker reducing aqueous humour production.',
  'Betabloqueante tópico que reduce la producción de humor acuoso.',
  'Educational use includes IOP reduction in glaucoma and ocular hypertension.',
  'Uso educativo: reducción de PIO en glaucoma e hipertensión ocular.',
  'Consider systemic contraindications such as asthma, COPD, bradycardia or heart block.',
  'Considerar contraindicaciones sistémicas como asma, EPOC, bradicardia o bloqueo cardíaco.',
  'Potential systemic beta-blocker effects, ocular irritation and dry eye worsening.',
  'Posibles efectos sistémicos betabloqueantes, irritación ocular y empeoramiento de ojo seco.',
  true,
  false,
  'approved',
  true,
  '[{"source":"glaucoma guidelines"},{"source":"regulatory label"}]'::jsonb
)
on conflict (generic_name_en, route, medication_class) do nothing;

-- Link medication indications to pathologies where present
insert into public.oph_medication_indications (
  medication_id, pathology_id, indication_en, indication_es, line_of_therapy,
  evidence_level, status, is_active, references_json
)
select
  m.id,
  p.id,
  'Educational discussion of anti-VEGF therapy as a treatment option in diabetic macular edema according to approved indications and local protocols.',
  'Discusión educativa de anti-VEGF como opción terapéutica en edema macular diabético según indicaciones aprobadas y protocolos locales.',
  'first-line or protocol-dependent',
  'guideline',
  'approved',
  true,
  '[{"source":"retina guidelines"}]'::jsonb
from public.oph_medications m
join public.oph_pathologies p on p.slug = 'diabetic-macular-edema'
where m.generic_name_en in ('Ranibizumab','Aflibercept')
on conflict do nothing;

insert into public.oph_protocols (
  title_en, title_es, slug, subspecialty, pathology_id, protocol_type,
  objective_en, objective_es, step_by_step_en, step_by_step_es,
  investigations_en, investigations_es, treatment_algorithm_en, treatment_algorithm_es,
  follow_up_en, follow_up_es, red_flags_en, red_flags_es,
  evidence_level, status, is_active, references_json
)
select
  'Educational Diagnostic Pathway for Diabetic Macular Edema',
  'Vía diagnóstica educativa para edema macular diabético',
  'educational-dme-diagnostic-pathway',
  'retina',
  p.id,
  'diagnostic',
  'Provide a structured educational approach to evaluating suspected diabetic macular edema.',
  'Proporcionar un enfoque educativo estructurado para evaluar sospecha de edema macular diabético.',
  '1. Confirm diabetes and visual symptoms. 2. Assess visual acuity. 3. Perform slit-lamp and dilated fundus exam. 4. Obtain OCT. 5. Evaluate diabetic retinopathy severity. 6. Review systemic factors.',
  '1. Confirmar diabetes y síntomas visuales. 2. Valorar agudeza visual. 3. Exploración con lámpara y fondo dilatado. 4. Realizar OCT. 5. Evaluar gravedad de retinopatía diabética. 6. Revisar factores sistémicos.',
  'OCT, fundus photography, fluorescein angiography when indicated, systemic HbA1c/BP/lipid context.',
  'OCT, retinografía, angiografía fluoresceínica si procede, contexto sistémico HbA1c/TA/lípidos.',
  'Management discussion may include observation in selected non-centre-involving cases, anti-VEGF therapy, corticosteroid implants in selected cases, laser in specific scenarios and systemic optimisation.',
  'El manejo puede incluir observación en casos seleccionados no centrales, anti-VEGF, implantes corticosteroideos en casos seleccionados, láser en escenarios concretos y optimización sistémica.',
  'Follow-up depends on visual acuity, OCT response, treatment choice and systemic control.',
  'El seguimiento depende de agudeza visual, respuesta OCT, tratamiento elegido y control sistémico.',
  'Sudden severe vision loss, tractional detachment, suspected endophthalmitis after injection or advanced proliferative disease.',
  'Pérdida visual súbita severa, desprendimiento traccional, sospecha de endoftalmitis tras inyección o enfermedad proliferativa avanzada.',
  'guideline',
  'approved',
  true,
  '[{"organization":"AAO","type":"PPP"},{"organization":"EURETINA","type":"guidance"}]'::jsonb
from public.oph_pathologies p
where p.slug = 'diabetic-macular-edema'
on conflict (slug) do nothing;

insert into public.oph_protocol_steps (protocol_id, step_order, step_title_en, step_title_es, step_body_en, step_body_es, decision_point, warning_level)
select
  pr.id,
  v.step_order,
  v.step_title_en,
  v.step_title_es,
  v.step_body_en,
  v.step_body_es,
  v.decision_point,
  v.warning_level
from public.oph_protocols pr
cross join (
  values
  (1, 'Confirm clinical context', 'Confirmar contexto clínico', 'Confirm diabetes status, symptoms, duration and systemic risk factors.', 'Confirmar diabetes, síntomas, duración y factores sistémicos.', false, 'info'),
  (2, 'Perform OCT-based assessment', 'Evaluación basada en OCT', 'Assess centre involvement, retinal thickness, intraretinal/subretinal fluid and biomarkers.', 'Valorar afectación central, grosor retiniano, fluido intra/subretiniano y biomarcadores.', true, 'info'),
  (3, 'Assess retinopathy severity', 'Valorar gravedad de retinopatía', 'Document non-proliferative or proliferative diabetic retinopathy and ischemic signs.', 'Documentar retinopatía no proliferativa o proliferativa y signos isquémicos.', true, 'caution'),
  (4, 'Identify red flags', 'Identificar signos de alarma', 'Evaluate traction, vitreous haemorrhage, sudden severe loss or post-injection infection symptoms.', 'Evaluar tracción, hemorragia vítrea, pérdida súbita severa o síntomas infecciosos postinyección.', true, 'urgent')
) as v(step_order, step_title_en, step_title_es, step_body_en, step_body_es, decision_point, warning_level)
where pr.slug = 'educational-dme-diagnostic-pathway'
on conflict (protocol_id, step_order) do nothing;

insert into public.oph_devices (
  name, manufacturer, device_category, subspecialty,
  description_en, description_es, intended_use_en, intended_use_es,
  indications_en, indications_es, limitations_en, limitations_es,
  status, is_active, references_json
)
values
(
  'Optical Coherence Tomography',
  'Multiple manufacturers',
  'imaging',
  'retina',
  'Non-invasive cross-sectional retinal and optic nerve imaging technology.',
  'Tecnología de imagen no invasiva transversal de retina y nervio óptico.',
  'Structural assessment of retina, macula, optic nerve and anterior segment depending on device configuration.',
  'Evaluación estructural de retina, mácula, nervio óptico y segmento anterior según configuración.',
  'Used across macular disease, glaucoma, optic neuropathy and anterior segment evaluation.',
  'Usado en patología macular, glaucoma, neuropatías ópticas y evaluación de segmento anterior.',
  'Interpretation depends on image quality, segmentation accuracy and clinical context.',
  'La interpretación depende de calidad de imagen, segmentación y contexto clínico.',
  'approved',
  true,
  '[{"source":"clinical imaging standards"}]'::jsonb
),
(
  'Fundus Camera',
  'Multiple manufacturers',
  'imaging',
  'retina',
  'Color retinal photography system for documentation and screening.',
  'Sistema de fotografía retiniana en color para documentación y cribado.',
  'Documentation of posterior segment findings and screening workflows.',
  'Documentación de hallazgos de segmento posterior y circuitos de cribado.',
  'Diabetic retinopathy screening, optic disc documentation and retinal lesion monitoring.',
  'Cribado de retinopatía diabética, documentación papilar y seguimiento de lesiones retinianas.',
  'Limited by media opacity, field of view and image quality.',
  'Limitado por opacidades de medios, campo de visión y calidad de imagen.',
  'approved',
  true,
  '[{"source":"clinical imaging standards"}]'::jsonb
),
(
  'Visual Field Analyzer',
  'Multiple manufacturers',
  'diagnostic',
  'glaucoma',
  'Automated perimetry device assessing functional visual field loss.',
  'Campímetro automatizado para evaluar pérdida funcional del campo visual.',
  'Functional assessment in glaucoma, neuro-ophthalmology and retinal disease.',
  'Evaluación funcional en glaucoma, neurooftalmología y retina.',
  'Glaucoma diagnosis and progression monitoring, neurovisual pathway assessment.',
  'Diagnóstico y seguimiento de glaucoma, evaluación de vías neurovisuales.',
  'Reliability depends on patient cooperation, learning effect and test strategy.',
  'La fiabilidad depende de cooperación, efecto aprendizaje y estrategia de prueba.',
  'approved',
  true,
  '[{"source":"glaucoma guidelines"}]'::jsonb
)
on conflict (name, manufacturer) do nothing;

insert into public.oph_guidelines (
  title, organization, country_region, source_type, subspecialty, publication_year, version, url,
  summary_en, summary_es, key_recommendations_en, key_recommendations_es,
  copyright_notes, status, is_active, metadata
)
values
(
  'Preferred Practice Patterns',
  'American Academy of Ophthalmology',
  'United States / International reference',
  'preferred_practice_pattern',
  'general_ophthalmology',
  null,
  'Current online versions',
  'https://www.aao.org/education/about-preferred-practice-patterns',
  'AAO Preferred Practice Patterns are evidence-based clinical guidance documents covering major ophthalmic conditions.',
  'Los Preferred Practice Patterns de la AAO son documentos de guía clínica basados en evidencia para grandes áreas oftalmológicas.',
  'Use as a reference source; adapt to local regulatory and clinical context.',
  'Usar como fuente de referencia; adaptar al contexto regulatorio y clínico local.',
  'Do not copy copyrighted content directly. Store metadata, summaries and links unless license allows full text.',
  'approved',
  true,
  '{"important":true}'::jsonb
),
(
  'European Glaucoma Society Terminology and Guidelines',
  'European Glaucoma Society',
  'Europe',
  'clinical_guideline',
  'glaucoma',
  null,
  'Current edition',
  'https://eugs.org',
  'Major European reference for glaucoma terminology, diagnosis and management.',
  'Referencia europea principal para terminología, diagnóstico y manejo del glaucoma.',
  'Use for glaucoma staging, target IOP concepts and management algorithms.',
  'Usar para estadificación, concepto de PIO objetivo y algoritmos de manejo.',
  'Check license before storing full text.',
  'approved',
  true,
  '{"important":true}'::jsonb
),
(
  'TFOS DEWS II Report',
  'Tear Film & Ocular Surface Society',
  'International',
  'consensus_statement',
  'ocular_surface',
  2017,
  'DEWS II',
  'https://www.tfosdewsreport.org',
  'International consensus report on dry eye disease definition, diagnosis and management.',
  'Consenso internacional sobre definición, diagnóstico y manejo de enfermedad de ojo seco.',
  'Use as key reference for dry eye classification, diagnosis and stepwise management.',
  'Usar como referencia clave para clasificación, diagnóstico y manejo escalonado del ojo seco.',
  'Check license before storing full text.',
  'approved',
  true,
  '{"important":true}'::jsonb
),
(
  'SUN Classification Criteria for Uveitis',
  'Standardization of Uveitis Nomenclature Working Group',
  'International',
  'classification_criteria',
  'uveitis',
  null,
  'SUN',
  null,
  'International nomenclature and classification criteria for uveitis entities.',
  'Nomenclatura internacional y criterios de clasificación para entidades de uveítis.',
  'Use for standardized uveitis terminology and classification.',
  'Usar para terminología y clasificación estandarizada de uveítis.',
  'Store citation and summaries; avoid full-text copyright issues.',
  'approved',
  true,
  '{"important":true}'::jsonb
)
on conflict (title, organization, publication_year) do nothing;

insert into public.oph_classifications (
  name, acronym, subspecialty, pathology_id,
  description_en, description_es, clinical_use_en, clinical_use_es,
  original_source, status, is_active, references_json
)
select
  'International Clinical Diabetic Retinopathy and Diabetic Macular Edema Disease Severity Scales',
  'ICDR/DME',
  'retina',
  p.id,
  'Clinical grading framework for diabetic retinopathy and diabetic macular edema severity.',
  'Marco clínico de graduación de severidad para retinopatía diabética y edema macular diabético.',
  'Used to structure severity assessment and educational discussion of diabetic eye disease.',
  'Usada para estructurar la valoración de gravedad y discusión educativa de enfermedad ocular diabética.',
  'International clinical classification',
  'approved',
  true,
  '[{"source":"International clinical severity scale"}]'::jsonb
from public.oph_pathologies p
where p.slug = 'diabetic-macular-edema'
on conflict (name, subspecialty) do nothing;

insert into public.oph_classification_items (
  classification_id, item_order, code, label_en, label_es, definition_en, definition_es, management_implication_en, management_implication_es
)
select
  c.id, v.item_order, v.code, v.label_en, v.label_es, v.definition_en, v.definition_es, v.management_implication_en, v.management_implication_es
from public.oph_classifications c
cross join (
  values
  (1, 'no_dr', 'No apparent diabetic retinopathy', 'Sin retinopatía diabética aparente', 'No abnormalities.', 'Sin anomalías.', 'Continue screening according to local protocol.', 'Continuar cribado según protocolo local.'),
  (2, 'mild_npdr', 'Mild non-proliferative diabetic retinopathy', 'Retinopatía diabética no proliferativa leve', 'Microaneurysms only.', 'Solo microaneurismas.', 'Monitor and optimise systemic risk factors.', 'Seguimiento y optimización sistémica.'),
  (3, 'moderate_npdr', 'Moderate non-proliferative diabetic retinopathy', 'Retinopatía diabética no proliferativa moderada', 'More than microaneurysms but less than severe NPDR.', 'Más que microaneurismas pero menos que RDNP severa.', 'Closer follow-up may be indicated.', 'Puede indicarse seguimiento más estrecho.'),
  (4, 'severe_npdr', 'Severe non-proliferative diabetic retinopathy', 'Retinopatía diabética no proliferativa severa', 'Severe retinal haemorrhages, venous beading or IRMA according to classification criteria.', 'Hemorragias severas, arrosariamiento venoso o IRMA según criterios.', 'High risk of progression; retina specialist assessment.', 'Alto riesgo de progresión; valoración por retina.'),
  (5, 'pdr', 'Proliferative diabetic retinopathy', 'Retinopatía diabética proliferativa', 'Neovascularization or vitreous/preretinal haemorrhage.', 'Neovascularización o hemorragia vítrea/prerretiniana.', 'Specialist management required.', 'Requiere manejo especializado.')
) as v(item_order, code, label_en, label_es, definition_en, definition_es, management_implication_en, management_implication_es)
where c.acronym = 'ICDR/DME'
on conflict (classification_id, item_order) do nothing;

insert into public.oph_case_templates (
  title_en, title_es, slug, subspecialty, pathology_id, difficulty_level,
  learning_objectives_en, learning_objectives_es, case_prompt_en, case_prompt_es,
  required_fields, suggested_discussion_points_en, suggested_discussion_points_es,
  red_flags_en, red_flags_es, status, is_active, metadata
)
select
  'Diabetic Macular Edema with Suboptimal Anti-VEGF Response',
  'Edema macular diabético con respuesta subóptima a anti-VEGF',
  'dme-suboptimal-anti-vegf-response',
  'retina',
  p.id,
  'advanced',
  'Evaluate response to anti-VEGF therapy, OCT biomarkers, alternative therapeutic strategies and safety considerations.',
  'Evaluar respuesta a anti-VEGF, biomarcadores OCT, alternativas terapéuticas y seguridad.',
  'Create an anonymised educational case of a patient with diabetic macular edema and incomplete response to previous anti-VEGF therapy.',
  'Crear un caso educativo anonimizado de un paciente con edema macular diabético y respuesta incompleta a anti-VEGF previo.',
  '["age_range","visual_acuity","diabetes_duration","HbA1c_context","OCT_findings","previous_injections","IOP","lens_status","clinical_question"]'::jsonb,
  'Assess adherence, OCT biomarkers, pseudophakia, IOP risk, inflammatory component and treatment burden.',
  'Valorar adherencia, biomarcadores OCT, pseudofaquia, riesgo de PIO, componente inflamatorio y carga terapéutica.',
  'Sudden severe vision loss, traction, proliferative disease or post-injection endophthalmitis symptoms.',
  'Pérdida visual súbita severa, tracción, enfermedad proliferativa o síntomas de endoftalmitis postinyección.',
  'approved',
  true,
  '{"template_type":"real_case_collection","fabricated_patient":false}'::jsonb
from public.oph_pathologies p
where p.slug = 'diabetic-macular-edema'
on conflict (slug) do nothing;

insert into public.oph_case_template_sections (
  case_template_id, section_order, section_key, section_title_en, section_title_es,
  instructions_en, instructions_es, is_required
)
select
  ct.id,
  v.section_order,
  v.section_key,
  v.section_title_en,
  v.section_title_es,
  v.instructions_en,
  v.instructions_es,
  v.is_required
from public.oph_case_templates ct
cross join (
  values
  (1, 'context', 'Clinical context', 'Contexto clínico', 'Describe the anonymised patient context without identifiable data.', 'Describe el contexto anonimizado sin datos identificativos.', true),
  (2, 'findings', 'Clinical and imaging findings', 'Hallazgos clínicos y de imagen', 'Summarise examination, OCT and relevant imaging.', 'Resume exploración, OCT e imagen relevante.', true),
  (3, 'previous_treatment', 'Previous treatment', 'Tratamiento previo', 'List previous treatments and response without exact identifiable dates.', 'Lista tratamientos previos y respuesta sin fechas identificativas exactas.', true),
  (4, 'discussion', 'Clinical discussion question', 'Pregunta de discusión clínica', 'State the educational question for peer discussion.', 'Formula la pregunta educativa para debate.', true)
) as v(section_order, section_key, section_title_en, section_title_es, instructions_en, instructions_es, is_required)
where ct.slug = 'dme-suboptimal-anti-vegf-response'
on conflict (case_template_id, section_order) do nothing;

-- ============================================================
-- 23. FINAL CHECK
-- ============================================================

select
  'Ophthalmology Radar Clinical Knowledge Base schema completed successfully' as status,
  now() as completed_at;

