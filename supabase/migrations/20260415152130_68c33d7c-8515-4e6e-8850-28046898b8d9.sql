CREATE OR REPLACE FUNCTION public.rpc_refresh_mv_comissoes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '600s'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_comissoes_consolidado_v2;
  REFRESH MATERIALIZED VIEW public.mv_dimensoes_filtro;
END;
$function$;