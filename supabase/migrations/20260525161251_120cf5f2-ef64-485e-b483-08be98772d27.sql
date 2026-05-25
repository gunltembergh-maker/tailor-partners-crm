
-- 1. Clone indexes onto staging (idempotent via IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_stg_hist_ingested       ON public.raw_comissoes_historico_staging USING btree (ingested_at DESC);
CREATE INDEX IF NOT EXISTS idx_stg_banker_anomes       ON public.raw_comissoes_historico_staging USING btree (((data ->> 'Banker'::text)), ((data ->> 'AnoMes'::text)));
CREATE INDEX IF NOT EXISTS idx_stg_hist_data_categoria ON public.raw_comissoes_historico_staging USING btree (((data ->> 'Data'::text)), ((data ->> 'Categoria'::text)));
CREATE INDEX IF NOT EXISTS idx_stg_hist_data           ON public.raw_comissoes_historico_staging USING btree (((data ->> 'Data'::text)));
CREATE INDEX IF NOT EXISTS idx_stg_hist_banker         ON public.raw_comissoes_historico_staging USING btree (((data ->> 'Banker'::text)));
CREATE INDEX IF NOT EXISTS idx_stg_hist_categoria      ON public.raw_comissoes_historico_staging USING btree (((data ->> 'Categoria'::text)));
CREATE INDEX IF NOT EXISTS idx_stg_banker_gin          ON public.raw_comissoes_historico_staging USING gin (((data -> 'Banker'::text)));
CREATE INDEX IF NOT EXISTS idx_stg_anomes              ON public.raw_comissoes_historico_staging USING btree ((((data ->> 'AnoMes'::text))::integer));

-- 2. Clone triggers onto staging
DROP TRIGGER IF EXISTS trg_normalize_advisor      ON public.raw_comissoes_historico_staging;
DROP TRIGGER IF EXISTS trg_refresh_mv_after_hist  ON public.raw_comissoes_historico_staging;

CREATE TRIGGER trg_normalize_advisor
  BEFORE INSERT OR UPDATE ON public.raw_comissoes_historico_staging
  FOR EACH ROW EXECUTE FUNCTION public.trg_normalize_advisor();

CREATE TRIGGER trg_refresh_mv_after_hist
  AFTER INSERT OR DELETE OR UPDATE ON public.raw_comissoes_historico_staging
  FOR EACH STATEMENT EXECUTE FUNCTION public.fn_refresh_mv_comissoes();

-- 3. Mirror missing RLS policies onto staging
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='raw_comissoes_historico_staging' AND policyname='Admins can insert raw_comissoes_historico_staging') THEN
    CREATE POLICY "Admins can insert raw_comissoes_historico_staging"
      ON public.raw_comissoes_historico_staging FOR INSERT TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='raw_comissoes_historico_staging' AND policyname='Admins can delete raw_comissoes_historico_staging') THEN
    CREATE POLICY "Admins can delete raw_comissoes_historico_staging"
      ON public.raw_comissoes_historico_staging FOR DELETE TO authenticated
      USING (public.has_role(auth.uid(), 'ADMIN'::app_role));
  END IF;
END $$;

-- 4. Replace swap RPC with atomic triple-RENAME
CREATE OR REPLACE FUNCTION public.rpc_sync_cursor_complete_swap(
  p_sync_name text, p_claim uuid, p_target_table text, p_staging_table text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
         claimed_at = NULL
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
