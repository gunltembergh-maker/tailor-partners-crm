
DROP FUNCTION IF EXISTS public.rpc_admin_salvar_access_rule(uuid,text[],text[],text[],text[],text[],text);
DROP FUNCTION IF EXISTS public.rpc_admin_remover_access_rule(uuid);

CREATE OR REPLACE FUNCTION public.rpc_admin_salvar_access_rule(
  p_profile_id uuid,
  p_bankers text[] DEFAULT NULL,
  p_finders text[] DEFAULT NULL,
  p_advisors text[] DEFAULT NULL,
  p_documentos text[] DEFAULT NULL,
  p_canais text[] DEFAULT NULL,
  p_descricao text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_or_lider(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  INSERT INTO user_access_rules (profile_id, bankers, finders, advisors, documentos, canais, descricao, updated_at)
  VALUES (p_profile_id, p_bankers, p_finders, p_advisors, p_documentos, p_canais, p_descricao, now())
  ON CONFLICT (profile_id) DO UPDATE SET
    bankers = EXCLUDED.bankers,
    finders = EXCLUDED.finders,
    advisors = EXCLUDED.advisors,
    documentos = EXCLUDED.documentos,
    canais = EXCLUDED.canais,
    descricao = EXCLUDED.descricao,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_admin_remover_access_rule(
  p_profile_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_or_lider(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  DELETE FROM user_access_rules WHERE profile_id = p_profile_id;
END;
$$;
