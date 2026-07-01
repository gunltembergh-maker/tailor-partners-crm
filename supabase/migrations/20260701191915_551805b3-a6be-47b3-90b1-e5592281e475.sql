CREATE OR REPLACE VIEW public.vw_lavoro_receita_competencia AS
SELECT
  tomador, segurado, documento, ramo, tipo_de_ramo, seguradora,
  data_emissao, comissao_bruta, data_pagamento,
  EXTRACT(YEAR FROM data_emissao)::int AS ano,
  EXTRACT(MONTH FROM data_emissao)::int AS mes,
  status_parcela_comissao
FROM public.vw_lavoro_gerencial
WHERE data_emissao IS NOT NULL
  AND comissao_bruta IS NOT NULL;

GRANT SELECT ON public.vw_lavoro_receita_competencia TO authenticated, anon, service_role;