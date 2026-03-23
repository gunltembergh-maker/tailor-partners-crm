import { useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Info, ChevronUp, ChevronDown } from "lucide-react";
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
} from "@/hooks/useQualitativoData";
import {
  BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const PBI = ["#4472C4","#ED7D31","#A5A5A5","#FFC000","#5B9BD5","#70AD47","#264478","#9B59B6","#636363","#D63B36"];

interface Props { filters: DashboardFilters; }

function fmtBRL(v: number) {
  if (!v && v !== 0) return "—";
  if (Math.abs(v) >= 1e9) return `R$ ${(v/1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6) return `R$ ${(v/1e6).toFixed(1)}M`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}
function fmtPct(v: number) { return `${((v || 0) * 100).toFixed(2)}%`; }
function fmtNum(v: number) { return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(v || 0); }

function PbiCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden ${className ?? ""}`}>
      <div className="px-3 py-1.5 border-b border-gray-100">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-700">{title}</p>
      </div>
      <div className="p-2">{children}</div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded px-2.5 py-1.5 shadow-md">
      <p className="text-[10px] font-semibold mb-0.5 text-[#1B2A3D]">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-[10px]" style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" && Math.abs(p.value) > 0.001 && Math.abs(p.value) < 1
            ? fmtPct(p.value)
            : typeof p.value === "number" && Math.abs(p.value) > 100
            ? fmtBRL(p.value)
            : p.value}
        </p>
      ))}
    </div>
  );
};

function DonutChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data} dataKey="value" nameKey="name"
          cx="50%" cy="50%" outerRadius={80} innerRadius={45}
          label={({ name, percent }) => percent > 0.04 ? `${name} ${(percent * 100).toFixed(0)}%` : ""}
          labelLine={{ strokeWidth: 0.5 }}
        >
          {data.map((_, i) => <Cell key={i} fill={PBI[i % PBI.length]} />)}
        </Pie>
        <Tooltip formatter={(v: number) => [fmtBRL(v), ""]} />
        <Legend wrapperStyle={{ fontSize: 9 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function SortableTable({ columns, rows, maxH = 280 }: {
  columns: { key: string; label: string; align?: "left"|"right"; fmt?: (v: any) => string }[];
  rows: Record<string, any>[];
  maxH?: number;
}) {
  const [sort, setSort] = useState<{ key: string; asc: boolean }>({ key: columns[0]?.key ?? "", asc: true });

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av ?? "").localeCompare(String(bv ?? ""));
      return sort.asc ? cmp : -cmp;
    });
  }, [rows, sort]);

  const toggle = (key: string) =>
    setSort(prev => prev.key === key ? { key, asc: !prev.asc } : { key, asc: false });

  return (
    <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: maxH }}>
      <Table>
        <TableHeader>
          <TableRow style={{ backgroundColor: "#1B2A3D" }}>
            {columns.map(c => (
              <TableHead
                key={c.key}
                className={`text-[10px] py-1 cursor-pointer select-none text-white ${c.align === "right" ? "text-right" : ""}`}
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
          {sorted.map((row, i) => (
            <TableRow key={i} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#F9FAFB" }}>
              {columns.map(c => (
                <TableCell key={c.key} className={`text-[10px] py-1 ${c.align === "right" ? "text-right" : ""}`}>
                  {c.fmt ? c.fmt(row[c.key]) : (row[c.key] ?? "—")}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function QualitativoTab({ filters }: Props) {
  const { data: custIdxData,  isLoading: l1 } = useCustodiaIndexador(filters);
  const { data: custVeiData,  isLoading: l2 } = useCustodiaVeiculo(filters);
  const { data: vencGraf,     isLoading: l3 } = useVencimentosGrafico(filters);
  const { data: todosAtivos,  isLoading: l4 } = useTodosAtivos(filters);
  const { data: tabelaVenc,   isLoading: l5 } = useTabelaVencimentos(filters);
  const { data: tabelaCli,    isLoading: l6 } = useTabelaClientes(filters);
  const { data: aucFaixaData, isLoading: l7 } = useAucFaixaPl(filters);
  const { data: roaTipo,      isLoading: l8 } = useRoaTipoCliente(filters);
  const { data: roaFaixa,     isLoading: l9 } = useRoaFaixaPl(filters);
  const { data: roaM0,        isLoading: l10 } = useRoaM0Tabela(filters);

  const loading = l1||l2||l3||l4||l5||l6||l7||l8||l9||l10;

  const custIdxChart = useMemo(() =>
    (custIdxData ?? []).map((r: any) => ({ name: r.indexador ?? "Outros", value: Number(r.net) || 0 }))
  , [custIdxData]);

  const custVeiChart = useMemo(() =>
    (custVeiData ?? []).map((r: any) => ({ name: r.produto_ajustado ?? "Outros", value: Number(r.net) || 0 }))
  , [custVeiData]);

  const vencGrafChart = useMemo(() =>
    (vencGraf ?? []).map((r: any) => ({ produto: r.produto_ajustado ?? "Outros", NET: Number(r.net) || 0 }))
  , [vencGraf]);

  const aucFaixaChart = useMemo(() =>
    (aucFaixaData ?? [])
      .sort((a: any, b: any) => (a.ordem_pl || 0) - (b.ordem_pl || 0))
      .map((r: any) => ({
        faixa: r.faixa_pl ?? "N/D",
        "Net Em M": Number(r.net_em_m) || 0,
        "PL Declarado": Number(r.pl_declarado) || 0,
        Clientes: Number(r.clientes) || 0,
      }))
  , [aucFaixaData]);

  const roaTipoChart = useMemo(() => {
    if (!roaTipo?.length) return { pf: [] as any[], pj: [] as any[] };
    const meses = [...new Set((roaTipo as any[]).map(r => r.anomes_nome))].sort();
    const pf = meses.map(m => {
      const r = (roaTipo as any[]).find(d => d.anomes_nome === m && d.tipo_cliente === "PESSOA FÍSICA");
      return { mes: m, ROA: Number(r?.roa) || 0 };
    });
    const pj = meses.map(m => {
      const r = (roaTipo as any[]).find(d => d.anomes_nome === m && d.tipo_cliente === "PESSOA JURÍDICA");
      return { mes: m, ROA: Number(r?.roa) || 0 };
    });
    return { pf, pj };
  }, [roaTipo]);

  const roaFaixaChart = useMemo(() => {
    if (!roaFaixa?.length) return [];
    const meses = [...new Set((roaFaixa as any[]).map(r => r.anomes_nome))].sort();
    const faixas = [...new Set((roaFaixa as any[]).map(r => r.faixa_pl))];
    return meses.map(m => {
      const row: Record<string, any> = { mes: m };
      faixas.forEach(f => {
        const r = (roaFaixa as any[]).find(d => d.anomes_nome === m && d.faixa_pl === f);
        row[f ?? "N/D"] = Number(r?.roa) || 0;
      });
      return row;
    });
  }, [roaFaixa]);

  const roaFaixaKeys = useMemo(() =>
    [...new Set((roaFaixa ?? []).map((r: any) => r.faixa_pl ?? "N/D"))]
  , [roaFaixa]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 bg-white rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* Custódia */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <PbiCard title="Custódia por Indexador">
          <DonutChart data={custIdxChart} />
        </PbiCard>
        <PbiCard title="Custódia por Veículo">
          <DonutChart data={custVeiChart} />
        </PbiCard>
      </div>

      {/* AuC por Faixa PL */}
      <PbiCard title="AuC por Faixa de PL">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={aucFaixaChart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="faixa" tick={{ fontSize: 10, fill: "#6B7280" }} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#6B7280" }} tickFormatter={(v) => `${(v/1e6).toFixed(0)}M`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#6B7280" }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 9 }} />
            <Bar yAxisId="left" dataKey="Net Em M" fill={PBI[0]} name="Net Em M" radius={[2,2,0,0]} />
            <Bar yAxisId="left" dataKey="PL Declarado" fill={PBI[1]} name="PL Declarado" radius={[2,2,0,0]} />
            <Line yAxisId="right" type="monotone" dataKey="Clientes" stroke={PBI[3]} strokeWidth={2} dot={{ r: 3 }} name="Clientes" />
          </ComposedChart>
        </ResponsiveContainer>
      </PbiCard>

      {/* Tabela Clientes */}
      <PbiCard title="Clientes">
        <SortableTable
          maxH={300}
          columns={[
            { key: "cod_cliente",          label: "Cód" },
            { key: "primeiro_nome",        label: "Nome" },
            { key: "documento",            label: "Documento" },
            { key: "banker",               label: "Banker" },
            { key: "advisor",              label: "Advisor" },
            { key: "tipo_cliente",         label: "Tipo" },
            { key: "pl_tailor",            label: "PL Tailor",  align: "right", fmt: fmtBRL },
            { key: "pl_declarado_ajustado",label: "PL Decl.",   align: "right", fmt: fmtBRL },
            { key: "sow_ajustado",         label: "SoW",        align: "right", fmt: fmtPct },
            { key: "endereco",             label: "Cidade" },
          ]}
          rows={(tabelaCli ?? []).map((r: any) => ({
            cod_cliente: r.cod_cliente ?? r.codigo_cliente,
            primeiro_nome: r.primeiro_nome ?? r.nome_cliente,
            documento: r.documento,
            banker: r.banker,
            advisor: r.advisor ?? r.assessor,
            tipo_cliente: r.tipo_cliente ?? r.canal,
            pl_tailor: Number(r.pl_tailor) || 0,
            pl_declarado_ajustado: Number(r.pl_declarado_ajustado) || 0,
            sow_ajustado: Number(r.sow_ajustado) || 0,
            endereco: r.endereco ?? r.endereco_ajustado,
          }))}
        />
      </PbiCard>

      {/* Vencimentos */}
      <PbiCard title="Vencimentos por Produto">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={vencGrafChart} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="produto" tick={{ fontSize: 9, fill: "#6B7280" }} angle={-30} textAnchor="end" />
            <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} tickFormatter={(v) => `${(v/1e6).toFixed(0)}M`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="NET" fill={PBI[0]} radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </PbiCard>

      <PbiCard title="Vencimentos — Detalhado">
        <SortableTable
          maxH={260}
          columns={[
            { key: "documento",  label: "Documento" },
            { key: "ativo",      label: "Ativo" },
            { key: "produto",    label: "Produto" },
            { key: "indexador",  label: "Indexador" },
            { key: "vencimento", label: "Vencimento" },
            { key: "net",        label: "NET",       align: "right", fmt: fmtBRL },
            { key: "banker",     label: "Banker" },
            { key: "advisor",    label: "Advisor" },
            { key: "finder",     label: "Finder" },
            { key: "casa",       label: "Casa" },
          ]}
          rows={(tabelaVenc ?? []).map((r: any) => ({
            documento: r.documento,
            ativo: r.ativo_ajustado,
            produto: r.produto_ajustado,
            indexador: r.indexador,
            vencimento: r.vencimento,
            net: Number(r.net) || 0,
            banker: r.banker,
            advisor: r.advisor,
            finder: r.finder,
            casa: r.casa,
          }))}
        />
      </PbiCard>

      {/* Todos os Ativos */}
      <PbiCard title="Todos os Ativos">
        <SortableTable
          maxH={320}
          columns={[
            { key: "documento",  label: "Documento" },
            { key: "conta",      label: "Conta" },
            { key: "ativo",      label: "Ativo" },
            { key: "produto",    label: "Produto" },
            { key: "indexador",  label: "Indexador" },
            { key: "net",        label: "NET",       align: "right", fmt: fmtBRL },
            { key: "banker",     label: "Banker" },
            { key: "advisor",    label: "Advisor" },
            { key: "finder",     label: "Finder" },
            { key: "tipo",       label: "Tipo" },
            { key: "casa",       label: "Casa" },
            { key: "vencimento", label: "Vencimento" },
          ]}
          rows={(todosAtivos ?? []).map((r: any) => ({
            documento: r.documento,
            conta: r.conta,
            ativo: r.ativo_ajustado,
            produto: r.produto_ajustado,
            indexador: r.indexador,
            net: Number(r.net) || 0,
            banker: r.banker,
            advisor: r.advisor,
            finder: r.finder,
            tipo: r.tipo_cliente,
            casa: r.casa,
            vencimento: r.vencimento ?? "—",
          }))}
        />
      </PbiCard>

      {/* ROA por Tipo de Cliente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <PbiCard title="ROA Anualizado Ponderado — Pessoa Física">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={roaTipoChart.pf} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="mes" tick={{ fontSize: 9, fill: "#6B7280" }} />
              <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} tickFormatter={fmtPct} />
              <Tooltip formatter={(v: number) => [fmtPct(v), "ROA"]} />
              <Line type="monotone" dataKey="ROA" stroke={PBI[0]} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </PbiCard>
        <PbiCard title="ROA Anualizado Ponderado — Pessoa Jurídica">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={roaTipoChart.pj} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="mes" tick={{ fontSize: 9, fill: "#6B7280" }} />
              <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} tickFormatter={fmtPct} />
              <Tooltip formatter={(v: number) => [fmtPct(v), "ROA"]} />
              <Line type="monotone" dataKey="ROA" stroke={PBI[1]} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </PbiCard>
      </div>

      {/* ROA por Faixa PL */}
      <PbiCard title="ROA Anualizado Ponderado — Por Faixa PL">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={roaFaixaChart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="mes" tick={{ fontSize: 9, fill: "#6B7280" }} />
            <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} tickFormatter={fmtPct} />
            <Tooltip formatter={(v: number) => [fmtPct(v), ""]} />
            <Legend wrapperStyle={{ fontSize: 9 }} />
            {roaFaixaKeys.map((faixa, i) => (
              <Line key={faixa} type="monotone" dataKey={faixa}
                stroke={PBI[i % PBI.length]} strokeWidth={1.5} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </PbiCard>

      {/* ROA M0 tabela */}
      <PbiCard title="ROA Anualizado Ponderado M0">
        <SortableTable
          maxH={260}
          columns={[
            { key: "faixa_pl",  label: "Faixa PL" },
            { key: "documento", label: "Documento" },
            { key: "roa",       label: "ROA", align: "right", fmt: fmtPct },
          ]}
          rows={(roaM0 ?? []).map((r: any) => ({
            faixa_pl: r.faixa_pl,
            documento: r.documento,
            roa: Number(r.roa) || 0,
          }))}
        />
      </PbiCard>

      {/* NPS placeholder */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex items-center gap-3">
        <Info className="h-5 w-5 text-gray-400" />
        <div>
          <p className="text-[11px] font-semibold text-gray-700">NPS</p>
          <p className="text-[10px] text-gray-500">
            Base de NPS não importada. Importe para visualizar métricas de satisfação.
          </p>
        </div>
      </div>

    </div>
  );
}
