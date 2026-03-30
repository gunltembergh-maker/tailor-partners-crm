import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, message: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify caller is admin/lider
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!roleData || !['ADMIN', 'LIDER'].includes(roleData.role)) {
      return new Response(JSON.stringify({ success: false, message: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, nome, perfil, area, gestor, empresa } = await req.json()

    if (!email || !nome) {
      return new Response(JSON.stringify({ success: false, message: 'email and nome are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const metadata = {
      nome_completo: nome,
      full_name: nome,
      perfil: perfil || null,
      area: area || null,
      gestor: gestor || null,
      empresa: empresa || 'Tailor Partners',
    }

    // Try to invite
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: metadata,
      redirectTo: 'https://hub.tailorpartners.com.br/dashboards/comercial',
    })

    let userId = data?.user?.id

    // If user already exists, generate a new invite link instead
    if (error && error.message?.includes('already been registered')) {
      console.log('User already exists, generating new magic link for:', email)

      // Find the existing user
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (!listError) {
        const existingUser = users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
        if (existingUser) {
          userId = existingUser.id
          // Update user metadata
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            user_metadata: metadata,
          })
          // Generate a new invite/magic link
          const { error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email,
            options: {
              redirectTo: 'https://hub.tailorpartners.com.br/dashboards/comercial',
            },
          })
          if (linkError) {
            console.error('Generate link error:', linkError)
            // Still continue — user exists, we just couldn't resend
          }
        }
      }
    } else if (error) {
      console.error('Invite error:', error)
      return new Response(JSON.stringify({ success: false, message: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Register invite status
    const { error: rpcError } = await supabaseAdmin.rpc('rpc_registrar_convite', {
      p_email: email,
      p_acao: 'enviado',
    })

    if (rpcError) {
      console.error('rpc_registrar_convite error:', rpcError)
    }

    console.log('User invited successfully:', email)

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    console.error('Error:', e)
    return new Response(JSON.stringify({ success: false, message: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
