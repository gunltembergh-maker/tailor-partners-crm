// Disparo automático diário da Newsletter Receita Caixa.
// Invocado via pg_cron (sem JWT humano) e via UI Admin (botão "Disparar agora").
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MODULO = 'receita_caixa'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  // Carrega JWT service_role legacy do Vault (gateway exige JWT no Bearer p/ verify_jwt=true).
  const { data: internalJwt, error: jwtErr } = await supabase.rpc('get_email_queue_jwt')
  if (jwtErr || !internalJwt) {
    return new Response(JSON.stringify({ error: `failed_to_load_internal_jwt: ${jwtErr?.message || 'empty'}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    let body: any = {}
    if (req.method === 'POST') {
      body = await req.json().catch(() => ({}))
    }
    const force = body?.force === true
    const forcadoPor: string | null = body?.user_id || null

    // BRT (UTC-3): converte agora pra data BRT
    const agora = new Date()
    const brt = new Date(agora.getTime() - 3 * 60 * 60 * 1000)
    const dataEnvio = brt.toISOString().slice(0, 10)

    // 1. Schedule ativo?
    const { data: config } = await supabase
      .from('email_schedules_config')
      .select('ativo')
      .eq('modulo', MODULO)
      .maybeSingle()

    if (!config?.ativo && !force) {
      return json({ skipped: true, reason: 'schedule_pausado' })
    }

    // 2. Dia útil?
    if (!force) {
      const { data: ehDiaUtil, error: errDU } = await supabase.rpc('is_dia_util', { p_data: dataEnvio })
      if (errDU) throw errDU
      if (!ehDiaUtil) {
        return json({ skipped: true, reason: 'nao_e_dia_util', data: dataEnvio })
      }
    }

    // 3. Idempotência (UNIQUE constraint protege race)
    const { data: jaEnviado } = await supabase
      .from('email_disparos_automaticos')
      .select('id, status')
      .eq('modulo', MODULO)
      .eq('data_envio', dataEnvio)
      .maybeSingle()

    if (jaEnviado) {
      return json({
        skipped: true,
        reason: 'ja_disparado_hoje',
        disparo_id: jaEnviado.id,
        status: jaEnviado.status,
      })
    }

    // 4. Destinatários ativos (sem FK declarada → join manual em 2 queries)
    const { data: destRaw, error: errDest } = await supabase
      .from('email_destinatarios_automaticos')
      .select('user_id')
      .eq('modulo', MODULO)
      .eq('ativo', true)

    if (errDest) throw errDest

    const userIds = (destRaw || []).map((d: any) => d.user_id)

    let profilesById: Record<string, any> = {}
    if (userIds.length > 0) {
      const { data: profs, error: errProfs } = await supabase
        .from('profiles')
        .select('user_id, email, nome_completo, full_name, nome, active')
        .in('user_id', userIds)
      if (errProfs) throw errProfs
      profilesById = Object.fromEntries((profs || []).map((p: any) => [p.user_id, p]))
    }

    const destinatarios = (destRaw || [])
      .map((d: any) => ({ user_id: d.user_id, profiles: profilesById[d.user_id] }))
      .filter((d: any) => d.profiles?.active && d.profiles?.email)

    if (destinatarios.length === 0) {
      return json({ skipped: true, reason: 'sem_destinatarios' })
    }

    // 5. Cria registro (UNIQUE protege contra race entre 2 chamadas concorrentes)
    const { data: disparo, error: errDisp } = await supabase
      .from('email_disparos_automaticos')
      .insert({
        modulo: MODULO,
        data_envio: dataEnvio,
        total_destinatarios: destinatarios.length,
        status: 'em_processamento',
        forcado_por: forcadoPor,
      })
      .select()
      .single()

    if (errDisp) {
      if ((errDisp as any).code === '23505') {
        return json({ skipped: true, reason: 'ja_disparado_hoje_race' })
      }
      throw errDisp
    }

    // 5.5. Pré-carrega payload UMA VEZ por disparo (evita N chamadas redundantes ao RPC pesado)
    const { data: payloadCompartilhado, error: payloadErr } = await supabase.rpc(
      'rpc_email_receita_payload',
      { p_anomes_override: null, p_em_validacao_override: null }
    )
    if (payloadErr || !payloadCompartilhado) {
      await supabase
        .from('email_disparos_automaticos')
        .update({
          total_sucessos: 0,
          total_falhas: destinatarios.length,
          status: 'falha_total',
          detalhes_erro: [{ motivo: `payload_rpc_falhou: ${payloadErr?.message || 'vazio'}` }],
          finalizado_em: new Date().toISOString(),
        })
        .eq('id', disparo.id)
      await notificarAdmins(
        supabase, supabaseUrl, serviceKey, internalJwt,
        'falha_total', 0, destinatarios.length,
        [{ motivo: `payload_rpc_falhou: ${payloadErr?.message || 'vazio'}` }],
        dataEnvio,
      )
      return json({ error: `payload_rpc_falhou: ${payloadErr?.message || 'vazio'}` }, 500)
    }

    // 6. Loop envios
    let sucessos = 0
    let falhas = 0
    const erros: any[] = []

    for (const dest of destinatarios) {
      const p: any = dest.profiles
      const email: string = p.email
      const nome: string = p.nome_completo || p.full_name || p.nome || 'Usuário'

      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${internalJwt}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({
            templateName: 'receita-caixa-newsletter',
            recipientEmail: email,
            templateData: { recipientName: nome },
            payload_override: payloadCompartilhado,
            idempotencyKey: `auto-${MODULO}-${dataEnvio}-${dest.user_id}`,
            label: `auto-${MODULO}-${dataEnvio}`,
          }),
        })
        const result: any = await resp.json().catch(() => ({}))

        if (!resp.ok) {
          falhas++
          erros.push({ user_id: dest.user_id, email, motivo: `HTTP ${resp.status}: ${result?.error || JSON.stringify(result).slice(0, 200)}` })
        } else if (result?.skipped) {
          falhas++
          erros.push({ user_id: dest.user_id, email, motivo: `skipped: ${result.reason}` })
        } else {
          sucessos++
        }
      } catch (err: any) {
        falhas++
        erros.push({ user_id: dest.user_id, email, motivo: err?.message || 'erro_desconhecido' })
      }
    }

    const statusFinal =
      sucessos === destinatarios.length ? 'concluido' :
      sucessos === 0 ? 'falha_total' : 'falha_parcial'

    await supabase
      .from('email_disparos_automaticos')
      .update({
        total_sucessos: sucessos,
        total_falhas: falhas,
        status: statusFinal,
        detalhes_erro: erros.length > 0 ? erros : null,
        finalizado_em: new Date().toISOString(),
      })
      .eq('id', disparo.id)

    if (statusFinal !== 'concluido') {
      await notificarAdmins(supabase, supabaseUrl, serviceKey, internalJwt, statusFinal, sucessos, falhas, erros, dataEnvio)
    }

    return json({
      success: true,
      disparo_id: disparo.id,
      total_destinatarios: destinatarios.length,
      sucessos,
      falhas,
      status: statusFinal,
    })
  } catch (err: any) {
    console.error('[send-receita-caixa-automatic] erro:', err?.message || err)
    return new Response(JSON.stringify({ error: err?.message || 'erro_interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function notificarAdmins(
  supabase: any,
  supabaseUrl: string,
  serviceKey: string,
  internalJwt: string,
  status: string,
  sucessos: number,
  falhas: number,
  erros: any[],
  dataEnvio: string,
) {
  try {
    await supabase.from('notificacoes_admin').insert({
      tipo: 'email_disparo_falha',
      titulo: `Falha no disparo automático: ${MODULO}`,
      mensagem: `Disparo de ${dataEnvio} terminou com status "${status}". Sucessos: ${sucessos}, Falhas: ${falhas}.`,
      dados: { modulo: MODULO, data_envio: dataEnvio, status, sucessos, falhas, erros: erros.slice(0, 5) },
      lida: false,
    })

    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'ADMIN')

    const adminIds = (adminRoles || []).map((r: any) => r.user_id)
    if (adminIds.length === 0) return

    const { data: admins } = await supabase
      .from('profiles')
      .select('email')
      .eq('active', true)
      .in('user_id', adminIds)

    for (const admin of admins || []) {
      if (!admin.email) continue
      await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${internalJwt}`,
          apikey: serviceKey,
        },
        body: JSON.stringify({
          templateName: '_example',
          recipientEmail: admin.email,
          templateData: {
            nome: 'Admin',
            mensagem: `Falha no disparo automatico da Newsletter ${MODULO}. Data: ${dataEnvio}. Status: ${status}. Sucessos: ${sucessos}/${sucessos + falhas}. Verifique em /admin/emails/schedules e /admin/emails/log.`,
          },
          idempotencyKey: `alerta-falha-${MODULO}-${dataEnvio}-${admin.email}`,
          label: `alerta-falha-disparo-${dataEnvio}`,
        }),
      })
    }
  } catch (err: any) {
    console.error('[notificarAdmins] erro:', err?.message || err)
  }
}
