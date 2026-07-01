CREATE OR REPLACE FUNCTION public.rpc_lavoro_ultima_atualizacao()
RETURNS timestamptz
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT GREATEST(
    (SELECT MAX(criado_em) FROM public.raw_lavoro_gerencial),
    (SELECT MAX(criado_em) FROM public.raw_lavoro_caixa_comissao),
    (SELECT MAX(criado_em) FROM public.raw_lavoro_depara_ramo)
  );
$$;

GRANT EXECUTE ON FUNCTION public.rpc_lavoro_ultima_atualizacao() TO authenticated, service_role;