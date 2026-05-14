import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ChevronDown, ChevronRight, FilterX, HelpCircle, Plus, TrendingDown, TrendingUp, Minus, Search } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ReceitaCaixaOnboardingModal } from "@/components/relatorios/ReceitaCaixaOnboardingModal";
import { cn } from "@/lib/utils";

// ── Paleta executiva (paleta-receita) ───────────────────────────────
const C = {
  navy900: "#082537",
  navy700: "#1F4A66",
  navy500: "#37708F",
  navy300: "#5B96B0",
  navy200: "#88A8B8",
  navy100: "#B0C2CC",
  gold:    "#BC8B5C",
  bgPage:  "#F4F2EC",
  bgCard:  "#FFFFFF",
  textMuted: "#7a8794",
  border:  "rgba(8,37,55,0.08)",
  divider: "rgba(8,37,55,0.06)",
  downBg:  "#FCEBEB", downFg: "#791F1F",
  upBg:    "#E1F5EE", upFg:   "#0F6E56",
};

// Mapeamento categoria → cor (paleta estendida — suporta até 12+ categorias)
const CAT_COLORS: Record<string, string> = {
  "Câmbio": "#082537",
  "Lavoro": "#BC8B5C",
  "Consórcio": "#1F4A66",
  "Assessoria": "#37708F",
  "Wealth Solutions": "#5B96B0",
  "Seguro de Vida": "#88A8B8",
  "Offshore": "#B0C2CC",
  "Consultoria": "#A4815C",
  "Corporate & Banking": "#4A8C8C",
  "Gestora": "#6F9A95",
};
const FALLBACK_COLORS = [
  "#082537", "#BC8B5C", "#1F4A66", "#37708F", "#5B96B0", "#88A8B8",
  "#B0C2CC", "#A4815C", "#4A8C8C", "#6F9A95", "#8E5C4F", "#6B7A8F",
];
const colorFor = (cat: string, idx = 0) => CAT_COLORS[cat] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];

// ── Helpers ─────────────────────────────────────────────────────────
const fmtBRL = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const fmtBR = (n: number | null | undefined, decimals = 2) =>
  n == null ? "—" : new Intl.NumberFormat("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
const fmtMil = (n: number) => {
  if (!isFinite(n) || n === 0) return "—";
  const v = n / 1000;
  return Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1).replace(".", ",");
};
// "R$ X Mil" formatter for category bar chart values
const fmtMilLabel = (n: number) => {
  if (!isFinite(n) || n === 0) return "—";
  const v = n / 1000;
  if (Math.abs(v) >= 100) {
    return `R$ ${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)} Mil`;
  }
  return `R$ ${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v)} Mil`;
};

const todayAnomes = (() => { const d = new Date(); return d.getFullYear() * 100 + (d.getMonth() + 1); })();

// ── Types ───────────────────────────────────────────────────────────
type FiltrosResp = {
  anomes_disponiveis: { anomes: number; label: string }[];
  bankers: string[]; finders: string[]; advisors: string[]; canais: string[];
  categorias: string[]; subcategorias: string[];
};
type KPIs = { total_mes: number; total_mes_anterior: number; variacao_pct: number | null;
  n_clientes_unicos: number; anomes_label: string; anomes_anterior_label: string; };

// ── Multi-select dropdown (sidebar navy) ────────────────────────────
function MultiSelect({ options, selected, onChange, placeholder = "Selecionar" }:
  { options: string[]; selected: string[]; onChange: (s: string[]) => void; placeholder?: string }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => options.filter(o => o.toLowerCase().includes(search.toLowerCase())), [options, search]);
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="w-full flex items-center justify-between rounded-md px-3 py-[11px] text-[14px] text-white/90 hover:bg-white/10 transition"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
        >
          <span className="truncate">
            {selected.length === 0 ? placeholder : `${selected.length} selecionado${selected.length > 1 ? "s" : ""}`}
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60 ml-1 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-7 pr-2 py-1.5 text-xs border rounded outline-none focus:border-[#082537]"
          />
        </div>
        <div className="max-h-60 overflow-auto">
          {filtered.length === 0 && <p className="text-xs text-muted-foreground px-1 py-2">Sem opções</p>}
          {filtered.map((opt) => (
            <label key={opt} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted cursor-pointer">
              <Checkbox checked={selected.includes(opt)} onCheckedChange={() => toggle(opt)} />
              <span className="text-xs truncate">{opt}</span>
            </label>
          ))}
        </div>
        {selected.length > 0 && (
          <button onClick={() => onChange([])} className="mt-2 text-[10px] text-muted-foreground hover:text-foreground">Limpar seleção</button>
        )}
      </PopoverContent>
    </Popover>
  );
}

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-[12px] font-medium uppercase tracking-[0.5px] text-white/55 mb-[7px]">{children}</label>
);

// ── Page ─────────────────────────────────────────────────────────────
export default function ReceitaCaixa() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [selectedAnomes, setSelectedAnomes] = useState<number | null>(null);
  const [bankers, setBankers] = useState<string[]>([]);
  const [finders, setFinders] = useState<string[]>([]);
  const [advisors, setAdvisors] = useState<string[]>([]);
  const [canais, setCanais] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [subcategorias, setSubcategorias] = useState<string[]>([]);
  const [tiposPessoa, setTiposPessoa] = useState<string[]>(["PF", "PJ"]);

  useEffect(() => {
    if (!user?.id) return;
    const key = `dashboard_receita_onboarding_${user.id}`;
    if (!localStorage.getItem(key)) { setShowOnboarding(true); localStorage.setItem(key, "1"); }
  }, [user?.id]);

  const filtrosQ = useQuery({
    queryKey: ["receita-caixa-filtros", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_receita_caixa_filtros");
      if (error) throw error;
      return data as unknown as FiltrosResp;
    },
    enabled: !!user?.id,
  });

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
      p_advisor: advisors.length ? advisors : null,
      p_categoria: categorias.length ? categorias : null,
      p_subcategoria: subcategorias.length ? subcategorias : null,
      p_canal: canais.length ? canais : null,
      p_tipo_pessoa: tipoParam,
    };
  }, [selectedAnomes, bankers, finders, advisors, canais, categorias, subcategorias, tiposPessoa]);

  const enabled = !!selectedAnomes;
  const mkQ = <T,>(key: string, fn: string) => useQuery({
    queryKey: [key, rpcParams],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(fn as any, rpcParams as any);
      if (error) throw error;
      return data as T;
    },
    enabled,
  });

  const kpisQ    = mkQ<KPIs[]>("rc-kpis", "rpc_receita_caixa_kpis");
  const catQ     = mkQ<{ categoria: string; total: number }[]>("rc-cat", "rpc_receita_caixa_por_categoria");
  const subQ     = mkQ<{ categoria: string; subcategoria: string; total_subcategoria: number; total_categoria: number }[]>("rc-sub", "rpc_receita_caixa_por_subcategoria");
  const serieQ   = mkQ<{ anomes: number; anomes_label: string; categoria: string; total: number }[]>("rc-serie", "rpc_receita_caixa_serie_temporal");
  const matrizQ  = mkQ<{ banker: string; categoria: string; total: number }[]>("rc-matriz", "rpc_receita_caixa_por_assessor");
  const advisorQ = mkQ<{ advisor: string; total: number }[]>("rc-advisor", "rpc_receita_caixa_advisor_xp");

  const kpis = (kpisQ.data && (kpisQ.data as any)[0]) as KPIs | undefined;

  useEffect(() => {
    [kpisQ.error, catQ.error, subQ.error, serieQ.error, matrizQ.error, advisorQ.error].forEach((e) => {
      if (e) toast.error(`Erro ao carregar dados: ${(e as Error).message}`);
    });
  }, [kpisQ.error, catQ.error, subQ.error, serieQ.error, matrizQ.error, advisorQ.error]);

  // Subcategoria pivot
  const subPivot = useMemo(() => {
    const map = new Map<string, { total: number; subs: { sub: string; total: number }[] }>();
    (subQ.data || []).forEach((r) => {
      if (!map.has(r.categoria)) map.set(r.categoria, { total: r.total_categoria, subs: [] });
      map.get(r.categoria)!.subs.push({ sub: r.subcategoria, total: r.total_subcategoria });
    });
    return Array.from(map.entries())
      .map(([cat, v]) => ({ cat, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [subQ.data]);

  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const toggleCat = (c: string) => setExpandedCats(s => { const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); return n; });

  // Série temporal pivotada (ordem reversa: mês mais recente à esquerda)
  const seriePivot = useMemo(() => {
    const months = new Map<number, { anomes: number; label: string; total: number; [k: string]: any }>();
    (serieQ.data || []).forEach((r) => {
      if (!months.has(r.anomes)) months.set(r.anomes, { anomes: r.anomes, label: r.anomes_label, total: 0 });
      const m = months.get(r.anomes)!;
      m[r.categoria] = r.total;
      m.total += Number(r.total) || 0;
    });
    return Array.from(months.values()).sort((a, b) => b.anomes - a.anomes); // reverso
  }, [serieQ.data]);

  const seriesCats = useMemo(() => {
    const tot = new Map<string, number>();
    (serieQ.data || []).forEach((r) => tot.set(r.categoria, (tot.get(r.categoria) || 0) + Number(r.total)));
    return Array.from(tot.entries()).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [serieQ.data]);

  // Matriz Banker × Categoria (top 6 + outros)
  const matriz = useMemo(() => {
    const cats = new Set<string>();
    const rows = new Map<string, Record<string, number>>();
    (matrizQ.data || []).forEach((r) => {
      cats.add(r.categoria);
      if (!rows.has(r.banker)) rows.set(r.banker, {});
      rows.get(r.banker)![r.categoria] = r.total;
    });
    const catOrder = ["Câmbio", "Consórcio", "Assessoria", "Lavoro", "Wealth Solutions", "Seguro de Vida", "Offshore"];
    const catList = Array.from(cats).sort((a, b) => {
      const ia = catOrder.indexOf(a), ib = catOrder.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    const allRows = Array.from(rows.entries()).map(([banker, vals]) => ({
      banker, vals, total: catList.reduce((acc, c) => acc + (vals[c] || 0), 0),
    })).sort((a, b) => b.total - a.total);
    const totals: Record<string, number> = {};
    catList.forEach(c => { totals[c] = allRows.reduce((a, r) => a + (r.vals[c] || 0), 0); });
    const grand = allRows.reduce((a, r) => a + r.total, 0);
    return { catList, allRows, totals, grand };
  }, [matrizQ.data]);

  const [showAllBankers, setShowAllBankers] = useState(false);

  const handleClearFilters = () => {
    setBankers([]); setFinders([]); setAdvisors([]); setCanais([]); setCategorias([]); setSubcategorias([]); setTiposPessoa(["PF", "PJ"]);
  };

  const variacao = kpis?.variacao_pct ?? null;
  const isDown = variacao != null && variacao < 0;
  const isUp = variacao != null && variacao > 0;

  // ── Render ────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <ReceitaCaixaOnboardingModal open={showOnboarding} onClose={() => setShowOnboarding(false)} />

      <div style={{ background: C.bgPage, margin: -16, padding: 24, minHeight: "calc(100vh - 64px)" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-medium" style={{ color: C.navy900, letterSpacing: "-0.5px" }}>Receita</h1>
            <ChevronRight className="h-4 w-4" style={{ color: C.textMuted }} />
            <span className="text-[18px] font-normal" style={{ color: C.textMuted }}>Caixa</span>
            <ChevronRight className="h-4 w-4" style={{ color: C.textMuted }} />
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-md" style={{ background: C.navy900 }}>
              <Calendar className="h-3.5 w-3.5" style={{ color: C.bgPage }} />
              <Select value={selectedAnomes ? String(selectedAnomes) : ""} onValueChange={(v) => setSelectedAnomes(Number(v))}>
                <SelectTrigger className="bg-transparent border-0 h-6 w-[120px] focus:ring-0 p-0" style={{ color: C.bgPage }}>
                  <SelectValue placeholder="Período…" />
                </SelectTrigger>
                <SelectContent>
                  {(filtrosQ.data?.anomes_disponiveis || []).map((a) => (
                    <SelectItem key={a.anomes} value={String(a.anomes)}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowOnboarding(true)} style={{ color: C.textMuted }}>
            <HelpCircle className="h-4 w-4 mr-1" /> Ajuda
          </Button>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: "260px 1fr" }}>
          {/* ── SIDEBAR ─────────────────────────────────────────── */}
          <aside className="rounded-[10px] py-[22px] px-5 h-fit sticky top-4" style={{ background: C.navy900, color: "white" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[14px] font-medium uppercase tracking-[0.5px] text-white/85 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5" /> Filtros
              </p>
              <button onClick={handleClearFilters} className="text-[11px] text-white/60 hover:text-white flex items-center gap-1">
                <FilterX className="h-3 w-3" /> Limpar
              </button>
            </div>

            <div className="space-y-3.5">
              <div><FieldLabel>Financial Advisor</FieldLabel>
                <MultiSelect options={filtrosQ.data?.bankers || []} selected={bankers} onChange={setBankers} /></div>
              <div><FieldLabel>Finder</FieldLabel>
                <MultiSelect options={filtrosQ.data?.finders || []} selected={finders} onChange={setFinders} /></div>
              <div><FieldLabel>Advisor XP</FieldLabel>
                <MultiSelect options={filtrosQ.data?.advisors || []} selected={advisors} onChange={setAdvisors} /></div>
              <div><FieldLabel>Canal</FieldLabel>
                <MultiSelect options={filtrosQ.data?.canais || []} selected={canais} onChange={setCanais} /></div>
              <div><FieldLabel>Categoria</FieldLabel>
                <MultiSelect options={filtrosQ.data?.categorias || []} selected={categorias} onChange={setCategorias} /></div>
              <div><FieldLabel>Subcategoria</FieldLabel>
                <MultiSelect options={filtrosQ.data?.subcategorias || []} selected={subcategorias} onChange={setSubcategorias} /></div>
            </div>

            <div className="my-3 border-t border-white/10" />

            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-md text-white/90 hover:bg-white/10 transition"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
                  <Plus className="h-3 w-3" /> Ações
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56" align="start">
                <p className="text-[11px] font-semibold mb-2 uppercase tracking-wider text-muted-foreground">Tipo de Pessoa</p>
                {["PF", "PJ"].map((t) => (
                  <label key={t} className="flex items-center gap-2 py-1 cursor-pointer">
                    <Checkbox checked={tiposPessoa.includes(t)} onCheckedChange={(c) =>
                      setTiposPessoa(c ? Array.from(new Set([...tiposPessoa, t])) : tiposPessoa.filter((x) => x !== t))} />
                    <span className="text-xs">{t === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}</span>
                  </label>
                ))}
              </PopoverContent>
            </Popover>
          </aside>

          {/* ── MAIN CONTENT ─────────────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Row 1: KPI principal + Advisor XP */}
            <div className="grid gap-4" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
              {/* KPI Principal — dominante */}
              <div
                className="rounded-[10px] flex flex-col justify-between"
                style={{
                  background: C.bgCard,
                  border: `0.5px solid ${C.border}`,
                  padding: "28px 32px",
                  gap: 16,
                  minHeight: 240,
                }}
              >
                <h3 style={{ fontSize: 18, fontWeight: 600, color: C.navy900, margin: 0, letterSpacing: "-0.2px" }}>
                  Receita do mês {kpis?.anomes_label && <span style={{ color: C.textMuted, fontWeight: 500 }}>· {kpis.anomes_label}</span>}
                </h3>

                {kpisQ.isLoading ? (
                  <Skeleton className="h-16 w-72" />
                ) : (() => {
                  const total = kpis?.total_mes ?? 0;
                  const intPart = Math.trunc(total);
                  const decPart = Math.abs(total - intPart);
                  const intStr = `R$ ${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(intPart)}`;
                  const decStr = `,${decPart.toFixed(2).slice(2)}`;
                  return (
                    <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                      <span style={{ fontSize: 64, fontWeight: 500, color: C.navy900, letterSpacing: "-1.2px", lineHeight: 1 }}>{intStr}</span>
                      <span style={{ fontSize: 18, color: C.textMuted }}>{decStr}</span>
                    </div>
                  );
                })()}

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {variacao != null && (
                    <span
                      style={{
                        background: isDown ? C.downBg : isUp ? C.upBg : "#eee",
                        color: isDown ? C.downFg : isUp ? C.upFg : C.textMuted,
                        padding: "6px 14px",
                        borderRadius: 6,
                        fontSize: 16,
                        fontWeight: 500,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        width: "fit-content",
                      }}
                    >
                      {isDown ? <TrendingDown size={18} /> : isUp ? <TrendingUp size={18} /> : <Minus size={18} />}
                      {variacao > 0 ? "+" : ""}{variacao.toFixed(1)}%
                    </span>
                  )}
                  {kpis?.anomes_anterior_label && (
                    <span style={{ fontSize: 14, color: C.textMuted }}>
                      vs {kpis.anomes_anterior_label}: {fmtBRL(kpis.total_mes_anterior ?? 0)}
                    </span>
                  )}
                  <span style={{ fontSize: 14, color: C.textMuted }}>
                    {kpis?.n_clientes_unicos ?? 0} clientes ativos
                  </span>
                </div>
              </div>

              {/* Advisor XP mini-tabela */}
              <div className="rounded-[10px]" style={{ background: C.bgCard, border: `0.5px solid ${C.border}`, padding: "24px 26px" }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: C.navy900, marginBottom: 18, letterSpacing: "-0.2px" }}>
                  Receita Advisor XP
                </h3>
                {advisorQ.isLoading ? <Skeleton className="h-32 w-full" /> : (
                  <table className="w-full">
                    <tbody>
                      {(advisorQ.data || []).map((a) => (
                        <tr key={a.advisor} style={{ borderBottom: `0.5px solid ${C.divider}` }}>
                          <td style={{ padding: "10px 0", fontSize: 15, color: "#1a1a1a" }}>{a.advisor}</td>
                          <td className="text-right tabular-nums" style={{ padding: "10px 0", fontSize: 15, color: C.navy900, fontWeight: 500 }}>{fmtBR(a.total)}</td>
                        </tr>
                      ))}
                      <tr style={{ borderTop: `1px solid ${C.navy900}` }}>
                        <td style={{ padding: "12px 0 0", fontSize: 16, fontWeight: 600, color: C.navy900 }}>Total</td>
                        <td className="text-right tabular-nums" style={{ padding: "12px 0 0", fontSize: 16, fontWeight: 600, color: C.navy900 }}>
                          {fmtBRL((advisorQ.data || []).reduce((a, r) => a + Number(r.total), 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Row 2: Bar Categoria + Lista Subcategoria */}
            <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {/* Bar chart por categoria */}
              <div className="rounded-[10px]" style={{ background: C.bgCard, border: `0.5px solid ${C.border}`, padding: "24px 26px" }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: C.navy900, marginBottom: 20, letterSpacing: "-0.2px" }}>Receita por Categoria</h3>
                {catQ.isLoading ? <Skeleton className="h-64 w-full" /> : (() => {
                  const max = Math.max(...(catQ.data || []).map(d => Number(d.total)), 1);
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {(catQ.data || []).map((d, i) => (
                        <div key={d.categoria} style={{ display: "grid", gridTemplateColumns: "120px 1fr 100px", alignItems: "center", gap: 14, fontSize: 15 }}>
                          <span style={{ textAlign: "right", color: "#1a1a1a" }} className="truncate">{d.categoria}</span>
                          <div style={{ background: "rgba(8,37,55,0.06)", borderRadius: 4, height: 26 }}>
                            <div style={{ background: colorFor(d.categoria, i), width: `${(Number(d.total) / max) * 100}%`, height: "100%", borderRadius: 4 }} />
                          </div>
                          <span className="tabular-nums" style={{ textAlign: "right", color: C.navy900, fontWeight: 500 }}>{fmtMilLabel(Number(d.total))}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Lista subcategoria com drill */}
              <div className="rounded-[10px]" style={{ background: C.bgCard, border: `0.5px solid ${C.border}`, padding: "24px 26px" }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: C.navy900, marginBottom: 18, letterSpacing: "-0.2px" }}>Receita por Subcategoria</h3>
                {subQ.isLoading ? <Skeleton className="h-64 w-full" /> : (
                  <div className="max-h-[340px] overflow-auto">
                    {subPivot.map((row, i) => (
                      <div key={row.cat}>
                        <div className="flex items-center justify-between cursor-pointer hover:bg-black/[0.02]" onClick={() => toggleCat(row.cat)}
                          style={{ borderBottom: `0.5px solid ${C.divider}`, padding: "12px 0", fontSize: 15 }}>
                          <div className="flex items-center" style={{ gap: 10 }}>
                            {expandedCats.has(row.cat) ? <ChevronDown size={16} style={{ color: C.textMuted }} /> : <ChevronRight size={16} style={{ color: C.textMuted }} />}
                            <span className="inline-block rounded-full" style={{ width: 9, height: 9, background: colorFor(row.cat, i) }} />
                            <span style={{ fontSize: 15, color: C.navy900 }}>{row.cat}</span>
                          </div>
                          <span className="tabular-nums" style={{ fontSize: 15, color: C.navy900, fontWeight: 500 }}>{fmtBRL(row.total)}</span>
                        </div>
                        {expandedCats.has(row.cat) && (
                          <div style={{ padding: "8px 0 8px 36px", background: "rgba(8,37,55,0.025)" }}>
                            {row.subs.map((s) => (
                              <div key={`${row.cat}-${s.sub}`} className="flex items-center justify-between"
                                style={{ padding: "6px 0", fontSize: 14, color: "#5F5E5A" }}>
                                <span>{s.sub}</span>
                                <span className="tabular-nums">{fmtBR(s.total)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Row 3: Receita Total — últimos 12 meses */}
            <div className="rounded-[10px]" style={{ background: C.bgCard, border: `0.5px solid ${C.border}`, padding: "24px 28px" }}>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <h3 style={{ fontSize: 18, fontWeight: 600, color: C.navy900, letterSpacing: "-0.2px" }}>Receita Total — últimos 12 meses</h3>
                <div className="flex items-center gap-3 flex-wrap justify-end" style={{ maxWidth: "70%" }}>
                  {seriesCats.map((c, i) => (
                    <span key={c} className="text-[12px] flex items-center gap-1.5" style={{ color: C.textMuted }}>
                      <span className="rounded-sm" style={{ width: 10, height: 10, background: colorFor(c, i), display: "inline-block" }} /> {c}
                    </span>
                  ))}
                </div>
              </div>
              {serieQ.isLoading ? <Skeleton className="h-80 w-full" /> : <StackedBars data={seriePivot} cats={seriesCats} currentAnomes={selectedAnomes ?? 0} />}
            </div>

            {/* Row 4: Matriz Banker × Categoria */}
            <div className="rounded-[10px]" style={{ background: C.bgCard, border: `0.5px solid ${C.border}`, padding: "24px 26px" }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: C.navy900, marginBottom: 18, letterSpacing: "-0.2px" }}>Receita por Assessor</h3>
              {matrizQ.isLoading ? <Skeleton className="h-64 w-full" /> : (() => {
                const visible = showAllBankers ? matriz.allRows : matriz.allRows.slice(0, 6);
                const hidden = matriz.allRows.slice(6);
                const otherTotals: Record<string, number> = {};
                let otherGrand = 0;
                hidden.forEach(r => { matriz.catList.forEach(c => { otherTotals[c] = (otherTotals[c] || 0) + (r.vals[c] || 0); }); otherGrand += r.total; });
                return (
                  <div className="overflow-auto">
                    <table className="w-full border-collapse" style={{ fontSize: 14 }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${C.navy900}` }}>
                          <th className="text-left" style={{ padding: "12px 8px", fontSize: 12, color: C.textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>Banker</th>
                          {matriz.catList.map((c, i) => (
                            <th key={c} className="text-right whitespace-nowrap" style={{ padding: "12px 8px", fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px", color: colorFor(c, i) }}>{c}</th>
                          ))}
                          <th className="text-right" style={{ padding: "12px 8px", fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px", color: C.navy900 }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visible.map((r) => (
                          <tr key={r.banker} style={{ borderBottom: `0.5px solid ${C.divider}` }}>
                            <td style={{ padding: "10px 8px", color: C.navy900 }}>{r.banker}</td>
                            {matriz.catList.map((c) => (
                              <td key={c} className="text-right tabular-nums" style={{ padding: "10px 8px", color: C.navy900 }}>
                                {r.vals[c] ? fmtBR(r.vals[c]) : "—"}
                              </td>
                            ))}
                            <td className="text-right tabular-nums" style={{ padding: "10px 8px", color: C.navy900, fontWeight: 500 }}>{fmtBR(r.total)}</td>
                          </tr>
                        ))}
                        {!showAllBankers && hidden.length > 0 && (
                          <tr style={{ borderBottom: `0.5px solid ${C.divider}`, color: C.textMuted, cursor: "pointer" }}
                              onClick={() => setShowAllBankers(true)}>
                            <td className="italic" style={{ padding: "10px 8px" }}>… outros ({hidden.length}) — clique para expandir</td>
                            {matriz.catList.map((c) => (
                              <td key={c} className="text-right tabular-nums" style={{ padding: "10px 8px" }}>{otherTotals[c] ? fmtBR(otherTotals[c]) : "—"}</td>
                            ))}
                            <td className="text-right tabular-nums" style={{ padding: "10px 8px" }}>{fmtBR(otherGrand)}</td>
                          </tr>
                        )}
                        <tr style={{ borderTop: `1px solid ${C.navy900}`, background: "rgba(8,37,55,0.025)" }}>
                          <td style={{ padding: "12px 8px", color: C.navy900, fontWeight: 600, fontSize: 15 }}>Total</td>
                          {matriz.catList.map((c) => (
                            <td key={c} className="text-right tabular-nums" style={{ padding: "12px 8px", color: C.navy900, fontWeight: 600, fontSize: 15 }}>{fmtBR(matriz.totals[c] || 0)}</td>
                          ))}
                          <td className="text-right tabular-nums" style={{ padding: "12px 8px", color: C.navy900, fontWeight: 600, fontSize: 15 }}>{fmtBR(matriz.grand)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Row 5: Fonte da Receita — 100% stacked */}
            <div className="rounded-[10px]" style={{ background: C.bgCard, border: `0.5px solid ${C.border}`, padding: "24px 28px" }}>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <h3 style={{ fontSize: 18, fontWeight: 600, color: C.navy900, letterSpacing: "-0.2px" }}>Fonte da Receita — composição mensal</h3>
                <div className="flex items-center gap-3 flex-wrap justify-end" style={{ maxWidth: "70%" }}>
                  {seriesCats.map((c, i) => (
                    <span key={c} className="text-[12px] flex items-center gap-1.5" style={{ color: C.textMuted }}>
                      <span className="rounded-sm" style={{ width: 10, height: 10, background: colorFor(c, i), display: "inline-block" }} /> {c}
                    </span>
                  ))}
                </div>
              </div>
              {serieQ.isLoading ? <Skeleton className="h-72 w-full" /> : <StackedPctBars data={seriePivot} cats={seriesCats} currentAnomes={selectedAnomes ?? 0} />}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// ── Tooltip helpers ──────────────────────────────────────────────────
const fmtTooltipValue = (n: number) => {
  if (Math.abs(n) >= 1000) {
    const v = n / 1000;
    return `R$ ${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: Math.abs(v) >= 100 ? 0 : 1, maximumFractionDigits: Math.abs(v) >= 100 ? 0 : 1 }).format(v)} Mil`;
  }
  return `R$ ${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
};

function RichTooltip({
  pos, mes, label, cats, total, showPct,
}: {
  pos: { x: number; y: number };
  mes: number;
  label: string;
  cats: { cat: string; value: number; color: string }[];
  total: number;
  showPct: boolean;
}) {
  const left = Math.min(pos.x + 16, window.innerWidth - 340);
  const top = Math.min(pos.y + 16, window.innerHeight - 320);
  return (
    <div style={{
      position: "fixed", top, left,
      background: "#FFFFFF",
      border: "0.5px solid rgba(8,37,55,0.15)",
      borderRadius: 8,
      padding: "14px 16px",
      fontSize: 13,
      boxShadow: "0 4px 16px rgba(8,37,55,0.12)",
      zIndex: 1000,
      minWidth: 260,
      maxWidth: 320,
      pointerEvents: "none",
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.navy900, marginBottom: 8 }}>{label}</div>
      <div style={{ borderTop: "0.5px solid rgba(8,37,55,0.1)", marginBottom: 8 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {cats.map((c) => {
          const pct = total > 0 ? (c.value / total) * 100 : 0;
          return (
            <div key={c.cat} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "#1a1a1a", flex: 1, minWidth: 0 }}>
                <span style={{ width: 8, height: 8, background: c.color, borderRadius: 2, flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.cat}</span>
              </span>
              <span className="tabular-nums" style={{ color: C.navy900, fontWeight: 500, whiteSpace: "nowrap" }}>
                {showPct && <span style={{ color: C.textMuted, marginRight: 8 }}>{pct.toFixed(0)}%</span>}
                {fmtTooltipValue(c.value)}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ borderTop: "0.5px solid rgba(8,37,55,0.1)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.navy900 }}>TOTAL</span>
        <span className="tabular-nums" style={{ fontSize: 13, fontWeight: 600, color: C.navy900 }}>{fmtTooltipValue(total)}</span>
      </div>
    </div>
  );
}

function useBarTooltip() {
  const [state, setState] = useState<{ anomes: number; x: number; y: number } | null>(null);
  const onEnter = (anomes: number) => (e: React.MouseEvent) => setState({ anomes, x: e.clientX, y: e.clientY });
  const onMove = (e: React.MouseEvent) => setState((s) => (s ? { ...s, x: e.clientX, y: e.clientY } : s));
  const onLeave = () => setState(null);
  return { state, onEnter, onMove, onLeave };
}

function buildTooltipCats(d: any, cats: string[]) {
  return cats
    .map((c, i) => ({ cat: c, value: Number(d[c]) || 0, color: colorFor(c, i) }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
}

// ── Custom stacked bars (ordem reversa, valor no topo) ──────────────
function StackedBars({ data, cats, currentAnomes }: { data: any[]; cats: string[]; currentAnomes: number }) {
  const maxTotal = Math.max(...data.map(d => d.total), 1);
  const tt = useBarTooltip();
  const hovered = tt.state ? data.find(d => d.anomes === tt.state!.anomes) : null;
  return (
    <div>
      <div className="flex items-end" style={{ height: 320, gap: 10, padding: "0 4px" }}>
        {data.map((d) => {
          const isCurrent = d.anomes === currentAnomes;
          const heightPct = (d.total / maxTotal) * 100;
          return (
            <div
              key={d.anomes}
              className="flex-1 flex flex-col items-center justify-end h-full cursor-pointer"
              onMouseEnter={tt.onEnter(d.anomes)}
              onMouseMove={tt.onMove}
              onMouseLeave={tt.onLeave}
            >
              <span style={{ fontSize: 13, marginBottom: 6, fontWeight: isCurrent ? 600 : 500, color: isCurrent ? C.gold : C.navy900 }} className="tabular-nums">{fmtMil(d.total)}</span>
              <div className="w-full flex flex-col-reverse rounded-t overflow-hidden relative"
                style={{ height: `${heightPct}%`, minHeight: 4, borderTop: isCurrent ? `1px solid ${C.gold}` : "none" }}>
                {cats.map((c, i) => {
                  const v = Number(d[c]) || 0;
                  if (v === 0 || d.total === 0) return null;
                  const segPct = (v / d.total) * 100;
                  return <div key={c} style={{ height: `${segPct}%`, background: colorFor(c, i) }} />;
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex" style={{ gap: 10, marginTop: 10, borderTop: `0.5px solid ${C.border}`, paddingTop: 8 }}>
        {data.map((d) => {
          const isCurrent = d.anomes === currentAnomes;
          const [mon, yr] = d.label.split("/");
          const showYr = (d.anomes % 100 === 1) || data[0].anomes === d.anomes || data[data.length - 1].anomes === d.anomes;
          return (
            <div key={d.anomes} className="flex-1 text-center">
              <span style={{ fontSize: 12, fontWeight: isCurrent ? 600 : 500, color: isCurrent ? C.gold : C.textMuted }}>
                {mon.toLowerCase()}{showYr ? `/${yr}` : ""}
              </span>
            </div>
          );
        })}
      </div>
      {tt.state && hovered && (
        <RichTooltip
          pos={{ x: tt.state.x, y: tt.state.y }}
          mes={hovered.anomes}
          label={hovered.label}
          cats={buildTooltipCats(hovered, cats)}
          total={hovered.total}
          showPct={false}
        />
      )}
    </div>
  );
}

function StackedPctBars({ data, cats, currentAnomes }: { data: any[]; cats: string[]; currentAnomes: number }) {
  const tt = useBarTooltip();
  const hovered = tt.state ? data.find(d => d.anomes === tt.state!.anomes) : null;
  return (
    <div>
      <div className="flex items-end" style={{ height: 300, gap: 10 }}>
        {data.map((d) => {
          const isCurrent = d.anomes === currentAnomes;
          if (d.total === 0) return <div key={d.anomes} className="flex-1" />;
          return (
            <div
              key={d.anomes}
              className="flex-1 h-full flex flex-col-reverse rounded overflow-hidden cursor-pointer"
              style={{ border: isCurrent ? `1px solid ${C.gold}` : "none" }}
              onMouseEnter={tt.onEnter(d.anomes)}
              onMouseMove={tt.onMove}
              onMouseLeave={tt.onLeave}
            >
              {cats.map((c, i) => {
                const v = Number(d[c]) || 0;
                if (v === 0) return null;
                const pct = (v / d.total) * 100;
                return (
                  <div key={c} className="flex items-center justify-center" style={{ height: `${pct}%`, background: colorFor(c, i) }}>
                    {pct >= 6 && <span style={{ fontSize: 12, fontWeight: 500, color: "#fff" }}>{pct.toFixed(0)}%</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="flex" style={{ gap: 10, marginTop: 10, borderTop: `0.5px solid ${C.border}`, paddingTop: 8 }}>
        {data.map((d) => {
          const isCurrent = d.anomes === currentAnomes;
          const [mon, yr] = d.label.split("/");
          const showYr = (d.anomes % 100 === 1) || data[0].anomes === d.anomes || data[data.length - 1].anomes === d.anomes;
          return (
            <div key={d.anomes} className="flex-1 text-center">
              <span style={{ fontSize: 12, fontWeight: isCurrent ? 600 : 500, color: isCurrent ? C.gold : C.textMuted }}>
                {mon.toLowerCase()}{showYr ? `/${yr}` : ""}
              </span>
            </div>
          );
        })}
      </div>
      {tt.state && hovered && (
        <RichTooltip
          pos={{ x: tt.state.x, y: tt.state.y }}
          mes={hovered.anomes}
          label={hovered.label}
          cats={buildTooltipCats(hovered, cats)}
          total={hovered.total}
          showPct={true}
        />
      )}
    </div>
  );
}
