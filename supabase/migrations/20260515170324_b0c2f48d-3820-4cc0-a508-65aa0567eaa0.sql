CREATE TABLE IF NOT EXISTS public._backup_mv_v2_pre_fix_20260515 AS
SELECT *, NOW() AS backup_criado_em
FROM public.mv_comissoes_consolidado_v2;

COMMENT ON TABLE public._backup_mv_v2_pre_fix_20260515 IS
'Backup defensivo da mv_comissoes_consolidado_v2 antes do fix da pipeline de Receita Histórica em 15/05/2026. Criado por Alessandro Oliveira. Manter por 30 dias após o fix ser validado em produção.';

ALTER TABLE public._backup_mv_v2_pre_fix_20260515 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_lider_read_backup_mv_v2"
ON public._backup_mv_v2_pre_fix_20260515
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('ADMIN','LIDER')
  )
);