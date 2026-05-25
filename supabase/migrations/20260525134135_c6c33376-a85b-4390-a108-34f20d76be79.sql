
ALTER TABLE public.email_disparos_automaticos
  DROP CONSTRAINT email_disparos_automaticos_modulo_data_envio_key;

CREATE UNIQUE INDEX email_disparos_modulo_data_sucesso_idx
  ON public.email_disparos_automaticos (modulo, data_envio)
  WHERE status IN ('concluido', 'em_processamento');

COMMENT ON INDEX public.email_disparos_modulo_data_sucesso_idx IS
  'UNIQUE parcial: bloqueia novo INSERT para (modulo, data_envio) apenas quando ja existe disparo concluido ou em processamento. Permite retry de falhas (falha_total, falha_parcial) preservando historico append-only. Aplicado em 25/05/2026 apos race condition refresh-mv.';
