import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { Wallet, Upload, CheckCircle, XCircle, Loader2, AlertTriangle, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useViewAs } from "@/contexts/ViewAsContext";
import { cn } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── Tipos ─────────────────────────────────────────────────────────

type Casa = "XP" | "AVENUE";

type PhaseKey = "validar" | "ler" | "enriquecer" | "inserir" | "concluido";

type PhaseState = "pending" | "active" | "done" | "error";

type PhaseStatus = Record<PhaseKey, PhaseState>;

type ProgressState = {
  open: boolean;
  casa: Casa | null;
  fileName: string;
  phases: PhaseStatus;
  rowsRead: number;
  rowsImported: number;
  pendentes: number;
  errorMessage: string | null;
  finished: boolean;
};

const initialPhases: PhaseStatus = {
  validar: "pending",
  ler: "pending",
  enriquecer: "pending",
  inserir: "pending",
  concluido: "pending",
};

const initialProgress: ProgressState = {
  open: false,
  casa: null,
  fileName: "",
  phases: { ...initialPhases },
  rowsRead: 0,
  rowsImported: 0,
  pendentes: 0,
  errorMessage: null,
  finished: false,
};

// ─── Helpers ───────────────────────────────────────────────────────

const XP_HEADERS = ["Conta", "Cliente", "Assessor", "D0", "D+1", "D+2", "D+3", "Total"];
const AVENUE_HEADERS = ["Data", "Escritório", "Code", "Nome Assessor", "CPF", "Nome Cliente", "Produto", "Valor"];

const AVENUE_NAME_REGEX = /posi[çc][ãa]o.*caixa/i;
const XP_NAME_REGEX = /relat[oó]rio.*saldo.*consolidado/i;

function uuidv4(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // RFC4122 v4 fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function toNumber(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const cleaned = String(v).replace(/\./g, "").replace(",", ".").replace(/[^\d.\-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function onlyDigits(v: unknown): string {
  return String(v ?? "").replace(/\D/g, "");
}

function formatDoc(digits: string): string {
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  return digits;
}

function headersMatch(actual: string[], expected: string[]): boolean {
  if (actual.length < expected.length) return false;
  return expected.every((h, i) => String(actual[i] ?? "").trim() === h);
}

function extractDateFromName(name: string): string | null {
  const m = name.match(/_(\d{6})_/);
  if (!m) return null;
  const ym = m[1];
  const year = ym.slice(0, 4);
  const month = ym.slice(4, 6);
  if (Number(month) < 1 || Number(month) > 12) return null;
  return `${year}-${month}-01`;
}

function avenueDateNumberToISO(n: number | string): string | null {
  const s = String(n);
  if (!/^\d{8}$/.test(s)) return null;
  const y = s.slice(0, 4);
  const mo = s.slice(4, 6);
  const d = s.slice(6, 8);
  const date = new Date(`${y}-${mo}-${d}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return `${y}-${mo}-${d}`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  const parts = d.slice(0, 10).split("-");
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatDateTime(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return d;
  }
}

function durationSeconds(a: string | null | undefined, b: string | null | undefined): string {
  if (!a || !b) return "—";
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (!Number.isFinite(ms)) return "—";
  // Garantia contra clock skew (criado_em via default now() server vs finalizado_em via client)
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${seconds}s`;
}

// ─── Card único reutilizável ───────────────────────────────────────

type CardConfig = {
  casa: Casa;
  title: string;
  subtitle: string;
};

const CARDS: CardConfig[] = [
  { casa: "XP", title: "Saldo XP", subtitle: "Posição de saldo em caixa — XP Investimentos" },
  { casa: "AVENUE", title: "Saldo Avenue", subtitle: "Posição de saldo em caixa — Avenue" },
];

// ─── Componente principal ─────────────────────────────────────────

export function SaldoConsolidadoSection() {
  // ── Auth: real user (Category B — used for INSERTS, never simulated) ──
  const { user } = useAuth();
  // ── ViewAs: effective role/permissões (Category A — UI gating, respects "Minha Visão") ──
  const { effectiveRole, effectivePermissoes, effectiveUserId, isViewingAs } = useViewAs();

  const [progress, setProgress] = useState<ProgressState>(initialProgress);
  const [cargas, setCargas] = useState<any[]>([]);
  const [loadingCargas, setLoadingCargas] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [cargaParaApagar, setCargaParaApagar] = useState<any | null>(null);
  const [apagando, setApagando] = useState(false);

  // Visibility uses effective role/permissions so that Minha Visão simulates exactly what target sees.
  const isAdmin = effectiveRole === "ADMIN" || effectiveRole === "LIDER";
  const canXP = isAdmin || !!effectivePermissoes?.menu_importar_saldo_xp;
  const canAvenue = isAdmin || !!effectivePermissoes?.menu_importar_saldo_avenue;
  const canAny = canXP || canAvenue;
  const canSeeImport = isAdmin || canAny;

  useEffect(() => {
    if (!canSeeImport) return;
    let mounted = true;
    setLoadingCargas(true);
    let query = supabase
      .from("cargas_saldo" as any)
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(10);
    // Non-admin vê apenas as próprias cargas. Em "Minha Visão" simulando não-admin,
    // filtramos pelo user simulado para reproduzir exatamente a tela do alvo.
    if (!isAdmin) {
      const filterUid = isViewingAs ? effectiveUserId : user?.id;
      if (filterUid) query = query.eq("usuario_upload_id", filterUid) as any;
    }
    query.then(({ data }) => {
      if (mounted) setCargas((data as any[]) ?? []);
      setLoadingCargas(false);
    });
    return () => {
      mounted = false;
    };
  }, [canSeeImport, isAdmin, isViewingAs, effectiveUserId, user?.id, reloadKey]);

  const setPhase = useCallback((phase: PhaseKey, state: PhaseState) => {
    setProgress((prev) => ({ ...prev, phases: { ...prev.phases, [phase]: state } }));
  }, []);

  const handleFile = useCallback(
    async (casa: Casa, file: File) => {
      if (!file.name.toLowerCase().endsWith(".xlsx")) {
        toast.error("Apenas arquivos .xlsx são aceitos.");
        return;
      }

      // ── Validação por nome ──────────────────────────────────────
      if (casa === "XP" && !XP_NAME_REGEX.test(file.name)) {
        toast.error(
          "Arquivo inválido para Saldo XP. Esperado arquivo com 'RelatorioSaldoConsolidado' no nome.",
        );
        return;
      }
      if (casa === "AVENUE" && !AVENUE_NAME_REGEX.test(file.name)) {
        toast.error(
          "Arquivo inválido para Saldo Avenue. Esperado arquivo com 'Posição em Caixa' no nome.",
        );
        return;
      }

      // ── Inicia modal ────────────────────────────────────────────
      setProgress({
        ...initialProgress,
        open: true,
        casa,
        fileName: file.name,
        phases: { ...initialPhases, validar: "active" },
      });

      const id_carga = uuidv4();
      const startedAt = Date.now();
      let inserted = false;

      try {
        // Fase 1: parse
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
        const firstSheetName = workbook.SheetNames[0];
        const ws = workbook.Sheets[firstSheetName];
        if (!ws) throw new Error("Arquivo sem abas.");

        const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null }) as unknown[][];
        if (matrix.length < 1) throw new Error("Arquivo vazio.");

        const headerRow = (matrix[0] as unknown[]).map((c) => String(c ?? "").trim());
        const expected = casa === "XP" ? XP_HEADERS : AVENUE_HEADERS;
        if (!headersMatch(headerRow, expected)) {
          const msg =
            casa === "XP"
              ? "Layout do arquivo XP inválido. Colunas esperadas: Conta, Cliente, Assessor, D0, D+1, D+2, D+3, Total."
              : "Layout do arquivo Avenue inválido. Colunas esperadas: Data, Escritório, Code, Nome Assessor, CPF, Nome Cliente, Produto, Valor.";
          toast.error(msg);
          throw new Error(msg);
        }
        setPhase("validar", "done");

        // Lê linhas como objetos
        setPhase("ler", "active");
        const dataRows = matrix.slice(1).filter((r) => Array.isArray(r) && r.some((c) => c !== null && c !== ""));
        const linhasRaw: Record<string, unknown>[] = dataRows.map((row) => {
          const obj: Record<string, unknown> = {};
          headerRow.forEach((h, i) => {
            obj[h] = row[i] ?? null;
          });
          return obj;
        });
        setProgress((p) => ({ ...p, rowsRead: linhasRaw.length }));
        setPhase("ler", "done");

        // Fase 2: data de referência
        let dataReferencia: string;
        if (casa === "XP") {
          const fromName = extractDateFromName(file.name);
          if (!fromName) {
            console.warn("[SaldoXP] Não foi possível extrair _AAAAMM_ do nome do arquivo. Usando data de hoje.");
            dataReferencia = todayISO();
          } else {
            dataReferencia = fromName;
          }
        } else {
          // Avenue: pega data mais recente da coluna Data
          let maxIso: string | null = null;
          for (const r of linhasRaw) {
            const v = r["Data"];
            const iso = avenueDateNumberToISO(v as any);
            if (iso && (!maxIso || iso > maxIso)) maxIso = iso;
          }
          dataReferencia = maxIso ?? todayISO();
        }

        // Fase 3: lookup
        setPhase("enriquecer", "active");
        let linhasEnriquecidas: Record<string, unknown>[] = [];

        if (casa === "XP") {
          // Lookup principal: raw_base_crm (cadastro oficial via DePara)
          // Chave: Cód do Cliente (CRM) = Conta (arquivo XP)
          const { data: crmLookup, error: crmErr } = await supabase
            .from("raw_base_crm" as any)
            .select("data");
          if (crmErr) throw new Error(`Falha no lookup CRM: ${crmErr.message}`);
          const contasMap = new Map<string, any>();
          (crmLookup as any[] | null)?.forEach((r) => {
            const cod = String(r?.data?.["Cód do Cliente"] ?? "").trim();
            if (cod) contasMap.set(cod, r.data);
          });

          // Segundo lookup: raw_depara para resolver código de Assessor → Nome Encurtado (Advisor)
          const { data: deparaLookup, error: deparaErr } = await supabase
            .from("raw_depara" as any)
            .select("data");
          if (deparaErr) {
            console.warn("[SaldoXP] depara indisponível, Advisor ficará null:", deparaErr.message);
          }
          const advisorMap = new Map<string, string>();
          (deparaLookup as any[] | null)?.forEach((r) => {
            const codAss = String(r?.data?.["Código Assessor XP"] ?? "").trim();
            const nomeEnc = r?.data?.["Nome Encurtado"];
            if (codAss && nomeEnc) advisorMap.set(codAss, String(nomeEnc));
          });

          linhasEnriquecidas = linhasRaw.map((row) => {
            const conta = String(row["Conta"] ?? "").trim();
            const ref = contasMap.get(conta);
            const banker = ref?.Banker ?? null;
            const finder = ref?.Finder ?? null;
            // Advisor: tenta Nome Encurtado a partir do código de Assessor do CRM; fallback null
            const codAssessorCrm = String(ref?.Assessor ?? "").trim();
            const advisor = codAssessorCrm ? advisorMap.get(codAssessorCrm) ?? null : null;
            const status = banker || finder ? "ok" : "pendente";
            return {
              Casa: "XP",
              Conta: conta,
              Cliente: row["Cliente"] ?? null,
              Assessor: row["Assessor"] ?? null,
              D0: toNumber(row["D0"]),
              D1: toNumber(row["D+1"]),
              D2: toNumber(row["D+2"]),
              D3: toNumber(row["D+3"]),
              Total: toNumber(row["Total"]),
              Documento: ref?.Documento ?? null,
              Banker: banker,
              Advisor: advisor,
              Finder: finder,
              Canal: ref?.Canal ?? null,
              "Tipo de Cliente": ref?.["Tipo de Cliente"] ?? null,
              _id_carga: id_carga,
              _data_referencia: dataReferencia,
              _casa: "XP",
              _status_enriquecimento: status,
            };
          });
        } else {
          const { data: lookup, error: lookupErr } = await supabase
            .from("raw_base_avenue" as any)
            .select("data");
          if (lookupErr) throw new Error(`Falha no lookup Avenue: ${lookupErr.message}`);
          const avenueByCpf = new Map<string, any>();
          const avenueByDoc = new Map<string, any>();
          (lookup as any[] | null)?.forEach((r) => {
            const cod = onlyDigits(r?.data?.["Cód do Cliente"]);
            const doc = r?.data?.Documento ?? "";
            if (cod) avenueByCpf.set(cod, r.data);
            if (doc) avenueByDoc.set(String(doc), r.data);
          });

          linhasEnriquecidas = linhasRaw.map((row) => {
            const cpfRaw = onlyDigits(row["CPF"]);
            const cpfFmt = formatDoc(cpfRaw);
            const ref = avenueByCpf.get(cpfRaw) ?? avenueByDoc.get(cpfFmt) ?? null;
            const banker = ref?.Banker ?? null;
            const finder = ref?.Finder ?? null;
            const status = banker || finder ? "ok" : "pendente";
            const valor = toNumber(row["Valor"]);
            return {
              Casa: "AVENUE",
              Documento: cpfFmt,
              CPF: cpfRaw,
              Cliente: row["Nome Cliente"] ?? null,
              Code: row["Code"] ?? null,
              Assessor: row["Nome Assessor"] ?? null,
              Produto: row["Produto"] ?? null,
              D0: valor,
              D1: 0,
              D2: 0,
              D3: 0,
              Total: valor,
              Banker: banker,
              Advisor: ref?.Advisor ?? null,
              Finder: finder,
              Canal: ref?.Canal ?? null,
              "Tipo de Cliente": ref?.["Tipo de Cliente"] ?? null,
              _id_carga: id_carga,
              _data_referencia: dataReferencia,
              _casa: "AVENUE",
              _status_enriquecimento: status,
            };
          });
        }

        const pendentes = linhasEnriquecidas.filter((l) => l._status_enriquecimento === "pendente");
        setProgress((p) => ({ ...p, pendentes: pendentes.length }));
        setPhase("enriquecer", "done");

        // Fase 5: registra carga
        setPhase("inserir", "active");
        // Fix duracao_segundos negativa: gravamos criado_em do mesmo relógio (client)
        // que será usado para finalizado_em mais à frente. Antes, criado_em vinha do
        // default now() do banco e finalizado_em do client → clock skew causava negativo.
        const criadoEmIso = new Date(startedAt).toISOString();
        const { error: cargaErr } = await supabase.from("cargas_saldo" as any).insert({
          id_carga,
          casa,
          data_referencia: dataReferencia,
          nome_arquivo: file.name,
          tamanho_arquivo: file.size,
          total_linhas: linhasEnriquecidas.length,
          status_processamento: "PROCESSANDO",
          usuario_upload_email: user?.email ?? null,
          usuario_upload_id: user?.id ?? null,
          criado_em: criadoEmIso,
        });
        if (cargaErr) throw new Error(`Falha ao registrar carga: ${cargaErr.message}`);
        inserted = true;

        // Fase 6: limpa antigas e insere
        // Tentativa 1: filtro JSONB direto
        let cleanupOk = false;
        try {
          const { error: delErr } = await (supabase
            .from("raw_saldo_consolidado" as any) as any)
            .delete()
            .eq("data->>_casa", casa)
            .eq("data->>_data_referencia", dataReferencia);
          if (!delErr) cleanupOk = true;
          else console.warn("[Saldo] delete via filtro JSONB falhou:", delErr.message);
        } catch (e) {
          console.warn("[Saldo] delete via filtro JSONB lançou:", e);
        }
        if (!cleanupOk) {
          // Tentativa 2: RPC opcional (se não existir, segue mesmo assim)
          const { error: rpcErr } = await supabase.rpc("rpc_limpar_saldo_periodo" as any, {
            p_casa: casa,
            p_data_referencia: dataReferencia,
          });
          if (rpcErr) {
            console.warn(
              "[Saldo] limpeza prévia indisponível, prosseguindo sem deletar duplicatas do dia:",
              rpcErr.message,
            );
          }
        }

        // Insert via RPC bulk
        const { data: bulkData, error: bulkErr } = await supabase.rpc("rpc_sync_bulk_insert" as any, {
          p_table: "raw_saldo_consolidado",
          p_rows: linhasEnriquecidas,
          p_truncate: false,
        });
        if (bulkErr) throw new Error(`Falha no bulk insert: ${bulkErr.message}`);
        if ((bulkData as any)?.success === false) {
          throw new Error((bulkData as any)?.error ?? "Falha no bulk insert");
        }
        setPhase("inserir", "done");

        // Fase 7: pendências
        if (pendentes.length > 0) {
          const rows = pendentes.map((l: any) => ({
            id_carga,
            casa: l._casa,
            data_referencia: l._data_referencia,
            conta: l.Conta ?? null,
            cpf_cnpj: l.CPF ?? onlyDigits(l.Documento),
            documento_formatado: l.Documento ?? null,
            cliente_nome: l.Cliente ?? null,
            saldo: l.Total ?? 0,
            tipo_pendencia: l.Conta ? "CONTA_NAO_ENCONTRADA" : "CPF_NAO_ENCONTRADO",
            descricao: "Cliente sem Banker e sem Finder no cadastro.",
          }));
          const { error: pendErr } = await supabase.from("pendencias_saldo" as any).insert(rows);
          if (pendErr) console.warn("[Saldo] falha ao gravar pendências:", pendErr.message);
        }

        // Fase 8: finaliza carga + sync_log
        const finalStatus = pendentes.length > 0 ? "CONCLUIDO_COM_ALERTA" : "CONCLUIDO";
        await supabase
          .from("cargas_saldo" as any)
          .update({
            linhas_validas: linhasEnriquecidas.length - pendentes.length,
            total_pendencias: pendentes.length,
            status_processamento: finalStatus,
            finalizado_em: new Date().toISOString(),
          })
          .eq("id_carga", id_carga);

        const duracao = `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
        await supabase.rpc("rpc_salvar_sync_log" as any, {
          p_tipo: `cascade-saldo-Saldo ${casa === "XP" ? "XP" : "Avenue"}`,
          p_sucesso: true,
          p_duracao: duracao,
          p_detalhes: [
            `${linhasEnriquecidas.length} linhas importadas, ${pendentes.length} pendências`,
          ],
          p_erros: null,
        });

        setProgress((p) => ({
          ...p,
          rowsImported: linhasEnriquecidas.length - pendentes.length,
          pendentes: pendentes.length,
          finished: true,
          phases: { ...p.phases, concluido: "done" },
        }));
        toast.success(
          `Saldo ${casa === "XP" ? "XP" : "Avenue"} importado: ${
            linhasEnriquecidas.length - pendentes.length
          } válidas, ${pendentes.length} pendências.`,
        );
        setReloadKey((k) => k + 1);
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        console.error("[Saldo] erro:", err);
        setProgress((p) => {
          const phases = { ...p.phases };
          (Object.keys(phases) as PhaseKey[]).forEach((k) => {
            if (phases[k] === "active") phases[k] = "error";
          });
          return { ...p, errorMessage: msg, finished: true, phases };
        });
        if (inserted) {
          await supabase
            .from("cargas_saldo" as any)
            .update({
              status_processamento: "ERRO",
              mensagem_erro: msg,
              finalizado_em: new Date().toISOString(),
            })
            .eq("id_carga", id_carga);
        }
        const duracao = `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
        await supabase.rpc("rpc_salvar_sync_log" as any, {
          p_tipo: `cascade-saldo-Saldo ${casa === "XP" ? "XP" : "Avenue"}`,
          p_sucesso: false,
          p_duracao: duracao,
          p_detalhes: null,
          p_erros: [msg],
        });
        toast.error(`Erro ao importar Saldo ${casa === "XP" ? "XP" : "Avenue"}: ${msg}`);
        setReloadKey((k) => k + 1);
      }
    },
    [setPhase, user?.email],
  );

  const handleApagarCarga = useCallback(async (carga: any) => {
    setApagando(true);
    try {
      // 1) Apagar linhas em raw_saldo_consolidado pelo _id_carga
      let cleanupOk = false;
      try {
        const { error: delRawErr } = await (supabase
          .from("raw_saldo_consolidado" as any) as any)
          .delete()
          .eq("data->>_id_carga", carga.id_carga);
        if (!delRawErr) cleanupOk = true;
        else console.warn("[Saldo] delete raw via JSONB falhou:", delRawErr.message);
      } catch (e) {
        console.warn("[Saldo] delete raw via JSONB lançou:", e);
      }
      if (!cleanupOk) {
        const { error: rpcErr } = await supabase.rpc("rpc_limpar_saldo_periodo" as any, {
          p_casa: carga.casa,
          p_data_referencia: carga.data_referencia,
        });
        if (rpcErr) {
          console.warn(
            "[Saldo] limpeza via RPC indisponível, prosseguindo:",
            rpcErr.message,
          );
        }
      }

      // 2) Apagar pendências
      await supabase
        .from("pendencias_saldo" as any)
        .delete()
        .eq("id_carga", carga.id_carga);

      // 3) Apagar a própria carga
      const { error: delCargaErr } = await supabase
        .from("cargas_saldo" as any)
        .delete()
        .eq("id_carga", carga.id_carga);
      if (delCargaErr) throw new Error(delCargaErr.message);

      toast.success("Carga apagada com sucesso.");
      setReloadKey((k) => k + 1);
    } catch (err: any) {
      toast.error(`Erro ao apagar carga: ${err?.message ?? String(err)}`);
    } finally {
      setApagando(false);
      setCargaParaApagar(null);
    }
  }, []);

  // Sem nenhuma sub-permissão de Saldo, não renderiza a seção.
  if (!isAdmin && !canAny) return null;

  const visibleCards = CARDS.filter((cfg) =>
    cfg.casa === "XP" ? canXP : cfg.casa === "AVENUE" ? canAvenue : false,
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleCards.map((cfg) => (
          <SaldoCard key={cfg.casa} cfg={cfg} disabled={progress.open && !progress.finished} onFile={handleFile} />
        ))}
      </div>

      {canSeeImport && (
        <UltimasCargasTable
          cargas={cargas}
          loading={loadingCargas}
          onApagar={isAdmin ? (c) => setCargaParaApagar(c) : undefined}
        />
      )}

      <AlertDialog
        open={!!cargaParaApagar}
        onOpenChange={(open) => {
          if (!open && !apagando) setCargaParaApagar(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar carga de saldo?</AlertDialogTitle>
            <AlertDialogDescription>
              Apagar esta carga e todos os dados associados? Essa ação não pode ser desfeita.
              {cargaParaApagar && (
                <span className="block mt-2 text-foreground">
                  <strong>{cargaParaApagar.casa}</strong> · {formatDate(cargaParaApagar.data_referencia)} ·{" "}
                  <span className="text-muted-foreground">{cargaParaApagar.nome_arquivo}</span>
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={apagando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={apagando}
              onClick={(e) => {
                e.preventDefault();
                if (cargaParaApagar) handleApagarCarga(cargaParaApagar);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {apagando ? "Apagando…" : "Apagar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={progress.open}
        onOpenChange={(open) => {
          if (!open && progress.finished) setProgress(initialProgress);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Importando Saldo {progress.casa === "XP" ? "XP" : progress.casa === "AVENUE" ? "Avenue" : ""}
            </DialogTitle>
            <DialogDescription className="truncate">{progress.fileName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <PhaseRow label="Validando arquivo" state={progress.phases.validar} />
            <PhaseRow
              label={`Lendo linhas${progress.rowsRead ? ` (${progress.rowsRead.toLocaleString("pt-BR")})` : ""}`}
              state={progress.phases.ler}
            />
            <PhaseRow label="Enriquecendo dados" state={progress.phases.enriquecer} />
            <PhaseRow label="Inserindo no Hub" state={progress.phases.inserir} />
            <PhaseRow label="Concluído" state={progress.phases.concluido} />
          </div>
          {progress.finished && !progress.errorMessage && (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm space-y-1">
              <p className="font-medium text-foreground">
                {progress.rowsImported.toLocaleString("pt-BR")} linhas importadas com sucesso
              </p>
              {progress.pendentes > 0 && (
                <p className="text-amber-600 font-medium">
                  ⚠ {progress.pendentes.toLocaleString("pt-BR")} pendências geradas
                </p>
              )}
            </div>
          )}
          {progress.errorMessage && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {progress.errorMessage}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              disabled={!progress.finished}
              onClick={() => setProgress(initialProgress)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────

function SaldoCard({
  cfg,
  disabled,
  onFile,
}: {
  cfg: CardConfig;
  disabled: boolean;
  onFile: (casa: Casa, file: File) => void;
}) {
  const onDrop = useCallback(
    (files: File[]) => {
      if (files[0]) onFile(cfg.casa, files[0]);
    },
    [cfg.casa, onFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    multiple: false,
    disabled,
  });

  return (
    <Card className="border-[#082537]/20 hover:border-[#082537]/40 transition-colors">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-[#082537]/10 p-2">
            <Wallet className="h-5 w-5 text-[#082537]" />
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
            isDragActive
              ? "border-[#082537] bg-[#082537]/5"
              : "border-border bg-muted/30 hover:bg-muted/50",
          )}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto mb-2 text-muted-foreground" size={22} />
          {isDragActive ? (
            <p className="text-xs font-medium text-[#082537]">Solte o arquivo…</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Arraste o .xlsx aqui ou clique para selecionar
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PhaseRow({ label, state }: { label: string; state: PhaseState }) {
  let icon = <div className="h-4 w-4 rounded-full border-2 border-border" />;
  if (state === "active") icon = <Loader2 className="h-4 w-4 animate-spin text-[#082537]" />;
  if (state === "done") icon = <CheckCircle className="h-4 w-4 text-green-600" />;
  if (state === "error") icon = <XCircle className="h-4 w-4 text-destructive" />;
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm",
        state === "done" && "text-foreground",
        state === "active" && "text-foreground font-medium",
        state === "pending" && "text-muted-foreground",
        state === "error" && "text-destructive",
      )}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function StatusBadge({ status, criadoEm }: { status: string; criadoEm?: string | null }) {
  const isProcessando = status === "PROCESSANDO";
  const horasAberta = criadoEm
    ? (Date.now() - new Date(criadoEm).getTime()) / (1000 * 60 * 60)
    : 0;
  const isTravada = isProcessando && horasAberta > 1;

  if (isTravada) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border cursor-help",
                "bg-amber-50 text-amber-700 border-amber-300",
              )}
            >
              <AlertTriangle className="h-3 w-3" />
              Aguardando há muito tempo
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Carga pode estar travada. Tente reimportar ou contate o admin.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const map: Record<string, { label: string; cls: string; icon?: React.ReactNode }> = {
    CONCLUIDO: { label: "Concluído", cls: "bg-green-50 text-green-700 border-green-200" },
    CONCLUIDO_COM_ALERTA: {
      label: "Concluído c/ alerta",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    ERRO: { label: "Erro", cls: "bg-red-50 text-red-700 border-red-200", icon: <XCircle className="h-3 w-3" /> },
    PROCESSANDO: {
      label: "Processando",
      cls: "bg-blue-50 text-blue-700 border-blue-200",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
  };
  const cfg = map[status] ?? { label: status, cls: "bg-gray-50 text-gray-700 border-gray-200" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
        cfg.cls,
      )}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function CasaBadge({ casa }: { casa: string }) {
  const isXP = casa === "XP";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
        isXP ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200",
      )}
    >
      {casa}
    </span>
  );
}

function UltimasCargasTable({
  cargas,
  loading,
  onApagar,
}: {
  cargas: any[];
  loading: boolean;
  onApagar?: (carga: any) => void;
}) {
  const showActions = !!onApagar;
  const colSpan = showActions ? 9 : 8;
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-[#082537]" />
          <h3 className="font-semibold text-[#082537] text-sm uppercase tracking-wide">
            Últimas cargas de Saldo Consolidado
          </h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Casa</TableHead>
                <TableHead>Data Ref.</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead>Linhas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Upload por</TableHead>
                <TableHead>Data/hora</TableHead>
                <TableHead>Duração</TableHead>
                {showActions && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={colSpan} className="text-center text-muted-foreground py-6">
                    Carregando…
                  </TableCell>
                </TableRow>
              )}
              {!loading && cargas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={colSpan} className="text-center text-muted-foreground py-6">
                    Nenhuma carga registrada ainda.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                cargas.map((c) => (
                  <TableRow key={c.id_carga}>
                    <TableCell>
                      <CasaBadge casa={c.casa} />
                    </TableCell>
                    <TableCell>{formatDate(c.data_referencia)}</TableCell>
                    <TableCell className="max-w-[220px] truncate" title={c.nome_arquivo}>
                      {c.nome_arquivo}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="font-medium">{(c.linhas_validas ?? 0).toLocaleString("pt-BR")}</span>
                      <span className="text-muted-foreground"> válidas</span>
                      {c.total_pendencias > 0 && (
                        <>
                          <span className="text-muted-foreground"> / </span>
                          <span className="text-amber-600 font-medium">
                            {c.total_pendencias.toLocaleString("pt-BR")} pend.
                          </span>
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status_processamento} criadoEm={c.criado_em} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                      {c.usuario_upload_email ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">{formatDateTime(c.criado_em)}</TableCell>
                    <TableCell className="text-xs">
                      {durationSeconds(c.criado_em, c.finalizado_em)}
                    </TableCell>
                    {showActions && (
                      <TableCell className="text-right">
                        {(c.status_processamento === "CONCLUIDO" ||
                          c.status_processamento === "CONCLUIDO_COM_ALERTA" ||
                          c.status_processamento === "ERRO") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => onApagar!(c)}
                            title="Apagar carga"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
