import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "npm:xlsx@0.18.5";

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

function findSheet(workbook: XLSX.WorkBook, sheetName: string): string | undefined {
  return (
    workbook.SheetNames.find((s) => s === sheetName) ||
    workbook.SheetNames.find((s) => s.toLowerCase() === sheetName.toLowerCase()) ||
    workbook.SheetNames.find((s) => s.toLowerCase().includes(sheetName.toLowerCase()))
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
    const workbook = XLSX.read(fileBytes, { type: "array" });

    let totalRows = 0;
    const errors: string[] = [];

    for (const [sheetName, tableName] of Object.entries(mapping.sheets)) {
      const actualSheetName = findSheet(workbook, sheetName);
      if (!actualSheetName) {
        errors.push(`Sheet "${sheetName}" not found. Available: ${workbook.SheetNames.join(", ")}`);
        continue;
      }

      const sheet = workbook.Sheets[actualSheetName];
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });
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
    // Auth por ingest-key
    const ingestKey = req.headers.get("x-ingest-key");
    const expectedKey = Deno.env.get("INGEST_KEY");
    if (!ingestKey || !expectedKey || ingestKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    }

    // BINÁRIO-ONLY: exige x-source-key
    const sourceKey = req.headers.get("x-source-key");
    const fileName = decodeURIComponentSafe(req.headers.get("x-file-name"));
    const sourcePath = decodeURIComponentSafe(req.headers.get("x-source-path"));

    if (!sourceKey) {
      return new Response(
        JSON.stringify({
          error: "Missing header x-source-key (Power Automate must send it).",
        }),
        { status: 400, headers },
      );
    }

    if (!SOURCE_MAP[sourceKey]) {
      return new Response(
        JSON.stringify({
          error: `Unknown sourceKey: ${sourceKey}. Valid: ${Object.keys(SOURCE_MAP).join(", ")}`,
        }),
        { status: 400, headers },
      );
    }

    // Lê binário
    const ab = await req.arrayBuffer();
    const fileBytes = new Uint8Array(ab);

    // Log “received”
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

    // Background job
    EdgeRuntime.waitUntil(processFileJob(logRow.id, sourceKey, fileBytes, fileName || null, sourcePath || null));

    // Power Automate precisa 200 OK
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
