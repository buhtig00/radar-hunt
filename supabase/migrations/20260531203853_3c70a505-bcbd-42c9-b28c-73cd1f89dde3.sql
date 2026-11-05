-- ROLES
do $$
begin
  if not exists (select 1 from pg_type where typname = 'or_ai_role') then
    create type public.or_ai_role as enum ('admin','medical_editor','kol','verified_doctor','industry_user');
  end if;
end $$;

create table if not exists public.or_ai_user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.or_ai_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.or_ai_user_roles to authenticated;
grant all on public.or_ai_user_roles to service_role;
alter table public.or_ai_user_roles enable row level security;
drop policy if exists "or_ai_user_roles_self_read" on public.or_ai_user_roles;
create policy "or_ai_user_roles_self_read" on public.or_ai_user_roles for select to authenticated using (auth.uid() = user_id);

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- ENUMS
do $$ begin if not exists (select 1 from pg_type where typname='oph_subspecialty') then
  create type public.oph_subspecialty as enum ('retina','glaucoma','cornea','ocular_surface','cataract','refractive','uveitis','oculoplastics','neuro_ophthalmology','pediatric_ophthalmology','strabismus','contactology','low_vision','ocular_oncology','ocular_trauma','emergency_ophthalmology','general_ophthalmology');
end if; end $$;
do $$ begin if not exists (select 1 from pg_type where typname='oph_content_status') then
  create type public.oph_content_status as enum ('draft','pending_review','approved','needs_update','rejected','archived');
end if; end $$;
do $$ begin if not exists (select 1 from pg_type where typname='oph_evidence_level') then
  create type public.oph_evidence_level as enum ('guideline','systematic_review','randomized_trial','prospective_study','retrospective_study','case_series','case_report','expert_consensus','expert_opinion','educational_reference','not_applicable');
end if; end $$;
do $$ begin if not exists (select 1 from pg_type where typname='oph_protocol_type') then
  create type public.oph_protocol_type as enum ('diagnostic','therapeutic','surgical','follow_up','emergency','screening','perioperative','patient_selection','complication_management','educational');
end if; end $$;
do $$ begin if not exists (select 1 from pg_type where typname='oph_device_category') then
  create type public.oph_device_category as enum ('diagnostic','imaging','laser','surgical','implant','therapeutic','monitoring','optical','software_ai','simulation_training','instrumentation','other');
end if; end $$;
do $$ begin if not exists (select 1 from pg_type where typname='oph_medication_route') then
  create type public.oph_medication_route as enum ('topical','intravitreal','subconjunctival','subtenon','intracameral','periocular','oral','intravenous','implant','other');
end if; end $$;
do $$ begin if not exists (select 1 from pg_type where typname='oph_medication_class') then
  create type public.oph_medication_class as enum ('anti_vegf','corticosteroid','antibiotic','antiviral','antifungal','anti_inflammatory_nsaid','immunomodulator','immunosuppressant','glaucoma_prostaglandin','glaucoma_beta_blocker','glaucoma_alpha_agonist','glaucoma_carbonic_anhydrase_inhibitor','glaucoma_rho_kinase_inhibitor','glaucoma_miotic','mydriatic_cycloplegic','lubricant_artificial_tear','osmotic_agent','diagnostic_dye','local_anesthetic','anti_allergic','anti_fibrotic','other');
end if; end $$;
do $$ begin if not exists (select 1 from pg_type where typname='oph_guideline_source_type') then
  create type public.oph_guideline_source_type as enum ('clinical_guideline','preferred_practice_pattern','consensus_statement','classification_criteria','society_recommendation','regulatory_document','textbook_reference','other');
end if; end $$;

-- HELPER FUNCTIONS
create or replace function public.oph_is_admin_or_editor() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select exists (select 1 from public.or_ai_user_roles r where r.user_id = auth.uid() and r.role in ('admin','medical_editor') and r.is_active = true)), false);
$$;
create or replace function public.oph_is_admin_editor_or_kol() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select exists (select 1 from public.or_ai_user_roles r where r.user_id = auth.uid() and r.role in ('admin','medical_editor','kol') and r.is_active = true)), false);
$$;

-- TABLES
create table if not exists public.oph_subspecialties (
  id uuid primary key default gen_random_uuid(),
  code public.oph_subspecialty not null unique,
  name_en text not null, name_es text not null,
  description_en text, description_es text,
  sort_order integer default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_oph_subspecialties_updated_at on public.oph_subspecialties;
create trigger trg_oph_subspecialties_updated_at before update on public.oph_subspecialties for each row execute function public.set_updated_at();

create table if not exists public.oph_anatomical_sites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_en text not null, name_es text not null,
  description_en text, description_es text,
  parent_site_id uuid references public.oph_anatomical_sites(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_oph_anatomical_sites_updated_at on public.oph_anatomical_sites;
create trigger trg_oph_anatomical_sites_updated_at before update on public.oph_anatomical_sites for each row execute function public.set_updated_at();

create table if not exists public.oph_pathologies (
  id uuid primary key default gen_random_uuid(),
  name_en text not null, name_es text not null,
  slug text not null unique,
  subspecialty public.oph_subspecialty not null,
  anatomical_site_id uuid references public.oph_anatomical_sites(id) on delete set null,
  synonyms_en text[] not null default '{}',
  synonyms_es text[] not null default '{}',
  icd10_codes text[] not null default '{}',
  snomed_codes text[] not null default '{}',
  definition_en text, definition_es text,
  epidemiology_en text, epidemiology_es text,
  risk_factors_en text, risk_factors_es text,
  clinical_features_en text, clinical_features_es text,
  differential_diagnosis_en text, differential_diagnosis_es text,
  diagnostic_workup_en text, diagnostic_workup_es text,
  treatment_overview_en text, treatment_overview_es text,
  follow_up_en text, follow_up_es text,
  red_flags_en text, red_flags_es text,
  evidence_level public.oph_evidence_level default 'educational_reference',
  source_summary text,
  references_json jsonb not null default '[]'::jsonb,
  status public.oph_content_status not null default 'draft',
  is_active boolean not null default false,
  reviewed_by uuid, kol_validator_id uuid,
  reviewed_at timestamptz, next_review_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(name_en, subspecialty),
  unique(name_es, subspecialty)
);
drop trigger if exists trg_oph_pathologies_updated_at on public.oph_pathologies;
create trigger trg_oph_pathologies_updated_at before update on public.oph_pathologies for each row execute function public.set_updated_at();

create table if not exists public.oph_medications (
  id uuid primary key default gen_random_uuid(),
  generic_name_en text not null, generic_name_es text,
  brand_names text[] not null default '{}',
  medication_class public.oph_medication_class not null,
  route public.oph_medication_route not null,
  mechanism_en text, mechanism_es text,
  common_uses_en text, common_uses_es text,
  contraindications_en text, contraindications_es text,
  warnings_en text, warnings_es text,
  adverse_effects_en text, adverse_effects_es text,
  monitoring_en text, monitoring_es text,
  pregnancy_lactation_notes text, regulatory_notes text,
  is_prescription boolean default true,
  is_intravitreal boolean default false,
  is_surgical_adjuvant boolean default false,
  references_json jsonb not null default '[]'::jsonb,
  status public.oph_content_status not null default 'draft',
  is_active boolean not null default false,
  reviewed_by uuid, kol_validator_id uuid,
  reviewed_at timestamptz, next_review_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(generic_name_en, route, medication_class)
);
drop trigger if exists trg_oph_medications_updated_at on public.oph_medications;
create trigger trg_oph_medications_updated_at before update on public.oph_medications for each row execute function public.set_updated_at();

create table if not exists public.oph_medication_indications (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.oph_medications(id) on delete cascade,
  pathology_id uuid references public.oph_pathologies(id) on delete cascade,
  indication_en text not null, indication_es text,
  line_of_therapy text,
  evidence_level public.oph_evidence_level default 'educational_reference',
  notes_en text, notes_es text,
  status public.oph_content_status not null default 'draft',
  is_active boolean not null default false,
  references_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_oph_medication_indications_updated_at on public.oph_medication_indications;
create trigger trg_oph_medication_indications_updated_at before update on public.oph_medication_indications for each row execute function public.set_updated_at();

create table if not exists public.oph_protocols (
  id uuid primary key default gen_random_uuid(),
  title_en text not null, title_es text not null,
  slug text not null unique,
  subspecialty public.oph_subspecialty not null,
  pathology_id uuid references public.oph_pathologies(id) on delete set null,
  protocol_type public.oph_protocol_type not null,
  target_audience text default 'ophthalmologists',
  clinical_setting text,
  objective_en text, objective_es text,
  inclusion_criteria_en text, inclusion_criteria_es text,
  exclusion_criteria_en text, exclusion_criteria_es text,
  step_by_step_en text, step_by_step_es text,
  investigations_en text, investigations_es text,
  treatment_algorithm_en text, treatment_algorithm_es text,
  follow_up_en text, follow_up_es text,
  escalation_criteria_en text, escalation_criteria_es text,
  red_flags_en text, red_flags_es text,
  patient_safety_notes_en text, patient_safety_notes_es text,
  evidence_level public.oph_evidence_level default 'expert_consensus',
  references_json jsonb not null default '[]'::jsonb,
  status public.oph_content_status not null default 'draft',
  is_active boolean not null default false,
  reviewed_by uuid, kol_validator_id uuid,
  reviewed_at timestamptz, next_review_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_oph_protocols_updated_at on public.oph_protocols;
create trigger trg_oph_protocols_updated_at before update on public.oph_protocols for each row execute function public.set_updated_at();

create table if not exists public.oph_protocol_steps (
  id uuid primary key default gen_random_uuid(),
  protocol_id uuid not null references public.oph_protocols(id) on delete cascade,
  step_order integer not null,
  step_title_en text, step_title_es text,
  step_body_en text not null, step_body_es text,
  decision_point boolean not null default false,
  warning_level text check (warning_level is null or warning_level in ('info','caution','urgent','critical')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(protocol_id, step_order)
);
drop trigger if exists trg_oph_protocol_steps_updated_at on public.oph_protocol_steps;
create trigger trg_oph_protocol_steps_updated_at before update on public.oph_protocol_steps for each row execute function public.set_updated_at();

create table if not exists public.oph_devices (
  id uuid primary key default gen_random_uuid(),
  name text not null, manufacturer text,
  device_category public.oph_device_category not null,
  subspecialty public.oph_subspecialty default 'general_ophthalmology',
  description_en text, description_es text,
  intended_use_en text, intended_use_es text,
  indications_en text, indications_es text,
  limitations_en text, limitations_es text,
  safety_notes_en text, safety_notes_es text,
  regulatory_status text,
  related_pathology_ids uuid[] not null default '{}',
  references_json jsonb not null default '[]'::jsonb,
  status public.oph_content_status not null default 'draft',
  is_active boolean not null default false,
  reviewed_by uuid, kol_validator_id uuid,
  reviewed_at timestamptz, next_review_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(name, manufacturer)
);
drop trigger if exists trg_oph_devices_updated_at on public.oph_devices;
create trigger trg_oph_devices_updated_at before update on public.oph_devices for each row execute function public.set_updated_at();

create table if not exists public.oph_device_uses (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.oph_devices(id) on delete cascade,
  pathology_id uuid references public.oph_pathologies(id) on delete set null,
  protocol_id uuid references public.oph_protocols(id) on delete set null,
  use_case_en text not null, use_case_es text,
  clinical_notes_en text, clinical_notes_es text,
  status public.oph_content_status not null default 'draft',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_oph_device_uses_updated_at on public.oph_device_uses;
create trigger trg_oph_device_uses_updated_at before update on public.oph_device_uses for each row execute function public.set_updated_at();

create table if not exists public.oph_guidelines (
  id uuid primary key default gen_random_uuid(),
  title text not null, organization text not null,
  country_region text,
  source_type public.oph_guideline_source_type not null,
  subspecialty public.oph_subspecialty default 'general_ophthalmology',
  pathology_id uuid references public.oph_pathologies(id) on delete set null,
  publication_year integer, version text,
  url text, doi text, citation text,
  summary_en text, summary_es text,
  key_recommendations_en text, key_recommendations_es text,
  notes_on_use text, copyright_notes text,
  status public.oph_content_status not null default 'draft',
  is_active boolean not null default false,
  reviewed_by uuid,
  reviewed_at timestamptz, next_review_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(title, organization, publication_year)
);
drop trigger if exists trg_oph_guidelines_updated_at on public.oph_guidelines;
create trigger trg_oph_guidelines_updated_at before update on public.oph_guidelines for each row execute function public.set_updated_at();

create table if not exists public.oph_references (
  id uuid primary key default gen_random_uuid(),
  title text not null, authors text, journal_or_source text,
  publication_year integer, doi text, pmid text, url text,
  source_type public.oph_guideline_source_type default 'other',
  abstract_summary_en text, abstract_summary_es text,
  copyright_notes text,
  status public.oph_content_status not null default 'draft',
  is_active boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(title, publication_year)
);
drop trigger if exists trg_oph_references_updated_at on public.oph_references;
create trigger trg_oph_references_updated_at before update on public.oph_references for each row execute function public.set_updated_at();

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
  check (pathology_id is not null or medication_id is not null or protocol_id is not null or device_id is not null or guideline_id is not null)
);

create table if not exists public.oph_classifications (
  id uuid primary key default gen_random_uuid(),
  name text not null, acronym text,
  subspecialty public.oph_subspecialty not null,
  pathology_id uuid references public.oph_pathologies(id) on delete set null,
  description_en text, description_es text,
  clinical_use_en text, clinical_use_es text,
  original_source text,
  references_json jsonb not null default '[]'::jsonb,
  status public.oph_content_status not null default 'draft',
  is_active boolean not null default false,
  reviewed_by uuid, kol_validator_id uuid,
  reviewed_at timestamptz, next_review_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(name, subspecialty)
);
drop trigger if exists trg_oph_classifications_updated_at on public.oph_classifications;
create trigger trg_oph_classifications_updated_at before update on public.oph_classifications for each row execute function public.set_updated_at();

create table if not exists public.oph_classification_items (
  id uuid primary key default gen_random_uuid(),
  classification_id uuid not null references public.oph_classifications(id) on delete cascade,
  item_order integer not null,
  code text,
  label_en text not null, label_es text,
  definition_en text, definition_es text,
  management_implication_en text, management_implication_es text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(classification_id, item_order)
);
drop trigger if exists trg_oph_classification_items_updated_at on public.oph_classification_items;
create trigger trg_oph_classification_items_updated_at before update on public.oph_classification_items for each row execute function public.set_updated_at();

create table if not exists public.oph_case_templates (
  id uuid primary key default gen_random_uuid(),
  title_en text not null, title_es text not null,
  slug text not null unique,
  subspecialty public.oph_subspecialty not null,
  pathology_id uuid references public.oph_pathologies(id) on delete set null,
  difficulty_level text not null default 'intermediate' check (difficulty_level in ('basic','intermediate','advanced','expert')),
  learning_objectives_en text, learning_objectives_es text,
  case_prompt_en text, case_prompt_es text,
  required_fields jsonb not null default '[]'::jsonb,
  suggested_discussion_points_en text, suggested_discussion_points_es text,
  red_flags_en text, red_flags_es text,
  expected_protocol_links uuid[] not null default '{}',
  expected_classification_links uuid[] not null default '{}',
  status public.oph_content_status not null default 'draft',
  is_active boolean not null default false,
  reviewed_by uuid, kol_validator_id uuid,
  reviewed_at timestamptz, next_review_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_oph_case_templates_updated_at on public.oph_case_templates;
create trigger trg_oph_case_templates_updated_at before update on public.oph_case_templates for each row execute function public.set_updated_at();

create table if not exists public.oph_case_template_sections (
  id uuid primary key default gen_random_uuid(),
  case_template_id uuid not null references public.oph_case_templates(id) on delete cascade,
  section_order integer not null,
  section_key text not null,
  section_title_en text not null, section_title_es text,
  instructions_en text, instructions_es text,
  is_required boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(case_template_id, section_order)
);
drop trigger if exists trg_oph_case_template_sections_updated_at on public.oph_case_template_sections;
create trigger trg_oph_case_template_sections_updated_at before update on public.oph_case_template_sections for each row execute function public.set_updated_at();

create table if not exists public.oph_clinical_cases (
  id uuid primary key default gen_random_uuid(),
  case_template_id uuid references public.oph_case_templates(id) on delete set null,
  submitted_by uuid,
  title text not null,
  subspecialty public.oph_subspecialty not null,
  pathology_id uuid references public.oph_pathologies(id) on delete set null,
  age_range text, sex text,
  chief_complaint text, history text, examination text,
  imaging_tests text, treatment_course text, outcome text,
  discussion_question text,
  anonymisation_confirmed boolean not null default false,
  pii_risk_detected boolean not null default false,
  pii_risk_details jsonb not null default '[]'::jsonb,
  status public.oph_content_status not null default 'draft',
  is_active boolean not null default false,
  reviewed_by uuid, kol_validator_id uuid,
  reviewed_at timestamptz, next_review_at timestamptz,
  references_json jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_oph_clinical_cases_updated_at on public.oph_clinical_cases;
create trigger trg_oph_clinical_cases_updated_at before update on public.oph_clinical_cases for each row execute function public.set_updated_at();

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
  check (pathology_id is not null or medication_id is not null or protocol_id is not null or device_id is not null or guideline_id is not null or classification_id is not null or case_template_id is not null)
);

-- VIEWS
create or replace view public.oph_kb_dashboard_metrics as
select
  (select count(*) from public.oph_pathologies) as total_pathologies,
  (select count(*) from public.oph_pathologies where status='approved' and is_active=true) as approved_pathologies,
  (select count(*) from public.oph_medications) as total_medications,
  (select count(*) from public.oph_medications where status='approved' and is_active=true) as approved_medications,
  (select count(*) from public.oph_protocols) as total_protocols,
  (select count(*) from public.oph_devices) as total_devices,
  (select count(*) from public.oph_guidelines) as total_guidelines,
  (select count(*) from public.oph_classifications) as total_classifications,
  (select count(*) from public.oph_case_templates) as total_case_templates,
  (select count(*) from public.oph_clinical_cases where anonymisation_confirmed=false) as cases_missing_anonymisation;

create or replace view public.oph_kb_by_subspecialty as
select s.code as subspecialty, s.name_en, s.name_es,
  coalesce(p.total_pathologies,0) as pathologies,
  coalesce(pr.total_protocols,0) as protocols,
  coalesce(d.total_devices,0) as devices,
  coalesce(g.total_guidelines,0) as guidelines,
  coalesce(c.total_classifications,0) as classifications,
  coalesce(ct.total_case_templates,0) as case_templates
from public.oph_subspecialties s
left join (select subspecialty, count(*) total_pathologies from public.oph_pathologies group by subspecialty) p on p.subspecialty=s.code
left join (select subspecialty, count(*) total_protocols from public.oph_protocols group by subspecialty) pr on pr.subspecialty=s.code
left join (select subspecialty, count(*) total_devices from public.oph_devices group by subspecialty) d on d.subspecialty=s.code
left join (select subspecialty, count(*) total_guidelines from public.oph_guidelines group by subspecialty) g on g.subspecialty=s.code
left join (select subspecialty, count(*) total_classifications from public.oph_classifications group by subspecialty) c on c.subspecialty=s.code
left join (select subspecialty, count(*) total_case_templates from public.oph_case_templates group by subspecialty) ct on ct.subspecialty=s.code
where s.is_active=true
order by s.sort_order, s.name_en;

-- INDEXES
create index if not exists oph_pathologies_subspecialty_idx on public.oph_pathologies(subspecialty);
create index if not exists oph_pathologies_status_idx on public.oph_pathologies(status, is_active);
create index if not exists oph_pathologies_slug_idx on public.oph_pathologies(slug);
create index if not exists oph_medications_class_idx on public.oph_medications(medication_class);
create index if not exists oph_medications_route_idx on public.oph_medications(route);
create index if not exists oph_medications_status_idx on public.oph_medications(status, is_active);
create index if not exists oph_medications_brand_names_idx on public.oph_medications using gin(brand_names);
create index if not exists oph_medication_indications_medication_idx on public.oph_medication_indications(medication_id);
create index if not exists oph_medication_indications_pathology_idx on public.oph_medication_indications(pathology_id);
create index if not exists oph_protocols_subspecialty_idx on public.oph_protocols(subspecialty);
create index if not exists oph_protocols_pathology_idx on public.oph_protocols(pathology_id);
create index if not exists oph_protocols_type_idx on public.oph_protocols(protocol_type);
create index if not exists oph_protocols_status_idx on public.oph_protocols(status, is_active);
create index if not exists oph_protocol_steps_protocol_idx on public.oph_protocol_steps(protocol_id);
create index if not exists oph_devices_category_idx on public.oph_devices(device_category);
create index if not exists oph_devices_subspecialty_idx on public.oph_devices(subspecialty);
create index if not exists oph_devices_status_idx on public.oph_devices(status, is_active);
create index if not exists oph_guidelines_subspecialty_idx on public.oph_guidelines(subspecialty);
create index if not exists oph_guidelines_pathology_idx on public.oph_guidelines(pathology_id);
create index if not exists oph_guidelines_status_idx on public.oph_guidelines(status, is_active);
create index if not exists oph_classifications_subspecialty_idx on public.oph_classifications(subspecialty);
create index if not exists oph_classifications_pathology_idx on public.oph_classifications(pathology_id);
create index if not exists oph_classifications_status_idx on public.oph_classifications(status, is_active);
create index if not exists oph_classification_items_classification_idx on public.oph_classification_items(classification_id);
create index if not exists oph_case_templates_subspecialty_idx on public.oph_case_templates(subspecialty);
create index if not exists oph_case_templates_pathology_idx on public.oph_case_templates(pathology_id);
create index if not exists oph_case_templates_status_idx on public.oph_case_templates(status, is_active);
create index if not exists oph_clinical_cases_subspecialty_idx on public.oph_clinical_cases(subspecialty);
create index if not exists oph_clinical_cases_status_idx on public.oph_clinical_cases(status, is_active);
create index if not exists oph_clinical_cases_submitted_by_idx on public.oph_clinical_cases(submitted_by);

-- RLS
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

do $$ declare r record; begin
  for r in select schemaname, tablename, policyname from pg_policies
    where schemaname='public' and tablename in (
      'oph_subspecialties','oph_anatomical_sites','oph_pathologies','oph_medications',
      'oph_medication_indications','oph_protocols','oph_protocol_steps','oph_devices',
      'oph_device_uses','oph_guidelines','oph_references','oph_reference_links',
      'oph_classifications','oph_classification_items','oph_case_templates',
      'oph_case_template_sections','oph_clinical_cases','oph_pathology_classifications',
      'oph_pathology_guidelines','oph_pathology_protocols','oph_pathology_devices',
      'oph_ai_source_links'
    )
  loop execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename); end loop;
end $$;

create policy "oph_subspecialties_select_active" on public.oph_subspecialties for select using (is_active=true or public.oph_is_admin_or_editor());
create policy "oph_subspecialties_admin_editor_all" on public.oph_subspecialties for all using (public.oph_is_admin_or_editor()) with check (public.oph_is_admin_or_editor());
create policy "oph_anatomical_sites_select_active" on public.oph_anatomical_sites for select using (is_active=true or public.oph_is_admin_or_editor());
create policy "oph_anatomical_sites_admin_editor_all" on public.oph_anatomical_sites for all using (public.oph_is_admin_or_editor()) with check (public.oph_is_admin_or_editor());
create policy "oph_pathologies_select_approved" on public.oph_pathologies for select using ((status='approved' and is_active=true) or public.oph_is_admin_editor_or_kol());
create policy "oph_pathologies_admin_editor_all" on public.oph_pathologies for all using (public.oph_is_admin_or_editor()) with check (public.oph_is_admin_or_editor());
create policy "oph_medications_select_approved" on public.oph_medications for select using ((status='approved' and is_active=true) or public.oph_is_admin_editor_or_kol());
create policy "oph_medications_admin_editor_all" on public.oph_medications for all using (public.oph_is_admin_or_editor()) with check (public.oph_is_admin_or_editor());
create policy "oph_medication_indications_select_approved" on public.oph_medication_indications for select using ((status='approved' and is_active=true) or public.oph_is_admin_editor_or_kol());
create policy "oph_medication_indications_admin_editor_all" on public.oph_medication_indications for all using (public.oph_is_admin_or_editor()) with check (public.oph_is_admin_or_editor());
create policy "oph_protocols_select_approved" on public.oph_protocols for select using ((status='approved' and is_active=true) or public.oph_is_admin_editor_or_kol());
create policy "oph_protocols_admin_editor_all" on public.oph_protocols for all using (public.oph_is_admin_or_editor()) with check (public.oph_is_admin_or_editor());
create policy "oph_protocol_steps_select_if_protocol_visible" on public.oph_protocol_steps for select using (
  exists (select 1 from public.oph_protocols p where p.id=oph_protocol_steps.protocol_id and ((p.status='approved' and p.is_active=true) or public.oph_is_admin_editor_or_kol()))
);
create policy "oph_protocol_steps_admin_editor_all" on public.oph_protocol_steps for all using (public.oph_is_admin_or_editor()) with check (public.oph_is_admin_or_editor());
create policy "oph_devices_select_approved" on public.oph_devices for select using ((status='approved' and is_active=true) or public.oph_is_admin_editor_or_kol());
create policy "oph_devices_admin_editor_all" on public.oph_devices for all using (public.oph_is_admin_or_editor()) with check (public.oph_is_admin_or_editor());
create policy "oph_device_uses_select_approved" on public.oph_device_uses for select using ((status='approved' and is_active=true) or public.oph_is_admin_editor_or_kol());
create policy "oph_device_uses_admin_editor_all" on public.oph_device_uses for all using (public.oph_is_admin_or_editor()) with check (public.oph_is_admin_or_editor());
create policy "oph_guidelines_select_approved" on public.oph_guidelines for select using ((status='approved' and is_active=true) or public.oph_is_admin_editor_or_kol());
create policy "oph_guidelines_admin_editor_all" on public.oph_guidelines for all using (public.oph_is_admin_or_editor()) with check (public.oph_is_admin_or_editor());
create policy "oph_references_select_approved" on public.oph_references for select using ((status='approved' and is_active=true) or public.oph_is_admin_editor_or_kol());
create policy "oph_references_admin_editor_all" on public.oph_references for all using (public.oph_is_admin_or_editor()) with check (public.oph_is_admin_or_editor());
create policy "oph_reference_links_select" on public.oph_reference_links for select using (true);
create policy "oph_reference_links_admin_editor_all" on public.oph_reference_links for all using (public.oph_is_admin_or_editor()) with check (public.oph_is_admin_or_editor());
create policy "oph_classifications_select_approved" on public.oph_classifications for select using ((status='approved' and is_active=true) or public.oph_is_admin_editor_or_kol());
create policy "oph_classifications_admin_editor_all" on public.oph_classifications for all using (public.oph_is_admin_or_editor()) with check (public.oph_is_admin_or_editor());
create policy "oph_classification_items_select_if_classification_visible" on public.oph_classification_items for select using (
  exists (select 1 from public.oph_classifications c where c.id=oph_classification_items.classification_id and ((c.status='approved' and c.is_active=true) or public.oph_is_admin_editor_or_kol()))
);
create policy "oph_classification_items_admin_editor_all" on public.oph_classification_items for all using (public.oph_is_admin_or_editor()) with check (public.oph_is_admin_or_editor());
create policy "oph_case_templates_select_approved" on public.oph_case_templates for select using ((status='approved' and is_active=true) or public.oph_is_admin_editor_or_kol());
create policy "oph_case_templates_admin_editor_all" on public.oph_case_templates for all using (public.oph_is_admin_or_editor()) with check (public.oph_is_admin_or_editor());
create policy "oph_case_template_sections_select_if_template_visible" on public.oph_case_template_sections for select using (
  exists (select 1 from public.oph_case_templates ct where ct.id=oph_case_template_sections.case_template_id and ((ct.status='approved' and ct.is_active=true) or public.oph_is_admin_editor_or_kol()))
);
create policy "oph_case_template_sections_admin_editor_all" on public.oph_case_template_sections for all using (public.oph_is_admin_or_editor()) with check (public.oph_is_admin_or_editor());
create policy "oph_clinical_cases_select_owner_or_reviewers" on public.oph_clinical_cases for select using (submitted_by=auth.uid() or public.oph_is_admin_editor_or_kol());
create policy "oph_clinical_cases_insert_own" on public.oph_clinical_cases for insert with check (submitted_by=auth.uid() or public.oph_is_admin_or_editor());
create policy "oph_clinical_cases_update_owner_or_editor" on public.oph_clinical_cases for update using (submitted_by=auth.uid() or public.oph_is_admin_or_editor()) with check (submitted_by=auth.uid() or public.oph_is_admin_or_editor());
create policy "oph_relationships_select_all" on public.oph_pathology_classifications for select using (true);
create policy "oph_relationships_admin_editor_all" on public.oph_pathology_classifications for all using (public.oph_is_admin_or_editor()) with check (public.oph_is_admin_or_editor());
create policy "oph_pathology_guidelines_select_all" on public.oph_pathology_guidelines for select using (true);
create policy "oph_pathology_guidelines_admin_editor_all" on public.oph_pathology_guidelines for all using (public.oph_is_admin_or_editor()) with check (public.oph_is_admin_or_editor());
create policy "oph_pathology_protocols_select_all" on public.oph_pathology_protocols for select using (true);
create policy "oph_pathology_protocols_admin_editor_all" on public.oph_pathology_protocols for all using (public.oph_is_admin_or_editor()) with check (public.oph_is_admin_or_editor());
create policy "oph_pathology_devices_select_all" on public.oph_pathology_devices for select using (true);
create policy "oph_pathology_devices_admin_editor_all" on public.oph_pathology_devices for all using (public.oph_is_admin_or_editor()) with check (public.oph_is_admin_or_editor());
create policy "oph_ai_source_links_select" on public.oph_ai_source_links for select using (true);
create policy "oph_ai_source_links_admin_editor_all" on public.oph_ai_source_links for all using (public.oph_is_admin_or_editor()) with check (public.oph_is_admin_or_editor());

-- SEED TAXONOMY
insert into public.oph_subspecialties (code, name_en, name_es, description_en, description_es, sort_order) values
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
on conflict (code) do update set name_en=excluded.name_en, name_es=excluded.name_es, description_en=excluded.description_en, description_es=excluded.description_es, sort_order=excluded.sort_order, is_active=true;

insert into public.oph_anatomical_sites (code, name_en, name_es, description_en, description_es) values
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
on conflict (code) do update set name_en=excluded.name_en, name_es=excluded.name_es, description_en=excluded.description_en, description_es=excluded.description_es, is_active=true;

-- GRANTS
grant select on public.oph_subspecialties to anon, authenticated;
grant insert, update, delete on public.oph_subspecialties to authenticated;
grant all on public.oph_subspecialties to service_role;
grant select on public.oph_anatomical_sites to anon, authenticated;
grant insert, update, delete on public.oph_anatomical_sites to authenticated;
grant all on public.oph_anatomical_sites to service_role;
grant select on public.oph_pathologies to anon, authenticated;
grant insert, update, delete on public.oph_pathologies to authenticated;
grant all on public.oph_pathologies to service_role;
grant select on public.oph_medications to anon, authenticated;
grant insert, update, delete on public.oph_medications to authenticated;
grant all on public.oph_medications to service_role;
grant select on public.oph_medication_indications to anon, authenticated;
grant insert, update, delete on public.oph_medication_indications to authenticated;
grant all on public.oph_medication_indications to service_role;
grant select on public.oph_protocols to anon, authenticated;
grant insert, update, delete on public.oph_protocols to authenticated;
grant all on public.oph_protocols to service_role;
grant select on public.oph_protocol_steps to anon, authenticated;
grant insert, update, delete on public.oph_protocol_steps to authenticated;
grant all on public.oph_protocol_steps to service_role;
grant select on public.oph_devices to anon, authenticated;
grant insert, update, delete on public.oph_devices to authenticated;
grant all on public.oph_devices to service_role;
grant select on public.oph_device_uses to anon, authenticated;
grant insert, update, delete on public.oph_device_uses to authenticated;
grant all on public.oph_device_uses to service_role;
grant select on public.oph_guidelines to anon, authenticated;
grant insert, update, delete on public.oph_guidelines to authenticated;
grant all on public.oph_guidelines to service_role;
grant select on public.oph_references to anon, authenticated;
grant insert, update, delete on public.oph_references to authenticated;
grant all on public.oph_references to service_role;
grant select on public.oph_reference_links to anon, authenticated;
grant insert, update, delete on public.oph_reference_links to authenticated;
grant all on public.oph_reference_links to service_role;
grant select on public.oph_classifications to anon, authenticated;
grant insert, update, delete on public.oph_classifications to authenticated;
grant all on public.oph_classifications to service_role;
grant select on public.oph_classification_items to anon, authenticated;
grant insert, update, delete on public.oph_classification_items to authenticated;
grant all on public.oph_classification_items to service_role;
grant select on public.oph_case_templates to anon, authenticated;
grant insert, update, delete on public.oph_case_templates to authenticated;
grant all on public.oph_case_templates to service_role;
grant select on public.oph_case_template_sections to anon, authenticated;
grant insert, update, delete on public.oph_case_template_sections to authenticated;
grant all on public.oph_case_template_sections to service_role;
grant select on public.oph_pathology_classifications to anon, authenticated;
grant insert, update, delete on public.oph_pathology_classifications to authenticated;
grant all on public.oph_pathology_classifications to service_role;
grant select on public.oph_pathology_guidelines to anon, authenticated;
grant insert, update, delete on public.oph_pathology_guidelines to authenticated;
grant all on public.oph_pathology_guidelines to service_role;
grant select on public.oph_pathology_protocols to anon, authenticated;
grant insert, update, delete on public.oph_pathology_protocols to authenticated;
grant all on public.oph_pathology_protocols to service_role;
grant select on public.oph_pathology_devices to anon, authenticated;
grant insert, update, delete on public.oph_pathology_devices to authenticated;
grant all on public.oph_pathology_devices to service_role;
grant select on public.oph_ai_source_links to anon, authenticated;
grant insert, update, delete on public.oph_ai_source_links to authenticated;
grant all on public.oph_ai_source_links to service_role;
grant select, insert, update, delete on public.oph_clinical_cases to authenticated;
grant all on public.oph_clinical_cases to service_role;