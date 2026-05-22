CREATE OR REPLACE FUNCTION public.rpc_sync_cursor_complete_swap(p_sync_name text, p_claim uuid, p_target_table text, p_staging_table text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count_staging bigint;
  v_owns boolean;
BEGIN
  -- Timeout estendido LOCAL à transação (não afeta outras queries do sistema)
  -- 300s = ~10x folga sobre tempo esperado do swap (~30s para 85k linhas JSONB)
  PERFORM set_config('statement_timeout', '300s', true);

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

  RAISE NOTICE 'swap_started: target=%, staging_rows=%', p_target_table, v_count_staging;

  EXECUTE format('ALTER TABLE public.%I DISABLE TRIGGER ALL', p_target_table);
  EXECUTE format('TRUNCATE TABLE public.%I', p_target_table);
  EXECUTE format(
    'INSERT INTO public.%I (data, ingested_at, mes_ano)
       SELECT data, ingested_at, mes_ano FROM public.%I',
    p_target_table, p_staging_table
  );
  EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER ALL', p_target_table);
  EXECUTE format('TRUNCATE TABLE public.%I', p_staging_table);

  RAISE NOTICE 'swap_completed: target=%, inserted=%', p_target_table, v_count_staging;

  UPDATE public.sync_cursor
     SET status = 'completed',
         completed_at = now(),
         claimed_by = NULL,
         claimed_until = NULL,
         error = NULL,
         updated_at = now()
   WHERE sync_name = p_sync_name;

  RETURN jsonb_build_object('swapped', true, 'rows', v_count_staging);
END;
$function$;

UPDATE public.sync_cursor
   SET status = 'pending',
       error = NULL,
       attempts = 0,
       claimed_by = NULL,
       claimed_until = NULL,
       updated_at = NOW()
 WHERE sync_name = 'historico_completo';