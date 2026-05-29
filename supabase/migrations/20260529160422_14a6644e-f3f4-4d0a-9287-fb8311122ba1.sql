-- Fix urgente: comissoes_consolidado_receita_corrigida lendo de staging vazia
-- Espelha o fix já feito em mv_comissoes_caixa_completa em 27/05
-- Substitui raw_comissoes_historico_staging -> raw_comissoes_historico (2 lugares)
--
-- ROLLBACK (viewdef anterior):
-- (RAMO 1 sub-select NOT IN) FROM raw_comissoes_historico_staging h
-- (RAMO 2 FROM)              FROM raw_comissoes_historico_staging r

CREATE OR REPLACE VIEW public.comissoes_consolidado_receita_corrigida AS
SELECT to_char(((r.data ->> 'Data'::text)::date)::timestamp with time zone, 'YYYYMM'::text)::integer AS anomes,
    fix_encoding(r.data ->> 'Categoria'::text) AS categoria,
    fix_encoding(r.data ->> 'Subcategoria'::text) AS subcategoria,
    fix_encoding(r.data ->> 'Produto'::text) AS produto,
    fix_encoding(r.data ->> 'Subproduto'::text) AS subproduto,
        CASE
            WHEN NULLIF(TRIM(BOTH FROM r.data ->> 'Banker'::text), ''::text) = ANY (ARRAY['Enrico Santos'::text, 'Nicholas Barbarisi'::text]) THEN 'Richard S'::text
            WHEN NULLIF(TRIM(BOTH FROM r.data ->> 'Banker'::text), ''::text) = 'Murilo Jacob'::text THEN 'Gustavo Faria'::text
            ELSE r.data ->> 'Banker'::text
        END AS banker,
    r.data ->> 'Advisor'::text AS advisor,
    r.data ->> 'Finder'::text AS finder,
    r.data ->> 'Canal'::text AS canal,
    r.data ->> 'Tipo de Cliente'::text AS tipo_cliente,
    COALESCE(NULLIF(TRIM(BOTH FROM r.data ->> 'Documento'::text), ''::text), NULLIF(TRIM(BOTH FROM r.data ->> 'Cliente'::text), ''::text)) AS documento,
    parse_num(COALESCE(r.data ->> 'Comissão Bruta Tailor'::text, r.data ->> 'ComissÃ£o Bruta Tailor'::text)) AS comissao_bruta_tailor,
    'm0'::text AS source_origin,
    r.id AS source_row_id
   FROM raw_comissoes_m0 r
  WHERE (r.data ->> 'Data'::text) IS NOT NULL AND (r.data ->> 'Categoria'::text) IS NOT NULL AND COALESCE(r.data ->> 'Banker'::text, ''::text) <> 'Lavoro'::text AND NOT (to_char(((r.data ->> 'Data'::text)::date)::timestamp with time zone, 'YYYYMM'::text)::integer IN ( SELECT DISTINCT to_char(((h.data ->> 'Data'::text)::date)::timestamp with time zone, 'YYYYMM'::text)::integer AS to_char
           FROM raw_comissoes_historico h
          WHERE (h.data ->> 'Data'::text) IS NOT NULL))
UNION ALL
 SELECT to_char(((r.data ->> 'Data'::text)::date)::timestamp with time zone, 'YYYYMM'::text)::integer AS anomes,
    fix_encoding(r.data ->> 'Categoria'::text) AS categoria,
    fix_encoding(r.data ->> 'Subcategoria'::text) AS subcategoria,
    fix_encoding(r.data ->> 'Produto'::text) AS produto,
    fix_encoding(r.data ->> 'Subproduto'::text) AS subproduto,
        CASE
            WHEN NULLIF(TRIM(BOTH FROM r.data ->> 'Banker'::text), ''::text) = ANY (ARRAY['Enrico Santos'::text, 'Nicholas Barbarisi'::text]) THEN 'Richard S'::text
            WHEN NULLIF(TRIM(BOTH FROM r.data ->> 'Banker'::text), ''::text) = 'Murilo Jacob'::text THEN 'Gustavo Faria'::text
            ELSE r.data ->> 'Banker'::text
        END AS banker,
    r.data ->> 'Advisor'::text AS advisor,
    r.data ->> 'Finder'::text AS finder,
    r.data ->> 'Canal'::text AS canal,
    r.data ->> 'Tipo de Cliente'::text AS tipo_cliente,
    COALESCE(NULLIF(TRIM(BOTH FROM r.data ->> 'Documento'::text), ''::text), NULLIF(TRIM(BOTH FROM r.data ->> 'Cliente'::text), ''::text)) AS documento,
    parse_num(COALESCE(r.data ->> 'Comissão Bruta Tailor'::text, r.data ->> 'ComissÃ£o Bruta Tailor'::text)) AS comissao_bruta_tailor,
    'historico'::text AS source_origin,
    r.id AS source_row_id
   FROM raw_comissoes_historico r
  WHERE (r.data ->> 'Data'::text) IS NOT NULL AND (r.data ->> 'Categoria'::text) IS NOT NULL AND COALESCE(r.data ->> 'Banker'::text, ''::text) <> 'Lavoro'::text;