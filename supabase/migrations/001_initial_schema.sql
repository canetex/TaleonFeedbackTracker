-- Feedback Portal Taleon — schema inicial (Fase 2)
-- Executar no SQL Editor do Supabase (Dashboard → SQL → New query)

-- ---------------------------------------------------------------------------
-- Tipos e tabelas
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  char_name TEXT NOT NULL CHECK (char_length(trim(char_name)) BETWEEN 2 AND 64),
  world TEXT NOT NULL CHECK (world IN ('SAN', 'AURA')),
  category TEXT NOT NULL CHECK (category IN (
    'Melhorias de Qualidade de vida',
    'Novas funcionalidades customizadas',
    'Novas Funcionalidades do Global',
    'Correções',
    'Pendencias de implementação'
  )),
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 5 AND 200),
  description TEXT NOT NULL CHECK (char_length(trim(description)) BETWEEN 10 AND 4000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  similarity_group_id UUID REFERENCES public.suggestions (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_suggestions_status ON public.suggestions (status);
CREATE INDEX IF NOT EXISTS idx_suggestions_category ON public.suggestions (category);
CREATE INDEX IF NOT EXISTS idx_suggestions_created_at ON public.suggestions (created_at DESC);

CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  suggestion_id UUID NOT NULL REFERENCES public.suggestions (id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL CHECK (char_length(trim(ip_address)) >= 7),
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  UNIQUE (suggestion_id, ip_address)
);

CREATE INDEX IF NOT EXISTS idx_votes_suggestion_id ON public.votes (suggestion_id);

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  suggestion_id UUID NOT NULL REFERENCES public.suggestions (id) ON DELETE CASCADE,
  char_name TEXT NOT NULL CHECK (char_length(trim(char_name)) BETWEEN 2 AND 64),
  world TEXT NOT NULL CHECK (world IN ('SAN', 'AURA')),
  content TEXT NOT NULL CHECK (char_length(trim(content)) BETWEEN 2 AND 2000)
);

CREATE INDEX IF NOT EXISTS idx_comments_suggestion_id ON public.comments (suggestion_id);

CREATE TABLE IF NOT EXISTS public.config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Senha padrão do admin (alterar após deploy)
INSERT INTO public.config (key, value)
VALUES ('admin_password', 'taleon-admin-change-me')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- View pública com saldo de votos
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.suggestions_public AS
SELECT
  s.id,
  s.created_at,
  s.char_name,
  s.world,
  s.category,
  s.title,
  s.description,
  s.similarity_group_id,
  COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 WHEN v.vote_type = 'down' THEN -1 END), 0)::INTEGER AS vote_score,
  COUNT(c.id)::INTEGER AS comment_count
FROM public.suggestions s
LEFT JOIN public.votes v ON v.suggestion_id = s.id
LEFT JOIN public.comments c ON c.suggestion_id = s.id
WHERE s.status = 'approved'
GROUP BY s.id;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- suggestions: leitura apenas aprovadas
DROP POLICY IF EXISTS suggestions_select_approved ON public.suggestions;
CREATE POLICY suggestions_select_approved ON public.suggestions
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

-- suggestions: inserção pública sempre como pending
DROP POLICY IF EXISTS suggestions_insert_public ON public.suggestions;
CREATE POLICY suggestions_insert_public ON public.suggestions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending');

-- votes: leitura para agregar scores no cliente
DROP POLICY IF EXISTS votes_select_public ON public.votes;
CREATE POLICY votes_select_public ON public.votes
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.suggestions s
      WHERE s.id = votes.suggestion_id AND s.status = 'approved'
    )
  );

-- votes: inserção em sugestões aprovadas
DROP POLICY IF EXISTS votes_insert_public ON public.votes;
CREATE POLICY votes_insert_public ON public.votes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    vote_type IN ('up', 'down')
    AND EXISTS (
      SELECT 1 FROM public.suggestions s
      WHERE s.id = votes.suggestion_id AND s.status = 'approved'
    )
  );

-- comments: leitura em sugestões aprovadas
DROP POLICY IF EXISTS comments_select_public ON public.comments;
CREATE POLICY comments_select_public ON public.comments
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.suggestions s
      WHERE s.id = comments.suggestion_id AND s.status = 'approved'
    )
  );

-- comments: inserção em sugestões aprovadas
DROP POLICY IF EXISTS comments_insert_public ON public.comments;
CREATE POLICY comments_insert_public ON public.comments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.suggestions s
      WHERE s.id = comments.suggestion_id AND s.status = 'approved'
    )
  );

-- config: sem acesso público (admin via RPC na Fase 4)
DROP POLICY IF EXISTS config_deny_all ON public.config;
CREATE POLICY config_deny_all ON public.config
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- RPC: moderação admin (Fase 4 — preparado)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.verify_admin_password(p_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored TEXT;
BEGIN
  SELECT value INTO stored FROM public.config WHERE key = 'admin_password';
  RETURN stored IS NOT NULL AND stored = p_password;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_pending(p_password TEXT)
RETURNS SETOF public.suggestions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'invalid_admin_password';
  END IF;
  RETURN QUERY
  SELECT * FROM public.suggestions WHERE status = 'pending' ORDER BY created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_suggestion(p_password TEXT, p_suggestion_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'invalid_admin_password';
  END IF;
  UPDATE public.suggestions SET status = 'approved' WHERE id = p_suggestion_id AND status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_suggestion(p_password TEXT, p_suggestion_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'invalid_admin_password';
  END IF;
  DELETE FROM public.suggestions WHERE id = p_suggestion_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_admin_password(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_pending(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_suggestion(TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_suggestion(TEXT, UUID) TO anon, authenticated;

GRANT SELECT ON public.suggestions_public TO anon, authenticated;
