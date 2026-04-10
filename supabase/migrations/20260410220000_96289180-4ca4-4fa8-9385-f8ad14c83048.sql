
-- Drop both overloads
DROP FUNCTION IF EXISTS public.rpc_sync_bulk_insert(text, jsonb);
DROP FUNCTION IF EXISTS public.rpc_sync_bulk_insert(text, jsonb, boolean);

-- Recreate single version with internal batching
CREATE OR REPLACE FUNCTION public.rpc_sync_bulk_insert(
  p_table text,
  p_rows jsonb,
  p_truncate boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '300s'
AS $$
DECLARE
  v_total int;
  v_inserted int := 0;
  v_batch int;
  v_batch_size int := 500;
  v_offset int := 0;
BEGIN
  -- Only allow raw_ tables
  IF p_table NOT LIKE 'raw_%' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only raw_ tables allowed');
  END IF;

  -- Disable triggers to avoid MV refresh per row
  EXECUTE format('ALTER TABLE public.%I DISABLE TRIGGER ALL', p_table);

  -- Truncate if requested
  IF p_truncate THEN
    EXECUTE format('TRUNCATE TABLE public.%I', p_table);
  END IF;

  -- Get total rows
  v_total := jsonb_array_length(p_rows);

  -- Insert in internal batches
  WHILE v_offset < v_total LOOP
    EXECUTE format(
      'INSERT INTO public.%I (data) 
       SELECT value FROM (
         SELECT value, row_number() OVER () - 1 AS rn 
         FROM jsonb_array_elements($1)
       ) sub 
       WHERE rn >= $2 AND rn < $3',
      p_table
    ) USING p_rows, v_offset, least(v_offset + v_batch_size, v_total);
    
    GET DIAGNOSTICS v_batch = ROW_COUNT;
    v_inserted := v_inserted + v_batch;
    v_offset := v_offset + v_batch_size;
  END LOOP;

  -- Re-enable triggers
  EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER ALL', p_table);

  RETURN jsonb_build_object('success', true, 'count', v_inserted);

EXCEPTION WHEN OTHERS THEN
  BEGIN
    EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER ALL', p_table);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
