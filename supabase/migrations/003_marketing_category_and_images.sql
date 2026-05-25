-- Categoria "Ações de Marketing" + imagens Imgur (Fase 7)

ALTER TABLE public.suggestions
  DROP CONSTRAINT IF EXISTS suggestions_category_check;

ALTER TABLE public.suggestions
  ADD CONSTRAINT suggestions_category_check CHECK (category IN (
    'Melhorias de Qualidade de vida',
    'Novas funcionalidades customizadas',
    'Novas Funcionalidades do Global',
    'Correções',
    'Pendencias de implementação',
    'Ações de Marketing'
  ));

ALTER TABLE public.suggestions
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.suggestions.image_urls IS 'URLs públicas de imagens (ex.: Imgur) anexadas à sugestão';

DROP VIEW IF EXISTS public.suggestions_public;

CREATE VIEW public.suggestions_public AS
SELECT
  s.id,
  s.created_at,
  s.char_name,
  s.world,
  s.category,
  s.title,
  s.description,
  s.similarity_group_id,
  s.image_urls,
  COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 WHEN v.vote_type = 'down' THEN -1 END), 0)::INTEGER AS vote_score,
  COUNT(c.id)::INTEGER AS comment_count
FROM public.suggestions s
LEFT JOIN public.votes v ON v.suggestion_id = s.id
LEFT JOIN public.comments c ON c.suggestion_id = s.id
WHERE s.status = 'approved'
GROUP BY s.id;

GRANT SELECT ON public.suggestions_public TO anon, authenticated;
