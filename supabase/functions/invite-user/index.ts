import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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

    // Invite user
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        nome_completo: nome,
        full_name: nome,
        perfil: perfil || null,
        area: area || null,
        gestor: gestor || null,
        empresa: empresa || 'Tailor Partners',
      },
      redirectTo: 'https://hub.tailorpartners.com.br/dashboards/comercial',
    })

    if (error) {
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
      // Invite was sent but status update failed - still return success
    }

    console.log('User invited successfully:', email)

    return new Response(JSON.stringify({ success: true, user_id: data.user?.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
