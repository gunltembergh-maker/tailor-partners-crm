

# Atualizar ingest-sharepoint-file com código refinado

## Alteração

**Arquivo:** `supabase/functions/ingest-sharepoint-file/index.ts`

Substituir o conteúdo inteiro pelo código fornecido pelo usuário, que inclui melhorias:

- `decodeURIComponentSafe` para headers com caracteres especiais
- Validação de `sourceKey` antes de consumir o body
- Tratamento de erro mais robusto (`err?.message ?? String(err)`)
- Priorização explícita do modo binário (`application/octet-stream`) sobre JSON+base64
- Verificação adicional de `expectedKey` nulo
- Código mais limpo e comentado

Nenhuma mudança de banco de dados necessária — apenas reescrita do arquivo da Edge Function.

