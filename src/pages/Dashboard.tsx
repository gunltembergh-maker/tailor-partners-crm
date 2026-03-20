import { useEffect, useState, useCallback } from "react";
import TailorLoader from "@/components/TailorLoader";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Target, Users, Briefcase, RefreshCw, ChevronDown, ChevronRight, TrendingUp,
  AlertCircle, Clock, UserCheck, BarChart3, Ban, CalendarCheck, Zap
} from "lucide-react";
import {
  formatCurrency, formatDate, formatDateTime, isToday, isDaysAgo,
  leadStatusLabels, leadStatusColors, clientStatusLabels, clientStatusColors,
  opportunityStageLabels, opportunityStageColors
} from "@/lib/format";

interface DashboardData {
  leads: any[];
  clients: any[];
  tasks: any[];
  opportunities: any[];
}

interface CardDef {
  key: string;
  title: string;
  icon: any;
  count: number;
  subtitle?: string;
  navigateTo?: string;
  items: any[];
  columns: { label: string; accessor: (item: any) => string }[];
  detailPath: (item: any) => string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData>({ leads: [], clients: [], tasks: [], opportunities: [] });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ leads: true, clients: true, opportunities: true });
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [leadsRes, clientsRes, tasksRes, oppsRes] = await Promise.all([
      supabase.from("leads").select("id, nome_razao, status, last_contact_at, conversion_at, created_at, valor_potencial"),
      supabase.from("clients").select("id, nome_razao, status, patrimonio_ou_receita"),
      supabase.from("tasks").select("id, status, due_at, related_type, related_id"),
      supabase.from("opportunities").select("id, titulo, stage, close_date, last_update_at, valor_estimado, created_at"),
    ]);
    setData({
      leads: leadsRes.data || [],
      clients: clientsRes.data || [],
      tasks: tasksRes.data || [],
      opportunities: oppsRes.data || [],
    });
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const now = new Date();
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const todayStr = now.toISOString().slice(0, 10);

  // === LEADS calculations ===
  const leadsNovos = data.leads.filter(l => l.status === "NOVO");
  const leadTasksToday = data.tasks.filter(t => t.related_type === "LEAD" && t.due_at && isToday(t.due_at));
  const leadsAtividadeHoje = [...new Set(leadTasksToday.map(t => t.related_id))];
  const leadsSemContato = data.leads.filter(l => !l.last_contact_at || isDaysAgo(l.last_contact_at, 30));
  const leadsConvertidosHoje = data.leads.filter(l => l.conversion_at && isToday(l.conversion_at));
  const leads90d = data.leads.filter(l => new Date(l.created_at) >= ninetyDaysAgo);
  const convertidos90d = data.leads.filter(l => l.conversion_at && new Date(l.conversion_at) >= ninetyDaysAgo);
  const taxaLeads = leads90d.length > 0 ? ((convertidos90d.length / leads90d.length) * 100).toFixed(1) : "0";

  // === CLIENTS calculations ===
  const clientesAtivos = data.clients.filter(c => c.status === "ATIVO_NET");
  const clientesInativos = data.clients.filter(c => c.status === "INATIVO_PLD");
  const clientesCriticos = data.clients.filter(c => c.status === "CRITICO");
  const clientTasksAtrasadas = data.tasks.filter(t => t.related_type === "CLIENT" && t.status === "ATRASADA");
  const clientesComAtrasadas = [...new Set(clientTasksAtrasadas.map(t => t.related_id))];
  const clientTasksHoje = data.tasks.filter(t => t.related_type === "CLIENT" && t.due_at && isToday(t.due_at));
  const clientesComTarefasHoje = [...new Set(clientTasksHoje.map(t => t.related_id))];

  const sumPatrimonio = (arr: any[]) => arr.reduce((s, c) => s + (c.patrimonio_ou_receita || 0), 0);
  const sumValor = (arr: any[]) => arr.reduce((s, o) => s + (o.valor_estimado || 0), 0);

  // === OPPORTUNITIES calculations ===
  const oppsIniciais = data.opportunities.filter(o => o.stage === "INICIAL");
  const oppsAtrasadas = data.opportunities.filter(o => o.close_date && o.close_date < todayStr && !["GANHA", "PERDIDA"].includes(o.stage));
  const oppsSemAtualizacao = data.opportunities.filter(o => isDaysAgo(o.last_update_at, 30) && !["GANHA", "PERDIDA"].includes(o.stage));
  const oppsGanhasHoje = data.opportunities.filter(o => o.stage === "GANHA" && o.last_update_at && isToday(o.last_update_at));
  const ganhas90d = data.opportunities.filter(o => o.stage === "GANHA" && o.last_update_at && new Date(o.last_update_at) >= ninetyDaysAgo);
  const perdidas90d = data.opportunities.filter(o => o.stage === "PERDIDA" && o.last_update_at && new Date(o.last_update_at) >= ninetyDaysAgo);
  const taxaOpps = (ganhas90d.length + perdidas90d.length) > 0 ? ((ganhas90d.length / (ganhas90d.length + perdidas90d.length)) * 100).toFixed(1) : "0";

  // Helper to get lead/client items from related_ids
  const getClientsFromIds = (ids: string[]) => data.clients.filter(c => ids.includes(c.id)).slice(0, 10);
  const getLeadsFromIds = (ids: string[]) => data.leads.filter(l => ids.includes(l.related_id || l.id)).slice(0, 10);

  const leadColumns = [
    { label: "Nome", accessor: (i: any) => i.nome_razao },
    { label: "Status", accessor: (i: any) => leadStatusLabels[i.status] || i.status },
    { label: "Valor", accessor: (i: any) => formatCurrency(i.valor_potencial) },
    { label: "Criado", accessor: (i: any) => formatDate(i.created_at) },
  ];
  const clientColumns = [
    { label: "Nome", accessor: (i: any) => i.nome_razao },
    { label: "Status", accessor: (i: any) => clientStatusLabels[i.status] || i.status },
    { label: "Patrimônio", accessor: (i: any) => formatCurrency(i.patrimonio_ou_receita) },
  ];
  const oppColumns = [
    { label: "Título", accessor: (i: any) => i.titulo },
    { label: "Estágio", accessor: (i: any) => opportunityStageLabels[i.stage] || i.stage },
    { label: "Valor", accessor: (i: any) => formatCurrency(i.valor_estimado) },
    { label: "Fechamento", accessor: (i: any) => formatDate(i.close_date) },
  ];

  const sections: { key: string; title: string; icon: any; color: string; cards: CardDef[] }[] = [
    {
      key: "leads", title: "Leads", icon: Target, color: "text-primary",
      cards: [
        { key: "leads_novos", title: "Leads Novos", icon: Zap, count: leadsNovos.length, navigateTo: "/leads?status=NOVO", items: leadsNovos.slice(0, 10), columns: leadColumns, detailPath: (i) => `/leads/${i.id}` },
        { key: "leads_atividades", title: "Atividades Hoje", icon: CalendarCheck, count: leadsAtividadeHoje.length, navigateTo: "/tarefas?related_type=LEAD&due=today", items: data.leads.filter(l => leadsAtividadeHoje.includes(l.id)).slice(0, 10), columns: leadColumns, detailPath: (i) => `/leads/${i.id}` },
        { key: "leads_sem_contato", title: "Sem Contato (30d)", icon: Ban, count: leadsSemContato.length, navigateTo: "/leads?filter=sem_contato", items: leadsSemContato.slice(0, 10), columns: leadColumns, detailPath: (i) => `/leads/${i.id}` },
        { key: "leads_convertidos", title: "Convertidos Hoje", icon: UserCheck, count: leadsConvertidosHoje.length, navigateTo: "/leads?status=CONVERTIDO", items: leadsConvertidosHoje.slice(0, 10), columns: leadColumns, detailPath: (i) => `/leads/${i.id}` },
        { key: "leads_taxa", title: "Taxa Conversão (90d)", icon: BarChart3, count: 0, subtitle: `${taxaLeads}%`, items: convertidos90d.slice(0, 10), columns: leadColumns, detailPath: (i) => `/leads/${i.id}` },
      ],
    },
    {
      key: "clients", title: "Clientes", icon: Users, color: "text-accent",
      cards: [
        { key: "clientes_ativos", title: "Ativos (NET)", icon: TrendingUp, count: clientesAtivos.length, subtitle: formatCurrency(sumPatrimonio(clientesAtivos)), navigateTo: "/clientes?status=ATIVO_NET", items: clientesAtivos.slice(0, 10), columns: clientColumns, detailPath: (i) => `/clientes/${i.id}` },
        { key: "clientes_inativos", title: "Inativos (PLD)", icon: Clock, count: clientesInativos.length, subtitle: formatCurrency(sumPatrimonio(clientesInativos)), navigateTo: "/clientes?status=INATIVO_PLD", items: clientesInativos.slice(0, 10), columns: clientColumns, detailPath: (i) => `/clientes/${i.id}` },
        { key: "clientes_atrasadas", title: "Tarefas Atrasadas", icon: AlertCircle, count: clientesComAtrasadas.length, navigateTo: "/tarefas?related_type=CLIENT&status=ATRASADA", items: getClientsFromIds(clientesComAtrasadas), columns: clientColumns, detailPath: (i) => `/clientes/${i.id}` },
        { key: "clientes_hoje", title: "Tarefas Hoje", icon: CalendarCheck, count: clientesComTarefasHoje.length, navigateTo: "/tarefas?related_type=CLIENT&due=today", items: getClientsFromIds(clientesComTarefasHoje), columns: clientColumns, detailPath: (i) => `/clientes/${i.id}` },
        { key: "clientes_criticos", title: "Críticos", icon: AlertCircle, count: clientesCriticos.length, subtitle: formatCurrency(sumPatrimonio(clientesCriticos)), navigateTo: "/clientes?status=CRITICO", items: clientesCriticos.slice(0, 10), columns: clientColumns, detailPath: (i) => `/clientes/${i.id}` },
      ],
    },
    {
      key: "opportunities", title: "Oportunidades", icon: Briefcase, color: "text-accent",
      cards: [
        { key: "opps_iniciais", title: "Iniciais", icon: Zap, count: oppsIniciais.length, subtitle: formatCurrency(sumValor(oppsIniciais)), navigateTo: "/oportunidades?stage=INICIAL", items: oppsIniciais.slice(0, 10), columns: oppColumns, detailPath: (i) => `/oportunidades/${i.id}` },
        { key: "opps_atrasadas", title: "Atrasadas", icon: AlertCircle, count: oppsAtrasadas.length, subtitle: formatCurrency(sumValor(oppsAtrasadas)), navigateTo: "/oportunidades?filter=atrasadas", items: oppsAtrasadas.slice(0, 10), columns: oppColumns, detailPath: (i) => `/oportunidades/${i.id}` },
        { key: "opps_sem_atualizacao", title: "Sem Atualização (30d)", icon: Clock, count: oppsSemAtualizacao.length, navigateTo: "/oportunidades?filter=sem_atualizacao", items: oppsSemAtualizacao.slice(0, 10), columns: oppColumns, detailPath: (i) => `/oportunidades/${i.id}` },
        { key: "opps_ganhas", title: "Convertidas Hoje", icon: UserCheck, count: oppsGanhasHoje.length, subtitle: formatCurrency(sumValor(oppsGanhasHoje)), navigateTo: "/oportunidades?stage=GANHA", items: oppsGanhasHoje.slice(0, 10), columns: oppColumns, detailPath: (i) => `/oportunidades/${i.id}` },
        { key: "opps_taxa", title: "Taxa Conversão (90d)", icon: BarChart3, count: 0, subtitle: `${taxaOpps}%`, items: ganhas90d.slice(0, 10), columns: oppColumns, detailPath: (i) => `/oportunidades/${i.id}` },
      ],
    },
  ];

  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-display font-bold text-foreground">Início</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Última atualização: {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {sections.map((section) => (
            <Collapsible key={section.key} open={openSections[section.key]} onOpenChange={() => toggleSection(section.key)}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer p-3 rounded-lg bg-card border hover:bg-muted/50 transition-colors">
                  {openSections[section.key] ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <section.icon className={`h-5 w-5 ${section.color}`} />
                  <span className="font-display font-semibold text-foreground">{section.title}</span>
                  <Badge variant="secondary" className="ml-2 text-xs">{section.cards.reduce((s, c) => s + c.count, 0)}</Badge>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mt-3">
                  {section.cards.map((card) => (
                    <div key={card.key}>
                      <Card
                        className={`shadow-sm hover:shadow-md transition-shadow ${card.navigateTo ? "cursor-pointer" : ""}`}
                        onClick={() => card.navigateTo && navigate(card.navigateTo)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-muted-foreground">{card.title}</span>
                            <card.icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="text-2xl font-bold text-foreground">
                            {card.subtitle && card.count === 0 ? card.subtitle : card.count}
                          </div>
                          {card.subtitle && card.count > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                          )}
                        </CardContent>
                      </Card>
                      {card.items.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-1 text-xs text-muted-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCard(expandedCard === card.key ? null : card.key);
                          }}
                        >
                          {expandedCard === card.key ? "Recolher painel" : "Expandir painel"}
                        </Button>
                      )}
                      {expandedCard === card.key && card.items.length > 0 && (
                        <Card className="mt-1 shadow-sm">
                          <CardContent className="p-2">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {card.columns.map((col) => (
                                    <TableHead key={col.label} className="text-xs py-1 px-2">{col.label}</TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {card.items.map((item: any) => (
                                  <TableRow
                                    key={item.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => navigate(card.detailPath(item))}
                                  >
                                    {card.columns.map((col) => (
                                      <TableCell key={col.label} className="text-xs py-1 px-2">{col.accessor(item)}</TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
