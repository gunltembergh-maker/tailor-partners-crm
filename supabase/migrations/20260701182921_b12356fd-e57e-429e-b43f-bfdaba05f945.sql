CREATE OR REPLACE FUNCTION public.normalize_categoria_financeira(categoria text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(
    btrim(
      translate(
        coalesce(categoria, ''),
        'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç',
        'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'
      )
    )
  );
$$;

CREATE OR REPLACE VIEW public.vw_lavoro_receita_caixa AS
SELECT
  id,
  data_pagamento,
  descricao,
  valor,
  referencia,
  mes_referencia,
  EXTRACT(YEAR FROM data_pagamento)::int AS ano,
  EXTRACT(MONTH FROM data_pagamento)::int AS mes,
  sync_id
FROM public.raw_lavoro_caixa_comissao
WHERE (
    public.normalize_categoria_financeira(categoria) = 'comissao'
    OR public.normalize_categoria_financeira(tipo_lancamento) = 'comissao'
  )
  AND sync_id = (
    SELECT sync_id
    FROM public.raw_lavoro_caixa_comissao
    ORDER BY criado_em DESC
    LIMIT 1
  );