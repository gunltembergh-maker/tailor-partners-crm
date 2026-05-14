
-- ============ PARALLEL VIEW (includes Lavoro rows) ============
CREATE OR REPLACE VIEW public.vw_comissoes_caixa_completa AS
SELECT
  to_char(((r.data ->> 'Data')::date)::timestamptz, 'YYYYMM')::integer AS anomes,
  fix_encoding(r.data ->> 'Categoria') AS categoria,
  fix_encoding(r.data ->> 'Subcategoria') AS subcategoria,
  fix_encoding(r.data ->> 'Produto') AS produto,
  fix_encoding(r.data ->> 'Subproduto') AS subproduto,
  CASE
    WHEN NULLIF(TRIM(r.data ->> 'Banker'), '') = ANY (ARRAY['Enrico Santos','Nicholas Barbarisi']) THEN 'Richard S'
    WHEN NULLIF(TRIM(r.data ->> 'Banker'), '') = 'Murilo Jacob' THEN 'Gustavo Faria'
    ELSE r.data ->> 'Banker'
  END AS banker,
  r.data ->> 'Advisor' AS advisor,
  r.data ->> 'Finder'  AS finder,
  r.data ->> 'Canal'   AS canal,
  r.data ->> 'Tipo de Cliente' AS tipo_cliente,
  COALESCE(NULLIF(TRIM(r.data ->> 'Documento'), ''), NULLIF(TRIM(r.data ->> 'Cliente'), '')) AS documento,
  parse_num(COALESCE(r.data ->> 'Comissão Bruta Tailor', r.data ->> 'ComissÃ£o Bruta Tailor')) AS comissao_bruta_tailor,
  'm0'::text AS source_origin,
  r.id AS source_row_id
FROM raw_comissoes_m0 r
WHERE (r.data ->> 'Data') IS NOT NULL
  AND (r.data ->> 'Categoria') IS NOT NULL
  AND NOT (
    to_char(((r.data ->> 'Data')::date)::timestamptz, 'YYYYMM')::integer IN (
      SELECT DISTINCT to_char(((h.data ->> 'Data')::date)::timestamptz, 'YYYYMM')::integer
      FROM raw_comissoes_historico h
      WHERE (h.data ->> 'Data') IS NOT NULL
    )
  )
UNION ALL
SELECT
  to_char(((r.data ->> 'Data')::date)::timestamptz, 'YYYYMM')::integer AS anomes,
  fix_encoding(r.data ->> 'Categoria'),
  fix_encoding(r.data ->> 'Subcategoria'),
  fix_encoding(r.data ->> 'Produto'),
  fix_encoding(r.data ->> 'Subproduto'),
  CASE
    WHEN NULLIF(TRIM(r.data ->> 'Banker'), '') = ANY (ARRAY['Enrico Santos','Nicholas Barbarisi']) THEN 'Richard S'
    WHEN NULLIF(TRIM(r.data ->> 'Banker'), '') = 'Murilo Jacob' THEN 'Gustavo Faria'
    ELSE r.data ->> 'Banker'
  END,
  r.data ->> 'Advisor',
  r.data ->> 'Finder',
  r.data ->> 'Canal',
  r.data ->> 'Tipo de Cliente',
  COALESCE(NULLIF(TRIM(r.data ->> 'Documento'), ''), NULLIF(TRIM(r.data ->> 'Cliente'), '')),
  parse_num(COALESCE(r.data ->> 'Comissão Bruta Tailor', r.data ->> 'ComissÃ£o Bruta Tailor')),
  'historico'::text,
  r.id
FROM raw_comissoes_historico r
WHERE (r.data ->> 'Data') IS NOT NULL
  AND (r.data ->> 'Categoria') IS NOT NULL;

GRANT SELECT ON public.vw_comissoes_caixa_completa TO authenticated;

-- ============ PERMISSION ============
UPDATE public.perfis_acesso
SET permissoes = permissoes || jsonb_build_object(
      'menu_dashboard_receita',
      COALESCE((permissoes->>'menu_dashboard_comercial')::boolean, false)
    ),
    updated_at = now();

UPDATE public.perfis_acesso
SET permissoes = permissoes || jsonb_build_object('menu_dashboard_receita', true),
    updated_at = now()
WHERE nome IN ('ADMIN','LIDER');

-- ============ RPC 1: KPIs ============
CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_kpis(
  p_anomes integer,
  p_banker text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_categoria text[] DEFAULT NULL,
  p_subcategoria text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_tipo_pessoa text[] DEFAULT NULL
) RETURNS TABLE(
  total_mes numeric,
  total_mes_anterior numeric,
  variacao_pct numeric,
  n_clientes_unicos integer,
  anomes_label text,
  anomes_anterior_label text
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ant integer;
  v_bf text[] := get_user_banker_filter();
  v_ff text[] := get_user_finder_filter();
BEGIN
  v_ant := CASE WHEN (p_anomes % 100) = 1 THEN p_anomes - 100 + 11 - 1 + 1 - 0
                ELSE p_anomes - 1 END;
  -- correct prev anomes (handle january -> december previous year)
  IF (p_anomes % 100) = 1 THEN
    v_ant := ((p_anomes / 100) - 1) * 100 + 12;
  ELSE
    v_ant := p_anomes - 1;
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT anomes, comissao_bruta_tailor, documento
    FROM vw_comissoes_caixa_completa
    WHERE anomes IN (p_anomes, v_ant)
      AND (p_banker IS NULL OR banker = ANY(p_banker))
      AND (p_finder IS NULL OR finder = ANY(p_finder))
      AND (p_categoria IS NULL OR categoria = ANY(p_categoria))
      AND (p_subcategoria IS NULL OR subcategoria = ANY(p_subcategoria))
      AND (p_advisor IS NULL OR advisor = ANY(p_advisor))
      AND (p_tipo_pessoa IS NULL OR
           (('PF' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(documento,''), '[^0-9]', '', 'g')) = 11)
            OR ('PJ' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(documento,''), '[^0-9]', '', 'g')) = 14)))
      AND (v_bf IS NULL OR banker = ANY(v_bf))
      AND (v_ff IS NULL OR finder = ANY(v_ff))
  )
  SELECT
    ROUND(COALESCE(SUM(comissao_bruta_tailor) FILTER (WHERE anomes = p_anomes), 0)::numeric, 2),
    ROUND(COALESCE(SUM(comissao_bruta_tailor) FILTER (WHERE anomes = v_ant), 0)::numeric, 2),
    ROUND(CASE
      WHEN COALESCE(SUM(comissao_bruta_tailor) FILTER (WHERE anomes = v_ant),0) > 0
      THEN ((SUM(comissao_bruta_tailor) FILTER (WHERE anomes = p_anomes)
             - SUM(comissao_bruta_tailor) FILTER (WHERE anomes = v_ant))
            / SUM(comissao_bruta_tailor) FILTER (WHERE anomes = v_ant) * 100)::numeric
      ELSE NULL
    END, 2),
    COUNT(DISTINCT documento) FILTER (WHERE anomes = p_anomes)::integer,
    to_char(to_date(p_anomes::text,'YYYYMM'),'Mon/YY'),
    to_char(to_date(v_ant::text,'YYYYMM'),'Mon/YY')
  FROM base;
END;$$;
GRANT EXECUTE ON FUNCTION public.rpc_receita_caixa_kpis(integer,text[],text[],text[],text[],text[],text[]) TO authenticated;

-- ============ RPC 2: por categoria ============
CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_por_categoria(
  p_anomes integer,
  p_banker text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_categoria text[] DEFAULT NULL,
  p_subcategoria text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_tipo_pessoa text[] DEFAULT NULL
) RETURNS TABLE(categoria text, total numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.categoria, ROUND(SUM(v.comissao_bruta_tailor)::numeric,2) AS total
  FROM vw_comissoes_caixa_completa v
  WHERE v.anomes = p_anomes
    AND (p_banker IS NULL OR v.banker = ANY(p_banker))
    AND (p_finder IS NULL OR v.finder = ANY(p_finder))
    AND (p_categoria IS NULL OR v.categoria = ANY(p_categoria))
    AND (p_subcategoria IS NULL OR v.subcategoria = ANY(p_subcategoria))
    AND (p_advisor IS NULL OR v.advisor = ANY(p_advisor))
    AND (p_tipo_pessoa IS NULL OR
         (('PF' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 11)
          OR ('PJ' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 14)))
    AND (get_user_banker_filter() IS NULL OR v.banker = ANY(get_user_banker_filter()))
    AND (get_user_finder_filter() IS NULL OR v.finder = ANY(get_user_finder_filter()))
  GROUP BY v.categoria
  ORDER BY total DESC NULLS LAST;
$$;
GRANT EXECUTE ON FUNCTION public.rpc_receita_caixa_por_categoria(integer,text[],text[],text[],text[],text[],text[]) TO authenticated;

-- ============ RPC 3: por subcategoria pivot ============
CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_por_subcategoria(
  p_anomes integer,
  p_banker text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_categoria text[] DEFAULT NULL,
  p_subcategoria text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_tipo_pessoa text[] DEFAULT NULL
) RETURNS TABLE(categoria text, subcategoria text, total_subcategoria numeric, total_categoria numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH f AS (
    SELECT v.categoria, COALESCE(v.subcategoria,'(sem subcategoria)') AS subcategoria, v.comissao_bruta_tailor
    FROM vw_comissoes_caixa_completa v
    WHERE v.anomes = p_anomes
      AND (p_banker IS NULL OR v.banker = ANY(p_banker))
      AND (p_finder IS NULL OR v.finder = ANY(p_finder))
      AND (p_categoria IS NULL OR v.categoria = ANY(p_categoria))
      AND (p_subcategoria IS NULL OR v.subcategoria = ANY(p_subcategoria))
      AND (p_advisor IS NULL OR v.advisor = ANY(p_advisor))
      AND (p_tipo_pessoa IS NULL OR
           (('PF' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 11)
            OR ('PJ' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 14)))
      AND (get_user_banker_filter() IS NULL OR v.banker = ANY(get_user_banker_filter()))
      AND (get_user_finder_filter() IS NULL OR v.finder = ANY(get_user_finder_filter()))
  ), agg AS (
    SELECT categoria, subcategoria, ROUND(SUM(comissao_bruta_tailor)::numeric,2) AS total_subcategoria
    FROM f GROUP BY categoria, subcategoria
  ), tot AS (
    SELECT categoria, ROUND(SUM(comissao_bruta_tailor)::numeric,2) AS total_categoria
    FROM f GROUP BY categoria
  )
  SELECT a.categoria, a.subcategoria, a.total_subcategoria, t.total_categoria
  FROM agg a JOIN tot t USING (categoria)
  ORDER BY t.total_categoria DESC NULLS LAST, a.total_subcategoria DESC NULLS LAST;
$$;
GRANT EXECUTE ON FUNCTION public.rpc_receita_caixa_por_subcategoria(integer,text[],text[],text[],text[],text[],text[]) TO authenticated;

-- ============ RPC 4: serie temporal 12 meses ============
CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_serie_temporal(
  p_anomes integer,
  p_banker text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_categoria text[] DEFAULT NULL,
  p_subcategoria text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_tipo_pessoa text[] DEFAULT NULL
) RETURNS TABLE(anomes integer, anomes_label text, categoria text, total numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start date;
  v_end date;
BEGIN
  v_end := to_date(p_anomes::text,'YYYYMM');
  v_start := v_end - INTERVAL '11 months';

  RETURN QUERY
  SELECT v.anomes,
         to_char(to_date(v.anomes::text,'YYYYMM'),'Mon/YY') AS anomes_label,
         v.categoria,
         ROUND(SUM(v.comissao_bruta_tailor)::numeric,2) AS total
  FROM vw_comissoes_caixa_completa v
  WHERE v.anomes BETWEEN to_char(v_start,'YYYYMM')::integer AND p_anomes
    AND (p_banker IS NULL OR v.banker = ANY(p_banker))
    AND (p_finder IS NULL OR v.finder = ANY(p_finder))
    AND (p_categoria IS NULL OR v.categoria = ANY(p_categoria))
    AND (p_subcategoria IS NULL OR v.subcategoria = ANY(p_subcategoria))
    AND (p_advisor IS NULL OR v.advisor = ANY(p_advisor))
    AND (p_tipo_pessoa IS NULL OR
         (('PF' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 11)
          OR ('PJ' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 14)))
    AND (get_user_banker_filter() IS NULL OR v.banker = ANY(get_user_banker_filter()))
    AND (get_user_finder_filter() IS NULL OR v.finder = ANY(get_user_finder_filter()))
  GROUP BY v.anomes, v.categoria
  ORDER BY v.anomes ASC, total DESC;
END;$$;
GRANT EXECUTE ON FUNCTION public.rpc_receita_caixa_serie_temporal(integer,text[],text[],text[],text[],text[],text[]) TO authenticated;

-- ============ RPC 5: matriz banker x categoria ============
CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_por_assessor(
  p_anomes integer,
  p_banker text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_categoria text[] DEFAULT NULL,
  p_subcategoria text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_tipo_pessoa text[] DEFAULT NULL
) RETURNS TABLE(banker text, categoria text, total numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(v.banker,'(sem FA)') AS banker,
         v.categoria,
         ROUND(SUM(v.comissao_bruta_tailor)::numeric,2) AS total
  FROM vw_comissoes_caixa_completa v
  WHERE v.anomes = p_anomes
    AND (p_banker IS NULL OR v.banker = ANY(p_banker))
    AND (p_finder IS NULL OR v.finder = ANY(p_finder))
    AND (p_categoria IS NULL OR v.categoria = ANY(p_categoria))
    AND (p_subcategoria IS NULL OR v.subcategoria = ANY(p_subcategoria))
    AND (p_advisor IS NULL OR v.advisor = ANY(p_advisor))
    AND (p_tipo_pessoa IS NULL OR
         (('PF' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 11)
          OR ('PJ' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 14)))
    AND (get_user_banker_filter() IS NULL OR v.banker = ANY(get_user_banker_filter()))
    AND (get_user_finder_filter() IS NULL OR v.finder = ANY(get_user_finder_filter()))
  GROUP BY 1, 2;
$$;
GRANT EXECUTE ON FUNCTION public.rpc_receita_caixa_por_assessor(integer,text[],text[],text[],text[],text[],text[]) TO authenticated;

-- ============ RPC 6: advisor xp (Assessoria) ============
CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_advisor_xp(
  p_anomes integer,
  p_banker text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_categoria text[] DEFAULT NULL,
  p_subcategoria text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_tipo_pessoa text[] DEFAULT NULL
) RETURNS TABLE(advisor text, total numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(TRIM(v.advisor),''),'Sem Advisor') AS advisor,
         ROUND(SUM(v.comissao_bruta_tailor)::numeric,2) AS total
  FROM vw_comissoes_caixa_completa v
  WHERE v.anomes = p_anomes
    AND v.categoria = 'Assessoria'
    AND (p_banker IS NULL OR v.banker = ANY(p_banker))
    AND (p_finder IS NULL OR v.finder = ANY(p_finder))
    AND (p_subcategoria IS NULL OR v.subcategoria = ANY(p_subcategoria))
    AND (p_advisor IS NULL OR v.advisor = ANY(p_advisor))
    AND (p_tipo_pessoa IS NULL OR
         (('PF' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 11)
          OR ('PJ' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 14)))
    AND (get_user_banker_filter() IS NULL OR v.banker = ANY(get_user_banker_filter()))
    AND (get_user_finder_filter() IS NULL OR v.finder = ANY(get_user_finder_filter()))
  GROUP BY 1
  ORDER BY total DESC NULLS LAST;
$$;
GRANT EXECUTE ON FUNCTION public.rpc_receita_caixa_advisor_xp(integer,text[],text[],text[],text[],text[],text[]) TO authenticated;

-- ============ RPC 7: filtros ============
CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_filtros()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bf text[] := get_user_banker_filter();
  v_ff text[] := get_user_finder_filter();
  v_result jsonb;
BEGIN
  WITH scoped AS (
    SELECT * FROM vw_comissoes_caixa_completa v
    WHERE (v_bf IS NULL OR v.banker = ANY(v_bf))
      AND (v_ff IS NULL OR v.finder = ANY(v_ff))
  )
  SELECT jsonb_build_object(
    'anomes_disponiveis', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('anomes', a, 'label', to_char(to_date(a::text,'YYYYMM'),'Mon/YYYY')) ORDER BY a DESC), '[]'::jsonb)
      FROM (SELECT DISTINCT anomes AS a FROM scoped WHERE anomes IS NOT NULL) x
    ),
    'bankers', (SELECT COALESCE(jsonb_agg(DISTINCT banker ORDER BY banker), '[]'::jsonb) FROM scoped WHERE banker IS NOT NULL AND TRIM(banker) <> ''),
    'finders', (SELECT COALESCE(jsonb_agg(DISTINCT finder ORDER BY finder), '[]'::jsonb) FROM scoped WHERE finder IS NOT NULL AND TRIM(finder) <> ''),
    'categorias', (SELECT COALESCE(jsonb_agg(DISTINCT categoria ORDER BY categoria), '[]'::jsonb) FROM scoped WHERE categoria IS NOT NULL),
    'subcategorias', (SELECT COALESCE(jsonb_agg(DISTINCT subcategoria ORDER BY subcategoria), '[]'::jsonb) FROM scoped WHERE subcategoria IS NOT NULL),
    'advisors', (SELECT COALESCE(jsonb_agg(DISTINCT advisor ORDER BY advisor), '[]'::jsonb) FROM scoped WHERE advisor IS NOT NULL AND TRIM(advisor) <> '')
  ) INTO v_result;
  RETURN v_result;
END;$$;
GRANT EXECUTE ON FUNCTION public.rpc_receita_caixa_filtros() TO authenticated;
