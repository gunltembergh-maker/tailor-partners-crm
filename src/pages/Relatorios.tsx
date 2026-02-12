import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { leadStatusLabels, clientStatusLabels, formatCurrency } from "@/lib/format";
import { subDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Relatorios() {
  const ninetyDaysAgo = subDays(new Date(), 90).toISOString();

  const { data: leads, isLoading: loadingLeads } = useQuery({
    queryKey: ["report-leads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("status, owner_id, created_at")
        .gte("created_at", ninetyDaysAgo);
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["report-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name");
      return data || [];
    },
  });

  const { data: opportunities, isLoading: loadingOpp } = useQuery({
    queryKey: ["report-opportunities"],
    queryFn: async () => {
      const { data } = await supabase
        .from("opportunities")
        .select("stage, last_update_at, updated_at")
        .in("stage", ["GANHA", "PERDIDA"]);
      return data || [];
    },
  });

  const { data: clients, isLoading: loadingClients } = useQuery({
    queryKey: ["report-clients"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("status, patrimonio_ou_receita");
      return data || [];
    },
  });

  // Report 1: Leads por status
  const leadsByStatus = (() => {
    if (!leads) return [];
    const counts: Record<string, number> = {};
    leads.forEach((l) => {
      counts[l.status] = (counts[l.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({
      name: leadStatusLabels[status] || status,
      total: count,
    }));
  })();

  // Report 2: Conversão por responsável
  const conversionByOwner = (() => {
    if (!leads || !profiles) return [];
    const grouped: Record<string, { total: number; converted: number }> = {};
    leads.forEach((l) => {
      if (!grouped[l.owner_id]) grouped[l.owner_id] = { total: 0, converted: 0 };
      grouped[l.owner_id].total++;
      if (l.status === "CONVERTIDO") grouped[l.owner_id].converted++;
    });
    const profileMap = Object.fromEntries(profiles.map((p) => [p.user_id, p.full_name]));
    return Object.entries(grouped).map(([ownerId, { total, converted }]) => ({
      name: profileMap[ownerId]?.split(" ")[0] || "Desconhecido",
      taxa: total > 0 ? Math.round((converted / total) * 100) : 0,
    }));
  })();

  // Report 3: Oportunidades ganhas/perdidas por mês
  const oppByMonth = (() => {
    if (!opportunities) return [];
    const months: Record<string, { ganhas: number; perdidas: number }> = {};
    opportunities.forEach((o) => {
      const date = o.last_update_at || o.updated_at;
      const key = format(parseISO(date), "MMM/yy", { locale: ptBR });
      if (!months[key]) months[key] = { ganhas: 0, perdidas: 0 };
      if (o.stage === "GANHA") months[key].ganhas++;
      else months[key].perdidas++;
    });
    return Object.entries(months).map(([month, v]) => ({
      name: month,
      ...v,
    }));
  })();

  // Report 4: Carteira por status
  const portfolioByStatus = (() => {
    if (!clients) return [];
    const sums: Record<string, number> = {};
    clients.forEach((c) => {
      sums[c.status] = (sums[c.status] || 0) + Number(c.patrimonio_ou_receita || 0);
    });
    return Object.entries(sums).map(([status, value]) => ({
      name: clientStatusLabels[status] || status,
      valor: value,
    }));
  })();

  const isLoading = loadingLeads || loadingOpp || loadingClients;

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <h1 className="text-2xl font-display font-bold text-foreground mb-6">Relatórios</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Report 1 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leads por Status (90 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <ChartContainer config={{ total: { label: "Total", color: "hsl(var(--primary))" } }} className="h-[250px]">
                  <BarChart data={leadsByStatus}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Report 2 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conversão por Responsável (90 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <ChartContainer config={{ taxa: { label: "Taxa %", color: "hsl(var(--primary))" } }} className="h-[250px]">
                  <BarChart data={conversionByOwner} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="taxa" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Report 3 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Oportunidades Ganhas/Perdidas por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <ChartContainer
                  config={{
                    ganhas: { label: "Ganhas", color: "hsl(142, 71%, 45%)" },
                    perdidas: { label: "Perdidas", color: "hsl(var(--destructive))" },
                  }}
                  className="h-[250px]"
                >
                  <BarChart data={oppByMonth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="ganhas" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="perdidas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Report 4 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Carteira de Clientes por Status</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <ChartContainer config={{ valor: { label: "Patrimônio/Receita", color: "hsl(var(--primary))" } }} className="h-[250px]">
                  <BarChart data={portfolioByStatus}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                    <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
