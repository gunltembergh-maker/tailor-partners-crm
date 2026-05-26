CREATE OR REPLACE FUNCTION public.rpc_sync_cursor_complete_swap(p_sync_name text, p_claim uuid, p_target_table text, p_staging_table text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_owns boolean;
  v_count_staging bigint;
  v_count_target_before bigint;
  v_t0 timestamptz := clock_timestamp();
  v_t1 timestamptz;
  v_t2 timestamptz;
  v_t3 timestamptz;
BEGIN
  PERFORM set_config('statement_timeout', '120s', true);
  PERFORM set_config('lock_timeout', '10s', true);

  SELECT EXISTS (
    SELECT 1 FROM public.sync_cursor
     WHERE sync_name = p_sync_name AND claimed_by = p_claim
  ) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'Claim inválido para %', p_sync_name;
  END IF;

  IF p_target_table <> 'raw_comissoes_historico'
     OR p_staging_table <> 'raw_comissoes_historico_staging' THEN
    RAISE EXCEPTION 'Tabela não permitida no swap: % ← %', p_target_table, p_staging_table;
  END IF;

  EXECUTE format('SELECT count(*) FROM public.%I', p_staging_table) INTO v_count_staging;
  EXECUTE format('SELECT count(*) FROM public.%I', p_target_table) INTO v_count_target_before;

  IF v_count_staging = 0 THEN
    RAISE EXCEPTION 'Staging vazia — abortando swap (target tinha % linhas)', v_count_target_before;
  END IF;

  v_t1 := clock_timestamp();

  -- Atomic triple-rename (single transaction, AccessExclusiveLock <50ms total)
  ALTER TABLE public.raw_comissoes_historico         RENAME TO raw_comissoes_historico_oldswap;
  ALTER TABLE public.raw_comissoes_historico_staging RENAME TO raw_comissoes_historico;
  ALTER TABLE public.raw_comissoes_historico_oldswap RENAME TO raw_comissoes_historico_staging;

  v_t2 := clock_timestamp();

  -- Esvazia o antigo destino (agora chamado _staging) pra ficar pronto pro próximo ciclo
  EXECUTE 'TRUNCATE TABLE public.raw_comissoes_historico_staging';

  v_t3 := clock_timestamp();

  UPDATE public.sync_cursor
     SET status = 'completed',
         completed_at = now(),
         claimed_by = NULL,
         claimed_until = NULL
   WHERE sync_name = p_sync_name AND claimed_by IS NOT DISTINCT FROM p_claim;
  -- (caso já tenha sido limpo, ok)

  RAISE NOTICE '[swap_atomic] VALIDATE=%ms | RENAME=%ms | TRUNCATE_STG=%ms | TOTAL=%ms',
    round(extract(epoch from (v_t1 - v_t0)) * 1000),
    round(extract(epoch from (v_t2 - v_t1)) * 1000),
    round(extract(epoch from (v_t3 - v_t2)) * 1000),
    round(extract(epoch from (v_t3 - v_t0)) * 1000);

  RETURN jsonb_build_object(
    'ok', true,
    'strategy', 'atomic_rename',
    'rows_swapped', v_count_staging,
    'rows_before', v_count_target_before,
    'duration_ms', round(extract(epoch from (v_t3 - v_t0)) * 1000)
  );
END;
$function$;