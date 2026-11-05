-- ============================================================
-- P2 — Data retention (GDPR) for AI interaction logs
-- ============================================================
-- ai_interactions stores the full query text (which may contain residual PII
-- despite the client/server guards) tied to a user_id. This adds a retention
-- job that deletes raw interactions past the retention window (cascading to
-- ai_feedback) and redacts the query excerpt / matched terms kept on
-- ai_safety_events, while preserving the aggregate rows for analytics.
-- ============================================================

create or replace function public.purge_old_ai_data(retention_days int default 365)
returns table(interactions_deleted bigint, safety_events_redacted bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff timestamptz := now() - make_interval(days => greatest(retention_days, 1));
  d1 bigint;
  d2 bigint;
begin
  with del as (
    delete from public.ai_interactions where created_at < cutoff returning 1
  )
  select count(*) into d1 from del;

  with upd as (
    update public.ai_safety_events
       set query_excerpt = null,
           matched_terms = '{}'
     where created_at < cutoff
       and (query_excerpt is not null or array_length(matched_terms, 1) > 0)
    returning 1
  )
  select count(*) into d2 from upd;

  return query select d1, d2;
end;
$$;

revoke all on function public.purge_old_ai_data(int) from public, anon, authenticated;
grant execute on function public.purge_old_ai_data(int) to service_role;

-- Schedule a daily purge at 03:00 UTC when pg_cron is available. Guarded so the
-- migration still succeeds on instances without the extension.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'purge-old-ai-data') then
      perform cron.unschedule('purge-old-ai-data');
    end if;
    perform cron.schedule(
      'purge-old-ai-data',
      '0 3 * * *',
      $cron$select public.purge_old_ai_data(365);$cron$
    );
  end if;
exception when others then
  raise notice 'pg_cron scheduling skipped: %', sqlerrm;
end $$;
