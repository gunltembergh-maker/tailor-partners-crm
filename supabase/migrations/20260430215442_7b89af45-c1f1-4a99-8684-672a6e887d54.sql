-- Adiciona parâmetro p_tipo_pessoa (PF/PJ) em rpc_saldo_list e rpc_saldo_kpis

CREATE OR REPLACE FUNCTION public.rpc_saldo_kpis(
  p_banker text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_documento text[] DEFAULT NULL,
  p_casa text[] DEFAULT NULL,
  p_data_referencia date DEFAULT NULL,
  p_tipo_pessoa text[] DEFAULT NULL
)
RETURNS TABLE(total_d0 numeric, total_d_mais_1 numeric, total_d_mais_2 numeric, total_d_mais_3 numeric, total_geral numeric, qtd_clientes bigint, qtd_contas bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '30s'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
  v_cf text[] := COALESCE(get_user_canal_filter(), NULL);
  v_df text[] := COALESCE(get_user_documento_filter(), p_documento);
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(s.d0), 0)             AS total_d0,
    COALESCE(SUM(s.d_mais_1), 0)       AS total_d_mais_1,
    COALESCE(SUM(s.d_mais_2), 0)       AS total_d_mais_2,
    COALESCE(SUM(s.d_mais_3), 0)       AS total_d_mais_3,
    COALESCE(SUM(s.total_saldo), 0)    AS total_geral,
    COUNT(DISTINCT s.cpf_cnpj)         AS qtd_clientes,
    COUNT(DISTINCT s.casa || '|' || COALESCE(s.conta, s.cpf_cnpj)) AS qtd_contas
  FROM public.vw_saldo_consolidado s
  WHERE (v_bf IS NULL OR s.banker = ANY(v_bf))
    AND (v_af IS NULL OR s.advisor = ANY(v_af))
    AND (v_ff IS NULL OR s.finder = ANY(v_ff))
    AND (v_cf IS NULL OR s.canal = ANY(v_cf))
    AND (v_df IS NULL OR s.cpf_cnpj = ANY(v_df) OR s.documento_formatado = ANY(v_df))
    AND (p_casa IS NULL OR s.casa = ANY(p_casa))
    AND (p_data_referencia IS NULL OR s.data_referencia = p_data_referencia)
    AND (
      p_tipo_pessoa IS NULL OR (
        ('PF' = ANY(p_tipo_pessoa) AND length(s.cpf_cnpj) = 11)
        OR
        ('PJ' = ANY(p_tipo_pessoa) AND length(s.cpf_cnpj) = 14)
      )
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_saldo_list(
  p_banker text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_documento text[] DEFAULT NULL,
  p_casa text[] DEFAULT NULL,
  p_data_referencia date DEFAULT NULL,
  p_busca text DEFAULT NULL,
  p_limit integer DEFAULT NULL,
  p_offset integer DEFAULT NULL,
  p_tipo_pessoa text[] DEFAULT NULL
)
RETURNS TABLE(documento_formatado text, cpf_cnpj text, cliente_nome text, tipo_cliente text, casa text, conta text, produto text, data_referencia date, d0 numeric, d_mais_1 numeric, d_mais_2 numeric, d_mais_3 numeric, total_saldo numeric, banker text, advisor text, finder text, canal text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '30s'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
  v_cf text[] := COALESCE(get_user_canal_filter(), NULL);
  v_df text[] := COALESCE(get_user_documento_filter(), p_documento);
  v_busca text := NULLIF(TRIM(p_busca), '');
BEGIN
  RETURN QUERY
  SELECT
    s.documento_formatado, s.cpf_cnpj, s.cliente_nome, s.tipo_cliente,
    s.casa, s.conta, s.produto, s.data_referencia,
    s.d0, s.d_mais_1, s.d_mais_2, s.d_mais_3, s.total_saldo,
    s.banker, s.advisor, s.finder, s.canal
  FROM public.vw_saldo_consolidado s
  WHERE (v_bf IS NULL OR s.banker = ANY(v_bf))
    AND (v_af IS NULL OR s.advisor = ANY(v_af))
    AND (v_ff IS NULL OR s.finder = ANY(v_ff))
    AND (v_cf IS NULL OR s.canal = ANY(v_cf))
    AND (v_df IS NULL OR s.cpf_cnpj = ANY(v_df) OR s.documento_formatado = ANY(v_df))
    AND (p_casa IS NULL OR s.casa = ANY(p_casa))
    AND (p_data_referencia IS NULL OR s.data_referencia = p_data_referencia)
    AND (
      p_tipo_pessoa IS NULL OR (
        ('PF' = ANY(p_tipo_pessoa) AND length(s.cpf_cnpj) = 11)
        OR
        ('PJ' = ANY(p_tipo_pessoa) AND length(s.cpf_cnpj) = 14)
      )
    )
    AND (
      v_busca IS NULL
      OR unaccent(LOWER(s.cliente_nome)) LIKE '%' || unaccent(LOWER(v_busca)) || '%'
      OR s.cpf_cnpj LIKE '%' || REGEXP_REPLACE(v_busca, '[^0-9]', '', 'g') || '%'
      OR s.documento_formatado LIKE '%' || v_busca || '%'
      OR s.conta LIKE '%' || v_busca || '%'
    )
  ORDER BY s.total_saldo DESC, s.cliente_nome ASC
  LIMIT COALESCE(p_limit, NULL)
  OFFSET COALESCE(p_offset, 0);
END;
$function$;