
CREATE OR REPLACE FUNCTION public.truncate_table(table_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow truncating raw_ tables for safety
  IF table_name NOT LIKE 'raw_%' THEN
    RAISE EXCEPTION 'Only raw_ tables can be truncated';
  END IF;
  EXECUTE format('DELETE FROM %I WHERE id >= 0', table_name);
END;
$function$;
