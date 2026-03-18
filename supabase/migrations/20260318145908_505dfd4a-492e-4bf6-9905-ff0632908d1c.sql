
-- Create 10 new raw_* tables for DePara expanded sheets
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'raw_base_consolidada','raw_base_cambio','raw_base_gestora',
    'raw_base_corp_seguros','raw_base_avenue','raw_base_fo',
    'raw_base_lavoro','raw_desligados','raw_produzido_historico','raw_podio'
  ] LOOP
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS public.%I (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        data jsonb NOT NULL,
        ingested_at timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;
    ', tbl, tbl);

    -- RLS: anon insert
    EXECUTE format('
      CREATE POLICY "Anon can insert %1$s" ON public.%1$I FOR INSERT TO anon WITH CHECK (true);
    ', tbl);
    -- RLS: anon delete
    EXECUTE format('
      CREATE POLICY "Anon can delete %1$s" ON public.%1$I FOR DELETE TO anon USING (true);
    ', tbl);
    -- RLS: admin read
    EXECUTE format('
      CREATE POLICY "Admins read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (is_admin_or_lider(auth.uid()));
    ', tbl);
    -- RLS: authenticated admin insert
    EXECUTE format('
      CREATE POLICY "Authenticated admin can insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (is_admin_or_lider(auth.uid()));
    ', tbl);
    -- RLS: authenticated admin delete
    EXECUTE format('
      CREATE POLICY "Authenticated admin can delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (is_admin_or_lider(auth.uid()));
    ', tbl);
    -- RLS: service_role all
    EXECUTE format('
      CREATE POLICY "Service role %1$s" ON public.%1$I FOR ALL TO service_role USING (true) WITH CHECK (true);
    ', tbl);
  END LOOP;
END;
$$;
