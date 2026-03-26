
CREATE OR REPLACE FUNCTION public.rpc_captacao_kpis(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_tipo_cliente text[] DEFAULT NULL
)
RETURNS TABLE(captacao_mtd numeric, captacao_ytd numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_bf  text[]  := COALESCE(get_user_banker_filter(),  p_banker);
  v_af  text[]  := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff  text[]  := COALESCE(get_user_finder_filter(),  p_finder);
  v_mtd integer := to_char(CURRENT_DATE, 'YYYYMM')::int;
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(captacao) FILTER (
      WHERE CASE
        WHEN p_anomes IS NOT NULL THEN anomes = ANY(p_anomes)
        ELSE anomes = v_mtd
      END
    ), 0),

    COALESCE(SUM(captacao) FILTER (
      WHERE CASE
        WHEN p_anomes IS NOT NULL THEN anomes = ANY(p_anomes)
        ELSE true
      END
    ), 0)

  FROM cap_captacao_total
  WHERE (v_bf IS NULL OR banker = ANY(v_bf))
    AND (p_documento IS NULL OR documento = ANY(p_documento))
    AND (v_af IS NULL OR advisor = ANY(v_af))
    AND (v_ff IS NULL OR finder = ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR tipo_cliente = ANY(p_tipo_cliente));
END;
$function$;
