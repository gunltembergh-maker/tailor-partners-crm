-- Função: notifica admins por email com anti-flood de 30min por tipo
CREATE OR REPLACE FUNCTION public.notificar_admins_por_email(
  p_tipo text,
  p_titulo text,
  p_mensagem text,
  p_link_acao text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $$
DECLARE
  v_admin RECORD;
  v_jwt text;
  v_link text;
  v_label text;
  v_recent_count int;
BEGIN
  v_link := COALESCE(p_link_acao, 'https://hub.tailorpartners.com.br/admin/usuarios');
  v_label := 'alerta-admin-' || p_tipo;

  -- JWT do Vault pra invocar edge function
  SELECT decrypted_secret INTO v_jwt
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key'
  LIMIT 1;

  IF v_jwt IS NULL THEN
    RAISE WARNING 'notificar_admins_por_email: vault secret email_queue_service_role_key não encontrada';
    RETURN;
  END IF;

  -- Loop pelos admins ativos com email
  FOR v_admin IN
    SELECT
      p.user_id,
      p.email,
      COALESCE(p.nome_completo, p.full_name, p.nome, split_part(p.email, '@', 1)) AS nome
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.user_id
    WHERE ur.role::text = 'ADMIN'
      AND COALESCE(p.active, true) = true
      AND p.email IS NOT NULL
      AND p.email <> ''
  LOOP
    -- Anti-flood: 30min por tipo+admin (usa template_name do log)
    SELECT COUNT(*) INTO v_recent_count
    FROM public.email_send_log
    WHERE lower(recipient_email) = lower(v_admin.email)
      AND template_name = v_label
      AND created_at > (now() - interval '30 minutes')
      AND status IN ('pending', 'sent');

    IF v_recent_count > 0 THEN
      CONTINUE;
    END IF;

    -- Invoca send-transactional-email via pg_net
    PERFORM net.http_post(
      url := 'https://jtlelokzpqkgvlwomfus.supabase.co/functions/v1/send-transactional-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_jwt
      ),
      body := jsonb_build_object(
        'templateName', 'alerta-admin-pendencia',
        'recipientEmail', v_admin.email,
        'templateData', jsonb_build_object(
          'nome_admin', v_admin.nome,
          'titulo', p_titulo,
          'mensagem', p_mensagem,
          'tipo', p_tipo,
          'link_acao', v_link
        ),
        'label', v_label,
        'idempotencyKey', 'admin-' || p_tipo || '-' || v_admin.user_id::text || '-' || extract(epoch from now())::text
      )
    );
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.notificar_admins_por_email IS
'Envia alerta por email a todos os admins ativos. Anti-flood: 30min por tipo+admin.';

-- Trigger: dispara em cada INSERT em notificacoes_admin
CREATE OR REPLACE FUNCTION public.trg_notificacoes_admin_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_link text;
BEGIN
  -- Permite override via dados->>'link_acao'
  v_link := NULLIF(NEW.dados ->> 'link_acao', '');

  -- Dispara assíncrono via pg_net (não bloqueia o INSERT)
  PERFORM public.notificar_admins_por_email(
    NEW.tipo,
    NEW.titulo,
    NEW.mensagem,
    v_link
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca quebra o INSERT da notificação por causa de email
  RAISE WARNING 'trg_notificacoes_admin_email falhou: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificacoes_admin_email ON public.notificacoes_admin;
CREATE TRIGGER trg_notificacoes_admin_email
  AFTER INSERT ON public.notificacoes_admin
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notificacoes_admin_email();