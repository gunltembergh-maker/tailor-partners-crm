import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

export default function ImportClients() {
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  const runImport = async () => {
    setLoading(true);
    setStatus("Baixando planilha...");
    try {
      const res = await fetch("/Base_CRM.xlsx");
      const buf = await res.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);

      setStatus(`Parseados ${rows.length} registros. Enviando...`);

      const clients = rows.map((r: any) => ({
        nome_razao: r["Nome Cliente"] || "SEM NOME",
        cpf_cnpj: r["Documento"] || null,
        tipo_pessoa: String(r["Tipo de Cliente"] || "").toUpperCase().includes("JURIDICA") || String(r["Tipo de Cliente"] || "").toUpperCase().includes("JURÍDICA") ? "PJ" : "PF",
        patrimonio_ou_receita: typeof r["PL Tailor"] === "number" ? r["PL Tailor"] : null,
        segmento: r["Setor"] || null,
        banker_name: r["Banker"] === "Sem Finder" ? null : r["Banker"] || null,
        finder_name: !r["Finder"] || r["Finder"] === "Sem Finder" ? null : r["Finder"],
        canal: !r["Canal"] || r["Canal"] === "Sem Canal" ? null : r["Canal"],
        advisor_name: r["Assessor"] || null,
        codigo_xp: r["Cód do Cliente"] ? String(r["Cód do Cliente"]) : null,
        pl_declarado: typeof r["PL Declarado"] === "number" ? r["PL Declarado"] : null,
        perfil: r["Perfil"] || null,
        nascimento: r["Nascimento"] ? String(r["Nascimento"]) : null,
        cidade: r["Cidade"] || null,
        estado: r["Estado"] || null,
        estado_civil: r["Estado Civil"] || null,
        tag: r["TAG"] || null,
        endereco: r["Endereço"] || null,
        sow: r["SoW"] ? String(r["SoW"]) : null,
        casa: r["Casa"] || null,
      }));

      // Send in batches of 200, first batch clears existing data
      const batchSize = 200;
      let totalInserted = 0;
      for (let i = 0; i < clients.length; i += batchSize) {
        const batch = clients.slice(i, i + batchSize);
        const { data, error } = await supabase.functions.invoke("import-clients", {
          body: { clients: batch, clearFirst: i === 0 },
        });
        if (error) {
          setStatus(`Erro no lote ${Math.floor(i/batchSize)+1}: ${error.message}`);
        } else {
          totalInserted += data?.inserted || 0;
        }
        setProgress(Math.min(100, Math.round(((i + batchSize) / clients.length) * 100)));
      }

      setStatus(`Importação concluída! ${totalInserted} clientes inseridos.`);
    } catch (err: any) {
      setStatus(`Erro: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <h1 className="text-2xl font-bold">Importar Base CRM</h1>
      <p className="text-muted-foreground max-w-md text-center">
        Clique para importar os ~770 clientes da planilha Base_CRM.xlsx para a tabela de Contas.
      </p>
      <Button onClick={runImport} disabled={loading} size="lg">
        {loading ? "Importando..." : "Iniciar Importação"}
      </Button>
      {progress > 0 && <Progress value={progress} className="w-64" />}
      {status && <p className="text-sm text-muted-foreground">{status}</p>}
    </div>
  );
}
