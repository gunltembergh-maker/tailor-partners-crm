CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_por_papel(
  p_papel text,
  p_anomes integer,
  p_banker text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_categoria text[] DEFAULT NULL,
  p_subcategoria text[] DEFAULT NULL,
  p_canal text[] DEFAULT NULL,
  p_tipo_pessoa text[] DEFAULT NULL
)
RETURNS TABLE(papel_nome text, categoria text, total numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_user_bankers text[];
  v_user_finders text[];
BEGIN
  v_user_bankers := get_user_banker_filter();
  v_user_finders := get_user_finder_filter();

  IF p_papel = 'BANKER' THEN
    RETURN QUERY
    SELECT 
      COALESCE(v.banker, '(sem banker)')::text AS papel_nome,
      v.categoria::text,
      ROUND(SUM(v.comissao_bruta_tailor)::numeric, 2) AS total
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
    GROUP BY v.banker, v.categoria;
  ELSIF p_papel = 'FINDER' THEN
    RETURN QUERY
    SELECT 
      COALESCE(v.finder, '(sem finder)')::text AS papel_nome,
      v.categoria::text,
      ROUND(SUM(v.comissao_bruta_tailor)::numeric, 2) AS total
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
    GROUP BY v.finder, v.categoria;
  ELSIF p_papel = 'CANAL' THEN
    RETURN QUERY
    SELECT 
      COALESCE(v.canal, '(sem canal)')::text AS papel_nome,
      v.categoria::text,
      ROUND(SUM(v.comissao_bruta_tailor)::numeric, 2) AS total
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
    GROUP BY v.canal, v.categoria;
  ELSE
    RAISE EXCEPTION 'p_papel deve ser BANKER, FINDER ou CANAL';
  END IF;
END;
$function$;