CREATE OR REPLACE FUNCTION public.rpc_truncate_staging_historico()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_linhas_truncadas BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_linhas_truncadas
  FROM public.raw_comissoes_historico_staging;

  TRUNCATE TABLE public.raw_comissoes_historico_staging;

  RETURN jsonb_build_object(
    'success', true,
    'linhas_anteriores', v_linhas_truncadas,
    'truncated_at', NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_truncate_staging_historico() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_truncate_staging_historico() FROM anon;
REVOKE ALL ON FUNCTION public.rpc_truncate_staging_historico() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_truncate_staging_historico() TO service_role;

COMMENT ON FUNCTION public.rpc_truncate_staging_historico() IS
'Trunca raw_comissoes_historico_staging. Chamado pelo historico_chunked_init pra garantir staging limpa antes da paginação. Defesa em profundidade contra lixo de execução anterior incompleta.';