

# Plano: Reestruturar Sincronização SharePoint (2 Camadas)

## Resumo
Separar a sincronização da Base Receita em 3 modos: M0 diário, M-1 condicional (primeiros 10 dias uteis), e Historico completo mensal. Atualizar a UI com 3 botoes distintos e painel de status.

## Escopo das Mudancas

### 1. Migration SQL — Funcoes de controle e RPCs

- Criar `fn_dentro_periodo_m1()`, `fn_anomes_m1()`, `fn_anomes_m0()`
- Criar `rpc_truncar_historico()` (SECURITY DEFINER, service_role only)
- Criar `rpc_deletar_anomes_historico(p_anomes integer)` (delete linhas de um mes especifico)
- Criar `rpc_deletar_anomes_lista_historico(p_anomes_list integer[])` (delete por lista de meses — para sync mensal seguro)
- Atualizar view `comissoes_consolidado_filtrado` conforme especificado (UNION ALL simples sem deduplicacao complexa)

### 2. Edge Function `sync-sharepoint/index.ts` — Nova logica de receita

Adicionar novo modo de invocacao via body params:
- `sync_mode: "m0"` — Sync apenas aba "Comissoes" para `raw_comissoes_m0` (truncate + insert)
- `sync_mode: "m1"` — Sync aba "Comissoes Historico", mas deleta apenas linhas do mes M-1 via `rpc_deletar_anomes_historico`, depois insere apenas os dados de M-1
- `sync_mode: "historico_completo"` — Sync completo em cascade (comportamento atual com chunks)
- `sync_mode: "historico_mensal"` — Sync seguro chunk por chunk: para cada chunk, identifica anomes, deleta esses meses, insere chunk (sem truncate global)

Quando `tipo=automatico` e `arquivo=base_receita`:
- Sempre faz M0
- Chama `fn_dentro_periodo_m1()` — se true, faz M-1 tambem
- NAO faz historico completo

### 3. Cron Jobs — Reestruturar via insert tool

**Remover jobs antigos:**
- Unschedule jobs 17-22, 24-25 (historico p1-p7 diarios e o orchestrador)

**Criar novos jobs:**

Diarios (07h BRT = 10h UTC):
- `sync-receita-m0-diario` — 10:00 — `{"tipo":"automatico","arquivo":"base_receita","sync_mode":"m0"}`
- `sync-receita-m1-diario` — 10:05 — `{"tipo":"automatico","arquivo":"base_receita","sync_mode":"m1"}` (a edge function decide internamente se executa baseado em fn_dentro_periodo_m1)
- Manter jobs existentes: captacao total (10:08), captacao historico (10:10), positivador (10:05→10:12), diversificador (10:02→10:18), base_contas (10:00→10:08), depara (10:01→10:20)
- Novo job `refresh-mv-diario` — 10:25 — chama `rpc_refresh_mv_comissoes`

Mensais (dia 1, 06h BRT = 09h UTC):
- `sync-historico-mensal-p1` — `0 9 1 * *` — `{"tipo":"automatico","arquivo":"base_receita","sync_mode":"historico_mensal","start_row":2,"end_row":40001}`
- `sync-historico-mensal-p2` — `8 9 1 * *`
- `sync-historico-mensal-p3` — `16 9 1 * *`
- `sync-historico-mensal-p4` — `24 9 1 * *` (condicional >120k)
- `sync-historico-mensal-p5` — `32 9 1 * *` (condicional >160k)
- `sync-historico-mensal-p6` — `40 9 1 * *` (condicional >200k)
- `refresh-mv-mensal` — `48 9 1 * *`

### 4. Frontend `ImportarBases.tsx` — 3 botoes + painel de status

**Painel de Status:**
- Busca COUNT de `raw_comissoes_historico`, COUNT de `raw_comissoes_m0`
- Busca `fn_dentro_periodo_m1()` para mostrar se periodo M-1 esta ativo
- Busca ultimo sync_log para mostrar ultima sincronizacao
- Layout visual conforme especificado pelo usuario

**3 Botoes:**
1. "Atualizar Dados do Dia" (M0) — sempre disponivel, badge "~1 minuto", chama `sync_mode: "m0"`
2. "Reprocessar Mes Anterior" (M-1) — disponivel apenas se `fn_dentro_periodo_m1()` = true, mostra dias restantes, badge "~2 minutos", chama `sync_mode: "m1"`  
3. "Sincronizar Historico Completo" — sempre disponivel com alerta de confirmacao, badge "~5 minutos", chama `sync_mode: "historico_completo"`

Substituir o botao unico "Sincronizar Agora" por esses 3 botoes com cards individuais.

### 5. Arquivos modificados

| Arquivo | Tipo de mudanca |
|---|---|
| Migration SQL (novo) | Funcoes de controle + RPCs + view atualizada |
| `supabase/functions/sync-sharepoint/index.ts` | Nova logica sync_mode para receita |
| `src/pages/ImportarBases.tsx` | 3 botoes + painel de status |
| Cron jobs (via insert tool) | Remover diarios de historico, criar mensais |

### Detalhes Tecnicos

**Sync M-1 seguro:** A edge function chama `fn_dentro_periodo_m1()` via RPC. Se false, retorna imediatamente sem processar. Se true, chama `rpc_deletar_anomes_historico(anomes_m1)` e depois insere apenas as linhas do mes M-1 extraidas do SharePoint (filtrando pelo campo Data).

**Sync mensal seguro (sem truncate):** Para cada chunk, a funcao le os dados do SharePoint, identifica os anomes distintos presentes no chunk, chama `rpc_deletar_anomes_lista_historico(anomes_list)` para deletar apenas esses meses, e depois insere o chunk. Se um chunk falhar, os outros meses permanecem intactos.

**View simplificada:** Remove a logica de deduplicacao complexa (subquery que verifica meses do historico para excluir do M0), substituindo por UNION ALL direto — confiando que M0 contem apenas o mes atual e o historico contem tudo ate M-1.

