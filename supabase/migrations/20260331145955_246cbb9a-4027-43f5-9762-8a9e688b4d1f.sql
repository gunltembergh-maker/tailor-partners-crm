CREATE OR REPLACE FUNCTION public.rpc_sync_bulk_insert(p_table text, p_rows jsonb, p_truncate boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count int := 0;
  v_row   jsonb;
BEGIN
  -- Desabilitar triggers de refresh na tabela
  EXECUTE format('ALTER TABLE public.%I DISABLE TRIGGER ALL', p_table);

  -- Truncar a tabela apenas se solicitado
  IF p_truncate THEN
    EXECUTE format('TRUNCATE TABLE public.%I', p_table);
  END IF;

  -- Inserir todas as linhas
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    EXECUTE format('INSERT INTO public.%I (data) VALUES ($1)', p_table)
    USING v_row;
    v_count := v_count + 1;
  END LOOP;

  -- Reabilitar triggers
  EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER ALL', p_table);

  RETURN jsonb_build_object('success', true, 'count', v_count);

EXCEPTION WHEN OTHERS THEN
  -- Garantir que triggers sejam reabilitados mesmo em erro
  BEGIN
    EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER ALL', p_table);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;