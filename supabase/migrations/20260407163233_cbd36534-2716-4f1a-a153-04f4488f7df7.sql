
DROP FUNCTION IF EXISTS public.rpc_get_popups_ativos(text);
DROP FUNCTION IF EXISTS public.rpc_admin_salvar_popup(uuid, text, text, boolean, timestamptz, timestamptz, text[], text[], text[], text, text);

CREATE FUNCTION public.rpc_get_popups_ativos(
  p_pagina text DEFAULT NULL
)
RETURNS TABLE(
  id          uuid,
  titulo      text,
  mensagem    text,
  paginas     text[],
  cor_fundo   text,
  cor_texto   text,
  botao_label text,
  data_fim    timestamptz,
  logo_url    text,
  mostrar_nome_hub boolean
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $func$
  SELECT 
    p.id, p.titulo, p.mensagem, p.paginas,
    p.cor_fundo, p.cor_texto, p.botao_label, p.data_fim,
    p.logo_url, p.mostrar_nome_hub
  FROM admin_popups p
  WHERE p.ativo = true
    AND p.data_inicio <= now()
    AND (p.data_fim IS NULL OR p.data_fim >= now())
    AND (p.paginas IS NULL OR p_pagina = ANY(p.paginas))
    AND (
      p.destinatarios IS NULL 
      OR (SELECT email FROM profiles WHERE user_id = auth.uid() LIMIT 1) = ANY(p.destinatarios)
    )
    AND (
      p.perfis IS NULL
      OR (
        SELECT ur.role::text FROM user_roles ur 
        JOIN profiles pr ON pr.user_id = ur.user_id
        WHERE pr.user_id = auth.uid() LIMIT 1
      ) = ANY(p.perfis)
    )
    AND p.id NOT IN (
      SELECT popup_id FROM admin_popup_dismissals
      WHERE profile_id = (
        SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1
      )
    )
  ORDER BY p.created_at DESC;
$func$;

CREATE FUNCTION public.rpc_admin_salvar_popup(
  p_id uuid DEFAULT NULL,
  p_titulo text DEFAULT '',
  p_mensagem text DEFAULT '',
  p_ativo boolean DEFAULT true,
  p_data_inicio timestamptz DEFAULT now(),
  p_data_fim timestamptz DEFAULT NULL,
  p_perfis text[] DEFAULT NULL,
  p_destinatarios text[] DEFAULT NULL,
  p_paginas text[] DEFAULT NULL,
  p_cor_fundo text DEFAULT '#082537',
  p_botao_label text DEFAULT 'Entendido!',
  p_logo_url text DEFAULT NULL,
  p_mostrar_nome_hub boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_id uuid;
BEGIN
  IF p_id IS NOT NULL THEN
    UPDATE admin_popups SET
      titulo = p_titulo,
      mensagem = p_mensagem,
      ativo = p_ativo,
      data_inicio = p_data_inicio,
      data_fim = p_data_fim,
      perfis = p_perfis,
      destinatarios = p_destinatarios,
      paginas = p_paginas,
      cor_fundo = p_cor_fundo,
      botao_label = p_botao_label,
      logo_url = p_logo_url,
      mostrar_nome_hub = p_mostrar_nome_hub,
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;
  ELSE
    INSERT INTO admin_popups (titulo, mensagem, ativo, data_inicio, data_fim, perfis, destinatarios, paginas, cor_fundo, botao_label, logo_url, mostrar_nome_hub, criado_por)
    VALUES (p_titulo, p_mensagem, p_ativo, p_data_inicio, p_data_fim, p_perfis, p_destinatarios, p_paginas, p_cor_fundo, p_botao_label, p_logo_url, p_mostrar_nome_hub, auth.uid())
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$func$;
