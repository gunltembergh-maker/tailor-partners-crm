
-- vw_diversificador_consolidado: normalizar Conta
CREATE OR REPLACE VIEW public.vw_diversificador_consolidado AS
SELECT
  id,
  split_part(data->>'Conta', ' ', 1) AS conta,
  data->>'Nome' AS nome,
  data->>'Assessor' AS assessor,
  data->>'Classe' AS classe,
  data->>'Subclasse' AS subclasse,
  (data->>'Valor')::numeric AS valor,
  (data->>'Percentual')::numeric AS percentual,
  data,
  ingested_at
FROM public.raw_diversificador_consolidado;

-- vw_positivador_total_agrupado: PL_Declarado_Ajustado
CREATE OR REPLACE VIEW public.vw_positivador_total_agrupado AS
SELECT
  id,
  data->>'Conta' AS conta,
  data->>'Nome' AS nome,
  data->>'Assessor' AS assessor,
  (data->>'PL_Declarado')::numeric AS pl_declarado,
  (data->>'Net_Em_M')::numeric AS net_em_m,
  GREATEST(
    COALESCE((data->>'PL_Declarado')::numeric, 0),
    COALESCE((data->>'Net_Em_M')::numeric, 0)
  ) AS pl_declarado_ajustado,
  data,
  ingested_at
FROM public.raw_positivador_total_agrupado;

-- vw_base_crm: SoW ajustado, PL Declarado Ajustado, 1o nome, endereço, join saldo
CREATE OR REPLACE VIEW public.vw_base_crm AS
SELECT
  crm.id,
  crm.data->>'Cód do Cliente' AS codigo_cliente,
  crm.data->>'Nome Cliente' AS nome_cliente,
  split_part(COALESCE(crm.data->>'Nome Cliente', ''), ' ', 1) AS primeiro_nome,
  crm.data->>'Assessor' AS assessor,
  (crm.data->>'PL Tailor')::numeric AS pl_tailor,
  (crm.data->>'PL Declarado')::numeric AS pl_declarado_raw,
  GREATEST(
    COALESCE((crm.data->>'PL Tailor')::numeric, 0),
    COALESCE((crm.data->>'PL Declarado')::numeric, 0)
  ) AS pl_declarado_ajustado,
  COALESCE((crm.data->>'SoW')::numeric, 0) AS sow,
  CASE
    WHEN GREATEST(
      COALESCE((crm.data->>'PL Tailor')::numeric, 0),
      COALESCE((crm.data->>'PL Declarado')::numeric, 0)
    ) > 0
    THEN ROUND(
      COALESCE((crm.data->>'PL Tailor')::numeric, 0) * 100.0 /
      GREATEST(
        COALESCE((crm.data->>'PL Tailor')::numeric, 0),
        COALESCE((crm.data->>'PL Declarado')::numeric, 0)
      ), 2
    )
    ELSE 0
  END AS sow_ajustado,
  crm.data->>'Perfil' AS perfil,
  crm.data->>'Setor' AS setor,
  crm.data->>'Cidade' AS cidade,
  crm.data->>'Estado' AS estado,
  COALESCE(
    NULLIF(crm.data->>'Endereço', ''),
    CONCAT_WS(', ',
      NULLIF(crm.data->>'Cidade', ''),
      NULLIF(crm.data->>'Estado', '')
    )
  ) AS endereco_ajustado,
  crm.data->>'Banker' AS banker,
  crm.data->>'Finder' AS finder,
  crm.data->>'Canal' AS canal,
  crm.data->>'TAG' AS tag,
  (saldo.data->>'Saldo')::numeric AS saldo_consolidado,
  crm.data AS data_crm,
  saldo.data AS data_saldo,
  crm.ingested_at
FROM public.raw_base_crm crm
LEFT JOIN public.raw_saldo_consolidado saldo
  ON crm.data->>'Cód do Cliente' = saldo.data->>'Conta';
