import { useState, useCallback, useEffect, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2, AlertTriangle, ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

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
    sheets: { "Base CRM": "raw_base_crm", DePara: "raw_depara" },
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

const IGNORED_KEYS = ["mtm rf", "nps"];

type FileStatus = "pending" | "importing" | "success" | "error" | "ignored";

interface FileEntry {
  id: string;
  file: File;
  sourceKey: string | null;
  detectedKey: string | null;
  status: FileStatus;
  rowsImported: number;
  errorMsg: string | null;
  sheetsFound: string[];
}

// ── Helpers ──
function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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

// Valid table names for Supabase queries
type RawTable =
  | "raw_captacao_total" | "raw_contas_total" | "raw_base_crm" | "raw_depara"
  | "raw_diversificador_consolidado" | "raw_ordem_pl"
  | "raw_positivador_total_desagrupado" | "raw_positivador_total_agrupado"
  | "raw_positivador_m0_desagrupado" | "raw_positivador_m0_agrupado"
  | "raw_comissoes_historico" | "raw_comissoes_m0" | "raw_consolidado_receita";

export default function ImportarBases() {
  const { role } = useAuth();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const [lastSyncs, setLastSyncs] = useState<Record<string, { received_at: string; rows_written: number; status: string }>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  // Load last sync per sourceKey
  useEffect(() => {
    loadLastSyncs();
  }, []);

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
        errorMsg: ignored ? "Ignorado nesta fase (MtM RF / NPS)" : null,
        sheetsFound: [],
      });
    }
    setFiles((prev) => [...prev, ...newEntries]);
  }, []);

  // Drag events
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true); }, []);
  const onDragLeave = useCallback(() => setDragging(false), []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const updateFile = (id: string, patch: Partial<FileEntry>) =>
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  // ── Import single file ──
  async function importFile(entry: FileEntry) {
    if (!entry.sourceKey || entry.sourceKey === "__ignored__") return;
    const mapping = SOURCE_MAP[entry.sourceKey];
    if (!mapping) return;

    updateFile(entry.id, { status: "importing", errorMsg: null });

    try {
      // Read file as text for XML, or ArrayBuffer for xlsx
      const xmlText = await entry.file.text();
      const workbook = XLSX.read(xmlText, { type: "string" });
      const sheetsFound = workbook.SheetNames;
      updateFile(entry.id, { sheetsFound });

      let totalRows = 0;
      const errors: string[] = [];

      for (const [sheetName, tableName] of Object.entries(mapping.sheets)) {
        let actualSheet: string | undefined;

        if (sheetName === "__first__") {
          // consolidado_receita: use first sheet
          actualSheet = sheetsFound[0];
        } else {
          actualSheet = findSheet(sheetsFound, sheetName);
        }

        if (!actualSheet) {
          errors.push(`Aba "${sheetName}" não encontrada. Disponíveis: ${sheetsFound.join(", ")}`);
          continue;
        }

        const sheet = workbook.Sheets[actualSheet];
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

        if (rows.length === 0) continue;

        // Truncate
        const { error: delErr } = await supabase
          .from(tableName as RawTable)
          .delete()
          .gte("id", 0);
        if (delErr) {
          errors.push(`Limpar ${tableName}: ${delErr.message}`);
          continue;
        }

        // Batch insert
        const batchSize = 500;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize).map((row) => ({ data: row as any }));
          const { error: insErr } = await supabase
            .from(tableName as RawTable)
            .insert(batch);
          if (insErr) {
            errors.push(`Insert ${tableName} batch ${Math.floor(i / batchSize) + 1}: ${insErr.message}`);
          } else {
            totalRows += batch.length;
          }
        }
      }

      // Log to sync_logs
      await supabase.from("sync_logs").insert({
        source_key: entry.sourceKey,
        file_name: entry.file.name,
        status: errors.length > 0 ? "partial" : "success",
        rows_written: totalRows,
        error: errors.length > 0 ? errors.join("; ") : null,
      });

      updateFile(entry.id, {
        status: errors.length > 0 ? "error" : "success",
        rowsImported: totalRows,
        errorMsg: errors.length > 0 ? errors.join("; ") : null,
      });

      loadLastSyncs();
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      updateFile(entry.id, { status: "error", errorMsg: msg });

      await supabase.from("sync_logs").insert({
        source_key: entry.sourceKey!,
        file_name: entry.file.name,
        status: "error",
        rows_written: 0,
        error: msg,
      });
    }
  }

  async function importAll() {
    const pending = files.filter((f) => f.status === "pending" && f.sourceKey && f.sourceKey !== "__ignored__");
    for (const entry of pending) {
      await importFile(entry);
    }
  }

  const pendingCount = files.filter((f) => f.status === "pending" && f.sourceKey && f.sourceKey !== "__ignored__").length;

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
            Arraste seus arquivos Excel XML (.xml) para importar as bases do Dashboard Comercial.
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
            ${dragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
            }
          `}
        >
          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">
            Arraste arquivos .xml aqui ou clique para selecionar
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Base Contas, Base Receita, Captação, Consolidado Receita, DePara, Diversificador, Positivador
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".xml"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Arquivos ({files.length})</CardTitle>
              {pendingCount > 0 && (
                <Button size="sm" onClick={importAll}>
                  Importar {pendingCount} arquivo{pendingCount > 1 ? "s" : ""}
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Tipo Detectado</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Linhas</TableHead>
                    <TableHead>Erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((f) => (
                    <TableRow key={f.id}>
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
                          <Select
                            value={f.sourceKey ?? ""}
                            onValueChange={(v) => updateFile(f.id, { sourceKey: v })}
                          >
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
                      <TableCell className="text-right tabular-nums">
                        {f.rowsImported > 0 ? f.rowsImported.toLocaleString("pt-BR") : "—"}
                      </TableCell>
                      <TableCell>
                        {f.errorMsg ? (
                          <span className="text-xs text-destructive line-clamp-2">{f.errorMsg}</span>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
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
  }
}
