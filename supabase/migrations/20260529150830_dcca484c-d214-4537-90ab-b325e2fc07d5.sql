CREATE TABLE IF NOT EXISTS public.hub_admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  descricao TEXT,
  atualizado_por UUID REFERENCES auth.users(id),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.hub_admin_settings IS
'Configurações administrativas globais do Hub. Chave-valor genérico para flags, overrides e parâmetros configuráveis pelo Admin sem precisar de migration.';

COMMENT ON COLUMN public.hub_admin_settings.value IS
'JSONB para flexibilidade. Ex: {"enabled": true}, {"valor": 5}, {"data": "2026-06-08"}';

GRANT SELECT ON public.hub_admin_settings TO authenticated;
GRANT SELECT ON public.hub_admin_settings TO anon;
GRANT ALL ON public.hub_admin_settings TO service_role;

ALTER TABLE public.hub_admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hub_admin_settings_select_authenticated" ON public.hub_admin_settings;
CREATE POLICY "hub_admin_settings_select_authenticated"
ON public.hub_admin_settings FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "hub_admin_settings_select_anon" ON public.hub_admin_settings;
CREATE POLICY "hub_admin_settings_select_anon"
ON public.hub_admin_settings FOR SELECT
TO anon
USING (true);

INSERT INTO public.hub_admin_settings (key, value, descricao)
VALUES (
  'em_validacao_override',
  jsonb_build_object('mode', 'auto'),
  'Override admin para feature "Dados em validação". mode=auto usa regra 5º DU. mode=force_on sempre mostra. mode=force_off nunca mostra.'
)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.rpc_get_em_validacao()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_override JSONB;
  v_mode TEXT;
  v_em_validacao BOOLEAN;
  v_calc RECORD;
  v_atualizado_em TIMESTAMPTZ;
  v_atualizado_por UUID;
BEGIN
  SELECT value, atualizado_em, atualizado_por
    INTO v_override, v_atualizado_em, v_atualizado_por
  FROM public.hub_admin_settings
  WHERE key = 'em_validacao_override';

  v_mode := COALESCE(v_override->>'mode', 'auto');

  SELECT em_validacao, anomes_ref, mes_int, ano_int, dia_util_corrente
    INTO v_calc
    FROM calcular_mes_referencia_email();

  IF v_mode = 'force_on' THEN
    v_em_validacao := true;
  ELSIF v_mode = 'force_off' THEN
    v_em_validacao := false;
  ELSE
    v_em_validacao := v_calc.em_validacao;
  END IF;

  RETURN jsonb_build_object(
    'em_validacao', v_em_validacao,
    'mode', v_mode,
    'mes_ref', v_calc.anomes_ref,
    'mes_int', v_calc.mes_int,
    'ano_int', v_calc.ano_int,
    'dia_util_corrente', v_calc.dia_util_corrente,
    'override_atualizado_em', v_atualizado_em,
    'override_atualizado_por', v_atualizado_por
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_em_validacao() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_em_validacao() TO anon;

CREATE OR REPLACE FUNCTION public.rpc_set_em_validacao_override(p_mode TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_admin BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = v_user_id AND ur.role::text = 'ADMIN'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_admin');
  END IF;

  IF p_mode NOT IN ('auto', 'force_on', 'force_off') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_mode',
      'allowed', jsonb_build_array('auto', 'force_on', 'force_off'));
  END IF;

  INSERT INTO public.hub_admin_settings (key, value, descricao, atualizado_por, atualizado_em)
  VALUES (
    'em_validacao_override',
    jsonb_build_object('mode', p_mode),
    'Override admin para feature "Dados em validação". mode=auto usa regra 5º DU. mode=force_on sempre mostra. mode=force_off nunca mostra.',
    v_user_id,
    NOW()
  )
  ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    atualizado_por = EXCLUDED.atualizado_por,
    atualizado_em = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'mode', p_mode,
    'atualizado_em', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_set_em_validacao_override(TEXT) TO authenticated;