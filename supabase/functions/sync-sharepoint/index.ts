/**
 * sync-sharepoint Edge Function
 * 
 * Handles syncing Excel files from SharePoint to Supabase raw tables.
 * Uses a cascade pattern for large sheets: each slice fires the next
 * slice asynchronously, avoiding timeout on the orchestrator.
 * 
 * Modes:
 *  - tipo=todos: orchestrator dispatches each file sequentially
 *  - arquivo=X: processes single file, auto-cascading large sheets
 *  - arquivo=X + aba + start_row/end_row: processes a specific slice
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
      { sheet: 'Base CRM', table: 'raw_base_crm', required: true },
      { sheet: 'DePara',   table: 'raw_depara',    required: true },
    ]
  },
};

const ALL_FILES = Object.keys(FILE_MAP);
const READ_CHUNK = 2000;
// Max rows per single invocation to stay well within 400s timeout
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

async function insertChunk(table: string, rows: Record<string, unknown>[], truncate: boolean): Promise<void> {
  if (RPC_TABLES.has(table)) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/rpc_sync_bulk_insert`, {
      method: 'POST', headers: rpcHeaders,
      body: JSON.stringify({ p_table: table, p_rows: rows, p_truncate: truncate })
    });
    if (!r.ok) throw new Error(`RPC ${table}: ${(await r.text()).substring(0, 200)}`);
    const res = await r.json();
    if (res.success === false) throw new Error(`RPC erro: ${res.error}`);
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

async function refreshMV(): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/rpc_refresh_mv_comissoes`, {
    method: 'POST', headers: rpcHeaders, body: JSON.stringify({}),
  });
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

// Fire-and-forget: dispatch without waiting for response
function fireAndForget(body: Record<string, unknown>): void {
  const url = `${SUPABASE_URL}/functions/v1/sync-sharepoint`;
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify(body),
  }).catch(() => {}); // intentionally not awaited
}

// Self-invoke and wait for response
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

    // ═══════════════════════════════════════════════════════════════
    // MODE 1: ORCHESTRATOR (tipo=todos)
    // Process each file sequentially via self-invoke
    // ═══════════════════════════════════════════════════════════════
    if (arquivo === 'todos' && !abaFiltro && !startRow) {
      log.push('🔐 Autenticando...');
      await getToken(); // validate creds early
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
    // Process a specific row range, then fire-and-forget the NEXT slice
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

      // Fire next slice if there are more rows
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
        // Last slice: refresh MV if needed
        const grandTotal = (body._cascade_total_rows || 0) + total;
        log.push(`🏁 Cascade complete: ${grandTotal} total rows`);
        if (body._refresh_mv) {
          log.push('🔄 Refreshing MV...');
          await refreshMV();
          log.push('✅ MV refreshed');
        }

        // Save a completion log
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
          const totalDataRows = dims.rowCount - 1; // minus header
          const effectiveStart = startRow ?? 2;
          const effectiveEnd = endRow ?? dims.rowCount;

          log.push(`   📊 "${sh.sheet}": ${totalDataRows} data rows`);

          // If sheet is large and no explicit range: use CASCADE pattern
          if (!startRow && totalDataRows > MAX_ROWS_PER_CALL) {
            log.push(`   🔀 Auto-cascade: ${totalDataRows} rows → fatias de ${MAX_ROWS_PER_CALL}`);

            // Process FIRST slice inline (includes truncate)
            const firstEnd = Math.min(2 + MAX_ROWS_PER_CALL - 1, dims.rowCount);

            const firstTotal = await readAndInsertRange(
              token, fileId, sh.sheet, sh.table,
              2, firstEnd, dims.headers, lastCol,
              !skipTruncate, log // truncate on first slice
            );

            log.push(`   ✅ First slice: ${firstTotal} rows inserted`);

            // Fire cascade for remaining slices (fire-and-forget)
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

            // Mark that first slice is done for this sheet
            if (fileKey === 'base_receita') needsMVRefresh = false; // cascade will handle it

          } else {
            // Small sheet or explicit range: process inline
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
          errors.push(`${sh.sheet}: ${e.message}`);
          log.push(`   ❌ "${sh.sheet}": ${e.message}`);
        }
      }
    }

    // Refresh MV only for small sheets that were fully processed inline
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
    const dur = `${((Date.now() - t0) / 1000).toFixed(1)}s`;
    await saveLog('erro', false, dur, log, [e.message]).catch(() => {});
    return Response.json({ success: false, error: e.message, log }, { status: 500, headers: cors });
  }
});
