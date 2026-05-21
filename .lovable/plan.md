# Prompt 4 — Newsletter Automática Receita Caixa

Implementação completa do cron diário 08h BRT (Seg-Sex, pulando feriados) com lista solta de destinatários, idempotência, controle pausar/reativar e tela admin.

---

## 1. Migration (3 tabelas + 5 RPCs)

**Tabelas novas:**
- `email_destinatarios_automaticos` — lista solta `(user_id, modulo)` com `ativo`, `adicionado_por`. UNIQUE(user_id, modulo). RLS: ADMIN only.
- `email_disparos_automaticos` — histórico com UNIQUE(modulo, data_envio) garantindo idempotência. Campos: status, sucessos, falhas, forcado_por, detalhes_erro. RLS SELECT para ADMIN.
- `email_schedules_config` — controle por módulo (ativo, horario, dias_semana, pausado_por/em/motivo). RLS ADMIN.

**Pré-populações:**
- Alessandro como destinatário ativo de `receita_caixa`.
- Config `receita_caixa` ativa, 08:00, Seg-Sex.

**RPCs SECURITY DEFINER (search_path=public):**
- `rpc_listar_destinatarios_automaticos(p_modulo)` — join com profiles + user_roles
- `rpc_adicionar_destinatario_automatico(p_user_id, p_modulo)` — valida ADMIN, upsert
- `rpc_remover_destinatario_automatico(p_id)` — valida ADMIN, delete hard
- `rpc_toggle_schedule(p_modulo, p_motivo)` — alterna ativo, registra pausado_por/em
- `rpc_historico_disparos(p_modulo, p_limit)` — últimos N disparos com nome de quem forçou

**Nova permissão granular:** `gerenciar_emails_schedules` adicionada ao `perfis_acesso` (backfill ADMIN=true) seguindo padrão do projeto.

---

## 2. Edge Function `send-receita-caixa-automatic`

`supabase/functions/send-receita-caixa-automatic/index.ts` + entrada em `config.toml` com `verify_jwt = false`.

**Fluxo:**
1. Lê body (opcional): `{ force?: bool, user_id?: uuid }`
2. Lê config do módulo — se pausado e `!force` → `skipped: schedule_pausado`
3. Se `!force`, chama `is_dia_util(hoje)` — se não, skip
4. Verifica `email_disparos_automaticos` por `(modulo, data_envio)` — se existe → `skipped: ja_disparado_hoje`
5. Busca destinatários ativos com join em profiles
6. Insere registro `em_processamento` (UNIQUE constraint protege race)
7. Loop: para cada destinatário invoca `send-transactional-email` com `templateName='receita-caixa-newsletter'`, `idempotencyKey=auto-receita_caixa-{data}-{user_id}`, `label=auto-receita_caixa-{data}`
8. Atualiza disparo com sucessos/falhas/status (`concluido`/`falha_parcial`/`falha_total`)
9. Em caso de falha: insere `notificacoes_admin` + dispara `_example` para todos ADMINs ativos

Auth: usa `SUPABASE_SERVICE_ROLE_KEY` para bypassar RLS.

---

## 3. Cron pg agendado (via tool `supabase--insert`)

Verifica `pg_cron` + `pg_net` habilitados. Cria/atualiza job:

```
jobname: send-receita-caixa-automatic-daily
schedule: 0 11 * * *  (08h BRT)
cmd: net.http_post(url=.../send-receita-caixa-automatic, 
     Authorization=Bearer <vault email_queue_service_role_key>, body={})
```

Se job já existir, faz `cron.unschedule` antes do `cron.schedule`.

---

## 4. Tela `/admin/emails/schedules`

`src/pages/admin/EmailSchedules.tsx` — protegida por `PermissionRoute('gerenciar_emails_schedules')`.

**Componentes:**
- **Card de status** (Newsletter Receita Caixa): badge Ativo/Pausado, último envio (data + counters), próximo envio calculado client-side (próximo dia útil 08h), horário/dias, botões `Pausar`/`Reativar` (modal motivo) e `Disparar agora` (invoca edge com `force:true, user_id`).
- **Lista de destinatários**: tabela com nome/email/role/data, botão `+ Adicionar` reusa modal de busca (`rpc_buscar_usuarios_hub` do Prompt 3) — novo componente leve `AdicionarDestinatarioModal`, botão `Remover` com `AlertDialog`.
- **Histórico**: tabela últimos 30 disparos, badge color-coded por status, indicador manual/automático (forcado_por preenchido), expansível para ver `detalhes_erro`.

**Sidebar:** adicionar entrada "Agendamentos de E-mail" em Admin (visível com `gerenciar_emails_schedules` ou ADMIN). `App.tsx`: registrar rota com `PermissionRoute`.

---

## 5. Arquivos esperados

**Criados:**
- `supabase/migrations/<timestamp>_email_schedules.sql`
- `supabase/functions/send-receita-caixa-automatic/index.ts`
- `src/pages/admin/EmailSchedules.tsx`
- `src/components/email/AdicionarDestinatarioModal.tsx`

**Editados:**
- `supabase/config.toml` — bloco da nova função com `verify_jwt = false`
- `src/App.tsx` — nova rota
- `src/components/AppSidebar.tsx` — item "Agendamentos de E-mail"
- `src/pages/admin/GestaoProfiles.tsx` — checkbox `gerenciar_emails_schedules`
- `src/integrations/supabase/types.ts` — auto-regenerado

---

## 6. Validações (executadas após implementação)

1. `SELECT * FROM cron.job WHERE jobname LIKE 'send-receita%'` — confirmar agendamento
2. Disparo manual via curl → email chega, histórico atualiza
3. Disparo manual 2x → 2ª retorna `skipped: ja_disparado_hoje`
4. Pausar via UI → disparo retorna `skipped: schedule_pausado`
5. Adicionar/remover destinatário via UI
6. Confirmar Alessandro pré-populado: `SELECT * FROM email_destinatarios_automaticos WHERE modulo='receita_caixa'`

---

## Pontos de atenção

- Race condition: confiamos no UNIQUE(modulo, data_envio) — código trata `errCode=23505` retornando skip
- Notificação de falha usa `_example` (conforme NÃO FAZER), com mensagem custom
- Cron usa secret do Vault `email_queue_service_role_key` (já existente, criado pelo email infra setup)
- Sem mexer em `receita-caixa-newsletter.tsx`, `rpc_email_receita_payload`, ou `EnviarEmailReceitaModal`
- `forcado_por` NULL quando vier do cron; preenchido quando vier do botão "Disparar agora"
