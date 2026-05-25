-- Permite leitura pública de sugestões pendentes (exibição na Home com badge)
DROP POLICY IF EXISTS suggestions_select_pending ON public.suggestions;
CREATE POLICY suggestions_select_pending ON public.suggestions
  FOR SELECT
  TO anon, authenticated
  USING (status = 'pending');
