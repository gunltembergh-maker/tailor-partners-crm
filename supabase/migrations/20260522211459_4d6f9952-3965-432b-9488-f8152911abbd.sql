CREATE OR REPLACE FUNCTION public.fn_warmup_mv_comissoes_caixa()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inicio TIMESTAMPTZ := clock_timestamp();
  v_anomes INTEGER := TO_CHAR(CURRENT_DATE, 'YYYYMM')::INTEGER;
  v_count BIGINT;
  v_duracao_ms NUMERIC;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.mv_comissoes_caixa_completa
  WHERE anomes IN (v_anomes, v_anomes - 1);

  v_duracao_ms := ROUND(EXTRACT(EPOCH FROM (clock_timestamp() - v_inicio))::numeric * 1000, 2);

  RETURN format(
    'Warmup OK: %s linhas aquecidas em %sms (anomes=%s, %s)',
    v_count, v_duracao_ms, v_anomes, NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_warmup_mv_comissoes_caixa() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_warmup_mv_comissoes_caixa() FROM anon;
REVOKE ALL ON FUNCTION public.fn_warmup_mv_comissoes_caixa() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fn_warmup_mv_comissoes_caixa() TO service_role;