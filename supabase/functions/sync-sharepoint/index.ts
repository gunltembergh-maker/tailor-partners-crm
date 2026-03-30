import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

const SITE_ID      = 'tailorpartnersinc.sharepoint.com,ebac43bd-13e8-4b23-bf89-b89211280880,a7796130-0ac6-47f3-9711-e1ef995d971a';
const FOLDER_PATH  = 'Documentos Compartilhados/Bases';
const CLIENT_ID    = Deno.env.get('GRAPH_CLIENT_ID')!;
const CLIENT_SECRET = Deno.env.get('GRAPH_CLIENT_SECRET')!;
const TENANT_ID    = Deno.env.get('GRAPH_TENANT_ID')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const FILE_MAP = [
  {
    file: 'Base_Receita.xlsm',
    sheets: [
      { name: 'Comissões',           table: 'raw_comissoes_m0' },
      { name: 'Comissões Histórico',  table: 'raw_comissoes_historico' },
    ]
  },
  {
    file: 'Captação.xlsm',
    sheets: [
      { name: 'Captação Total',      table: 'raw_captacao_total' },
      { name: 'Captação Histórico',  table: 'raw_captacao_historico' },
    ]
  },
  {
    file: 'Base_Contas.xlsm',
    sheets: [
      { name: 'Contas Total',        table: 'raw_contas_total' },
    ]
  },
  {
    file: 'Positivador.xlsx',
    sheets: [
      { name: 'Total Agrupado',      table: 'raw_positivador_total_agrupado' },
      { name: 'Total Desagrupado',   table: 'raw_positivador_total_desagrupado' },
      { name: 'M0 Desagrupado',      table: 'raw_positivador_m0_desagrupado' },
    ]
  },
  {
    file: 'Diversificador.xlsm',
    sheets: [
      { name: 'Consolidado',         table: 'raw_diversificador_consolidado' },
    ]
  },
  {
    file: 'Base_CRM.xlsm',
    sheets: [
      { name: 'CRM',                 table: 'raw_base_crm' },
    ]
  },
];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getToken(): Promise<string> {
  const r = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope:         'https://graph.microsoft.com/.default',
      }),
    }
  );
  const d = await r.json();
  if (!d.access_token) throw new Error(`Auth Graph falhou: ${JSON.stringify(d)}`);
  return d.access_token;
}

async function downloadFile(token: string, filename: string): Promise<ArrayBuffer> {
  const path = encodeURIComponent(`${FOLDER_PATH}/${filename}`);
  const url  = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/drive/root:/${path}:/content`;
  const r    = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Download ${filename}: ${r.status} ${(await r.text()).substring(0,200)}`);
  return r.arrayBuffer();
}

function processSheet(buf: ArrayBuffer, sheetName: string): Record<string, unknown>[] {
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
  let ws   = wb.Sheets[sheetName];
  if (!ws) {
    const norm = (s: string) => s.toLowerCase()
      .replace(/[áàã]/g,'a').replace(/[éê]/g,'e')
      .replace(/[í]/g,'i').replace(/[óô]/g,'o').replace(/[ú]/g,'u');
    const key = Object.keys(wb.Sheets).find(k => norm(k) === norm(sheetName));
    if (key) ws = wb.Sheets[key];
  }
  if (!ws) throw new Error(`Aba "${sheetName}" não encontrada. Disponíveis: ${Object.keys(wb.Sheets).join(', ')}`);
  return XLSX.utils.sheet_to_json(ws, { defval: null });
}

async function upsertTable(table: string, rows: Record<string, unknown>[]): Promise<void> {
  if (!rows.length) return;
  const h = { 'Content-Type': 'application/json', 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` };
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/truncate_table`, {
    method: 'POST', headers: h, body: JSON.stringify({ table_name: table }),
  });
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500).map(row => ({ data: row }));
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST', headers: { ...h, 'Prefer': 'return=minimal' }, body: JSON.stringify(batch),
    });
    if (!r.ok) throw new Error(`Insert ${table}: ${await r.text()}`);
  }
}

async function refreshMV(): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/rpc_refresh_mv_comissoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({}),
  });
}

async function saveLog(tipo: string, ok: boolean, dur: string, log: string[], erros: string[]): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/rpc_salvar_sync_log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({ p_tipo: tipo, p_sucesso: ok, p_duracao: dur, p_detalhes: log, p_erros: erros.length ? erros : null }),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const log: string[] = [], errors: string[] = [];
  const t0 = Date.now();
  let tipo = 'manual';
  try {
    tipo = (await req.json().catch(() => ({}))).tipo || 'manual';
    log.push('🔐 Autenticando no Microsoft Graph...');
    const token = await getToken();
    log.push('✅ Token obtido');
    for (const fc of FILE_MAP) {
      log.push(`\n📄 ${fc.file}`);
      let buf: ArrayBuffer;
      try {
        buf = await downloadFile(token, fc.file);
        log.push(`   ✅ Baixado (${(buf.byteLength/1024).toFixed(0)} KB)`);
      } catch (e: any) {
        errors.push(`${fc.file}: ${e.message}`);
        log.push(`   ❌ ${e.message}`);
        continue;
      }
      for (const sh of fc.sheets) {
        try {
          const rows = processSheet(buf, sh.name);
          await upsertTable(sh.table, rows);
          log.push(`   ✅ ${sh.name} → ${sh.table} (${rows.length} linhas)`);
        } catch (e: any) {
          errors.push(`${sh.name}: ${e.message}`);
          log.push(`   ❌ ${sh.name}: ${e.message}`);
        }
      }
    }
    log.push('\n🔄 Refreshando materialized view...');
    await refreshMV();
    log.push('✅ mv_comissoes_consolidado atualizado');
    const dur = `${((Date.now()-t0)/1000).toFixed(1)}s`;
    log.push(`\n⏱️ Concluído em ${dur}`);
    log.push(errors.length ? `⚠️ ${errors.length} erro(s)` : '🎉 Sem erros');
    await saveLog(tipo, errors.length === 0, dur, log, errors);
    return Response.json({ success: errors.length === 0, duracao: dur, log, errors }, { headers: cors });
  } catch (e: any) {
    const dur = `${((Date.now()-t0)/1000).toFixed(1)}s`;
    await saveLog(tipo, false, dur, log, [e.message]).catch(() => {});
    return Response.json({ success: false, error: e.message, log }, { status: 500, headers: cors });
  }
});
