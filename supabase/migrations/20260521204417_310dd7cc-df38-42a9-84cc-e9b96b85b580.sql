
ALTER TABLE public.perfis_acesso ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

INSERT INTO public.perfis_acesso (nome, descricao, permissoes, ativo)
VALUES ('ASSESSOR', 'Assessor', '{}'::jsonb, true)
ON CONFLICT (nome) DO NOTHING;

CREATE OR REPLACE FUNCTION public.rpc_listar_perfis_disponiveis()
RETURNS TABLE(nome text, descricao text, ordem int)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pa.nome,
    COALESCE(pa.descricao, pa.nome) AS descricao,
    (CASE pa.nome
      WHEN 'ADMIN' THEN 1
      WHEN 'DIRETORIA' THEN 2
      WHEN 'LIDER' THEN 3
      WHEN 'BANKER' THEN 4
      WHEN 'FINDER' THEN 5
      WHEN 'FA ASSISTENTE' THEN 6
      WHEN 'ASSESSOR' THEN 7
      WHEN 'COMERCIAL' THEN 8
      WHEN 'OPERACOES' THEN 9
      WHEN 'JURIDICO' THEN 10
      WHEN 'RH' THEN 11
      WHEN 'MARKETING' THEN 12
      ELSE 99
    END)::int AS ordem
  FROM public.perfis_acesso pa
  WHERE pa.ativo = true
  ORDER BY ordem ASC, pa.nome ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_listar_perfis_disponiveis TO authenticated;
