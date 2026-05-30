
-- ETAPA 2: rpc_sync_cursor_mark_ready_for_swap
CREATE OR REPLACE FUNCTION public.rpc_sync_cursor_mark_ready_for_swap(
  p_sync_name text,
  p_claim uuid,
  p_target_table text,
  p_staging_table text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owns boolean;
  v_count_staging bigint;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.sync_cursor
    WHERE sync_name = p_sync_name AND claimed_by = p_claim
  ) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'Claim inválido para %', p_sync_name;
  END IF;

  IF p_target_table <> 'raw_comissoes_historico' OR p_staging_table <> 'raw_comissoes_historico_staging' THEN
    RAISE EXCEPTION 'Tabela não permitida no swap: % ← %', p_target_table, p_staging_table;
  END IF;

  EXECUTE format('SELECT count(*) FROM public.%I', p_staging_table) INTO v_count_staging;
  IF v_count_staging = 0 THEN
    RAISE EXCEPTION 'Staging vazia — abortando marcação';
  END IF;

  UPDATE public.sync_cursor
  SET status = 'ready_for_swap',
      total_rows_seen = v_count_staging,
      updated_at = now()
  WHERE sync_name = p_sync_name AND claimed_by = p_claim;

  RETURN jsonb_build_object(
    'ok', true,
    'status', 'ready_for_swap',
    'rows_in_staging', v_count_staging,
    'swap_scheduled', 'pg_cron will pickup within 5min'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_sync_cursor_mark_ready_for_swap(text, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_sync_cursor_mark_ready_for_swap(text, uuid, text, text) TO service_role;

-- ETAPA 3: rpc_sync_cursor_execute_pending_swap
CREATE OR REPLACE FUNCTION public.rpc_sync_cursor_execute_pending_swap()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cursor record;
  v_count_staging bigint;
  v_count_target_before bigint;
  v_t0 timestamptz := clock_timestamp();
  v_t1 timestamptz; v_t2 timestamptz; v_t3 timestamptz;
  v_result jsonb := '[]'::jsonb;
BEGIN
  PERFORM set_config('statement_timeout', '3600s', true);
  PERFORM set_config('lock_timeout', '30s', true);

  FOR v_cursor IN
    SELECT sync_name, claimed_by
    FROM public.sync_cursor
    WHERE status = 'ready_for_swap'
    ORDER BY updated_at ASC
  LOOP
    BEGIN
      IF v_cursor.sync_name <> 'historico_completo' THEN
        CONTINUE;
      END IF;

      SELECT count(*) INTO v_count_staging FROM public.raw_comissoes_historico_staging;
      SELECT count(*) INTO v_count_target_before FROM public.raw_comissoes_historico;

      IF v_count_staging = 0 THEN
        UPDATE public.sync_cursor
        SET status = 'failed', error = 'Staging vazia ao executar swap', updated_at = now()
        WHERE sync_name = v_cursor.sync_name;
        CONTINUE;
      END IF;

      v_t1 := clock_timestamp();

      ALTER TABLE public.raw_comissoes_historico DISABLE TRIGGER trg_refresh_mv_after_hist;
      ALTER TABLE public.raw_comissoes_historico_staging DISABLE TRIGGER trg_refresh_mv_after_hist;

      TRUNCATE TABLE public.raw_comissoes_historico;
      INSERT INTO public.raw_comissoes_historico (data)
      SELECT data FROM public.raw_comissoes_historico_staging;

      v_t2 := clock_timestamp();

      TRUNCATE TABLE public.raw_comissoes_historico_staging;

      ALTER TABLE public.raw_comissoes_historico ENABLE TRIGGER trg_refresh_mv_after_hist;
      ALTER TABLE public.raw_comissoes_historico_staging ENABLE TRIGGER trg_refresh_mv_after_hist;

      v_t3 := clock_timestamp();

      REFRESH MATERIALIZED VIEW public.mv_comissoes_consolidado_v2;

      UPDATE public.sync_cursor
      SET status = 'completed',
          completed_at = now(),
          claimed_by = NULL,
          claimed_until = NULL,
          updated_at = now()
      WHERE sync_name = v_cursor.sync_name;

      RAISE NOTICE '[bg_swap] % DISABLE+COPY=%ms | ENABLE+TRUNC_STG=%ms | REFRESH=%ms | TOTAL=%ms',
        v_cursor.sync_name,
        EXTRACT(EPOCH FROM (v_t2 - v_t1)) * 1000,
        EXTRACT(EPOCH FROM (v_t3 - v_t2)) * 1000,
        EXTRACT(EPOCH FROM (clock_timestamp() - v_t3)) * 1000,
        EXTRACT(EPOCH FROM (clock_timestamp() - v_t0)) * 1000;

      v_result := v_result || jsonb_build_object(
        'sync_name', v_cursor.sync_name,
        'status', 'completed',
        'rows_swapped', v_count_staging,
        'total_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_t0)) * 1000
      );

    EXCEPTION WHEN OTHERS THEN
      BEGIN
        ALTER TABLE public.raw_comissoes_historico ENABLE TRIGGER trg_refresh_mv_after_hist;
        ALTER TABLE public.raw_comissoes_historico_staging ENABLE TRIGGER trg_refresh_mv_after_hist;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;

      UPDATE public.sync_cursor
      SET status = 'failed',
          error = format('Background swap falhou: %s', SQLERRM),
          attempts = attempts + 1,
          updated_at = now()
      WHERE sync_name = v_cursor.sync_name;

      v_result := v_result || jsonb_build_object(
        'sync_name', v_cursor.sync_name,
        'status', 'failed',
        'error', SQLERRM
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'processed', v_result,
    'timestamp', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_sync_cursor_execute_pending_swap() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_sync_cursor_execute_pending_swap() FROM anon;
REVOKE ALL ON FUNCTION public.rpc_sync_cursor_execute_pending_swap() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_sync_cursor_execute_pending_swap() TO service_role;

-- ETAPA 4: pg_cron job (chamada SQL local, sem HTTP/keys)
SELECT cron.schedule(
  'sync-historico-execute-pending-swap',
  '*/5 * * * *',
  $$SELECT public.rpc_sync_cursor_execute_pending_swap();$$
);
