-- Extend evidence-level vocabulary and (re)create temporary seed helper for bulk KB import
alter type public.oph_evidence_level add value if not exists 'clinical_guideline';
alter type public.oph_evidence_level add value if not exists 'regulatory_document';

create or replace function public.oph_seed_exec(sql text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  execute sql;
end;
$$;

revoke all on function public.oph_seed_exec(text) from public, anon, authenticated;
grant execute on function public.oph_seed_exec(text) to service_role;