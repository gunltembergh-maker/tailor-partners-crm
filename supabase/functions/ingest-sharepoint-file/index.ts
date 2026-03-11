import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-ingest-key",
};

// Mapping: sourceKey -> { fileName pattern, sheets -> table }
const SOURCE_MAP: Record<string, { sheets: Record<string, string> }> = {
  captacao_total: {
    sheets: { "Captação Total": "raw_captacao_total" },
  },
  contas_total: {
    sheets: { "Contas Total": "raw_contas_total" },
  },
  diversificador: {
    sheets: {
      "Diversificador Consolidado": "raw_diversificador_consolidado",
      "Posição Renda Fixa": "raw_posicao_renda_fixa",
    },
  },
  saldo_consolidado: {
    sheets: { Tabela2: "raw_saldo_consolidado" },
  },
  depara: {
    sheets: {
      "Base CRM": "raw_base_crm",
      DePara: "raw_depara",
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
      "Comissões": "raw_comissoes_m0",
    },
  },
  nps: {
    sheets: {
      Envios: "raw_envios_nps",
      Medallia: "raw_nps_advisor",
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    // Validate ingest key
    const ingestKey = req.headers.get("x-ingest-key");
    const expectedKey = Deno.env.get("INGEST_KEY");
    if (!ingestKey || ingestKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers,
      });
    }

    const body = await req.json();
    const { sourceKey, fileName, sourcePath, contentBase64, ingestedAt } = body;

    if (!sourceKey || !contentBase64) {
      return new Response(
        JSON.stringify({ error: "sourceKey and contentBase64 are required" }),
        { status: 400, headers }
      );
    }

    const mapping = SOURCE_MAP[sourceKey];
    if (!mapping) {
      return new Response(
        JSON.stringify({
          error: `Unknown sourceKey: ${sourceKey}. Valid keys: ${Object.keys(SOURCE_MAP).join(", ")}`,
        }),
        { status: 400, headers }
      );
    }

    // Decode base64 to bytes
    const binaryString = atob(contentBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Parse Excel
    const workbook = XLSX.read(bytes, { type: "array" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let totalRows = 0;
    const errors: string[] = [];
    const sheetResults: Record<string, number> = {};

    for (const [sheetName, tableName] of Object.entries(mapping.sheets)) {
      // Find sheet (try exact match first, then case-insensitive, then partial)
      let actualSheetName = workbook.SheetNames.find(
        (s: string) => s === sheetName
      );
      if (!actualSheetName) {
        actualSheetName = workbook.SheetNames.find(
          (s: string) => s.toLowerCase() === sheetName.toLowerCase()
        );
      }
      if (!actualSheetName) {
        actualSheetName = workbook.SheetNames.find((s: string) =>
          s.toLowerCase().includes(sheetName.toLowerCase())
        );
      }

      if (!actualSheetName) {
        errors.push(
          `Sheet "${sheetName}" not found. Available: ${workbook.SheetNames.join(", ")}`
        );
        continue;
      }

      const sheet = workbook.Sheets[actualSheetName];
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
        defval: null,
      });

      if (rows.length === 0) {
        sheetResults[sheetName] = 0;
        continue;
      }

      // Truncate table
      const { error: delError } = await supabase
        .from(tableName)
        .delete()
        .gte("id", 0);

      if (delError) {
        errors.push(`Truncate ${tableName}: ${delError.message}`);
        continue;
      }

      // Insert in batches of 500
      const batchSize = 500;
      let insertedForSheet = 0;

      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize).map((row) => ({
          data: row,
        }));
        const { error: insError } = await supabase
          .from(tableName)
          .insert(batch);

        if (insError) {
          errors.push(
            `Insert ${tableName} batch ${Math.floor(i / batchSize) + 1}: ${insError.message}`
          );
        } else {
          insertedForSheet += batch.length;
        }
      }

      sheetResults[sheetName] = insertedForSheet;
      totalRows += insertedForSheet;
    }

    // Log to sync_logs
    const status = errors.length > 0 ? "partial" : "success";
    await supabase.from("sync_logs").insert({
      source_key: sourceKey,
      file_name: fileName || null,
      source_path: sourcePath || null,
      status,
      rows_written: totalRows,
      error: errors.length > 0 ? errors.join("; ") : null,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        sourceKey,
        fileName: fileName || null,
        status,
        rowsWritten: totalRows,
        sheets: sheetResults,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers }
    );
  } catch (err) {
    // Try to log the error
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      await supabase.from("sync_logs").insert({
        source_key: "unknown",
        status: "error",
        rows_written: 0,
        error: err.message,
      });
    } catch (_) {
      // ignore logging errors
    }

    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers,
    });
  }
});
