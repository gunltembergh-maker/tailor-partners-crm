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
  PERFORM set_config('statement_timeout', '300s', true);
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

  ALTER TABLE public.raw_comissoes_historico DISABLE TRIGGER trg_refresh_mv_after_hist;
  ALTER TABLE public.raw_comissoes_historico_staging DISABLE TRIGGER trg_refresh_mv_after_hist;

  v_t1 := clock_timestamp();

  -- COPY-IN-PLACE: preserva OID da tabela target (não quebra MV)
  TRUNCATE TABLE public.raw_comissoes_historico;
  INSERT INTO public.raw_comissoes_historico (data)
    SELECT data FROM public.raw_comissoes_historico_staging;

  v_t2 := clock_timestamp();

  TRUNCATE TABLE public.raw_comissoes_historico_staging;

  v_t3 := clock_timestamp();

  -- Reabilitar triggers
  ALTER TABLE public.raw_comissoes_historico ENABLE TRIGGER trg_refresh_mv_after_hist;
  ALTER TABLE public.raw_comissoes_historico_staging ENABLE TRIGGER trg_refresh_mv_after_hist;

  -- REFRESH MV manual (substitui os 3 que o trigger faria)
  REFRESH MATERIALIZED VIEW public.mv_comissoes_consolidado_v2;

  UPDATE public.sync_cursor
     SET status = 'completed',
         completed_at = now(),
         claimed_by = NULL,
         claimed_until = NULL
   WHERE sync_name = p_sync_name AND claimed_by IS NOT DISTINCT FROM p_claim;

  RAISE NOTICE '[swap_copy] VALIDATE=%ms | COPY=%ms | TRUNC_STG=%ms | TOTAL=%ms',
    round(extract(epoch from (v_t1 - v_t0)) * 1000),
    round(extract(epoch from (v_t2 - v_t1)) * 1000),
    round(extract(epoch from (v_t3 - v_t2)) * 1000),
    round(extract(epoch from (v_t3 - v_t0)) * 1000);

  RETURN jsonb_build_object(
    'ok', true,
    'strategy', 'copy_in_place',
    'rows_swapped', v_count_staging,
    'rows_before', v_count_target_before,
    'duration_ms', round(extract(epoch from (v_t3 - v_t0)) * 1000)
  );
END;
$function$;