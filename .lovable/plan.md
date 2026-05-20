
# Scaffold do módulo de Email Transacional

Reusa 100% da infra já em produção (`pgmq`, `process-email-queue`, `enqueue_email`, `email_send_log`, `email_send_state`). Não toca em nada de auth.

**Ajuste aplicado:** botão accent do `_template-example.tsx` usa `#0A2337` (navy Tailor), não `#9B6B4A`. Header gradient `#082537 → #0b3d57` mantido.

---

## 1. Migration única

- `suppressed_emails` (email PK lower-case, reason, metadata jsonb, created_at) — RLS: service_role escreve, ADMIN lê.
- `email_unsubscribe_tokens` (token PK, email UNIQUE lower-case, created_at, used_at) — mesma RLS.
- `SELECT pgmq.create('transactional_emails')` + DLQ (idempotente).
- 3 novas chaves em `perfis_acesso.permissoes` (JSONB): `enviar_email_manual`, `gerenciar_emails_destinatarios`, `gerenciar_emails_schedules` (default true só para ADMIN).

---

## 2. Templates compartilhados

`supabase/functions/_shared/transactional-email-templates/`:
- `registry.ts` — `TemplateEntry` + `TEMPLATES`.
- `_template-example.tsx` — header gradient `#082537 → #0b3d57`, body branco, botão accent **`#0A2337`**, fonte system, footer institucional (sem unsubscribe — é appendado pelo sender).

---

## 3. Edge function `send-transactional-email` (verify_jwt = true)

1. Valida JWT + body (Zod): `templateName`, `recipientEmail`, `idempotencyKey?`, `templateData?`, `label?`.
2. Resolve template ou 400.
3. Checa `suppressed_emails` → se suprimido, loga e retorna `{ skipped: true, reason: 'suppressed' }`.
4. Get-or-create `email_unsubscribe_tokens` para o recipient.
5. Renderiza HTML via `@react-email/components` + `renderAsync`.
6. Appenda footer com link `https://hub.tailorpartners.com.br/unsubscribe?token=<token>`.
7. Insere `email_send_log` `status='pending'`.
8. `enqueue_email('transactional_emails', { from, sender_domain: "notify.hub.tailorpartners.com.br", to, subject, html, text, purpose: 'transactional', label, message_id, idempotency_key, unsubscribe_token, queued_at })`.
9. Retorna `{ message_id, queued_at, queued: true }`.

---

## 4. Edge function `handle-email-unsubscribe` (verify_jwt = false)

- `GET /?token=...` → HTML estilizado (mesmo branding) com botão "Confirmar descadastro".
- `POST { token }` → valida token (existe, não usado), em transação marca `used_at` e insere `suppressed_emails (email, reason='unsubscribe')` com ON CONFLICT DO NOTHING.

---

## 5. Página `/unsubscribe` (Vite)

`src/pages/Unsubscribe.tsx` — rota pública. Lê `?token=`, mostra card no design system do Hub, faz POST para `handle-email-unsubscribe` e exibe sucesso/erro.

---

## 6. Edge function `handle-email-suppression` (verify_jwt = false, shared secret)

Webhook genérico: `{ event_type: 'bounce'|'complaint'|'spam', recipient, reason?, metadata? }` → upsert em `suppressed_emails`.

---

## 7. Permissões (UI)

`src/pages/admin/GestaoProfiles.tsx` — nova seção "Comunicações por Email" com 3 toggles. Default ON para ADMIN, OFF para demais.

---

## 8. Tela `/admin/emails/log`

`src/pages/admin/EmailsLog.tsx` (rota protegida por `AdminRoute`).

Query deduplicada por `message_id` (última linha por `created_at desc`). Filtros: `template_name`, `status` (badges), `recipient_email` (search), período (presets 24h/7d/30d + custom, default 7d). Stats cards: Total / Sent / Failed (dlq) / Suppressed. Tabela paginada 50/pág, sort timestamp desc. Apenas leitura. Item adicionado no `AppSidebar` (seção Admin).

---

## 9. Hardcoded

```ts
const SENDER_DOMAIN = "notify.hub.tailorpartners.com.br"
const FROM_DOMAIN   = "hub.tailorpartners.com.br"
const SITE_NAME     = "Hub Grupo Tailor Partners"
```

---

## 10. Validação end-to-end pós-deploy

1. Disparo `_template-example` → `alessandro.oliveira@tailorpartners.com.br` com `{ nome: 'Alessandro', mensagem: 'Teste do módulo transacional.' }`.
2. Confirmar linha `pending` → `sent` em `email_send_log` (cron processa em ≤10s).
3. Validar email recebido (From correto + footer unsubscribe).
4. Clicar no link → página `/unsubscribe` → confirmar.
5. 2º disparo retorna `{ skipped: true, reason: 'suppressed' }` e loga `suppressed`.
6. Tela `/admin/emails/log` mostra os 2 envios.

---

## Arquivos

**Criados:**
- Migration única (tabelas + fila + permissões)
- `supabase/functions/_shared/transactional-email-templates/{registry.ts, _template-example.tsx}`
- `supabase/functions/send-transactional-email/{index.ts, deno.json}`
- `supabase/functions/handle-email-unsubscribe/index.ts`
- `supabase/functions/handle-email-suppression/index.ts`
- `src/pages/Unsubscribe.tsx`
- `src/pages/admin/EmailsLog.tsx`

**Editados:**
- `supabase/config.toml` (3 novas functions)
- `src/App.tsx` (rotas `/unsubscribe`, `/admin/emails/log`)
- `src/components/AppSidebar.tsx` (item Admin → Log de Emails)
- `src/pages/admin/GestaoProfiles.tsx` (seção Email)

**Fora deste scaffold:** templates específicos (Receita Caixa etc.), `email_destinatarios_modulo`, botão de envio manual em Receita, newsletter automática + cron.
