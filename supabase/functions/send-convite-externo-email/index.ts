// Envia email de convite a usuário externo do Hub.
// Reusa send-transactional-email (template convite-externo).
// verify_jwt=true — só Admin autenticado (ou service_role interno) dispara.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const HUB_BASE_URL = 'https://hub.tailorpartners.com.br'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { email, nome, token, senha_provisoria, empresa } = body ?? {}

    if (!email || !nome || !token || !senha_provisoria) {
      return json({ error: 'missing_fields', required: ['email', 'nome', 'token', 'senha_provisoria'] }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Carrega JWT service_role legacy do Vault (send-transactional-email tem verify_jwt=true)
    const { data: internalJwt, error: jwtErr } = await supabase.rpc('get_email_queue_jwt')
    if (jwtErr || !internalJwt) {
      return json({ error: `failed_to_load_internal_jwt: ${jwtErr?.message || 'empty'}` }, 500)
    }

    const link_ativacao = `${HUB_BASE_URL}/auth/ativar-conta?token=${token}`
    const today = new Date().toISOString().slice(0, 10)

    const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${internalJwt}`,
      },
      body: JSON.stringify({
        templateName: 'convite-externo',
        recipientEmail: email,
        idempotencyKey: `convite-externo-${token}`,
        label: `convite-externo-${today}`,
        templateData: {
          nome,
          email,
          senha_provisoria,
          token,
          empresa: empresa || null,
          link_ativacao,
          expira_em_dias: 7,
        },
      }),
    })

    const text = await res.text()
    let parsed: any
    try { parsed = JSON.parse(text) } catch { parsed = { raw: text } }

    if (!res.ok) {
      return json({ success: false, status: res.status, response: parsed }, 502)
    }

    return json({ success: true, response: parsed, link_ativacao })
  } catch (e: any) {
    return json({ success: false, error: e?.message || String(e) }, 500)
  }
})

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
