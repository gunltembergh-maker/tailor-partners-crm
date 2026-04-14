import { createClient } from 'npm:@supabase/supabase-js@2'
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const SITE_NAME = "Hub Grupo Tailor Partners"
const SENDER_DOMAIN = "notify.hub.tailorpartners.com.br"
const FROM_DOMAIN = "hub.tailorpartners.com.br"
const ROOT_DOMAIN = "hub.tailorpartners.com.br"

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

  const { email, nome, perfil, area, gestor, empresa, tipo } = await req.json()
  // tipo: 'invite' (default), 'recovery', 'magiclink'
  const emailTipo = tipo || 'invite'

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

    let userId: string | undefined
    let confirmationUrl = ''
    let needsManualEmail = false
    const redirectTo = `https://${ROOT_DOMAIN}/reset-password`

    if (emailTipo === 'recovery') {
      // Password reset link
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo },
      })
      if (linkError) {
        console.error('Generate recovery link error:', linkError)
        return new Response(JSON.stringify({ success: false, message: linkError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      userId = linkData?.user?.id
      confirmationUrl = linkData?.properties?.action_link || ''
      needsManualEmail = true
    } else if (emailTipo === 'magiclink') {
      // Magic link (passwordless sign-in)
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo },
      })
      if (linkError) {
        console.error('Generate magiclink error:', linkError)
        return new Response(JSON.stringify({ success: false, message: linkError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      userId = linkData?.user?.id
      confirmationUrl = linkData?.properties?.action_link || ''
      needsManualEmail = true
    } else {
      // Default: invite flow
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: metadata,
        redirectTo,
      })
      userId = data?.user?.id

      if (error && (error.message?.includes('already been registered') || error.message?.includes('Database error saving new user') || error.message?.includes('duplicate key'))) {
        console.log('User already exists, generating invite link for:', email)
        needsManualEmail = true

        const { data: allUsersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
        const existingUser = allUsersData?.users?.find(
          (u: any) => u.email?.toLowerCase() === email.toLowerCase()
        )

        if (existingUser) {
          userId = existingUser.id
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            user_metadata: metadata,
          })

          const { data: mlData, error: mlError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email,
            options: { redirectTo },
          })
          if (mlError) {
            console.error('Generate magiclink error:', mlError)
          } else if (mlData?.properties?.action_link) {
            confirmationUrl = mlData.properties.action_link
          }
        }
      } else if (error) {
        console.error('Invite error:', error)
        return new Response(JSON.stringify({ success: false, message: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // For existing users, manually render and enqueue the invite email
    if (needsManualEmail && confirmationUrl) {
      console.log(`Rendering and enqueuing ${emailTipo} email manually for:`, email)

      const templateProps = {
        siteName: SITE_NAME,
        siteUrl: `https://${ROOT_DOMAIN}`,
        recipient: email,
        confirmationUrl,
        nomeCompleto: metadata.nome_completo,
        perfil: metadata.perfil,
        area: metadata.area,
        gestor: metadata.gestor,
        empresa: metadata.empresa,
      }

      const html = await renderAsync(React.createElement(InviteEmail, templateProps))
      const text = await renderAsync(React.createElement(InviteEmail, templateProps), {
        plainText: true,
      })

      const messageId = crypto.randomUUID()
      const displayName = metadata.nome_completo || email.split('@')[0]
      let subject: string
      if (emailTipo === 'recovery') {
        subject = `${displayName}, redefina sua senha do Hub Tailor Partners 🔐`
      } else if (emailTipo === 'magiclink') {
        subject = `${displayName}, acesse o Hub Tailor Partners com este link 🔗`
      } else {
        subject = `${displayName}, seu acesso ao Hub Tailor Partners está pronto 🎯`
      }

      // Generate unsubscribe token for the recipient
      const unsubscribeToken = crypto.randomUUID()
      await supabaseAdmin.from('email_unsubscribe_tokens').upsert(
        { email, token: unsubscribeToken },
        { onConflict: 'email' }
      )

      // Log pending
      await supabaseAdmin.from('email_send_log').insert({
        message_id: messageId,
        template_name: 'invite',
        recipient_email: email,
        status: 'pending',
      })

      // Enqueue to auth_emails (high priority)
      const { error: enqueueError } = await supabaseAdmin.rpc('enqueue_email', {
        queue_name: 'auth_emails',
        payload: {
          message_id: messageId,
          idempotency_key: `invite-${messageId}`,
          to: email,
          from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN,
          subject,
          html,
          text,
          purpose: 'transactional',
          label: 'invite',
          unsubscribe_token: unsubscribeToken,
          queued_at: new Date().toISOString(),
        },
      })

      if (enqueueError) {
        console.error('Failed to enqueue invite email:', enqueueError)
        await supabaseAdmin.from('email_send_log').insert({
          message_id: messageId,
          template_name: 'invite',
          recipient_email: email,
          status: 'failed',
          error_message: 'Failed to enqueue email',
        })
      } else {
        console.log('Invite email enqueued successfully for:', email)
      }
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
