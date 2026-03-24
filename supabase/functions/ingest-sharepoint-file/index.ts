import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import ExcelJS from "npm:exceljs@4.4.0";

declare const EdgeRuntime: { waitUntil(p: Promise<void>): void };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-ingest-key, x-source-key, x-file-name, x-source-path",
};

const SOURCE_MAP: Record<string, { sheets: Record<string, string> }> = {
  captacao_total: { sheets: { "Captação Total": "raw_captacao_total" } },
  contas_total: { sheets: { "Contas Total": "raw_contas_total" } },
  diversificador: {
    sheets: {
      "Diversificador Consolidado": "raw_diversificador_consolidado",
      "Posição Renda Fixa": "raw_posicao_renda_fixa",
    },
  },
  saldo_consolidado: { sheets: { Tabela2: "raw_saldo_consolidado" } },
  depara: {
    sheets: {
      DePara: "raw_depara",
      "Base CRM": "raw_base_crm",
      "Base Consolidada": "raw_base_consolidada",
      "Base Câmbio": "raw_base_cambio",
      "Base Gestora": "raw_base_gestora",
      "Base Corporate Seguros": "raw_base_corp_seguros",
      "Base Avenue": "raw_base_avenue",
      "F & O": "raw_base_fo",
      "Base Lavoro": "raw_base_lavoro",
      Desligados: "raw_desligados",
      "Produzido Histórico": "raw_produzido_historico",
      "Pódio": "raw_podio",
    },
  },
  positivador: {
    sheets: {
      "Ordem PL": "raw_ordem_pl",
      "Positivador Total Desagrupado": "raw_positivador_total_desagrupado",
      "Positivador Total Agrupado": "raw_positivador_total_agrupado",
      "Positivador M0 Desagrupado": "raw_positivador_m0_desagrupado",
      "Positivador M0 Agrupado": "raw_positivador_m0_agrupado",
    },
  },
  base_receita: {
    sheets: {
      "Comissões Histórico": "raw_comissoes_historico",
      Comissões: "raw_comissoes_m0",
    },
  },
  nps: { sheets: { Envios: "raw_envios_nps", Medallia: "raw_nps_advisor" } },
};

function getSupabaseClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
}

function decodeURIComponentSafe(v: string | null) {
  if (!v) return null;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function getCellValue(cell: any): unknown {
  if (!cell || cell.value === null || cell.value === undefined) return null;
  const v = cell.value;
  if (typeof v === "object" && v !== null && "richText" in v) {
    return (v.richText as { text: string }[]).map((r: any) => r.text).join("");
  }
  if (typeof v === "object" && v !== null && "result" in v) {
    return v.result ?? null;
  }
  if (typeof v === "object" && v !== null && "text" in v && "hyperlink" in v) {
    return v.text;
  }
  if (typeof v === "object" && v !== null && "error" in v) {
    return null;
  }
  if (v instanceof Date) {
    return v.toISOString().split("T")[0];
  }
  return v;
}

function worksheetToJson(ws: any): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  let headers: string[] = [];

  ws.eachRow((row: any, rowNumber: number) => {
    if (rowNumber === 1) {
      headers = row.values
        ? (row.values as any[]).slice(1).map((v: any) => (v != null ? String(v).trim() : `col_${rowNumber}`))
        : [];
      return;
    }

    const obj: Record<string, unknown> = {};
    let hasValue = false;
    for (let i = 0; i < headers.length; i++) {
      const cell = row.getCell(i + 1);
      const val = getCellValue(cell);
      obj[headers[i]] = val;
      if (val !== null && val !== undefined && val !== "") hasValue = true;
    }
    if (hasValue) rows.push(obj);
  });

  return rows;
}

function findWorksheet(workbook: any, sheetName: string): any | undefined {
  return (
    workbook.worksheets.find((ws: any) => ws.name === sheetName) ||
    workbook.worksheets.find((ws: any) => ws.name.toLowerCase() === sheetName.toLowerCase()) ||
    workbook.worksheets.find((ws: any) => ws.name.toLowerCase().includes(sheetName.toLowerCase()))
  );
}

async function processFileJob(
  logId: string,
  sourceKey: string,
  fileBytes: Uint8Array,
  fileName: string | null,
  sourcePath: string | null,
) {
  const supabase = getSupabaseClient();
  const mapping = SOURCE_MAP[sourceKey];

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBytes.buffer);

    let totalRows = 0;
    const errors: string[] = [];

    for (const [sheetName, tableName] of Object.entries(mapping.sheets)) {
      const ws = findWorksheet(workbook, sheetName);
      if (!ws) {
        const available = workbook.worksheets.map((w: any) => w.name).join(", ");
        errors.push(`Sheet "${sheetName}" not found. Available: ${available}`);
        continue;
      }

      const rows = worksheetToJson(ws);
      if (rows.length === 0) continue;

      const { error: delError } = await supabase.from(tableName).delete().gte("id", 0);
      if (delError) {
        errors.push(`Truncate ${tableName}: ${delError.message}`);
        continue;
      }

      const batchSize = 500;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize).map((row) => ({ data: row }));
        const { error: insError } = await supabase.from(tableName).insert(batch);
        if (insError) {
          errors.push(`Insert ${tableName} batch ${Math.floor(i / batchSize) + 1}: ${insError.message}`);
        } else {
          totalRows += batch.length;
        }
      }
    }

    const status = errors.length > 0 ? "partial" : "success";
    await supabase
      .from("sync_logs")
      .update({
        status,
        rows_written: totalRows,
        error: errors.length > 0 ? errors.join("; ") : null,
      })
      .eq("id", logId);
  } catch (err: any) {
    await supabase
      .from("sync_logs")
      .update({
        status: "error",
        rows_written: 0,
        error: err?.message ?? String(err),
      })
      .eq("id", logId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const ingestKey = req.headers.get("x-ingest-key");
    const expectedKey = Deno.env.get("INGEST_KEY");
    if (!ingestKey || !expectedKey || ingestKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    }

    const sourceKey = req.headers.get("x-source-key");
    const fileName = decodeURIComponentSafe(req.headers.get("x-file-name"));
    const sourcePath = decodeURIComponentSafe(req.headers.get("x-source-path"));

    if (!sourceKey) {
      return new Response(
        JSON.stringify({ error: "Missing header x-source-key (Power Automate must send it)." }),
        { status: 400, headers },
      );
    }

    if (!SOURCE_MAP[sourceKey]) {
      return new Response(
        JSON.stringify({ error: `Unknown sourceKey: ${sourceKey}. Valid: ${Object.keys(SOURCE_MAP).join(", ")}` }),
        { status: 400, headers },
      );
    }

    const ab = await req.arrayBuffer();
    const fileBytes = new Uint8Array(ab);

    const supabase = getSupabaseClient();
    const { data: logRow, error: logError } = await supabase
      .from("sync_logs")
      .insert({
        source_key: sourceKey,
        file_name: fileName || null,
        source_path: sourcePath || null,
        status: "received",
        rows_written: 0,
      })
      .select("id")
      .single();

    if (logError || !logRow) {
      return new Response(JSON.stringify({ error: `Failed to create sync log: ${logError?.message}` }), {
        status: 500,
        headers,
      });
    }

    EdgeRuntime.waitUntil(processFileJob(logRow.id, sourceKey, fileBytes, fileName || null, sourcePath || null));

    return new Response(
      JSON.stringify({
        ok: true,
        status: "accepted",
        sourceKey,
        fileName: fileName || null,
        logId: logRow.id,
      }),
      { status: 200, headers },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), { status: 500, headers });
  }
});
