
-- 2.1 Backfill de permissões
UPDATE public.perfis_acesso
SET permissoes = permissoes || jsonb_build_object(
  'menu_dashboards_lavoro', false,
  'menu_dashboards_lavoro_receita', false,
  'menu_relatorios_gerencial_apolices', false,
  'menu_importar_lavoro_gerencial', false,
  'menu_importar_lavoro_caixa', false
),
updated_at = now();

-- 2.2 Funções helper
CREATE OR REPLACE FUNCTION public.pode_ver_dashboard_lavoro(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'ADMIN'
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.perfis_acesso pa ON p.perfil_id = pa.id
    WHERE p.user_id = _user_id AND p.active = true
      AND (
        (pa.permissoes->>'menu_dashboards_lavoro')::boolean = true
        OR (pa.permissoes->>'menu_dashboards_lavoro_receita')::boolean = true
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.pode_ver_relatorio_gerencial_apolices(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'ADMIN'
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.perfis_acesso pa ON p.perfil_id = pa.id
    WHERE p.user_id = _user_id AND p.active = true
      AND (pa.permissoes->>'menu_relatorios_gerencial_apolices')::boolean = true
  );
$$;

CREATE OR REPLACE FUNCTION public.pode_importar_lavoro(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('ADMIN', 'LIDER')
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.perfis_acesso pa ON p.perfil_id = pa.id
    WHERE p.user_id = _user_id AND p.active = true
      AND (
        (pa.permissoes->>'menu_importar_lavoro_gerencial')::boolean = true
        OR (pa.permissoes->>'menu_importar_lavoro_caixa')::boolean = true
      )
  );
$$;

-- 2.3 Substituir policies existentes (nomes reais confirmados via pg_policies)
DROP POLICY IF EXISTS "Admins e lideres podem ver gerencial lavoro" ON public.raw_lavoro_gerencial;
DROP POLICY IF EXISTS "Admins e lideres podem ver caixa lavoro" ON public.raw_lavoro_caixa_comissao;
DROP POLICY IF EXISTS "Admins e lideres podem ver depara lavoro" ON public.raw_lavoro_depara_ramo;

-- raw_lavoro_gerencial
CREATE POLICY "select_lavoro_gerencial" ON public.raw_lavoro_gerencial
FOR SELECT TO authenticated
USING (
  public.pode_ver_dashboard_lavoro(auth.uid())
  OR public.pode_ver_relatorio_gerencial_apolices(auth.uid())
  OR public.pode_importar_lavoro(auth.uid())
);

CREATE POLICY "insert_lavoro_gerencial" ON public.raw_lavoro_gerencial
FOR INSERT TO authenticated
WITH CHECK (public.pode_importar_lavoro(auth.uid()));

-- raw_lavoro_caixa_comissao
CREATE POLICY "select_lavoro_caixa" ON public.raw_lavoro_caixa_comissao
FOR SELECT TO authenticated
USING (
  public.pode_ver_dashboard_lavoro(auth.uid())
  OR public.pode_importar_lavoro(auth.uid())
);

CREATE POLICY "insert_lavoro_caixa" ON public.raw_lavoro_caixa_comissao
FOR INSERT TO authenticated
WITH CHECK (public.pode_importar_lavoro(auth.uid()));

-- raw_lavoro_depara_ramo
CREATE POLICY "select_lavoro_depara_ramo" ON public.raw_lavoro_depara_ramo
FOR SELECT TO authenticated
USING (
  public.pode_ver_dashboard_lavoro(auth.uid())
  OR public.pode_ver_relatorio_gerencial_apolices(auth.uid())
  OR public.pode_importar_lavoro(auth.uid())
);

CREATE POLICY "insert_lavoro_depara_ramo" ON public.raw_lavoro_depara_ramo
FOR INSERT TO authenticated
WITH CHECK (public.pode_importar_lavoro(auth.uid()));
