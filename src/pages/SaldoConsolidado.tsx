import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  Search,
  FileSpreadsheet,
  Mail,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  ChevronDown,
  FilterX,
  Calendar,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { SaldoConsolidadoOnboardingModal } from "@/components/relatorios/SaldoConsolidadoOnboardingModal";

import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Plus } from "lucide-react";

// ─── Tipos ───────────────────────────────────────────────────────────

type SaldoRow = {
  documento_formatado: string | null;
  cpf_cnpj: string | null;
  cliente_nome: string | null;
  tipo_cliente: string | null;
  casa: string | null;
  conta: string | null;
  produto: string | null;
  data_referencia: string | null;
  d0: number | null;
  d_mais_1: number | null;
  d_mais_2: number | null;
  d_mais_3: number | null;
  total_saldo: number | null;
  banker: string | null;
  advisor: string | null;
  finder: string | null;
  canal: string | null;
};

type Kpis = {
  total_d0: number;
  total_d_mais_1: number;
  total_d_mais_2: number;
  total_d_mais_3: number;
  total_geral: number;
  qtd_clientes: number;
  qtd_contas: number;
};

type DataRefOpt = {
  data_referencia: string;
  data_formatada: string;
};

type DetalheRow = SaldoRow & { nivel: "casa" | "produto" };

const PAGE_SIZE = 50;

// ─── Helpers ─────────────────────────────────────────────────────────

function fmtBRL(value: number | null | undefined, opts?: { negativeParens?: boolean }): string {
  const n = Number(value ?? 0);
  if (opts?.negativeParens && n < 0) {
    return `(${formatCurrency(Math.abs(n))})`;
  }
  return formatCurrency(n);
}

function casaBadgeClass(casa: string | null): string {
  const c = (casa || "").toUpperCase();
  if (c === "XP") return "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200";
  if (c === "AVENUE") return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200";
  return "bg-muted text-muted-foreground";
}

function negClass(value: number | null | undefined): string {
  return Number(value ?? 0) < 0 ? "text-destructive font-medium" : "";
}

function buildHtmlTable(rows: SaldoRow[], dataFormatada: string): string {
  const limited = rows.slice(0, 200);
  const head = [
    "Nome",
    "CPF/CNPJ",
    "Casa",
    "Conta",
    "D0",
    "D+1",
    "D+2",
    "D+3",
    "Total",
    "Banker",
    "Finder",
    "Advisor",
  ];
  const body = limited
    .map(
      (r) => `<tr>
      <td>${r.cliente_nome ?? ""}</td>
      <td>${r.documento_formatado ?? ""}</td>
      <td>${r.casa ?? ""}</td>
      <td>${r.conta ?? ""}</td>
      <td align="right">${fmtBRL(r.d0)}</td>
      <td align="right">${fmtBRL(r.d_mais_1)}</td>
      <td align="right">${fmtBRL(r.d_mais_2)}</td>
      <td align="right">${fmtBRL(r.d_mais_3)}</td>
      <td align="right"><b>${fmtBRL(r.total_saldo)}</b></td>
      <td>${r.banker ?? ""}</td>
      <td>${r.finder ?? ""}</td>
      <td>${r.advisor ?? ""}</td>
    </tr>`,
    )
    .join("");

  const truncated =
    rows.length > 200
      ? `<p><i>Lista truncada — exibindo 200 de ${rows.length} registros. Exporte em Excel para ver todos.</i></p>`
      : "";

  return `
<div>
  <h3>Saldo Consolidado — ${dataFormatada}</h3>
  <table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;">
    <thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${body}</tbody>
  </table>
  ${truncated}
</div>`.trim();
}

// ─── Página ──────────────────────────────────────────────────────────

export default function SaldoConsolidado() {
  const { user } = useAuth();

  // Filtros
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const [casasSelecionadas, setCasasSelecionadas] = useState<string[]>([]);
  const [casasInicializadas, setCasasInicializadas] = useState(false);
  const [bankersSelecionados, setBankersSelecionados] = useState<string[]>([]);
  const [advisorsSelecionados, setAdvisorsSelecionados] = useState<string[]>([]);
  const [findersSelecionados, setFindersSelecionados] = useState<string[]>([]);
  const [datasSelecionadas, setDatasSelecionadas] = useState<string[]>([]);
  const [datasInicializadas, setDatasInicializadas] = useState(false);
  const [page, setPage] = useState(0);

  // Modal de detalhe
  const [detalheCpf, setDetalheCpf] = useState<string | null>(null);
  const [detalheOpen, setDetalheOpen] = useState(false);
  const [produtoOpen, setProdutoOpen] = useState(false);

  // Onboarding modal: abre auto na 1ª vez por usuário (persistência via localStorage)
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    if (!user?.id) return;
    const key = `saldo_consolidado_onboarding_${user.id}`;
    if (!localStorage.getItem(key)) setShowOnboarding(true);
  }, [user?.id]);
  const handleCloseOnboarding = () => {
    if (user?.id) {
      localStorage.setItem(`saldo_consolidado_onboarding_${user.id}`, "1");
    }
    setShowOnboarding(false);
  };

  // Debounce da busca
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca.trim()), 400);
    return () => clearTimeout(t);
  }, [busca]);

  // Reset de paginação ao mudar filtros
  useEffect(() => {
    setPage(0);
  }, [buscaDebounced, casasSelecionadas, bankersSelecionados, advisorsSelecionados, findersSelecionados, datasSelecionadas]);

  // ─── Filtros: opções
  const { data: casasOpts } = useQuery({
    queryKey: ["saldo-filtros-casas"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_saldo_filtros_casas");
      if (error) throw error;
      return (data ?? []) as { casa: string }[];
    },
  });

  const { data: dataRefOpts } = useQuery({
    queryKey: ["saldo-filtros-data-ref"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_saldo_filtros_data_referencia");
      if (error) throw error;
      return (data ?? []) as DataRefOpt[];
    },
  });

  const { data: bankersOpts } = useQuery({
    queryKey: ["saldo-filtros-bankers"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_saldo_filtros_bankers" as any);
      if (error) throw error;
      return ((data ?? []) as { banker: string }[]).filter((b) => !!b.banker);
    },
  });

  const { data: advisorsOpts } = useQuery({
    queryKey: ["saldo-filtros-advisors"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_saldo_filtros_advisors" as any);
      if (error) throw error;
      return ((data ?? []) as { advisor: string }[]).filter((a) => !!a.advisor);
    },
  });

  const { data: findersOpts } = useQuery({
    queryKey: ["saldo-filtros-finders"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_saldo_filtros_finders" as any);
      if (error) throw error;
      return ((data ?? []) as { finder: string }[]).filter((f) => !!f.finder);
    },
  });

  // Inicializar Casa = todas selecionadas
  useEffect(() => {
    if (!casasInicializadas && casasOpts && casasOpts.length > 0) {
      setCasasSelecionadas(casasOpts.map((c) => c.casa));
      setCasasInicializadas(true);
    }
  }, [casasOpts, casasInicializadas]);

  // Inicializar Datas = todas selecionadas
  useEffect(() => {
    if (!datasInicializadas && dataRefOpts && dataRefOpts.length > 0) {
      setDatasSelecionadas(dataRefOpts.map((d) => d.data_referencia));
      setDatasInicializadas(true);
    }
  }, [dataRefOpts, datasInicializadas]);

  // Filtros para RPC
  const rpcFilters = useMemo(() => {
    // Se nenhuma casa selecionada, manda null pra trazer tudo (evita lista vazia involuntária)
    const casaParam =
      casasSelecionadas.length > 0 && casasOpts && casasSelecionadas.length < casasOpts.length
        ? casasSelecionadas
        : null;
    const bankerParam = bankersSelecionados.length > 0 ? bankersSelecionados : null;
    const advisorParam = advisorsSelecionados.length > 0 ? advisorsSelecionados : null;
    const finderParam = findersSelecionados.length > 0 ? findersSelecionados : null;
    // Limitação: RPCs aceitam p_data_referencia como date único (não array).
    // - 1 data específica selecionada → usa essa data
    // - 0, todas, ou seleção parcial múltipla → null (mostra a data mais recente de cada cliente)
    // TODO futuro: quando RPCs aceitarem array, suportar seleção parcial múltipla de fato.
    const totalDatas = dataRefOpts?.length ?? 0;
    const dataParam =
      datasSelecionadas.length === 1 && totalDatas > 1
        ? datasSelecionadas[0]
        : null;
    return {
      p_banker: bankerParam,
      p_advisor: advisorParam,
      p_finder: finderParam,
      p_documento: null as string[] | null,
      p_casa: casaParam,
      p_data_referencia: dataParam,
      p_busca: buscaDebounced || null,
    };
  }, [casasSelecionadas, casasOpts, bankersSelecionados, advisorsSelecionados, findersSelecionados, datasSelecionadas, dataRefOpts, buscaDebounced]);

  // ─── KPIs
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["saldo-kpis", rpcFilters],
    queryFn: async () => {
      const { p_busca, ...kpiParams } = rpcFilters;
      const { data, error } = await supabase.rpc("rpc_saldo_kpis", kpiParams);
      if (error) throw error;
      const row = (data ?? [])[0] as Kpis | undefined;
      return (
        row ?? {
          total_d0: 0,
          total_d_mais_1: 0,
          total_d_mais_2: 0,
          total_d_mais_3: 0,
          total_geral: 0,
          qtd_clientes: 0,
          qtd_contas: 0,
        }
      );
    },
    enabled: datasInicializadas,
  });

  // ─── Lista paginada
  const { data: lista, isLoading: listaLoading } = useQuery({
    queryKey: ["saldo-list", rpcFilters, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_saldo_list", {
        ...rpcFilters,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      });
      if (error) throw error;
      return (data ?? []) as SaldoRow[];
    },
    enabled: datasInicializadas,
  });

  // ─── Total de registros (sem paginação) — para contador "Mostrando X-Y de Z"
  const { data: totalCount } = useQuery({
    queryKey: ["saldo-list-total", rpcFilters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_saldo_list", {
        ...rpcFilters,
        p_limit: null,
        p_offset: null,
      } as any);
      if (error) throw error;
      return ((data ?? []) as SaldoRow[]).length;
    },
    enabled: datasInicializadas,
  });

  // ─── Modal: detalhe do cliente
  const { data: detalhe, isLoading: detalheLoading } = useQuery({
    queryKey: ["saldo-cliente-detalhe", detalheCpf],
    queryFn: async () => {
      if (!detalheCpf) return [];
      const { data, error } = await supabase.rpc("rpc_saldo_cliente_detalhe", {
        p_cpf_cnpj: detalheCpf,
      });
      if (error) throw error;
      return (data ?? []) as DetalheRow[];
    },
    enabled: !!detalheCpf && detalheOpen,
  });

  const detalheCasa = (detalhe ?? []).filter((d) => d.nivel === "casa");
  const detalheProduto = (detalhe ?? []).filter((d) => d.nivel === "produto");
  const detalheHeader = (detalhe ?? [])[0];

  const totalDetalhe = useMemo(() => {
    return detalheCasa.reduce(
      (acc, r) => ({
        d0: acc.d0 + Number(r.d0 ?? 0),
        d1: acc.d1 + Number(r.d_mais_1 ?? 0),
        d2: acc.d2 + Number(r.d_mais_2 ?? 0),
        d3: acc.d3 + Number(r.d_mais_3 ?? 0),
        total: acc.total + Number(r.total_saldo ?? 0),
      }),
      { d0: 0, d1: 0, d2: 0, d3: 0, total: 0 },
    );
  }, [detalheCasa]);

  // ─── Exportações
  const [exporting, setExporting] = useState(false);

  async function fetchAllRows(): Promise<SaldoRow[]> {
    const all: SaldoRow[] = [];
    let offset = 0;
    const batch = 1000;
    // bucket-loop com limite seguro
    for (let i = 0; i < 50; i++) {
      const { data, error } = await supabase.rpc("rpc_saldo_list", {
        ...rpcFilters,
        p_limit: batch,
        p_offset: offset,
      });
      if (error) throw error;
      const chunk = (data ?? []) as SaldoRow[];
      all.push(...chunk);
      if (chunk.length < batch) break;
      offset += batch;
    }
    return all;
  }

  async function handleExportExcel() {
    try {
      setExporting(true);
      const rows = await fetchAllRows();
      if (rows.length === 0) {
        toast.error("Nenhum dado para exportar");
        return;
      }
      const sheetData = rows.map((r) => ({
        Nome: r.cliente_nome ?? "",
        "CPF/CNPJ": r.documento_formatado ?? "",
        Casa: r.casa ?? "",
        Conta: r.conta ?? "",
        D0: Number(r.d0 ?? 0),
        "D+1": Number(r.d_mais_1 ?? 0),
        "D+2": Number(r.d_mais_2 ?? 0),
        "D+3": Number(r.d_mais_3 ?? 0),
        Total: Number(r.total_saldo ?? 0),
        Banker: r.banker ?? "",
        Finder: r.finder ?? "",
        Advisor: r.advisor ?? "",
      }));
      const ws = XLSX.utils.json_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Saldo Consolidado");
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "").replace(/-/g, "-");
      const fname = `SaldoConsolidado_${stamp}.xlsx`;
      XLSX.writeFile(wb, fname);
      toast.success("Arquivo baixado");
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao exportar: " + (e?.message ?? "desconhecido"));
    } finally {
      setExporting(false);
    }
  }

  async function handleExportClienteExcel(cpf: string, nome: string) {
    try {
      const { data, error } = await supabase.rpc("rpc_saldo_cliente_detalhe", { p_cpf_cnpj: cpf });
      if (error) throw error;
      const rows = (data ?? []) as DetalheRow[];
      const sheetData = rows.map((r) => ({
        Nivel: r.nivel,
        Casa: r.casa ?? "",
        Conta: r.conta ?? "",
        Produto: r.produto ?? "",
        D0: Number(r.d0 ?? 0),
        "D+1": Number(r.d_mais_1 ?? 0),
        "D+2": Number(r.d_mais_2 ?? 0),
        "D+3": Number(r.d_mais_3 ?? 0),
        Total: Number(r.total_saldo ?? 0),
        Banker: r.banker ?? "",
        Advisor: r.advisor ?? "",
        Finder: r.finder ?? "",
      }));
      const ws = XLSX.utils.json_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Saldo");
      const safe = (nome || "cliente").replace(/[^a-z0-9]+/gi, "_").slice(0, 40);
      XLSX.writeFile(wb, `Saldo_${safe}.xlsx`);
      toast.success("Arquivo baixado");
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao exportar cliente: " + (e?.message ?? "desconhecido"));
    }
  }

  function handleSendEmail() {
    if (!lista || lista.length === 0) {
      toast.error("Nenhum dado para enviar");
      return;
    }
    // Quando há múltiplas datas, usa a mais recente como rótulo do email
    const dataRefLabel =
      datasSelecionadas.length === 1
        ? datasSelecionadas[0]
        : dataRefOpts?.[0]?.data_referencia ?? null;
    const dataFormatada =
      dataRefOpts?.find((d) => d.data_referencia === dataRefLabel)?.data_formatada ??
      formatDate(dataRefLabel ?? "");
    const html = buildHtmlTable(lista, dataFormatada);
    const subject = encodeURIComponent(`Saldo em Conta ${dataFormatada}`);
    const body = encodeURIComponent(html);
    const url = `mailto:?subject=${subject}&body=${body}`;

    if (url.length > 1900) {
      // fallback: gera um arquivo .eml para download
      const eml = [
        `Subject: Saldo em Conta ${dataFormatada}`,
        "MIME-Version: 1.0",
        'Content-Type: text/html; charset="utf-8"',
        "",
        html,
      ].join("\n");
      const blob = new Blob([eml], { type: "message/rfc822" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `SaldoConsolidado_${dataFormatada.replace(/\//g, "-")}.eml`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success("Email gerado para download (lista grande). Abra no Outlook.");
      return;
    }

    window.location.href = url;
    toast.success("Email preparado");
  }

  // ─── Header info
  const dataAtualLabel = useMemo(() => {
    if (!dataRefOpts || dataRefOpts.length === 0) return "—";
    const top = dataRefOpts[0].data_formatada;
    return top;
  }, [dataRefOpts]);

  const allCasasSelected = casasOpts ? casasSelecionadas.length === casasOpts.length : false;

  function toggleCasa(casa: string) {
    setCasasSelecionadas((prev) =>
      prev.includes(casa) ? prev.filter((c) => c !== casa) : [...prev, casa],
    );
  }

  function toggleAllCasas() {
    if (!casasOpts) return;
    if (allCasasSelected) {
      setCasasSelecionadas([]);
    } else {
      setCasasSelecionadas(casasOpts.map((c) => c.casa));
    }
  }

  function toggleBanker(b: string) {
    setBankersSelecionados((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b],
    );
  }

  function toggleFinder(f: string) {
    setFindersSelecionados((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
    );
  }

  function toggleAdvisor(a: string) {
    setAdvisorsSelecionados((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );
  }

  const totalDatasOpts = dataRefOpts?.length ?? 0;
  const datasParcial =
    datasInicializadas &&
    totalDatasOpts > 0 &&
    datasSelecionadas.length > 0 &&
    datasSelecionadas.length < totalDatasOpts;
  const hasFiltrosAplicados =
    busca.trim().length > 0 ||
    (casasOpts ? casasSelecionadas.length !== casasOpts.length : false) ||
    bankersSelecionados.length > 0 ||
    advisorsSelecionados.length > 0 ||
    findersSelecionados.length > 0 ||
    datasParcial;

  function handleLimparFiltros() {
    setBusca("");
    setBuscaDebounced("");
    if (casasOpts) setCasasSelecionadas(casasOpts.map((c) => c.casa));
    setBankersSelecionados([]);
    setAdvisorsSelecionados([]);
    setFindersSelecionados([]);
    if (dataRefOpts) setDatasSelecionadas(dataRefOpts.map((d) => d.data_referencia));
  }

  const isEmpty = !listaLoading && (lista?.length ?? 0) === 0;
  const hasNextPage = (lista?.length ?? 0) === PAGE_SIZE;
  const totalFiltrado = totalCount ?? 0;
  const showingFrom = totalFiltrado === 0 ? 0 : page * PAGE_SIZE + 1;
  const showingTo = Math.min(totalFiltrado, page * PAGE_SIZE + (lista?.length ?? 0));

  return (
    <AppLayout>
      <SaldoConsolidadoOnboardingModal open={showOnboarding} onClose={handleCloseOnboarding} />
      <div className="animate-fade-in space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <Wallet className="h-6 w-6 text-primary" />
              Saldo Consolidado
              <button
                type="button"
                onClick={() => setShowOnboarding(true)}
                className="text-muted-foreground hover:text-primary transition-colors"
                title="Ver tutorial novamente"
                aria-label="Ver tutorial novamente"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Última atualização: <span className="font-medium">{dataAtualLabel}</span>
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <KpiCard label="D0" value={kpis?.total_d0 ?? 0} loading={kpisLoading} />
          <KpiCard
            label="D+1"
            value={kpis?.total_d_mais_1 ?? 0}
            loading={kpisLoading}
            isNegative={(kpis?.total_d_mais_1 ?? 0) < 0}
          />
          <KpiCard label="D+2" value={kpis?.total_d_mais_2 ?? 0} loading={kpisLoading} />
          <KpiCard label="D+3" value={kpis?.total_d_mais_3 ?? 0} loading={kpisLoading} />
          <Card className="border-2 border-primary/40 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-primary font-semibold">
                Total Consolidado
              </p>
              {kpisLoading ? (
                <Skeleton className="h-8 w-32 mt-2" />
              ) : (
                <p
                  key={kpis?.total_geral ?? 0}
                  className="text-2xl font-bold text-primary mt-1 animate-fade-in"
                >
                  {fmtBRL(kpis?.total_geral)}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                {Number(kpis?.qtd_clientes ?? 0).toLocaleString("pt-BR")} clientes em{" "}
                {Number(kpis?.qtd_contas ?? 0).toLocaleString("pt-BR")} contas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <Card>
          <CardContent className="p-4 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, CPF/CNPJ ou conta..."
                className="pl-9 h-10"
              />
            </div>

            {/* Filtro Casa multi-select */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 gap-2 min-w-[160px] justify-between">
                  <span className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Casa
                  </span>
                  <Badge variant="secondary" className="ml-1">
                    {casasSelecionadas.length}
                  </Badge>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="end">
                {!casasOpts ? (
                  <Skeleton className="h-20 w-full" />
                ) : (
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={toggleAllCasas}
                      className="w-full text-left text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded hover:bg-muted transition"
                    >
                      {allCasasSelected ? "Limpar todas" : "Selecionar todas"}
                    </button>
                    <div className="h-px bg-border my-1" />
                    {casasOpts.map((c) => (
                      <label
                        key={c.casa}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={casasSelecionadas.includes(c.casa)}
                          onCheckedChange={() => toggleCasa(c.casa)}
                        />
                        <span>{c.casa}</span>
                      </label>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* Filtro Advisor multi-select */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 gap-2 min-w-[160px] justify-between">
                  <span className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Advisor
                  </span>
                  {advisorsSelecionados.length > 0 ? (
                    <Badge variant="secondary" className="ml-1">
                      {advisorsSelecionados.length}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Todos</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                {!advisorsOpts ? (
                  <Skeleton className="h-20 w-full" />
                ) : advisorsOpts.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2 py-3">
                    Nenhum advisor disponível
                  </p>
                ) : (
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setAdvisorsSelecionados([])}
                      className="w-full text-left text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded hover:bg-muted transition"
                      disabled={advisorsSelecionados.length === 0}
                    >
                      Limpar seleção
                    </button>
                    <div className="h-px bg-border my-1" />
                    <div className="max-h-64 overflow-y-auto space-y-0.5">
                      {advisorsOpts.map((a) => (
                        <label
                          key={a.advisor}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
                        >
                          <Checkbox
                            checked={advisorsSelecionados.includes(a.advisor)}
                            onCheckedChange={() => toggleAdvisor(a.advisor)}
                          />
                          <span className="truncate">{a.advisor}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* Filtro FA (Banker) multi-select */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 gap-2 min-w-[160px] justify-between">
                  <span className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    FA
                  </span>
                  {bankersSelecionados.length > 0 ? (
                    <Badge variant="secondary" className="ml-1">
                      {bankersSelecionados.length}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Todos</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                {!bankersOpts ? (
                  <Skeleton className="h-20 w-full" />
                ) : bankersOpts.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2 py-3">
                    Nenhum FA disponível
                  </p>
                ) : (
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setBankersSelecionados([])}
                      className="w-full text-left text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded hover:bg-muted transition"
                      disabled={bankersSelecionados.length === 0}
                    >
                      Limpar seleção
                    </button>
                    <div className="h-px bg-border my-1" />
                    <div className="max-h-64 overflow-y-auto space-y-0.5">
                      {bankersOpts.map((b) => (
                        <label
                          key={b.banker}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
                        >
                          <Checkbox
                            checked={bankersSelecionados.includes(b.banker)}
                            onCheckedChange={() => toggleBanker(b.banker)}
                          />
                          <span className="truncate">{b.banker}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* Filtro Finder multi-select */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 gap-2 min-w-[160px] justify-between">
                  <span className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Finder
                  </span>
                  {findersSelecionados.length > 0 ? (
                    <Badge variant="secondary" className="ml-1">
                      {findersSelecionados.length}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Todos</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                {!findersOpts ? (
                  <Skeleton className="h-20 w-full" />
                ) : findersOpts.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2 py-3">
                    Nenhum finder disponível
                  </p>
                ) : (
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setFindersSelecionados([])}
                      className="w-full text-left text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded hover:bg-muted transition"
                      disabled={findersSelecionados.length === 0}
                    >
                      Limpar seleção
                    </button>
                    <div className="h-px bg-border my-1" />
                    <div className="max-h-64 overflow-y-auto space-y-0.5">
                      {findersOpts.map((f) => (
                        <label
                          key={f.finder}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
                        >
                          <Checkbox
                            checked={findersSelecionados.includes(f.finder)}
                            onCheckedChange={() => toggleFinder(f.finder)}
                          />
                          <span className="truncate">{f.finder}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-10 gap-2">
                    {exporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Ações
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 p-3 space-y-3">
                  {/* Filtro Data Referência (movido para Ações) */}
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      Data
                      {totalDatasOpts > 0 && datasSelecionadas.length === totalDatasOpts ? (
                        <span className="text-xs text-muted-foreground normal-case font-normal">(Todas)</span>
                      ) : (
                        <Badge variant="secondary" className="ml-1">
                          {datasSelecionadas.length}
                        </Badge>
                      )}
                    </p>
                    {!dataRefOpts ? (
                      <Skeleton className="h-20 w-full" />
                    ) : dataRefOpts.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">Nenhuma data disponível</p>
                    ) : (
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (datasSelecionadas.length === dataRefOpts.length) {
                              setDatasSelecionadas([]);
                            } else {
                              setDatasSelecionadas(dataRefOpts.map((d) => d.data_referencia));
                            }
                          }}
                          className="w-full text-left text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition"
                        >
                          {datasSelecionadas.length === dataRefOpts.length
                            ? "Limpar seleção"
                            : "Selecionar todas"}
                        </button>
                        <div className="max-h-48 overflow-y-auto space-y-0.5">
                          {dataRefOpts.map((d) => (
                            <label
                              key={d.data_referencia}
                              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
                            >
                              <Checkbox
                                checked={datasSelecionadas.includes(d.data_referencia)}
                                onCheckedChange={() =>
                                  setDatasSelecionadas((prev) =>
                                    prev.includes(d.data_referencia)
                                      ? prev.filter((x) => x !== d.data_referencia)
                                      : [...prev, d.data_referencia],
                                  )
                                }
                              />
                              <span>{d.data_formatada}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-border" />

                  <button
                    type="button"
                    onClick={handleExportExcel}
                    disabled={exporting || isEmpty}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Exportar Excel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendEmail}
                    disabled={isEmpty}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Mail className="h-4 w-4" />
                    Enviar por Outlook
                  </button>
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                className="h-10 gap-2"
                onClick={handleLimparFiltros}
                disabled={!hasFiltrosAplicados}
                title="Limpar filtros"
              >
                <FilterX className="h-4 w-4" />
                Limpar filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Casa</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead className="text-right">D0</TableHead>
                    <TableHead className="text-right">D+1</TableHead>
                    <TableHead className="text-right">D+2</TableHead>
                    <TableHead className="text-right">D+3</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>FA</TableHead>
                    <TableHead>Advisor</TableHead>
                    <TableHead>Finder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listaLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 12 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : isEmpty ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                        Nenhum cliente com saldo encontrado para os filtros aplicados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (lista ?? []).map((r, idx) => (
                      <TableRow
                        key={`${r.cpf_cnpj}-${r.casa}-${r.conta}-${idx}`}
                        className="cursor-pointer hover:bg-muted/50 transition"
                        onClick={() => {
                          setDetalheCpf(r.cpf_cnpj);
                          setDetalheOpen(true);
                          setProdutoOpen(false);
                        }}
                      >
                        <TableCell className="font-medium max-w-[240px] truncate">
                          {r.cliente_nome}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.documento_formatado}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("font-medium", casaBadgeClass(r.casa))}>
                            {r.casa}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.conta}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtBRL(r.d0)}
                        </TableCell>
                        <TableCell className={cn("text-right tabular-nums", negClass(r.d_mais_1))}>
                          {fmtBRL(r.d_mais_1, { negativeParens: true })}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{fmtBRL(r.d_mais_2)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtBRL(r.d_mais_3)}</TableCell>
                        <TableCell className="text-right tabular-nums font-bold">
                          {fmtBRL(r.total_saldo)}
                        </TableCell>
                        <TableCell className="text-xs">{r.banker}</TableCell>
                        <TableCell className="text-xs">{r.advisor}</TableCell>
                        <TableCell className="text-xs">{r.finder}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Contador + Paginação */}
            {!listaLoading && (lista?.length ?? 0) > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Mostrando{" "}
                  <span className="font-medium text-foreground">
                    {showingFrom.toLocaleString("pt-BR")}-{showingTo.toLocaleString("pt-BR")}
                  </span>{" "}
                  de{" "}
                  <span className="font-medium text-foreground">
                    {totalFiltrado.toLocaleString("pt-BR")}
                  </span>{" "}
                  {totalFiltrado === 1 ? "cliente" : "clientes"}
                </p>
                {(page > 0 || hasNextPage) && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!hasNextPage}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Detalhe */}
      <Dialog open={detalheOpen} onOpenChange={setDetalheOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {detalheHeader?.cliente_nome ?? "Detalhe do cliente"}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-3 text-xs">
              <span className="font-mono">{detalheHeader?.documento_formatado ?? "—"}</span>
              {detalheHeader?.tipo_cliente && (
                <Badge variant="outline">{detalheHeader.tipo_cliente}</Badge>
              )}
            </DialogDescription>
          </DialogHeader>

          {detalheLoading ? (
            <div className="space-y-3 py-6">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Resumo */}
              <Card className="bg-muted/30">
                <CardContent className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                  <InfoBox label="FA" value={detalheHeader?.banker} />
                  <InfoBox label="Advisor" value={detalheHeader?.advisor} />
                  <InfoBox label="Finder" value={detalheHeader?.finder} />
                  <InfoBox label="Canal" value={detalheHeader?.canal} />
                  <InfoBox
                    label="Data posição"
                    value={detalheHeader?.data_referencia ? formatDate(detalheHeader.data_referencia) : "—"}
                  />
                </CardContent>
              </Card>

              {/* Saldo por Casa */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Saldo por Casa</h3>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Casa</TableHead>
                        <TableHead className="text-right">D0</TableHead>
                        <TableHead className="text-right">D+1</TableHead>
                        <TableHead className="text-right">D+2</TableHead>
                        <TableHead className="text-right">D+3</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detalheCasa.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">
                            Sem dados.
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {detalheCasa.map((r, i) => (
                            <TableRow key={`${r.casa}-${i}`}>
                              <TableCell>
                                <Badge variant="outline" className={casaBadgeClass(r.casa)}>
                                  {r.casa}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{fmtBRL(r.d0)}</TableCell>
                              <TableCell className={cn("text-right tabular-nums", negClass(r.d_mais_1))}>
                                {fmtBRL(r.d_mais_1, { negativeParens: true })}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{fmtBRL(r.d_mais_2)}</TableCell>
                              <TableCell className="text-right tabular-nums">{fmtBRL(r.d_mais_3)}</TableCell>
                              <TableCell className="text-right tabular-nums font-bold">
                                {fmtBRL(r.total_saldo)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/50 font-semibold">
                            <TableCell>Total</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtBRL(totalDetalhe.d0)}</TableCell>
                            <TableCell className={cn("text-right tabular-nums", negClass(totalDetalhe.d1))}>
                              {fmtBRL(totalDetalhe.d1, { negativeParens: true })}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{fmtBRL(totalDetalhe.d2)}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtBRL(totalDetalhe.d3)}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtBRL(totalDetalhe.total)}</TableCell>
                          </TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Detalhe por Produto (colapsável) */}
              <Collapsible open={produtoOpen} onOpenChange={setProdutoOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 w-full justify-between">
                    <span className="text-sm font-semibold">
                      Detalhe por Produto ({detalheProduto.length})
                    </span>
                    <ChevronDown
                      className={cn("h-4 w-4 transition", produtoOpen && "rotate-180")}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Casa</TableHead>
                          <TableHead>Conta</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detalheProduto.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">
                              Sem detalhe granular.
                            </TableCell>
                          </TableRow>
                        ) : (
                          detalheProduto.map((r, i) => (
                            <TableRow key={`prod-${i}`}>
                              <TableCell>
                                <Badge variant="outline" className={casaBadgeClass(r.casa)}>
                                  {r.casa}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs">{r.conta}</TableCell>
                              <TableCell className="text-xs">{r.produto}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {fmtBRL(r.total_saldo)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() =>
                detalheCpf &&
                handleExportClienteExcel(detalheCpf, detalheHeader?.cliente_nome ?? "cliente")
              }
              disabled={!detalheCpf || detalheLoading}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar saldo deste cliente
            </Button>
            <Button onClick={() => setDetalheOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  loading,
  isNegative,
}: {
  label: string;
  value: number;
  loading?: boolean;
  isNegative?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
          {label}
        </p>
        {loading ? (
          <Skeleton className="h-7 w-28 mt-2" />
        ) : (
          <p
            key={value}
            className={cn(
              "text-xl font-bold mt-1 animate-fade-in tabular-nums",
              isNegative ? "text-destructive" : "text-foreground",
            )}
          >
            {fmtBRL(value, { negativeParens: true })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function InfoBox({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </p>
      <p className="text-sm font-medium text-foreground mt-0.5 truncate">{value || "—"}</p>
    </div>
  );
}
