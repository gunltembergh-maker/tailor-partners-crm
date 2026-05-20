/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const SITE_NAME = 'Hub Grupo Tailor Partners'
const SENDER_DOMAIN = 'notify.hub.tailorpartners.com.br'
const FROM_DOMAIN = 'hub.tailorpartners.com.br'
const UNSUBSCRIBE_BASE = 'https://hub.tailorpartners.com.br/unsubscribe'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function isEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function appendUnsubscribeFooter(html: string, unsubscribeUrl: string): string {
  const footer = `
<div style="background-color:#f4f4f5;padding:16px 24px;text-align:center;font-family:'Source Sans 3',Arial,sans-serif;font-size:11px;color:#888;line-height:1.5;">
  Não quer mais receber estes emails do Hub Tailor Partners?
  <a href="${unsubscribeUrl}" style="color:#0A2337;text-decoration:underline;">Descadastrar</a>
</div>
`
  if (html.includes('</body>')) {
    return html.replace('</body>', `${footer}</body>`)
  }
  return html + footer
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { templateName, recipientEmail, idempotencyKey, templateData, label } = body ?? {}

  if (typeof templateName !== 'string' || !templateName) {
    return new Response(JSON.stringify({ error: 'templateName is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (!isEmail(recipientEmail)) {
    return new Response(JSON.stringify({ error: 'recipientEmail must be a valid email' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const entry = TEMPLATES[templateName]
  if (!entry) {
    return new Response(JSON.stringify({ error: `Unknown template: ${templateName}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const emailLower = recipientEmail.toLowerCase()
  const messageId = idempotencyKey || crypto.randomUUID()
  const finalLabel = label || templateName

  // ----- Template-specific payload hydration -----
  // Para receita-caixa-newsletter: SEMPRE recarrega payload do RPC (fonte de verdade).
  // Caller pode opcionalmente passar { anomes_override, em_validacao_override, recipientName } em templateData.
  let resolvedTemplateData: Record<string, any> = templateData ?? {}
  if (templateName === 'receita-caixa-newsletter') {
    const anomesOverride = resolvedTemplateData?.anomes_override ?? null
    const emValidacaoOverride =
      typeof resolvedTemplateData?.em_validacao_override === 'boolean'
        ? resolvedTemplateData.em_validacao_override
        : null
    const { data: rpcPayload, error: rpcErr } = await supabase.rpc('rpc_email_receita_payload', {
      p_anomes_override: anomesOverride,
      p_em_validacao_override: emValidacaoOverride,
    })
    if (rpcErr || !rpcPayload) {
      return new Response(JSON.stringify({ error: `Failed to load receita payload: ${rpcErr?.message || 'empty'}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    resolvedTemplateData = { payload: rpcPayload, recipientName: resolvedTemplateData?.recipientName }
  }


  try {
    // 1. Idempotência: se já existe envio bem-sucedido com esse message_id, retorna
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from('email_send_log')
        .select('id, status')
        .eq('message_id', messageId)
        .in('status', ['sent', 'pending'])
        .maybeSingle()
      if (existing) {
        return new Response(
          JSON.stringify({ message_id: messageId, skipped: true, reason: 'already_queued', existing_status: existing.status }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // 2. Checa supressão
    const { data: suppressed } = await supabase
      .from('suppressed_emails')
      .select('email, reason')
      .ilike('email', emailLower)
      .maybeSingle()

    if (suppressed) {
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: finalLabel,
        recipient_email: recipientEmail,
        status: 'suppressed',
        error_message: `Suppressed (${suppressed.reason})`,
      })
      return new Response(
        JSON.stringify({ message_id: messageId, skipped: true, reason: 'suppressed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Get-or-create unsubscribe token (1 por email)
    let unsubscribeToken: string | null = null
    const { data: existingToken } = await supabase
      .from('email_unsubscribe_tokens')
      .select('token')
      .ilike('email', emailLower)
      .maybeSingle()

    if (existingToken?.token) {
      unsubscribeToken = existingToken.token
    } else {
      unsubscribeToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
      const { error: tokenErr } = await supabase
        .from('email_unsubscribe_tokens')
        .insert({ token: unsubscribeToken, email: emailLower })
      if (tokenErr) {
        // race: alguém criou em paralelo
        const { data: retried } = await supabase
          .from('email_unsubscribe_tokens')
          .select('token')
          .ilike('email', emailLower)
          .maybeSingle()
        if (retried?.token) {
          unsubscribeToken = retried.token
        } else {
          throw new Error(`Failed to create unsubscribe token: ${tokenErr.message}`)
        }
      }
    }

    const unsubscribeUrl = `${UNSUBSCRIBE_BASE}?token=${unsubscribeToken}`

    // 4. Renderiza HTML + plain text
    const Component = entry.component
    const props = resolvedTemplateData
    const rawHtml = await renderAsync(React.createElement(Component, props))
    const text = await renderAsync(React.createElement(Component, props), { plainText: true })
    const html = appendUnsubscribeFooter(rawHtml, unsubscribeUrl)
    const textWithFooter = `${text}\n\n---\nPara não receber mais estes emails, acesse: ${unsubscribeUrl}`

    // 5. Subject
    const subject = typeof entry.subject === 'function'
      ? entry.subject(props)
      : entry.subject

    // 6. Log pending
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: finalLabel,
      recipient_email: recipientEmail,
      status: 'pending',
    })

    // 7. Enqueue
    const queuedAt = new Date().toISOString()
    const { error: enqErr } = await supabase.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        to: recipientEmail,
        from: `Hub Tailor Partners <hub@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text: textWithFooter,
        purpose: 'transactional',
        label: finalLabel,
        idempotency_key: messageId,
        unsubscribe_token: unsubscribeToken,
        queued_at: queuedAt,
      },
    })

    if (enqErr) {
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: finalLabel,
        recipient_email: recipientEmail,
        status: 'failed',
        error_message: `enqueue failed: ${enqErr.message}`,
      })
      return new Response(JSON.stringify({ error: 'Failed to enqueue email', details: enqErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({ message_id: messageId, queued: true, queued_at: queuedAt }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('send-transactional-email error', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
