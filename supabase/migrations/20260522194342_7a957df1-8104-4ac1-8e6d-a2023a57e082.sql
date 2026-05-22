CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_kpis(p_anomes integer, p_banker text[] DEFAULT NULL::text[], p_finder text[] DEFAULT NULL::text[], p_advisor text[] DEFAULT NULL::text[], p_categoria text[] DEFAULT NULL::text[], p_subcategoria text[] DEFAULT NULL::text[], p_canal text[] DEFAULT NULL::text[], p_tipo_pessoa text[] DEFAULT NULL::text[])
 RETURNS TABLE(total_mes numeric, total_mes_anterior numeric, variacao_pct numeric, n_clientes_unicos integer, anomes_label text, anomes_anterior_label text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_ant integer;
  v_user_bankers text[];
  v_user_finders text[];
  v_caller uuid := auth.uid();
  v_tem_restricao boolean;
BEGIN
  IF (p_anomes % 100) = 1 THEN v_ant := ((p_anomes / 100) - 1) * 100 + 12;
  ELSE v_ant := p_anomes - 1; END IF;

  v_user_bankers := get_user_banker_filter();
  v_user_finders := get_user_finder_filter();
  v_tem_restricao := public.usuario_tem_restricao_receita(v_caller);

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

GRANT EXECUTE ON FUNCTION public.rpc_receita_caixa_kpis(integer, text[], text[], text[], text[], text[], text[], text[]) TO authenticated;