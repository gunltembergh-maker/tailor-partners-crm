import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function parseNumber(val: string): number | null {
  if (!val || val.trim() === "") return null;
  const cleaned = val.replace(/,/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseTipoPessoa(val: string): "PF" | "PJ" {
  if (!val) return "PF";
  const upper = val.toUpperCase().trim();
  if (upper.includes("JURIDICA") || upper.includes("JURÍDICA")) return "PJ";
  return "PF";
}

function cleanField(val: string | undefined | null): string | null {
  if (!val || val.trim() === "") return null;
  const trimmed = val.trim();
  const lower = trimmed.toLowerCase();
  if (lower === "sem finder" || lower === "sem canal") return null;
  return trimmed;
}

function parseMarkdownRow(row: string): string[] {
  // Split by | and remove first/last empty elements
  const parts = row.split("|");
  // Remove first and last empty strings from leading/trailing |
  if (parts.length > 0 && parts[0].trim() === "") parts.shift();
  if (parts.length > 0 && parts[parts.length - 1].trim() === "") parts.pop();
  return parts.map((p) => p.trim());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();

    // Accept either { lines: string[] } (markdown table rows) or { clients: object[] }
    let records: any[] = [];

    if (body.lines && Array.isArray(body.lines)) {
      // Parse markdown table rows
      // Expected columns: Cód do Cliente|Nome Cliente|Assessor|PL Tailor|PL Declarado|Perfil|Setor|Nascimento|Cidade|Estado|Estado Civil|Documento|TAG|Endereço|SoW|Tipo de Cliente|Banker|Finder|Canal|Casa
      // Indices:          0              |1           |2       |3        |4           |5     |6    |7         |8     |9     |10          |11       |12 |13      |14 |15             |16    |17    |18   |19

      for (const line of body.lines) {
        if (!line || line.startsWith("|-") || line.startsWith("|Cód")) continue;
        const cols = parseMarkdownRow(line);
        if (cols.length < 19) continue;

        records.push({
          nome_razao: cols[1] || "SEM NOME",
          cpf_cnpj: cleanField(cols[11]),
          tipo_pessoa: parseTipoPessoa(cols[15]),
          patrimonio_ou_receita: parseNumber(cols[3]),
          segmento: cleanField(cols[6]),
          banker_name: cleanField(cols[16]),
          finder_name: cleanField(cols[17]),
          canal: cleanField(cols[18]),
          advisor_name: cleanField(cols[2]),
          status: "ATIVO_NET",
        });
      }
    } else if (body.clients && Array.isArray(body.clients)) {
      records = body.clients.map((c: any) => ({
        nome_razao: c.nome_razao || "",
        cpf_cnpj: cleanField(c.cpf_cnpj),
        tipo_pessoa: parseTipoPessoa(c.tipo_pessoa || ""),
        patrimonio_ou_receita: parseNumber(String(c.patrimonio_ou_receita || "0")),
        segmento: cleanField(c.segmento),
        banker_name: cleanField(c.banker_name),
        finder_name: cleanField(c.finder_name),
        canal: cleanField(c.canal),
        advisor_name: cleanField(c.advisor_name),
        status: "ATIVO_NET",
      }));
    }

    if (records.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid records found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert in batches of 50
    const batchSize = 50;
    let inserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error } = await supabase.from("clients").insert(batch);

      if (error) {
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      } else {
        inserted += batch.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_parsed: records.length,
        inserted,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
