// Disparo automático diário da Newsletter Receita Lavoro.
// Espelha send-receita-caixa-automatic; muda apenas MODULO, template e RPC de payload.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MODULO = 'receita_lavoro'
const TEMPLATE_NAME = 'receita-lavoro-newsletter'
const PAYLOAD_RPC = 'rpc_email_receita_lavoro_payload'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: internalJwt, error: jwtErr } = await supabase.rpc('get_email_queue_jwt')
  if (jwtErr || !internalJwt) {
    return json({ error: `failed_to_load_internal_jwt: ${jwtErr?.message || 'empty'}` }, 500)
  }

  try {
    let body: any = {}
    if (req.method === 'POST') body = await req.json().catch(() => ({}))
    const force = body?.force === true
    const forcadoPor: string | null = body?.user_id || null

    const agora = new Date()
    const brt = new Date(agora.getTime() - 3 * 60 * 60 * 1000)
    const dataEnvio = brt.toISOString().slice(0, 10)

    const { data: config } = await supabase
      .from('email_schedules_config')
      .select('ativo')
      .eq('modulo', MODULO)
      .maybeSingle()

    if (!config?.ativo && !force) {
      return json({ skipped: true, reason: 'schedule_pausado' })
    }

    if (!force) {
      const { data: ehDiaUtil, error: errDU } = await supabase.rpc('is_dia_util', { p_data: dataEnvio })
      if (errDU) throw errDU
      if (!ehDiaUtil) return json({ skipped: true, reason: 'nao_e_dia_util', data: dataEnvio })
    }

    const { data: jaEnviado } = await supabase
      .from('email_disparos_automaticos')
      .select('id, status')
      .eq('modulo', MODULO)
      .eq('data_envio', dataEnvio)
      .in('status', ['concluido', 'em_processamento'])
      .maybeSingle()

    if (jaEnviado) {
      return json({
        skipped: true,
        reason: 'ja_disparado_hoje_com_sucesso',
        disparo_id: jaEnviado.id,
        status: jaEnviado.status,
      })
    }

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
      if ((errDisp as any).code === '23505') return json({ skipped: true, reason: 'ja_disparado_hoje_race' })
      throw errDisp
    }

    // Pré-carrega payload UMA vez (lição da Receita Caixa — evita timeout)
    const { data: payloadCompartilhado, error: payloadErr } = await supabase.rpc(PAYLOAD_RPC)
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
      return json({ error: `payload_rpc_falhou: ${payloadErr?.message || 'vazio'}` }, 500)
    }

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
            templateName: TEMPLATE_NAME,
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
      await supabase.from('notificacoes_admin').insert({
        tipo: 'email_disparo_falha',
        titulo: `Falha no disparo automático: ${MODULO}`,
        mensagem: `Disparo de ${dataEnvio} terminou com status "${statusFinal}". Sucessos: ${sucessos}, Falhas: ${falhas}.`,
        dados: { modulo: MODULO, data_envio: dataEnvio, status: statusFinal, sucessos, falhas, erros: erros.slice(0, 5) },
        lida: false,
      })
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
    console.error('[send-receita-lavoro-automatic] erro:', err?.message || err)
    return json({ error: err?.message || 'erro_interno' }, 500)
  }
})

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
