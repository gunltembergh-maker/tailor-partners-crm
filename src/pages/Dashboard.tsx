import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Users, Briefcase, CheckSquare, TrendingUp, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface Stats {
  leads: number;
  clients: number;
  opportunities: number;
  tasks: number;
  pipelineValue: number;
  pendingTasks: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    leads: 0, clients: 0, opportunities: 0, tasks: 0, pipelineValue: 0, pendingTasks: 0,
  });

  useEffect(() => {
    async function load() {
      const [leads, clients, opps, tasks] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("opportunities").select("valor_estimado, stage"),
        supabase.from("tasks").select("id, status"),
      ]);

      const pipelineValue = (opps.data || [])
        .filter((o: any) => !["GANHA", "PERDIDA"].includes(o.stage))
        .reduce((sum: number, o: any) => sum + (o.valor_estimado || 0), 0);

      const pendingTasks = (tasks.data || []).filter(
        (t: any) => t.status === "ABERTA" || t.status === "ATRASADA"
      ).length;

      setStats({
        leads: leads.count || 0,
        clients: clients.count || 0,
        opportunities: (opps.data || []).length,
        tasks: (tasks.data || []).length,
        pipelineValue,
        pendingTasks,
      });
    }
    load();
  }, []);

  const cards = [
    { title: "Leads", value: stats.leads, icon: Target, color: "text-tailor-blue" },
    { title: "Clientes", value: stats.clients, icon: Users, color: "text-tailor-copper" },
    { title: "Oportunidades", value: stats.opportunities, icon: Briefcase, color: "text-accent" },
    { title: "Pipeline", value: formatCurrency(stats.pipelineValue), icon: TrendingUp, color: "text-tailor-success" },
    { title: "Tarefas Totais", value: stats.tasks, icon: CheckSquare, color: "text-muted-foreground" },
    { title: "Tarefas Pendentes", value: stats.pendingTasks, icon: AlertCircle, color: "text-tailor-warning" },
  ];

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <h1 className="text-2xl font-display font-bold text-foreground mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <Card key={card.title} className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
