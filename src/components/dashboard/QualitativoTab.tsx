import { useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ChevronUp, ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { DashboardFilters } from "@/hooks/useDashboardFilters";
import {
  useCustodiaIndexador,
  useCustodiaVeiculo,
  useTodosAtivos,
  useTabelaVencimentos,
  useTabelaClientes,
  useAucFaixaPl,
  useRoaTipoCliente,
  useRoaFaixaPl,
  useRoaM0Tabela,
  useVencimentosPorAno,
} from "@/hooks/useQualitativoData";
import {
  BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LabelList,
} from "recharts";

/* ─── Formatação pt-BR ─── */
const fmtPct = (v: number) => v == null ? "—" : `${v.toFixed(2).replace(".", ",")}%`;
const fmtMiInt = (v: number) => `R$ ${Math.round(v / 1e6)} Mi`;
const fmtMi = (v: number) => `R$ ${(v / 1e6).toFixed(2).replace(".", ",")} Mi`;
const fmtBRL = (v: number) =>
  v == null ? "—" : `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtBRLint = (v: number) =>
  v == null ? "—" : `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
const fmtDateShort = (v: string | null) => {
  if (!v) return "—";
  try {
    const d = new Date(v);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  } catch { return v; }
};

/* ─── Colors ─── */
const DONUT_COLORS = ["#1a2e4a", "#4a90d9", "#6bb8d4", "#e8a838", "#27ae60", "#e74c3c", "#8e44ad", "#7f8c8d", "#f39c12", "#16a085", "#2980b9", "#95a5a6"];

const ROA_TIPO_COLORS: Record<string, string> = {
  "PESSOA FÍSICA": "#1a2e4a",
  "PESSOA JURÍDICA": "#4caf50",
};

const ROA_FAIXA_COLORS: Record<string, string> = {
  "-300k": "#1a2e4a",
  "300k-500k": "#e8a838",
  "500k-1M": "#4a90d9",
  "1-3M": "#e74c3c",
  "3-5M": "#27ae60",
  "5-10M": "#7f8c8d",
  "+10M": "#8e44ad",
};

const VENC_PRODUCT_COLORS: Record<string, string> = {
  "Crédito Privado": "#27ae60",
  "Crédito Privado Global": "#95a5a6",
  "Emissão Bancária": "#2c3e50",
  "Letra Financeira": "#8e44ad",
  "Nota Estruturada": "#e8a838",
  "Produto Estruturado": "#16a085",
  "Renda Variável": "#e74c3c",
  "Tesouro Direto": "#3498db",
  "Título Público": "#f39c12",
};

const FAIXA_ORDER = ["Inativo", "-300k", "300k-500k", "500k-1M", "1-3M", "3-5M", "5-10M", "+10M"];

/* ─── Sub-components ─── */
interface Props { filters: DashboardFilters; }

function PbiCard({ title, children, className, fill }: { title: string; children: React.ReactNode; className?: string; fill?: boolean }) {
  return (
    <div className={`bg-card border border-border rounded-lg shadow-sm overflow-hidden ${fill ? "flex flex-col h-full" : ""} ${className ?? ""}`}>
      <div className="px-3 py-1.5 border-b border-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-foreground">{title}</p>
      </div>
      <div className={`p-2 ${fill ? "flex-1 flex flex-col" : ""}`}>{children}</div>
    </div>
  );
}

/* ─── Donut with labels ON slices ─── */
function DonutChart({ data, title }: { data: { name: string; value: number }[]; title: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, percent }: any) => {
    if (percent < 0.03) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + (outerRadius + 14) * Math.cos(-RADIAN * midAngle);
    const y = cy + (outerRadius + 14) * Math.sin(-RADIAN * midAngle);
    const mi = (value / 1e6).toFixed(0);
    const pctStr = (percent * 100).toFixed(0);
    return (
      <text x={x} y={y} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={13} fill="#111827" fontWeight={600}>
        R$ {mi} Mi ({pctStr}%)
      </text>
    );
  };

  return (
    <div className="flex items-center">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="45%" cy="50%" outerRadius={80} innerRadius={45}
              label={renderLabel} labelLine={false} isAnimationActive={false}>
              {data.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => [fmtMi(v), ""]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-36 space-y-1 pr-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[12px]">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="truncate text-[#111827] font-medium">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── SortableTable — scroll only, NO pagination ─── */
function SortableTable({ columns, rows, maxH = 300, searchKeys, footerRow, fill }: {
  columns: { key: string; label: string; align?: "left" | "right"; fmt?: (v: any) => string }[];
  rows: Record<string, any>[];
  maxH?: number;
  searchKeys?: string[];
  footerRow?: Record<string, any>;
  fill?: boolean;
}) {
  const [sort, setSort] = useState<{ key: string; asc: boolean }>({ key: columns[0]?.key ?? "", asc: true });
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim() || !searchKeys?.length) return rows;
    const q = search.toLowerCase();
    return rows.filter(r => searchKeys.some(k => String(r[k] ?? "").toLowerCase().includes(q)));
  }, [rows, search, searchKeys]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av ?? "").localeCompare(String(bv ?? ""));
      return sort.asc ? cmp : -cmp;
    });
  }, [filtered, sort]);

  const toggle = (key: string) => {
    setSort(prev => prev.key === key ? { key, asc: !prev.asc } : { key, asc: false });
  };

  return (
    <div className="space-y-1">
      {searchKeys?.length ? (
        <div className="relative w-60">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="h-7 pl-7 text-[12px]"
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      ) : null}
      <div className={`overflow-x-auto overflow-y-auto ${fill ? "flex-1" : ""}`} style={fill ? {} : { maxHeight: maxH }}>
        <table className="w-full text-sm border-collapse" style={{ minWidth: columns.length * 140 }}>
          <thead className="sticky top-0 z-10">
            <tr style={{ backgroundColor: "#1B2A3D" }}>
              {columns.map(c => (
                  <th
                    key={c.key}
                    className={`text-[13px] py-1.5 px-2 cursor-pointer select-none text-white whitespace-nowrap font-bold ${c.align === "right" ? "text-right" : "text-left"}`}
                  style={{ minWidth: 140 }}
                  onClick={() => toggle(c.key)}
                >
                  <span className="inline-flex items-center gap-0.5">
                    {c.label}
                    {sort.key === c.key
                      ? sort.asc ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />
                      : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-card" : "bg-muted/40"}>
                {columns.map(c => (
                  <td key={c.key} className={`text-[13px] py-1 px-2 whitespace-nowrap text-[#111827] ${c.align === "right" ? "text-right font-semibold" : "font-medium"}`}
                    style={{ minWidth: 140 }}>
                    {c.fmt ? c.fmt(row[c.key]) : (row[c.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footerRow && (
            <tfoot className="sticky bottom-0 z-10 bg-muted/80 font-bold border-t border-border">
              <tr>
                {columns.map(c => (
                  <td key={c.key} className={`text-[13px] py-1.5 px-2 text-[#111827] font-bold ${c.align === "right" ? "text-right" : ""}`}
                    style={{ minWidth: 140 }}>
                    {footerRow[c.key] != null ? (c.fmt ? c.fmt(footerRow[c.key]) : footerRow[c.key]) : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

/* ─── Custom tooltips ─── */
const RoaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
     <div className="bg-card border border-border rounded px-2.5 py-1.5 shadow-md text-xs">
      <p className="font-semibold text-foreground mb-0.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {fmtPct(Number(p.value))}</p>
      ))}
    </div>
  );
};

const AucTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
     <div className="bg-card border border-border rounded px-2.5 py-1.5 shadow-md text-xs">
      <p className="font-semibold text-foreground mb-0.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.name === "# Clientes" ? p.value : fmtMi(Number(p.value))}
        </p>
      ))}
    </div>
  );
};

const VencAnoTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded px-2.5 py-1.5 shadow-md text-xs">
      <p className="font-semibold text-foreground mb-0.5">{label}</p>
      {payload.filter((p: any) => p.value > 0).map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {fmtMi(Number(p.value))}</p>
      ))}
    </div>
  );
};

/* ─── ROA X-axis helper: 6-month ticks, descending order ─── */
function roaAnomesToLabel(anomes: number) {
  const y = Math.floor(anomes / 100);
  const m = anomes % 100;
  const months = ["", "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${months[m] || m} ${y}`;
}

function isJanOrJul(anomes: number) {
  const m = anomes % 100;
  return m === 1 || m === 7;
}

/* ─── Main Component ─── */
export function QualitativoTab({ filters }: Props) {
  const { data: custIdxData, isLoading: l1 } = useCustodiaIndexador(filters);
  const { data: custVeiData, isLoading: l2 } = useCustodiaVeiculo(filters);
  const { data: todosAtivos, isLoading: l4 } = useTodosAtivos(filters);
  const { data: tabelaVenc, isLoading: l5 } = useTabelaVencimentos(filters);
  const { data: tabelaCli, isLoading: l6 } = useTabelaClientes(filters);
  const { data: aucFaixaData, isLoading: l7 } = useAucFaixaPl(filters);
  const { data: roaTipo, isLoading: l8 } = useRoaTipoCliente(filters);
  const { data: roaFaixa, isLoading: l9 } = useRoaFaixaPl(filters);
  const { data: roaM0, isLoading: l10 } = useRoaM0Tabela(filters);
  const { data: vencAnoData, isLoading: l11 } = useVencimentosPorAno(filters);

  /* ─── Tabela Clientes ─── */
  const clienteRows = useMemo(() =>
    (tabelaCli ?? []).map((r: any) => ({
      documento: r.documento,
      cod_cliente: r.cod_cliente,
      d0: Number(r.d0) || 0,
      primeiro_nome: r.primeiro_nome,
      pl_tailor: Number(r.pl_tailor) || 0,
      pl_declarado_ajustado: Number(r.pl_declarado_ajustado) || 0,
      sow_ajustado: Number(r.sow_ajustado) || 0,
      endereco: r.endereco_ajustado,
      banker: r.banker,
      advisor: r.advisor,
      tipo_cliente: r.tipo_cliente,
    }))
  , [tabelaCli]);

  const clienteFooter = useMemo(() => {
    const rows = clienteRows;
    const sumPl = rows.reduce((s, r) => s + r.pl_tailor, 0);
    const sumDecl = rows.reduce((s, r) => s + r.pl_declarado_ajustado, 0);
    const avgSow = rows.length ? rows.reduce((s, r) => s + r.sow_ajustado, 0) / rows.length : 0;
    return { documento: "TOTAL", pl_tailor: sumPl, pl_declarado_ajustado: sumDecl, sow_ajustado: avgSow };
  }, [clienteRows]);

  /* ─── AuC Faixa PL ─── */
  const aucFaixaChart = useMemo(() =>
    (aucFaixaData ?? [])
      .sort((a: any, b: any) => {
        const ai = FAIXA_ORDER.indexOf(a.faixa_pl);
        const bi = FAIXA_ORDER.indexOf(b.faixa_pl);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      })
      .map((r: any) => ({
        faixa: r.faixa_pl ?? "N/D",
        "Net Em M": Number(r.auc) || 0,
        "PL Declarado": Number(r.pl_declarado) || 0,
        "# Clientes": Number(r.clientes) || 0,
      }))
  , [aucFaixaData]);

  /* ─── Custódia donuts ─── */
  const custIdxChart = useMemo(() =>
    (custIdxData ?? []).map((r: any) => ({ name: r.indexador ?? "Outros", value: Number(r.net) || 0 }))
  , [custIdxData]);

  const custVeiChart = useMemo(() =>
    (custVeiData ?? []).map((r: any) => ({ name: r.produto_ajustado ?? "Outros", value: Number(r.net) || 0 }))
  , [custVeiData]);

  /* ─── ROA por Tipo de Cliente — descending anomes (most recent LEFT) ─── */
  const roaTipoChart = useMemo(() => {
    if (!roaTipo?.length) return [];
    const sorted = [...(roaTipo as any[])].sort((a, b) => b.anomes - a.anomes);
    const meses = [...new Set(sorted.map(r => r.anomes))];
    return meses.map(anomes => {
      const items = sorted.filter(r => r.anomes === anomes);
      const row: Record<string, any> = { mes: roaAnomesToLabel(anomes), anomes };
      items.forEach(r => { row[r.tipo_cliente] = Number(r.roa) || 0; });
      return row;
    });
  }, [roaTipo]);

  const roaTipoKeys = useMemo(() =>
    [...new Set((roaTipo ?? []).map((r: any) => r.tipo_cliente as string))].filter(Boolean)
  , [roaTipo]);

  /* ─── ROA por Faixa PL — descending anomes ─── */
  const roaFaixaChart = useMemo(() => {
    if (!roaFaixa?.length) return [];
    const sorted = [...(roaFaixa as any[])].sort((a, b) => b.anomes - a.anomes);
    const meses = [...new Set(sorted.map(r => r.anomes))];
    return meses.map(anomes => {
      const items = sorted.filter(r => r.anomes === anomes);
      const row: Record<string, any> = { mes: roaAnomesToLabel(anomes), anomes };
      items.forEach(r => { row[r.faixa_pl] = Number(r.roa) || 0; });
      return row;
    });
  }, [roaFaixa]);

  const roaFaixaKeys = useMemo(() =>
    [...new Set((roaFaixa ?? []).map((r: any) => r.faixa_pl as string))].filter(Boolean)
  , [roaFaixa]);

  /* ─── Vencimentos por Ano (stacked bar) ─── */
  const { vencAnoChart, vencAnoProducts } = useMemo(() => {
    if (!vencAnoData?.length) return { vencAnoChart: [], vencAnoProducts: [] as string[] };
    const products = [...new Set((vencAnoData as any[]).map(r => r.produto_ajustado as string))].filter(Boolean);
    const years = [...new Set((vencAnoData as any[]).map(r => Number(r.ano)))].sort();
    const chart = years.map(ano => {
      const row: Record<string, any> = { ano: String(ano) };
      let yearTotal = 0;
      products.forEach(p => {
        const val = (vencAnoData as any[])
          .filter(r => Number(r.ano) === ano && r.produto_ajustado === p)
          .reduce((sum, r) => sum + (Number(r.net) || 0), 0);
        row[p] = val;
        yearTotal += val;
      });
      row._total = yearTotal;
      return row;
    });
    return { vencAnoChart: chart, vencAnoProducts: products };
  }, [vencAnoData]);

  /* ─── Todos os Ativos rows ─── */
  const ativosRows = useMemo(() =>
    (todosAtivos ?? []).map((r: any) => ({
      documento: r.documento,
      conta: r.conta,
      ativo: r.ativo_ajustado,
      net: Number(r.net) || 0,
      indexador: r.indexador,
      veiculo: r.produto_ajustado,
      casa: r.casa,
      banker: r.banker,
      advisor: r.advisor,
      tipo: r.tipo_cliente,
    }))
  , [todosAtivos]);

  /* ─── Vencimentos Detalhado rows ─── */
  const vencRows = useMemo(() =>
    (tabelaVenc ?? []).map((r: any) => ({
      documento: r.documento,
      ativo: r.ativo_ajustado,
      net: Number(r.net) || 0,
      vencimento: r.vencimento,
      indexador: r.indexador,
      veiculo: r.produto_ajustado,
      banker: r.banker,
      advisor: r.advisor,
    }))
  , [tabelaVenc]);

  const vencFooter = useMemo(() => {
    const sumNet = vencRows.reduce((s, r) => s + r.net, 0);
    return { documento: "TOTAL", net: sumNet };
  }, [vencRows]);

  /* ─── ROA M0 rows + footer ─── */
  const roaM0Rows = useMemo(() =>
    (roaM0 ?? []).map((r: any) => ({
      documento: r.documento,
      roa: Number(r.roa) || 0,
      faixa_pl: r.faixa_pl,
    }))
  , [roaM0]);

  const roaM0Footer = useMemo(() => {
    if (!roaM0Rows.length) return undefined;
    const avg = roaM0Rows.reduce((s, r) => s + r.roa, 0) / roaM0Rows.length;
    return { documento: "TOTAL", roa: avg };
  }, [roaM0Rows]);

  /* ─── ROA custom X tick ─── */
  const Roa6MonthTick = ({ x, y, payload }: any) => {
    const anomes = payload?.value;
    // Find the anomes from chart data
    const dataPoint = roaTipoChart.find(d => d.mes === anomes) || roaFaixaChart.find(d => d.mes === anomes);
    const actualAnomes = dataPoint?.anomes;
    if (actualAnomes && !isJanOrJul(actualAnomes)) return null;
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={12} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={13}>
          {anomes}
        </text>
      </g>
    );
  };

  const anyLoading = l1 || l2 || l4 || l5 || l6 || l7 || l8 || l9 || l10 || l11;

  if (anyLoading) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* 1. Tabela CLIENTES */}
      <PbiCard title="Clientes">
        <SortableTable
          maxH={300}
          searchKeys={["primeiro_nome", "documento"]}
          columns={[
            { key: "documento", label: "Documento" },
            { key: "cod_cliente", label: "Conta" },
            { key: "d0", label: "Saldo D0", align: "right", fmt: fmtBRL },
            { key: "primeiro_nome", label: "1º Nome" },
            { key: "pl_tailor", label: "PL Tailor", align: "right", fmt: fmtBRL },
            { key: "pl_declarado_ajustado", label: "PL Declarado", align: "right", fmt: fmtBRL },
            { key: "sow_ajustado", label: "SoW", align: "right", fmt: fmtPct },
            { key: "endereco", label: "Endereço" },
            { key: "banker", label: "Financial Advisor" },
            { key: "advisor", label: "Advisor" },
            { key: "tipo_cliente", label: "Tipo de Cliente" },
          ]}
          rows={clienteRows}
          footerRow={clienteFooter}
        />
      </PbiCard>

      {/* 2. AuC por Faixa de PL */}
      <PbiCard title="AuC por Faixa de PL">
        <div className="flex items-center gap-4 px-2 py-1 text-[12px] text-[#111827] font-medium">
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#1a2e4a" }} /> NET</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#6bb8d4" }} /> PL Declarado Ajustado</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-0.5 rounded" style={{ backgroundColor: "#4a90d9" }} />● # Clientes</span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={aucFaixaChart} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="faixa" tick={{ fontSize: 13, fill: "#374151" }} />
            <YAxis yAxisId="left" tick={{ fontSize: 13, fill: "#374151" }} tickFormatter={(v) => `${Math.round(v / 1e6)} Mi`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 13, fill: "#374151" }} />
            <Tooltip content={<AucTooltip />} />
            <Bar yAxisId="left" dataKey="Net Em M" fill="#1a2e4a" name="NET" radius={[2, 2, 0, 0]}>
              <LabelList dataKey="Net Em M" position="top" formatter={(v: number) => `${Math.round(v / 1e6)} Mi`} style={{ fontSize: 12, fill: "#111827", fontWeight: 700 }} />
            </Bar>
            <Bar yAxisId="left" dataKey="PL Declarado" fill="#6bb8d4" name="PL Declarado Ajustado" radius={[2, 2, 0, 0]}>
              <LabelList dataKey="PL Declarado" position="top" formatter={(v: number) => `${Math.round(v / 1e6)} Mi`} style={{ fontSize: 12, fill: "#111827", fontWeight: 700 }} />
            </Bar>
            <Line yAxisId="right" type="monotone" dataKey="# Clientes" stroke="#4a90d9" strokeWidth={2} dot={{ r: 4, fill: "#4a90d9" }} name="# Clientes">
              <LabelList dataKey="# Clientes" position="top" style={{ fontSize: 12, fill: "#111827", fontWeight: 700 }} />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </PbiCard>

      {/* 3. Custódia: Indexador + Veículo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <PbiCard title="Custódia por Indexador">
          <DonutChart data={custIdxChart} title="Indexador" />
        </PbiCard>
        <PbiCard title="Custódia por Veículo">
          <DonutChart data={custVeiChart} title="Veículo" />
        </PbiCard>
      </div>

      {/* 4. Todos os Ativos */}
      <PbiCard title="Todos os Ativos">
        <SortableTable
          maxH={300}
          columns={[
            { key: "documento", label: "Documento" },
            { key: "conta", label: "Conta" },
            { key: "ativo", label: "Ativo Ajustado" },
            { key: "net", label: "NET", align: "right", fmt: fmtBRLint },
            { key: "indexador", label: "Indexador" },
            { key: "veiculo", label: "Veículo" },
            { key: "casa", label: "Casa" },
            { key: "banker", label: "Financial Advisor" },
            { key: "advisor", label: "Advisor" },
            { key: "tipo", label: "Tipo" },
          ]}
          rows={ativosRows}
        />
      </PbiCard>

      {/* 5. Vencimentos (stacked bar by year) */}
      <PbiCard title="Vencimentos">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={vencAnoChart} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="ano" tick={{ fontSize: 13, fill: "#374151" }} />
            <YAxis tick={{ fontSize: 13, fill: "#374151" }} tickFormatter={(v) => `${Math.round(v / 1e6)} Mi`} />
            <Tooltip content={<VencAnoTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#111827", fontWeight: 500 }} />
            {vencAnoProducts.map((p, i) => (
              <Bar key={p} dataKey={p} stackId="a" fill={VENC_PRODUCT_COLORS[p] || DONUT_COLORS[i % DONUT_COLORS.length]} name={p}>
                {i === vencAnoProducts.length - 1 && (
                  <LabelList dataKey="_total" position="top" formatter={(v: number) => `${Math.round(v / 1e6)}MI`} style={{ fontSize: 12, fill: "#111827", fontWeight: 700 }} />
                )}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </PbiCard>

      {/* 6. Vencimentos Detalhado */}
      <PbiCard title="Vencimentos">
        <SortableTable
          maxH={300}
          columns={[
            { key: "documento", label: "Documento" },
            { key: "ativo", label: "Ativo" },
            { key: "net", label: "NET", align: "right", fmt: fmtBRL },
            { key: "vencimento", label: "Vencimento", fmt: fmtDateShort },
            { key: "indexador", label: "Indexador" },
            { key: "veiculo", label: "Veículo" },
            { key: "banker", label: "Financial Advisor" },
            { key: "advisor", label: "Advisor" },
          ]}
          rows={vencRows}
          footerRow={vencFooter}
        />
      </PbiCard>

      {/* 7. ROA Anualizado Ponderado (por Tipo) + Tabela ROA M0 — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-2">
        <PbiCard title="ROA Anualizado Ponderado">
          <div className="flex items-center gap-4 px-2 py-1 text-[12px] text-[#111827] font-medium">
            {roaTipoKeys.map(k => (
              <span key={k} className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ROA_TIPO_COLORS[k] || "#999" }} />
                {k}
              </span>
            ))}
          </div>
          <div className="bg-white rounded p-1">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={roaTipoChart} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical horizontal={false} />
                {/* Vertical dashed grid at 6-month intervals */}
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" horizontal={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 13, fill: "#374151" }} interval={0}
                  tickFormatter={(val) => {
                    const dp = roaTipoChart.find(d => d.mes === val);
                    return dp && isJanOrJul(dp.anomes) ? val : "";
                  }}
                />
                <YAxis tick={{ fontSize: 13, fill: "#374151" }} tickFormatter={(v) => fmtPct(v)} />
                <Tooltip content={<RoaTooltip />} />
                {roaTipoKeys.map(k => (
                  <Line key={k} type="monotone" dataKey={k} stroke={ROA_TIPO_COLORS[k] || "#999"} strokeWidth={2} dot={{ r: 3 }} name={k}>
                    <LabelList dataKey={k} position="top" formatter={(v: number) => fmtPct(v)} style={{ fontSize: 13, fill: "#111827", fontWeight: 700 }} />
                  </Line>
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </PbiCard>

        <PbiCard title="ROA Anualizado Ponderado M0">
          <SortableTable
            maxH={300}
            columns={[
              { key: "documento", label: "Documento" },
              { key: "roa", label: "ROA Anualizado Ponderado", align: "right", fmt: fmtPct },
              { key: "faixa_pl", label: "Faixa PL" },
            ]}
            rows={roaM0Rows}
            footerRow={roaM0Footer}
          />
        </PbiCard>
      </div>

      {/* 8. ROA por Faixa de PL (full width) */}
      <PbiCard title="ROA Anualizado Ponderado">
        <div className="flex items-center gap-3 flex-wrap px-2 py-1 text-[12px] text-[#111827] font-medium">
          {roaFaixaKeys.map(k => (
            <span key={k} className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ROA_FAIXA_COLORS[k] || "#999" }} />
              {k}
            </span>
          ))}
        </div>
        <div className="bg-white rounded p-1">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={roaFaixaChart} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" horizontal={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 13, fill: "#374151" }} interval={0}
                tickFormatter={(val) => {
                  const dp = roaFaixaChart.find(d => d.mes === val);
                  return dp && isJanOrJul(dp.anomes) ? val : "";
                }}
              />
              <YAxis tick={{ fontSize: 13, fill: "#374151" }} tickFormatter={(v) => fmtPct(v)} />
              <Tooltip content={<RoaTooltip />} />
              {roaFaixaKeys.map(k => (
                <Line key={k} type="monotone" dataKey={k} stroke={ROA_FAIXA_COLORS[k] || "#999"} strokeWidth={2} dot={{ r: 3 }} name={k}>
                  <LabelList dataKey={k} position="top" formatter={(v: number) => fmtPct(v)} style={{ fontSize: 13, fill: "#111827", fontWeight: 700 }} />
                </Line>
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </PbiCard>

    </div>
  );
}
