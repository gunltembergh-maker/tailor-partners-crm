
-- Drop duplicate 2-param RPCs (keep only the 3-param versions with p_finder)
DROP FUNCTION IF EXISTS rpc_receita_matriz_rows_cat(integer[], text[]);
DROP FUNCTION IF EXISTS rpc_receita_mes_categoria(integer[], text[]);
DROP FUNCTION IF EXISTS rpc_receita_treemap_categoria(integer[], text[]);
DROP FUNCTION IF EXISTS rpc_receita_matriz_rows(integer[], text[]);
DROP FUNCTION IF EXISTS rpc_receita_drilldown(integer[], text[], text, text, text);

-- Now recreate ALL receita RPCs to use comissoes_consolidado_filtrado instead of mv_comissoes_consolidado

CREATE OR REPLACE FUNCTION rpc_receita_matriz_rows_cat(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL
) RETURNS TABLE(anomes int, anomes_nome text, categoria text, valor numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT c.anomes, to_char(to_date(c.anomes::text,'YYYYMM'),'Mon/YY'),
    c.categoria, SUM(c.comissao_bruta_tailor)
  FROM comissoes_consolidado_filtrado c
  WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR c.banker = ANY(v_bf))
    AND (v_ff IS NULL OR c.finder = ANY(v_ff))
    AND c.categoria IS NOT NULL
  GROUP BY 1,2,3 ORDER BY 1,3;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_receita_mes_categoria(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL
) RETURNS TABLE(anomes int, anomes_nome text, categoria text, valor numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT c.anomes, to_char(to_date(c.anomes::text,'YYYYMM'),'Mon/YY'),
    c.categoria, SUM(c.comissao_bruta_tailor)
  FROM comissoes_consolidado_filtrado c
  WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR c.banker = ANY(v_bf))
    AND (v_ff IS NULL OR c.finder = ANY(v_ff))
    AND c.categoria IS NOT NULL
  GROUP BY 1,2,3 ORDER BY 1,3;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_receita_treemap_categoria(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL
) RETURNS TABLE(categoria text, valor numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT c.categoria, SUM(c.comissao_bruta_tailor)
  FROM comissoes_consolidado_filtrado c
  WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR c.banker = ANY(v_bf))
    AND (v_ff IS NULL OR c.finder = ANY(v_ff))
    AND c.categoria IS NOT NULL
  GROUP BY 1 ORDER BY 2 DESC;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_receita_total(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL
) RETURNS TABLE(receita numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT COALESCE(SUM(comissao_bruta_tailor), 0)
  FROM comissoes_consolidado_filtrado
  WHERE (p_anomes IS NULL OR anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR banker = ANY(v_bf))
    AND (v_ff IS NULL OR finder = ANY(v_ff));
END;
$$;

CREATE OR REPLACE FUNCTION rpc_receita_matriz_rows(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL
) RETURNS TABLE(anomes int, anomes_nome text, categoria text, produto text, subcategoria text, subproduto text, valor numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT c.anomes, to_char(to_date(c.anomes::text,'YYYYMM'),'Mon/YY'),
    c.categoria, c.produto, c.subcategoria, c.subproduto,
    SUM(c.comissao_bruta_tailor)
  FROM comissoes_consolidado_filtrado c
  WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR c.banker = ANY(v_bf))
    AND (v_ff IS NULL OR c.finder = ANY(v_ff))
  GROUP BY 1,2,3,4,5,6 ORDER BY 1,3,4,5,6;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_receita_drilldown(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_categoria text DEFAULT NULL,
  p_subcategoria text DEFAULT NULL,
  p_produto text DEFAULT NULL,
  p_finder text[] DEFAULT NULL
) RETURNS TABLE(anomes int, anomes_nome text, categoria text, produto text, subcategoria text, subproduto text, documento text, valor numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  IF p_categoria IS NOT NULL AND p_subcategoria IS NOT NULL AND p_produto IS NOT NULL THEN
    RETURN QUERY
    SELECT c.anomes, to_char(to_date(c.anomes::text,'YYYYMM'),'Mon/YY'),
      c.categoria, c.produto, c.subcategoria, c.subproduto,
      c.documento, SUM(c.comissao_bruta_tailor)
    FROM comissoes_consolidado_filtrado c
    WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
      AND (v_bf IS NULL OR c.banker = ANY(v_bf))
      AND (v_ff IS NULL OR c.finder = ANY(v_ff))
      AND c.categoria   = p_categoria
      AND c.subcategoria = p_subcategoria
      AND c.produto     = p_produto
    GROUP BY 1,2,3,4,5,6,7 ORDER BY 1,3,4,5,6,7;
  ELSE
    RETURN QUERY
    SELECT c.anomes, to_char(to_date(c.anomes::text,'YYYYMM'),'Mon/YY'),
      c.categoria, c.produto, c.subcategoria, c.subproduto,
      NULL::text, SUM(c.comissao_bruta_tailor)
    FROM comissoes_consolidado_filtrado c
    WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
      AND (v_bf IS NULL OR c.banker = ANY(v_bf))
      AND (v_ff IS NULL OR c.finder = ANY(v_ff))
      AND (p_categoria    IS NULL OR c.categoria    = p_categoria)
      AND (p_subcategoria IS NULL OR c.subcategoria = p_subcategoria)
      AND (p_produto      IS NULL OR c.produto      = p_produto)
    GROUP BY 1,2,3,4,5,6 ORDER BY 1,3,4,5,6;
  END IF;
END;
$$;

-- Also update ROA RPCs to use comissoes_consolidado_filtrado
CREATE OR REPLACE FUNCTION rpc_roa_geral(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_tipo_cliente text[] DEFAULT NULL
) RETURNS TABLE(anomes int, anomes_nome text, roa numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  WITH rec AS (
    SELECT c_inner.anomes AS r_anomes, c_inner.documento AS r_documento, SUM(c_inner.comissao_bruta_tailor) AS rt
    FROM comissoes_consolidado_filtrado c_inner
    WHERE (v_bf IS NULL OR c_inner.banker = ANY(v_bf)) GROUP BY 1,2
  )
  SELECT p.anomes, to_char(to_date(p.anomes::text,'YYYYMM'),'Mon/YY'),
    CASE WHEN SUM(p.net_em_m)>0
      THEN ROUND((SUM(COALESCE(r.rt,0))/SUM(p.net_em_m))*12*100,4) ELSE 0 END
  FROM view_positivador_agrupado p
  LEFT JOIN rec r ON r.r_anomes=p.anomes AND r.r_documento=p.documento
  WHERE (p_anomes IS NULL OR p.anomes=ANY(p_anomes))
    AND (v_bf IS NULL OR p.banker=ANY(v_bf))
    AND (p_documento IS NULL OR p.documento=ANY(p_documento))
    AND (v_af IS NULL OR p.advisor=ANY(v_af))
    AND (v_ff IS NULL OR p.finder=ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR p.tipo_cliente=ANY(p_tipo_cliente))
  GROUP BY 1,2 ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_roa_tipo_cliente(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_tipo_cliente text[] DEFAULT NULL
) RETURNS TABLE(anomes int, anomes_nome text, tipo_cliente text, roa numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  WITH rec AS (
    SELECT c_inner.anomes AS r_anomes, c_inner.documento AS r_documento, SUM(c_inner.comissao_bruta_tailor) AS rt
    FROM comissoes_consolidado_filtrado c_inner
    WHERE (v_bf IS NULL OR c_inner.banker = ANY(v_bf))
    GROUP BY c_inner.anomes, c_inner.documento
  )
  SELECT p.anomes, to_char(to_date(p.anomes::text,'YYYYMM'),'Mon/YY'), p.tipo_cliente,
    CASE WHEN SUM(p.net_em_m) > 0
      THEN ROUND((SUM(COALESCE(r.rt,0)) / SUM(p.net_em_m)) * 12 * 100, 4) ELSE 0 END
  FROM view_positivador_agrupado p
  LEFT JOIN rec r ON r.r_anomes = p.anomes AND r.r_documento = p.documento
  WHERE (p_anomes IS NULL OR p.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR p.banker = ANY(v_bf))
    AND (p_documento IS NULL OR p.documento = ANY(p_documento))
    AND (v_af IS NULL OR p.advisor = ANY(v_af))
    AND (v_ff IS NULL OR p.finder = ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR p.tipo_cliente = ANY(p_tipo_cliente))
  GROUP BY p.anomes, to_char(to_date(p.anomes::text,'YYYYMM'),'Mon/YY'), p.tipo_cliente
  ORDER BY p.anomes;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_roa_faixa_pl(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_tipo_cliente text[] DEFAULT NULL
) RETURNS TABLE(anomes int, anomes_nome text, faixa_pl text, roa numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  WITH rec AS (
    SELECT c_inner.anomes AS r_anomes, c_inner.documento AS r_documento, SUM(c_inner.comissao_bruta_tailor) AS rt
    FROM comissoes_consolidado_filtrado c_inner
    WHERE (v_bf IS NULL OR c_inner.banker = ANY(v_bf))
    GROUP BY c_inner.anomes, c_inner.documento
  )
  SELECT p.anomes, to_char(to_date(p.anomes::text,'YYYYMM'),'Mon/YY'), p.faixa_pl,
    CASE WHEN SUM(p.net_em_m) > 0
      THEN ROUND((SUM(COALESCE(r.rt,0)) / SUM(p.net_em_m)) * 12 * 100, 4) ELSE 0 END
  FROM view_positivador_agrupado p
  LEFT JOIN rec r ON r.r_anomes = p.anomes AND r.r_documento = p.documento
  WHERE (p_anomes IS NULL OR p.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR p.banker = ANY(v_bf))
    AND (p_documento IS NULL OR p.documento = ANY(p_documento))
    AND (v_af IS NULL OR p.advisor = ANY(v_af))
    AND (v_ff IS NULL OR p.finder = ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR p.tipo_cliente = ANY(p_tipo_cliente))
    AND p.faixa_pl IS NOT NULL
  GROUP BY p.anomes, to_char(to_date(p.anomes::text,'YYYYMM'),'Mon/YY'), p.faixa_pl
  ORDER BY p.anomes;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_roa_m0_tabela(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_tipo_cliente text[] DEFAULT NULL
) RETURNS TABLE(documento text, faixa_pl text, roa numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  WITH rec AS (
    SELECT c_inner.anomes AS r_anomes, c_inner.documento AS r_documento, SUM(c_inner.comissao_bruta_tailor) AS rt
    FROM comissoes_consolidado_filtrado c_inner
    WHERE (v_bf IS NULL OR c_inner.banker = ANY(v_bf))
    GROUP BY c_inner.anomes, c_inner.documento
  )
  SELECT p.documento, p.faixa_pl,
    CASE WHEN SUM(p.net_em_m) > 0
      THEN ROUND((SUM(COALESCE(r.rt,0)) / SUM(p.net_em_m)) * 12 * 100, 4) ELSE 0 END
  FROM view_positivador_agrupado p
  LEFT JOIN rec r ON r.r_anomes = p.anomes AND r.r_documento = p.documento
  WHERE (p_anomes IS NULL OR p.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR p.banker = ANY(v_bf))
    AND (p_documento IS NULL OR p.documento = ANY(p_documento))
    AND (v_af IS NULL OR p.advisor = ANY(v_af))
    AND (v_ff IS NULL OR p.finder = ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR p.tipo_cliente = ANY(p_tipo_cliente))
    AND p.faixa_pl IS NOT NULL
  GROUP BY p.documento, p.faixa_pl
  ORDER BY 3 DESC;
END;
$$;
