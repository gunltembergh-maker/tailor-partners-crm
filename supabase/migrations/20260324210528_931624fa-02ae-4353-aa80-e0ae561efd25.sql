
CREATE OR REPLACE FUNCTION public.increment_dashboard_refresh()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_or_lider(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.dashboard_refresh SET version = version + 1, updated_at = now() WHERE id = 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_dashboard_refresh() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_dashboard_refresh() TO authenticated;
