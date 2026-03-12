
-- vw_captacao_total
CREATE OR REPLACE VIEW public.vw_captacao_total WITH (security_invoker = true) AS
SELECT
  id,
  (data->>'Data')::timestamptz AS data_mov,
  to_char((data->>'Data')::timestamptz, 'YYYYMM') AS ano_mes,
  data->>'Documento' AS documento,
  data->>'Banker' AS banker,
  data->>'Advisor' AS advisor,
  data->>'Finder' AS finder,
  data->>'Casa' AS casa,
  data->>'Canal' AS canal,
  data->>'Tipo de Cliente' AS tipo_cliente,
  data->>'Tipo de Captação' AS tipo_captacao,
  (data->>'Aporte')::numeric AS aporte,
  (data->>'Resgate')::numeric AS resgate,
  (data->>'Captação')::numeric AS captacao,
  ingested_at
FROM raw_captacao_total;

-- vw_contas_total
CREATE OR REPLACE VIEW public.vw_contas_total WITH (security_invoker = true) AS
SELECT
  id,
  (data->>'Data')::timestamptz AS data_mov,
  data->>'AnoMes' AS ano_mes,
  data->>'Tipo' AS tipo,
  data->>'Documento' AS documento,
  data->>'Conta' AS conta,
  data->>'Banker' AS banker,
  data->>'Advisor' AS advisor,
  data->>'Finder' AS finder,
  data->>'Canal' AS canal,
  data->>'Casa' AS casa,
  data->>'Tipo de Cliente' AS tipo_cliente,
  ingested_at
FROM raw_contas_total;

-- Drop and recreate vw_positivador_total_agrupado with additional fields
DROP VIEW IF EXISTS public.vw_positivador_total_agrupado;
CREATE OR REPLACE VIEW public.vw_positivador_total_agrupado WITH (security_invoker = true) AS
SELECT
  id,
  (data->>'Data Posição')::timestamptz AS data_posicao,
  data->>'AnoMes' AS ano_mes,
  data->>'Documento' AS documento,
  data->>'Conta' AS conta,
  data->>'Banker' AS banker,
  data->>'Advisor' AS advisor,
  data->>'Finder' AS finder,
  data->>'Canal' AS canal,
  data->>'Casa' AS casa,
  data->>'Tipo de Cliente' AS tipo_cliente,
  data->>'Faixa PL' AS faixa_pl,
  (data->>'Ordem PL')::int AS ordem_pl,
  (data->>'Net Em M')::numeric AS net_em_m,
  (data->>'PL Declarado')::numeric AS pl_declarado,
  data,
  ingested_at
FROM raw_positivador_total_agrupado;

-- Drop and recreate vw_diversificador_consolidado with additional fields
DROP VIEW IF EXISTS public.vw_diversificador_consolidado;
CREATE OR REPLACE VIEW public.vw_diversificador_consolidado WITH (security_invoker = true) AS
SELECT
  id,
  (data->>'Data Posição')::timestamptz AS data_posicao,
  data->>'Documento' AS documento,
  data->>'Conta' AS conta,
  data->>'Banker' AS banker,
  data->>'Advisor' AS advisor,
  data->>'Finder' AS finder,
  data->>'Casa' AS casa,
  data->>'Tipo de Cliente' AS tipo_cliente,
  data->>'Ativo Ajustado' AS ativo_ajustado,
  data->>'Produto Ajustado' AS produto_ajustado,
  data->>'Indexador' AS indexador,
  data->>'Vencimento' AS vencimento,
  (data->>'NET')::numeric AS net,
  data,
  ingested_at
FROM raw_diversificador_consolidado;

-- vw_receita_detalhada (UNION comissoes_historico + comissoes_m0)
CREATE OR REPLACE VIEW public.vw_receita_detalhada WITH (security_invoker = true) AS
SELECT
  id,
  'historico' AS fonte,
  (data->>'Data')::timestamptz AS data_mov,
  to_char((data->>'Data')::timestamptz, 'YYYYMM') AS mes_ano,
  data->>'Categoria' AS categoria,
  data->>'Produto' AS produto,
  data->>'Subproduto' AS subproduto,
  data->>'Subcategoria' AS subcategoria,
  (data->>'Comissão Bruta Tailor')::numeric AS comissao_bruta,
  data->>'Documento' AS documento,
  data->>'Cliente' AS cliente,
  data->>'Banker' AS banker,
  data->>'Advisor' AS advisor,
  data->>'Finder' AS finder,
  data->>'Canal' AS canal,
  data->>'Tipo de Cliente' AS tipo_cliente,
  ingested_at
FROM raw_comissoes_historico
UNION ALL
SELECT
  id,
  'm0' AS fonte,
  (data->>'Data')::timestamptz AS data_mov,
  to_char((data->>'Data')::timestamptz, 'YYYYMM') AS mes_ano,
  data->>'Categoria' AS categoria,
  data->>'Produto' AS produto,
  data->>'Subproduto' AS subproduto,
  data->>'Subcategoria' AS subcategoria,
  (data->>'Comissão Bruta Tailor')::numeric AS comissao_bruta,
  data->>'Documento' AS documento,
  data->>'Cliente' AS cliente,
  data->>'Banker' AS banker,
  data->>'Advisor' AS advisor,
  data->>'Finder' AS finder,
  data->>'Canal' AS canal,
  data->>'Tipo de Cliente' AS tipo_cliente,
  ingested_at
FROM raw_comissoes_m0;

-- vw_receita_mensal (aggregated by mes_ano)
CREATE OR REPLACE VIEW public.vw_receita_mensal WITH (security_invoker = true) AS
SELECT
  mes_ano,
  documento,
  banker,
  advisor,
  finder,
  canal,
  tipo_cliente,
  SUM(comissao_bruta) AS comissao_total,
  COUNT(*) AS qtd_registros
FROM public.vw_receita_detalhada
WHERE mes_ano IS NOT NULL
GROUP BY mes_ano, documento, banker, advisor, finder, canal, tipo_cliente;
