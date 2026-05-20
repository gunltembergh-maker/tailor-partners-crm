import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  let token: string | null = null
  if (req.method === 'GET') {
    const url = new URL(req.url)
    token = url.searchParams.get('token')
  } else if (req.method === 'POST') {
    try {
      const body = await req.json()
      token = typeof body?.token === 'string' ? body.token : null
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } else {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!token || token.length < 16) {
    return new Response(JSON.stringify({ status: 'invalid', message: 'Token ausente ou inválido' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // GET = validar/consultar; POST = efetivar descadastro
  const { data: tokenRow, error: tokenErr } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token, email, used_at')
    .eq('token', token)
    .maybeSingle()

  if (tokenErr || !tokenRow) {
    return new Response(JSON.stringify({ status: 'invalid', message: 'Link inválido ou expirado.' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (req.method === 'GET') {
    return new Response(JSON.stringify({
      status: tokenRow.used_at ? 'already_unsubscribed' : 'valid',
      email: tokenRow.email,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // POST: marcar token + inserir suppressed
  if (tokenRow.used_at) {
    return new Response(JSON.stringify({
      status: 'already_unsubscribed', email: tokenRow.email,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const emailLower = tokenRow.email.toLowerCase()

  const { error: suppressErr } = await supabase
    .from('suppressed_emails')
    .insert({
      email: emailLower,
      reason: 'unsubscribe',
      metadata: { token, unsubscribed_at: new Date().toISOString() },
    })

  // ignora erro de unique violation (já suprimido)
  if (suppressErr && !suppressErr.message.toLowerCase().includes('duplicate')) {
    console.error('suppress insert error', suppressErr)
  }

  const { error: updateErr } = await supabase
    .from('email_unsubscribe_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token', token)

  if (updateErr) {
    console.error('token update error', updateErr)
  }

  return new Response(JSON.stringify({
    status: 'unsubscribed', email: tokenRow.email,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
