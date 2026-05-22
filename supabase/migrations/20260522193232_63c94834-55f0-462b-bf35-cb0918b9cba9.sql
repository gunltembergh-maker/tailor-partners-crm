
CREATE OR REPLACE FUNCTION public.normalize_nome_pessoa(p_nome TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF p_nome IS NULL THEN RETURN NULL; END IF;
  RETURN regexp_replace(LOWER(TRIM(p_nome)), '\s+', ' ', 'g');
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_buscar_pessoas_raw(p_tipo TEXT, p_busca TEXT DEFAULT NULL)
RETURNS TABLE (valor TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
        WHEN 'FA' THEN banker NOT IN ('Lavoro','Outros','NA','')
        ELSE TRUE
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

DROP FUNCTION IF EXISTS public.pessoas_vinculadas_usuario(UUID);

CREATE FUNCTION public.pessoas_vinculadas_usuario(p_user_id UUID)
RETURNS TABLE (tipo TEXT, valor TEXT, valor_normalizado TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pvr.tipo::TEXT,
    pvr.valor::TEXT,
    public.normalize_nome_pessoa(pvr.valor)::TEXT AS valor_normalizado
  FROM public.profile_vinculos_receita pvr
  WHERE pvr.user_id = p_user_id
    AND pvr.ativo = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_sincronizar_vinculos_usuario(
  p_user_id UUID,
  p_vinculos JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_inseridos INT := 0;
  v_removidos INT := 0;
  v_existentes INT;
  v_user_alvo_existe BOOLEAN;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Autenticação requerida'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_caller AND role::TEXT = 'ADMIN') INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Apenas ADMIN pode sincronizar vínculos'; END IF;

  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id) INTO v_user_alvo_existe;
  IF NOT v_user_alvo_existe THEN RAISE EXCEPTION 'Usuário alvo não encontrado: %', p_user_id; END IF;

  IF p_vinculos IS NULL OR jsonb_typeof(p_vinculos) <> 'array' THEN
    RAISE EXCEPTION 'p_vinculos deve ser um array JSON';
  END IF;

  SELECT COUNT(*) INTO v_existentes FROM public.profile_vinculos_receita WHERE user_id = p_user_id;

  DELETE FROM public.profile_vinculos_receita WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_removidos = ROW_COUNT;

  INSERT INTO public.profile_vinculos_receita (user_id, tipo, valor, adicionado_por)
  SELECT
    p_user_id,
    UPPER(TRIM(elem->>'tipo')),
    TRIM(elem->>'valor'),
    v_caller
  FROM jsonb_array_elements(p_vinculos) elem
  WHERE
    elem->>'tipo' IS NOT NULL
    AND elem->>'valor' IS NOT NULL
    AND TRIM(elem->>'valor') <> ''
    AND UPPER(TRIM(elem->>'tipo')) IN ('FA', 'FINDER', 'ADVISOR')
  ON CONFLICT (user_id, tipo, valor) DO NOTHING;

  GET DIAGNOSTICS v_inseridos = ROW_COUNT;

  RETURN jsonb_build_object(
    'sucesso', TRUE,
    'user_id', p_user_id,
    'vinculos_antes', v_existentes,
    'removidos', v_removidos,
    'inseridos', v_inseridos
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_sincronizar_vinculos_usuario(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_sincronizar_vinculos_usuario(UUID, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_sincronizar_vinculos_usuario(UUID, JSONB) TO authenticated;
