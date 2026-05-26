
DROP MATERIALIZED VIEW IF EXISTS public.mv_comissoes_caixa_completa CASCADE;

CREATE MATERIALIZED VIEW public.mv_comissoes_caixa_completa AS
 WITH base AS (
         SELECT to_char(((r.data ->> 'Data'::text)::date)::timestamp with time zone, 'YYYYMM'::text)::integer AS anomes,
            fix_encoding(r.data ->> 'Categoria'::text) AS categoria,
            fix_encoding(r.data ->> 'Subcategoria'::text) AS subcategoria,
            fix_encoding(r.data ->> 'Produto'::text) AS produto,
            fix_encoding(r.data ->> 'Subproduto'::text) AS subproduto,
            fix_encoding(btrim(r.data ->> 'Banker'::text)) AS banker_raw,
            fix_encoding(btrim(r.data ->> 'Advisor'::text)) AS advisor_raw,
            fix_encoding(btrim(r.data ->> 'Finder'::text)) AS finder_raw,
            fix_encoding(btrim(r.data ->> 'Canal'::text)) AS canal_raw,
            r.data ->> 'Tipo de Cliente'::text AS tipo_cliente,
            COALESCE(NULLIF(TRIM(BOTH FROM r.data ->> 'Documento'::text), ''::text), NULLIF(TRIM(BOTH FROM r.data ->> 'Cliente'::text), ''::text)) AS documento,
            parse_num(COALESCE(r.data ->> 'Comissão Bruta Tailor'::text, r.data ->> 'ComissÃ£o Bruta Tailor'::text)) AS comissao_bruta_tailor,
            'm0'::text AS source_origin,
            r.id AS source_row_id
           FROM raw_comissoes_m0 r
          WHERE (r.data ->> 'Data'::text) IS NOT NULL AND (r.data ->> 'Categoria'::text) IS NOT NULL AND NOT (to_char(((r.data ->> 'Data'::text)::date)::timestamp with time zone, 'YYYYMM'::text)::integer IN ( SELECT DISTINCT to_char(((h.data ->> 'Data'::text)::date)::timestamp with time zone, 'YYYYMM'::text)::integer AS to_char
                   FROM raw_comissoes_historico h
                  WHERE (h.data ->> 'Data'::text) IS NOT NULL))
        UNION ALL
         SELECT to_char(((r.data ->> 'Data'::text)::date)::timestamp with time zone, 'YYYYMM'::text)::integer AS anomes,
            fix_encoding(r.data ->> 'Categoria'::text) AS categoria,
            fix_encoding(r.data ->> 'Subcategoria'::text) AS subcategoria,
            fix_encoding(r.data ->> 'Produto'::text) AS produto,
            fix_encoding(r.data ->> 'Subproduto'::text) AS subproduto,
            fix_encoding(btrim(r.data ->> 'Banker'::text)) AS banker_raw,
            fix_encoding(btrim(r.data ->> 'Advisor'::text)) AS advisor_raw,
            fix_encoding(btrim(r.data ->> 'Finder'::text)) AS finder_raw,
            fix_encoding(btrim(r.data ->> 'Canal'::text)) AS canal_raw,
            r.data ->> 'Tipo de Cliente'::text AS tipo_cliente,
            COALESCE(NULLIF(TRIM(BOTH FROM r.data ->> 'Documento'::text), ''::text), NULLIF(TRIM(BOTH FROM r.data ->> 'Cliente'::text), ''::text)) AS documento,
            parse_num(COALESCE(r.data ->> 'Comissão Bruta Tailor'::text, r.data ->> 'ComissÃ£o Bruta Tailor'::text)) AS comissao_bruta_tailor,
            'historico'::text AS source_origin,
            r.id AS source_row_id
           FROM raw_comissoes_historico r
          WHERE (r.data ->> 'Data'::text) IS NOT NULL AND (r.data ->> 'Categoria'::text) IS NOT NULL
        ), desligados_set AS (
         SELECT DISTINCT view_desligados.nome_normalizado
           FROM view_desligados
        )
 SELECT b.anomes,
    b.categoria,
    b.subcategoria,
    b.produto,
    b.subproduto,
        CASE
            WHEN b.banker_raw IS NULL OR b.banker_raw = ''::text THEN 'Sem Advisor'::text
            WHEN d_banker.nome_normalizado IS NOT NULL THEN 'Legado'::text
            WHEN b.banker_raw = ANY (ARRAY['Enrico Santos'::text, 'Nicholas Barbarisi'::text]) THEN 'Richard S'::text
            WHEN b.banker_raw = 'Murilo Jacob'::text THEN 'Gustavo Faria'::text
            WHEN b.banker_raw = 'Sem Assessor'::text THEN 'Sem Advisor'::text
            ELSE b.banker_raw
        END AS banker,
        CASE
            WHEN b.advisor_raw IS NULL OR b.advisor_raw = ''::text THEN 'Sem Advisor'::text
            WHEN d_advisor.nome_normalizado IS NOT NULL THEN 'Legado'::text
            WHEN b.advisor_raw = 'Matheus C'::text THEN 'Matheus Castro'::text
            ELSE normalize_advisor(b.advisor_raw)
        END AS advisor,
        CASE
            WHEN b.finder_raw IS NULL OR b.finder_raw = ''::text THEN 'Sem Finder'::text
            WHEN d_finder.nome_normalizado IS NOT NULL THEN 'Legado'::text
            ELSE normalize_finder(b.finder_raw)
        END AS finder,
        CASE
            WHEN b.canal_raw IS NULL OR b.canal_raw = ''::text THEN 'Sem Canal'::text
            WHEN d_canal.nome_normalizado IS NOT NULL THEN 'Legado'::text
            ELSE normalize_canal(b.canal_raw)
        END AS canal,
    b.tipo_cliente,
    b.documento,
    b.comissao_bruta_tailor,
    b.source_origin,
    b.source_row_id
   FROM base b
     LEFT JOIN desligados_set d_banker ON lower(b.banker_raw) = d_banker.nome_normalizado
     LEFT JOIN desligados_set d_advisor ON lower(b.advisor_raw) = d_advisor.nome_normalizado
     LEFT JOIN desligados_set d_finder ON lower(b.finder_raw) = d_finder.nome_normalizado
     LEFT JOIN desligados_set d_canal ON lower(b.canal_raw) = d_canal.nome_normalizado
WITH NO DATA;

CREATE INDEX idx_mv_caixa_anomes_advisor ON public.mv_comissoes_caixa_completa USING btree (anomes, advisor);
CREATE INDEX idx_mv_caixa_anomes_banker ON public.mv_comissoes_caixa_completa USING btree (anomes, banker);
CREATE INDEX idx_mv_caixa_anomes_canal ON public.mv_comissoes_caixa_completa USING btree (anomes, canal);
CREATE INDEX idx_mv_caixa_anomes_categoria ON public.mv_comissoes_caixa_completa USING btree (anomes, categoria);
CREATE INDEX idx_mv_caixa_anomes_finder ON public.mv_comissoes_caixa_completa USING btree (anomes, finder);
CREATE INDEX idx_mv_caixa_documento ON public.mv_comissoes_caixa_completa USING btree (documento);

GRANT ALL ON public.mv_comissoes_caixa_completa TO anon;
GRANT ALL ON public.mv_comissoes_caixa_completa TO authenticated;
GRANT ALL ON public.mv_comissoes_caixa_completa TO service_role;

CREATE OR REPLACE VIEW public.vw_comissoes_caixa_completa AS
SELECT anomes, categoria, subcategoria, produto, subproduto, banker, advisor, finder, canal,
       tipo_cliente, documento, comissao_bruta_tailor, source_origin, source_row_id
  FROM public.mv_comissoes_caixa_completa;

GRANT ALL ON public.vw_comissoes_caixa_completa TO anon;
GRANT ALL ON public.vw_comissoes_caixa_completa TO authenticated;
GRANT ALL ON public.vw_comissoes_caixa_completa TO service_role;
