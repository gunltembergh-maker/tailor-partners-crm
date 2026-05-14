import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ChevronDown, ChevronRight, FilterX, HelpCircle, Plus, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid, Legend, LabelList,
} from "recharts";

import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ReceitaCaixaOnboardingModal } from "@/components/relatorios/ReceitaCaixaOnboardingModal";
import { cn } from "@/lib/utils";

// ── Helpers ─────────────────────────────────────────────────────────
const fmtBRL = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const fmtBRLShort = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace(".", ",")} Mi`;
  if (abs >= 1_000) return `R$ ${(n / 1_000).toFixed(0)} Mil`;
  return fmtBRL(n);
};

const CAT_COLORS: Record<string, string> = {
  Assessoria: "#082537",
  Câmbio: "#9B6B4A",
  Consórcio: "#4caf50",
  Lavoro: "#1976d2",
  "Wealth Solutions": "#7e57c2",
  "Seguro de Vida": "#ec407a",
  Offshore: "#ff9800",
  Outros: "#90a4ae",
};
const colorFor = (cat: string) => CAT_COLORS[cat] || "#90a4ae";

// Compute current anomes (today)
const todayAnomes = (() => {
  const d = new Date();
  return d.getFullYear() * 100 + (d.getMonth() + 1);
})();

// ── Types ───────────────────────────────────────────────────────────
type FiltrosResp = {
  anomes_disponiveis: { anomes: number; label: string }[];
  bankers: string[];
  finders: string[];
  categorias: string[];
  subcategorias: string[];
  advisors: string[];
};

type KPIs = {
  total_mes: number;
  total_mes_anterior: number;
  variacao_pct: number | null;
  n_clientes_unicos: number;
  anomes_label: string;
  anomes_anterior_label: string;
};

// ── Multi-select dropdown ───────────────────────────────────────────
function MultiSelect({
  label, options, selected, onChange,
}: { label: string; options: string[]; selected: string[]; onChange: (s: string[]) => void }) {
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between bg-white text-[#082537] hover:bg-white/90 h-9">
          <span className="truncate text-xs">
            {label} {selected.length > 0 && <Badge className="ml-1 bg-[#9B6B4A] text-white">{selected.length}</Badge>}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 max-h-80 overflow-auto" align="start">
        <div className="space-y-1">
          {options.length === 0 && <p className="text-xs text-muted-foreground">Sem opções</p>}
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted cursor-pointer">
              <Checkbox checked={selected.includes(opt)} onCheckedChange={() => toggle(opt)} />
              <span className="text-xs">{opt}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Page ─────────────────────────────────────────────────────────────
export default function ReceitaCaixa() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [selectedAnomes, setSelectedAnomes] = useState<number | null>(null);
  const [bankers, setBankers] = useState<string[]>([]);
  const [finders, setFinders] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [subcategorias, setSubcategorias] = useState<string[]>([]);
  const [advisors, setAdvisors] = useState<string[]>([]);
  const [tiposPessoa, setTiposPessoa] = useState<string[]>(["PF", "PJ"]);

  // Onboarding key per user
  useEffect(() => {
    if (!user?.id) return;
    const key = `dashboard_receita_onboarding_${user.id}`;
    if (!localStorage.getItem(key)) {
      setShowOnboarding(true);
      localStorage.setItem(key, "1");
    }
  }, [user?.id]);

  // Filtros disponíveis
  const filtrosQ = useQuery({
    queryKey: ["receita-caixa-filtros", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_receita_caixa_filtros");
      if (error) throw error;
      return data as unknown as FiltrosResp;
    },
    enabled: !!user?.id,
  });

  // Default selectedAnomes ao mais recente
  useEffect(() => {
    if (selectedAnomes != null) return;
    const list = filtrosQ.data?.anomes_disponiveis;
    if (list && list.length > 0) setSelectedAnomes(list[0].anomes);
  }, [filtrosQ.data, selectedAnomes]);

  const rpcParams = useMemo(() => {
    const tipoParam = tiposPessoa.length === 0 || tiposPessoa.length === 2 ? null : tiposPessoa;
    return {
      p_anomes: selectedAnomes,
      p_banker: bankers.length ? bankers : null,
      p_finder: finders.length ? finders : null,
      p_categoria: categorias.length ? categorias : null,
      p_subcategoria: subcategorias.length ? subcategorias : null,
      p_advisor: advisors.length ? advisors : null,
      p_tipo_pessoa: tipoParam,
    };
  }, [selectedAnomes, bankers, finders, categorias, subcategorias, advisors, tiposPessoa]);

  const enabled = !!selectedAnomes;

  const kpisQ = useQuery({
    queryKey: ["receita-caixa-kpis", rpcParams],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_receita_caixa_kpis", rpcParams as any);
      if (error) throw error;
      return (data as KPIs[])[0];
    },
    enabled,
  });

  const catQ = useQuery({
    queryKey: ["receita-caixa-cat", rpcParams],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_receita_caixa_por_categoria", rpcParams as any);
      if (error) throw error;
      return data as { categoria: string; total: number }[];
    },
    enabled,
  });

  const subQ = useQuery({
    queryKey: ["receita-caixa-sub", rpcParams],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_receita_caixa_por_subcategoria", rpcParams as any);
      if (error) throw error;
      return data as { categoria: string; subcategoria: string; total_subcategoria: number; total_categoria: number }[];
    },
    enabled,
  });

  const serieQ = useQuery({
    queryKey: ["receita-caixa-serie", rpcParams],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_receita_caixa_serie_temporal", rpcParams as any);
      if (error) throw error;
      return data as { anomes: number; anomes_label: string; categoria: string; total: number }[];
    },
    enabled,
  });

  const matrizQ = useQuery({
    queryKey: ["receita-caixa-matriz", rpcParams],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_receita_caixa_por_assessor", rpcParams as any);
      if (error) throw error;
      return data as { banker: string; categoria: string; total: number }[];
    },
    enabled,
  });

  const advisorQ = useQuery({
    queryKey: ["receita-caixa-advisor", rpcParams],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_receita_caixa_advisor_xp", rpcParams as any);
      if (error) throw error;
      return data as { advisor: string; total: number }[];
    },
    enabled,
  });

  // erros
  useEffect(() => {
    [kpisQ.error, catQ.error, subQ.error, serieQ.error, matrizQ.error, advisorQ.error].forEach((e) => {
      if (e) toast.error(`Erro ao carregar dados: ${(e as Error).message}`);
    });
  }, [kpisQ.error, catQ.error, subQ.error, serieQ.error, matrizQ.error, advisorQ.error]);

  // Pivot subcategoria
  const subPivot = useMemo(() => {
    const map = new Map<string, { total: number; subs: { sub: string; total: number }[] }>();
    (subQ.data || []).forEach((r) => {
      if (!map.has(r.categoria)) map.set(r.categoria, { total: r.total_categoria, subs: [] });
      map.get(r.categoria)!.subs.push({ sub: r.subcategoria, total: r.total_subcategoria });
    });
    return Array.from(map.entries()).map(([cat, v]) => ({ cat, ...v }));
  }, [subQ.data]);

  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const toggleCat = (c: string) => {
    setExpandedCats((s) => {
      const n = new Set(s);
      n.has(c) ? n.delete(c) : n.add(c);
      return n;
    });
  };

  // Série temporal: pivotar por mês/categoria
  const seriePivot = useMemo(() => {
    const months = new Map<number, { anomes: number; label: string; [k: string]: any }>();
    (serieQ.data || []).forEach((r) => {
      if (!months.has(r.anomes)) months.set(r.anomes, { anomes: r.anomes, label: r.anomes_label });
      months.get(r.anomes)![r.categoria] = r.total;
    });
    return Array.from(months.values()).sort((a, b) => a.anomes - b.anomes);
  }, [serieQ.data]);

  const seriesCats = useMemo(() => {
    const set = new Set<string>();
    (serieQ.data || []).forEach((r) => set.add(r.categoria));
    return Array.from(set);
  }, [serieQ.data]);

  // Matriz Banker × Categoria
  const matriz = useMemo(() => {
    const cats = new Set<string>();
    const rows = new Map<string, Record<string, number>>();
    (matrizQ.data || []).forEach((r) => {
      cats.add(r.categoria);
      if (!rows.has(r.banker)) rows.set(r.banker, {});
      rows.get(r.banker)![r.categoria] = r.total;
    });
    const catList = Array.from(cats).sort();
    const bankerRows = Array.from(rows.entries()).map(([banker, vals]) => ({
      banker,
      vals,
      total: catList.reduce((acc, c) => acc + (vals[c] || 0), 0),
    })).sort((a, b) => b.total - a.total);
    const totals: Record<string, number> = {};
    catList.forEach((c) => { totals[c] = bankerRows.reduce((a, r) => a + (r.vals[c] || 0), 0); });
    const grand = bankerRows.reduce((a, r) => a + r.total, 0);
    return { catList, bankerRows, totals, grand };
  }, [matrizQ.data]);

  const handleClearFilters = () => {
    setBankers([]); setFinders([]); setCategorias([]); setSubcategorias([]); setAdvisors([]); setTiposPessoa(["PF", "PJ"]);
  };

  const isRetro = selectedAnomes != null && selectedAnomes !== todayAnomes && (filtrosQ.data?.anomes_disponiveis?.[0]?.anomes ?? 0) !== selectedAnomes;

  const variacaoIcon = (v: number | null) => {
    if (v == null) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (v > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (v < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };
  const variacaoColor = (v: number | null) => v == null ? "text-muted-foreground" : v > 0 ? "text-green-600" : v < 0 ? "text-red-600" : "text-muted-foreground";

  return (
    <AppLayout>
      <ReceitaCaixaOnboardingModal open={showOnboarding} onClose={() => setShowOnboarding(false)} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[#082537]">Receita Caixa</h1>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
          <div className="flex items-center gap-2 bg-[#082537] text-white px-3 py-1.5 rounded-lg">
            <Calendar className="h-4 w-4" />
            <Select
              value={selectedAnomes ? String(selectedAnomes) : ""}
              onValueChange={(v) => setSelectedAnomes(Number(v))}
            >
              <SelectTrigger className="bg-transparent border-0 text-white h-7 w-[140px] focus:ring-0">
                <SelectValue placeholder="Período…" />
              </SelectTrigger>
              <SelectContent>
                {(filtrosQ.data?.anomes_disponiveis || []).map((a) => (
                  <SelectItem key={a.anomes} value={String(a.anomes)}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isRetro && <Badge variant="outline" className="border-amber-500 text-amber-700">vista retroativa</Badge>}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowOnboarding(true)}>
          <HelpCircle className="h-4 w-4 mr-1" /> Ajuda
        </Button>
      </div>

      <div className="grid grid-cols-[220px_1fr] gap-4">
        {/* Sidebar filtros */}
        <aside className="bg-[#082537] text-white rounded-lg p-3 space-y-3 h-fit sticky top-20">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Filtros</h3>
            <Button variant="ghost" size="sm" className="h-7 text-white hover:bg-white/10" onClick={handleClearFilters}>
              <FilterX className="h-3 w-3 mr-1" /> Limpar
            </Button>
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider opacity-70">FA</label>
              <MultiSelect label="Selecionar" options={filtrosQ.data?.bankers || []} selected={bankers} onChange={setBankers} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider opacity-70">Finder</label>
              <MultiSelect label="Selecionar" options={filtrosQ.data?.finders || []} selected={finders} onChange={setFinders} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider opacity-70">Categoria</label>
              <MultiSelect label="Selecionar" options={filtrosQ.data?.categorias || []} selected={categorias} onChange={setCategorias} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider opacity-70">Subcategoria</label>
              <MultiSelect label="Selecionar" options={filtrosQ.data?.subcategorias || []} selected={subcategorias} onChange={setSubcategorias} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider opacity-70">Advisor</label>
              <MultiSelect label="Selecionar" options={filtrosQ.data?.advisors || []} selected={advisors} onChange={setAdvisors} />
            </div>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full bg-white text-[#082537] h-9">
                <Plus className="h-3 w-3 mr-1" /> Ações
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="start">
              <p className="text-xs font-semibold mb-2">Tipo de Pessoa</p>
              {["PF", "PJ"].map((t) => (
                <label key={t} className="flex items-center gap-2 py-1 cursor-pointer">
                  <Checkbox
                    checked={tiposPessoa.includes(t)}
                    onCheckedChange={(c) => setTiposPessoa(c ? Array.from(new Set([...tiposPessoa, t])) : tiposPessoa.filter((x) => x !== t))}
                  />
                  <span className="text-xs">{t === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}</span>
                </label>
              ))}
            </PopoverContent>
          </Popover>
        </aside>

        {/* Main content */}
        <div className="space-y-4">
          {/* KPI + Advisor XP */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Receita {kpisQ.data?.anomes_label || "—"}</p>
                {kpisQ.isLoading ? (
                  <Skeleton className="h-9 w-48 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-[#082537] mt-1">{fmtBRL(kpisQ.data?.total_mes ?? 0)}</p>
                )}
                <div className={cn("flex items-center gap-1 mt-2 text-sm", variacaoColor(kpisQ.data?.variacao_pct ?? null))}>
                  {variacaoIcon(kpisQ.data?.variacao_pct ?? null)}
                  <span className="font-medium">
                    {kpisQ.data?.variacao_pct != null ? `${kpisQ.data.variacao_pct > 0 ? "+" : ""}${kpisQ.data.variacao_pct.toFixed(1)}%` : "—"}
                  </span>
                  <span className="text-muted-foreground">vs {kpisQ.data?.anomes_anterior_label} ({fmtBRL(kpisQ.data?.total_mes_anterior ?? 0)})</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">N° de clientes: <strong>{kpisQ.data?.n_clientes_unicos ?? 0}</strong></p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Receita Advisor XP (Assessoria)</p>
                </div>
                {advisorQ.isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : (
                  <table className="w-full text-xs">
                    <tbody>
                      {(advisorQ.data || []).map((a) => (
                        <tr key={a.advisor} className="border-b last:border-0">
                          <td className="py-1">{a.advisor}</td>
                          <td className="py-1 text-right font-medium">{fmtBRL(a.total)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2">
                        <td className="py-1 font-bold">Total</td>
                        <td className="py-1 text-right font-bold text-[#082537]">
                          {fmtBRL((advisorQ.data || []).reduce((a, r) => a + r.total, 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Categoria bar + Subcategoria pivot */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-semibold text-[#082537] mb-2">Receita por Categoria</p>
                {catQ.isLoading ? <Skeleton className="h-72 w-full" /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={catQ.data || []} layout="vertical" margin={{ left: 10, right: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => fmtBRLShort(Number(v))} />
                      <YAxis dataKey="categoria" type="category" width={110} tick={{ fontSize: 11 }} />
                      <RTooltip formatter={(v: any) => fmtBRL(Number(v))} />
                      <Bar dataKey="total" fill="#082537">
                        <LabelList dataKey="total" position="right" formatter={(v: number) => fmtBRLShort(v)} style={{ fontSize: 10 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-semibold text-[#082537] mb-2">Receita por Subcategoria</p>
                {subQ.isLoading ? <Skeleton className="h-72 w-full" /> : (
                  <div className="max-h-[300px] overflow-auto">
                    <table className="w-full text-xs">
                      <tbody>
                        {subPivot.flatMap((row) => [
                          <tr key={row.cat} className="border-b cursor-pointer hover:bg-muted/50" onClick={() => toggleCat(row.cat)}>
                            <td className="py-1.5 font-semibold flex items-center gap-1">
                              {expandedCats.has(row.cat) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              <span className="inline-block w-2 h-2 rounded-full" style={{ background: colorFor(row.cat) }} />
                              {row.cat}
                            </td>
                            <td className="py-1.5 text-right font-semibold">{fmtBRL(row.total)}</td>
                          </tr>,
                          ...(expandedCats.has(row.cat) ? row.subs.map((s) => (
                            <tr key={`${row.cat}-${s.sub}`} className="border-b bg-muted/30">
                              <td className="py-1 pl-8 text-muted-foreground">{s.sub}</td>
                              <td className="py-1 text-right">{fmtBRL(s.total)}</td>
                            </tr>
                          )) : []),
                        ])}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Série temporal stacked */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-[#082537] mb-2">Receita Total — últimos 12 meses (stacked por categoria)</p>
              {serieQ.isLoading ? <Skeleton className="h-72 w-full" /> : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={seriePivot} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => fmtBRLShort(Number(v))} tick={{ fontSize: 11 }} />
                    <RTooltip formatter={(v: any) => fmtBRL(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {seriesCats.map((c) => (
                      <Bar key={c} dataKey={c} stackId="a" fill={colorFor(c)} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Matriz Banker × Categoria */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-[#082537] mb-2">Receita por FA (matriz × categoria)</p>
              {matrizQ.isLoading ? <Skeleton className="h-64 w-full" /> : (
                <div className="overflow-auto max-h-[400px]">
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 font-semibold">FA</th>
                        {matriz.catList.map((c) => (
                          <th key={c} className="text-right py-2 px-2 font-semibold whitespace-nowrap" style={{ color: colorFor(c) }}>{c}</th>
                        ))}
                        <th className="text-right py-2 px-2 font-semibold bg-[#082537] text-white">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matriz.bankerRows.map((r) => (
                        <tr key={r.banker} className="border-b hover:bg-muted/40">
                          <td className="py-1.5 px-2">{r.banker}</td>
                          {matriz.catList.map((c) => (
                            <td key={c} className="text-right py-1.5 px-2 tabular-nums">{r.vals[c] ? fmtBRL(r.vals[c]) : "—"}</td>
                          ))}
                          <td className="text-right py-1.5 px-2 font-semibold tabular-nums bg-muted/30">{fmtBRL(r.total)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 bg-[#082537] text-white">
                        <td className="py-2 px-2 font-bold">Total</td>
                        {matriz.catList.map((c) => (
                          <td key={c} className="text-right py-2 px-2 font-bold tabular-nums">{fmtBRL(matriz.totals[c] || 0)}</td>
                        ))}
                        <td className="text-right py-2 px-2 font-bold tabular-nums">{fmtBRL(matriz.grand)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fonte Receita 100% stacked */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-[#082537] mb-2">Fonte da Receita — % por categoria (12 meses)</p>
              {serieQ.isLoading ? <Skeleton className="h-64 w-full" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={seriePivot} stackOffset="expand" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`} tick={{ fontSize: 11 }} />
                    <RTooltip formatter={(v: any) => fmtBRL(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {seriesCats.map((c) => (
                      <Bar key={c} dataKey={c} stackId="b" fill={colorFor(c)} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
