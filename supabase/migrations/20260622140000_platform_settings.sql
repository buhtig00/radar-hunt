-- ============================================================
-- Platform settings (singleton) for the AI Intelligence Layer
-- ============================================================
-- Persists admin-configurable settings (AI provider/model, temperature, token
-- budget, …) so the Settings UI stops being display-only. Writes go through an
-- admin-gated server function (service role); reads are allowed to editorial
-- roles via RLS as defense in depth.
-- ============================================================

create table if not exists public.or_ai_settings (
  id boolean primary key default true,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint or_ai_settings_singleton check (id)
);

grant select on public.or_ai_settings to authenticated;
grant all on public.or_ai_settings to service_role;

alter table public.or_ai_settings enable row level security;

drop policy if exists "or_ai_settings_read" on public.or_ai_settings;
create policy "or_ai_settings_read" on public.or_ai_settings
  for select to authenticated
  using (public.oph_is_admin_editor_or_kol());
-- No INSERT/UPDATE policy for authenticated: writes flow through service_role.

-- Seed the singleton row.
insert into public.or_ai_settings (id, settings)
values (true, '{}'::jsonb)
on conflict (id) do nothing;
