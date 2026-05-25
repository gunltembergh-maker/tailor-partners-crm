CREATE OR REPLACE FUNCTION public.rpc_sync_cursor_complete_swap(p_sync_name text, p_claim uuid, p_target_table text, p_staging_table text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count_staging bigint;
  v_owns boolean;
  v_linhas_inseridas bigint;
  v_t_inicio    timestamptz := clock_timestamp();
  v_t_validate  timestamptz;
  v_t_disable   timestamptz;
  v_t_truncate  timestamptz;
  v_t_insert    timestamptz;
  v_t_enable    timestamptz;
  v_t_trunc_stg timestamptz;
BEGIN
  -- ALTERAÇÃO: timeout 300s -> 3600s (janela noturna 03h-08h dá folga de 4h)
  PERFORM set_config('statement_timeout', '3600s', true);

  SELECT EXISTS (
    SELECT 1 FROM public.sync_cursor
     WHERE sync_name = p_sync_name AND claimed_by = p_claim
  ) INTO v_owns;

  IF NOT v_owns THEN
    RAISE EXCEPTION 'Claim inválido para %', p_sync_name;
  END IF;

  IF p_target_table NOT IN ('raw_comissoes_historico')
     OR p_staging_table NOT IN ('raw_comissoes_historico_staging') THEN
    RAISE EXCEPTION 'Tabela não permitida no swap: % ← %', p_target_table, p_staging_table;
  END IF;

  EXECUTE format('SELECT count(*) FROM public.%I', p_staging_table) INTO v_count_staging;
  v_t_validate := clock_timestamp();

  RAISE NOTICE 'swap_started: target=%, staging_rows=%', p_target_table, v_count_staging;

  EXECUTE format('ALTER TABLE public.%I DISABLE TRIGGER ALL', p_target_table);
  v_t_disable := clock_timestamp();

  EXECUTE format('TRUNCATE TABLE public.%I', p_target_table);
  v_t_truncate := clock_timestamp();

  EXECUTE format(
    'INSERT INTO public.%I (data, ingested_at, mes_ano)
       SELECT data, ingested_at, mes_ano FROM public.%I',
    p_target_table, p_staging_table
  );
  GET DIAGNOSTICS v_linhas_inseridas = ROW_COUNT;
  v_t_insert := clock_timestamp();

  EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER ALL', p_target_table);
  v_t_enable := clock_timestamp();

  EXECUTE format('TRUNCATE TABLE public.%I', p_staging_table);
  v_t_trunc_stg := clock_timestamp();

  RAISE NOTICE 'swap_completed: target=%, inserted=%', p_target_table, v_linhas_inseridas;
  RAISE NOTICE '[swap_timing] VALIDATE=%ms | DISABLE=%ms | TRUNCATE_TGT=%ms | INSERT(%)=%ms | ENABLE=%ms | TRUNCATE_STG=%ms | TOTAL=%ms',
    round(extract(epoch from (v_t_validate  - v_t_inicio))   * 1000),
    round(extract(epoch from (v_t_disable   - v_t_validate)) * 1000),
    round(extract(epoch from (v_t_truncate  - v_t_disable))  * 1000),
    v_linhas_inseridas,
    round(extract(epoch from (v_t_insert    - v_t_truncate)) * 1000),
    round(extract(epoch from (v_t_enable    - v_t_insert))   * 1000),
    round(extract(epoch from (v_t_trunc_stg - v_t_enable))   * 1000),
    round(extract(epoch from (v_t_trunc_stg - v_t_inicio))   * 1000);

  UPDATE public.sync_cursor
     SET status = 'completed',
         completed_at = now(),
         claimed_by = NULL,
         claimed_until = NULL,
         error = NULL,
         updated_at = now()
   WHERE sync_name = p_sync_name;

  RETURN jsonb_build_object('swapped', true, 'rows', v_linhas_inseridas);
END;
$function$;