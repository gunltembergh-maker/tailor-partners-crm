import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

const DRIVE_ID      = 'b!vUOs6-gTI0u_ibiSESgIgDBheafGCvNHlxHh75ldlxq4_43xU1I2ToIsrL0KNAlK';
const FOLDER_PATH   = 'Bases';
const CLIENT_ID     = Deno.env.get('GRAPH_CLIENT_ID')!;
const CLIENT_SECRET = Deno.env.get('GRAPH_CLIENT_SECRET')!;
const TENANT_ID     = Deno.env.get('GRAPH_TENANT_ID')!;
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const FILE_MAP: Record<string, { sheets: { sheet: string; table: string; required: boolean }[] }> = {
  'base_receita': {
    sheets: [
      { sheet: 'Comissões',          table: 'raw_comissoes_m0',          required: true },
      { sheet: 'Comissões Histórico', table: 'raw_comissoes_historico',   required: true },
    ]
  },
  'captacao': {
    sheets: [
      { sheet: 'Captação Total',     table: 'raw_captacao_total',         required: true },
      { sheet: 'Captação Histórico', table: 'raw_captacao_historico',     required: true },
    ]
  },
  'base_contas': {
    sheets: [
      { sheet: 'Contas Total',       table: 'raw_contas_total',           required: true },
    ]
  },
  'positivador': {
    sheets: [
      { sheet: 'Positivador Total Agrupado',    table: 'raw_positivador_total_agrupado',    required: true  },
      { sheet: 'Positivador Total Desagrupado', table: 'raw_positivador_total_desagrupado', required: true  },
      { sheet: 'Positivador M0 Desagrupado',    table: 'raw_positivador_m0_desagrupado',    required: true  },
      { sheet: 'Positivador M0 Agrupado',       table: 'raw_positivador_m0_agrupado',       required: false },
    ]
  },
  'diversificador': {
    sheets: [
      { sheet: 'Diversificador Consolidado', table: 'raw_diversificador_consolidado', required: true },
    ]
  },
  'depara': {
    sheets: [
      { sheet: 'Base CRM', table: 'raw_base_crm', required: true },
      { sheet: 'DePara',   table: 'raw_depara',   required: true },
    ]
  },
};

const FILE_NAMES: Record<string, string> = {
  'base_receita':  'Base Receita.xlsm',
  'captacao':      'Captação.xlsm',
  'base_contas':   'Base Contas.xlsm',
  'positivador':   'Positivador.xlsx',
  'diversificador':'Diversificador.xlsx',
  'depara':        'DePara.xlsm',
};

const ALL_FILES = Object.keys(FILE_MAP);

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
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'https://graph.microsoft.com/.default',
      }),
    }
  );
  const d = await r.json();
  if (!d.access_token) throw new Error(`Auth Graph falhou: ${JSON.stringify(d)}`);
  return d.access_token;
}

async function downloadFile(token: string, filename: string): Promise<ArrayBuffer> {
  const path = encodeURIComponent(`${FOLDER_PATH}/${filename}`);
  const url  = `https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/root:/${path}:/content`;
  const r    = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).substring(0, 200)}`);
  return r.arrayBuffer();
}

function excelDateToISO(serial: number): string {
  return new Date(Math.floor(serial - 25569) * 86400 * 1000).toISOString().split('T')[0];
}

function processSheet(buf: ArrayBuffer, sheetName: string): Record<string, unknown>[] | null {
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: true });
  const ws = wb.Sheets[sheetName];
  if (!ws) return null;
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false, cellDates: true }) as Record<string, unknown>[];
  return rows.map(row => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (v instanceof Date) {
        out[k] = v.toISOString().split('T')[0];
      } else if (typeof v === 'number') {
        const kl = k.toLowerCase();
        if ((kl.includes('data') || kl.includes('date') || kl.includes('dt_') ||
             kl.includes('nascimento') || kl.includes('vencimento')) && v > 1000 && v < 55000) {
          out[k] = excelDateToISO(v);
        } else {
          out[k] = v;
        }
      } else {
        out[k] = v;
      }
    }
    return out;
  });
}

async function upsertTable(table: string, rows: Record<string, unknown>[]): Promise<void> {
  const h = { 'Content-Type': 'application/json', 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` };
  const d1 = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=neq.0`, { method: 'DELETE', headers: h });
  if (!d1.ok) {
    const d2 = await fetch(`${SUPABASE_URL}/rest/v1/${table}?created_at=gte.1970-01-01`, { method: 'DELETE', headers: h });
    if (!d2.ok) {
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/truncate_table`, { method: 'POST', headers: h, body: JSON.stringify({ table_name: table }) });
    }
  }
  if (!rows.length) return;
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500).map(row => ({ data: row }));
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST', headers: { ...h, 'Prefer': 'return=minimal' }, body: JSON.stringify(batch),
    });
    if (!r.ok) throw new Error(`Insert ${table} lote ${i}: ${(await r.text()).substring(0, 200)}`);
  }
}

async function refreshMV(): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/rpc_refresh_mv_comissoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({}),
  });
}

async function saveLog(tipo: string, arquivo: string, ok: boolean, dur: string, log: string[], erros: string[]): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/rpc_salvar_sync_log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({ p_tipo: `${tipo}:${arquivo}`, p_sucesso: ok, p_duracao: dur, p_detalhes: log, p_erros: erros.length ? erros : null }),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const log: string[] = [];
  const errors: string[] = [];
  const t0 = Date.now();

  try {
    const body = await req.json().catch(() => ({}));
    const tipo = body.tipo || 'manual';
    const arquivo = body.arquivo || 'todos';

    const filesToProcess = arquivo === 'todos' ? ALL_FILES : [arquivo];

    log.push('🔐 Autenticando no Microsoft Graph...');
    const token = await getToken();
    log.push('✅ Token obtido');

    for (const fileKey of filesToProcess) {
      const fc = FILE_MAP[fileKey];
      const filename = FILE_NAMES[fileKey];
      if (!fc || !filename) {
        errors.push(`Arquivo desconhecido: ${fileKey}`);
        continue;
      }

      log.push(`\n📄 ${filename}`);
      let buf: ArrayBuffer;
      try {
        buf = await downloadFile(token, filename);
        log.push(`   ✅ Baixado (${(buf.byteLength / 1024).toFixed(0)} KB)`);
      } catch (e) {
        errors.push(`${filename}: ${e.message}`);
        log.push(`   ❌ ${e.message}`);
        continue;
      }

      for (const sh of fc.sheets) {
        try {
          const rows = processSheet(buf, sh.sheet);
          if (rows === null) {
            if (sh.required) {
              errors.push(`${sh.sheet}: aba não encontrada`);
              log.push(`   ❌ Aba "${sh.sheet}" não encontrada (obrigatória)`);
            } else {
              log.push(`   ⚪ Aba "${sh.sheet}" não encontrada (opcional)`);
            }
            continue;
          }
          await upsertTable(sh.table, rows);
          log.push(`   ✅ "${sh.sheet}" → ${sh.table} (${rows.length} linhas)`);
        } catch (e) {
          errors.push(`${sh.sheet}: ${e.message}`);
          log.push(`   ❌ "${sh.sheet}": ${e.message}`);
        }
      }

      buf = new ArrayBuffer(0);
    }

    if (filesToProcess.includes('base_receita') || arquivo === 'todos') {
      log.push('\n🔄 Refreshando materialized view...');
      await refreshMV();
      log.push('✅ mv_comissoes_consolidado atualizado');
    }

    const dur = `${((Date.now() - t0) / 1000).toFixed(1)}s`;
    log.push(`\n⏱️ Concluído em ${dur}`);
    log.push(errors.length ? `⚠️ ${errors.length} erro(s)` : '🎉 Sem erros');

    await saveLog(tipo, arquivo, errors.length === 0, dur, log, errors);
    return Response.json({ success: errors.length === 0, arquivo, duracao: dur, log, errors }, { headers: cors });

  } catch (e) {
    const dur = `${((Date.now() - t0) / 1000).toFixed(1)}s`;
    await saveLog('erro', 'geral', false, dur, log, [e.message]).catch(() => {});
    return Response.json({ success: false, error: e.message, log }, { status: 500, headers: cors });
  }
});
