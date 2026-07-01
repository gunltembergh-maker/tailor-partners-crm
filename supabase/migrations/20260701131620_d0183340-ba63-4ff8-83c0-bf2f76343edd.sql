
-- FIX 1: Mostrar negativos (remover filtro > 1.00)
CREATE OR REPLACE VIEW public.vw_saldo_consolidado AS
SELECT documento_formatado, cpf_cnpj, cliente_nome, primeiro_nome, tipo_cliente,
       casa, conta, produto, data_referencia, d0, d_mais_1, d_mais_2, d_mais_3,
       total_saldo, banker, advisor, finder, canal, cod_assessor, id_raw, id_carga
FROM public.vw_saldo_desagrupado d
WHERE COALESCE(total_saldo, 0::numeric) <> 0;

-- FIX 2: Zumbi-checker inteligente - reconcilia com raw_saldo_consolidado
CREATE OR REPLACE FUNCTION public.marcar_cargas_zumbis_como_erro()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_carga record;
  v_rows_inseridas integer;
  v_count integer := 0;
BEGIN
  FOR v_carga IN
    SELECT id_carga, total_linhas
    FROM cargas_saldo
    WHERE status_processamento = 'PROCESSANDO'
      AND criado_em < now() - INTERVAL '15 minutes'
  LOOP
    SELECT count(*) INTO v_rows_inseridas
    FROM raw_saldo_consolidado
    WHERE (data ->> '_id_carga')::uuid = v_carga.id_carga;

    IF v_rows_inseridas > 0 THEN
      -- Dados chegaram, apenas o UPDATE final falhou (timeout HTTP). Marca CONCLUIDO.
      UPDATE cargas_saldo
      SET status_processamento = 'CONCLUIDO',
          linhas_validas = v_rows_inseridas,
          mensagem_erro = COALESCE(mensagem_erro,'')
            || ' [Auto-reconciliado: ' || v_rows_inseridas
            || ' linhas confirmadas em raw_saldo_consolidado em '
            || to_char(now(), 'YYYY-MM-DD HH24:MI:SS') || ']',
          finalizado_em = now()
      WHERE id_carga = v_carga.id_carga;
    ELSE
      UPDATE cargas_saldo
      SET status_processamento = 'ERRO',
          mensagem_erro = COALESCE(mensagem_erro,'')
            || ' [Auto-timeout: nenhuma linha em raw_saldo_consolidado após 15min em '
            || to_char(now(), 'YYYY-MM-DD HH24:MI:SS') || ']',
          finalizado_em = now()
      WHERE id_carga = v_carga.id_carga;
    END IF;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$function$;

-- Reconcilia imediatamente cargas em ERRO recentes que na verdade têm dados
UPDATE cargas_saldo c
SET status_processamento = 'CONCLUIDO',
    linhas_validas = sub.qtd,
    mensagem_erro = COALESCE(c.mensagem_erro,'')
      || ' [Reconciliação manual: dados presentes, status corrigido em '
      || to_char(now(), 'YYYY-MM-DD HH24:MI:SS') || ']',
    finalizado_em = COALESCE(c.finalizado_em, now())
FROM (
  SELECT (r.data ->> '_id_carga')::uuid AS id_carga, count(*) AS qtd
  FROM raw_saldo_consolidado r
  GROUP BY 1
) sub
WHERE c.id_carga = sub.id_carga
  AND c.status_processamento = 'ERRO'
  AND c.criado_em > now() - INTERVAL '3 days'
  AND sub.qtd > 0;
