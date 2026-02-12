import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function mapPorte(porte: string | null): string | null {
  if (!porte) return null;
  const upper = porte.toUpperCase();
  if (upper.includes("MEI") || upper.includes("ME")) return "PEQUENO";
  if (upper.includes("EPP")) return "MEDIO";
  if (upper.includes("DEMAIS")) return "GRANDE";
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cnpj } = await req.json();
    const cleaned = (cnpj || "").replace(/\D/g, "");

    if (cleaned.length !== 14) {
      return new Response(
        JSON.stringify({ error: "CNPJ deve ter 14 dígitos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleaned}`);

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: "CNPJ não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    const result = {
      razao_social: data.razao_social || "",
      email: data.email || "",
      telefone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1.substring(0, 2)}) ${data.ddd_telefone_1.substring(2)}` : "",
      atividade_principal: data.cnae_fiscal_descricao || "",
      porte: mapPorte(data.porte),
      uf: data.uf || "",
      municipio: data.municipio || "",
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Erro ao consultar CNPJ" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
