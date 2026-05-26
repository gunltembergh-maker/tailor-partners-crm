
CREATE OR REPLACE FUNCTION public.normalize_canal(canal text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.normalize_nome_pessoa(canal) = public.normalize_nome_pessoa('Gabriel Boyer/Gustavo Faria') THEN 'Gabriel Boyer'
    WHEN public.normalize_nome_pessoa(canal) = public.normalize_nome_pessoa('Boyer') THEN 'Gabriel Boyer'
    WHEN canal = 'NA' THEN 'Sem Canal'
    WHEN canal = 'Denise Simôes' THEN 'Denise Simões'
    WHEN UPPER(TRIM(canal)) = 'URCA' THEN 'Urca'
    ELSE canal
  END;
$$;

CREATE TABLE IF NOT EXISTS public._backup_mv_caixa_completa_27_05_v3 AS
SELECT * FROM public.mv_comissoes_caixa_completa;
