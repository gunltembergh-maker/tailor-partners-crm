// Monitor diário do disparo da Newsletter Receita Caixa.
// Roda às 09:00 BRT (12:00 UTC), seg-sex.
// Lógica:
//   1. Checa se o disparo de hoje foi 'concluido' em email_disparos_automaticos.
//   2. Se NÃO, tenta auto-corrigir invocando send-receita-caixa-automatic com force=true.
//   3. Espera 90s e re-checa.
//   4. Se ainda falhou, envia alerta para ale.jhn@hotmail.com (e-mail pessoal do owner).
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MODULO = 'receita_caixa'
const OWNER_EMAIL = 'ale.jhn@hotmail.com'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  // Data BRT
  const brt = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const dataEnvio = brt.toISOString().slice(0, 10)

  const log = (msg: string) => console.log(`[monitor-newsletter ${dataEnvio}] ${msg}`)

  try {
    // 0. Dia útil? Se não, sai silencioso.
    const { data: ehDiaUtil } = await supabase.rpc('is_dia_util', { p_data: dataEnvio })
    if (!ehDiaUtil) {
      log('nao_e_dia_util — skip')
      return json({ skipped: true, reason: 'nao_e_dia_util' })
    }

    // 1. Status atual
    const statusAtual = await getStatusDisparoHoje(supabase, dataEnvio)
    log(`status inicial: ${statusAtual ?? 'nenhum'}`)

    if (statusAtual === 'concluido') {
      return json({ ok: true, status: 'concluido', acao: 'nenhuma' })
    }

    // 2. Tentativa de auto-correção: força um novo disparo
    log('auto-fix: invocando send-receita-caixa-automatic com force=true')
    const { data: internalJwt } = await supabase.rpc('get_email_queue_jwt')
    const retryResp = await fetch(`${supabaseUrl}/functions/v1/send-receita-caixa-automatic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${internalJwt}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({ force: true }),
    })
    const retryResult = await retryResp.json().catch(() => ({}))
    log(`retry resp: ${retryResp.status} ${JSON.stringify(retryResult).slice(0, 300)}`)

    // 3. Aguarda processamento (90s) e re-checa
    await new Promise(r => setTimeout(r, 90_000))
    const statusFinal = await getStatusDisparoHoje(supabase, dataEnvio)
    log(`status final pós-retry: ${statusFinal ?? 'nenhum'}`)

    if (statusFinal === 'concluido') {
      // Auto-fix funcionou. Manda e-mail "tudo certo, tive que corrigir".
      await enviarAlerta(supabase, supabaseUrl, serviceKey, internalJwt!, {
        tipo: 'auto_corrigido',
        dataEnvio,
        statusInicial: statusAtual,
        statusFinal,
        retryResp: retryResult,
      })
      return json({ ok: true, status: 'concluido', acao: 'auto_corrigido' })
    }

    // 4. Falhou mesmo após retry — alerta crítico
    const detalhes = await coletarDetalhes(supabase, dataEnvio)
    await enviarAlerta(supabase, supabaseUrl, serviceKey, internalJwt!, {
      tipo: 'falha_critica',
      dataEnvio,
      statusInicial: statusAtual,
      statusFinal,
      retryResp: retryResult,
      detalhes,
    })
    return json({ ok: false, status: statusFinal ?? 'nenhum', acao: 'alerta_enviado' }, 500)
  } catch (err: any) {
    console.error(`[monitor-newsletter] erro fatal:`, err?.message || err)
    // Tenta avisar mesmo em erro fatal
    try {
      const { data: jwt } = await supabase.rpc('get_email_queue_jwt')
      await enviarAlerta(supabase, supabaseUrl, serviceKey, jwt!, {
        tipo: 'erro_monitor',
        dataEnvio,
        erro: err?.message || String(err),
      })
    } catch (_) { /* swallow */ }
    return json({ error: err?.message || 'erro_interno' }, 500)
  }
})

async function getStatusDisparoHoje(supabase: any, dataEnvio: string): Promise<string | null> {
  const { data } = await supabase
    .from('email_disparos_automaticos')
    .select('status')
    .eq('modulo', MODULO)
    .eq('data_envio', dataEnvio)
    .order('disparado_em', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.status ?? null
}

async function coletarDetalhes(supabase: any, dataEnvio: string) {
  const { data: disparos } = await supabase
    .from('email_disparos_automaticos')
    .select('id, status, total_sucessos, total_falhas, detalhes_erro, disparado_em, finalizado_em')
    .eq('modulo', MODULO)
    .eq('data_envio', dataEnvio)
    .order('disparado_em', { ascending: false })

  const inicioBRT = `${dataEnvio}T00:00:00-03:00`
  const { data: logs } = await supabase
    .from('email_send_log')
    .select('status, error_message, recipient_email, created_at')
    .gte('created_at', new Date(inicioBRT).toISOString())
    .in('status', ['failed', 'dlq'])
    .order('created_at', { ascending: false })
    .limit(10)

  return { disparos: disparos || [], ultimas_falhas: logs || [] }
}

async function enviarAlerta(
  supabase: any,
  supabaseUrl: string,
  serviceKey: string,
  internalJwt: string,
  ctx: any,
) {
  // Loga no banco como backup (caso o e-mail não saia)
  await supabase.from('notificacoes_admin').insert({
    tipo: 'monitor_newsletter',
    titulo: `Monitor Newsletter [${ctx.tipo}] — ${ctx.dataEnvio}`,
    mensagem: `Disparo do dia ${ctx.dataEnvio}: ${ctx.tipo}.`,
    dados: ctx,
    lida: false,
  }).then(() => {}, () => {})

  let assunto: string
  let corpo: string

  if (ctx.tipo === 'auto_corrigido') {
    assunto = `[Hub] Newsletter ${ctx.dataEnvio} — corrigida automaticamente`
    corpo = `Olá Alexandre,

O monitor detectou que o disparo da Newsletter Receita Caixa de hoje (${ctx.dataEnvio}) não havia concluído normalmente (status inicial: "${ctx.statusInicial || 'nenhum'}").

Acionei o retry automaticamente e a verificação seguinte confirmou status "concluido". Nenhuma ação necessária.

Detalhes do retry: ${JSON.stringify(ctx.retryResp).slice(0, 500)}

— Monitor automático`
  } else if (ctx.tipo === 'erro_monitor') {
    assunto = `[Hub] ALERTA: monitor da Newsletter falhou em ${ctx.dataEnvio}`
    corpo = `Olá Alexandre,

O monitor automático da Newsletter Receita Caixa quebrou ao tentar verificar o disparo de hoje (${ctx.dataEnvio}).

Erro: ${ctx.erro}

Recomendado: verificar manualmente em /admin/emails/schedules.

— Monitor automático`
  } else {
    // falha_critica
    assunto = `[Hub] ALERTA CRÍTICO: Newsletter ${ctx.dataEnvio} NÃO foi enviada`
    const disparosTxt = (ctx.detalhes?.disparos || [])
      .map((d: any) => `  - ${d.disparado_em}: ${d.status} (sucessos=${d.total_sucessos}, falhas=${d.total_falhas})`)
      .join('\n') || '  (nenhum disparo registrado hoje)'
    const falhasTxt = (ctx.detalhes?.ultimas_falhas || [])
      .map((l: any) => `  - ${l.recipient_email}: ${l.error_message || l.status}`)
      .join('\n') || '  (sem falhas em email_send_log)'

    corpo = `Olá Alexandre,

ALERTA: A Newsletter Receita Caixa de ${ctx.dataEnvio} NÃO foi disparada mesmo após retry automático.

STATUS:
  Inicial: ${ctx.statusInicial || 'nenhum disparo'}
  Após retry: ${ctx.statusFinal || 'nenhum disparo'}

RESPOSTA DO RETRY:
  ${JSON.stringify(ctx.retryResp).slice(0, 500)}

DISPAROS DO DIA:
${disparosTxt}

ÚLTIMAS FALHAS DE ENVIO (email_send_log):
${falhasTxt}

PRÓXIMOS PASSOS:
  1. Verificar /admin/emails/schedules e /admin/emails/log no Hub.
  2. Se o erro for "Emails disabled for this project" ou "403 domain_not_verified":
     → Lovable Emails está desligado ou o domínio notify.hub.tailorpartners.com.br
       voltou ao status "Drifted". Abrir ticket no suporte da Lovable
       (support@lovable.dev) pedindo re-provisionamento do subdomínio.
  3. Se o erro for outro, verificar logs da edge function send-receita-caixa-automatic.

TEXTO PRONTO PARA TICKET (se necessário):
---
Subject: Email domain stuck in "Drifted" status — needs re-provisioning

Hi Lovable Support,

Our email sending domain notify.hub.tailorpartners.com.br is failing again.
DNS records are correctly published (verified via Google DNS 8.8.8.8):
  - NS → ns7.lovable.cloud + ns8.lovable.cloud
  - TXT _lovable-email.hub.tailorpartners.com.br → lovable_email_verify=56aaf1a0...

Project: Hub Tailor Partners
Published URL: https://hub.tailorpartners.com.br

Please re-provision the subdomain on your side.

Thanks!
---

— Monitor automático`
  }

  // Envia via send-transactional-email usando o template _example (texto livre)
  const resp = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${internalJwt}`,
      apikey: serviceKey,
    },
    body: JSON.stringify({
      templateName: '_example',
      recipientEmail: OWNER_EMAIL,
      templateData: { nome: 'Alexandre', mensagem: corpo },
      idempotencyKey: `monitor-${MODULO}-${ctx.dataEnvio}-${ctx.tipo}`,
      label: `monitor-newsletter-${ctx.tipo}`,
    }),
  })
  if (!resp.ok) {
    const t = await resp.text().catch(() => '')
    console.error(`[monitor-newsletter] alerta NÃO entregue: HTTP ${resp.status} ${t.slice(0, 300)}`)
  } else {
    console.log(`[monitor-newsletter] alerta "${ctx.tipo}" enfileirado para ${OWNER_EMAIL}`)
  }
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
