import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const webhookSecret = Deno.env.get('EMAIL_SUPPRESSION_WEBHOOK_SECRET')

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Shared secret (opcional — se configurado, exige header)
  if (webhookSecret) {
    const provided = req.headers.get('x-webhook-secret')
    if (provided !== webhookSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { event_type, recipient, reason, metadata } = body ?? {}

  const VALID_EVENTS = ['bounce', 'complaint', 'spam']
  if (!VALID_EVENTS.includes(event_type)) {
    return new Response(JSON.stringify({ error: 'Invalid event_type' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (typeof recipient !== 'string' || !recipient.includes('@')) {
    return new Response(JSON.stringify({ error: 'Invalid recipient' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const emailLower = recipient.toLowerCase()

  const { error } = await supabase
    .from('suppressed_emails')
    .insert({
      email: emailLower,
      reason: event_type,
      metadata: { ...(metadata ?? {}), provided_reason: reason ?? null, received_at: new Date().toISOString() },
    })

  // idempotente: duplicate é OK
  if (error && !error.message.toLowerCase().includes('duplicate')) {
    console.error('suppress insert failed', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true, email: emailLower, event_type }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
