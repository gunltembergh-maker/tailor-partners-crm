import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { Upload, CheckCircle, XCircle, Loader2, ChevronDown, ChevronRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── MAPEAMENTO COMPLETO: Arquivo → Abas → Tabelas Supabase ───────────────────
// Cada entrada define quais abas de cada arquivo devem ser importadas
// e para qual tabela raw_ no Supabase cada aba vai
//
// REGRA: cada vez que o usuário importa um arquivo, TODAS as abas mapeadas
// são truncadas e reimportadas automaticamente.
// ──────────────────────────────────────────────────────────────────────────────

type SheetMapping = {
  sheet: string;          // nome exato da aba no Excel
  table: string;          // nome da tabela no Supabase (schema public)
  label: string;          // label amigável para o usuário
  required: boolean;      // se é obrigatória para o dashboard funcionar
};

type BaseConfig = {
  id: string;
  label: string;          // nome exibido no card
  description: string;    // dica para o usuário
  acceptedFiles: string[]; // nomes de arquivo aceitos (sem extensão, lowercase)
  sheets: SheetMapping[];
  color: string;          // cor do card
};

const BASES: BaseConfig[] = [
  {
    id: "base_receita",
    label: "Base Receita",
    description: "Base_Receita.xlsm — contém Comissões (mês atual) e Histórico",
    acceptedFiles: ["base_receita", "basereceita"],
    color: "#4472C4",
    sheets: [
      {
        sheet: "Comissões",
        table: "raw_comissoes_m0",
        label: "Comissões (mês atual)",
        required: true,
      },
      {
        sheet: "Comissões Histórico",
        table: "raw_comissoes_historico",
        label: "Comissões Histórico",
        required: true,
      },
    ],
  },
  {
    id: "captacao",
    label: "Captação",
    description: "Captação.xlsm — contém mês atual e histórico",
    acceptedFiles: ["captacao", "captação"],
    color: "#ED7D31",
    sheets: [
      {
        sheet: "Captação Total",
        table: "raw_captacao_total",
        label: "Captação Total (mês atual)",
        required: true,
      },
      {
        sheet: "Captação Histórico",
        table: "raw_captacao_historico",
        label: "Captação Histórico",
        required: true,
      },
    ],
  },
  {
    id: "base_contas",
    label: "Base Contas",
    description: "Base_Contas.xlsm — habilitações, ativações e migrações",
    acceptedFiles: ["base_contas", "basecontas"],
    color: "#A5A5A5",
    sheets: [
      {
        sheet: "Contas Total",
        table: "raw_contas_total",
        label: "Contas Total",
        required: true,
      },
    ],
  },
  {
    id: "positivador",
    label: "Positivador",
    description: "Positivador.xlsx — AuC total e M0, agrupado e desagrupado",
    acceptedFiles: ["positivador"],
    color: "#5B9BD5",
    sheets: [
      {
        sheet: "Positivador Total Agrupado",
        table: "raw_positivador_total_agrupado",
        label: "Total Agrupado (Faixa PL)",
        required: true,
      },
      {
        sheet: "Positivador Total Desagrupado",
        table: "raw_positivador_total_desagrupado",
        label: "Total Desagrupado (AuC por Casa)",
        required: true,
      },
      {
        sheet: "Positivador M0 Desagrupado",
        table: "raw_positivador_m0_desagrupado",
        label: "M0 Desagrupado (donut)",
        required: true,
      },
      {
        sheet: "Positivador M0 Agrupado",
        table: "raw_positivador_m0_agrupado",
        label: "M0 Agrupado",
        required: false,
      },
    ],
  },
  {
    id: "diversificador",
    label: "Diversificador",
    description: "Diversificador.xlsx — custódia consolidada",
    acceptedFiles: ["diversificador"],
    color: "#70AD47",
    sheets: [
      {
        sheet: "Diversificador Consolidado",
        table: "raw_diversificador_consolidado",
        label: "Diversificador Consolidado",
        required: true,
      },
    ],
  },
  {
    id: "depara",
    label: "DePara",
    description: "DePara.xlsm — CRM, assessores e mapeamentos",
    acceptedFiles: ["depara"],
    color: "#264478",
    sheets: [
      {
        sheet: "Base CRM",
        table: "raw_base_crm",
        label: "Base CRM",
        required: true,
      },
      {
        sheet: "DePara",
        table: "raw_depara",
        label: "DePara (assessores)",
        required: true,
      },
    ],
  },
];

// ─── Tipos de estado ───────────────────────────────────────────────────────────
type SheetStatus = "idle" | "reading" | "uploading" | "done" | "error" | "not_found";

type SheetResult = {
  sheet: string;
  table: string;
  label: string;
  status: SheetStatus;
  rows: number;
  error?: string;
};

type BaseResult = {
  baseId: string;
  label: string;
  timestamp: string;
  sheets: SheetResult[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, "")  // remove extensão
    .replace(/[\s_-]/g, "");
}

function detectBase(filename: string): BaseConfig | null {
  const norm = normalizeFileName(filename);
  return BASES.find(b => b.acceptedFiles.some(a => norm.includes(a))) ?? null;
}

async function truncateAndInsert(
  table: string,
  rows: Record<string, unknown>[]
): Promise<{ ok: boolean; error?: string }> {
  // 1. Truncar
  const { error: delErr } = await supabase.from(table as any).delete().neq("id", 0);
  // fallback: se não tiver coluna id, tenta delete sem filtro
  if (delErr) {
    const { error: delErr2 } = await (supabase.from(table as any) as any)
      .delete()
      .gte("created_at", "1970-01-01");
    if (delErr2) {
      // última tentativa: rpc truncate
      await supabase.rpc("truncate_table" as any, { tbl: table });
    }
  }

  if (rows.length === 0) return { ok: true };

  // 2. Inserir em lotes de 500
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map(row => ({ data: row }));
    const { error } = await supabase.from(table as any).insert(batch);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

function readSheet(
  workbook: XLSX.WorkBook,
  sheetName: string
): Record<string, unknown>[] | null {
  const ws = workbook.Sheets[sheetName];
  if (!ws) return null;
  const raw = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });
  return raw as Record<string, unknown>[];
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ImportarBases() {
  const [results, setResults] = useState<BaseResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // ─── Processar arquivo drop ───────────────────────────────────────────────
  const processFile = useCallback(async (file: File) => {
    const base = detectBase(file.name);
    if (!base) {
      alert(
        `Arquivo "${file.name}" não reconhecido.\n\nNomes aceitos:\n${BASES.map(b => b.description).join("\n")}`
      );
      return;
    }

    const resultId = base.id;
    const sheetResults: SheetResult[] = base.sheets.map(s => ({
      sheet: s.sheet,
      table: s.table,
      label: s.label,
      status: "reading" as SheetStatus,
      rows: 0,
    }));

    // Adiciona/atualiza o resultado
    const newResult: BaseResult = {
      baseId: base.id,
      label: base.label,
      timestamp: new Date().toLocaleString("pt-BR"),
      sheets: sheetResults,
    };
    setResults(prev => {
      const filtered = prev.filter(r => r.baseId !== resultId);
      return [newResult, ...filtered];
    });
    setExpanded(prev => new Set(prev).add(resultId));

    // Ler o arquivo Excel
    const buffer = await file.arrayBuffer();
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    } catch (e) {
      setResults(prev =>
        prev.map(r =>
          r.baseId === resultId
            ? {
                ...r,
                sheets: r.sheets.map(s => ({
                  ...s,
                  status: "error" as SheetStatus,
                  error: "Erro ao ler o arquivo Excel",
                })),
              }
            : r
        )
      );
      return;
    }

    // Processar cada aba
    for (const sheetDef of base.sheets) {
      const rows = readSheet(workbook, sheetDef.sheet);

      if (rows === null) {
        // Aba não encontrada
        setResults(prev =>
          prev.map(r =>
            r.baseId === resultId
              ? {
                  ...r,
                  sheets: r.sheets.map(s =>
                    s.sheet === sheetDef.sheet
                      ? {
                          ...s,
                          status: "not_found" as SheetStatus,
                          error: sheetDef.required
                            ? `Aba "${sheetDef.sheet}" não encontrada no arquivo`
                            : `Aba "${sheetDef.sheet}" não encontrada (opcional)`,
                        }
                      : s
                  ),
                }
              : r
          )
        );
        continue;
      }

      // Atualizar status para uploading
      setResults(prev =>
        prev.map(r =>
          r.baseId === resultId
            ? {
                ...r,
                sheets: r.sheets.map(s =>
                  s.sheet === sheetDef.sheet
                    ? { ...s, status: "uploading" as SheetStatus, rows: rows.length }
                    : s
                ),
              }
            : r
        )
      );

      // Upload para Supabase
      const { ok, error } = await truncateAndInsert(sheetDef.table, rows);

      setResults(prev =>
        prev.map(r =>
          r.baseId === resultId
            ? {
                ...r,
                sheets: r.sheets.map(s =>
                  s.sheet === sheetDef.sheet
                    ? {
                        ...s,
                        status: ok ? ("done" as SheetStatus) : ("error" as SheetStatus),
                        rows: rows.length,
                        error: error,
                      }
                    : s
                ),
              }
            : r
        )
      );
    }
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setProcessing(true);
      for (const file of acceptedFiles) {
        await processFile(file);
      }
      setProcessing(false);
    },
    [processFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.ms-excel.sheet.macroenabled.12": [".xlsm"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: true,
  });

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Importar Bases</h1>
        <p className="text-sm text-gray-500 mt-1">
          Arraste os arquivos Excel. Cada arquivo importa automaticamente todas as abas necessárias.
        </p>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:bg-gray-100"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto mb-3 text-gray-400" size={36} />
        {isDragActive ? (
          <p className="text-blue-600 font-medium">Solte os arquivos aqui…</p>
        ) : (
          <>
            <p className="font-medium text-gray-700">
              Arraste arquivos aqui ou clique para selecionar
            </p>
            <p className="text-xs text-gray-400 mt-1">
              .xlsm, .xlsx — Base Receita, Captação, Base Contas, Positivador, Diversificador, DePara
            </p>
          </>
        )}
        {processing && (
          <div className="flex items-center justify-center gap-2 mt-3 text-blue-600 text-sm">
            <Loader2 className="animate-spin" size={16} />
            Processando…
          </div>
        )}
      </div>

      {/* Mapa de bases esperadas */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <Info size={14} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Abas importadas por arquivo
          </span>
        </div>
        <div className="divide-y divide-gray-100">
          {BASES.map(base => (
            <div key={base.id} className="px-4 py-2.5">
              <div className="flex items-start gap-3">
                <div
                  className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                  style={{ background: base.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{base.label}</p>
                  <p className="text-xs text-gray-400">{base.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {base.sheets.map(s => (
                      <span
                        key={s.sheet}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                          s.required
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-gray-100 text-gray-500 border border-gray-200"
                        )}
                      >
                        {s.label}
                        {!s.required && (
                          <span className="text-gray-400">(opcional)</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resultados */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Última Importação por Base
          </h2>
          {results.map(result => {
            const allDone = result.sheets.every(
              s => s.status === "done" || s.status === "not_found"
            );
            const hasError = result.sheets.some(s => s.status === "error");
            const isLoading = result.sheets.some(
              s => s.status === "reading" || s.status === "uploading"
            );
            const isOpen = expanded.has(result.baseId);
            const totalRows = result.sheets.reduce((acc, s) => acc + s.rows, 0);

            return (
              <div
                key={result.baseId}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden"
              >
                {/* Header do card */}
                <button
                  onClick={() => toggleExpand(result.baseId)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <StatusIcon
                    done={allDone && !hasError}
                    error={hasError}
                    loading={isLoading}
                  />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-gray-800">{result.label}</p>
                    <p className="text-xs text-gray-400">{result.timestamp}</p>
                  </div>
                  {!isLoading && (
                    <span className="text-xs text-gray-500 font-medium">
                      {totalRows.toLocaleString("pt-BR")} linhas
                    </span>
                  )}
                  {isLoading ? (
                    <Loader2 size={14} className="text-blue-500 animate-spin ml-2" />
                  ) : isOpen ? (
                    <ChevronDown size={14} className="text-gray-400 ml-2" />
                  ) : (
                    <ChevronRight size={14} className="text-gray-400 ml-2" />
                  )}
                </button>

                {/* Detalhes das abas */}
                {isOpen && (
                  <div className="border-t border-gray-100">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left px-4 py-2 text-gray-500 font-medium">Aba</th>
                          <th className="text-left px-4 py-2 text-gray-500 font-medium">Tabela Supabase</th>
                          <th className="text-right px-4 py-2 text-gray-500 font-medium">Linhas</th>
                          <th className="text-center px-4 py-2 text-gray-500 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {result.sheets.map(s => (
                          <tr key={s.sheet} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 font-medium text-gray-700">{s.label}</td>
                            <td className="px-4 py-2.5 font-mono text-gray-400">{s.table}</td>
                            <td className="px-4 py-2.5 text-right text-gray-600">
                              {s.rows > 0 ? s.rows.toLocaleString("pt-BR") : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <SheetStatusBadge status={s.status} error={s.error} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function StatusIcon({
  done,
  error,
  loading,
}: {
  done: boolean;
  error: boolean;
  loading: boolean;
}) {
  if (loading) return <Loader2 size={18} className="text-blue-500 animate-spin flex-shrink-0" />;
  if (error) return <XCircle size={18} className="text-red-500 flex-shrink-0" />;
  if (done) return <CheckCircle size={18} className="text-green-500 flex-shrink-0" />;
  return <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />;
}

function SheetStatusBadge({
  status,
  error,
}: {
  status: SheetStatus;
  error?: string;
}) {
  switch (status) {
    case "done":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-semibold">
          <CheckCircle size={10} /> success
        </span>
      );
    case "error":
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-semibold"
          title={error}
        >
          <XCircle size={10} /> erro
        </span>
      );
    case "not_found":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 text-[10px] font-semibold">
          ⚠ não encontrada
        </span>
      );
    case "reading":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold">
          <Loader2 size={10} className="animate-spin" /> lendo…
        </span>
      );
    case "uploading":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold">
          <Loader2 size={10} className="animate-spin" /> enviando…
        </span>
      );
    default:
      return (
        <span className="text-gray-400 text-[10px]">aguardando</span>
      );
  }
}
