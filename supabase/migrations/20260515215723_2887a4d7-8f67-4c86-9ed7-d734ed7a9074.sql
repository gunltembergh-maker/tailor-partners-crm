-- 1. Índice único parcial: garante que só pode existir 1 lock "running" (sucesso IS NULL) por arquivo
CREATE UNIQUE INDEX IF NOT EXISTS uniq_cascade_lock_running
ON public.sync_log (tipo)
WHERE sucesso IS NULL AND tipo LIKE 'cascade-lock-%';

COMMENT ON INDEX public.uniq_cascade_lock_running IS
'Garante atomicidade do cascade lock: 2 INSERTs simultâneos com sucesso=NULL e mesmo tipo (mesmo arquivo) → segundo bate em duplicate key (23505). Substitui advisory lock que era no-op via PostgREST pool.';

-- 2. Remover as RPCs de advisory lock (no-op via PostgREST connection pooling)
DROP FUNCTION IF EXISTS public.rpc_try_cascade_advisory_lock(text);
DROP FUNCTION IF EXISTS public.rpc_release_cascade_advisory_lock(text);