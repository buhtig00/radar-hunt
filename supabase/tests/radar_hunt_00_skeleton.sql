create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create type public.or_ai_role as enum ('admin','medical_editor','kol','verified_doctor','industry_user');
create table public.or_ai_user_roles (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), role public.or_ai_role not null, is_active boolean not null default true, unique(user_id, role));
create type public.oph_subspecialty as enum ('retina','glaucoma','cornea','ocular_surface','cataract','refractive','uveitis','oculoplastics','neuro_ophthalmology','pediatric_ophthalmology','strabismus','contactology','low_vision','ocular_oncology','ocular_trauma','emergency_ophthalmology','general_ophthalmology');
create type public.oph_content_status as enum ('draft','pending_review','approved','needs_update','rejected','archived');
create table public.oph_references (id uuid primary key default gen_random_uuid(), title text not null);
create table public.oph_anatomical_sites (id uuid primary key default gen_random_uuid(), code text unique);
create table public.oph_pathologies (id uuid primary key default gen_random_uuid());
