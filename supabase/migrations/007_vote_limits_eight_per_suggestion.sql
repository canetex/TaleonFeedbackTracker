-- Limites: 8 votos positivos/negativos por IP; até 8 do mesmo tipo na mesma sugestão.
-- Remove trava de 1 voto por sugestão; preserva registros existentes.

UPDATE public.config SET value = '8', updated_at = now()
WHERE key IN ('vote_limit_up', 'vote_limit_down');

INSERT INTO public.config (key, value)
VALUES ('vote_limit_per_suggestion', '8')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

ALTER TABLE public.votes
  DROP CONSTRAINT IF EXISTS votes_suggestion_id_ip_address_key;

CREATE OR REPLACE FUNCTION public._config_int(p_key TEXT, p_default INTEGER)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(trim(value), '')::INTEGER, p_default)
  FROM public.config
  WHERE key = p_key;
$$;

CREATE OR REPLACE FUNCTION public._vote_quota_row(p_ip_address TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip TEXT := trim(p_ip_address);
  v_limit_up INTEGER;
  v_limit_down INTEGER;
  v_limit_per_suggestion INTEGER;
  v_used_up BIGINT;
  v_used_down BIGINT;
BEGIN
  IF v_ip IS NULL OR char_length(v_ip) < 7 THEN
    RAISE EXCEPTION 'invalid_ip_address';
  END IF;

  v_limit_up := public._config_int('vote_limit_up', 8);
  v_limit_down := public._config_int('vote_limit_down', 8);
  v_limit_per_suggestion := public._config_int('vote_limit_per_suggestion', 8);

  SELECT
    COUNT(*) FILTER (WHERE vote_type = 'up'),
    COUNT(*) FILTER (WHERE vote_type = 'down')
  INTO v_used_up, v_used_down
  FROM public.votes
  WHERE ip_address = v_ip;

  RETURN jsonb_build_object(
    'limit_up', v_limit_up,
    'limit_down', v_limit_down,
    'limit_per_suggestion', v_limit_per_suggestion,
    'used_up', v_used_up,
    'used_down', v_used_down,
    'remaining_up', GREATEST(v_limit_up - v_used_up::INTEGER, 0),
    'remaining_down', GREATEST(v_limit_down - v_used_down::INTEGER, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_vote_quota(p_ip_address TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public._vote_quota_row(p_ip_address);
END;
$$;

CREATE OR REPLACE FUNCTION public.cast_public_vote(
  p_ip_address TEXT,
  p_suggestion_id UUID,
  p_vote_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip TEXT := trim(p_ip_address);
  v_quota JSONB;
  v_remaining INTEGER;
  v_limit_per_suggestion INTEGER;
  v_used_on_suggestion BIGINT;
BEGIN
  IF v_ip IS NULL OR char_length(v_ip) < 7 THEN
    RAISE EXCEPTION 'invalid_ip_address';
  END IF;

  IF p_vote_type IS NULL OR p_vote_type NOT IN ('up', 'down') THEN
    RAISE EXCEPTION 'invalid_vote_type';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.suggestions s
    WHERE s.id = p_suggestion_id AND s.status = 'approved'
  ) THEN
    RAISE EXCEPTION 'suggestion_not_approved';
  END IF;

  v_limit_per_suggestion := public._config_int('vote_limit_per_suggestion', 8);

  SELECT COUNT(*)
  INTO v_used_on_suggestion
  FROM public.votes v
  WHERE v.suggestion_id = p_suggestion_id
    AND v.ip_address = v_ip
    AND v.vote_type = p_vote_type;

  IF v_used_on_suggestion >= v_limit_per_suggestion THEN
    RAISE EXCEPTION 'vote_per_suggestion_exceeded';
  END IF;

  v_quota := public._vote_quota_row(v_ip);
  v_remaining := CASE
    WHEN p_vote_type = 'up' THEN (v_quota->>'remaining_up')::INTEGER
    ELSE (v_quota->>'remaining_down')::INTEGER
  END;

  IF v_remaining <= 0 THEN
    IF p_vote_type = 'up' THEN
      RAISE EXCEPTION 'vote_quota_exceeded_up';
    END IF;
    RAISE EXCEPTION 'vote_quota_exceeded_down';
  END IF;

  INSERT INTO public.votes (suggestion_id, ip_address, vote_type)
  VALUES (p_suggestion_id, v_ip, p_vote_type);

  RETURN public._vote_quota_row(v_ip);
END;
$$;
