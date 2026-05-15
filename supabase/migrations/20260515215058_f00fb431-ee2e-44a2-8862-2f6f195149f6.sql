CREATE OR REPLACE FUNCTION public.rpc_try_cascade_advisory_lock(p_arquivo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_key bigint;
  v_acquired boolean;
BEGIN
  v_lock_key := hashtext('cascade_' || p_arquivo);
  SELECT pg_try_advisory_lock(v_lock_key) INTO v_acquired;
  RETURN jsonb_build_object(
    'acquired', v_acquired,
    'lock_key', v_lock_key,
    'arquivo', p_arquivo
  );
END;
$$;

COMMENT ON FUNCTION public.rpc_try_cascade_advisory_lock IS
'Tenta adquirir advisory lock pra cascade do arquivo dado. NAO-BLOQUEANTE: retorna acquired=false imediatamente se ja ha lock. Lock e liberado automaticamente ao fim da sessao/conexao.';

CREATE OR REPLACE FUNCTION public.rpc_release_cascade_advisory_lock(p_arquivo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_key bigint;
  v_released boolean;
BEGIN
  v_lock_key := hashtext('cascade_' || p_arquivo);
  SELECT pg_advisory_unlock(v_lock_key) INTO v_released;
  RETURN jsonb_build_object(
    'released', v_released,
    'lock_key', v_lock_key,
    'arquivo', p_arquivo
  );
END;
$$;

COMMENT ON FUNCTION public.rpc_release_cascade_advisory_lock IS
'Libera advisory lock do cascade. Caso a sessao termine sem chamar, o Postgres libera automaticamente (advisory locks sao session-scoped).';