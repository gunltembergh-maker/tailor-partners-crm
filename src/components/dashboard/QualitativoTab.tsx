import { useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ChevronUp, ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { DashboardFilters } from "@/hooks/useDashboardFilters";
import {
  useCustodiaIndexador,
  useCustodiaVeiculo,
  useVencimentosGrafico,
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
const formatPct = (v: number) => `${v.toFixed(2).replace(".", ",")}%`;
const formatMi = (v: number) => `R$ ${(v / 1e6).toFixed(2).replace(".", ",")} Mi`;
const formatBRL = (v: number) =>
  v == null ? "—" : `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatD0 = (v: number) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (v: string | null) => {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString("pt-BR"); } catch { return v; }
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
  "Título Público": "#f39c12",
  "Letra Financeira": "#8e44ad",
  "Nota Estruturada": "#e8a838",
  "Produto Estruturado": "#16a085",
  "Tesouro Direto": "#3498db",
  "Previdência": "#1abc9c",
  "Fundos": "#2980b9",
  "Renda Variável": "#e74c3c",
};

const FAIXA_ORDER = ["Inativo", "-300k", "300k-500k", "500k-1M", "1-3M", "3-5M", "5-10M", "+10M"];

/* ─── Sub-components ─── */

interface Props { filters: DashboardFilters; }

function PbiCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-lg shadow-sm overflow-hidden ${className ?? ""}`}>
      <div className="px-3 py-1.5 border-b border-border">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground">{title}</p>
      </div>
      <div className="p-2">{children}</div>
    </div>
  );
}

/* ─── Donut with external labels ─── */
function DonutChart({ data, title }: { data: { name: string; value: number }[]; title: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const renderLabel = ({ cx, cy, midAngle, outerRadius, name, value, percent }: any) => {
    if (percent < 0.03) return null;
    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const mx = cx + (outerRadius + 10) * cos;
    const my = cy + (outerRadius + 10) * sin;
    const ex = cx + (outerRadius + 30) * cos;
    const ey = cy + (outerRadius + 30) * sin;
    const textAnchor = cos >= 0 ? "start" : "end";
    return (
      <g>
        <path d={`M${cx + outerRadius * cos},${cy + outerRadius * sin}L${mx},${my}L${ex},${ey}`} stroke="#999" fill="none" strokeWidth={0.5} />
        <text x={ex + (cos >= 0 ? 4 : -4)} y={ey} textAnchor={textAnchor} fill="#333" fontSize={9}>
          {name} {formatMi(value)} ({(percent * 100).toFixed(0)}%)
        </text>
      </g>
    );
  };
  return (
    <div className="flex items-center">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="45%" cy="50%" outerRadius={85} innerRadius={50}
              label={renderLabel} labelLine={false} isAnimationActive={false}>
              {data.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => [formatMi(v), ""]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-40 space-y-1 pr-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[9px]">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="truncate text-foreground">{d.name}</span>
            <span className="ml-auto text-muted-foreground whitespace-nowrap">{formatMi(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── SortableTable with pagination, search, footer ─── */
function SortableTable({ columns, rows, maxH = 400, pageSize = 50, searchKeys, footerRow }: {
  columns: { key: string; label: string; align?: "left" | "right"; fmt?: (v: any) => string }[];
  rows: Record<string, any>[];
  maxH?: number;
  pageSize?: number;
  searchKeys?: string[];
  footerRow?: Record<string, any>;
}) {
  const [sort, setSort] = useState<{ key: string; asc: boolean }>({ key: columns[0]?.key ?? "", asc: true });
  const [page, setPage] = useState(1);
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

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggle = (key: string) => {
    setSort(prev => prev.key === key ? { key, asc: !prev.asc } : { key, asc: false });
    setPage(1);
  };

  return (
    <div className="space-y-1">
      {searchKeys?.length ? (
        <div className="relative w-60">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="h-7 pl-7 text-[10px]"
            placeholder="Buscar..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      ) : null}
      <div className="overflow-x-auto" style={{ maxHeight: maxH }}>
        <Table>
          <TableHeader>
            <TableRow style={{ backgroundColor: "#1B2A3D" }}>
              {columns.map(c => (
                <TableHead
                  key={c.key}
                  className={`text-[10px] py-1 cursor-pointer select-none text-white whitespace-nowrap ${c.align === "right" ? "text-right" : ""}`}
                  style={{ minWidth: 150 }}
                  onClick={() => toggle(c.key)}
                >
                  <span className="inline-flex items-center gap-0.5">
                    {c.label}
                    {sort.key === c.key
                      ? sort.asc ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />
                      : null}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((row, i) => (
              <TableRow key={i} style={{ backgroundColor: i % 2 === 0 ? "var(--card)" : "var(--muted)" }}>
                {columns.map(c => (
                  <TableCell key={c.key} className={`text-[10px] py-1 whitespace-nowrap ${c.align === "right" ? "text-right" : ""}`}
                    style={{ minWidth: 150 }}>
                    {c.fmt ? c.fmt(row[c.key]) : (row[c.key] ?? "—")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          {footerRow && (
            <TableFooter>
              <TableRow className="font-semibold bg-muted/70">
                {columns.map(c => (
                  <TableCell key={c.key} className={`text-[10px] py-1 ${c.align === "right" ? "text-right" : ""}`}
                    style={{ minWidth: 150 }}>
                    {footerRow[c.key] != null ? (c.fmt ? c.fmt(footerRow[c.key]) : footerRow[c.key]) : ""}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
          <span>{sorted.length} registros — pág. {page}/{totalPages}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Próximo</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Custom tooltips ─── */
const RoaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded px-2.5 py-1.5 shadow-md text-[10px]">
      <p className="font-semibold text-foreground mb-0.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {formatPct(Number(p.value))}</p>
      ))}
    </div>
  );
};

const AucTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded px-2.5 py-1.5 shadow-md text-[10px]">
      <p className="font-semibold text-foreground mb-0.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.name === "# Clientes" ? p.value : formatMi(Number(p.value))}
        </p>
      ))}
    </div>
  );
};

const VencAnoTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded px-2.5 py-1.5 shadow-md text-[10px]">
      <p className="font-semibold text-foreground mb-0.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {formatMi(Number(p.value))}</p>
      ))}
    </div>
  );
};

/* ─── Main Component ─── */
export function QualitativoTab({ filters }: Props) {
  const { data: custIdxData, isLoading: l1 } = useCustodiaIndexador(filters);
  const { data: custVeiData, isLoading: l2 } = useCustodiaVeiculo(filters);
  const { data: vencGraf, isLoading: l3 } = useVencimentosGrafico(filters);
  const { data: todosAtivos, isLoading: l4 } = useTodosAtivos(filters);
  const { data: tabelaVenc, isLoading: l5 } = useTabelaVencimentos(filters);
  const { data: tabelaCli, isLoading: l6 } = useTabelaClientes(filters);
  const { data: aucFaixaData, isLoading: l7 } = useAucFaixaPl(filters);
  const { data: roaTipo, isLoading: l8 } = useRoaTipoCliente(filters);
  const { data: roaFaixa, isLoading: l9 } = useRoaFaixaPl(filters);
  const { data: roaM0, isLoading: l10 } = useRoaM0Tabela(filters);
  const { data: vencAnoData, isLoading: l11 } = useVencimentosPorAno(filters);

  const loading = l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8 || l9 || l10 || l11;

  /* ─── Tabela Clientes data ─── */
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
        "Net Em M": Number(r.net_em_m) || 0,
        "PL Declarado": Number(r.pl_declarado) || 0,
        "# Clientes": Number(r.qtd_clientes) || 0,
      }))
  , [aucFaixaData]);

  /* ─── Custódia donuts ─── */
  const custIdxChart = useMemo(() =>
    (custIdxData ?? []).map((r: any) => ({ name: r.indexador ?? "Outros", value: Number(r.total) || 0 }))
  , [custIdxData]);

  const custVeiChart = useMemo(() =>
    (custVeiData ?? []).map((r: any) => ({ name: r.produto_ajustado ?? "Outros", value: Number(r.total) || 0 }))
  , [custVeiData]);

  /* ─── ROA por Tipo de Cliente (single chart, 2 lines) ─── */
  const roaTipoChart = useMemo(() => {
    if (!roaTipo?.length) return [];
    const sorted = [...(roaTipo as any[])].sort((a, b) => a.anomes - b.anomes);
    const meses = [...new Set(sorted.map(r => r.anomes))];
    return meses.map(anomes => {
      const items = sorted.filter(r => r.anomes === anomes);
      const row: Record<string, any> = { mes: items[0]?.anomes_nome ?? String(anomes) };
      items.forEach(r => { row[r.tipo_cliente] = Number(r.roa) || 0; });
      return row;
    });
  }, [roaTipo]);

  const roaTipoKeys = useMemo(() =>
    [...new Set((roaTipo ?? []).map((r: any) => r.tipo_cliente as string))].filter(Boolean)
  , [roaTipo]);

  /* ─── ROA por Faixa PL (single chart, multi lines) ─── */
  const roaFaixaChart = useMemo(() => {
    if (!roaFaixa?.length) return [];
    const sorted = [...(roaFaixa as any[])].sort((a, b) => a.anomes - b.anomes);
    const meses = [...new Set(sorted.map(r => r.anomes))];
    return meses.map(anomes => {
      const items = sorted.filter(r => r.anomes === anomes);
      const row: Record<string, any> = { mes: items[0]?.anomes_nome ?? String(anomes) };
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
        const match = (vencAnoData as any[]).find(r => Number(r.ano) === ano && r.produto_ajustado === p);
        const val = Number(match?.total) || 0;
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
      finder: r.finder,
      tipo: r.tipo_cliente,
      vencimento: r.vencimento,
    }))
  , [todosAtivos]);

  /* ─── Vencimentos Detalhado rows ─── */
  const vencRows = useMemo(() =>
    (tabelaVenc ?? []).map((r: any) => ({
      produto: r.produto_ajustado,
      ativo: r.ativo_ajustado,
      indexador: r.indexador,
      casa: r.casa,
      banker: r.banker,
      advisor: r.advisor,
      finder: r.finder,
      documento: r.documento,
      vencimento: r.vencimento,
      net: Number(r.net) || 0,
    }))
  , [tabelaVenc]);

  if (loading) {
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
          maxH={400}
          pageSize={50}
          searchKeys={["primeiro_nome", "documento"]}
          columns={[
            { key: "documento", label: "Documento" },
            { key: "cod_cliente", label: "Conta" },
            { key: "d0", label: "Saldo D0", align: "right", fmt: formatD0 },
            { key: "primeiro_nome", label: "1º Nome" },
            { key: "pl_tailor", label: "PL Tailor", align: "right", fmt: formatBRL },
            { key: "pl_declarado_ajustado", label: "PL Declarado", align: "right", fmt: formatBRL },
            { key: "sow_ajustado", label: "SoW", align: "right", fmt: formatPct },
            { key: "endereco", label: "Endereço" },
            { key: "banker", label: "Banker" },
            { key: "advisor", label: "Advisor" },
            { key: "tipo_cliente", label: "Tipo de Cliente" },
          ]}
          rows={clienteRows}
          footerRow={clienteFooter}
        />
      </PbiCard>

      {/* 2. AuC por Faixa de PL */}
      <PbiCard title="AuC por Faixa de PL">
        <div className="flex items-center gap-4 px-2 py-1 text-[9px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#1a2e4a" }} /> NET</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#6bb8d4" }} /> PL Declarado Ajustado</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-0.5 rounded" style={{ backgroundColor: "#4a90d9" }} />● # Clientes</span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={aucFaixaChart} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="faixa" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={(v) => formatMi(v)} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
            <Tooltip content={<AucTooltip />} />
            <Bar yAxisId="left" dataKey="Net Em M" fill="#1a2e4a" name="NET" radius={[2, 2, 0, 0]}>
              <LabelList dataKey="Net Em M" position="top" formatter={(v: number) => formatMi(v)} style={{ fontSize: 8, fill: "#1a2e4a" }} />
            </Bar>
            <Bar yAxisId="left" dataKey="PL Declarado" fill="#6bb8d4" name="PL Declarado Ajustado" radius={[2, 2, 0, 0]}>
              <LabelList dataKey="PL Declarado" position="top" formatter={(v: number) => formatMi(v)} style={{ fontSize: 8, fill: "#6bb8d4" }} />
            </Bar>
            <Line yAxisId="right" type="monotone" dataKey="# Clientes" stroke="#4a90d9" strokeWidth={2} dot={{ r: 4, fill: "#4a90d9" }} name="# Clientes">
              <LabelList dataKey="# Clientes" position="top" style={{ fontSize: 9, fill: "#4a90d9" }} />
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

      {/* 4. ROA por Tipo de Cliente */}
      <PbiCard title="ROA Anualizado Ponderado">
        <div className="flex items-center gap-4 px-2 py-1 text-[9px] text-muted-foreground">
          {roaTipoKeys.map(k => (
            <span key={k} className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ROA_TIPO_COLORS[k] || "#999" }} />
              {k}
            </span>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={roaTipoChart} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical />
            <XAxis dataKey="mes" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatPct(v)} />
            <Tooltip content={<RoaTooltip />} />
            {roaTipoKeys.map(k => (
              <Line key={k} type="monotone" dataKey={k} stroke={ROA_TIPO_COLORS[k] || "#999"} strokeWidth={2} dot={{ r: 3 }} name={k}>
                <LabelList dataKey={k} position="top" formatter={(v: number) => formatPct(v)} style={{ fontSize: 8, fill: ROA_TIPO_COLORS[k] || "#999" }} />
              </Line>
            ))}
          </LineChart>
        </ResponsiveContainer>
      </PbiCard>

      {/* 5. ROA por Faixa de PL */}
      <PbiCard title="ROA Anualizado Ponderado">
        <div className="flex items-center gap-3 flex-wrap px-2 py-1 text-[9px] text-muted-foreground">
          {roaFaixaKeys.map(k => (
            <span key={k} className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ROA_FAIXA_COLORS[k] || "#999" }} />
              {k}
            </span>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={roaFaixaChart} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical />
            <XAxis dataKey="mes" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatPct(v)} />
            <Tooltip content={<RoaTooltip />} />
            {roaFaixaKeys.map(k => (
              <Line key={k} type="monotone" dataKey={k} stroke={ROA_FAIXA_COLORS[k] || "#999"} strokeWidth={2} dot={{ r: 3 }} name={k}>
                <LabelList dataKey={k} position="top" formatter={(v: number) => formatPct(v)} style={{ fontSize: 7, fill: ROA_FAIXA_COLORS[k] || "#999" }} />
              </Line>
            ))}
          </LineChart>
        </ResponsiveContainer>
      </PbiCard>

      {/* 6. ROA M0 Tabela */}
      <PbiCard title="ROA Anualizado Ponderado M0">
        <SortableTable
          maxH={300}
          columns={[
            { key: "documento", label: "Documento" },
            { key: "faixa_pl", label: "Faixa PL" },
            { key: "roa", label: "ROA", align: "right", fmt: formatPct },
          ]}
          rows={(roaM0 ?? []).map((r: any) => ({
            documento: r.documento,
            faixa_pl: r.faixa_pl,
            roa: Number(r.roa) || 0,
          }))}
        />
      </PbiCard>

      {/* 7. Vencimentos por Ano (stacked) */}
      <PbiCard title="Vencimentos por Ano">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={vencAnoChart} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="ano" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatMi(v)} />
            <Tooltip content={<VencAnoTooltip />} />
            <Legend wrapperStyle={{ fontSize: 9 }} />
            {vencAnoProducts.map((p, i) => (
              <Bar key={p} dataKey={p} stackId="a" fill={VENC_PRODUCT_COLORS[p] || DONUT_COLORS[i % DONUT_COLORS.length]} name={p}>
                {i === vencAnoProducts.length - 1 && (
                  <LabelList dataKey="_total" position="top" formatter={(v: number) => formatMi(v)} style={{ fontSize: 8, fill: "#333" }} />
                )}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </PbiCard>

      {/* 8. Todos os Ativos */}
      <PbiCard title="Todos os Ativos">
        <SortableTable
          maxH={400}
          columns={[
            { key: "documento", label: "Documento" },
            { key: "conta", label: "Conta" },
            { key: "ativo", label: "Ativo Ajustado" },
            { key: "net", label: "NET", align: "right", fmt: formatBRL },
            { key: "indexador", label: "Indexador" },
            { key: "veiculo", label: "Veículo" },
            { key: "casa", label: "Casa" },
            { key: "banker", label: "Banker" },
            { key: "advisor", label: "Advisor" },
            { key: "finder", label: "Finder" },
            { key: "tipo", label: "Tipo" },
            { key: "vencimento", label: "Vencimento", fmt: formatDate },
          ]}
          rows={ativosRows}
        />
      </PbiCard>

      {/* 9. Vencimentos Detalhado */}
      <PbiCard title="Vencimentos — Detalhado">
        <SortableTable
          maxH={400}
          columns={[
            { key: "produto", label: "Produto" },
            { key: "ativo", label: "Ativo" },
            { key: "indexador", label: "Indexador" },
            { key: "casa", label: "Casa" },
            { key: "banker", label: "Banker" },
            { key: "advisor", label: "Advisor" },
            { key: "finder", label: "Finder" },
            { key: "documento", label: "Documento" },
            { key: "vencimento", label: "Vencimento", fmt: formatDate },
            { key: "net", label: "NET", align: "right", fmt: formatBRL },
          ]}
          rows={vencRows}
        />
      </PbiCard>

    </div>
  );
}
