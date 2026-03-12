

# Atualizar ingest-sharepoint-file para suportar upload binário

## O que muda

Adicionar suporte a dois modos de recebimento de arquivo na Edge Function:

1. **JSON com base64** (modo atual) — `Content-Type: application/json` com `{ sourceKey, contentBase64, ... }`
2. **Binário direto** (novo) — `Content-Type: application/octet-stream` com headers `x-source-key`, `x-file-name`, `x-source-path`

## Alteração

**Arquivo:** `supabase/functions/ingest-sharepoint-file/index.ts`

- Refatorar o bloco dentro de `Deno.serve` para detectar `content-type` e extrair `sourceKey`, `fileName`, `sourcePath` e `fileBytes` conforme o modo.
- Remover o parâmetro `contentBase64` de `processFileJob` — passar `fileBytes: Uint8Array` diretamente.
- Atualizar `processFileJob` para receber `Uint8Array` em vez de `string` (eliminar a decodificação base64 interna).
- Manter validação `x-ingest-key`, resposta 202, e `EdgeRuntime.waitUntil`.

