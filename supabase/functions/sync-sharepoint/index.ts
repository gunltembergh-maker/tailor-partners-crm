const DRIVE_ID      = 'b!vUOs6-gTI0u_ibiSESgIgDBheafGCvNHlxHh75ldlxq4_43xU1I2ToIsrL0KNAlK';
const CLIENT_ID     = Deno.env.get('GRAPH_CLIENT_ID')!;
const CLIENT_SECRET = Deno.env.get('GRAPH_CLIENT_SECRET')!;
const TENANT_ID     = Deno.env.get('GRAPH_TENANT_ID')!;
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const FILE_IDS: Record<string, string> = {
  'base_receita':   '01JJTG4Z6WJYRFGYFXOFBLWXZY7P5F2LUK',
  'captacao':       '01JJTG4Z54AE366VKVWBB25MVHDSHKYVWM',
  'base_contas':    '01JJTG4Z4CPPV74ENNL5HKIXA5CM7IXTTA',
  'positivador':    '01JJTG4Z567NYOSYDIFBA34IKT5WOGFGDJ',
  'diversificador': '01JJTG4Z26YXEMKVCMBREZRMTR3QQGVSEX',
  'depara':         '01JJTG4Z5HGISMZJP6U5C345YOND47JUSZ',
};

const FILE_MAP: Record<string, { sheets: { sheet: string; table: string; required: boolean }[] }> = {
  'base_receita': {
    sheets: [
      { sheet: 'Comissões',           table: 'raw_comissoes_m0',        required: true },
      { sheet: 'Comissões Histórico',  table: 'raw_comissoes_historico', required: true },
    ]
  },
  'captacao': {
    sheets: [
      { sheet: 'Captação Total',      table: 'raw_captacao_total',       required: true },
      { sheet: 'Captação Histórico',  table: 'raw_captacao_historico',   required: true },
    ]
  },
  'base_contas': {
    sheets: [
      { sheet: 'Contas Total',        table: 'raw_contas_total',         required: true },
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
  if (!d.access_token) throw new Error(`Auth falhou: ${JSON.stringify(d)}`);
  return d.access_token;
}

// Ler aba via Graph API — retorna null se não existir
async function readSheet(token: string, fileId: string, sheetName: string): Promise<Record<string, unknown>[] | null> {
  const enc  = encodeURIComponent(sheetName);
  const url  = `https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/items/${fileId}/workbook/worksheets/${enc}/usedRange(valuesOnly=true)`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(`Graph ${sheetName}: ${resp.status} ${(await resp.text()).substring(0, 200)}`);

  const data   = await resp.json();
  const values: unknown[][] = data.values;
  if (!values || values.length < 2) return [];

  const headers = values[0].map((h: unknown) => String(h ?? '').trim());
  const rows: Record<string, unknown>[] = [];

  for (let i = 1; i < values.length; i++) {
    const row: Record<string, unknown> = {};
    let hasData = false;
    for (let j = 0; j < headers.length; j++) {
      if (!headers[j]) continue;
      const val = values[i][j];
      row[headers[j]] = (val === '' || val === undefined) ? null : val;
      if (val !== null && val !== '' && val !== undefined) hasData = true;
    }
    if (hasData) rows.push(row);
  }

  return rows;
}

async function upsertTable(table: string, rows: Record<string, unknown>[]): Promise<void> {
  const h = { 'Content-Type': 'application/json', 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` };

  // Truncar
  const d1 = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=neq.0`, { method: 'DELETE', headers: h });
  if (!d1.ok) {
    const d2 = await fetch(`${SUPABASE_URL}/rest/v1/${table}?created_at=gte.1970-01-01`, { method: 'DELETE', headers: h });
    if (!d2.ok) {
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/truncate_table`, { method: 'POST', headers: h, body: JSON.stringify({ table_name: table }) });
    }
  }

  if (!rows.length) return;

  // Inserir em lotes de 500
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

async function saveLog(tipo: string, ok: boolean, dur: string, log: string[], erros: string[]): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/rpc_salvar_sync_log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({ p_tipo: tipo, p_sucesso: ok, p_duracao: dur, p_detalhes: log, p_erros: erros.length ? erros : null }),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const log: string[] = [];
  const errors: string[] = [];
  const t0 = Date.now();

  try {
    const body    = await req.json().catch(() => ({}));
    const tipo    = body.tipo    || 'manual';
    const arquivo = body.arquivo || 'todos';
    // "aba" permite processar só uma aba específica dentro do arquivo
    // Ex: { arquivo: 'base_receita', aba: 'Comissões Histórico' }
    const abaFiltro: string | null = body.aba || null;

    const filesToProcess = arquivo === 'todos' ? ALL_FILES : [arquivo];

    log.push('🔐 Autenticando no Microsoft Graph...');
    const token = await getToken();
    log.push('✅ Token obtido');

    let needsMVRefresh = false;

    for (const fileKey of filesToProcess) {
      const fc     = FILE_MAP[fileKey];
      const fileId = FILE_IDS[fileKey];
      if (!fc || !fileId) { errors.push(`Desconhecido: ${fileKey}`); continue; }

      log.push(`\n📄 ${fileKey}${abaFiltro ? ` / aba: ${abaFiltro}` : ''}`);

      // Filtrar abas se parâmetro "aba" foi passado
      const sheetsToProcess = abaFiltro
        ? fc.sheets.filter(s => s.sheet === abaFiltro)
        : fc.sheets;

      for (const sh of sheetsToProcess) {
        try {
          const rows = await readSheet(token, fileId, sh.sheet);

          if (rows === null) {
            if (sh.required) {
              errors.push(`${sh.sheet}: não encontrada`);
              log.push(`   ❌ "${sh.sheet}" não encontrada (obrigatória)`);
            } else {
              log.push(`   ⚪ "${sh.sheet}" não encontrada (opcional)`);
            }
            continue;
          }

          await upsertTable(sh.table, rows);
          log.push(`   ✅ "${sh.sheet}" → ${sh.table} (${rows.length} linhas)`);

          if (fileKey === 'base_receita') needsMVRefresh = true;
        } catch (e) {
          errors.push(`${sh.sheet}: ${e.message}`);
          log.push(`   ❌ "${sh.sheet}": ${e.message}`);
        }
      }
    }

    // Refresh MV se incluiu comissões
    if (needsMVRefresh || (arquivo === 'todos' && !abaFiltro)) {
      log.push('\n🔄 Refreshando materialized view...');
      await refreshMV();
      log.push('✅ mv_comissoes_consolidado atualizado');
    }

    const dur = `${((Date.now() - t0) / 1000).toFixed(1)}s`;
    log.push(`\n⏱️ Concluído em ${dur}`);
    log.push(errors.length ? `⚠️ ${errors.length} erro(s)` : '🎉 Sem erros');

    await saveLog(tipo, errors.length === 0, dur, log, errors);
    return Response.json({ success: errors.length === 0, arquivo, duracao: dur, log, errors }, { headers: cors });

  } catch (e) {
    const dur = `${((Date.now() - t0) / 1000).toFixed(1)}s`;
    await saveLog('erro', false, dur, log, [e.message]).catch(() => {});
    return Response.json({ success: false, error: e.message, log }, { status: 500, headers: cors });
  }
});
