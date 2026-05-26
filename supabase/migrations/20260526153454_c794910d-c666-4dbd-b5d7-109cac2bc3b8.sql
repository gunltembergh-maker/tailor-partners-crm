CREATE OR REPLACE FUNCTION public.normalize_advisor(advisor text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN advisor = 'Victor Queiroz' THEN 'Legado'
    WHEN public.normalize_nome_pessoa(advisor) = public.normalize_nome_pessoa('João Fontes') THEN 'João Soares'
    WHEN public.normalize_nome_pessoa(advisor) = public.normalize_nome_pessoa('João S') THEN 'João Soares'
    WHEN public.normalize_nome_pessoa(advisor) = public.normalize_nome_pessoa('Legado') THEN 'Sem Advisor'
    WHEN public.normalize_nome_pessoa(advisor) = public.normalize_nome_pessoa('Legado Advisor') THEN 'Sem Advisor'
    ELSE advisor
  END;
$$;