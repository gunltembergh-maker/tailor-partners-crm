
-- 1. Garantir unique index case-insensitive em suppressed_emails.email
CREATE UNIQUE INDEX IF NOT EXISTS suppressed_emails_email_lower_uidx
  ON public.suppressed_emails (lower(email));

-- 2. Garantir unique index case-insensitive em email_unsubscribe_tokens.email
CREATE UNIQUE INDEX IF NOT EXISTS email_unsubscribe_tokens_email_lower_uidx
  ON public.email_unsubscribe_tokens (lower(email));

-- 3. Adicionar 3 chaves de permissão em todos os perfis (default false)
--    e default true apenas para ADMIN
UPDATE public.perfis_acesso
SET permissoes = COALESCE(permissoes, '{}'::jsonb) || jsonb_build_object(
  'enviar_email_manual', false,
  'gerenciar_emails_destinatarios', false,
  'gerenciar_emails_schedules', false
)
WHERE NOT (permissoes ? 'enviar_email_manual');

UPDATE public.perfis_acesso
SET permissoes = permissoes || jsonb_build_object(
  'enviar_email_manual', true,
  'gerenciar_emails_destinatarios', true,
  'gerenciar_emails_schedules', true
)
WHERE nome = 'ADMIN';

-- 4. Garantir policy ADMIN-read em suppressed_emails e email_send_log
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Admins can read suppressed emails'
  ) THEN
    CREATE POLICY "Admins can read suppressed emails"
      ON public.suppressed_emails FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'ADMIN'::app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Admins can read email send log'
  ) THEN
    CREATE POLICY "Admins can read email send log"
      ON public.email_send_log FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'ADMIN'::app_role));
  END IF;
END $$;
