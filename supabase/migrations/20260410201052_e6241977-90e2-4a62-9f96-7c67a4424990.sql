
-- 1. rpc_captacao_kpis
CREATE OR REPLACE FUNCTION public.rpc_captacao_kpis(
  p_anomes integer[] DEFAULT NULL, p_banker text[] DEFAULT NULL, p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL, p_finder text[] DEFAULT NULL, p_tipo_cliente text[] DEFAULT NULL,
  p_casa text[] DEFAULT NULL
) RETURNS TABLE(captacao_mtd numeric, captacao_ytd numeric)
LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
  v_mtd integer := to_char(CURRENT_DATE, 'YYYYMM')::int;
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(captacao) FILTER (WHERE CASE WHEN p_anomes IS NOT NULL THEN anomes = ANY(p_anomes) ELSE anomes = v_mtd END), 0),
    COALESCE(SUM(captacao) FILTER (WHERE CASE WHEN p_anomes IS NOT NULL THEN anomes = ANY(p_anomes) ELSE true END), 0)
  FROM cap_captacao_total_all
  WHERE (v_bf IS NULL OR banker = ANY(v_bf))
    AND (p_documento IS NULL OR documento = ANY(p_documento))
    AND (v_af IS NULL OR advisor = ANY(v_af))
    AND (v_ff IS NULL OR finder = ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR tipo_cliente = ANY(p_tipo_cliente))
    AND (p_casa IS NULL OR casa = ANY(p_casa));
END;
$function$;

-- 2. rpc_captacao_agg_mes
CREATE OR REPLACE FUNCTION public.rpc_captacao_agg_mes(
  p_anomes integer[] DEFAULT NULL, p_banker text[] DEFAULT NULL, p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL, p_finder text[] DEFAULT NULL, p_tipo_cliente text[] DEFAULT NULL,
  p_casa text[] DEFAULT NULL
) RETURNS TABLE(anomes integer, anomes_nome text, tipo_captacao text, captacao numeric)
LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT c.anomes, to_char(to_date(c.anomes::text,'YYYYMM'),'Mon/YY'), c.tipo_captacao, SUM(c.captacao)
  FROM cap_captacao_total_all c
  WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR c.banker = ANY(v_bf))
    AND (p_documento IS NULL OR c.documento = ANY(p_documento))
    AND (v_af IS NULL OR c.advisor = ANY(v_af))
    AND (v_ff IS NULL OR c.finder = ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR c.tipo_cliente = ANY(p_tipo_cliente))
    AND (p_casa IS NULL OR c.casa = ANY(p_casa))
  GROUP BY 1,2,3 ORDER BY 1,3;
END;
$function$;

-- 3. rpc_captacao_treemap
CREATE OR REPLACE FUNCTION public.rpc_captacao_treemap(
  p_anomes integer[] DEFAULT NULL, p_banker text[] DEFAULT NULL, p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL, p_finder text[] DEFAULT NULL, p_tipo_cliente text[] DEFAULT NULL,
  p_casa text[] DEFAULT NULL
) RETURNS TABLE(tipo_captacao text, captacao numeric)
LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT c.tipo_captacao, SUM(c.captacao)
  FROM cap_captacao_total_all c
  WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR c.banker = ANY(v_bf))
    AND (p_documento IS NULL OR c.documento = ANY(p_documento))
    AND (v_af IS NULL OR c.advisor = ANY(v_af))
    AND (v_ff IS NULL OR c.finder = ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR c.tipo_cliente = ANY(p_tipo_cliente))
    AND (p_casa IS NULL OR c.casa = ANY(p_casa))
    AND c.tipo_captacao IS NOT NULL
  GROUP BY 1 ORDER BY 2 DESC;
END;
$function$;

-- 4. rpc_contas_kpis
CREATE OR REPLACE FUNCTION public.rpc_contas_kpis(
  p_anomes integer[] DEFAULT NULL, p_banker text[] DEFAULT NULL, p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL, p_finder text[] DEFAULT NULL, p_tipo_cliente text[] DEFAULT NULL,
  p_casa text[] DEFAULT NULL
) RETURNS TABLE(migracao bigint, habilitacao bigint, ativacao bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(DISTINCT data->>'Conta') FROM raw_contas_total
     WHERE lower(data->>'Tipo') LIKE '%igra%'
       AND COALESCE((data->>'Captação')::numeric, 0) > 0.01
       AND COALESCE(data->>'Banker','') NOT IN ('Lavoro','Outros','','NA')
       AND data->>'Banker' IS NOT NULL
       AND (p_anomes IS NULL OR (data->>'AnoMes')::int = ANY(p_anomes))
       AND (v_bf IS NULL OR data->>'Banker' = ANY(v_bf))
       AND (p_documento IS NULL OR data->>'Documento' = ANY(p_documento))
       AND (v_af IS NULL OR data->>'Advisor' = ANY(v_af))
       AND (v_ff IS NULL OR data->>'Finder' = ANY(v_ff))
       AND (p_tipo_cliente IS NULL OR data->>'Tipo de Cliente' = ANY(p_tipo_cliente))
       AND (p_casa IS NULL OR COALESCE(NULLIF(data->>'Casa',''),'XP') = ANY(p_casa))),
    (SELECT COUNT(DISTINCT data->>'Conta') FROM raw_contas_total
     WHERE lower(data->>'Tipo') LIKE '%abilit%'
       AND COALESCE(data->>'Banker','') NOT IN ('Lavoro','Outros','','NA')
       AND data->>'Banker' IS NOT NULL
       AND (p_anomes IS NULL OR (data->>'AnoMes')::int = ANY(p_anomes))
       AND (v_bf IS NULL OR data->>'Banker' = ANY(v_bf))
       AND (p_documento IS NULL OR data->>'Documento' = ANY(p_documento))
       AND (v_af IS NULL OR data->>'Advisor' = ANY(v_af))
       AND (v_ff IS NULL OR data->>'Finder' = ANY(v_ff))
       AND (p_tipo_cliente IS NULL OR data->>'Tipo de Cliente' = ANY(p_tipo_cliente))
       AND (p_casa IS NULL OR COALESCE(NULLIF(data->>'Casa',''),'XP') = ANY(p_casa))),
    (SELECT COUNT(DISTINCT data->>'Conta') FROM raw_contas_total
     WHERE lower(data->>'Tipo') LIKE '%ativa%'
       AND COALESCE(data->>'Banker','') NOT IN ('Lavoro','Outros','','NA')
       AND data->>'Banker' IS NOT NULL
       AND (p_anomes IS NULL OR (data->>'AnoMes')::int = ANY(p_anomes))
       AND (v_bf IS NULL OR data->>'Banker' = ANY(v_bf))
       AND (p_documento IS NULL OR data->>'Documento' = ANY(p_documento))
       AND (v_af IS NULL OR data->>'Advisor' = ANY(v_af))
       AND (v_ff IS NULL OR data->>'Finder' = ANY(v_ff))
       AND (p_tipo_cliente IS NULL OR data->>'Tipo de Cliente' = ANY(p_tipo_cliente))
       AND (p_casa IS NULL OR COALESCE(NULLIF(data->>'Casa',''),'XP') = ANY(p_casa)));
END;
$function$;

-- 5. rpc_contas_agg_mes
CREATE OR REPLACE FUNCTION public.rpc_contas_agg_mes(
  p_anomes integer[] DEFAULT NULL, p_banker text[] DEFAULT NULL, p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL, p_finder text[] DEFAULT NULL, p_tipo_cliente text[] DEFAULT NULL,
  p_casa text[] DEFAULT NULL
) RETURNS TABLE(anomes integer, anomes_nome text, tipo text, casa text, qtd bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT bc.anomes, to_char(to_date(bc.anomes::text,'YYYYMM'),'Mon/YY'), bc.tipo, bc.casa, COUNT(*)
  FROM bc_contas_total bc
  WHERE (p_anomes IS NULL OR bc.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR bc.banker = ANY(v_bf))
    AND (p_documento IS NULL OR bc.documento = ANY(p_documento))
    AND (v_af IS NULL OR bc.advisor = ANY(v_af))
    AND (v_ff IS NULL OR bc.finder = ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR bc.tipo_cliente = ANY(p_tipo_cliente))
    AND (p_casa IS NULL OR bc.casa = ANY(p_casa))
  GROUP BY 1,2,3,4 ORDER BY 1,3,4;
END;
$function$;

-- 6. rpc_contas_total_por_tipo
CREATE OR REPLACE FUNCTION public.rpc_contas_total_por_tipo(
  p_anomes integer[] DEFAULT NULL, p_banker text[] DEFAULT NULL, p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL, p_finder text[] DEFAULT NULL, p_tipo_cliente text[] DEFAULT NULL,
  p_casa text[] DEFAULT NULL
) RETURNS TABLE(tipo text, casa text, qtd bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT bc.tipo, bc.casa, COUNT(*)
  FROM bc_contas_total bc
  WHERE (p_anomes IS NULL OR bc.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR bc.banker = ANY(v_bf))
    AND (p_documento IS NULL OR bc.documento = ANY(p_documento))
    AND (v_af IS NULL OR bc.advisor = ANY(v_af))
    AND (v_ff IS NULL OR bc.finder = ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR bc.tipo_cliente = ANY(p_tipo_cliente))
    AND (p_casa IS NULL OR bc.casa = ANY(p_casa))
  GROUP BY 1,2 ORDER BY 1,2;
END;
$function$;

-- 7. rpc_auc_casa
CREATE OR REPLACE FUNCTION public.rpc_auc_casa(
  p_anomes integer[] DEFAULT NULL, p_banker text[] DEFAULT NULL, p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL, p_finder text[] DEFAULT NULL, p_tipo_cliente text[] DEFAULT NULL,
  p_casa text[] DEFAULT NULL
) RETURNS TABLE(casa text, auc numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT COALESCE(NULLIF(data->>'Casa',''),'XP'), SUM((data->>'Net Em M')::numeric)
  FROM raw_positivador_total_desagrupado
  WHERE (p_anomes IS NULL OR (data->>'AnoMes')::int = ANY(p_anomes))
    AND (v_bf IS NULL OR data->>'Banker' = ANY(v_bf))
    AND (p_documento IS NULL OR data->>'Documento' = ANY(p_documento))
    AND (v_af IS NULL OR data->>'Advisor' = ANY(v_af))
    AND (v_ff IS NULL OR data->>'Finder' = ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR data->>'Tipo de Cliente' = ANY(p_tipo_cliente))
    AND (p_casa IS NULL OR COALESCE(NULLIF(data->>'Casa',''),'XP') = ANY(p_casa))
  GROUP BY 1 ORDER BY 2 DESC;
END;
$function$;

-- 8. rpc_auc_casa_m0
CREATE OR REPLACE FUNCTION public.rpc_auc_casa_m0(
  p_anomes integer[] DEFAULT NULL, p_banker text[] DEFAULT NULL, p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL, p_finder text[] DEFAULT NULL, p_tipo_cliente text[] DEFAULT NULL,
  p_casa text[] DEFAULT NULL
) RETURNS TABLE(casa text, auc numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT COALESCE(NULLIF(data->>'Casa',''),'XP'), SUM((data->>'Net Em M')::numeric)
  FROM raw_positivador_m0_desagrupado
  WHERE (v_bf IS NULL OR data->>'Banker' = ANY(v_bf))
    AND (p_documento IS NULL OR data->>'Documento' = ANY(p_documento))
    AND (v_af IS NULL OR data->>'Advisor' = ANY(v_af))
    AND (v_ff IS NULL OR data->>'Finder' = ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR data->>'Tipo de Cliente' = ANY(p_tipo_cliente))
    AND (p_casa IS NULL OR COALESCE(NULLIF(data->>'Casa',''),'XP') = ANY(p_casa))
  GROUP BY 1 ORDER BY 2 DESC;
END;
$function$;

-- 9. rpc_auc_mes_stack_casa
CREATE OR REPLACE FUNCTION public.rpc_auc_mes_stack_casa(
  p_anomes integer[] DEFAULT NULL, p_banker text[] DEFAULT NULL, p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL, p_finder text[] DEFAULT NULL, p_tipo_cliente text[] DEFAULT NULL,
  p_casa text[] DEFAULT NULL
) RETURNS TABLE(anomes integer, anomes_nome text, casa text, auc numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
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
    AND (p_casa IS NULL OR COALESCE(NULLIF(data->>'Casa',''),'XP') = ANY(p_casa))
  GROUP BY 1,2,3 ORDER BY 1,3;
END;
$function$;

-- 10. rpc_auc_mes
CREATE OR REPLACE FUNCTION public.rpc_auc_mes(
  p_anomes integer[] DEFAULT NULL, p_banker text[] DEFAULT NULL, p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL, p_finder text[] DEFAULT NULL, p_tipo_cliente text[] DEFAULT NULL,
  p_casa text[] DEFAULT NULL
) RETURNS TABLE(anomes integer, anomes_nome text, auc numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT (data->>'AnoMes')::int,
    to_char(to_date(data->>'AnoMes','YYYYMM'),'Mon/YY'),
    SUM((data->>'Net Em M')::numeric)
  FROM raw_positivador_total_desagrupado
  WHERE (p_anomes IS NULL OR (data->>'AnoMes')::int = ANY(p_anomes))
    AND (v_bf IS NULL OR data->>'Banker' = ANY(v_bf))
    AND (p_documento IS NULL OR data->>'Documento' = ANY(p_documento))
    AND (v_af IS NULL OR data->>'Advisor' = ANY(v_af))
    AND (v_ff IS NULL OR data->>'Finder' = ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR data->>'Tipo de Cliente' = ANY(p_tipo_cliente))
    AND (p_casa IS NULL OR COALESCE(NULLIF(data->>'Casa',''),'XP') = ANY(p_casa))
  GROUP BY 1,2 ORDER BY 1;
END;
$function$;

-- Also create a simple RPC to get available casas for the filter
CREATE OR REPLACE FUNCTION public.rpc_filtro_casas()
RETURNS TABLE(casa text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT DISTINCT casa FROM cap_captacao_total_all WHERE casa IS NOT NULL ORDER BY casa;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_filtro_casas() TO authenticated;
