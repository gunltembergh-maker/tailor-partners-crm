
-- =====================================================
-- FIX: Add SECURITY DEFINER to 8 RPCs that are missing it
-- and disable security_invoker on view_base_crm.
--
-- Root cause: These RPCs run as the calling user (SECURITY INVOKER),
-- so RLS on underlying raw_* tables blocks Banker users.
-- All RPCs already use get_user_banker_filter() internally for scoping.
-- =====================================================

-- 1) rpc_auc_mes_stack_casa (Item 3: AUC por Mês)
CREATE OR REPLACE FUNCTION public.rpc_auc_mes_stack_casa(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_tipo_cliente text[] DEFAULT NULL
)
RETURNS TABLE(anomes integer, anomes_nome text, casa text, auc numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT (data->>'AnoMes')::int,
    to_char(to_date(data->>'AnoMes','YYYYMM'),'Mon/YY'),
    COALESCE(NULLIF(data->>'Casa',''),'XP'),
    SUM((data->>'Net Em M')::numeric)
  FROM raw_positivador_total_desagrupado
  WHERE (p_anomes IS NULL OR (data->>'AnoMes')::int = ANY(p_anomes))
    AND (v_bf IS NULL OR data->>'Banker' = ANY(v_bf))
    AND (p_documento IS NULL OR data->>'Documento' = ANY(p_documento))
    AND (v_af IS NULL OR data->>'Advisor' = ANY(v_af))
    AND (v_ff IS NULL OR data->>'Finder' = ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR data->>'Tipo de Cliente' = ANY(p_tipo_cliente))
  GROUP BY 1,2,3 ORDER BY 1,3;
END;
$function$;

-- 2) rpc_custodia_indexador (Item 6)
CREATE OR REPLACE FUNCTION public.rpc_custodia_indexador(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_tipo_cliente text[] DEFAULT NULL
)
RETURNS TABLE(indexador text, net numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT d.indexador, SUM(d.net)
  FROM view_diversificador d
  WHERE (v_bf IS NULL OR d.banker=ANY(v_bf))
    AND (p_documento IS NULL OR d.documento=ANY(p_documento))
    AND (v_af IS NULL OR d.advisor=ANY(v_af))
    AND (v_ff IS NULL OR d.finder=ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR d.tipo_cliente=ANY(p_tipo_cliente))
    AND d.indexador IS NOT NULL
  GROUP BY 1 ORDER BY 2 DESC;
END;
$function$;

-- 3) rpc_custodia_veiculo (Item 7) - already shown in context but missing SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.rpc_custodia_veiculo(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_tipo_cliente text[] DEFAULT NULL
)
RETURNS TABLE(produto_ajustado text, net numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT d.produto_ajustado, SUM(d.net)
  FROM view_diversificador d
  WHERE (v_bf IS NULL OR d.banker=ANY(v_bf))
    AND (p_documento IS NULL OR d.documento=ANY(p_documento))
    AND (v_af IS NULL OR d.advisor=ANY(v_af))
    AND (v_ff IS NULL OR d.finder=ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR d.tipo_cliente=ANY(p_tipo_cliente))
    AND d.produto_ajustado IS NOT NULL
  GROUP BY 1 ORDER BY 2 DESC;
END;
$function$;

-- 4) rpc_tabela_clientes (Item 4: Clientes)
CREATE OR REPLACE FUNCTION public.rpc_tabela_clientes(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_tipo_cliente text[] DEFAULT NULL
)
RETURNS TABLE(documento text, cod_cliente text, primeiro_nome text, pl_tailor numeric, pl_declarado_ajustado numeric, sow_ajustado numeric, endereco_ajustado text, banker text, advisor text, tipo_cliente text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
BEGIN
  RETURN QUERY
  SELECT c.documento, c.cod_cliente, c.primeiro_nome, c.pl_tailor,
    c.pl_declarado_ajustado, c.sow_ajustado, c.endereco_ajustado,
    c.banker, c.advisor, c.tipo_cliente
  FROM view_base_crm c
  WHERE (v_bf IS NULL OR c.banker=ANY(v_bf))
    AND (p_documento IS NULL OR c.documento=ANY(p_documento))
    AND (v_af IS NULL OR c.advisor=ANY(v_af))
    AND (p_tipo_cliente IS NULL OR c.tipo_cliente=ANY(p_tipo_cliente))
  ORDER BY c.primeiro_nome;
END;
$function$;

-- 5) rpc_tabela_vencimentos (Item 10)
CREATE OR REPLACE FUNCTION public.rpc_tabela_vencimentos(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_tipo_cliente text[] DEFAULT NULL
)
RETURNS TABLE(documento text, ativo_ajustado text, net numeric, vencimento date, indexador text, produto_ajustado text, banker text, advisor text, finder text, casa text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT d.documento, d.ativo_ajustado, d.net, d.vencimento,
    d.indexador, d.produto_ajustado, d.banker, d.advisor, d.finder, d.casa
  FROM view_diversificador d
  WHERE d.vencimento IS NOT NULL
    AND (v_bf IS NULL OR d.banker=ANY(v_bf))
    AND (p_documento IS NULL OR d.documento=ANY(p_documento))
    AND (v_af IS NULL OR d.advisor=ANY(v_af))
    AND (v_ff IS NULL OR d.finder=ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR d.tipo_cliente=ANY(p_tipo_cliente))
  ORDER BY d.vencimento;
END;
$function$;

-- 6) rpc_todos_ativos (Item 8)
CREATE OR REPLACE FUNCTION public.rpc_todos_ativos(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_tipo_cliente text[] DEFAULT NULL
)
RETURNS TABLE(documento text, conta text, ativo_ajustado text, net numeric, indexador text, produto_ajustado text, casa text, banker text, advisor text, tipo_cliente text, finder text, vencimento date)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT d.documento, d.conta, d.ativo_ajustado, d.net, d.indexador,
    d.produto_ajustado, d.casa, d.banker, d.advisor, d.tipo_cliente, d.finder, d.vencimento
  FROM view_diversificador d
  WHERE (v_bf IS NULL OR d.banker=ANY(v_bf))
    AND (p_documento IS NULL OR d.documento=ANY(p_documento))
    AND (v_af IS NULL OR d.advisor=ANY(v_af))
    AND (v_ff IS NULL OR d.finder=ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR d.tipo_cliente=ANY(p_tipo_cliente))
  ORDER BY d.documento, d.ativo_ajustado;
END;
$function$;

-- 7) rpc_vencimentos_grafico (Item 9)
CREATE OR REPLACE FUNCTION public.rpc_vencimentos_grafico(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_tipo_cliente text[] DEFAULT NULL
)
RETURNS TABLE(ano integer, mes integer, produto_ajustado text, net numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT EXTRACT(YEAR FROM d.vencimento)::int, EXTRACT(MONTH FROM d.vencimento)::int,
    d.produto_ajustado, SUM(d.net)
  FROM view_diversificador d
  WHERE d.vencimento IS NOT NULL
    AND (v_bf IS NULL OR d.banker=ANY(v_bf))
    AND (p_documento IS NULL OR d.documento=ANY(p_documento))
    AND (v_af IS NULL OR d.advisor=ANY(v_af))
    AND (v_ff IS NULL OR d.finder=ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR d.tipo_cliente=ANY(p_tipo_cliente))
  GROUP BY 1,2,3 ORDER BY 1,2,3;
END;
$function$;

-- 8) rpc_vencimentos_por_ano (Item 9 aggregated)
CREATE OR REPLACE FUNCTION public.rpc_vencimentos_por_ano(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_tipo_cliente text[] DEFAULT NULL
)
RETURNS TABLE(ano integer, net numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT EXTRACT(YEAR FROM d.vencimento)::int, SUM(d.net)
  FROM view_diversificador d
  WHERE d.vencimento IS NOT NULL
    AND (v_bf IS NULL OR d.banker=ANY(v_bf))
    AND (p_documento IS NULL OR d.documento=ANY(p_documento))
    AND (v_af IS NULL OR d.advisor=ANY(v_af))
    AND (v_ff IS NULL OR d.finder=ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR d.tipo_cliente=ANY(p_tipo_cliente))
  GROUP BY 1 ORDER BY 1;
END;
$function$;

-- 9) Fix view_base_crm: disable security_invoker so SECURITY DEFINER RPCs can access it
ALTER VIEW public.view_base_crm SET (security_invoker = false);
