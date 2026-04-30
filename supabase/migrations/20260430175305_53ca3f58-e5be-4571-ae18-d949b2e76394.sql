
CREATE OR REPLACE VIEW public.vw_saldo_desagrupado AS
WITH parsed AS (
  SELECT r.id AS id_raw,
    r.ingested_at,
    (r.data ->> '_id_carga')::uuid AS id_carga,
    (r.data ->> '_data_referencia')::date AS data_referencia,
    upper(r.data ->> 'Casa') AS casa,
    r.data ->> 'Conta' AS conta,
    r.data ->> 'Documento' AS documento_formatado,
    regexp_replace(COALESCE(r.data ->> 'Documento', ''), '[^0-9]', '', 'g') AS cpf_cnpj,
    r.data ->> 'Cliente' AS cliente_nome_original,
    initcap(COALESCE(r.data ->> 'Cliente', '')) AS cliente_nome,
    initcap(
      CASE WHEN POSITION(' ' IN COALESCE(r.data ->> 'Cliente','')) > 0
           THEN split_part(r.data ->> 'Cliente', ' ', 1)
           ELSE COALESCE(r.data ->> 'Cliente','') END) AS primeiro_nome,
    r.data ->> 'Produto' AS produto,
    COALESCE(NULLIF(r.data ->> 'D0','')::numeric, 0) AS d0,
    COALESCE(NULLIF(r.data ->> 'D1','')::numeric, 0) AS d_mais_1,
    COALESCE(NULLIF(r.data ->> 'D2','')::numeric, 0) AS d_mais_2,
    COALESCE(NULLIF(r.data ->> 'D3','')::numeric, 0) AS d_mais_3,
    COALESCE(NULLIF(r.data ->> 'Total','')::numeric, 0) AS total_saldo,
    r.data ->> 'Banker' AS banker_raw,
    r.data ->> 'Advisor' AS advisor_raw,
    r.data ->> 'Finder' AS finder_raw,
    r.data ->> 'Canal' AS canal_raw,
    r.data ->> 'Tipo de Cliente' AS tipo_cliente,
    r.data ->> 'Assessor' AS cod_assessor,
    r.data ->> 'Código' AS code_avenue
  FROM raw_saldo_consolidado r
  WHERE NOT (COALESCE(r.data ->> 'Conta','') = '' 
             AND COALESCE(regexp_replace(COALESCE(r.data ->> 'Documento',''),'[^0-9]','','g'),'') = ''
             AND COALESCE(r.data ->> 'Cliente','') = '')
), depara_normalizado AS (
  SELECT
    CASE upper(bc.data ->> 'Casa')
      WHEN 'CLIENTE XP' THEN 'XP'
      WHEN 'CLIENTE AVENUE' THEN 'AVENUE'
      WHEN 'CLIENTE CÂMBIO' THEN 'CAMBIO'
      WHEN 'CLIENTE GESTORA' THEN 'GESTORA'
      WHEN 'CORPORATE E/OU SEGUROS' THEN 'CORPORATE'
      WHEN 'CLIENTE LAVORO' THEN 'LAVORO'
      ELSE upper(bc.data ->> 'Casa')
    END AS casa_norm,
    bc.data ->> 'Conta' AS conta,
    regexp_replace(COALESCE(bc.data ->> 'Documento',''),'[^0-9]','','g') AS cpf,
    bc.data ->> 'Banker' AS banker,
    bc.data ->> 'Advisor' AS advisor,
    bc.data ->> 'Finder' AS finder,
    bc.data ->> 'Canal' AS canal
  FROM raw_base_consolidada bc
), lookup_casa_conta AS (
  SELECT casa_norm, conta, banker, advisor, finder, canal
  FROM depara_normalizado
  WHERE conta IS NOT NULL AND conta <> ''
), lookup_casa_cpf AS (
  SELECT casa_norm, cpf, banker, advisor, finder, canal
  FROM depara_normalizado
  WHERE cpf <> ''
), lookup_cpf_qualquer AS (
  SELECT cpf,
    (array_agg(banker))[1] AS banker,
    (array_agg(advisor))[1] AS advisor,
    (array_agg(finder))[1] AS finder,
    (array_agg(canal))[1] AS canal
  FROM depara_normalizado
  WHERE cpf <> ''
  GROUP BY cpf
),
-- Lookup do Advisor ESTRITAMENTE por (casa + documento) na Base Consolidada
-- Prioriza nome real; se a casa só tiver "Legado" usa Legado; senão "Sem Advisor"
lookup_advisor_casa_doc AS (
  SELECT casa_norm, cpf,
    COALESCE(
      (array_agg(advisor) FILTER (
        WHERE advisor IS NOT NULL
          AND btrim(advisor) <> ''
          AND lower(btrim(advisor)) NOT IN ('sem advisor','legado','-','n/a','na','null')
      ))[1],
      (array_agg(advisor) FILTER (WHERE lower(btrim(COALESCE(advisor,''))) = 'legado'))[1],
      (array_agg(advisor))[1]
    ) AS advisor
  FROM depara_normalizado
  WHERE cpf <> ''
  GROUP BY casa_norm, cpf
), enriquecido AS (
  SELECT p.*,
    l1.banker AS banker_1, l1.advisor AS advisor_1, l1.finder AS finder_1, l1.canal AS canal_1,
    l2.banker AS banker_2, l2.advisor AS advisor_2, l2.finder AS finder_2, l2.canal AS canal_2,
    l3.banker AS banker_3, l3.advisor AS advisor_3, l3.finder AS finder_3, l3.canal AS canal_3,
    la.advisor AS advisor_casa_doc
  FROM parsed p
  LEFT JOIN lookup_casa_conta l1 
    ON l1.casa_norm = p.casa AND l1.conta = p.conta AND p.conta IS NOT NULL AND p.conta <> ''
  LEFT JOIN lookup_casa_cpf l2 
    ON l2.casa_norm = p.casa AND l2.cpf = p.cpf_cnpj AND p.cpf_cnpj <> ''
  LEFT JOIN lookup_cpf_qualquer l3 
    ON l3.cpf = p.cpf_cnpj AND p.cpf_cnpj <> ''
  LEFT JOIN lookup_advisor_casa_doc la 
    ON la.casa_norm = p.casa AND la.cpf = p.cpf_cnpj AND p.cpf_cnpj <> ''
), classificado AS (
  SELECT e.id_raw, e.ingested_at, e.id_carga, e.data_referencia, e.casa, e.conta,
    e.documento_formatado, e.cpf_cnpj, e.cliente_nome_original, e.cliente_nome, e.primeiro_nome,
    e.produto, e.d0, e.d_mais_1, e.d_mais_2, e.d_mais_3, e.total_saldo,
    normalize_banker(COALESCE(e.banker_1, e.banker_2, e.banker_3, e.banker_raw)) AS banker,
    -- Advisor: SOMENTE lookup por (casa+documento) na Base Consolidada; sem cross-house
    normalize_advisor(COALESCE(e.advisor_casa_doc, e.advisor_raw)) AS advisor,
    COALESCE(e.finder_1, e.finder_2, e.finder_3, e.finder_raw, 'Sem Finder') AS finder,
    COALESCE(e.canal_1, e.canal_2, e.canal_3, e.canal_raw, 'Sem Canal') AS canal,
    e.tipo_cliente, e.cod_assessor, e.code_avenue,
    row_number() OVER (
      PARTITION BY e.casa, COALESCE(e.conta,''), COALESCE(e.cpf_cnpj,''), COALESCE(e.produto,'')
      ORDER BY e.data_referencia DESC, e.ingested_at DESC, e.id_raw DESC
    ) AS rn_mais_recente
  FROM enriquecido e
)
SELECT id_raw, id_carga, data_referencia, ingested_at, conta, documento_formatado, cpf_cnpj,
  cliente_nome_original, cliente_nome, primeiro_nome, tipo_cliente, casa, produto,
  d0, d_mais_1, d_mais_2, d_mais_3, total_saldo, banker, advisor, finder, canal,
  cod_assessor, code_avenue
FROM classificado
WHERE rn_mais_recente = 1;
