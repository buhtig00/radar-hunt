
-- Extension for vector search
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- ai_knowledge_sources
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ai_knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL,
  subspecialty TEXT NOT NULL,
  pathology TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  author TEXT,
  external_url TEXT,
  publication_date DATE,
  evidence_level TEXT,
  approval_status TEXT NOT NULL DEFAULT 'Approved',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_reviewed_at TIMESTAMPTZ,
  kol_validator TEXT,
  validation_level TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
GRANT SELECT ON public.ai_knowledge_sources TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_knowledge_sources TO authenticated;
GRANT ALL ON public.ai_knowledge_sources TO service_role;
ALTER TABLE public.ai_knowledge_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sources public read approved"
  ON public.ai_knowledge_sources FOR SELECT
  USING (approval_status = 'Approved' AND is_active = true);
CREATE POLICY "Authenticated can insert sources"
  ON public.ai_knowledge_sources FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "Creator can update own sources"
  ON public.ai_knowledge_sources FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE INDEX IF NOT EXISTS idx_ai_sources_sub ON public.ai_knowledge_sources(subspecialty);
CREATE INDEX IF NOT EXISTS idx_ai_sources_lang ON public.ai_knowledge_sources(language);
CREATE INDEX IF NOT EXISTS idx_ai_sources_status ON public.ai_knowledge_sources(approval_status, is_active);

-- =====================================================
-- ai_chunks (vector)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ai_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.ai_knowledge_sources(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  embedding vector(1536),
  token_count INT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_chunks TO anon, authenticated;
GRANT ALL ON public.ai_chunks TO service_role;
ALTER TABLE public.ai_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chunks public read for approved sources"
  ON public.ai_chunks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ai_knowledge_sources s
    WHERE s.id = source_id AND s.approval_status = 'Approved' AND s.is_active = true
  ));

CREATE INDEX IF NOT EXISTS idx_ai_chunks_source ON public.ai_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_ai_chunks_embedding
  ON public.ai_chunks USING hnsw (embedding vector_cosine_ops);

-- =====================================================
-- ai_interactions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  role TEXT,
  mode TEXT NOT NULL,
  subspecialty TEXT,
  language TEXT NOT NULL DEFAULT 'es',
  query TEXT NOT NULL,
  answer JSONB NOT NULL,
  validation_level TEXT NOT NULL DEFAULT 'AI Generated',
  safety_flags TEXT[] NOT NULL DEFAULT '{}',
  sources_used TEXT[] NOT NULL DEFAULT '{}',
  latency_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_interactions TO authenticated;
GRANT ALL ON public.ai_interactions TO service_role;
ALTER TABLE public.ai_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own interactions"
  ON public.ai_interactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own interactions"
  ON public.ai_interactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_user ON public.ai_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_mode ON public.ai_interactions(mode);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_created ON public.ai_interactions(created_at DESC);

-- =====================================================
-- ai_feedback
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID NOT NULL REFERENCES public.ai_interactions(id) ON DELETE CASCADE,
  user_id UUID,
  rating TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_feedback TO authenticated;
GRANT ALL ON public.ai_feedback TO service_role;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own feedback"
  ON public.ai_feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert feedback"
  ON public.ai_feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_interaction ON public.ai_feedback(interaction_id);

-- =====================================================
-- ai_safety_events
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ai_safety_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID REFERENCES public.ai_interactions(id) ON DELETE SET NULL,
  user_id UUID,
  severity TEXT NOT NULL DEFAULT 'info',
  categories TEXT[] NOT NULL DEFAULT '{}',
  matched_terms TEXT[] NOT NULL DEFAULT '{}',
  query_excerpt TEXT,
  action_taken TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_safety_events TO authenticated;
GRANT ALL ON public.ai_safety_events TO service_role;
ALTER TABLE public.ai_safety_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own safety events"
  ON public.ai_safety_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own safety events"
  ON public.ai_safety_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- =====================================================
-- match_ai_chunks (RAG retrieval)
-- =====================================================
CREATE OR REPLACE FUNCTION public.match_ai_chunks(
  query_embedding vector(1536),
  match_count INT DEFAULT 6,
  filter_subspecialty TEXT DEFAULT NULL,
  filter_language TEXT DEFAULT NULL
)
RETURNS TABLE (
  chunk_id UUID,
  source_id UUID,
  content TEXT,
  similarity FLOAT,
  source_title TEXT,
  source_type TEXT,
  source_author TEXT,
  source_year INT,
  source_subspecialty TEXT,
  source_language TEXT,
  validation_level TEXT
)
LANGUAGE sql STABLE
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.match_ai_chunks(vector, INT, TEXT, TEXT) TO anon, authenticated, service_role;

-- =====================================================
-- update_updated_at trigger
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_ai_sources_updated ON public.ai_knowledge_sources;
CREATE TRIGGER trg_ai_sources_updated
  BEFORE UPDATE ON public.ai_knowledge_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
