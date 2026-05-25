-- Admin pode reclassificar categoria ao aprovar sugestão pendente

DROP FUNCTION IF EXISTS public.admin_approve_suggestion(TEXT, UUID);

CREATE OR REPLACE FUNCTION public.admin_approve_suggestion(
  p_password TEXT,
  p_suggestion_id UUID,
  p_category TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category TEXT;
BEGIN
  IF NOT public.verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'invalid_admin_password';
  END IF;

  v_category := NULLIF(trim(p_category), '');

  IF v_category IS NOT NULL THEN
    UPDATE public.suggestions
    SET status = 'approved', category = v_category
    WHERE id = p_suggestion_id AND status = 'pending';
  ELSE
    UPDATE public.suggestions
    SET status = 'approved'
    WHERE id = p_suggestion_id AND status = 'pending';
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'suggestion_not_found_or_not_pending';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_suggestion(TEXT, UUID, TEXT) TO anon, authenticated;
