// Ativa conta de usuário externo:
// 1) Valida token + senha provisória + nova senha via rpc_validar_ativacao_dados
// 2) Cria usuário no auth.users com a nova senha (auth.admin.createUser)
// 3) Remove ban automático aplicado pelo trigger handle_new_user (domínio externo)
// 4) Upsert profile (tipo_usuario='externo', active=true, blocked=false) e user_role
// 5) Marca convite como ativado via rpc_marcar_convite_ativado
// Endpoint público (sem JWT humano) — validação acontece via token único.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const body = await req.json().catch(() => ({}))
    const { token, senha_provisoria, nova_senha } = body ?? {}

    if (!token || !senha_provisoria || !nova_senha) {
      return json({ error: 'missing_fields', required: ['token', 'senha_provisoria', 'nova_senha'] }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    // 1) Valida tudo via RPC
    const { data: dados, error: validErr } = await supabase.rpc('rpc_validar_ativacao_dados', {
      p_token: token,
      p_senha_provisoria: senha_provisoria,
      p_nova_senha: nova_senha,
    })
    if (validErr) {
      return json({ success: false, error: validErr.message }, 400)
    }

    const { convite_id, email, nome, perfil_role, empresa } = dados as any

    // 2) Cria auth.user — o trigger handle_new_user pode banir o usuário porque
    // o domínio é externo (não está em dominio_empresa). Removemos o ban a seguir.
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: nova_senha,
      email_confirm: true,
      user_metadata: {
        nome_completo: nome,
        full_name: nome,
        perfil: perfil_role,
        empresa: empresa || null,
        tipo_usuario: 'externo',
      },
    })
    if (createErr || !created?.user) {
      return json({ success: false, error: `auth_create_failed: ${createErr?.message}` }, 500)
    }

    const userId = created.user.id

    // 3) Remove ban aplicado pelo trigger handle_new_user (ban_unauthorized_user)
    const { error: unbanErr } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: 'none',
    } as any)
    if (unbanErr) {
      console.error('unban error', unbanErr)
    }

    // 4) Upsert profile com tipo_usuario='externo' e active=true (sobrepõe trigger)
    const { error: profErr } = await supabase
      .from('profiles')
      .upsert(
        {
          user_id: userId,
          id: userId,
          email,
          full_name: nome,
          nome_completo: nome,
          nome,
          empresa: empresa || null,
          tipo_usuario: 'externo',
          active: true,
          blocked: false,
          primeiro_acesso: true,
        },
        { onConflict: 'user_id' }
      )
    if (profErr) {
      console.error('profile upsert error', profErr)
      return json({ success: false, error: `profile_upsert_failed: ${profErr.message}` }, 500)
    }

    // 5) Upsert user_role (caso trigger tenha criado, sobrepõe com o role do convite)
    const { error: roleErr } = await supabase
      .from('user_roles')
      .upsert({ user_id: userId, role: perfil_role }, { onConflict: 'user_id' })
    if (roleErr) {
      console.error('user_role upsert error', roleErr)
      return json({ success: false, error: `role_upsert_failed: ${roleErr.message}` }, 500)
    }

    // 6) Marca convite como ativado
    const { error: markErr } = await supabase.rpc('rpc_marcar_convite_ativado', {
      p_convite_id: convite_id,
    })
    if (markErr) {
      console.error('mark ativado error', markErr)
    }

    return json({ success: true, user_id: userId, email })
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
