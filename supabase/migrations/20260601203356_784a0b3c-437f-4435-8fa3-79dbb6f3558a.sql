
-- 1) Add is_active to ai_chunks (default true so existing approved chunks stay visible)
ALTER TABLE public.ai_chunks
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2) Update RAG retrieval RPC to honor chunk-level is_active
CREATE OR REPLACE FUNCTION public.match_ai_chunks(
  query_embedding extensions.vector,
  match_count integer DEFAULT 6,
  filter_subspecialty text DEFAULT NULL,
  filter_language text DEFAULT NULL
)
RETURNS TABLE (
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
    AND c.is_active = true
    AND c.embedding IS NOT NULL
    AND (filter_subspecialty IS NULL OR s.subspecialty = filter_subspecialty)
    AND (filter_language IS NULL OR s.language = filter_language)
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 3) Audit history table for KOL / editorial decisions on ai_knowledge_sources
CREATE TABLE IF NOT EXISTS public.ai_source_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.ai_knowledge_sources(id) ON DELETE CASCADE,
  actor_user_id uuid,
  actor_role text,
  decision text NOT NULL,         -- approve_activate | request_changes | reject | kol_verify | reactivate | deactivate | comment
  prev_status text,
  new_status text,
  prev_is_active boolean,
  new_is_active boolean,
  comment text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ai_source_audit TO authenticated;
GRANT ALL ON public.ai_source_audit TO service_role;

ALTER TABLE public.ai_source_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_source_audit_select_reviewers
  ON public.ai_source_audit
  FOR SELECT
  TO authenticated
  USING (private.oph_is_admin_editor_or_kol());

CREATE POLICY ai_source_audit_insert_reviewers
  ON public.ai_source_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (private.oph_is_admin_editor_or_kol() AND (actor_user_id IS NULL OR actor_user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS ai_source_audit_source_id_idx ON public.ai_source_audit(source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_source_audit_created_at_idx ON public.ai_source_audit(created_at DESC);

-- 4) RPC: approve + activate a knowledge source (and its chunks). Editor/admin only. Logs audit.
CREATE OR REPLACE FUNCTION public.approve_and_activate_source(
  p_source_id uuid,
  p_comment text DEFAULT NULL
)
RETURNS public.ai_source_audit
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_allowed boolean;
  v_role text;
  v_prev_status text;
  v_prev_active boolean;
  v_audit public.ai_source_audit;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.or_ai_user_roles
    WHERE user_id = v_uid AND is_active = true AND role IN ('admin','medical_editor')
  ) INTO v_allowed;
  IF NOT v_allowed THEN RAISE EXCEPTION 'Forbidden: editor/admin role required'; END IF;

  SELECT role INTO v_role FROM public.or_ai_user_roles
    WHERE user_id = v_uid AND is_active = true
    ORDER BY (role = 'admin') DESC, (role = 'medical_editor') DESC
    LIMIT 1;

  SELECT approval_status, is_active INTO v_prev_status, v_prev_active
  FROM public.ai_knowledge_sources WHERE id = p_source_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Source not found'; END IF;

  UPDATE public.ai_knowledge_sources
     SET approval_status = 'Approved',
         is_active = true,
         last_reviewed_at = now(),
         updated_at = now()
   WHERE id = p_source_id;

  UPDATE public.ai_chunks
     SET is_active = true
   WHERE source_id = p_source_id;

  INSERT INTO public.ai_source_audit (
    source_id, actor_user_id, actor_role, decision,
    prev_status, new_status, prev_is_active, new_is_active, comment
  ) VALUES (
    p_source_id, v_uid, v_role, 'approve_activate',
    v_prev_status, 'Approved', v_prev_active, true, NULLIF(trim(p_comment), '')
  ) RETURNING * INTO v_audit;

  RETURN v_audit;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_and_activate_source(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_and_activate_source(uuid, text) TO authenticated;

-- 5) RPC: generic decision logger (used for "request changes", "reject", or free comments)
CREATE OR REPLACE FUNCTION public.log_source_decision(
  p_source_id uuid,
  p_decision text,
  p_comment text DEFAULT NULL,
  p_new_status text DEFAULT NULL,
  p_new_active boolean DEFAULT NULL
)
RETURNS public.ai_source_audit
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_allowed boolean;
  v_role text;
  v_prev_status text;
  v_prev_active boolean;
  v_audit public.ai_source_audit;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.or_ai_user_roles
    WHERE user_id = v_uid AND is_active = true AND role IN ('admin','medical_editor','kol')
  ) INTO v_allowed;
  IF NOT v_allowed THEN RAISE EXCEPTION 'Forbidden: reviewer role required'; END IF;

  SELECT role INTO v_role FROM public.or_ai_user_roles
    WHERE user_id = v_uid AND is_active = true
    ORDER BY (role = 'admin') DESC, (role = 'medical_editor') DESC, (role = 'kol') DESC
    LIMIT 1;

  IF p_decision NOT IN ('request_changes','reject','kol_verify','reactivate','deactivate','comment') THEN
    RAISE EXCEPTION 'Invalid decision: %', p_decision;
  END IF;

  SELECT approval_status, is_active INTO v_prev_status, v_prev_active
  FROM public.ai_knowledge_sources WHERE id = p_source_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Source not found'; END IF;

  IF p_new_status IS NOT NULL OR p_new_active IS NOT NULL THEN
    UPDATE public.ai_knowledge_sources
       SET approval_status = COALESCE(p_new_status, approval_status),
           is_active = COALESCE(p_new_active, is_active),
           last_reviewed_at = now(),
           updated_at = now()
     WHERE id = p_source_id;

    -- Propagate active flag to chunks when explicitly changed
    IF p_new_active IS NOT NULL THEN
      UPDATE public.ai_chunks SET is_active = p_new_active WHERE source_id = p_source_id;
    END IF;
  END IF;

  IF p_decision = 'kol_verify' THEN
    UPDATE public.ai_knowledge_sources
       SET kol_validator = COALESCE(kol_validator, v_uid::text),
           validation_level = 'KOL Verified',
           last_reviewed_at = now(),
           updated_at = now()
     WHERE id = p_source_id;
  END IF;

  INSERT INTO public.ai_source_audit (
    source_id, actor_user_id, actor_role, decision,
    prev_status, new_status, prev_is_active, new_is_active, comment
  ) VALUES (
    p_source_id, v_uid, v_role, p_decision,
    v_prev_status, COALESCE(p_new_status, v_prev_status),
    v_prev_active, COALESCE(p_new_active, v_prev_active),
    NULLIF(trim(p_comment), '')
  ) RETURNING * INTO v_audit;

  RETURN v_audit;
END;
$$;

REVOKE ALL ON FUNCTION public.log_source_decision(uuid, text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_source_decision(uuid, text, text, text, boolean) TO authenticated;
