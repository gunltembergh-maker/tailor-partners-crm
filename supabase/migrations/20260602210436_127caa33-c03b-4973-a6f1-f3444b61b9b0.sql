-- ETAPA 1: pausar crons
SELECT cron.alter_job(job_id := 36::bigint, active := false);
SELECT cron.alter_job(job_id := 46::bigint, active := false);
SELECT cron.alter_job(job_id := 47::bigint, active := false);

-- ETAPA 3: novos schedules desfasados
SELECT cron.alter_job(job_id := 36::bigint, schedule := '2-59/15 * * * *');
SELECT cron.alter_job(job_id := 47::bigint, schedule := '3-59/5 * * * *');

-- ETAPA 4: reativar
SELECT cron.alter_job(job_id := 36::bigint, active := true);
SELECT cron.alter_job(job_id := 46::bigint, active := true);
SELECT cron.alter_job(job_id := 47::bigint, active := true);

-- ETAPA 5: lock_timeout 30s -> 60s em rpc_sync_cursor_execute_pending_swap
CREATE OR REPLACE FUNCTION public.rpc_sync_cursor_execute_pending_swap()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cursor record;
  v_count_staging bigint;
  v_count_target_before bigint;
  v_t0 timestamptz := clock_timestamp();
  v_t1 timestamptz; v_t2 timestamptz; v_t3 timestamptz;
  v_result jsonb := '[]'::jsonb;
BEGIN
  PERFORM set_config('statement_timeout', '300s', true);
  PERFORM set_config('lock_timeout', '60s', true);

  FOR v_cursor IN
    SELECT sync_name, claimed_by, attempts
    FROM public.sync_cursor
    WHERE status = 'ready_for_swap'
      AND attempts < 5
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
        SET status = 'failed', error = 'Staging vazia ao executar swap',
            attempts = attempts + 1, updated_at = now()
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

      UPDATE public.sync_cursor
      SET status = 'completed',
          completed_at = now(),
          claimed_by = NULL,
          claimed_until = NULL,
          updated_at = now()
      WHERE sync_name = v_cursor.sync_name;

      RAISE NOTICE '[bg_swap] % DISABLE+COPY=%ms | ENABLE+TRUNC_STG=%ms | TOTAL=%ms',
        v_cursor.sync_name,
        EXTRACT(EPOCH FROM (v_t2 - v_t1)) * 1000,
        EXTRACT(EPOCH FROM (v_t3 - v_t2)) * 1000,
        EXTRACT(EPOCH FROM (clock_timestamp() - v_t0)) * 1000;

      v_result := v_result || jsonb_build_object(
        'sync_name', v_cursor.sync_name,
        'status', 'completed',
        'rows_swapped', v_count_staging,
        'total_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_t0)) * 1000
      );

    EXCEPTION WHEN OTHERS THEN
      PERFORM set_config('statement_timeout', '15s', true);

      BEGIN
        ALTER TABLE public.raw_comissoes_historico ENABLE TRIGGER trg_refresh_mv_after_hist;
        ALTER TABLE public.raw_comissoes_historico_staging ENABLE TRIGGER trg_refresh_mv_after_hist;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;

      UPDATE public.sync_cursor
      SET status = 'failed',
          error = format('Background swap falhou (attempt %s): %s', v_cursor.attempts + 1, SQLERRM),
          attempts = attempts + 1,
          updated_at = now()
      WHERE sync_name = v_cursor.sync_name;

      v_result := v_result || jsonb_build_object(
        'sync_name', v_cursor.sync_name,
        'status', 'failed',
        'attempts', v_cursor.attempts + 1,
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
$function$;