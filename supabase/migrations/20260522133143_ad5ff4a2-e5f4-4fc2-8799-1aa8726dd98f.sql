
-- 1.1. Novas colunas
ALTER TABLE public.email_schedules_config
  ADD COLUMN IF NOT EXISTS hora_brt TIME NOT NULL DEFAULT '08:30:00',
  ADD COLUMN IF NOT EXISTS cron_jobid BIGINT;

COMMENT ON COLUMN public.email_schedules_config.hora_brt IS 'Horário local BRT (UTC-3) em que o cron dispara';
COMMENT ON COLUMN public.email_schedules_config.cron_jobid IS 'FK lógica para cron.job.jobid';

-- 1.2. fn_gerar_cron_expression
CREATE OR REPLACE FUNCTION public.fn_gerar_cron_expression(
  p_hora_brt TIME, p_dias_semana INTEGER[]
) RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_hora_utc INTEGER; v_minuto INTEGER;
  v_rollover BOOLEAN; v_dias_final INTEGER[];
BEGIN
  IF p_hora_brt IS NULL OR p_dias_semana IS NULL OR array_length(p_dias_semana, 1) IS NULL THEN
    RAISE EXCEPTION 'hora_brt e dias_semana são obrigatórios';
  END IF;
  v_hora_utc := EXTRACT(HOUR FROM p_hora_brt)::INT + 3;
  v_minuto := EXTRACT(MINUTE FROM p_hora_brt)::INT;
  IF v_hora_utc >= 24 THEN
    v_hora_utc := v_hora_utc - 24; v_rollover := TRUE;
  ELSE
    v_rollover := FALSE;
  END IF;
  IF v_rollover THEN
    SELECT array_agg((d + 1) % 7 ORDER BY (d + 1) % 7)
      INTO v_dias_final FROM unnest(p_dias_semana) d;
  ELSE
    v_dias_final := p_dias_semana;
  END IF;
  RETURN format('%s %s * * %s', v_minuto::TEXT, v_hora_utc::TEXT, array_to_string(v_dias_final, ','));
END;
$$;

-- 1.3. fn_sincronizar_schedule_com_cron
CREATE OR REPLACE FUNCTION public.fn_sincronizar_schedule_com_cron(p_modulo TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE v_config RECORD; v_cron_expr TEXT;
BEGIN
  SELECT * INTO v_config FROM public.email_schedules_config WHERE modulo = p_modulo;
  IF NOT FOUND THEN RAISE EXCEPTION 'Schedule não encontrado: %', p_modulo; END IF;
  IF v_config.cron_jobid IS NULL THEN RAISE EXCEPTION 'cron_jobid não definido para módulo: %', p_modulo; END IF;
  v_cron_expr := public.fn_gerar_cron_expression(v_config.hora_brt, v_config.dias_semana);
  PERFORM cron.alter_job(
    job_id := v_config.cron_jobid,
    schedule := v_cron_expr,
    active := v_config.ativo
  );
  RAISE NOTICE 'Cron jobid % atualizado: schedule=% active=%', v_config.cron_jobid, v_cron_expr, v_config.ativo;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_sincronizar_schedule_com_cron(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_sincronizar_schedule_com_cron(TEXT) TO service_role;

-- 1.4. Trigger
CREATE OR REPLACE FUNCTION public.tg_email_schedules_config_sync()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  IF (OLD.hora_brt IS DISTINCT FROM NEW.hora_brt)
     OR (OLD.dias_semana IS DISTINCT FROM NEW.dias_semana)
     OR (OLD.ativo IS DISTINCT FROM NEW.ativo) THEN
    PERFORM public.fn_sincronizar_schedule_com_cron(NEW.modulo);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_schedules_config_sync ON public.email_schedules_config;
CREATE TRIGGER trg_email_schedules_config_sync
AFTER UPDATE ON public.email_schedules_config
FOR EACH ROW EXECUTE FUNCTION public.tg_email_schedules_config_sync();

-- 1.5. RPC ADMIN
CREATE OR REPLACE FUNCTION public.rpc_atualizar_schedule_config(
  p_modulo TEXT, p_hora_brt TIME, p_dias_semana INTEGER[], p_ativo BOOLEAN
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user_id UUID := auth.uid(); v_is_admin BOOLEAN; v_cron_expr TEXT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Autenticação requerida'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_user_id AND ur.role::TEXT = 'ADMIN') INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Apenas ADMIN pode alterar schedules'; END IF;
  IF array_length(p_dias_semana, 1) IS NULL OR array_length(p_dias_semana, 1) = 0 THEN
    RAISE EXCEPTION 'Selecione ao menos um dia da semana';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_dias_semana) d WHERE d < 0 OR d > 6) THEN
    RAISE EXCEPTION 'dias_semana inválidos. Use 0=Dom até 6=Sáb';
  END IF;
  UPDATE public.email_schedules_config
  SET hora_brt = p_hora_brt, dias_semana = p_dias_semana, ativo = p_ativo, atualizado_em = NOW()
  WHERE modulo = p_modulo;
  IF NOT FOUND THEN RAISE EXCEPTION 'Módulo não encontrado: %', p_modulo; END IF;
  v_cron_expr := public.fn_gerar_cron_expression(p_hora_brt, p_dias_semana);
  RETURN jsonb_build_object('sucesso', TRUE, 'modulo', p_modulo, 'hora_brt', p_hora_brt::TEXT,
    'dias_semana', p_dias_semana, 'ativo', p_ativo, 'cron_expression', v_cron_expr);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_atualizar_schedule_config(TEXT, TIME, INTEGER[], BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_atualizar_schedule_config(TEXT, TIME, INTEGER[], BOOLEAN) TO authenticated;

-- 1.6. Próxima execução
CREATE OR REPLACE FUNCTION public.rpc_proxima_execucao_schedule(p_modulo TEXT)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_config RECORD; v_proxima TIMESTAMPTZ; v_data DATE := CURRENT_DATE; v_tentativas INT := 0;
BEGIN
  SELECT * INTO v_config FROM public.email_schedules_config WHERE modulo = p_modulo;
  IF NOT FOUND OR NOT v_config.ativo THEN RETURN NULL; END IF;
  WHILE v_tentativas < 8 LOOP
    IF EXTRACT(DOW FROM v_data)::INT = ANY(v_config.dias_semana) THEN
      v_proxima := (v_data + v_config.hora_brt) AT TIME ZONE 'America/Sao_Paulo';
      IF v_proxima > NOW() THEN RETURN v_proxima; END IF;
    END IF;
    v_data := v_data + 1; v_tentativas := v_tentativas + 1;
  END LOOP;
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_proxima_execucao_schedule(TEXT) TO authenticated;
