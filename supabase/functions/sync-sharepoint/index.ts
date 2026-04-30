/**
 * sync-sharepoint Edge Function
 * 
 * Handles syncing Excel files from SharePoint to Supabase raw tables.
 * 
 * Modes:
 *  - tipo=todos: orchestrator dispatches each file sequentially
 *  - arquivo=X: processes single file, auto-cascading large sheets
 *  - arquivo=X + aba + start_row/end_row: processes a specific slice
 *  - sync_mode=m0: sync only current month sheet (Comissões → raw_comissoes_m0)
 *  - sync_mode=m1: sync M-1 adjustment in historico (conditional on business days)
 *  - sync_mode=historico_completo: full history sync month-by-month in background
 *  - sync_mode=historico_mensal: monthly history sync in background
 */

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
      { sheet: 'Comissões',            table: 'raw_comissoes_m0',        required: true },
      { sheet: 'Comissões Histórico',  table: 'raw_comissoes_historico', required: true },
    ]
  },
  'captacao': {
    sheets: [
      { sheet: 'Captação Total',       table: 'raw_captacao_total',      required: true },
      { sheet: 'Captação Histórico',   table: 'raw_captacao_historico',  required: true },
    ]
  },
  'base_contas': {
    sheets: [
      { sheet: 'Contas Total',         table: 'raw_contas_total',        required: true },
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
      { sheet: 'DePara',                  table: 'raw_depara',              required: true  },
      { sheet: 'Base CRM',                table: 'raw_base_crm',            required: true  },
      { sheet: 'Base Consolidada',        table: 'raw_base_consolidada',    required: true  },
      { sheet: 'Base Câmbio',             table: 'raw_base_cambio',         required: false },
      { sheet: 'Base Gestora',            table: 'raw_base_gestora',        required: false },
      { sheet: 'Base Corporate Seguros',  table: 'raw_base_corp_seguros',   required: false },
      { sheet: 'Base Avenue',             table: 'raw_base_avenue',         required: false },
      { sheet: 'F & O',                   table: 'raw_base_fo',             required: false },
      { sheet: 'Base Lavoro',             table: 'raw_base_lavoro',         required: false },
      { sheet: 'Desligados',              table: 'raw_desligados',          required: false },
    ]
  },
};

const ALL_FILES = Object.keys(FILE_MAP);
const READ_CHUNK = 2000;
const MAX_ROWS_PER_CALL = 15000;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Utility helpers ────────────────────────────────────────────────

function colToLetter(n: number): string {
  let s = '';
  while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); }
  return s;
}

function excelSerialToISO(serial: number): string {
  return new Date(Math.floor(serial - 25569) * 86400 * 1000).toISOString().split('T')[0];
}

function isDateField(key: string): boolean {
  const k = key.toLowerCase();
  return k.includes('data') || k.includes('date') || k.includes('dt_') ||
         k.includes('nascimento') || k.includes('vencimento') ||
         k.includes('competência') || k.includes('competencia');
}

function convertCell(key: string, val: unknown): unknown {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    if (isDateField(key) && val > 1000 && val < 60000) return excelSerialToISO(val);
    return val;
  }
  if (typeof val === 'string') {
    const t = val.trim();
    if (t === '') return null;
    const n = Number(t);
    if (!isNaN(n) && t !== '' && isDateField(key) && n > 1000 && n < 60000) return excelSerialToISO(n);
    if (isDateField(key) && /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(t)) {
      try { const d = new Date(t); if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]; } catch { /* ignore */ }
    }
    return t;
  }
  return val;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// ─── Auth ───────────────────────────────────────────────────────────

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
  if (!d.access_token) throw new Error(`Auth: ${JSON.stringify(d)}`);
  return d.access_token;
}

// ─── DB helpers ─────────────────────────────────────────────────────

const RPC_TABLES = new Set(['raw_comissoes_m0', 'raw_comissoes_historico']);
const rpcHeaders = { 'Content-Type': 'application/json', 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` };

const RPC_BATCH = 500;

async function insertChunk(table: string, rows: Record<string, unknown>[], truncate: boolean): Promise<void> {
  if (RPC_TABLES.has(table)) {
    for (let i = 0; i < rows.length; i += RPC_BATCH) {
      const batch = rows.slice(i, i + RPC_BATCH);
      const shouldTruncate = truncate && i === 0;
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/rpc_sync_bulk_insert`, {
        method: 'POST', headers: rpcHeaders,
        body: JSON.stringify({ p_table: table, p_rows: batch, p_truncate: shouldTruncate })
      });
      if (!r.ok) throw new Error(`RPC ${table}: ${(await r.text()).substring(0, 200)}`);
      const res = await r.json();
      if (res.success === false) throw new Error(`RPC erro: ${res.error}`);
    }
    if (rows.length === 0 && truncate) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/rpc_sync_bulk_insert`, {
        method: 'POST', headers: rpcHeaders,
        body: JSON.stringify({ p_table: table, p_rows: [], p_truncate: true })
      });
      if (!r.ok) throw new Error(`RPC ${table}: ${(await r.text()).substring(0, 200)}`);
    }
  } else {
    if (truncate) {
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/truncate_table`, {
        method: 'POST', headers: rpcHeaders, body: JSON.stringify({ table_name: table })
      });
    }
    if (!rows.length) return;
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500).map(r => ({ data: r }));
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST', headers: { ...rpcHeaders, 'Prefer': 'return=minimal' }, body: JSON.stringify(batch)
      });
      if (!r.ok) throw new Error(`REST ${table}: ${(await r.text()).substring(0, 200)}`);
    }
  }
}

// Insert rows WITHOUT truncate (for appending to historico)
async function insertRowsNoTruncate(table: string, rows: Record<string, unknown>[]): Promise<void> {
  for (let i = 0; i < rows.length; i += RPC_BATCH) {
    const batch = rows.slice(i, i + RPC_BATCH);
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/rpc_sync_bulk_insert`, {
      method: 'POST', headers: rpcHeaders,
      body: JSON.stringify({ p_table: table, p_rows: batch, p_truncate: false })
    });
    if (!r.ok) throw new Error(`RPC ${table}: ${(await r.text()).substring(0, 200)}`);
    const res = await r.json();
    if (res.success === false) throw new Error(`RPC erro: ${res.error}`);
  }
}

// Call an RPC function
async function callRpc(name: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST', headers: rpcHeaders, body: JSON.stringify(params)
  });
  if (!r.ok) throw new Error(`RPC ${name}: ${(await r.text()).substring(0, 200)}`);
  return await r.json();
}

async function bumpDashboardRefresh(): Promise<void> {
  const readResp = await fetch(`${SUPABASE_URL}/rest/v1/dashboard_refresh?id=eq.1&select=version`, {
    method: 'GET',
    headers: { ...rpcHeaders, 'Accept': 'application/json' },
  });
  if (!readResp.ok) throw new Error(`dashboard_refresh read: ${(await readResp.text()).substring(0, 200)}`);

  const rows = await readResp.json();
  const currentVersion = Number(rows?.[0]?.version);
  if (!Number.isFinite(currentVersion)) throw new Error('dashboard_refresh row id=1 not found');

  const updateResp = await fetch(`${SUPABASE_URL}/rest/v1/dashboard_refresh?id=eq.1`, {
    method: 'PATCH',
    headers: { ...rpcHeaders, 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      version: currentVersion + 1,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!updateResp.ok) throw new Error(`dashboard_refresh update: ${(await updateResp.text()).substring(0, 200)}`);
}

async function refreshMV(): Promise<void> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/rpc_refresh_mv_comissoes`, {
    method: 'POST', headers: rpcHeaders, body: JSON.stringify({}),
  });
  if (!resp.ok) throw new Error(`RPC rpc_refresh_mv_comissoes: ${(await resp.text()).substring(0, 200)}`);

  await bumpDashboardRefresh();
}

async function saveLog(tipo: string, ok: boolean, dur: string, log: string[], erros: string[]): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/rpc_salvar_sync_log`, {
    method: 'POST', headers: rpcHeaders,
    body: JSON.stringify({ p_tipo: tipo, p_sucesso: ok, p_duracao: dur, p_detalhes: log, p_erros: erros.length ? erros : null }),
  });
}

// ─── Graph API helpers ──────────────────────────────────────────────

async function getSheetDimensions(token: string, fileId: string, sheetName: string): Promise<{ rowCount: number; columnCount: number; headers: string[] } | null> {
  const enc  = encodeURIComponent(sheetName);
  const base = `https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/items/${fileId}/workbook/worksheets/${enc}`;

  const dimResp = await fetch(`${base}/usedRange(valuesOnly=false)?$select=rowCount,columnCount`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (dimResp.status === 404) return null;
  if (!dimResp.ok) throw new Error(`Dim ${sheetName}: ${dimResp.status}`);

  const { rowCount, columnCount } = await dimResp.json();
  if (rowCount < 2) return { rowCount, columnCount, headers: [] };

  const lastCol = colToLetter(columnCount);
  const hdrResp = await fetch(`${base}/range(address='A1:${lastCol}1')?$select=values`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!hdrResp.ok) throw new Error(`Headers: ${hdrResp.status}`);
  const headers: string[] = ((await hdrResp.json()).values[0] || []).map((h: unknown) => String(h ?? '').trim());

  return { rowCount, columnCount, headers };
}

async function readRange(
  token: string, fileId: string, sheetName: string,
  startRow: number, endRow: number, headers: string[], lastCol: string,
): Promise<Record<string, unknown>[]> {
  const enc  = encodeURIComponent(sheetName);
  const base = `https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/items/${fileId}/workbook/worksheets/${enc}`;
  const allRows: Record<string, unknown>[] = [];

  for (let r = startRow; r <= endRow; r += READ_CHUNK) {
    const end = Math.min(r + READ_CHUNK - 1, endRow);
    const dataResp = await fetch(`${base}/range(address='A${r}:${lastCol}${end}')?$select=values`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!dataResp.ok) throw new Error(`Range A${r}: ${dataResp.status}`);

    const values: unknown[][] = (await dataResp.json()).values || [];
    for (const rowVals of values) {
      const row: Record<string, unknown> = {};
      let hasData = false;
      for (let j = 0; j < headers.length; j++) {
        if (!headers[j]) continue;
        const c = convertCell(headers[j], rowVals[j]);
        row[headers[j]] = c;
        if (c !== null) hasData = true;
      }
      if (hasData) allRows.push(row);
    }
  }
  return allRows;
}

async function readAndInsertRange(
  token: string, fileId: string, sheetName: string, table: string,
  startRow: number, endRow: number, headers: string[], lastCol: string,
  truncate: boolean, log: string[]
): Promise<number> {
  const enc  = encodeURIComponent(sheetName);
  const base = `https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/items/${fileId}/workbook/worksheets/${enc}`;

  let totalInserted = 0;
  let isFirst = truncate;

  for (let r = startRow; r <= endRow; r += READ_CHUNK) {
    const end = Math.min(r + READ_CHUNK - 1, endRow);
    const dataResp = await fetch(`${base}/range(address='A${r}:${lastCol}${end}')?$select=values`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!dataResp.ok) throw new Error(`Range A${r}: ${dataResp.status}`);

    const values: unknown[][] = (await dataResp.json()).values || [];
    const rows: Record<string, unknown>[] = [];
    for (const rowVals of values) {
      const row: Record<string, unknown> = {};
      let hasData = false;
      for (let j = 0; j < headers.length; j++) {
        if (!headers[j]) continue;
        const c = convertCell(headers[j], rowVals[j]);
        row[headers[j]] = c;
        if (c !== null) hasData = true;
      }
      if (hasData) rows.push(row);
    }

    await insertChunk(table, rows, isFirst);
    isFirst = false;
    totalInserted += rows.length;
    log.push(`   📦 ${r}-${end}: +${rows.length} (acum: ${totalInserted})`);
  }

  return totalInserted;
}

// Fire-and-forget
function fireAndForget(body: Record<string, unknown>): void {
  const url = `${SUPABASE_URL}/functions/v1/sync-sharepoint`;
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify(body),
  }).catch(() => {});
}

// Self-invoke and wait
async function selfInvoke(body: Record<string, unknown>): Promise<{ success: boolean; log?: string[]; errors?: string[]; totalRows?: number }> {
  const url = `${SUPABASE_URL}/functions/v1/sync-sharepoint`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => 'unknown');
    return { success: false, errors: [`Self-invoke failed: ${resp.status} ${txt.substring(0, 100)}`] };
  }
  return await resp.json();
}

function scheduleBackgroundTask(task: Promise<void>): void {
  const runtime = globalThis as typeof globalThis & {
    EdgeRuntime?: { waitUntil: (promise: Promise<unknown>) => void };
  };

  if (runtime.EdgeRuntime?.waitUntil) {
    runtime.EdgeRuntime.waitUntil(task);
    return;
  }

  task.catch((error) => {
    console.error('Background sync failed', error);
  });
}

function normalizeAnomesList(value: unknown): number[] | null {
  const source = Array.isArray(value)
    ? value
    : typeof value === 'string' && value.includes(',')
      ? value.split(',')
      : value === null || value === undefined
        ? []
        : [value];

  const months = source
    .map((entry) => Number(String(entry).trim()))
    .filter((entry) => Number.isInteger(entry) && entry >= 190001 && entry <= 299912);

  return months.length ? [...new Set(months)].sort((a, b) => a - b) : null;
}

// ─── Extract AnoMes from row data ──────────────────────────────────
function extractAnomes(row: Record<string, unknown>): number | null {
  const dataVal = row['Data'] as string | null;
  if (!dataVal) return null;
  try {
    const d = new Date(dataVal);
    if (isNaN(d.getTime())) return null;
    return (d.getFullYear() * 100) + (d.getMonth() + 1);
  } catch {
    return null;
  }
}

async function readHistoricoRowsGroupedByMonth(
  token: string,
  fileId: string,
  sheetName: string,
  monthFilter: number[] | null,
  log: string[],
): Promise<{
  monthlyGroups: Map<number, Record<string, unknown>[]>;
  rowsWithoutMonth: Record<string, unknown>[];
  totalRowsRead: number;
} | null> {
  const dims = await getSheetDimensions(token, fileId, sheetName);
  if (!dims || dims.rowCount < 2) return null;

  const lastCol = colToLetter(dims.columnCount);
  const allowedMonths = monthFilter?.length ? new Set(monthFilter) : null;
  const monthlyGroups = new Map<number, Record<string, unknown>[]>();
  const rowsWithoutMonth: Record<string, unknown>[] = [];
  let totalRowsRead = 0;

  for (let r = 2; r <= dims.rowCount; r += READ_CHUNK) {
    const end = Math.min(r + READ_CHUNK - 1, dims.rowCount);
    const chunkRows = await readRange(token, fileId, sheetName, r, end, dims.headers, lastCol);
    totalRowsRead += chunkRows.length;

    let eligibleRows = 0;
    let unknownMonthRows = 0;

    for (const row of chunkRows) {
      const anomes = extractAnomes(row);

      if (anomes === null) {
        if (!allowedMonths) {
          rowsWithoutMonth.push(row);
          eligibleRows += 1;
          unknownMonthRows += 1;
        }
        continue;
      }

      if (allowedMonths && !allowedMonths.has(anomes)) continue;

      const current = monthlyGroups.get(anomes);
      if (current) current.push(row);
      else monthlyGroups.set(anomes, [row]);
      eligibleRows += 1;
    }

    log.push(`   📦 ${r}-${end}: ${eligibleRows} linhas elegíveis${unknownMonthRows ? ` (${unknownMonthRows} sem mês)` : ''}`);
  }

  return { monthlyGroups, rowsWithoutMonth, totalRowsRead };
}

async function processHistoricoSyncInBackground({
  tipo,
  syncMode,
  monthFilter,
}: {
  tipo: string;
  syncMode: 'historico_completo' | 'historico_mensal';
  monthFilter: number[] | null;
}): Promise<void> {
  const log: string[] = [];
  const errors: string[] = [];
  const t0 = Date.now();
  const fileId = FILE_IDS['base_receita'];
  const sheetName = 'Comissões Histórico';
  const logType = syncMode === 'historico_completo' ? 'sync-historico-completo' : 'sync-historico-mensal';
  const fullRebuild = syncMode === 'historico_completo' || !(monthFilter?.length);

  try {
    log.push('🔐 Autenticando...');
    const token = await getToken();
    log.push('✅ Token obtido');
    log.push(fullRebuild ? '\n📚 Sync Histórico Completo em background' : `\n📚 Sync Histórico Mensal em background (${monthFilter?.join(', ')})`);

    const groupedRows = await readHistoricoRowsGroupedByMonth(token, fileId, sheetName, monthFilter, log);

    if (!groupedRows) {
      if (fullRebuild) {
        log.push('   🧹 Fonte vazia: limpando histórico atual');
        await insertChunk('raw_comissoes_historico', [], true);
      }

      log.push('   ⚠️ Aba "Comissões Histórico" vazia ou não encontrada');
      log.push('\n🔄 Refreshando MV...');
      await refreshMV();
      log.push('✅ MV atualizada');

      const dur = `${((Date.now() - t0) / 1000).toFixed(1)}s`;
      log.push(`\n⏱️ ${dur}`);
      await saveLog(logType, true, dur, log, []);
      return;
    }

    const monthsWithRows = [...groupedRows.monthlyGroups.keys()].sort((a, b) => a - b);
    const monthsToProcess = fullRebuild
      ? monthsWithRows
      : [...new Set(monthFilter ?? monthsWithRows)].sort((a, b) => a - b);

    log.push(`   📊 ${groupedRows.totalRowsRead} linhas lidas da fonte`);

    if (fullRebuild) {
      log.push('   🧹 Limpando raw_comissoes_historico antes da reconstrução');
      await insertChunk('raw_comissoes_historico', [], true);
    }

    let totalInserted = 0;
    for (const anomes of monthsToProcess) {
      const rows = groupedRows.monthlyGroups.get(anomes) ?? [];
      log.push(`   📅 ${anomes}: ${rows.length} linhas`);

      if (!fullRebuild) {
        await callRpc('rpc_deletar_anomes_historico', { p_anomes: anomes });
      }

      if (rows.length > 0) {
        await insertRowsNoTruncate('raw_comissoes_historico', rows);
        totalInserted += rows.length;
      }

      log.push(`   ✅ ${anomes}: +${rows.length} (acum: ${totalInserted})`);
    }

    if (fullRebuild && groupedRows.rowsWithoutMonth.length > 0) {
      log.push(`   📦 Sem mês identificável: ${groupedRows.rowsWithoutMonth.length} linhas`);
      await insertRowsNoTruncate('raw_comissoes_historico', groupedRows.rowsWithoutMonth);
      totalInserted += groupedRows.rowsWithoutMonth.length;
      log.push(`   ✅ Sem mês: +${groupedRows.rowsWithoutMonth.length} (acum: ${totalInserted})`);
    }

    log.push(`   🏁 Histórico processado: ${totalInserted} linhas gravadas`);
    log.push('\n🔄 Refreshando MV...');
    await refreshMV();
    log.push('✅ MV atualizada');

    const dur = `${((Date.now() - t0) / 1000).toFixed(1)}s`;
    log.push(`\n⏱️ ${dur}`);
    await saveLog(logType, true, dur, log, []);
  } catch (error) {
    const message = getErrorMessage(error);
    errors.push(message);
    log.push(`❌ ${message}`);

    const dur = `${((Date.now() - t0) / 1000).toFixed(1)}s`;
    await saveLog(logType, false, dur, log, errors).catch(() => {});
    throw error;
  }
}

// ─── Main handler ───────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const log: string[] = [], errors: string[] = [];
  const t0 = Date.now();

  try {
    const body      = await req.json().catch(() => ({}));
    const tipo      = body.tipo      || 'manual';
    const arquivo   = body.arquivo   || 'todos';
    const abaFiltro = body.aba       || null;
    const startRow: number | null = body.start_row || null;
    const endRow: number | null   = body.end_row   || null;
    const skipTruncate: boolean   = body._skip_truncate || false;
    const isCascadeSlice: boolean = body._cascade || false;
    const syncMode: string | null = body.sync_mode || null;

    // ═══════════════════════════════════════════════════════════════
    // RECEITA SYNC MODES (m0, m1, historico_completo, historico_mensal)
    // ═══════════════════════════════════════════════════════════════
    if (arquivo === 'base_receita' && syncMode) {
      const fileId = FILE_IDS['base_receita'];

      if (syncMode === 'historico_completo' || syncMode === 'historico_mensal') {
        const monthFilter = normalizeAnomesList(
          body.anomes_list ?? body.anomes ?? body.target_anomes ?? body.target_months,
        );

        scheduleBackgroundTask(processHistoricoSyncInBackground({
          tipo,
          syncMode,
          monthFilter,
        }));

        return Response.json({
          success: true,
          arquivo: 'base_receita',
          syncMode,
          background: true,
          message: 'Sync Histórico iniciado em background',
        }, { status: 202, headers: cors });
      }

      log.push('🔐 Autenticando...');
      const token = await getToken();
      log.push('✅ Token obtido');

      // ── M0: Sync current month only ──
      if (syncMode === 'm0') {
        log.push('\n📅 Sync M0 (mês atual)');
        const sheetName = 'Comissões';
        const dims = await getSheetDimensions(token, fileId, sheetName);
        if (!dims || dims.rowCount < 2) {
          log.push('   ⚠️ Aba "Comissões" vazia ou não encontrada');
          const dur = `${((Date.now() - t0) / 1000).toFixed(1)}s`;
          await saveLog('sync-m0', true, dur, log, []);
          return Response.json({ success: true, log, totalRows: 0 }, { headers: cors });
        }

        const lastCol = colToLetter(dims.columnCount);
        const total = await readAndInsertRange(
          token, fileId, sheetName, 'raw_comissoes_m0',
          2, dims.rowCount, dims.headers, lastCol, true, log
        );

        log.push(`   ✅ M0: ${total} linhas`);

        // Refresh MV
        log.push('\n🔄 Refreshando MV...');
        await refreshMV();
        log.push('✅ MV atualizada');

        const dur = `${((Date.now() - t0) / 1000).toFixed(1)}s`;
        log.push(`\n⏱️ ${dur}`);
        await saveLog('sync-m0', true, dur, log, []);
        return Response.json({ success: true, arquivo: 'base_receita', syncMode: 'm0', totalRows: total, duracao: dur, log }, { headers: cors });
      }

      // ── M-1: Re-sync previous month in historico ──
      if (syncMode === 'm1') {
        log.push('\n📅 Sync M-1 (mês anterior no histórico)');

        // Check if within first 10 business days
        const dentroPeriodo = await callRpc('fn_dentro_periodo_m1') as boolean;
        if (!dentroPeriodo) {
          log.push('   ⏸️ Fora do período de ajuste M-1 (>10 dias úteis). Pulando.');
          const dur = `${((Date.now() - t0) / 1000).toFixed(1)}s`;
          await saveLog('sync-m1-skip', true, dur, log, []);
          return Response.json({ success: true, syncMode: 'm1', skipped: true, reason: 'outside_m1_period', log }, { headers: cors });
        }

        const anoMesM1 = await callRpc('fn_anomes_m1') as number;
        log.push(`   📊 AnoMes M-1: ${anoMesM1}`);

        // Read historico sheet
        const sheetName = 'Comissões Histórico';
        const dims = await getSheetDimensions(token, fileId, sheetName);
        if (!dims || dims.rowCount < 2) {
          log.push('   ⚠️ Aba "Comissões Histórico" vazia');
          const dur = `${((Date.now() - t0) / 1000).toFixed(1)}s`;
          await saveLog('sync-m1', true, dur, log, []);
          return Response.json({ success: true, syncMode: 'm1', totalRows: 0, log }, { headers: cors });
        }

        const lastCol = colToLetter(dims.columnCount);
        log.push(`   📊 Lendo "${sheetName}": ${dims.rowCount - 1} linhas`);

        // Read all rows and filter only M-1 month
        const allRows = await readRange(token, fileId, sheetName, 2, dims.rowCount, dims.headers, lastCol);
        const m1Rows = allRows.filter(r => extractAnomes(r) === anoMesM1);
        log.push(`   🔍 ${m1Rows.length} linhas de ${anoMesM1} encontradas`);

        if (m1Rows.length === 0) {
          log.push('   ⚠️ Nenhuma linha de M-1 no arquivo');
          const dur = `${((Date.now() - t0) / 1000).toFixed(1)}s`;
          await saveLog('sync-m1', true, dur, log, []);
          return Response.json({ success: true, syncMode: 'm1', totalRows: 0, log }, { headers: cors });
        }

        // Delete M-1 from historico
        log.push(`   🗑️ Deletando ${anoMesM1} do histórico...`);
        await callRpc('rpc_deletar_anomes_historico', { p_anomes: anoMesM1 });

        // Insert M-1 rows
        log.push(`   📦 Inserindo ${m1Rows.length} linhas de ${anoMesM1}...`);
        await insertRowsNoTruncate('raw_comissoes_historico', m1Rows);

        log.push(`   ✅ M-1: ${m1Rows.length} linhas`);

        // Refresh MV
        log.push('\n🔄 Refreshando MV...');
        await refreshMV();
        log.push('✅ MV atualizada');

        const dur = `${((Date.now() - t0) / 1000).toFixed(1)}s`;
        log.push(`\n⏱️ ${dur}`);
        await saveLog('sync-m1', true, dur, log, []);
        return Response.json({ success: true, syncMode: 'm1', totalRows: m1Rows.length, duracao: dur, log }, { headers: cors });
      }

      // Unknown sync_mode
      return Response.json({ success: false, error: `Unknown sync_mode: ${syncMode}` }, { status: 400, headers: cors });
    }

    // ═══════════════════════════════════════════════════════════════
    // MODE 1: ORCHESTRATOR (tipo=todos)
    // ═══════════════════════════════════════════════════════════════
    if (arquivo === 'todos' && !abaFiltro && !startRow) {
      log.push('🔐 Autenticando...');
      await getToken();
      log.push('✅ Token válido');
      log.push('🚀 Modo orquestrador\n');

      let allSuccess = true;

      for (const fileKey of ALL_FILES) {
        log.push(`📄 ${fileKey}...`);
        const result = await selfInvoke({ tipo, arquivo: fileKey, _orchestrated: true });
        
        if (result.success) {
          log.push(`   ✅ ${fileKey} OK`);
          if (result.log) {
            for (const l of result.log) {
              if (!l.startsWith('🔐') && !l.startsWith('✅ Token') && !l.startsWith('\n⏱'))
                log.push(`   ${l}`);
            }
          }
        } else {
          allSuccess = false;
          log.push(`   ❌ ${fileKey} falhou`);
          if (result.errors) errors.push(...result.errors);
        }
      }

      log.push('\n🔄 Refreshando MV...');
      await refreshMV();
      log.push('✅ MV atualizada');

      const dur = `${((Date.now() - t0) / 1000).toFixed(1)}s`;
      log.push(`\n⏱️ ${dur}`);
      await saveLog(tipo, allSuccess, dur, log, errors);
      return Response.json({ success: allSuccess, arquivo: 'todos', duracao: dur, log, errors }, { headers: cors });
    }

    // ═══════════════════════════════════════════════════════════════
    // MODE 2: CASCADE SLICE
    // ═══════════════════════════════════════════════════════════════
    if (isCascadeSlice && startRow && endRow && abaFiltro) {
      const fileKey = arquivo;
      const fc = FILE_MAP[fileKey], fileId = FILE_IDS[fileKey];
      if (!fc || !fileId) return Response.json({ success: false, errors: [`Unknown: ${fileKey}`] }, { headers: cors });

      const sh = fc.sheets.find(s => s.sheet === abaFiltro);
      if (!sh) return Response.json({ success: false, errors: [`Sheet not found: ${abaFiltro}`] }, { headers: cors });

      const token = await getToken();
      const dims = await getSheetDimensions(token, fileId, sh.sheet);
      if (!dims || dims.rowCount < 2) {
        return Response.json({ success: true, log: ['Sheet empty or not found'], totalRows: 0 }, { headers: cors });
      }

      const lastCol = colToLetter(dims.columnCount);
      const truncate = !skipTruncate;

      log.push(`🔗 Cascade: ${sh.sheet} [${startRow}-${endRow}] truncate=${truncate}`);

      const total = await readAndInsertRange(
        token, fileId, sh.sheet, sh.table,
        startRow, endRow, dims.headers, lastCol,
        truncate, log
      );

      log.push(`✅ Slice done: ${total} rows`);

      const totalRows = dims.rowCount;
      const nextStart = endRow + 1;
      if (nextStart <= totalRows) {
        const nextEnd = Math.min(nextStart + MAX_ROWS_PER_CALL - 1, totalRows);
        log.push(`🔥 Firing next cascade: ${nextStart}-${nextEnd}`);
        fireAndForget({
          tipo,
          arquivo: fileKey,
          aba: sh.sheet,
          start_row: nextStart,
          end_row: nextEnd,
          _skip_truncate: true,
          _cascade: true,
          _cascade_total_rows: (body._cascade_total_rows || 0) + total,
          _refresh_mv: body._refresh_mv || false,
        });
      } else {
        const grandTotal = (body._cascade_total_rows || 0) + total;
        log.push(`🏁 Cascade complete: ${grandTotal} total rows`);
        if (body._refresh_mv) {
          log.push('🔄 Refreshing MV...');
          await refreshMV();
          log.push('✅ MV refreshed');
        }

        const dur = `${((Date.now() - t0) / 1000).toFixed(1)}s`;
        await saveLog(`cascade-${fileKey}-${sh.sheet}`, true, dur, 
          [`Cascade complete: ${grandTotal} rows in ${sh.table}`], []);
      }

      return Response.json({ success: true, totalRows: total, log }, { headers: cors });
    }

    // ═══════════════════════════════════════════════════════════════
    // MODE 3: SINGLE FILE (possibly with auto-cascade for large sheets)
    // ═══════════════════════════════════════════════════════════════
    const filesToProcess = [arquivo];

    log.push('🔐 Autenticando...');
    const token = await getToken();
    log.push('✅ Token obtido');

    let needsMVRefresh = false;

    for (const fileKey of filesToProcess) {
      const fc = FILE_MAP[fileKey], fileId = FILE_IDS[fileKey];
      if (!fc || !fileId) { errors.push(`Desconhecido: ${fileKey}`); continue; }

      log.push(`\n📄 ${fileKey}`);

      const sheets = abaFiltro ? fc.sheets.filter(s => s.sheet === abaFiltro) : fc.sheets;

      for (const sh of sheets) {
        try {
          const dims = await getSheetDimensions(token, fileId, sh.sheet);

          if (dims === null) {
            sh.required
              ? (errors.push(`${sh.sheet}: não encontrada`), log.push(`   ❌ "${sh.sheet}" não encontrada`))
              : log.push(`   ⚪ "${sh.sheet}" opcional`);
            continue;
          }

          if (dims.rowCount < 2) {
            log.push(`   ⚠️ "${sh.sheet}" vazia`);
            continue;
          }

          const lastCol = colToLetter(dims.columnCount);
          const totalDataRows = dims.rowCount - 1;
          const effectiveStart = startRow ?? 2;
          const effectiveEnd = endRow ?? dims.rowCount;

          log.push(`   📊 "${sh.sheet}": ${totalDataRows} data rows`);

          if (!startRow && totalDataRows > MAX_ROWS_PER_CALL) {
            log.push(`   🔀 Auto-cascade: ${totalDataRows} rows → fatias de ${MAX_ROWS_PER_CALL}`);

            const firstEnd = Math.min(2 + MAX_ROWS_PER_CALL - 1, dims.rowCount);
            const firstTotal = await readAndInsertRange(
              token, fileId, sh.sheet, sh.table,
              2, firstEnd, dims.headers, lastCol,
              !skipTruncate, log
            );

            log.push(`   ✅ First slice: ${firstTotal} rows inserted`);

            const nextStart = firstEnd + 1;
            if (nextStart <= dims.rowCount) {
              const nextEnd = Math.min(nextStart + MAX_ROWS_PER_CALL - 1, dims.rowCount);
              log.push(`   🔥 Cascade fired: ${nextStart}-${dims.rowCount} (${dims.rowCount - nextStart + 1} remaining rows)`);
              fireAndForget({
                tipo,
                arquivo: fileKey,
                aba: sh.sheet,
                start_row: nextStart,
                end_row: nextEnd,
                _skip_truncate: true,
                _cascade: true,
                _cascade_total_rows: firstTotal,
                _refresh_mv: fileKey === 'base_receita' && !body._orchestrated,
              });
            }

            if (fileKey === 'base_receita') needsMVRefresh = false;

          } else {
            const truncate = skipTruncate ? false : (!startRow || startRow <= 2);
            const total = await readAndInsertRange(
              token, fileId, sh.sheet, sh.table,
              effectiveStart, effectiveEnd, dims.headers, lastCol,
              truncate, log
            );
            log.push(`   ✅ "${sh.sheet}" → ${sh.table} (${total} rows)`);
            if (fileKey === 'base_receita') needsMVRefresh = true;
          }

        } catch (e) {
          const message = getErrorMessage(e);
          errors.push(`${sh.sheet}: ${message}`);
          log.push(`   ❌ "${sh.sheet}": ${message}`);
        }
      }
    }

    if (needsMVRefresh && !body._orchestrated) {
      log.push('\n🔄 Refreshando MV...');
      await refreshMV();
      log.push('✅ MV atualizada');
    }

    const dur = `${((Date.now() - t0) / 1000).toFixed(1)}s`;
    log.push(`\n⏱️ ${dur}`);

    if (!body._orchestrated && !startRow) {
      await saveLog(tipo, errors.length === 0, dur, log, errors);
    }

    return Response.json({ success: errors.length === 0, arquivo, duracao: dur, log, errors }, { headers: cors });

  } catch (e) {
    const message = getErrorMessage(e);
    const dur = `${((Date.now() - t0) / 1000).toFixed(1)}s`;
    await saveLog('erro', false, dur, log, [message]).catch(() => {});
    return Response.json({ success: false, error: message, log }, { status: 500, headers: cors });
  }
});
