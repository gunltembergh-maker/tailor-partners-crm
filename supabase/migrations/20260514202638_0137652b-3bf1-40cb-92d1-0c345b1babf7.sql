
-- Materialize the caixa view for performance (rpc was timing out)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_comissoes_caixa_completa AS
SELECT * FROM public.vw_comissoes_caixa_completa;

CREATE INDEX IF NOT EXISTS idx_mv_caixa_completa_anomes ON public.mv_comissoes_caixa_completa(anomes);
CREATE INDEX IF NOT EXISTS idx_mv_caixa_completa_banker ON public.mv_comissoes_caixa_completa(banker);
CREATE INDEX IF NOT EXISTS idx_mv_caixa_completa_finder ON public.mv_comissoes_caixa_completa(finder);
CREATE INDEX IF NOT EXISTS idx_mv_caixa_completa_categoria ON public.mv_comissoes_caixa_completa(categoria);
CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_caixa_completa_src ON public.mv_comissoes_caixa_completa(source_origin, source_row_id);

-- Repoint all rpc_receita_caixa_* to the materialized view
CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_por_categoria(p_anomes integer, p_banker text[] DEFAULT NULL, p_finder text[] DEFAULT NULL, p_categoria text[] DEFAULT NULL, p_subcategoria text[] DEFAULT NULL, p_advisor text[] DEFAULT NULL, p_tipo_pessoa text[] DEFAULT NULL)
RETURNS TABLE(categoria text, total numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT v.categoria, ROUND(SUM(v.comissao_bruta_tailor)::numeric,2) AS total
  FROM mv_comissoes_caixa_completa v
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

CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_serie_temporal(p_anomes integer, p_banker text[] DEFAULT NULL, p_finder text[] DEFAULT NULL, p_categoria text[] DEFAULT NULL, p_subcategoria text[] DEFAULT NULL, p_advisor text[] DEFAULT NULL, p_tipo_pessoa text[] DEFAULT NULL)
RETURNS TABLE(anomes integer, anomes_label text, categoria text, total numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
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
  FROM mv_comissoes_caixa_completa v
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

-- Repoint remaining caixa RPCs to the MV by replacing the FROM clause
DO $repoint$
DECLARE
  fn record;
  src text;
  newdef text;
BEGIN
  FOR fn IN
    SELECT p.oid, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public'
      AND p.proname IN ('rpc_receita_caixa_kpis','rpc_receita_caixa_por_subcategoria','rpc_receita_caixa_por_assessor','rpc_receita_caixa_advisor_xp','rpc_receita_caixa_filtros')
  LOOP
    src := pg_get_functiondef(fn.oid);
    newdef := replace(src, 'vw_comissoes_caixa_completa', 'mv_comissoes_caixa_completa');
    IF newdef <> src THEN
      EXECUTE newdef;
    END IF;
  END LOOP;
END $repoint$;
