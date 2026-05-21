import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { C, SectionTitle } from "../Inicio";

const fmtAdapt = (n: number | null | undefined): string => {
  if (n == null || !isFinite(n) || n === 0) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000)
    return `R$ ${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n / 1_000_000)} Mi`;
  if (abs >= 1_000)
    return `R$ ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(n / 1_000)} Mil`;
  return `R$ ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(n)}`;
};

function todayAnomes() {
  const d = new Date();
  return d.getFullYear() * 100 + (d.getMonth() + 1);
}

function useReceitaKpi() {
  return useQuery({
    queryKey: ["inicio-kpi-receita", todayAnomes()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_receita_caixa_kpis" as any, { p_anomes: todayAnomes() } as any);
      if (error) return null;
      const r = Array.isArray(data) ? data[0] : data;
      return r as any;
    },
    staleTime: 60_000,
  });
}

function useCaptacaoKpi() {
  return useQuery({
    queryKey: ["inicio-kpi-captacao"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_captacao_kpis" as any, {} as any);
      if (error) return null;
      const r = Array.isArray(data) ? data[0] : data;
      return r as any;
    },
    staleTime: 60_000,
  });
}

function useContasKpi() {
  return useQuery({
    queryKey: ["inicio-kpi-contas"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_contas_kpis" as any, {} as any);
      if (error) return null;
      const r = Array.isArray(data) ? data[0] : data;
      return r as any;
    },
    staleTime: 60_000,
  });
}

function KpiCard({
  label,
  value,
  variation,
  subtitle,
  onClick,
  loading,
}: {
  label: string;
  value: string;
  variation?: number | null;
  subtitle?: string;
  onClick?: () => void;
  loading?: boolean;
}) {
  const variationColor =
    variation == null
      ? C.textMuted
      : variation > 0
      ? "#0F6E56"
      : variation < 0
      ? "#9C2B2B"
      : C.textMuted;
  const Icon = variation == null ? Minus : variation > 0 ? TrendingUp : variation < 0 ? TrendingDown : Minus;

  return (
    <button
      onClick={onClick}
      className="text-left rounded-lg p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
      style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
    >
      <p style={{ color: C.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
        {label}
      </p>
      {loading ? (
        <Skeleton className="h-9 w-32 mt-2" />
      ) : (
        <p
          className="font-display font-numeric mt-1"
          style={{ fontSize: 28, fontWeight: 500, color: C.navy900, letterSpacing: "-0.5px" }}
        >
          {value}
        </p>
      )}
      <div className="flex items-center gap-1 mt-2 text-[11px]" style={{ color: variationColor }}>
        <Icon className="h-3 w-3" />
        <span className="font-numeric">{subtitle ?? (variation != null ? `${Math.abs(variation).toFixed(1)}% vs mês anterior` : "—")}</span>
      </div>
    </button>
  );
}

interface Props {
  role: string | null;
}

export function KPIsCards({ role }: Props) {
  const navigate = useNavigate();
  const receita = useReceitaKpi();
  const captacao = useCaptacaoKpi();
  const contas = useContasKpi();

  const isLeadership = role === "ADMIN" || role === "LIDER";
  const isOperational = role === "OPERACOES" || role === "FA ASSISTENTE" || role === "ASSESSOR";

  const labelReceita = isLeadership ? "Receita do mês" : "Sua receita";
  const labelCaptacao = isLeadership ? "Captação do mês" : "Sua captação";
  const labelContas = isLeadership ? "Clientes ativos" : "Seus clientes";

  if (isOperational) {
    return (
      <section className="space-y-4">
        <SectionTitle>Visão geral</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg p-5"
              style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
            >
              <p style={{ color: C.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                KPI {i}
              </p>
              <p className="font-display mt-2" style={{ fontSize: 22, fontWeight: 400, color: C.navy500 }}>
                Em breve
              </p>
              <p className="text-[11px] mt-2" style={{ color: C.textMuted }}>
                KPIs personalizados estarão disponíveis em breve.
              </p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const totalContas =
    contas.data ? Number(contas.data.ativacao ?? 0) + Number(contas.data.habilitacao ?? 0) + Number(contas.data.migracao ?? 0) : 0;

  return (
    <section className="space-y-4">
      <SectionTitle>Visão geral</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <KpiCard
          label={labelReceita}
          value={fmtAdapt(receita.data?.total_mes)}
          variation={receita.data?.variacao_pct ?? null}
          loading={receita.isLoading}
          onClick={() => navigate("/dashboard/receita")}
        />
        <KpiCard
          label={labelCaptacao}
          value={fmtAdapt(captacao.data?.captacao_mtd)}
          subtitle={captacao.data?.captacao_ytd != null ? `YTD ${fmtAdapt(captacao.data.captacao_ytd)}` : undefined}
          loading={captacao.isLoading}
          onClick={() => navigate("/dashboards/comercial")}
        />
        <KpiCard
          label={labelContas}
          value={totalContas > 0 ? new Intl.NumberFormat("pt-BR").format(totalContas) : "—"}
          subtitle={contas.data ? `${contas.data.ativacao ?? 0} ativações este mês` : "—"}
          loading={contas.isLoading}
          onClick={() => navigate("/dashboards/comercial")}
        />
      </div>
    </section>
  );
}
