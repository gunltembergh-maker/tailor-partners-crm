import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Content-Type': 'application/json',
}

function scheduleBackgroundTask(task: Promise<void>) {
  const runtime = globalThis as typeof globalThis & {
    EdgeRuntime?: { waitUntil: (promise: Promise<unknown>) => void }
  }
  if (runtime.EdgeRuntime?.waitUntil) {
    runtime.EdgeRuntime.waitUntil(task)
    return
  }
  task.catch((error) => {
    console.error('[manual-import-refresh] background task failed', error)
  })
}

async function runRefresh() {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  console.log('[manual-import-refresh] starting MV refresh')

  const { error: refreshError } = await supabaseAdmin.rpc('rpc_refresh_mv_comissoes')
  if (refreshError) throw refreshError

  // Bump dashboard version
  const { data } = await supabaseAdmin
    .from('dashboard_refresh')
    .select('version')
    .eq('id', 1)
    .maybeSingle()

  const nextVersion = Number(data?.version ?? 0) + 1

  await supabaseAdmin
    .from('dashboard_refresh')
    .upsert({ id: 1, version: nextVersion, updated_at: new Date().toISOString() }, { onConflict: 'id' })

  console.log('[manual-import-refresh] completed')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, message: 'Missing authorization' }), {
        status: 401, headers: corsHeaders,
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: authData, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
        status: 401, headers: corsHeaders,
      })
    }

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', authData.user.id)
      .maybeSingle()

    if (!roleData || !['ADMIN', 'LIDER'].includes(roleData.role)) {
      return new Response(JSON.stringify({ success: false, message: 'Forbidden' }), {
        status: 403, headers: corsHeaders,
      })
    }

    scheduleBackgroundTask(runRefresh())

    return new Response(JSON.stringify({ success: true, background: true }), {
      status: 202, headers: corsHeaders,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[manual-import-refresh] request failed', error)
    return new Response(JSON.stringify({ success: false, message }), {
      status: 500, headers: corsHeaders,
    })
  }
})