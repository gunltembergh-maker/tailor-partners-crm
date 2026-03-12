

# Ajustar ingest-sharepoint-file para usar ANON_KEY

## Problema
A função usa `SUPABASE_SERVICE_ROLE_KEY` que pode não estar disponível. O usuário quer usar apenas `SUPABASE_ANON_KEY` (disponível automaticamente no runtime).

## Plano

### 1. Migração SQL — Adicionar políticas RLS para anon role nas tabelas raw_* e sync_logs

Criar políticas permissivas para o role `anon` em todas as tabelas usadas pela função:

- `sync_logs` — INSERT, UPDATE, SELECT para anon
- `raw_captacao_total` — DELETE, INSERT para anon
- `raw_contas_total` — DELETE, INSERT para anon
- `raw_diversificador_consolidado` — DELETE, INSERT para anon
- `raw_posicao_renda_fixa` — DELETE, INSERT para anon
- `raw_saldo_consolidado` — DELETE, INSERT para anon
- `raw_base_crm` — DELETE, INSERT para anon
- `raw_depara` — DELETE, INSERT para anon
- `raw_ordem_pl` — DELETE, INSERT para anon
- `raw_positivador_total_desagrupado` — DELETE, INSERT para anon
- `raw_positivador_total_agrupado` — DELETE, INSERT para anon
- `raw_positivador_m0_desagrupado` — DELETE, INSERT para anon
- `raw_positivador_m0_agrupado` — DELETE, INSERT para anon
- `raw_comissoes_historico` — DELETE, INSERT para anon
- `raw_comissoes_m0` — DELETE, INSERT para anon
- `raw_envios_nps` — DELETE, INSERT para anon
- `raw_nps_advisor` — DELETE, INSERT para anon

Cada política terá `USING (true)` / `WITH CHECK (true)` — fase 1 sem segurança granular.

### 2. Atualizar Edge Function `supabase/functions/ingest-sharepoint-file/index.ts`

Trocar `getSupabaseClient()` para:
```typescript
function getSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );
}
```

Manter tudo o mais inalterado: `verify_jwt = false`, validação `x-ingest-key`, resposta 202, `waitUntil`.

### Nota de segurança
Na fase 2, essas políticas anon deverão ser removidas e substituídas por validação adequada (ex: custom claims ou service role restrito).

