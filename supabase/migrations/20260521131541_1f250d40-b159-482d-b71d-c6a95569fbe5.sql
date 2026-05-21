-- Fix ambiguity in rpc_listar_destinatarios_automaticos and harden all Prompt 4 RPCs
-- by qualifying all column references with table aliases.

CREATE OR REPLACE FUNCTION public.rpc_listar_destinatarios_automaticos(p_modulo text)
 RETURNS TABLE(id uuid, user_id uuid, nome text, email text, role text, ativo boolean, criado_em timestamp with time zone, adicionado_por_nome text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Apenas ADMIN pode listar destinatários';
  END IF;
  RETURN QUERY
  SELECT
    eda.id,
    eda.user_id,
    COALESCE(p.nome_completo, p.full_name, p.nome, 'Sem nome') AS nome,
    p.email,
    ur.role::text,
    eda.ativo,
    eda.criado_em,
    COALESCE(pp.nome_completo, pp.full_name, pp.nome) AS adicionado_por_nome
  FROM email_destinatarios_automaticos eda
  JOIN profiles p ON p.user_id = eda.user_id
  LEFT JOIN user_roles ur ON ur.user_id = p.user_id
  LEFT JOIN profiles pp ON pp.user_id = eda.adicionado_por
  WHERE eda.modulo = p_modulo
  ORDER BY eda.ativo DESC, COALESCE(p.nome_completo, p.full_name, p.nome) ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_adicionar_destinatario_automatico(p_user_id uuid, p_modulo text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Apenas ADMIN pode adicionar destinatários';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = p_user_id AND p.active = true
  ) THEN
    RAISE EXCEPTION 'Usuário não existe ou não está ativo';
  END IF;
  INSERT INTO email_destinatarios_automaticos AS eda (user_id, modulo, ativo, adicionado_por)
  VALUES (p_user_id, p_modulo, true, auth.uid())
  ON CONFLICT (user_id, modulo) DO UPDATE
    SET ativo = true, atualizado_em = now(), adicionado_por = EXCLUDED.adicionado_por
  RETURNING eda.id INTO v_id;
  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_remover_destinatario_automatico(p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Apenas ADMIN pode remover destinatários';
  END IF;
  DELETE FROM email_destinatarios_automaticos eda WHERE eda.id = p_id;
  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_toggle_schedule(p_modulo text, p_motivo text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_novo_estado boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Apenas ADMIN pode controlar schedules';
  END IF;
  SELECT NOT esc.ativo INTO v_novo_estado
  FROM email_schedules_config esc
  WHERE esc.modulo = p_modulo;
  IF v_novo_estado IS NULL THEN
    RAISE EXCEPTION 'Módulo % não configurado', p_modulo;
  END IF;
  UPDATE email_schedules_config esc
  SET
    ativo = v_novo_estado,
    pausado_por = CASE WHEN NOT v_novo_estado THEN auth.uid() ELSE NULL END,
    pausado_em = CASE WHEN NOT v_novo_estado THEN now() ELSE NULL END,
    motivo_pausa = CASE WHEN NOT v_novo_estado THEN p_motivo ELSE NULL END,
    atualizado_em = now()
  WHERE esc.modulo = p_modulo;
  RETURN v_novo_estado;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_historico_disparos(p_modulo text, p_limit integer DEFAULT 30)
 RETURNS TABLE(id uuid, data_envio date, disparado_em timestamp with time zone, total_destinatarios integer, total_sucessos integer, total_falhas integer, status text, forcado_por_nome text, finalizado_em timestamp with time zone, detalhes_erro jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Apenas ADMIN pode ver histórico';
  END IF;
  RETURN QUERY
  SELECT
    eda.id,
    eda.data_envio,
    eda.disparado_em,
    eda.total_destinatarios,
    eda.total_sucessos,
    eda.total_falhas,
    eda.status,
    COALESCE(p.nome_completo, p.full_name, p.nome) AS forcado_por_nome,
    eda.finalizado_em,
    eda.detalhes_erro
  FROM email_disparos_automaticos eda
  LEFT JOIN profiles p ON p.user_id = eda.forcado_por
  WHERE eda.modulo = p_modulo
  ORDER BY eda.disparado_em DESC
  LIMIT p_limit;
END;
$function$;