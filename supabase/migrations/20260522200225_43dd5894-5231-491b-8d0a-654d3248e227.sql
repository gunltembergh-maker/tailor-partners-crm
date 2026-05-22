
-- 1. Atualizar rpc_buscar_pessoas_raw para bloquear buckets em TODOS os tipos
CREATE OR REPLACE FUNCTION public.rpc_buscar_pessoas_raw(p_tipo TEXT, p_busca TEXT DEFAULT NULL)
RETURNS TABLE (valor TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buckets_bloqueados TEXT[] := ARRAY[
    'Sem Advisor', 'Sem Finder', 'Sem Assessor',
    'Legado', 'Legado Advisor',
    'NA', '',
    'Lavoro', 'Outros'
  ];
BEGIN
  IF UPPER(p_tipo) NOT IN ('FA','FINDER','ADVISOR') THEN
    RAISE EXCEPTION 'tipo inválido: %. Use FA, FINDER ou ADVISOR', p_tipo;
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      CASE UPPER(p_tipo)
        WHEN 'FA' THEN banker
        WHEN 'FINDER' THEN finder
        WHEN 'ADVISOR' THEN advisor
      END AS nome_original
    FROM public.comissoes_consolidado_filtrado
    WHERE
      CASE UPPER(p_tipo)
        WHEN 'FA' THEN banker IS NOT NULL AND TRIM(banker) <> ''
        WHEN 'FINDER' THEN finder IS NOT NULL AND TRIM(finder) <> ''
        WHEN 'ADVISOR' THEN advisor IS NOT NULL AND TRIM(advisor) <> ''
      END
      AND CASE UPPER(p_tipo)
        WHEN 'FA' THEN TRIM(banker) <> ALL(v_buckets_bloqueados)
        WHEN 'FINDER' THEN TRIM(finder) <> ALL(v_buckets_bloqueados)
        WHEN 'ADVISOR' THEN TRIM(advisor) <> ALL(v_buckets_bloqueados)
      END
  ),
  agrupado AS (
    SELECT
      public.normalize_nome_pessoa(nome_original) AS chave,
      nome_original,
      COUNT(*) AS freq,
      ROW_NUMBER() OVER (
        PARTITION BY public.normalize_nome_pessoa(nome_original)
        ORDER BY COUNT(*) DESC, MIN(nome_original)
      ) AS rn
    FROM base
    GROUP BY public.normalize_nome_pessoa(nome_original), nome_original
  )
  SELECT TRIM(a.nome_original)::TEXT AS valor
  FROM agrupado a
  WHERE a.rn = 1
    AND (
      p_busca IS NULL
      OR TRIM(p_busca) = ''
      OR public.normalize_nome_pessoa(a.nome_original) ILIKE '%' || public.normalize_nome_pessoa(p_busca) || '%'
    )
  ORDER BY TRIM(a.nome_original)
  LIMIT 200;
END;
$$;

-- 2. Remover vínculos contaminados (buckets genéricos)
DELETE FROM public.profile_vinculos_receita
WHERE TRIM(valor) IN (
  'Sem Advisor', 'Sem Finder', 'Sem Assessor',
  'Legado', 'Legado Advisor',
  'NA', '',
  'Lavoro', 'Outros'
);

-- 3. Deduplicar variações de case (manter a entrada mais antiga)
WITH dups AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, tipo, public.normalize_nome_pessoa(valor)
      ORDER BY criado_em ASC, id ASC
    ) AS rn
  FROM public.profile_vinculos_receita
)
DELETE FROM public.profile_vinculos_receita
WHERE id IN (SELECT id FROM dups WHERE rn > 1);
