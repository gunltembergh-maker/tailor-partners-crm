-- Opção A: RPC para ler JWT service_role do Vault
CREATE OR REPLACE FUNCTION public.get_email_queue_jwt()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key'
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_email_queue_jwt() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_email_queue_jwt() FROM anon;
REVOKE ALL ON FUNCTION public.get_email_queue_jwt() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_queue_jwt() TO service_role;

-- PONTO 2: adicionar DIRETORIA ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'DIRETORIA';