
-- dashboard_refresh: single-row table for signaling dashboard data changes
CREATE TABLE public.dashboard_refresh (
  id int PRIMARY KEY DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  version int NOT NULL DEFAULT 0
);

INSERT INTO public.dashboard_refresh (id, version) VALUES (1, 0);

ALTER TABLE public.dashboard_refresh ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read dashboard_refresh" ON public.dashboard_refresh
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can update dashboard_refresh" ON public.dashboard_refresh
  FOR UPDATE TO authenticated
  USING (is_admin_or_lider(auth.uid()))
  WITH CHECK (is_admin_or_lider(auth.uid()));

-- Function to increment version
CREATE OR REPLACE FUNCTION public.increment_dashboard_refresh()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.dashboard_refresh SET version = version + 1, updated_at = now() WHERE id = 1;
$$;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.dashboard_refresh;
