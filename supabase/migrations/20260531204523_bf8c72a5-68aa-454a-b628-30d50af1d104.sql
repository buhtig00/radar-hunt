
-- 1) Fix function search_path mutable: set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2) Move vector extension out of public into a dedicated schema
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'vector' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'ALTER EXTENSION vector SET SCHEMA extensions';
  END IF;
END $$;

-- Keep match_ai_chunks working now that vector lives in `extensions`
CREATE OR REPLACE FUNCTION public.match_ai_chunks(
  query_embedding extensions.vector,
  match_count integer DEFAULT 6,
  filter_subspecialty text DEFAULT NULL,
  filter_language text DEFAULT NULL
)
RETURNS TABLE(
  chunk_id uuid,
  source_id uuid,
  content text,
  similarity double precision,
  source_title text,
  source_type text,
  source_author text,
  source_year integer,
  source_subspecialty text,
  source_language text,
  validation_level text
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT
    c.id AS chunk_id,
    c.source_id,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity,
    s.title AS source_title,
    s.source_type,
    s.author AS source_author,
    EXTRACT(YEAR FROM s.publication_date)::INT AS source_year,
    s.subspecialty AS source_subspecialty,
    s.language AS source_language,
    s.validation_level
  FROM public.ai_chunks c
  JOIN public.ai_knowledge_sources s ON s.id = c.source_id
  WHERE s.approval_status = 'Approved'
    AND s.is_active = true
    AND c.embedding IS NOT NULL
    AND (filter_subspecialty IS NULL OR s.subspecialty = filter_subspecialty)
    AND (filter_language IS NULL OR s.language = filter_language)
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 3) Restrict the always-true INSERT policy on ai_knowledge_sources
DROP POLICY IF EXISTS "Authenticated can insert sources" ON public.ai_knowledge_sources;
CREATE POLICY "Authenticated can insert sources"
ON public.ai_knowledge_sources
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND (created_by IS NULL OR created_by = auth.uid()));

-- 4) Move SECURITY DEFINER helper functions out of the exposed `public` schema
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- Move both helpers; policies use function OIDs so they keep working
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.proname='oph_is_admin_or_editor') THEN
    EXECUTE 'ALTER FUNCTION public.oph_is_admin_or_editor() SET SCHEMA private';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.proname='oph_is_admin_editor_or_kol') THEN
    EXECUTE 'ALTER FUNCTION public.oph_is_admin_editor_or_kol() SET SCHEMA private';
  END IF;
END $$;

-- Make sure search_path is explicit even after the move
ALTER FUNCTION private.oph_is_admin_or_editor() SET search_path = public;
ALTER FUNCTION private.oph_is_admin_editor_or_kol() SET search_path = public;

-- Lock down EXECUTE: only authenticated (needed by RLS) + service_role
REVOKE ALL ON FUNCTION private.oph_is_admin_or_editor()      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.oph_is_admin_editor_or_kol()  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.oph_is_admin_or_editor()     TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.oph_is_admin_editor_or_kol() TO authenticated, service_role;
