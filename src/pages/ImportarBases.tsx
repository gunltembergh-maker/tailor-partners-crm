import React, { useState, useCallback, useEffect, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2, AlertTriangle,
  ChevronDown, ChevronRight, Ban,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

// ── Constants ──
const BATCH_SIZE = 250;
const CHUNK_SIZE = 2000;
const MAX_RETRIES = 2;
const RETRY_DELAY = 500;

// ── sourceKey → sheet → table mapping ──
const SOURCE_MAP: Record<string, { label: string; sheets: Record<string, string> }> = {
  captacao_total: {
    label: "Captação Total",
    sheets: { "Captação Total": "raw_captacao_total" },
  },
  contas_total: {
    label: "Base Contas",
    sheets: { "Contas Total": "raw_contas_total" },
  },
  depara: {
    label: "DePara",
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
      Pódio: "raw_podio",
    },
  },
  diversificador: {
    label: "Diversificador",
    sheets: { "Diversificador Consolidado": "raw_diversificador_consolidado" },
  },
  positivador: {
    label: "Positivador",
    sheets: {
      "Ordem PL": "raw_ordem_pl",
      "Positivador Total Desagrupado": "raw_positivador_total_desagrupado",
      "Positivador Total Agrupado": "raw_positivador_total_agrupado",
      "Positivador M0 Desagrupado": "raw_positivador_m0_desagrupado",
      "Positivador M0 Agrupado": "raw_positivador_m0_agrupado",
    },
  },
  base_receita: {
    label: "Base Receita",
    sheets: {
      "Comissões Histórico": "raw_comissoes_historico",
      Comissões: "raw_comissoes_m0",
    },
  },
  consolidado_receita: {
    label: "Consolidado Receita",
    sheets: { __first__: "raw_consolidado_receita" },
  },
};

// Tables that use month-based partitioning instead of full truncate
const PARTITIONED_TABLES: Record<string, string> = {
  raw_comissoes_historico: "Data",
  raw_comissoes_m0: "Data",
};

const IGNORED_KEYS = ["mtm rf", "nps"];

type FileStatus = "pending" | "importing" | "success" | "error" | "ignored" | "cancelled";

interface FileEntry {
  id: string;
  file: File;
  sourceKey: string | null;
  detectedKey: string | null;
  status: FileStatus;
  rowsImported: number;
  totalRows: number;
  errorMsg: string | null;
  sheetsFound: string[];
  logs: string[];
  percentComplete: number;
  startTime: number | null;
  mesAnoList: string[];
}

// ── Valid table names ──
type RawTable =
  | "raw_captacao_total" | "raw_contas_total" | "raw_base_crm" | "raw_depara"
  | "raw_diversificador_consolidado" | "raw_ordem_pl"
  | "raw_positivador_total_desagrupado" | "raw_positivador_total_agrupado"
  | "raw_positivador_m0_desagrupado" | "raw_positivador_m0_agrupado"
  | "raw_comissoes_historico" | "raw_comissoes_m0" | "raw_consolidado_receita";

// ── Helpers ──
function normalize(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function detectSourceKey(fileName: string): { key: string | null; ignored: boolean } {
  const n = normalize(fileName);
  for (const ik of IGNORED_KEYS) {
    if (n.includes(ik)) return { key: null, ignored: true };
  }
  if (n.includes("captacao")) return { key: "captacao_total", ignored: false };
  if (n.includes("base contas") || n.includes("contas total")) return { key: "contas_total", ignored: false };
  if (n.includes("depara")) return { key: "depara", ignored: false };
  if (n.includes("diversificador")) return { key: "diversificador", ignored: false };
  if (n.includes("positivador")) return { key: "positivador", ignored: false };
  if (n.includes("base receita")) return { key: "base_receita", ignored: false };
  if (n.includes("consolidado receita") || n.includes("consolidado_receita"))
    return { key: "consolidado_receita", ignored: false };
  return { key: null, ignored: false };
}

function findSheet(sheetNames: string[], target: string): string | undefined {
  return (
    sheetNames.find((s) => s === target) ||
    sheetNames.find((s) => s.toLowerCase() === target.toLowerCase()) ||
    sheetNames.find((s) => s.toLowerCase().includes(target.toLowerCase()))
  );
}

function parseMesAno(value: unknown): string | null {
  if (value == null) return null;
  // If it's a Date object (cellDates:true)
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    return `${y}${m}`;
  }
  // If it's a string like "2025-01-15" or "15/01/2025" or Excel serial
  const s = String(value).trim();
  if (!s) return null;
  // Try parsing as number (Excel serial date)
  const num = Number(s);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const d = XLSX.SSF.parse_date_code(num);
    if (d) return `${d.y}${String(d.m).padStart(2, "0")}`;
  }
  // Try Date constructor
  const d = new Date(s);
  if (!isNaN(d.getTime()) && d.getFullYear() > 1990) {
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return null;
}

function getSheetRange(sheet: XLSX.WorkSheet): { startRow: number; endRow: number; ref: string } | null {
  const ref = sheet["!ref"];
  if (!ref) return null;
  const range = XLSX.utils.decode_range(ref);
  return { startRow: range.s.r, endRow: range.e.r, ref };
}

/** Parse a chunk of rows from a sheet, using header row from row 0 */
function parseChunk(
  sheet: XLSX.WorkSheet,
  startRow: number,
  endRow: number,
  headerRow: number,
): Record<string, unknown>[] {
  // Build a temporary range string
  const range = XLSX.utils.decode_range(sheet["!ref"]!);
  range.s.r = headerRow;
  range.e.r = endRow;
  const allRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    range,
    defval: null,
  });
  // Skip rows before startRow (header is row 0, data starts at row 1)
  const skipCount = startRow - headerRow - 1;
  if (skipCount > 0) {
    return allRows.slice(skipCount);
  }
  return allRows;
}

const yieldThread = () => new Promise<void>((r) => setTimeout(r, 0));

async function insertBatchWithRetry(
  tableName: RawTable,
  batch: Record<string, unknown>[],
  addLog: (msg: string) => void,
): Promise<{ inserted: number; error: string | null }> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const { error } = await supabase.from(tableName).insert(batch as any);
    if (!error) return { inserted: batch.length, error: null };
    if (attempt < MAX_RETRIES) {
      addLog(`⚠️ Retry ${attempt + 1}/${MAX_RETRIES} em ${tableName}: ${error.message}`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY * (attempt + 1)));
    } else {
      return { inserted: 0, error: error.message };
    }
  }
  return { inserted: 0, error: "Max retries exceeded" };
}

// ── Component ──
export default function ImportarBases() {
  const { role } = useAuth();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const [lastSyncs, setLastSyncs] = useState<Record<string, { received_at: string; rows_written: number; status: string }>>({});
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);
  const importingRef = useRef(false);

  useEffect(() => { loadLastSyncs(); }, []);

  async function loadLastSyncs() {
    const { data } = await supabase
      .from("sync_logs")
      .select("source_key, received_at, rows_written, status")
      .in("status", ["success", "partial"])
      .order("received_at", { ascending: false })
      .limit(100);
    if (!data) return;
    const map: typeof lastSyncs = {};
    for (const row of data) {
      if (!map[row.source_key]) {
        map[row.source_key] = { received_at: row.received_at, rows_written: row.rows_written ?? 0, status: row.status };
      }
    }
    setLastSyncs(map);
  }

  const addFiles = useCallback((fileList: FileList) => {
    const newEntries: FileEntry[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const { key, ignored } = detectSourceKey(file.name);
      newEntries.push({
        id: `${Date.now()}-${i}`,
        file,
        sourceKey: ignored ? "__ignored__" : key,
        detectedKey: key,
        status: ignored ? "ignored" : "pending",
        rowsImported: 0,
        totalRows: 0,
        errorMsg: ignored ? "Ignorado nesta fase (MtM RF / NPS)" : null,
        sheetsFound: [],
        logs: [],
        percentComplete: 0,
        startTime: null,
        mesAnoList: [],
      });
    }
    setFiles((prev) => [...prev, ...newEntries]);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true); }, []);
  const onDragLeave = useCallback(() => setDragging(false), []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const updateFile = useCallback((id: string, patch: Partial<FileEntry>) =>
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f))), []);

  const addLog = useCallback((id: string, msg: string) =>
    setFiles((prev) => prev.map((f) =>
      f.id === id ? { ...f, logs: [...f.logs, `[${new Date().toLocaleTimeString("pt-BR")}] ${msg}`] } : f
    )), []);

  const toggleLogs = useCallback((id: string) =>
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    }), []);

  // ── Import single file ──
  async function importFile(entry: FileEntry) {
    if (!entry.sourceKey || entry.sourceKey === "__ignored__") return;
    const mapping = SOURCE_MAP[entry.sourceKey];
    if (!mapping) return;

    updateFile(entry.id, { status: "importing", errorMsg: null, startTime: Date.now(), rowsImported: 0, percentComplete: 0 });
    addLog(entry.id, `Iniciando importação: ${entry.file.name}`);

    // Create sync_log record
    const { data: syncRow } = await supabase.from("sync_logs").insert({
      source_key: entry.sourceKey,
      file_name: entry.file.name,
      status: "importing",
      rows_written: 0,
    } as any).select("id").single();
    const syncId = syncRow?.id;

    try {
      // Read workbook
      const ext = entry.file.name.split(".").pop()?.toLowerCase();
      let workbook: XLSX.WorkBook;

      if (ext === "xml") {
        const text = await entry.file.text();
        workbook = XLSX.read(text, { type: "string" });
      } else {
        // xlsx, xlsm
        try {
          const ab = await entry.file.arrayBuffer();
          workbook = XLSX.read(ab, { type: "array", cellDates: true });
        } catch (parseErr: any) {
          if (ext === "xlsm") {
            toast({
              title: "Erro ao ler .xlsm",
              description: "Arquivo com macros pode causar erro. Salve como .xlsx e tente novamente.",
              variant: "destructive",
            });
          }
          throw parseErr;
        }
      }

      const sheetsFound = workbook.SheetNames;
      updateFile(entry.id, { sheetsFound });
      addLog(entry.id, `Abas encontradas: ${sheetsFound.join(", ")}`);

      // Calculate total rows across all mapped sheets
      let grandTotalRows = 0;
      const sheetMappings: { sheetName: string; actualSheet: string; tableName: string }[] = [];

      for (const [sheetName, tableName] of Object.entries(mapping.sheets)) {
        let actualSheet: string | undefined;
        if (sheetName === "__first__") {
          actualSheet = sheetsFound[0];
        } else {
          actualSheet = findSheet(sheetsFound, sheetName);
        }
        if (!actualSheet) {
          addLog(entry.id, `⚠️ Aba "${sheetName}" não encontrada`);
          continue;
        }
        const sheet = workbook.Sheets[actualSheet];
        const rangeInfo = getSheetRange(sheet);
        if (rangeInfo) {
          grandTotalRows += rangeInfo.endRow - rangeInfo.startRow; // approximate
          sheetMappings.push({ sheetName, actualSheet, tableName });
        }
      }

      updateFile(entry.id, { totalRows: grandTotalRows });

      let totalRowsInserted = 0;
      const errors: string[] = [];
      const allMesAno = new Set<string>();

      for (const { sheetName, actualSheet, tableName } of sheetMappings) {
        if (abortRef.current) {
          addLog(entry.id, "❌ Importação cancelada pelo usuário");
          break;
        }

        addLog(entry.id, `📋 Processando aba "${actualSheet}" → ${tableName}`);
        const sheet = workbook.Sheets[actualSheet];
        const rangeInfo = getSheetRange(sheet);
        if (!rangeInfo) continue;

        const isPartitioned = tableName in PARTITIONED_TABLES;
        const dateColumn = isPartitioned ? PARTITIONED_TABLES[tableName] : null;

        if (isPartitioned && dateColumn) {
          // ── Partitioned import (by mes_ano) ──
          addLog(entry.id, `📅 Modo particionado por mês (coluna "${dateColumn}")`);

          // Parse all rows in chunks, grouping by mes_ano
          const byMesAno: Record<string, Record<string, unknown>[]> = {};
          let invalidDateCount = 0;
          const headerRow = rangeInfo.startRow;

          for (let chunkStart = headerRow + 1; chunkStart <= rangeInfo.endRow; chunkStart += CHUNK_SIZE) {
            if (abortRef.current) break;
            const chunkEnd = Math.min(chunkStart + CHUNK_SIZE - 1, rangeInfo.endRow);
            const rows = parseChunk(sheet, chunkStart, chunkEnd, headerRow);

            for (const row of rows) {
              const dateVal = row[dateColumn];
              const mesAno = parseMesAno(dateVal);
              if (!mesAno) {
                invalidDateCount++;
                continue;
              }
              if (!byMesAno[mesAno]) byMesAno[mesAno] = [];
              byMesAno[mesAno].push(row);
            }

            await yieldThread();
          }

          if (invalidDateCount > 0) {
            addLog(entry.id, `⚠️ ${invalidDateCount} linhas com data inválida ignoradas em "${actualSheet}"`);
          }

          const periods = Object.keys(byMesAno).sort();
          addLog(entry.id, `Períodos encontrados: ${periods.join(", ")}`);

          for (const mesAno of periods) {
            if (abortRef.current) break;
            const rows = byMesAno[mesAno];

            // Delete existing data for this period
            addLog(entry.id, `🗑️ Deletando ${mesAno} em ${tableName}`);
            const { error: delErr } = await (supabase
              .from(tableName as RawTable)
              .delete() as any)
              .eq("mes_ano", mesAno);
            if (delErr) {
              errors.push(`Delete ${tableName} ${mesAno}: ${delErr.message}`);
              addLog(entry.id, `❌ Erro ao deletar ${mesAno}: ${delErr.message}`);
              continue;
            }

            // Insert in batches
            for (let i = 0; i < rows.length; i += BATCH_SIZE) {
              if (abortRef.current) break;
              const batch = rows.slice(i, i + BATCH_SIZE).map((row) => ({
                data: row as any,
                mes_ano: mesAno,
              }));

              const result = await insertBatchWithRetry(
                tableName as RawTable,
                batch,
                (msg) => addLog(entry.id, msg),
              );

              if (result.error) {
                errors.push(`Insert ${tableName} ${mesAno} batch: ${result.error}`);
                addLog(entry.id, `❌ Erro batch ${tableName}: ${result.error}`);
              } else {
                totalRowsInserted += result.inserted;
              }

              const pct = grandTotalRows > 0
                ? Math.round((totalRowsInserted / grandTotalRows) * 100)
                : 0;
              updateFile(entry.id, { rowsImported: totalRowsInserted, percentComplete: Math.min(pct, 100) });
              await yieldThread();
            }

            allMesAno.add(mesAno);
            addLog(entry.id, `✅ ${mesAno}: ${rows.length} linhas inseridas`);
          }
        } else {
          // ── Full truncate + insert (non-partitioned) ──
          addLog(entry.id, `🗑️ Limpando tabela ${tableName}`);
          const { error: delErr } = await supabase
            .from(tableName as RawTable)
            .delete()
            .gte("id", 0);
          if (delErr) {
            errors.push(`Limpar ${tableName}: ${delErr.message}`);
            addLog(entry.id, `❌ Erro ao limpar: ${delErr.message}`);
            continue;
          }

          // Parse and insert in chunks
          const headerRow = rangeInfo.startRow;
          for (let chunkStart = headerRow + 1; chunkStart <= rangeInfo.endRow; chunkStart += CHUNK_SIZE) {
            if (abortRef.current) break;
            const chunkEnd = Math.min(chunkStart + CHUNK_SIZE - 1, rangeInfo.endRow);
            const rows = parseChunk(sheet, chunkStart, chunkEnd, headerRow);

            for (let i = 0; i < rows.length; i += BATCH_SIZE) {
              if (abortRef.current) break;
              const batch = rows.slice(i, i + BATCH_SIZE).map((row) => ({ data: row as any }));

              const result = await insertBatchWithRetry(
                tableName as RawTable,
                batch,
                (msg) => addLog(entry.id, msg),
              );

              if (result.error) {
                errors.push(`Insert ${tableName} batch: ${result.error}`);
                addLog(entry.id, `❌ Erro batch ${tableName}: ${result.error}`);
              } else {
                totalRowsInserted += result.inserted;
              }

              const pct = grandTotalRows > 0
                ? Math.round((totalRowsInserted / grandTotalRows) * 100)
                : 0;
              updateFile(entry.id, { rowsImported: totalRowsInserted, percentComplete: Math.min(pct, 100) });
              await yieldThread();
            }

            addLog(entry.id, `Chunk processado: ${Math.min(chunkStart + CHUNK_SIZE - 1, rangeInfo.endRow) - chunkStart + 1} linhas`);
          }

          addLog(entry.id, `✅ ${tableName}: ${totalRowsInserted} linhas inseridas`);
        }
      }

      const finalStatus = abortRef.current
        ? "cancelled"
        : errors.length > 0
          ? "error"
          : "success";

      const mesAnoArr = Array.from(allMesAno).sort();

      updateFile(entry.id, {
        status: finalStatus === "cancelled" ? "error" : (errors.length > 0 ? "error" : "success"),
        rowsImported: totalRowsInserted,
        percentComplete: 100,
        errorMsg: errors.length > 0 ? errors.join("; ") : (abortRef.current ? "Cancelado" : null),
        mesAnoList: mesAnoArr,
      });

      // Update sync_logs
      if (syncId) {
        await supabase.from("sync_logs").update({
          status: abortRef.current ? "error" : (errors.length > 0 ? "partial" : "success"),
          rows_written: totalRowsInserted,
          error: errors.length > 0 ? errors.join("; ") : (abortRef.current ? "Cancelado pelo usuário" : null),
          mes_ano_list: mesAnoArr.length > 0 ? mesAnoArr : null,
        } as any).eq("id", syncId);
      }

      addLog(entry.id, `Importação finalizada: ${totalRowsInserted} linhas, status: ${finalStatus}`);
      loadLastSyncs();

      // Signal dashboard refresh after successful/partial import
      if (finalStatus === "success" || (errors.length > 0 && totalRowsInserted > 0)) {
        try {
          await supabase.rpc("increment_dashboard_refresh" as any);
          addLog(entry.id, "📊 Sinal de refresh do dashboard enviado");
        } catch (e) {
          // Non-critical, don't block
        }
      }
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      updateFile(entry.id, { status: "error", errorMsg: msg, percentComplete: 0 });
      addLog(entry.id, `❌ Erro fatal: ${msg}`);

      if (syncId) {
        await supabase.from("sync_logs").update({
          status: "error",
          rows_written: 0,
          error: msg,
        } as any).eq("id", syncId);
      }
    }
  }

  async function importAll() {
    abortRef.current = false;
    importingRef.current = true;
    const pending = files.filter((f) => f.status === "pending" && f.sourceKey && f.sourceKey !== "__ignored__");
    for (const entry of pending) {
      if (abortRef.current) break;
      await importFile(entry);
    }
    importingRef.current = false;
  }

  function cancelImport() {
    abortRef.current = true;
    toast({ title: "Cancelamento solicitado", description: "Aguardando batch atual finalizar..." });
  }

  const pendingCount = files.filter((f) => f.status === "pending" && f.sourceKey && f.sourceKey !== "__ignored__").length;
  const isImporting = files.some((f) => f.status === "importing");

  if (role !== "ADMIN" && role !== "LIDER") {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Acesso restrito a administradores.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Importar Bases</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Arraste seus arquivos Excel (.xml, .xlsx, .xlsm) para importar as bases do Dashboard Comercial.
          </p>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
            ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"}
          `}
        >
          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">
            Arraste arquivos aqui ou clique para selecionar
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            .xml, .xlsx, .xlsm — Base Contas, Base Receita, Captação, Consolidado Receita, DePara, Diversificador, Positivador
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".xml,.xlsx,.xlsm"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Arquivos ({files.length})</CardTitle>
              <div className="flex gap-2">
                {isImporting && (
                  <Button size="sm" variant="destructive" onClick={cancelImport}>
                    <Ban className="h-3.5 w-3.5 mr-1" /> Cancelar
                  </Button>
                )}
                {pendingCount > 0 && !isImporting && (
                  <Button size="sm" onClick={importAll}>
                    Importar {pendingCount} arquivo{pendingCount > 1 ? "s" : ""}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Tipo Detectado</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead className="text-right">Linhas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((f) => {
                    const isOpen = expandedLogs.has(f.id);
                    return (
                      <React.Fragment key={f.id}>
                        <TableRow>
                          <TableCell className="p-2">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleLogs(f.id)}>
                              {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[200px]">{f.file.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {f.status === "ignored" ? (
                              <Badge variant="secondary">Ignorado</Badge>
                            ) : f.sourceKey ? (
                              <Badge variant="outline">{SOURCE_MAP[f.sourceKey]?.label ?? f.sourceKey}</Badge>
                            ) : (
                              <Select value={f.sourceKey ?? ""} onValueChange={(v) => updateFile(f.id, { sourceKey: v })}>
                                <SelectTrigger className="w-[160px] h-8 text-xs">
                                  <SelectValue placeholder="Escolher tipo..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(SOURCE_MAP).map(([k, v]) => (
                                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={f.status} />
                          </TableCell>
                          <TableCell>
                            {f.status === "importing" ? (
                              <div className="w-32 space-y-1">
                                <Progress value={f.percentComplete} className="h-2" />
                                <span className="text-xs text-muted-foreground">{f.percentComplete}%</span>
                              </div>
                            ) : f.errorMsg ? (
                              <span className="text-xs text-destructive line-clamp-1 max-w-[200px]">{f.errorMsg}</span>
                            ) : f.status === "success" ? (
                              <span className="text-xs text-muted-foreground">
                                {f.mesAnoList.length > 0 && `Períodos: ${f.mesAnoList.join(", ")}`}
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {f.rowsImported > 0 ? f.rowsImported.toLocaleString("pt-BR") : "—"}
                          </TableCell>
                        </TableRow>
                        {isOpen && (
                          <tr>
                            <td colSpan={6} className="p-0">
                              <div className="bg-muted/30 border-t px-4 py-2 max-h-48 overflow-y-auto">
                                {f.logs.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">Nenhum log ainda.</p>
                                ) : (
                                  <div className="space-y-0.5">
                                    {f.logs.map((log, i) => (
                                      <p key={i} className="text-xs font-mono text-muted-foreground">{log}</p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Last imports */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Última Importação por Base</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Base</TableHead>
                  <TableHead>Última Importação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Linhas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(SOURCE_MAP).map(([key, { label }]) => {
                  const sync = lastSyncs[key];
                  return (
                    <TableRow key={key}>
                      <TableCell className="font-medium">{label}</TableCell>
                      <TableCell>
                        {sync
                          ? format(new Date(sync.received_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : <span className="text-muted-foreground">Nunca</span>}
                      </TableCell>
                      <TableCell>
                        {sync ? (
                          <Badge variant={sync.status === "success" ? "default" : "secondary"}>
                            {sync.status}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {sync ? sync.rows_written.toLocaleString("pt-BR") : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function StatusBadge({ status }: { status: FileStatus }) {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="gap-1"><ChevronDown className="h-3 w-3" />Pendente</Badge>;
    case "importing":
      return <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Importando</Badge>;
    case "success":
      return <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Sucesso</Badge>;
    case "error":
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Erro</Badge>;
    case "ignored":
      return <Badge variant="secondary" className="gap-1"><AlertTriangle className="h-3 w-3" />Ignorado</Badge>;
    case "cancelled":
      return <Badge variant="destructive" className="gap-1"><Ban className="h-3 w-3" />Cancelado</Badge>;
  }
}
