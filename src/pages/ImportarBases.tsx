import { useState, useCallback, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { Upload, CheckCircle, XCircle, Loader2, ChevronDown, ChevronRight, Info, Cloud, RefreshCw, Calendar, Clock, AlertTriangle, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { PopupComunicado } from "@/components/PopupComunicado";
import { SaldoConsolidadoSection } from "@/components/admin/SaldoConsolidadoSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ─── MAPEAMENTO COMPLETO ───────────────────────────────────────────

type SheetMapping = {
  sheet: string;
  table: string;
  label: string;
  required: boolean;
};

type BaseConfig = {
  id: string;
  label: string;
  description: string;
  acceptedFiles: string[];
  sheets: SheetMapping[];
  color: string;
};

const BASES: BaseConfig[] = [
  {
    id: "base_receita",
    label: "Base Receita",
    description: "Base_Receita.xlsm — contém Comissões (mês atual) e Histórico",
    acceptedFiles: ["base_receita", "basereceita"],
    color: "#4472C4",
    sheets: [
      { sheet: "Comissões", table: "raw_comissoes_m0", label: "Comissões (mês atual)", required: true },
      { sheet: "Comissões Histórico", table: "raw_comissoes_historico", label: "Comissões Histórico", required: true },
    ],
  },
  {
    id: "captacao",
    label: "Captação",
    description: "Captação.xlsm — contém mês atual e histórico",
    acceptedFiles: ["captacao", "captação"],
    color: "#ED7D31",
    sheets: [
      { sheet: "Captação Total", table: "raw_captacao_total", label: "Captação Total (mês atual)", required: true },
      { sheet: "Captação Histórico", table: "raw_captacao_historico", label: "Captação Histórico", required: true },
    ],
  },
  {
    id: "base_contas",
    label: "Base Contas",
    description: "Base_Contas.xlsm — habilitações, ativações e migrações",
    acceptedFiles: ["base_contas", "basecontas"],
    color: "#A5A5A5",
    sheets: [
      { sheet: "Contas Total", table: "raw_contas_total", label: "Contas Total", required: true },
    ],
  },
  {
    id: "positivador",
    label: "Positivador",
    description: "Positivador.xlsx — AuC total e M0, agrupado e desagrupado",
    acceptedFiles: ["positivador"],
    color: "#5B9BD5",
    sheets: [
      { sheet: "Positivador Total Agrupado", table: "raw_positivador_total_agrupado", label: "Total Agrupado (Faixa PL)", required: true },
      { sheet: "Positivador Total Desagrupado", table: "raw_positivador_total_desagrupado", label: "Total Desagrupado (AuC por Casa)", required: true },
      { sheet: "Positivador M0 Desagrupado", table: "raw_positivador_m0_desagrupado", label: "M0 Desagrupado (donut)", required: true },
      { sheet: "Positivador M0 Agrupado", table: "raw_positivador_m0_agrupado", label: "M0 Agrupado", required: false },
    ],
  },
  {
    id: "diversificador",
    label: "Diversificador",
    description: "Diversificador.xlsx — custódia consolidada",
    acceptedFiles: ["diversificador"],
    color: "#70AD47",
    sheets: [
      { sheet: "Diversificador Consolidado", table: "raw_diversificador_consolidado", label: "Diversificador Consolidado", required: true },
    ],
  },
  {
    id: "depara",
    label: "DePara",
    description: "DePara.xlsm — CRM, assessores e mapeamentos",
    acceptedFiles: ["depara"],
    color: "#264478",
    sheets: [
      { sheet: "Base CRM", table: "raw_base_crm", label: "Base CRM", required: true },
      { sheet: "DePara", table: "raw_depara", label: "DePara (assessores)", required: true },
    ],
  },
];

// ─── Tipos de estado ───────────────────────────────────────────────
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

const RECEITA_TABLES = new Set(["raw_comissoes_m0", "raw_comissoes_historico"]);
const DEFAULT_INSERT_BATCH = 500;
const RECEITA_INSERT_BATCH = 500;

// ─── Helpers ──────────────────────────────────────────────────────

function normalizeFileName(name: string): string {
  return name.toLowerCase().replace(/\.[^.]+$/, "").replace(/[\s_-]/g, "");
}

function detectBase(filename: string): BaseConfig | null {
  const norm = normalizeFileName(filename);
  return BASES.find(b => b.acceptedFiles.some(a => norm.includes(a))) ?? null;
}

async function truncateAndInsert(
  table: string,
  rows: Record<string, unknown>[]
): Promise<{ ok: boolean; error?: string }> {
  if (RECEITA_TABLES.has(table)) {
    if (rows.length === 0) {
      const { error } = await supabase.rpc("truncate_table" as any, { table_name: table });
      return error ? { ok: false, error: error.message } : { ok: true };
    }

    for (let i = 0; i < rows.length; i += RECEITA_INSERT_BATCH) {
      const batch = rows.slice(i, i + RECEITA_INSERT_BATCH);
      const { data, error } = await supabase.rpc("rpc_sync_bulk_insert" as any, {
        p_table: table, p_rows: batch, p_truncate: i === 0,
      });
      if (error) return { ok: false, error: error.message };
      if ((data as any)?.success === false) return { ok: false, error: (data as any)?.error ?? "Erro ao importar lote da Base Receita" };
    }
    return { ok: true };
  }

  const { error: delErr } = await supabase.from(table as any).delete().neq("id", 0);
  if (delErr) {
    const { error: delErr2 } = await (supabase.from(table as any) as any).delete().gte("created_at", "1970-01-01");
    if (delErr2) {
      const { error: truncateErr } = await supabase.rpc("truncate_table" as any, { table_name: table });
      if (truncateErr) return { ok: false, error: truncateErr.message };
    }
  }

  if (rows.length === 0) return { ok: true };

  for (let i = 0; i < rows.length; i += DEFAULT_INSERT_BATCH) {
    const batch = rows.slice(i, i + DEFAULT_INSERT_BATCH).map(row => ({ data: row }));
    const { error } = await supabase.from(table as any).insert(batch);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

function excelDateToISO(serial: number): string {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date = new Date(utc_value * 1000);
  return date.toISOString().split("T")[0];
}

function readSheet(workbook: XLSX.WorkBook, sheetName: string): Record<string, unknown>[] | null {
  const ws = workbook.Sheets[sheetName];
  if (!ws) return null;
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false, cellDates: true } as any);
  return (rows as Record<string, unknown>[]).map((row) => {
    const normalized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(row)) {
      if (val instanceof Date) {
        normalized[key] = val.toISOString().split("T")[0];
      } else if (typeof val === "number") {
        const keyLower = key.toLowerCase();
        if ((keyLower.includes("data") || keyLower.includes("date") || keyLower.includes("dt_") || keyLower.includes("nascimento") || keyLower.includes("vencimento")) && val > 1000 && val < 55000) {
          normalized[key] = excelDateToISO(val);
        } else {
          normalized[key] = val;
        }
      } else {
        normalized[key] = val;
      }
    }
    return normalized;
  });
}

function formatAnoMes(anomes: number): string {
  const year = Math.floor(anomes / 100);
  const month = anomes % 100;
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[month - 1]}/${year}`;
}

// ─── Componente principal ─────────────────────────────────────────

export default function ImportarBases() {
  const [results, setResults] = useState<BaseResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { role } = useAuth();
  const queryClient = useQueryClient();

  // ─── SharePoint Sync State ─────────────────────────────────────
  const [syncingMode, setSyncingMode] = useState<string | null>(null);
  const [syncLog, setSyncLog] = useState<string[]>([]);
  const [lastSync, setLastSync] = useState<any>(null);

  // ─── Status Panel State ────────────────────────────────────────
  const [statusData, setStatusData] = useState<{
    historicoCount: number | null;
    m0Count: number | null;
    dentroPeriodoM1: boolean | null;
    anoMesM1: number | null;
    anoMesM0: number | null;
  }>({ historicoCount: null, m0Count: null, dentroPeriodoM1: null, anoMesM1: null, anoMesM0: null });

  useEffect(() => {
    if (role === 'ADMIN') {
      // Load last sync log
      supabase.rpc('rpc_admin_sync_log' as any).then(({ data }: any) => {
        if (data?.[0]) setLastSync(data[0]);
      });

      // Load status panel data
      Promise.all([
        supabase.from('raw_comissoes_historico' as any).select('id', { count: 'exact', head: true }),
        supabase.from('raw_comissoes_m0' as any).select('id', { count: 'exact', head: true }),
        supabase.rpc('fn_dentro_periodo_m1' as any),
        supabase.rpc('fn_anomes_m1' as any),
        supabase.rpc('fn_anomes_m0' as any),
      ]).then(([histRes, m0Res, periodoRes, m1Res, m0AmRes]) => {
        setStatusData({
          historicoCount: histRes.count ?? null,
          m0Count: m0Res.count ?? null,
          dentroPeriodoM1: periodoRes.data ?? null,
          anoMesM1: m1Res.data ?? null,
          anoMesM0: m0AmRes.data ?? null,
        });
      });
    }
  }, [role]);

  async function handleSyncMode(mode: string) {
    setSyncingMode(mode);
    const modeLabels: Record<string, string> = {
      'm0': 'M0 (mês atual)',
      'm1': 'M-1 (mês anterior)',
      'historico_completo': 'Histórico Completo',
      'todos': 'Todas as Bases',
    };
    setSyncLog([`🔄 Sincronizando ${modeLabels[mode] || mode}...`]);
    toast.info(`Sincronização ${modeLabels[mode] || mode} iniciada...`);

    try {
      const body: Record<string, unknown> = mode === 'todos'
        ? { tipo: 'todos' }
        : { tipo: 'automatico', arquivo: 'base_receita', sync_mode: mode };

      const { data, error } = await supabase.functions.invoke('sync-sharepoint', { body });

      if (error) {
        if (/Failed to send a request|context canceled|timeout|abort/i.test(error.message)) {
          setSyncLog(prev => [...prev, '⏳ Sincronização disparada e continuará em segundo plano.']);
          toast.info('Sincronização continua rodando no servidor...');
          scheduleReloads();
          return;
        }
        setSyncLog(prev => [...prev, `❌ Erro: ${error.message}`]);
        toast.error(`Erro: ${error.message}`);
        return;
      }

      if (data?.log && Array.isArray(data.log)) setSyncLog(data.log);
      else setSyncLog(['✅ Sincronização concluída!']);

      if (data?.success) {
        toast.success(`Sincronização concluída em ${data.duracao || '?'}!`);
      } else if (data?.skipped) {
        toast.info('Sincronização pulada — fora do período de ajuste M-1.');
      } else {
        toast.warning(`Concluída com ${data?.errors?.length || 0} erro(s)`);
      }

      reloadStatus();
    } catch (err: any) {
      if (err.message?.includes('timeout') || err.name === 'AbortError') {
        setSyncLog(prev => [...prev, '⏳ Continua rodando no servidor...']);
        toast.info('Sincronização continua no servidor...');
        scheduleReloads();
      } else {
        setSyncLog(prev => [...prev, `❌ Erro: ${err.message}`]);
        toast.error(`Erro: ${err.message}`);
      }
    } finally {
      setSyncingMode(null);
    }
  }

  const reloadStatus = useCallback(() => {
    supabase.rpc('rpc_admin_sync_log' as any).then(({ data: logs }: any) => {
      if (logs?.[0]) setLastSync(logs[0]);
    });
    Promise.all([
      supabase.from('raw_comissoes_historico' as any).select('id', { count: 'exact', head: true }),
      supabase.from('raw_comissoes_m0' as any).select('id', { count: 'exact', head: true }),
    ]).then(([histRes, m0Res]) => {
      setStatusData(prev => ({
        ...prev,
        historicoCount: histRes.count ?? prev.historicoCount,
        m0Count: m0Res.count ?? prev.m0Count,
      }));
    });
    queryClient.invalidateQueries();
  }, [queryClient]);

  const scheduleReloads = useCallback(() => {
    reloadStatus();
    setTimeout(reloadStatus, 10000);
    setTimeout(reloadStatus, 30000);
    setTimeout(reloadStatus, 90000);
  }, [reloadStatus]);

  // ─── Processar arquivo drop ───────────────────────────────────
  const processFile = useCallback(async (file: File) => {
    const base = detectBase(file.name);
    if (!base) {
      alert(`Arquivo "${file.name}" não reconhecido.\n\nNomes aceitos:\n${BASES.map(b => b.description).join("\n")}`);
      return;
    }

    const resultId = base.id;
    const sheetResults: SheetResult[] = base.sheets.map(s => ({
      sheet: s.sheet, table: s.table, label: s.label, status: "reading" as SheetStatus, rows: 0,
    }));

    const newResult: BaseResult = {
      baseId: base.id, label: base.label,
      timestamp: new Date().toLocaleString("pt-BR"), sheets: sheetResults,
    };
    setResults(prev => [newResult, ...prev.filter(r => r.baseId !== resultId)]);
    setExpanded(prev => new Set(prev).add(resultId));

    const buffer = await file.arrayBuffer();
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    } catch {
      setResults(prev => prev.map(r => r.baseId === resultId
        ? { ...r, sheets: r.sheets.map(s => ({ ...s, status: "error" as SheetStatus, error: "Erro ao ler o arquivo Excel" })) }
        : r
      ));
      return;
    }

    let receitaImportadaComSucesso = false;
    let receitaComErro = false;

    for (const sheetDef of base.sheets) {
      const rows = readSheet(workbook, sheetDef.sheet);

      if (rows === null) {
        if (RECEITA_TABLES.has(sheetDef.table) && sheetDef.required) receitaComErro = true;
        setResults(prev => prev.map(r => r.baseId === resultId
          ? { ...r, sheets: r.sheets.map(s => s.sheet === sheetDef.sheet
              ? { ...s, status: "not_found" as SheetStatus, error: sheetDef.required ? `Aba "${sheetDef.sheet}" não encontrada` : `Aba "${sheetDef.sheet}" não encontrada (opcional)` }
              : s) }
          : r
        ));
        continue;
      }

      setResults(prev => prev.map(r => r.baseId === resultId
        ? { ...r, sheets: r.sheets.map(s => s.sheet === sheetDef.sheet ? { ...s, status: "uploading" as SheetStatus, rows: rows.length } : s) }
        : r
      ));

      const { ok, error } = await truncateAndInsert(sheetDef.table, rows);

      if (RECEITA_TABLES.has(sheetDef.table)) {
        if (ok) receitaImportadaComSucesso = true;
        else receitaComErro = true;
      }

      setResults(prev => prev.map(r => r.baseId === resultId
        ? { ...r, sheets: r.sheets.map(s => s.sheet === sheetDef.sheet
            ? { ...s, status: ok ? "done" as SheetStatus : "error" as SheetStatus, rows: rows.length, error }
            : s) }
        : r
      ));
    }

    if (base.id === "base_receita" && receitaImportadaComSucesso && !receitaComErro) {
      // Dispara refresh em background via edge function dedicada — nunca bloqueia o resultado
      supabase.functions.invoke('manual-import-refresh', {
        body: { source: 'base_receita_manual' },
      }).catch(() => { /* fire-and-forget */ });

      queryClient.invalidateQueries();
      toast.success("Base Receita importada! Dashboard atualizando em segundo plano.");
      scheduleReloads();
    }
  }, [queryClient, scheduleReloads]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setProcessing(true);
    for (const file of acceptedFiles) await processFile(file);
    setProcessing(false);
  }, [processFile]);

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
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const isSyncing = syncingMode !== null;

  // ─── Render ───────────────────────────────────────────────────
  return (
    <AppLayout>
    <PopupComunicado />
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Importar Bases</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Arraste os arquivos Excel. Cada arquivo importa automaticamente todas as abas necessárias.
        </p>
      </div>

      {/* ═══ STATUS PANEL — ADMIN ═══ */}
      {role === 'ADMIN' && (
        <Card className="border-[#082537]/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-4 w-4 text-[#082537]" />
              <h3 className="font-semibold text-[#082537] text-sm uppercase tracking-wide">Status das Bases de Receita</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Historico */}
              <div className="rounded-lg border border-border p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5" />
                  Histórico {statusData.anoMesM1 ? `(até ${formatAnoMes(statusData.anoMesM1)})` : ''}
                </div>
                <p className="text-lg font-bold text-foreground">
                  {statusData.historicoCount !== null ? statusData.historicoCount.toLocaleString('pt-BR') : '—'} <span className="text-xs font-normal text-muted-foreground">linhas</span>
                </p>
              </div>
              {/* M-1 period */}
              <div className="rounded-lg border border-border p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Mês Anterior {statusData.anoMesM1 ? `(${formatAnoMes(statusData.anoMesM1)})` : ''}
                </div>
                {statusData.dentroPeriodoM1 === true ? (
                  <p className="text-sm font-medium text-green-600">✅ Dentro do prazo de ajuste</p>
                ) : statusData.dentroPeriodoM1 === false ? (
                  <p className="text-sm font-medium text-muted-foreground">⏸️ Período encerrado</p>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
              {/* M0 */}
              <div className="rounded-lg border border-border p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Mês Atual {statusData.anoMesM0 ? `(${formatAnoMes(statusData.anoMesM0)})` : ''}
                </div>
                <p className="text-lg font-bold text-foreground">
                  {statusData.m0Count !== null ? statusData.m0Count.toLocaleString('pt-BR') : '—'} <span className="text-xs font-normal text-muted-foreground">linhas</span>
                </p>
              </div>
            </div>
            {lastSync && (
              <p className="text-xs text-muted-foreground/70 mt-3">
                Última sync: {new Date(lastSync.executado_em).toLocaleString('pt-BR')}
                {lastSync.sucesso ? ' ✅' : ' ❌'}
                {lastSync.duracao ? ` · ${lastSync.duracao}` : ''}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══ 3 SYNC BUTTONS — ADMIN ═══ */}
      {role === 'ADMIN' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* M0 */}
          <Card className="border-[#082537]/20 hover:border-[#082537]/40 transition-colors">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-foreground">Dados do Dia</span>
                </div>
                <Badge variant="secondary" className="text-[10px]">~1 min</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Sincroniza apenas o mês atual (M0) do SharePoint.
              </p>
              <Button
                onClick={() => handleSyncMode('m0')}
                disabled={isSyncing}
                size="sm"
                className="w-full bg-[#082537] hover:bg-[#0f3d5c] text-white gap-1.5"
              >
                {syncingMode === 'm0' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Sincronizando...</> : <><RefreshCw className="h-3.5 w-3.5" />Atualizar M0</>}
              </Button>
            </CardContent>
          </Card>

          {/* M-1 */}
          <Card className={cn(
            "border-[#082537]/20 transition-colors",
            statusData.dentroPeriodoM1 ? "hover:border-[#082537]/40" : "opacity-60"
          )}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-semibold text-foreground">Mês Anterior</span>
                </div>
                <Badge variant="secondary" className="text-[10px]">~2 min</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {statusData.dentroPeriodoM1
                  ? `Reprocessa ${statusData.anoMesM1 ? formatAnoMes(statusData.anoMesM1) : 'M-1'} no histórico.`
                  : 'Período de ajuste M-1 encerrado.'}
              </p>
              <Button
                onClick={() => handleSyncMode('m1')}
                disabled={isSyncing || !statusData.dentroPeriodoM1}
                size="sm"
                variant={statusData.dentroPeriodoM1 ? "default" : "outline"}
                className={statusData.dentroPeriodoM1 ? "w-full bg-[#082537] hover:bg-[#0f3d5c] text-white gap-1.5" : "w-full gap-1.5"}
              >
                {syncingMode === 'm1' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Sincronizando...</> : <><RefreshCw className="h-3.5 w-3.5" />Reprocessar M-1</>}
              </Button>
            </CardContent>
          </Card>

          {/* Historico Completo */}
          <Card className="border-[#082537]/20 hover:border-[#082537]/40 transition-colors">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-semibold text-foreground">Histórico Completo</span>
                </div>
                <Badge variant="secondary" className="text-[10px]">~5 min</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Sincroniza todo o histórico. Sync automático dia 1 de cada mês.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={isSyncing}
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    {syncingMode === 'historico_completo' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Sincronizando...</> : <><AlertTriangle className="h-3.5 w-3.5" />Sync Histórico</>}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sincronizar Histórico Completo?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Este processo leva ~5 minutos e recarrega todo o histórico de receita do SharePoint. O histórico é sincronizado automaticamente no dia 1 de cada mês. Use apenas quando necessário.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleSyncMode('historico_completo')}>
                      Confirmar Sincronização
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ SYNC ALL BASES — ADMIN ═══ */}
      {role === 'ADMIN' && (
        <Card className="border-[#082537] border-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Cloud className="h-5 w-5 text-[#082537]" />
                  <h3 className="font-semibold text-[#082537] text-lg">Sincronizar Todas as Bases</h3>
                </div>
                <p className="text-sm text-muted-foreground max-w-lg">
                  Atualiza todas as bases do SharePoint (Receita, Captação, Contas, Positivador, Diversificador, DePara).
                </p>
              </div>
              <Button
                onClick={() => handleSyncMode('todos')}
                disabled={isSyncing}
                className="bg-[#082537] hover:bg-[#0f3d5c] text-white gap-2 min-w-[180px]"
              >
                {syncingMode === 'todos' ? <><Loader2 className="h-4 w-4 animate-spin" />Sincronizando...</> : <><RefreshCw className="h-4 w-4" />Sincronizar Tudo</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync log */}
      {syncLog.length > 0 && (
        <div className="bg-gray-900 rounded-lg p-4 max-h-48 overflow-y-auto">
          <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
            {syncLog.join('\n')}
          </pre>
        </div>
      )}

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
          isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto mb-3 text-gray-400" size={36} />
        {isDragActive ? (
          <p className="text-blue-600 font-medium">Solte os arquivos aqui…</p>
        ) : (
          <>
            <p className="font-medium text-gray-700">Arraste arquivos aqui ou clique para selecionar</p>
            <p className="text-xs text-gray-400 mt-1">.xlsm, .xlsx — Base Receita, Captação, Base Contas, Positivador, Diversificador, DePara</p>
          </>
        )}
        {processing && (
          <div className="flex items-center justify-center gap-2 mt-3 text-blue-600 text-sm">
            <Loader2 className="animate-spin" size={16} />Processando…
          </div>
        )}
      </div>

      {/* Mapa de bases */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <Info size={14} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Abas importadas por arquivo</span>
        </div>
        <div className="divide-y divide-gray-100">
          {BASES.map(base => (
            <div key={base.id} className="px-4 py-2.5">
              <div className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: base.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{base.label}</p>
                  <p className="text-xs text-gray-400">{base.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {base.sheets.map(s => (
                      <span key={s.sheet} className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                        s.required ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-gray-100 text-gray-500 border border-gray-200"
                      )}>
                        {s.label}
                        {!s.required && <span className="text-gray-400">(opcional)</span>}
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
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Última Importação por Base</h2>
          {results.map(result => {
            const allDone = result.sheets.every(s => s.status === "done" || s.status === "not_found");
            const hasError = result.sheets.some(s => s.status === "error");
            const isLoading = result.sheets.some(s => s.status === "reading" || s.status === "uploading");
            const isOpen = expanded.has(result.baseId);
            const totalRows = result.sheets.reduce((acc, s) => acc + s.rows, 0);

            return (
              <div key={result.baseId} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => toggleExpand(result.baseId)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <StatusIcon done={allDone && !hasError} error={hasError} loading={isLoading} />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-gray-800">{result.label}</p>
                    <p className="text-xs text-gray-400">{result.timestamp}</p>
                  </div>
                  {!isLoading && <span className="text-xs text-gray-500 font-medium">{totalRows.toLocaleString("pt-BR")} linhas</span>}
                  {isLoading ? <Loader2 size={14} className="text-blue-500 animate-spin ml-2" /> : isOpen ? <ChevronDown size={14} className="text-gray-400 ml-2" /> : <ChevronRight size={14} className="text-gray-400 ml-2" />}
                </button>
                {isOpen && (
                  <div className="border-t border-gray-100">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left px-4 py-2 text-gray-500 font-medium">Aba</th>
                          <th className="text-left px-4 py-2 text-gray-500 font-medium">Tabela</th>
                          <th className="text-right px-4 py-2 text-gray-500 font-medium">Linhas</th>
                          <th className="text-center px-4 py-2 text-gray-500 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {result.sheets.map(s => (
                          <tr key={s.sheet} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 font-medium text-gray-700">{s.label}</td>
                            <td className="px-4 py-2.5 font-mono text-gray-400">{s.table}</td>
                            <td className="px-4 py-2.5 text-right text-gray-600">{s.rows > 0 ? s.rows.toLocaleString("pt-BR") : "—"}</td>
                            <td className="px-4 py-2.5 text-center"><SheetStatusBadge status={s.status} error={s.error} /></td>
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
    </AppLayout>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────

function StatusIcon({ done, error, loading }: { done: boolean; error: boolean; loading: boolean }) {
  if (loading) return <Loader2 size={18} className="text-blue-500 animate-spin flex-shrink-0" />;
  if (error) return <XCircle size={18} className="text-red-500 flex-shrink-0" />;
  if (done) return <CheckCircle size={18} className="text-green-500 flex-shrink-0" />;
  return <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />;
}

function SheetStatusBadge({ status, error }: { status: SheetStatus; error?: string }) {
  switch (status) {
    case "done":
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-semibold"><CheckCircle size={10} /> success</span>;
    case "error":
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-semibold" title={error}><XCircle size={10} /> erro</span>;
    case "not_found":
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 text-[10px] font-semibold">⚠ não encontrada</span>;
    case "reading":
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold"><Loader2 size={10} className="animate-spin" /> lendo…</span>;
    case "uploading":
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold"><Loader2 size={10} className="animate-spin" /> enviando…</span>;
    default:
      return <span className="text-gray-400 text-[10px]">aguardando</span>;
  }
}
