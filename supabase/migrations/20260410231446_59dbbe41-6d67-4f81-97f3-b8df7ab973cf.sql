
-- ════════════════════════════════════════════════════════════════════
-- Control functions for 2-layer sync architecture
-- ════════════════════════════════════════════════════════════════════

-- Check if today is within the first 10 business days of the month
CREATE OR REPLACE FUNCTION public.fn_dentro_periodo_m1()
RETURNS boolean
LANGUAGE sql STABLE
AS $func$
  SELECT (
    SELECT COUNT(*) FROM (
      SELECT generate_series(
        date_trunc('month', CURRENT_DATE)::date,
        CURRENT_DATE,
        '1 day'::interval
      )::date AS dia
    ) dias
    WHERE EXTRACT(DOW FROM dia) NOT IN (0, 6)
  ) <= 10;
$func$;

-- Return AnoMes for M-1 (previous month)
CREATE OR REPLACE FUNCTION public.fn_anomes_m1()
RETURNS integer LANGUAGE sql STABLE AS $func$
  SELECT to_char(date_trunc('month', CURRENT_DATE) - interval '1 month', 'YYYYMM')::integer;
$func$;

-- Return AnoMes for M0 (current month)
CREATE OR REPLACE FUNCTION public.fn_anomes_m0()
RETURNS integer LANGUAGE sql STABLE AS $func$
  SELECT to_char(date_trunc('month', CURRENT_DATE), 'YYYYMM')::integer;
$func$;

GRANT EXECUTE ON FUNCTION public.fn_dentro_periodo_m1() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_anomes_m1() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_anomes_m0() TO authenticated;

-- ════════════════════════════════════════════════════════════════════
-- Safe deletion RPCs for sync operations
-- ════════════════════════════════════════════════════════════════════

-- Delete a specific month from historico
CREATE OR REPLACE FUNCTION public.rpc_deletar_anomes_historico(p_anomes integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout = '300s'
AS $func$
BEGIN
  DELETE FROM raw_comissoes_historico
  WHERE to_char((data->>'Data')::date,'YYYYMM')::int = p_anomes;
END;
$func$;

-- Delete a list of months from historico (for safe monthly sync)
CREATE OR REPLACE FUNCTION public.rpc_deletar_anomes_lista_historico(p_anomes_list integer[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout = '300s'
AS $func$
BEGIN
  DELETE FROM raw_comissoes_historico
  WHERE to_char((data->>'Data')::date,'YYYYMM')::int = ANY(p_anomes_list);
END;
$func$;

GRANT EXECUTE ON FUNCTION public.rpc_deletar_anomes_historico(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_deletar_anomes_lista_historico(integer[]) TO service_role;

-- ════════════════════════════════════════════════════════════════════
-- Updated view: simple UNION ALL between M0 and historico
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.comissoes_consolidado_filtrado AS
-- M0: current month
SELECT
  to_char((data->>'Data')::date,'YYYYMM')::int AS anomes,
  fix_encoding(data->>'Categoria') AS categoria,
  fix_encoding(data->>'Subcategoria') AS subcategoria,
  fix_encoding(data->>'Produto') AS produto,
  fix_encoding(data->>'Subproduto') AS subproduto,
  CASE 
    WHEN NULLIF(TRIM(data->>'Banker'),'') = ANY(ARRAY['Enrico Santos','Nicholas Barbarisi']) THEN 'Richard S'
    WHEN NULLIF(TRIM(data->>'Banker'),'') = 'Murilo Jacob' THEN 'Gustavo Faria'
    ELSE data->>'Banker'
  END AS banker,
  data->>'Advisor' AS advisor,
  data->>'Finder' AS finder,
  data->>'Canal' AS canal,
  data->>'Tipo de Cliente' AS tipo_cliente,
  COALESCE(NULLIF(TRIM(data->>'Documento'),''), NULLIF(TRIM(data->>'Cliente'),'')) AS documento,
  parse_num_any(COALESCE(data->>'Comissão Bruta Tailor', data->>'ComissÃ£o Bruta Tailor')) AS comissao_bruta_tailor
FROM raw_comissoes_m0
WHERE (data->>'Data') IS NOT NULL
  AND (data->>'Categoria') IS NOT NULL
  AND COALESCE(data->>'Banker','') <> 'Lavoro'

UNION ALL

-- HISTORICO: everything up to M-1
SELECT
  to_char((data->>'Data')::date,'YYYYMM')::int AS anomes,
  fix_encoding(data->>'Categoria') AS categoria,
  fix_encoding(data->>'Subcategoria') AS subcategoria,
  fix_encoding(data->>'Produto') AS produto,
  fix_encoding(data->>'Subproduto') AS subproduto,
  CASE 
    WHEN NULLIF(TRIM(data->>'Banker'),'') = ANY(ARRAY['Enrico Santos','Nicholas Barbarisi']) THEN 'Richard S'
    WHEN NULLIF(TRIM(data->>'Banker'),'') = 'Murilo Jacob' THEN 'Gustavo Faria'
    ELSE data->>'Banker'
  END AS banker,
  data->>'Advisor' AS advisor,
  data->>'Finder' AS finder,
  data->>'Canal' AS canal,
  data->>'Tipo de Cliente' AS tipo_cliente,
  COALESCE(NULLIF(TRIM(data->>'Documento'),''), NULLIF(TRIM(data->>'Cliente'),'')) AS documento,
  parse_num_any(COALESCE(data->>'Comissão Bruta Tailor', data->>'ComissÃ£o Bruta Tailor')) AS comissao_bruta_tailor
FROM raw_comissoes_historico
WHERE (data->>'Data') IS NOT NULL
  AND (data->>'Categoria') IS NOT NULL
  AND COALESCE(data->>'Banker','') <> 'Lavoro';

NOTIFY pgrst, 'reload schema';
