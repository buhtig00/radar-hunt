
-- 1. ai_chunks: restrict SELECT to authenticated users (still requires approved source)
DROP POLICY IF EXISTS "Chunks public read for approved sources" ON public.ai_chunks;
CREATE POLICY "Chunks authenticated read for approved sources"
  ON public.ai_chunks
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ai_knowledge_sources s
    WHERE s.id = ai_chunks.source_id
      AND s.approval_status = 'Approved'
      AND s.is_active = true
  ));

-- 2. oph_clinical_cases: require authenticated for INSERT
DROP POLICY IF EXISTS oph_clinical_cases_insert_own ON public.oph_clinical_cases;
CREATE POLICY oph_clinical_cases_insert_own
  ON public.oph_clinical_cases
  FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = auth.uid() OR private.oph_is_admin_or_editor());

-- 3. oph_ai_source_links: restrict to authenticated + approved source
DROP POLICY IF EXISTS oph_ai_source_links_select ON public.oph_ai_source_links;
CREATE POLICY oph_ai_source_links_select
  ON public.oph_ai_source_links
  FOR SELECT
  TO authenticated
  USING (
    private.oph_is_admin_editor_or_kol() OR EXISTS (
      SELECT 1 FROM public.ai_knowledge_sources s
      WHERE s.id = oph_ai_source_links.ai_knowledge_source_id
        AND s.approval_status = 'Approved'
        AND s.is_active = true
    )
  );

-- 4. oph_pathology_classifications: authenticated + both parents approved
DROP POLICY IF EXISTS oph_relationships_select_all ON public.oph_pathology_classifications;
CREATE POLICY oph_pathology_classifications_select
  ON public.oph_pathology_classifications
  FOR SELECT
  TO authenticated
  USING (
    private.oph_is_admin_editor_or_kol() OR (
      EXISTS (SELECT 1 FROM public.oph_pathologies p
              WHERE p.id = oph_pathology_classifications.pathology_id
                AND p.status = 'approved' AND p.is_active = true)
      AND EXISTS (SELECT 1 FROM public.oph_classifications c
              WHERE c.id = oph_pathology_classifications.classification_id
                AND c.status = 'approved' AND c.is_active = true)
    )
  );

-- 5. oph_pathology_devices
DROP POLICY IF EXISTS oph_pathology_devices_select_all ON public.oph_pathology_devices;
CREATE POLICY oph_pathology_devices_select
  ON public.oph_pathology_devices
  FOR SELECT
  TO authenticated
  USING (
    private.oph_is_admin_editor_or_kol() OR (
      EXISTS (SELECT 1 FROM public.oph_pathologies p
              WHERE p.id = oph_pathology_devices.pathology_id
                AND p.status = 'approved' AND p.is_active = true)
      AND EXISTS (SELECT 1 FROM public.oph_devices d
              WHERE d.id = oph_pathology_devices.device_id
                AND d.status = 'approved' AND d.is_active = true)
    )
  );

-- 6. oph_pathology_guidelines
DROP POLICY IF EXISTS oph_pathology_guidelines_select_all ON public.oph_pathology_guidelines;
CREATE POLICY oph_pathology_guidelines_select
  ON public.oph_pathology_guidelines
  FOR SELECT
  TO authenticated
  USING (
    private.oph_is_admin_editor_or_kol() OR (
      EXISTS (SELECT 1 FROM public.oph_pathologies p
              WHERE p.id = oph_pathology_guidelines.pathology_id
                AND p.status = 'approved' AND p.is_active = true)
      AND EXISTS (SELECT 1 FROM public.oph_guidelines g
              WHERE g.id = oph_pathology_guidelines.guideline_id
                AND g.status = 'approved' AND g.is_active = true)
    )
  );

-- 7. oph_pathology_protocols
DROP POLICY IF EXISTS oph_pathology_protocols_select_all ON public.oph_pathology_protocols;
CREATE POLICY oph_pathology_protocols_select
  ON public.oph_pathology_protocols
  FOR SELECT
  TO authenticated
  USING (
    private.oph_is_admin_editor_or_kol() OR (
      EXISTS (SELECT 1 FROM public.oph_pathologies p
              WHERE p.id = oph_pathology_protocols.pathology_id
                AND p.status = 'approved' AND p.is_active = true)
      AND EXISTS (SELECT 1 FROM public.oph_protocols pr
              WHERE pr.id = oph_pathology_protocols.protocol_id
                AND pr.status = 'approved' AND pr.is_active = true)
    )
  );

-- 8. oph_reference_links: authenticated + reference approved
DROP POLICY IF EXISTS oph_reference_links_select ON public.oph_reference_links;
CREATE POLICY oph_reference_links_select
  ON public.oph_reference_links
  FOR SELECT
  TO authenticated
  USING (
    private.oph_is_admin_editor_or_kol() OR EXISTS (
      SELECT 1 FROM public.oph_references r
      WHERE r.id = oph_reference_links.reference_id
        AND r.status = 'approved' AND r.is_active = true
    )
  );
