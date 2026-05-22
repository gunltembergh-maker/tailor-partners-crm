-- 1. Validação pré-DELETE
DO $$
DECLARE
  v_usuarios INT;
BEGIN
  SELECT COUNT(*) INTO v_usuarios
  FROM public.user_roles
  WHERE role::text = 'LÍDER - ASSESSOR';

  IF v_usuarios > 0 THEN
    RAISE EXCEPTION 'ABORTANDO: % usuários atribuídos a LÍDER - ASSESSOR. Migrar primeiro.', v_usuarios;
  END IF;
  RAISE NOTICE 'Validação OK: 0 usuários atribuídos. Seguro pra DELETE.';
END;
$$;

-- 1.2 Remover perfil órfão
DELETE FROM public.perfis_acesso
WHERE nome = 'LÍDER - ASSESSOR';

-- 2.1 Adicionar timestamps em user_roles
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2.3 Trigger para manter updated_at
CREATE OR REPLACE FUNCTION public.tg_user_roles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER trg_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.tg_user_roles_updated_at();

-- 2.4 Comentários
COMMENT ON COLUMN public.user_roles.created_at IS 'Quando o role foi atribuído pela primeira vez. Backfill em 22/05/2026 com NOW() — registros anteriores nao tem historico real.';
COMMENT ON COLUMN public.user_roles.updated_at IS 'Última alteração do role. Mantido automaticamente pelo trigger trg_user_roles_updated_at.';