import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

const DRIVE_ID      = 'b!vUOs6-gTI0u_ibiSESgIgDBheafGCvNHlxHh75ldlxq4_43xU1I2ToIsrL0KNAlK';
const FOLDER_PATH   = 'Bases';
const CLIENT_ID     = Deno.env.get('GRAPH_CLIENT_ID')!;
const CLIENT_SECRET = Deno.env.get('GRAPH_CLIENT_SECRET')!;
const TENANT_ID     = Deno.env.get('GRAPH_TENANT_ID')!;
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Mapeamento EXATO extraído do código fonte do Hub (ImportarBases)
// sheet = nome EXATO da aba no Excel
// required = false → aba opcional, pula sem erro se não existir
const FILE_MAP = [
  {
    file: 'Base Receita.xlsm',
    sheets: [
      { sheet: 'Comissões',           table: 'raw_comissoes_m0',            required: true },
      { sheet: 'Comissões Histórico',  table: 'raw_comissoes_historico',     required: true },
    ]
  },
  {
    file: 'Captação.xlsm',
    sheets: [
      { sheet: 'Captação Total',       table: 'raw_captacao_total',          required: true },
      { sheet: 'Captação Histórico',   table: 'raw_captacao_historico',      required: true },
    ]
  },
  {
    file: 'Base Contas.xlsm',
    sheets: [
      { sheet: 'Contas Total',         table: 'raw_contas_total',            required: true },
    ]
  },
  {
    file: 'Positivador.xlsx',
    sheets: [
      { sheet: 'Positivador Total Agrupado',    table: 'raw_positivador_total_agrupado',    required: true  },
      { sheet: 'Positivador Total Desagrupado', table: 'raw_positivador_total_desagrupado', required: true  },
      { sheet: 'Positivador M0 Desagrupado',    table: 'raw_positivador_m0_desagrupado',    required: true  },
      { sheet: 'Positivador M0 Agrupado',       table: 'raw_positivador_m0_agrupado',       required: false },
    ]
  },
  {
    file: 'Diversificador.xlsx',
    sheets: [
      { sheet: 'Diversificador Consolidado', table: 'raw_diversificador_consolidado', required: true },
    ]
  },
  {
    file: 'DePara.xlsm',
    sheets: [
      { sheet: 'Base CRM', table: 'raw_base_crm', required: true },
      { sheet: 'DePara',   table: 'raw_depara',   required: true },
    ]
  },
];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Auth ─────────────────────────────────────────────────────
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

// ── Download do SharePoint ────────────────────────────────────
async function downloadFile(token: string, filename: string): Promise<ArrayBuffer> {
  const path = encodeURIComponent(`${FOLDER_PATH}/${filename}`);
  const url  = `https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/root:/${path}:/content`;
  const r    = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Download ${filename}: HTTP ${r.status} — ${(await r.text()).substring(0, 200)}`);
  return r.arrayBuffer();
}

// ── Conversão de data serial Excel → ISO (igual ao Hub) ──────
function excelDateToISO(serial: number): string {
  const epoch = Math.floor(serial - 25569) * 86400;
  return new Date(epoch * 1000).toISOString().split('T')[0];
}

// ── Processar aba — IDÊNTICO ao Hub (função ze) ───────────────
// Usa { defval: null, raw: false, cellDates: true }
// Converte datas: objetos Date → ISO, números seriais em campos de data → ISO
function processSheet(buf: ArrayBuffer, sheetName: string): Record<string, unknown>[] | null {
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: true });
  const ws = wb.Sheets[sheetName];
  if (!ws) return null;

  const rows = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false, cellDates: true }) as Record<string, unknown>[];

  return rows.map(row => {
    const converted: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(row)) {
      if (val instanceof Date) {
        converted[key] = val.toISOString().split('T')[0];
      } else if (typeof val === 'number') {
        const k = key.toLowerCase();
        const isDateField = k.includes('data') || k.includes('date') ||
          k.includes('dt_') || k.includes('nascimento') || k.includes('vencimento');
        if (isDateField && val > 1000 && val < 55000) {
          converted[key] = excelDateToISO(val);
        } else {
          converted[key] = val;
        }
      } else {
        converted[key] = val;
      }
    }
    return converted;
  });
}

// ── Delete + Insert — IDÊNTICO ao Hub (função je) ────────────
async function upsertTable(table: string, rows: Record<string, unknown>[]): Promise<void> {
  const h = {
    'Content-Type': 'application/json',
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
  };

  // 1. Tentar delete (mesma lógica do Hub)
  let deleted = false;
  const d1 = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=neq.0`, {
    method: 'DELETE', headers: h,
  });
  if (d1.ok) { deleted = true; }

  if (!deleted) {
    const d2 = await fetch(`${SUPABASE_URL}/rest/v1/${table}?created_at=gte.1970-01-01`, {
      method: 'DELETE', headers: h,
    });
    if (d2.ok) { deleted = true; }
  }

  if (!deleted) {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/truncate_table`, {
      method: 'POST', headers: h, body: JSON.stringify({ table_name: table }),
    });
  }

  if (rows.length === 0) return;

  // 2. Insert em lotes de 500 (igual ao Hub)
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500).map(row => ({ data: row }));
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...h, 'Prefer': 'return=minimal' },
      body: JSON.stringify(batch),
    });
    if (!r.ok) throw new Error(`Insert ${table} lote ${i}: ${(await r.text()).substring(0, 200)}`);
  }
}

// ── Refresh MV ────────────────────────────────────────────────
async function refreshMV(): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/rpc_refresh_mv_comissoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({}),
  });
}

// ── Salvar log ────────────────────────────────────────────────
async function saveLog(tipo: string, ok: boolean, dur: string, log: string[], erros: string[]): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/rpc_salvar_sync_log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({ p_tipo: tipo, p_sucesso: ok, p_duracao: dur, p_detalhes: log, p_erros: erros.length ? erros : null }),
  });
}

// ── Handler principal ─────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const log: string[]    = [];
  const errors: string[] = [];
  const t0               = Date.now();
  let tipo               = 'manual';

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
        log.push(`   ✅ Baixado (${(buf.byteLength / 1024).toFixed(0)} KB)`);
      } catch (e) {
        errors.push(`${fc.file}: ${e.message}`);
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
              log.push(`   ⚪ Aba "${sh.sheet}" não encontrada (opcional — ignorada)`);
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
    }

    log.push('\n🔄 Refreshando materialized view...');
    await refreshMV();
    log.push('✅ mv_comissoes_consolidado atualizado');

    const dur = `${((Date.now() - t0) / 1000).toFixed(1)}s`;
    log.push(`\n⏱️ Concluído em ${dur}`);
    log.push(errors.length ? `⚠️ ${errors.length} erro(s)` : '🎉 Sem erros');

    await saveLog(tipo, errors.length === 0, dur, log, errors);
    return Response.json({ success: errors.length === 0, duracao: dur, log, errors }, { headers: cors });

  } catch (e) {
    const dur = `${((Date.now() - t0) / 1000).toFixed(1)}s`;
    await saveLog(tipo, false, dur, log, [e.message]).catch(() => {});
    return Response.json({ success: false, error: e.message, log }, { status: 500, headers: cors });
  }
});
