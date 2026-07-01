import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Upload, CheckCircle, XCircle, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useViewAs } from "@/contexts/ViewAsContext";
import { cn } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Types ─────────────────────────────────────────────────────────

type BaseKey = "gerencial" | "caixa";

type ValidationGerencial = {
  totalRows: number;
  totalComissaoBruta: number;
  comissaoBrutaComEmissao: number;
  totalRamos: number;
};

type ValidationCaixa = {
  totalReadRows: number;
  totalRows: number;
  totalComissao: number;
  categorias: string[];
  tiposLancamento: string[];
};

type ParsedGerencial = {
  syncId: string;
  fileName: string;
  gerencialRows: Record<string, unknown>[];
  ramoRows: { ramo: string; tipo_de_ramo: string; sync_id: string }[];
  validation: ValidationGerencial;
};

type ParsedCaixa = {
  syncId: string;
  fileName: string;
  rows: Record<string, unknown>[];
  validation: ValidationCaixa;
};

// ─── Helpers ───────────────────────────────────────────────────────

function uuidv4(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  const cleaned = s.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function toIntOrNull(v: unknown): number | null {
  const n = toNumOrNull(v);
  return n === null ? null : Math.trunc(n);
}

function toTextOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function excelSerialToISO(serial: number): string | null {
  if (!Number.isFinite(serial) || serial <= 0) return null;
  const utcDays = Math.floor(serial - 25569);
  const date = new Date(utcDays * 86400 * 1000);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function toDateOrNull(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === "number") return excelSerialToISO(v);
  const s = String(v).trim();
  if (!s) return null;
  // dd/mm/yyyy
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m1) {
    const [, d, m, y] = m1;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // yyyy-mm-dd
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

// ─── Mappings ──────────────────────────────────────────────────────

type FieldKind = "text" | "num" | "int" | "date";

type ColMap = { excel: string; db: string; kind: FieldKind };

// Alternate keys handle variants (accents / degree symbol)
type ColMapWithAlts = ColMap & { alts?: string[] };

const GERENCIAL_MAP: ColMapWithAlts[] = [
  { excel: "Grupo", db: "grupo", kind: "text" },
  { excel: "Tomador", db: "tomador", kind: "text" },
  { excel: "Segurado", db: "segurado", kind: "text" },
  { excel: "Documento", db: "documento", kind: "text" },
  { excel: "Ramo", db: "ramo", kind: "text" },
  { excel: "Seguradora", db: "seguradora", kind: "text" },
  { excel: "N° Apólice", db: "numero_apolice", kind: "text", alts: ["Nº Apólice", "N Apólice", "No Apólice"] },
  { excel: "Data de Emissão", db: "data_emissao", kind: "date" },
  { excel: "Início de Vigência", db: "inicio_vigencia", kind: "date" },
  { excel: "Fim de Vigência", db: "fim_vigencia", kind: "date" },
  { excel: "Período de atualização", db: "periodo_atualizacao", kind: "text" },
  { excel: "Valor da IS", db: "valor_is", kind: "num" },
  { excel: "Prêmio Total", db: "premio_total", kind: "num" },
  { excel: "% Comissão", db: "percentual_comissao", kind: "num" },
  { excel: "Comissão Emitida", db: "comissao_emitida", kind: "num" },
  { excel: "Qtd de Parcelas", db: "qtd_parcelas", kind: "int" },
  { excel: "Prêmio Parcela", db: "premio_parcela", kind: "num" },
  { excel: "Comissão Bruta", db: "comissao_bruta", kind: "num" },
  { excel: "Imposto Ret", db: "imposto_ret", kind: "num" },
  { excel: "Valor de ISS", db: "valor_iss", kind: "num" },
  { excel: "Valor recebido / a receber", db: "valor_recebido_a_receber", kind: "num" },
  { excel: "Número da parcela", db: "numero_da_parcela", kind: "int" },
  { excel: "Tipo de Pagamento", db: "tipo_pagamento", kind: "text" },
  { excel: "Empresa Faturada", db: "empresa_faturada", kind: "text" },
  { excel: "Data de pagamento", db: "data_pagamento", kind: "date" },
  { excel: "Mês", db: "mes", kind: "int" },
  { excel: "Ano", db: "ano", kind: "int" },
  { excel: "Fat Competência", db: "fat_competencia", kind: "text" },
  { excel: "Status da parcela de comissão", db: "status_parcela_comissao", kind: "text" },
  { excel: "Análise", db: "analise", kind: "text" },
  { excel: "Possui repasse", db: "possui_repasse", kind: "text" },
  { excel: "% Repasse", db: "percentual_repasse", kind: "num" },
  { excel: "Parcelas", db: "parcelas", kind: "text" },
  { excel: "% Imposto", db: "percentual_imposto", kind: "num" },
  { excel: "Valor Repasse Total", db: "valor_repasse_total", kind: "num" },
  { excel: "Data do Repasse", db: "data_repasse", kind: "date" },
  { excel: "Status do repasse", db: "status_repasse", kind: "text" },
  { excel: "Observação", db: "observacao", kind: "text" },
  { excel: "ID", db: "card_id", kind: "text" },
  { excel: "Responsavel", db: "responsavel", kind: "text", alts: ["Responsável"] },
  { excel: "Data Card Finalizado", db: "data_card_finalizado", kind: "date" },
];

const CAIXA_MAP: ColMapWithAlts[] = [
  { excel: "Tipo de Lançamento", db: "tipo_lancamento", kind: "text" },
  { excel: "Mês de Referência", db: "mes_referencia", kind: "text" },
  { excel: "Data de Pagamento", db: "data_pagamento", kind: "date" },
  { excel: "Descrição", db: "descricao", kind: "text" },
  { excel: "Valor:", db: "valor", kind: "num", alts: ["Valor"] },
  { excel: "Categoria", db: "categoria", kind: "text" },
  { excel: "Sub Categoria", db: "sub_categoria", kind: "text", alts: ["Subcategoria", "Sub-Categoria"] },
  { excel: "Referência", db: "referencia", kind: "text" },
  { excel: "Observações", db: "observacoes", kind: "text", alts: ["Observacoes", "Observação"] },
  { excel: "Data de Emissão da Nota Fiscal", db: "data_emissao_nota_fiscal", kind: "date" },
];

function normalizeHeader(s: string): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[:：]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeComissaoToken(v: unknown): string {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isCaixaComissaoRow(row: Record<string, unknown>): boolean {
  return [row.categoria, row.tipo_lancamento].some((v) => normalizeComissaoToken(v) === "comissao");
}

function pickValue(row: Record<string, unknown>, map: ColMapWithAlts): unknown {
  const keys = [map.excel, ...(map.alts ?? [])];
  const rowKeys = Object.keys(row);
  for (const k of keys) {
    if (k in row) return row[k];
    // case/space-insensitive fallback
    const target = normalizeHeader(k);
    const hit = rowKeys.find((rk) => normalizeHeader(rk) === target);
    if (hit) return row[hit];
  }
  return null;
}

function convertRow(row: Record<string, unknown>, map: ColMapWithAlts[], syncId: string): Record<string, unknown> {
  const out: Record<string, unknown> = { sync_id: syncId };
  for (const m of map) {
    const raw = pickValue(row, m);
    switch (m.kind) {
      case "num": out[m.db] = toNumOrNull(raw); break;
      case "int": out[m.db] = toIntOrNull(raw); break;
      case "date": out[m.db] = toDateOrNull(raw); break;
      default: out[m.db] = toTextOrNull(raw);
    }
  }
  return out;
}

function findSheetName(workbook: XLSX.WorkBook, target: string): string | null {
  if (workbook.Sheets[target]) return target;
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const t = norm(target);
  return workbook.SheetNames.find((n) => norm(n) === t) ?? null;
}

function readSheetFromRow2(workbook: XLSX.WorkBook, sheetName: string): Record<string, unknown>[] | null {
  const real = findSheetName(workbook, sheetName);
  if (!real) return null;
  const ws = workbook.Sheets[real];
  // range: 1 → treat Excel row 2 (0-indexed 1) as the header row
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: null,
    raw: true,
    range: 1,
    cellDates: true,
  } as any);
  return rows;
}

// Reads a sheet auto-detecting header row (tries row 1, then row 2).
// Uses the presence of `expectedHeaders` to pick the correct offset.
function readSheetAutoHeader(
  workbook: XLSX.WorkBook,
  sheetName: string,
  expectedHeaders: string[],
): Record<string, unknown>[] | null {
  const real = findSheetName(workbook, sheetName);
  if (!real) return null;
  const ws = workbook.Sheets[real];
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const expected = expectedHeaders.map(norm);
  for (const range of [0, 1]) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      defval: null,
      raw: true,
      range,
      cellDates: true,
    } as any);
    if (!rows.length) continue;
    const keys = Object.keys(rows[0]).map(norm);
    const hit = expected.some((e) => keys.includes(e));
    if (hit) return rows;
  }
  return null;
}

function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}

function fmtDateTime(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return d;
  }
}

async function insertInBatches(table: string, rows: Record<string, unknown>[], batchSize = 500): Promise<void> {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table as any).insert(batch as any);
    if (error) throw new Error(`Falha ao inserir em ${table}: ${error.message}`);
  }
}

// ─── Card config ───────────────────────────────────────────────────

type CardConfig = {
  key: BaseKey;
  title: string;
  subtitle: string;
};

const CARDS: CardConfig[] = [
  { key: "gerencial", title: "Base Gerencial (Lavoro)", subtitle: "Controle Gerencial - Financeiro.xlsx" },
  { key: "caixa", title: "Caixa Bradesco (Lavoro)", subtitle: "Controle Lavoro BRADESCO {ano}.xlsx" },
];

// ─── Main component ────────────────────────────────────────────────

export function LavoroImportSection() {
  const { effectiveRole, effectivePermissoes } = useViewAs();
  const isAdmin = effectiveRole === "ADMIN" || effectiveRole === "LIDER";
  const canGerencial = isAdmin || !!effectivePermissoes?.menu_importar_lavoro_gerencial;
  const canCaixa = isAdmin || !!effectivePermissoes?.menu_importar_lavoro_caixa;
  const canAny = canGerencial || canCaixa;

  const [parsingKey, setParsingKey] = useState<BaseKey | null>(null);
  const [pendingGerencial, setPendingGerencial] = useState<ParsedGerencial | null>(null);
  const [pendingCaixa, setPendingCaixa] = useState<ParsedCaixa | null>(null);
  const [inserting, setInserting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastUpload, setLastUpload] = useState<Record<BaseKey, string | null>>({ gerencial: null, caixa: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!canAny) return;
    let mounted = true;
    Promise.all([
      supabase.from("raw_lavoro_gerencial" as any).select("criado_em").order("criado_em", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("raw_lavoro_caixa_comissao" as any).select("criado_em").order("criado_em", { ascending: false }).limit(1).maybeSingle(),
    ]).then(([g, c]) => {
      if (!mounted) return;
      setLastUpload({
        gerencial: (g.data as any)?.criado_em ?? null,
        caixa: (c.data as any)?.criado_em ?? null,
      });
    });
    return () => { mounted = false; };
  }, [canAny, reloadKey]);

  const handleFile = useCallback(async (key: BaseKey, file: File) => {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Apenas arquivos .xlsx são aceitos.");
      return;
    }
    setParsingKey(key);
    setErrorMsg(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const syncId = uuidv4();

      if (key === "gerencial") {
        const gerRaw = readSheetFromRow2(workbook, "Gerencial");
        if (!gerRaw) throw new Error("Aba 'Gerencial' não encontrada.");
        const auxRaw = readSheetFromRow2(workbook, "aux Ramo");
        if (!auxRaw) throw new Error("Aba 'aux Ramo' não encontrada.");

        const gerencialRows = gerRaw
          .filter((r) => Object.values(r).some((v) => v !== null && v !== ""))
          .map((r) => convertRow(r, GERENCIAL_MAP, syncId));

        // aux Ramo: 2 columns Ramo, Tipo de Ramo
        const ramoRows = auxRaw
          .map((r) => {
            const ramo = toTextOrNull(pickValue(r, { excel: "Ramo", db: "ramo", kind: "text" }));
            const tipo = toTextOrNull(pickValue(r, { excel: "Tipo de Ramo", db: "tipo_de_ramo", kind: "text", alts: ["Tipo de ramo", "Tipo Ramo"] }));
            if (!ramo || !tipo) return null;
            return { ramo, tipo_de_ramo: tipo, sync_id: syncId };
          })
          .filter((x): x is { ramo: string; tipo_de_ramo: string; sync_id: string } => x !== null);

        const totalComissaoBruta = gerencialRows.reduce((s, r) => s + (Number(r.comissao_bruta) || 0), 0);
        const comissaoBrutaComEmissao = gerencialRows.reduce(
          (s, r) => s + (r.data_emissao ? Number(r.comissao_bruta) || 0 : 0),
          0,
        );

        setPendingGerencial({
          syncId,
          fileName: file.name,
          gerencialRows,
          ramoRows,
          validation: {
            totalRows: gerencialRows.length,
            totalComissaoBruta,
            comissaoBrutaComEmissao,
            totalRamos: ramoRows.length,
          },
        });
      } else {
        const sheet = readSheetFromRow2(workbook, "Descrição Financeira (Caixa)");
        if (!sheet) throw new Error("Aba 'Descrição Financeira (Caixa)' não encontrada.");
        const allRows = sheet
          .filter((r) => Object.values(r).some((v) => v !== null && v !== ""))
          .map((r) => convertRow(r, CAIXA_MAP, syncId));
        const rows = allRows.filter(isCaixaComissaoRow);

        const totalComissao = rows.reduce((s, r) => s + (Number(r.valor) || 0), 0);
        const categoriasSet = new Set<string>();
        rows.forEach((r) => { if (r.categoria) categoriasSet.add(String(r.categoria)); });
        const tiposLancamentoSet = new Set<string>();
        rows.forEach((r) => { if (r.tipo_lancamento) tiposLancamentoSet.add(String(r.tipo_lancamento)); });

        setPendingCaixa({
          syncId,
          fileName: file.name,
          rows,
          validation: {
            totalReadRows: allRows.length,
            totalRows: rows.length,
            totalComissao,
            categorias: Array.from(categoriasSet).sort(),
            tiposLancamento: Array.from(tiposLancamentoSet).sort(),
          },
        });
      }
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setParsingKey(null);
    }
  }, []);

  const confirmGerencial = useCallback(async () => {
    if (!pendingGerencial) return;
    setInserting(true);
    try {
      await insertInBatches("raw_lavoro_gerencial", pendingGerencial.gerencialRows);
      if (pendingGerencial.ramoRows.length > 0) {
        await insertInBatches("raw_lavoro_depara_ramo", pendingGerencial.ramoRows as any);
      }
      toast.success(
        `Base Gerencial importada: ${pendingGerencial.gerencialRows.length.toLocaleString("pt-BR")} linhas · ${pendingGerencial.ramoRows.length} ramos.`,
      );
      setPendingGerencial(null);
      setReloadKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err?.message ?? String(err));
    } finally {
      setInserting(false);
    }
  }, [pendingGerencial]);

  const confirmCaixa = useCallback(async () => {
    if (!pendingCaixa) return;
    setInserting(true);
    try {
      await insertInBatches("raw_lavoro_caixa_comissao", pendingCaixa.rows);
      toast.success(`Caixa Bradesco importado: ${pendingCaixa.rows.length.toLocaleString("pt-BR")} linhas.`);
      setPendingCaixa(null);
      setReloadKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err?.message ?? String(err));
    } finally {
      setInserting(false);
    }
  }, [pendingCaixa]);

  if (!canAny) return null;

  const visibleCards = CARDS.filter((c) => (c.key === "gerencial" ? canGerencial : canCaixa));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleCards.map((cfg) => (
          <LavoroCard
            key={cfg.key}
            cfg={cfg}
            parsing={parsingKey === cfg.key}
            disabled={parsingKey !== null || inserting}
            lastUploadAt={lastUpload[cfg.key]}
            onFile={handleFile}
          />
        ))}
      </div>

      {/* Confirmação — Gerencial */}
      <Dialog open={!!pendingGerencial} onOpenChange={(o) => { if (!o && !inserting) setPendingGerencial(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmar importação — Base Gerencial</DialogTitle>
            <DialogDescription className="truncate">{pendingGerencial?.fileName}</DialogDescription>
          </DialogHeader>
          {pendingGerencial && (
            <div className="space-y-2 py-2">
              <ValidationRow label="Linhas lidas (aba Gerencial)" value={pendingGerencial.validation.totalRows.toLocaleString("pt-BR")} />
              <ValidationRow label="SUM(Comissão Bruta) total" value={fmtBRL(pendingGerencial.validation.totalComissaoBruta)} />
              <ValidationRow label="SUM(Comissão Bruta) c/ Data Emissão" value={fmtBRL(pendingGerencial.validation.comissaoBrutaComEmissao)} hint="Deve bater com 'Receita Competência' no PBI" />
              <ValidationRow label="Ramos distintos (aux Ramo)" value={pendingGerencial.validation.totalRamos.toLocaleString("pt-BR")} />
              <p className="text-[11px] text-muted-foreground font-mono pt-2">sync_id: {pendingGerencial.syncId}</p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" disabled={inserting} onClick={() => setPendingGerencial(null)}>Cancelar</Button>
            <Button disabled={inserting} onClick={confirmGerencial} className="bg-[#082537] hover:bg-[#0f3d5c] text-white">
              {inserting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importando…</> : "Confirmar Importação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação — Caixa */}
      <Dialog open={!!pendingCaixa} onOpenChange={(o) => { if (!o && !inserting) setPendingCaixa(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmar importação — Caixa Bradesco</DialogTitle>
            <DialogDescription className="truncate">{pendingCaixa?.fileName}</DialogDescription>
          </DialogHeader>
          {pendingCaixa && (
            <div className="space-y-2 py-2">
              <ValidationRow label="Linhas lidas" value={pendingCaixa.validation.totalReadRows.toLocaleString("pt-BR")} />
              <ValidationRow label="Linhas importadas como Comissão" value={pendingCaixa.validation.totalRows.toLocaleString("pt-BR")} />
              <ValidationRow
                label="SUM(Valor) onde Categoria ou Tipo de Lançamento = 'Comissão'"
                value={fmtBRL(pendingCaixa.validation.totalComissao)}
                hint="Deve bater com 'Recebido Caixa' no PBI"
              />
              <div className="rounded-md border border-border bg-muted/40 p-2 text-xs">
                <p className="font-medium text-foreground mb-1">Tipos de Lançamento importados ({pendingCaixa.validation.tiposLancamento.length}):</p>
                <div className="flex flex-wrap gap-1">
                  {pendingCaixa.validation.tiposLancamento.map((c) => (
                    <span key={c} className="px-2 py-0.5 rounded-full bg-white border border-border text-[10px]">{c}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-md border border-border bg-muted/40 p-2 text-xs">
                <p className="font-medium text-foreground mb-1">Categorias distintas encontradas ({pendingCaixa.validation.categorias.length}):</p>
                <div className="flex flex-wrap gap-1">
                  {pendingCaixa.validation.categorias.map((c) => (
                    <span key={c} className="px-2 py-0.5 rounded-full bg-white border border-border text-[10px]">{c}</span>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono pt-2">sync_id: {pendingCaixa.syncId}</p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" disabled={inserting} onClick={() => setPendingCaixa(null)}>Cancelar</Button>
            <Button disabled={inserting} onClick={confirmCaixa} className="bg-[#082537] hover:bg-[#0f3d5c] text-white">
              {inserting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importando…</> : "Confirmar Importação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {errorMsg && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive flex items-start gap-2">
          <XCircle className="h-4 w-4 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────

function ValidationRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-b-0">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {hint && <p className="text-[10px] text-muted-foreground/70 italic">{hint}</p>}
      </div>
      <p className="text-sm font-semibold text-foreground whitespace-nowrap">{value}</p>
    </div>
  );
}

function LavoroCard({
  cfg,
  parsing,
  disabled,
  lastUploadAt,
  onFile,
}: {
  cfg: CardConfig;
  parsing: boolean;
  disabled: boolean;
  lastUploadAt: string | null;
  onFile: (key: BaseKey, file: File) => void;
}) {
  const onDrop = useCallback(
    (files: File[]) => { if (files[0]) onFile(cfg.key, files[0]); },
    [cfg.key, onFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] },
    multiple: false,
    disabled,
  });

  return (
    <Card className="border-[#082537]/20 hover:border-[#082537]/40 transition-colors">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-[#082537]/10 p-2">
            <FileSpreadsheet className="h-5 w-5 text-[#082537]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{cfg.title}</h3>
              <Badge variant="secondary" className="text-[10px]">.xlsx</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{cfg.subtitle}</p>
          </div>
        </div>
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors",
            disabled ? "opacity-50 cursor-not-allowed" : "",
            isDragActive ? "border-[#082537] bg-[#082537]/5" : "border-border bg-muted/30 hover:bg-muted/50",
          )}
        >
          <input {...getInputProps()} />
          {parsing ? (
            <div className="flex items-center justify-center gap-2 text-xs text-[#082537]">
              <Loader2 className="h-4 w-4 animate-spin" /> Lendo arquivo…
            </div>
          ) : (
            <>
              <Upload className="mx-auto mb-2 text-muted-foreground" size={22} />
              {isDragActive ? (
                <p className="text-xs font-medium text-[#082537]">Solte o arquivo…</p>
              ) : (
                <p className="text-xs text-muted-foreground">Arraste o .xlsx aqui ou clique para selecionar</p>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          Último upload: {fmtDateTime(lastUploadAt)}
          {lastUploadAt && <CheckCircle className="h-3 w-3 text-green-600" />}
        </div>
      </CardContent>
    </Card>
  );
}
