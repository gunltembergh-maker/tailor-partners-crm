
-- 1. Rename column
ALTER TABLE public.profile_vinculos_receita
  RENAME COLUMN nome_pessoa TO valor;

-- 2. DROP + CREATE funções (mudança de tipo de retorno)
DROP FUNCTION IF EXISTS public.pessoas_vinculadas_usuario(uuid);
CREATE FUNCTION public.pessoas_vinculadas_usuario(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(tipo text, valor text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT pvr.tipo::text, pvr.valor::text
  FROM public.profile_vinculos_receita pvr
  WHERE pvr.user_id = p_user_id AND pvr.ativo = true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.pessoas_vinculadas_usuario(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.rpc_listar_vinculos_usuario(uuid);
CREATE FUNCTION public.rpc_listar_vinculos_usuario(p_user_id uuid)
RETURNS TABLE(id uuid, tipo text, valor text, criado_em timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_user_id <> auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Sem permissão pra listar vínculos deste usuário';
  END IF;

  RETURN QUERY
  SELECT pvr.id, pvr.tipo, pvr.valor, pvr.criado_em
  FROM public.profile_vinculos_receita pvr
  WHERE pvr.user_id = p_user_id AND pvr.ativo = true
  ORDER BY pvr.tipo, pvr.valor;
END;
$$;
GRANT EXECUTE ON FUNCTION public.rpc_listar_vinculos_usuario(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.rpc_adicionar_vinculo(uuid, text, text);
CREATE FUNCTION public.rpc_adicionar_vinculo(
  p_user_id uuid, p_tipo text, p_valor text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Apenas ADMIN pode adicionar vínculos';
  END IF;

  IF p_tipo NOT IN ('FA','FINDER','ADVISOR') THEN
    RAISE EXCEPTION 'Tipo deve ser FA, FINDER ou ADVISOR';
  END IF;

  IF COALESCE(p_valor,'') = '' THEN
    RAISE EXCEPTION 'valor não pode ser vazio';
  END IF;

  INSERT INTO public.profile_vinculos_receita (user_id, tipo, valor, adicionado_por)
  VALUES (p_user_id, p_tipo, p_valor, auth.uid())
  ON CONFLICT (user_id, tipo, valor)
  DO UPDATE SET ativo = true, atualizado_em = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.rpc_adicionar_vinculo(uuid, text, text) TO authenticated;

DROP FUNCTION IF EXISTS public.rpc_buscar_pessoas_raw(text, text);
CREATE FUNCTION public.rpc_buscar_pessoas_raw(
  p_tipo text, p_busca text DEFAULT NULL
)
RETURNS TABLE(valor text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_coluna text;
BEGIN
  IF p_tipo NOT IN ('FA','FINDER','ADVISOR') THEN
    RAISE EXCEPTION 'Tipo inválido';
  END IF;

  v_coluna := CASE p_tipo
    WHEN 'FA' THEN 'banker'
    WHEN 'FINDER' THEN 'finder'
    WHEN 'ADVISOR' THEN 'advisor'
  END;

  RETURN QUERY EXECUTE format(
    'SELECT DISTINCT %I::text AS valor
     FROM public.comissoes_consolidado_filtrado
     WHERE %I IS NOT NULL AND %I::text <> ''''
       AND %I::text NOT IN (''Lavoro'',''Outros'',''NA'')
       AND ($1 IS NULL OR $1 = '''' OR LOWER(%I::text) LIKE ''%%'' || LOWER($1) || ''%%'')
     ORDER BY %I::text
     LIMIT 100',
    v_coluna, v_coluna, v_coluna, v_coluna, v_coluna, v_coluna
  ) USING p_busca;
END;
$$;
GRANT EXECUTE ON FUNCTION public.rpc_buscar_pessoas_raw(text, text) TO authenticated;

-- 3. Backfill (usar p.user_id pra bater com auth.uid())
INSERT INTO public.profile_vinculos_receita (user_id, tipo, valor)
SELECT p.user_id, 'FA', TRIM(p.banker_name)
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.user_id
WHERE ur.role::text = 'BANKER'
  AND p.banker_name IS NOT NULL
  AND TRIM(p.banker_name) <> ''
ON CONFLICT (user_id, tipo, valor) DO NOTHING;

INSERT INTO public.profile_vinculos_receita (user_id, tipo, valor)
SELECT p.user_id, 'FINDER', TRIM(p.finder_name)
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.user_id
WHERE ur.role::text = 'FINDER'
  AND p.finder_name IS NOT NULL
  AND TRIM(p.finder_name) <> ''
ON CONFLICT (user_id, tipo, valor) DO NOTHING;

-- 4. Comments DEPRECATED
COMMENT ON COLUMN public.profiles.banker_name IS
  'DEPRECATED 22/05/2026 — substituído por profile_vinculos_receita (tipo=FA). Mantida temporariamente pra retrocompatibilidade. NAO usar em código novo.';
COMMENT ON COLUMN public.profiles.finder_name IS
  'DEPRECATED 22/05/2026 — substituído por profile_vinculos_receita (tipo=FINDER). Mantida temporariamente pra retrocompatibilidade. NAO usar em código novo.';
COMMENT ON COLUMN public.profiles.advisor_name IS
  'DEPRECATED 22/05/2026 — substituído por profile_vinculos_receita (tipo=ADVISOR). Mantida temporariamente pra retrocompatibilidade. NAO usar em código novo.';
