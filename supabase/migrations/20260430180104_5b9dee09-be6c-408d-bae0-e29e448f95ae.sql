CREATE OR REPLACE FUNCTION public.rpc_saldo_filtros_advisors()
RETURNS TABLE(advisor text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT advisor FROM (
    SELECT DISTINCT advisor
    FROM vw_saldo_desagrupado
    WHERE advisor IS NOT NULL AND advisor <> ''
  ) s
  ORDER BY
    CASE WHEN advisor IN ('Sem Advisor', 'Legado') THEN 1 ELSE 0 END,
    advisor;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_saldo_filtros_advisors() TO authenticated;