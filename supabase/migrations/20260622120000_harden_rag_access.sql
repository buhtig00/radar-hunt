-- ============================================================
-- P0 SECURITY HARDENING — restrict RAG corpus access
-- ============================================================
-- Problema: el corpus aprobado (ai_chunks) y la función de búsqueda vectorial
-- (match_ai_chunks) estaban concedidos a `anon`. Cualquier visitante con la
-- publishable key podía volcar todo el contenido curado y ejecutar búsqueda
-- semántica sin autenticarse. La recuperación de RAG real de la app se hace
-- en el servidor con service_role, que ignora RLS; por tanto retirar `anon`
-- y exigir un rol clínico verificado NO afecta al funcionamiento de la app.
-- ============================================================

-- Helper: ¿el usuario actual tiene un rol con acceso al contenido clínico?
create or replace function public.oph_has_clinical_access()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((
    select exists (
      select 1 from public.or_ai_user_roles r
      where r.user_id = auth.uid()
        and r.role in ('admin','medical_editor','kol','verified_doctor')
        and r.is_active = true
    )
  ), false);
$$;

-- ---- ai_chunks: quitar lectura pública ----
revoke select on public.ai_chunks from anon;

drop policy if exists "Chunks public read for approved sources" on public.ai_chunks;
create policy "Chunks read for verified clinical roles"
  on public.ai_chunks for select
  to authenticated
  using (
    public.oph_has_clinical_access()
    and exists (
      select 1 from public.ai_knowledge_sources s
      where s.id = source_id
        and s.approval_status = 'Approved'
        and s.is_active = true
    )
  );

-- ---- match_ai_chunks: retirar ejecución a anon ----
revoke execute on function public.match_ai_chunks(vector, int, text, text) from anon;
-- (authenticated y service_role conservan EXECUTE)
