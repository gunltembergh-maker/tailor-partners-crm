
-- ========== 1. Tabela sync_cursor ==========
CREATE TABLE IF NOT EXISTS public.sync_cursor (
  sync_name text PRIMARY KEY,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','stale')),
  started_at timestamptz NOT NULL DEFAULT now(),
  last_heartbeat timestamptz NOT NULL DEFAULT now(),
  next_window_start integer NOT NULL DEFAULT 2,
  total_rows_seen integer NOT NULL DEFAULT 0,
  total_rows_target integer,
  attempts integer NOT NULL DEFAULT 0,
  error text,
  claimed_by uuid,
  claimed_until timestamptz,
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sync_cursor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read sync_cursor"
  ON public.sync_cursor FOR SELECT
  TO authenticated
  USING (is_admin_or_lider(auth.uid()));

CREATE POLICY "Service role sync_cursor"
  ON public.sync_cursor FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ========== 2. Tabela staging para historico ==========
CREATE TABLE IF NOT EXISTS public.raw_comissoes_historico_staging (
  LIKE public.raw_comissoes_historico INCLUDING DEFAULTS
);

ALTER TABLE public.raw_comissoes_historico_staging ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read raw_comissoes_historico_staging"
  ON public.raw_comissoes_historico_staging FOR SELECT
  TO authenticated
  USING (is_admin_or_lider(auth.uid()));

CREATE POLICY "Service role raw_comissoes_historico_staging"
  ON public.raw_comissoes_historico_staging FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ========== 3. RPCs ==========

-- Inicializa o sync do dia (idempotente: se já completou hoje, retorna already_done)
CREATE OR REPLACE FUNCTION public.rpc_sync_cursor_init_daily(p_sync_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.sync_cursor;
BEGIN
  SELECT * INTO v_existing FROM public.sync_cursor WHERE sync_name = p_sync_name;

  IF FOUND
     AND v_existing.status = 'completed'
     AND v_existing.completed_at::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'already_completed_today', 'completed_at', v_existing.completed_at);
  END IF;

  -- Limpa staging
  IF p_sync_name = 'historico_completo' THEN
    EXECUTE 'TRUNCATE TABLE public.raw_comissoes_historico_staging';
  END IF;

  INSERT INTO public.sync_cursor (sync_name, status, started_at, last_heartbeat,
    next_window_start, total_rows_seen, total_rows_target, attempts, error,
    claimed_by, claimed_until, completed_at, metadata, updated_at)
  VALUES (p_sync_name, 'pending', now(), now(), 2, 0, NULL, 0, NULL, NULL, NULL, NULL, '{}'::jsonb, now())
  ON CONFLICT (sync_name) DO UPDATE SET
    status = 'pending',
    started_at = now(),
    last_heartbeat = now(),
    next_window_start = 2,
    total_rows_seen = 0,
    total_rows_target = NULL,
    attempts = 0,
    error = NULL,
    claimed_by = NULL,
    claimed_until = NULL,
    completed_at = NULL,
    metadata = '{}'::jsonb,
    updated_at = now();

  RETURN jsonb_build_object('initialized', true, 'sync_name', p_sync_name);
END;
$$;

-- Claim atômico (lease de 10min)
CREATE OR REPLACE FUNCTION public.rpc_sync_cursor_claim(p_sync_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim uuid := gen_random_uuid();
  v_row public.sync_cursor;
BEGIN
  UPDATE public.sync_cursor
     SET status = 'running',
         claimed_by = v_claim,
         claimed_until = now() + interval '10 minutes',
         attempts = attempts + 1,
         updated_at = now(),
         last_heartbeat = now()
   WHERE sync_name = p_sync_name
     AND status IN ('pending','running','stale')
     AND (claimed_until IS NULL OR claimed_until < now())
   RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('claimed', false);
  END IF;

  RETURN jsonb_build_object(
    'claimed', true,
    'claim_id', v_claim,
    'next_window_start', v_row.next_window_start,
    'total_rows_seen', v_row.total_rows_seen,
    'total_rows_target', v_row.total_rows_target,
    'attempts', v_row.attempts
  );
END;
$$;

-- Heartbeat + atualiza progresso (renova lease)
CREATE OR REPLACE FUNCTION public.rpc_sync_cursor_heartbeat(
  p_sync_name text,
  p_claim uuid,
  p_next_window_start integer,
  p_total_rows_seen integer,
  p_total_rows_target integer DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sync_cursor
     SET last_heartbeat = now(),
         claimed_until = now() + interval '10 minutes',
         next_window_start = p_next_window_start,
         total_rows_seen = p_total_rows_seen,
         total_rows_target = COALESCE(p_total_rows_target, total_rows_target),
         updated_at = now()
   WHERE sync_name = p_sync_name AND claimed_by = p_claim;
  RETURN FOUND;
END;
$$;

-- Swap atômico staging → produção
CREATE OR REPLACE FUNCTION public.rpc_sync_cursor_complete_swap(
  p_sync_name text,
  p_claim uuid,
  p_target_table text,
  p_staging_table text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count_staging bigint;
  v_owns boolean;
BEGIN
  -- Valida claim
  SELECT EXISTS (
    SELECT 1 FROM public.sync_cursor
     WHERE sync_name = p_sync_name AND claimed_by = p_claim
  ) INTO v_owns;

  IF NOT v_owns THEN
    RAISE EXCEPTION 'Claim inválido para %', p_sync_name;
  END IF;

  -- Whitelist tabelas permitidas
  IF p_target_table NOT IN ('raw_comissoes_historico')
     OR p_staging_table NOT IN ('raw_comissoes_historico_staging') THEN
    RAISE EXCEPTION 'Tabela não permitida no swap: % ← %', p_target_table, p_staging_table;
  END IF;

  EXECUTE format('SELECT count(*) FROM public.%I', p_staging_table) INTO v_count_staging;

  -- Swap atômico
  EXECUTE format('TRUNCATE TABLE public.%I', p_target_table);
  EXECUTE format(
    'INSERT INTO public.%I SELECT * FROM public.%I',
    p_target_table, p_staging_table
  );
  EXECUTE format('TRUNCATE TABLE public.%I', p_staging_table);

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
$$;

-- Marca como falho
CREATE OR REPLACE FUNCTION public.rpc_sync_cursor_fail(
  p_sync_name text, p_claim uuid, p_error text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sync_cursor
     SET status = 'failed',
         error = p_error,
         claimed_by = NULL,
         claimed_until = NULL,
         updated_at = now()
   WHERE sync_name = p_sync_name AND (p_claim IS NULL OR claimed_by = p_claim);
  RETURN FOUND;
END;
$$;

-- Libera lease (sem mudar status — próximo worker continua)
CREATE OR REPLACE FUNCTION public.rpc_sync_cursor_release(
  p_sync_name text, p_claim uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sync_cursor
     SET claimed_by = NULL,
         claimed_until = NULL,
         updated_at = now()
   WHERE sync_name = p_sync_name AND claimed_by = p_claim;
  RETURN FOUND;
END;
$$;

-- Marca como stale (chamado pelo cron de recovery)
CREATE OR REPLACE FUNCTION public.rpc_sync_cursor_mark_stale()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.sync_cursor
     SET status = 'stale',
         claimed_by = NULL,
         claimed_until = NULL,
         updated_at = now()
   WHERE status = 'running'
     AND last_heartbeat < now() - interval '10 minutes';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Status para UI
CREATE OR REPLACE FUNCTION public.rpc_sync_cursor_status(p_sync_name text DEFAULT NULL)
RETURNS SETOF public.sync_cursor
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.sync_cursor
   WHERE p_sync_name IS NULL OR sync_name = p_sync_name
   ORDER BY started_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_sync_cursor_status(text) TO authenticated;
