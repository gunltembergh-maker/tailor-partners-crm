-- Optimize RPCs receita_caixa: materialize RLS filter calls once per query
-- to avoid 50× buffer overhead from per-row STABLE function calls.

CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_advisor_xp(
  p_anomes integer,
  p_banker text[] DEFAULT NULL::text[],
  p_finder text[] DEFAULT NULL::text[],
  p_advisor text[] DEFAULT NULL::text[],
  p_categoria text[] DEFAULT NULL::text[],
  p_subcategoria text[] DEFAULT NULL::text[],
  p_canal text[] DEFAULT NULL::text[],
  p_tipo_pessoa text[] DEFAULT NULL::text[]
) RETURNS TABLE(advisor text, total numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user_bankers text[];
  v_user_finders text[];
BEGIN
  v_user_bankers := get_user_banker_filter();
  v_user_finders := get_user_finder_filter();
  RETURN QUERY
  SELECT COALESCE(NULLIF(TRIM(v.advisor),''),'Sem Advisor') AS advisor,
         ROUND(SUM(v.comissao_bruta_tailor)::numeric,2) AS total
  FROM mv_comissoes_caixa_completa v
  WHERE v.anomes = p_anomes
    AND v.categoria = 'Assessoria'
    AND (p_banker IS NULL OR v.banker = ANY(p_banker))
    AND (p_finder IS NULL OR v.finder = ANY(p_finder))
    AND (p_advisor IS NULL OR v.advisor = ANY(p_advisor))
    AND (p_subcategoria IS NULL OR v.subcategoria = ANY(p_subcategoria))
    AND (p_canal IS NULL OR v.canal = ANY(p_canal))
    AND (p_tipo_pessoa IS NULL OR
         (('PF' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 11)
          OR ('PJ' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 14)))
    AND (v_user_bankers IS NULL OR v.banker = ANY(v_user_bankers))
    AND (v_user_finders IS NULL OR v.finder = ANY(v_user_finders))
  GROUP BY 1
  ORDER BY total DESC NULLS LAST;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_kpis(
  p_anomes integer,
  p_banker text[] DEFAULT NULL::text[],
  p_finder text[] DEFAULT NULL::text[],
  p_advisor text[] DEFAULT NULL::text[],
  p_categoria text[] DEFAULT NULL::text[],
  p_subcategoria text[] DEFAULT NULL::text[],
  p_canal text[] DEFAULT NULL::text[],
  p_tipo_pessoa text[] DEFAULT NULL::text[]
) RETURNS TABLE(total_mes numeric, total_mes_anterior numeric, variacao_pct numeric, n_clientes_unicos integer, anomes_label text, anomes_anterior_label text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_ant integer;
  v_user_bankers text[];
  v_user_finders text[];
BEGIN
  IF (p_anomes % 100) = 1 THEN v_ant := ((p_anomes / 100) - 1) * 100 + 12;
  ELSE v_ant := p_anomes - 1; END IF;

  v_user_bankers := get_user_banker_filter();
  v_user_finders := get_user_finder_filter();

  RETURN QUERY
  WITH base AS (
    SELECT v.anomes, v.comissao_bruta_tailor, v.documento
    FROM mv_comissoes_caixa_completa v
    WHERE v.anomes IN (p_anomes, v_ant)
      AND (p_banker IS NULL OR v.banker = ANY(p_banker))
      AND (p_finder IS NULL OR v.finder = ANY(p_finder))
      AND (p_advisor IS NULL OR v.advisor = ANY(p_advisor))
      AND (p_categoria IS NULL OR v.categoria = ANY(p_categoria))
      AND (p_subcategoria IS NULL OR v.subcategoria = ANY(p_subcategoria))
      AND (p_canal IS NULL OR v.canal = ANY(p_canal))
      AND (p_tipo_pessoa IS NULL OR
           (('PF' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 11)
            OR ('PJ' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 14)))
      AND (v_user_bankers IS NULL OR v.banker = ANY(v_user_bankers))
      AND (v_user_finders IS NULL OR v.finder = ANY(v_user_finders))
  ), tot AS (
    SELECT
      ROUND(COALESCE(SUM(comissao_bruta_tailor) FILTER (WHERE anomes = p_anomes),0)::numeric,2) AS t_atual,
      ROUND(COALESCE(SUM(comissao_bruta_tailor) FILTER (WHERE anomes = v_ant),0)::numeric,2)    AS t_ant,
      COUNT(DISTINCT documento) FILTER (WHERE anomes = p_anomes)::int AS n_cli
    FROM base
  )
  SELECT
    tot.t_atual,
    tot.t_ant,
    CASE WHEN tot.t_ant = 0 THEN NULL ELSE ROUND(((tot.t_atual - tot.t_ant)/tot.t_ant)*100,2) END,
    tot.n_cli,
    to_char(to_date(p_anomes::text,'YYYYMM'),'Mon/YYYY'),
    to_char(to_date(v_ant::text,'YYYYMM'),'Mon/YYYY')
  FROM tot;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_por_assessor(
  p_anomes integer,
  p_banker text[] DEFAULT NULL::text[],
  p_finder text[] DEFAULT NULL::text[],
  p_advisor text[] DEFAULT NULL::text[],
  p_categoria text[] DEFAULT NULL::text[],
  p_subcategoria text[] DEFAULT NULL::text[],
  p_canal text[] DEFAULT NULL::text[],
  p_tipo_pessoa text[] DEFAULT NULL::text[]
) RETURNS TABLE(banker text, categoria text, total numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user_bankers text[];
  v_user_finders text[];
BEGIN
  v_user_bankers := get_user_banker_filter();
  v_user_finders := get_user_finder_filter();
  RETURN QUERY
  SELECT COALESCE(v.banker,'(sem FA)') AS banker, v.categoria,
         ROUND(SUM(v.comissao_bruta_tailor)::numeric,2) AS total
  FROM mv_comissoes_caixa_completa v
  WHERE v.anomes = p_anomes
    AND (p_banker IS NULL OR v.banker = ANY(p_banker))
    AND (p_finder IS NULL OR v.finder = ANY(p_finder))
    AND (p_advisor IS NULL OR v.advisor = ANY(p_advisor))
    AND (p_categoria IS NULL OR v.categoria = ANY(p_categoria))
    AND (p_subcategoria IS NULL OR v.subcategoria = ANY(p_subcategoria))
    AND (p_canal IS NULL OR v.canal = ANY(p_canal))
    AND (p_tipo_pessoa IS NULL OR
         (('PF' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 11)
          OR ('PJ' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 14)))
    AND (v_user_bankers IS NULL OR v.banker = ANY(v_user_bankers))
    AND (v_user_finders IS NULL OR v.finder = ANY(v_user_finders))
  GROUP BY 1, 2;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_por_categoria(
  p_anomes integer,
  p_banker text[] DEFAULT NULL::text[],
  p_finder text[] DEFAULT NULL::text[],
  p_advisor text[] DEFAULT NULL::text[],
  p_categoria text[] DEFAULT NULL::text[],
  p_subcategoria text[] DEFAULT NULL::text[],
  p_canal text[] DEFAULT NULL::text[],
  p_tipo_pessoa text[] DEFAULT NULL::text[]
) RETURNS TABLE(categoria text, total numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user_bankers text[];
  v_user_finders text[];
BEGIN
  v_user_bankers := get_user_banker_filter();
  v_user_finders := get_user_finder_filter();
  RETURN QUERY
  SELECT v.categoria, ROUND(SUM(v.comissao_bruta_tailor)::numeric,2) AS total
  FROM mv_comissoes_caixa_completa v
  WHERE v.anomes = p_anomes
    AND (p_banker IS NULL OR v.banker = ANY(p_banker))
    AND (p_finder IS NULL OR v.finder = ANY(p_finder))
    AND (p_advisor IS NULL OR v.advisor = ANY(p_advisor))
    AND (p_categoria IS NULL OR v.categoria = ANY(p_categoria))
    AND (p_subcategoria IS NULL OR v.subcategoria = ANY(p_subcategoria))
    AND (p_canal IS NULL OR v.canal = ANY(p_canal))
    AND (p_tipo_pessoa IS NULL OR
         (('PF' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 11)
          OR ('PJ' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 14)))
    AND (v_user_bankers IS NULL OR v.banker = ANY(v_user_bankers))
    AND (v_user_finders IS NULL OR v.finder = ANY(v_user_finders))
  GROUP BY v.categoria
  ORDER BY total DESC NULLS LAST;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_por_subcategoria(
  p_anomes integer,
  p_banker text[] DEFAULT NULL::text[],
  p_finder text[] DEFAULT NULL::text[],
  p_advisor text[] DEFAULT NULL::text[],
  p_categoria text[] DEFAULT NULL::text[],
  p_subcategoria text[] DEFAULT NULL::text[],
  p_canal text[] DEFAULT NULL::text[],
  p_tipo_pessoa text[] DEFAULT NULL::text[]
) RETURNS TABLE(categoria text, subcategoria text, total_subcategoria numeric, total_categoria numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user_bankers text[];
  v_user_finders text[];
BEGIN
  v_user_bankers := get_user_banker_filter();
  v_user_finders := get_user_finder_filter();
  RETURN QUERY
  WITH f AS (
    SELECT v.categoria, COALESCE(v.subcategoria,'(sem subcategoria)') AS subcategoria, v.comissao_bruta_tailor
    FROM mv_comissoes_caixa_completa v
    WHERE v.anomes = p_anomes
      AND (p_banker IS NULL OR v.banker = ANY(p_banker))
      AND (p_finder IS NULL OR v.finder = ANY(p_finder))
      AND (p_advisor IS NULL OR v.advisor = ANY(p_advisor))
      AND (p_categoria IS NULL OR v.categoria = ANY(p_categoria))
      AND (p_subcategoria IS NULL OR v.subcategoria = ANY(p_subcategoria))
      AND (p_canal IS NULL OR v.canal = ANY(p_canal))
      AND (p_tipo_pessoa IS NULL OR
           (('PF' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 11)
            OR ('PJ' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 14)))
      AND (v_user_bankers IS NULL OR v.banker = ANY(v_user_bankers))
      AND (v_user_finders IS NULL OR v.finder = ANY(v_user_finders))
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
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_serie_temporal(
  p_anomes integer,
  p_banker text[] DEFAULT NULL::text[],
  p_finder text[] DEFAULT NULL::text[],
  p_advisor text[] DEFAULT NULL::text[],
  p_categoria text[] DEFAULT NULL::text[],
  p_subcategoria text[] DEFAULT NULL::text[],
  p_canal text[] DEFAULT NULL::text[],
  p_tipo_pessoa text[] DEFAULT NULL::text[]
) RETURNS TABLE(anomes integer, anomes_label text, categoria text, total numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_start date;
  v_end date;
  v_user_bankers text[];
  v_user_finders text[];
BEGIN
  v_end := to_date(p_anomes::text,'YYYYMM');
  v_start := v_end - INTERVAL '11 months';
  v_user_bankers := get_user_banker_filter();
  v_user_finders := get_user_finder_filter();
  RETURN QUERY
  SELECT v.anomes,
         to_char(to_date(v.anomes::text,'YYYYMM'),'Mon/YY') AS anomes_label,
         v.categoria,
         ROUND(SUM(v.comissao_bruta_tailor)::numeric,2) AS total
  FROM mv_comissoes_caixa_completa v
  WHERE v.anomes BETWEEN to_char(v_start,'YYYYMM')::integer AND p_anomes
    AND (p_banker IS NULL OR v.banker = ANY(p_banker))
    AND (p_finder IS NULL OR v.finder = ANY(p_finder))
    AND (p_advisor IS NULL OR v.advisor = ANY(p_advisor))
    AND (p_categoria IS NULL OR v.categoria = ANY(p_categoria))
    AND (p_subcategoria IS NULL OR v.subcategoria = ANY(p_subcategoria))
    AND (p_canal IS NULL OR v.canal = ANY(p_canal))
    AND (p_tipo_pessoa IS NULL OR
         (('PF' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 11)
          OR ('PJ' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 14)))
    AND (v_user_bankers IS NULL OR v.banker = ANY(v_user_bankers))
    AND (v_user_finders IS NULL OR v.finder = ANY(v_user_finders))
  GROUP BY v.anomes, v.categoria
  ORDER BY v.anomes ASC, total DESC;
END;
$function$;