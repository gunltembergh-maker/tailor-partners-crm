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

    // Validate JWT - require authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
          codigo_xp: cleanField(cols[0]),
          pl_declarado: parseNumber(cols[4]),
          perfil: cleanField(cols[5]),
          nascimento: cleanField(cols[7]),
          cidade: cleanField(cols[8]),
          estado: cleanField(cols[9]),
          estado_civil: cleanField(cols[10]),
          tag: cleanField(cols[12]),
          endereco: cleanField(cols[13]),
          sow: cleanField(cols[14]),
          casa: cleanField(cols[19]),
        });
      }
    } else if (body.clients && Array.isArray(body.clients)) {
      records = body.clients.map((c: any) => ({
        nome_razao: c.nome_razao || "",
        cpf_cnpj: cleanField(c.cpf_cnpj),
        tipo_pessoa: parseTipoPessoa(c.tipo_pessoa || ""),
        patrimonio_ou_receita: parseNumber(String(c.patrimonio_ou_receita ?? "")),
        segmento: cleanField(c.segmento),
        banker_name: cleanField(c.banker_name),
        finder_name: cleanField(c.finder_name),
        canal: cleanField(c.canal),
        advisor_name: cleanField(c.advisor_name),
        status: "ATIVO_NET",
        codigo_xp: cleanField(c.codigo_xp),
        pl_declarado: parseNumber(String(c.pl_declarado ?? "")),
        perfil: cleanField(c.perfil),
        nascimento: cleanField(c.nascimento),
        cidade: cleanField(c.cidade),
        estado: cleanField(c.estado),
        estado_civil: cleanField(c.estado_civil),
        tag: cleanField(c.tag),
        endereco: cleanField(c.endereco),
        sow: cleanField(c.sow),
        casa: cleanField(c.casa),
      }));
    }

    if (records.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid records found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If clearFirst flag is set, delete all existing clients before inserting
    if (body.clearFirst) {
      const { error: delError } = await supabase.from("clients").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (delError) {
        return new Response(
          JSON.stringify({ error: `Failed to clear clients: ${delError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
