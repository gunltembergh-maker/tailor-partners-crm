-- ==========================================================
-- LOTE A — Propagação do filtro de restrição por vínculos
-- Padrão idêntico ao já validado em rpc_receita_caixa_kpis
-- ==========================================================

-- 1) rpc_receita_caixa_advisor_xp
CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_advisor_xp(
  p_anomes integer,
  p_banker text[] DEFAULT NULL::text[],
  p_finder text[] DEFAULT NULL::text[],
  p_advisor text[] DEFAULT NULL::text[],
  p_categoria text[] DEFAULT NULL::text[],
  p_subcategoria text[] DEFAULT NULL::text[],
  p_canal text[] DEFAULT NULL::text[],
  p_tipo_pessoa text[] DEFAULT NULL::text[]
)
RETURNS TABLE(advisor text, total numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_user_bankers text[];
  v_user_finders text[];
  v_caller uuid := auth.uid();
  v_tem_restricao boolean;
BEGIN
  v_user_bankers := get_user_banker_filter();
  v_user_finders := get_user_finder_filter();
  v_tem_restricao := public.usuario_tem_restricao_receita(v_caller);

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
    AND (
      NOT v_tem_restricao
      OR EXISTS (
        SELECT 1 FROM public.pessoas_vinculadas_usuario(v_caller) pv
        WHERE
          (pv.tipo = 'FA' AND public.normalize_nome_pessoa(v.banker) = pv.valor_normalizado)
          OR (pv.tipo = 'FINDER' AND public.normalize_nome_pessoa(v.finder) = pv.valor_normalizado)
          OR (pv.tipo = 'ADVISOR' AND public.normalize_nome_pessoa(v.advisor) = pv.valor_normalizado)
      )
    )
  GROUP BY 1
  ORDER BY total DESC NULLS LAST;
END;
$function$;

-- 2) rpc_receita_caixa_por_categoria
CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_por_categoria(
  p_anomes integer,
  p_banker text[] DEFAULT NULL::text[],
  p_finder text[] DEFAULT NULL::text[],
  p_advisor text[] DEFAULT NULL::text[],
  p_categoria text[] DEFAULT NULL::text[],
  p_subcategoria text[] DEFAULT NULL::text[],
  p_canal text[] DEFAULT NULL::text[],
  p_tipo_pessoa text[] DEFAULT NULL::text[]
)
RETURNS TABLE(categoria text, total numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_user_bankers text[];
  v_user_finders text[];
  v_caller uuid := auth.uid();
  v_tem_restricao boolean;
BEGIN
  v_user_bankers := get_user_banker_filter();
  v_user_finders := get_user_finder_filter();
  v_tem_restricao := public.usuario_tem_restricao_receita(v_caller);

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
    AND (
      NOT v_tem_restricao
      OR EXISTS (
        SELECT 1 FROM public.pessoas_vinculadas_usuario(v_caller) pv
        WHERE
          (pv.tipo = 'FA' AND public.normalize_nome_pessoa(v.banker) = pv.valor_normalizado)
          OR (pv.tipo = 'FINDER' AND public.normalize_nome_pessoa(v.finder) = pv.valor_normalizado)
          OR (pv.tipo = 'ADVISOR' AND public.normalize_nome_pessoa(v.advisor) = pv.valor_normalizado)
      )
    )
  GROUP BY v.categoria
  ORDER BY total DESC NULLS LAST;
END;
$function$;

-- 3) rpc_receita_caixa_por_subcategoria
CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_por_subcategoria(
  p_anomes integer,
  p_banker text[] DEFAULT NULL::text[],
  p_finder text[] DEFAULT NULL::text[],
  p_advisor text[] DEFAULT NULL::text[],
  p_categoria text[] DEFAULT NULL::text[],
  p_subcategoria text[] DEFAULT NULL::text[],
  p_canal text[] DEFAULT NULL::text[],
  p_tipo_pessoa text[] DEFAULT NULL::text[]
)
RETURNS TABLE(categoria text, subcategoria text, total_subcategoria numeric, total_categoria numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_user_bankers text[];
  v_user_finders text[];
  v_caller uuid := auth.uid();
  v_tem_restricao boolean;
BEGIN
  v_user_bankers := get_user_banker_filter();
  v_user_finders := get_user_finder_filter();
  v_tem_restricao := public.usuario_tem_restricao_receita(v_caller);

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
      AND (
        NOT v_tem_restricao
        OR EXISTS (
          SELECT 1 FROM public.pessoas_vinculadas_usuario(v_caller) pv
          WHERE
            (pv.tipo = 'FA' AND public.normalize_nome_pessoa(v.banker) = pv.valor_normalizado)
            OR (pv.tipo = 'FINDER' AND public.normalize_nome_pessoa(v.finder) = pv.valor_normalizado)
            OR (pv.tipo = 'ADVISOR' AND public.normalize_nome_pessoa(v.advisor) = pv.valor_normalizado)
        )
      )
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

-- 4) rpc_receita_drilldown_agg
CREATE OR REPLACE FUNCTION public.rpc_receita_drilldown_agg(
  p_anomes integer[] DEFAULT NULL::integer[],
  p_banker text[] DEFAULT NULL::text[],
  p_finder text[] DEFAULT NULL::text[],
  p_categoria text DEFAULT NULL::text,
  p_subcategoria text DEFAULT NULL::text,
  p_produto text DEFAULT NULL::text,
  p_level integer DEFAULT 1
)
RETURNS TABLE(anomes integer, anomes_nome text, label text, valor numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_caller uuid := auth.uid();
  v_tem_restricao boolean;
BEGIN
  v_tem_restricao := public.usuario_tem_restricao_receita(v_caller);

  RETURN QUERY
  SELECT c.anomes,
         to_char(to_date(c.anomes::text,'YYYYMM'),'Mon/YY') AS anomes_nome,
         CASE p_level
           WHEN 1 THEN COALESCE(c.subcategoria, 'N/D')
           WHEN 2 THEN COALESCE(c.produto, 'N/D')
           WHEN 3 THEN COALESCE(c.documento, 'N/D')
           ELSE COALESCE(c.categoria, 'N/D')
         END AS label,
         SUM(c.comissao_bruta_tailor)::numeric AS valor
  FROM public.mv_comissoes_consolidado_v2 c
  WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR c.banker = ANY(v_bf))
    AND (p_finder IS NULL OR c.finder = ANY(p_finder))
    AND (p_categoria IS NULL OR c.categoria = p_categoria)
    AND (p_subcategoria IS NULL OR c.subcategoria = p_subcategoria)
    AND (p_produto IS NULL OR c.produto = p_produto)
    AND NOT (
      c.categoria = 'Lavoro'
      AND COALESCE(c.banker, '') IN ('Sem Advisor', 'Sem Assessor', '')
      AND COALESCE(c.finder, '') IN ('Sem Finder', '', 'Priscilla Macedo')
    )
    AND (
      NOT v_tem_restricao
      OR EXISTS (
        SELECT 1 FROM public.pessoas_vinculadas_usuario(v_caller) pv
        WHERE
          (pv.tipo = 'FA' AND public.normalize_nome_pessoa(c.banker) = pv.valor_normalizado)
          OR (pv.tipo = 'FINDER' AND public.normalize_nome_pessoa(c.finder) = pv.valor_normalizado)
          OR (pv.tipo = 'ADVISOR' AND public.normalize_nome_pessoa(c.advisor) = pv.valor_normalizado)
      )
    )
  GROUP BY c.anomes, 1,
    CASE p_level
      WHEN 1 THEN COALESCE(c.subcategoria, 'N/D')
      WHEN 2 THEN COALESCE(c.produto, 'N/D')
      WHEN 3 THEN COALESCE(c.documento, 'N/D')
      ELSE COALESCE(c.categoria, 'N/D')
    END
  ORDER BY c.anomes;
END;
$function$;

-- 5) rpc_receita_total
CREATE OR REPLACE FUNCTION public.rpc_receita_total(
  p_anomes integer[] DEFAULT NULL::integer[],
  p_banker text[] DEFAULT NULL::text[],
  p_finder text[] DEFAULT NULL::text[]
)
RETURNS TABLE(receita numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
  v_caller uuid := auth.uid();
  v_tem_restricao boolean;
BEGIN
  v_tem_restricao := public.usuario_tem_restricao_receita(v_caller);

  RETURN QUERY
  SELECT COALESCE(SUM(c.comissao_bruta_tailor), 0)
  FROM public.mv_comissoes_consolidado_v2 c
  WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR c.banker = ANY(v_bf))
    AND (v_ff IS NULL OR c.finder = ANY(v_ff))
    AND NOT (
      c.categoria = 'Lavoro'
      AND COALESCE(c.banker, '') IN ('Sem Advisor', 'Sem Assessor', '')
      AND COALESCE(c.finder, '') IN ('Sem Finder', '', 'Priscilla Macedo')
    )
    AND (
      NOT v_tem_restricao
      OR EXISTS (
        SELECT 1 FROM public.pessoas_vinculadas_usuario(v_caller) pv
        WHERE
          (pv.tipo = 'FA' AND public.normalize_nome_pessoa(c.banker) = pv.valor_normalizado)
          OR (pv.tipo = 'FINDER' AND public.normalize_nome_pessoa(c.finder) = pv.valor_normalizado)
          OR (pv.tipo = 'ADVISOR' AND public.normalize_nome_pessoa(c.advisor) = pv.valor_normalizado)
      )
    );
END;
$function$;
