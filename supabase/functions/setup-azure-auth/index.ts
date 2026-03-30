import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Use Supabase Management API to enable Azure provider
    const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '')
    
    const clientId = Deno.env.get('AZURE_CLIENT_ID')
    const clientSecret = Deno.env.get('AZURE_CLIENT_SECRET') 
    const tenantId = Deno.env.get('AZURE_TENANT_ID')

    if (!clientId || !clientSecret || !tenantId) {
      return new Response(
        JSON.stringify({ error: 'Azure credentials not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Azure credentials are configured and ready. Provider must be enabled via Supabase dashboard.',
        client_id: clientId ? 'SET' : 'MISSING',
        tenant_id: tenantId ? 'SET' : 'MISSING',
        client_secret: clientSecret ? 'SET (hidden)' : 'MISSING',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
