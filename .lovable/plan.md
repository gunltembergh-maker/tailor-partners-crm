

# Fix ingest-sharepoint-file: Resposta imediata + processamento em background

## Problema
A function atual processa o Excel inteiro antes de responder, causando timeout no Power Automate e erros de "Memory limit exceeded" (visivel nos logs).

## Solucao
Reestruturar para responder HTTP 202 imediatamente e processar o arquivo em background via `EdgeRuntime.waitUntil()`.

## Mudancas no arquivo `supabase/functions/ingest-sharepoint-file/index.ts`

### Fluxo principal (sincrono, <2s):
1. Validar `x-ingest-key` -> 401 se invalido
2. Parse do JSON body
3. Validar `sourceKey` e `contentBase64`
4. Inserir registro em `sync_logs` com `status = "received"`
5. Retornar HTTP 202 `{ ok: true, status: "accepted", sourceKey, fileName }`
6. Disparar `EdgeRuntime.waitUntil(processFileJob(...))`

### Funcao `processFileJob` (background):
1. Decodificar base64 -> bytes
2. Parsear Excel com XLSX
3. Para cada sheet mapeada: truncate + insert em batches de 500
4. Atualizar `sync_logs` para `status = "success"` com `rows_written`
5. Em caso de erro: atualizar `sync_logs` para `status = "error"` com mensagem

### Detalhes tecnicos
- Adicionar `declare const EdgeRuntime: { waitUntil(p: Promise<void>): void }` para tipagem Deno
- O `sync_logs` precisa ser atualizado (nao inserido novamente) — usar `.update().eq("id", logId)` com o ID retornado do insert inicial
- Manter o `contentBase64` em memoria e passa-lo para a funcao background (nao re-parsear o body)

### Nenhum outro arquivo sera alterado

