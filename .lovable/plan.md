

# Criar secret SERVICE_ROLE_KEY e atualizar Edge Function

## Situacao
O secret `SUPABASE_SERVICE_ROLE_KEY` ja existe automaticamente. O usuario quer criar um novo secret chamado `SERVICE_ROLE_KEY` e atualizar o codigo para usa-lo.

## Plano

1. **Criar o secret `SERVICE_ROLE_KEY`** — Usar a ferramenta de adicao de secrets para solicitar ao usuario o valor (que sera o mesmo da Service Role Key do projeto).

2. **Atualizar `supabase/functions/ingest-sharepoint-file/index.ts`** — Trocar `SUPABASE_SERVICE_ROLE_KEY` por `SERVICE_ROLE_KEY` na funcao `getSupabaseClient()`.

## Nota
O valor do secret pode ser encontrado na aba **Cloud > Secrets** do projeto. O usuario precisara copiar o valor de `SUPABASE_SERVICE_ROLE_KEY` e cola-lo ao criar o novo `SERVICE_ROLE_KEY`.

