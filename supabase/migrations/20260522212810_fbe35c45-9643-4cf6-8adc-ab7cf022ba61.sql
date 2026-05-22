
CREATE OR REPLACE VIEW public.vw_email_send_log_consolidado AS
WITH ordenado AS (
  SELECT
    esl.message_id,
    esl.recipient_email,
    esl.template_name,
    esl.status,
    esl.error_message,
    esl.metadata,
    esl.created_at,
    ROW_NUMBER() OVER (
      PARTITION BY esl.message_id
      ORDER BY
        CASE esl.status
          WHEN 'sent'    THEN 1
          WHEN 'failed'  THEN 2
          WHEN 'pending' THEN 3
          ELSE 4
        END,
        esl.created_at DESC
    ) AS rn
  FROM public.email_send_log esl
  WHERE esl.message_id IS NOT NULL
),
agregado AS (
  SELECT
    message_id,
    MIN(created_at) AS enfileirado_em,
    MAX(created_at) AS atualizado_em,
    COUNT(*) AS qtd_eventos,
    BOOL_OR(status = 'sent') AS foi_enviado,
    BOOL_OR(status = 'failed') AS teve_falha,
    BOOL_OR(status = 'pending') AS teve_pending
  FROM public.email_send_log
  WHERE message_id IS NOT NULL
  GROUP BY message_id
)
SELECT
  o.message_id,
  o.recipient_email,
  o.template_name,
  o.status AS status_final,
  o.error_message,
  o.metadata,
  a.enfileirado_em,
  a.atualizado_em,
  EXTRACT(EPOCH FROM (a.atualizado_em - a.enfileirado_em)) AS duracao_processamento_seg,
  a.qtd_eventos,
  a.foi_enviado,
  a.teve_falha
FROM ordenado o
JOIN agregado a ON a.message_id = o.message_id
WHERE o.rn = 1;

COMMENT ON VIEW public.vw_email_send_log_consolidado IS
'Estado final consolidado de cada email enviado, deduplicado por message_id.
A tabela email_send_log eh append-only (event sourcing simples) — cada mudanca de estado eh uma nova linha.
Esta view retorna apenas o estado final por message_id, eliminando falsos positivos de "pending eterno".
Auditorias devem usar esta view, NAO a tabela bruta, pra metricas de sucesso/falha.';

GRANT SELECT ON public.vw_email_send_log_consolidado TO authenticated;
