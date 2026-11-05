
-- Bootstrap: allow the first authenticated user to claim admin (idempotent guard).
CREATE OR REPLACE FUNCTION public.claim_admin_if_empty()
RETURNS TABLE(role or_ai_role, is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_exists boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT EXISTS(SELECT 1 FROM public.or_ai_user_roles WHERE role='admin' AND is_active=true) INTO v_exists;
  IF NOT v_exists THEN
    INSERT INTO public.or_ai_user_roles (user_id, role, is_active) VALUES (v_uid, 'admin', true)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN QUERY SELECT r.role, r.is_active FROM public.or_ai_user_roles r WHERE r.user_id = v_uid AND r.is_active = true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_admin_if_empty() FROM public;
GRANT EXECUTE ON FUNCTION public.claim_admin_if_empty() TO authenticated;

-- Helper: get current user's active roles
CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS TABLE(role or_ai_role)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.role FROM public.or_ai_user_roles r
  WHERE r.user_id = auth.uid() AND r.is_active = true;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_roles() TO authenticated;

-- KOL approval RPC: marks an oph_* item as KOL-verified. Validates table whitelist.
CREATE OR REPLACE FUNCTION public.oph_mark_kol_verified(p_table text, p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_allowed boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT EXISTS(
    SELECT 1 FROM public.or_ai_user_roles
    WHERE user_id = v_uid AND is_active = true AND role IN ('admin','medical_editor','kol')
  ) INTO v_allowed;
  IF NOT v_allowed THEN RAISE EXCEPTION 'Forbidden: KOL/editor role required'; END IF;

  IF p_table NOT IN ('oph_pathologies','oph_medications','oph_guidelines','oph_classifications','oph_protocols','oph_devices') THEN
    RAISE EXCEPTION 'Invalid table: %', p_table;
  END IF;

  EXECUTE format(
    'UPDATE public.%I SET kol_validator_id=$1, reviewed_at=now(), reviewed_by=$1, next_review_at=now() + interval ''12 months'' WHERE id=$2',
    p_table
  ) USING v_uid, p_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.oph_mark_kol_verified(text, uuid) TO authenticated;

-- Editorial approval: set status=approved + is_active=true
CREATE OR REPLACE FUNCTION public.oph_set_status(p_table text, p_id uuid, p_status oph_content_status)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_allowed boolean;
  v_active boolean := (p_status = 'approved');
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT EXISTS(
    SELECT 1 FROM public.or_ai_user_roles
    WHERE user_id = v_uid AND is_active = true AND role IN ('admin','medical_editor')
  ) INTO v_allowed;
  IF NOT v_allowed THEN RAISE EXCEPTION 'Forbidden: editor role required'; END IF;

  IF p_table NOT IN ('oph_pathologies','oph_medications','oph_guidelines','oph_classifications','oph_protocols','oph_devices') THEN
    RAISE EXCEPTION 'Invalid table: %', p_table;
  END IF;

  EXECUTE format(
    'UPDATE public.%I SET status=$1, is_active=$2, reviewed_at=now(), reviewed_by=$3 WHERE id=$4',
    p_table
  ) USING p_status, v_active, v_uid, p_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.oph_set_status(text, uuid, oph_content_status) TO authenticated;
