import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, Plus, MessageSquarePlus, ExternalLink, Clock, AlertTriangle,
  PhoneOff, RefreshCw, Calendar, Target, Users, Briefcase
} from "lucide-react";
import {
  formatCurrency, formatDate, formatDateTime, isToday, isDaysAgo,
  taskTipoLabels, taskStatusLabels, taskStatusColors,
  leadStatusLabels, leadStatusColors,
  clientStatusLabels, clientStatusColors,
  opportunityStageLabels, opportunityStageColors,
} from "@/lib/format";

type QuickAction = "task" | "note";

interface QuickActionState {
  type: QuickAction;
  relatedType: "LEAD" | "CLIENT" | "OPPORTUNITY";
  relatedId: string;
  relatedName: string;
}

export default function Prioridades() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Quick action dialogs
  const [quickAction, setQuickAction] = useState<QuickActionState | null>(null);
  const [taskForm, setTaskForm] = useState({ tipo: "OUTRO", descricao: "", due_at: "" });
  const [noteText, setNoteText] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [tasksRes, leadsRes, clientsRes, oppsRes] = await Promise.all([
      supabase.from("tasks").select("*"),
      supabase.from("leads").select("*"),
      supabase.from("clients").select("*"),
      supabase.from("opportunities").select("*"),
    ]);
    setTasks(tasksRes.data || []);
    setLeads(leadsRes.data || []);
    setClients(clientsRes.data || []);
    setOpportunities(oppsRes.data || []);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // === Helpers ===
  const getRelatedName = (type: string | null, id: string | null) => {
    if (!type || !id) return null;
    if (type === "LEAD") return leads.find(l => l.id === id)?.nome_razao;
    if (type === "CLIENT") return clients.find(c => c.id === id)?.nome_razao;
    if (type === "OPPORTUNITY") return opportunities.find(o => o.id === id)?.titulo;
    return null;
  };

  const getRelatedPath = (type: string | null, id: string | null) => {
    if (!type || !id) return null;
    if (type === "LEAD") return `/leads/${id}`;
    if (type === "CLIENT") return `/clientes/${id}`;
    if (type === "OPPORTUNITY") return `/oportunidades/${id}`;
    return null;
  };

  const getRelatedIcon = (type: string | null) => {
    if (type === "LEAD") return Target;
    if (type === "CLIENT") return Users;
    if (type === "OPPORTUNITY") return Briefcase;
    return Clock;
  };

  const isClientCritico = (task: any) => {
    if (task.related_type !== "CLIENT" || !task.related_id) return false;
    const client = clients.find(c => c.id === task.related_id);
    return client?.status === "CRITICO";
  };

  // === TAB A: Para Hoje ===
  const tasksToday = tasks
    .filter(t => t.status !== "CONCLUIDA" && t.due_at && isToday(t.due_at))
    .sort((a, b) => {
      const aCrit = isClientCritico(a) ? 0 : 1;
      const bCrit = isClientCritico(b) ? 0 : 1;
      if (aCrit !== bCrit) return aCrit - bCrit;
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    });

  // === TAB B: Atrasados ===
  const tasksAtrasadas = tasks
    .filter(t => t.status === "ATRASADA")
    .map(t => {
      const daysLate = t.due_at ? Math.floor((Date.now() - new Date(t.due_at).getTime()) / 86400000) : 0;
      return { ...t, _type: "task" as const, daysLate };
    });

  const todayStr = new Date().toISOString().slice(0, 10);
  const oppsAtrasadas = opportunities
    .filter(o => o.close_date && o.close_date < todayStr && !["GANHA", "PERDIDA"].includes(o.stage))
    .map(o => {
      const daysLate = Math.floor((Date.now() - new Date(o.close_date).getTime()) / 86400000);
      return { ...o, _type: "opp" as const, daysLate };
    });

  const atrasados = [...tasksAtrasadas, ...oppsAtrasadas].sort((a, b) => b.daysLate - a.daysLate);

  // === TAB C: Sem Contato ===
  const leadsSemContato = leads
    .filter(l => !["CONVERTIDO", "PERDIDO"].includes(l.status) && (!l.last_contact_at || isDaysAgo(l.last_contact_at, 30)))
    .sort((a, b) => (b.valor_potencial || 0) - (a.valor_potencial || 0))
    .map(l => ({ ...l, _entity: "LEAD" as const }));

  const clientesSemContato = clients
    .filter(c => !c.last_contact_at || isDaysAgo(c.last_contact_at, 30))
    .sort((a, b) => (b.patrimonio_ou_receita || 0) - (a.patrimonio_ou_receita || 0))
    .map(c => ({ ...c, _entity: "CLIENT" as const }));

  const semContato = [...leadsSemContato, ...clientesSemContato];

  // === Quick Actions ===
  async function markDone(taskId: string) {
    await supabase.from("tasks").update({ status: "CONCLUIDA" as any }).eq("id", taskId);
    toast({ title: "Tarefa concluída!" });
    loadData();
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !quickAction) return;
    const { error } = await supabase.from("tasks").insert({
      tipo: taskForm.tipo as any,
      descricao: taskForm.descricao || null,
      due_at: taskForm.due_at ? new Date(taskForm.due_at).toISOString() : null,
      related_type: quickAction.relatedType as any,
      related_id: quickAction.relatedId,
      owner_id: user.id,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tarefa criada!" });
      setQuickAction(null);
      setTaskForm({ tipo: "OUTRO", descricao: "", due_at: "" });
      loadData();
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !quickAction) return;
    const { error } = await supabase.from("notes").insert({
      texto: noteText,
      related_type: quickAction.relatedType as any,
      related_id: quickAction.relatedId,
      author_id: user.id,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Nota adicionada!" });
      setQuickAction(null);
      setNoteText("");
    }
  }

  function openQuickAction(type: QuickAction, relatedType: "LEAD" | "CLIENT" | "OPPORTUNITY", relatedId: string, relatedName: string) {
    setQuickAction({ type, relatedType, relatedId, relatedName });
    if (type === "task") setTaskForm({ tipo: "OUTRO", descricao: "", due_at: "" });
    if (type === "note") setNoteText("");
  }

  // === Action Buttons Component ===
  function ActionButtons({ relatedType, relatedId, relatedName, taskId }: {
    relatedType: "LEAD" | "CLIENT" | "OPPORTUNITY";
    relatedId: string;
    relatedName: string;
    taskId?: string;
  }) {
    const detailPath = getRelatedPath(relatedType, relatedId);
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {taskId && (
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); markDone(taskId); }}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Concluir
          </Button>
        )}
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); openQuickAction("task", relatedType, relatedId, relatedName); }}>
          <Plus className="h-3.5 w-3.5" /> Tarefa
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); openQuickAction("note", relatedType, relatedId, relatedName); }}>
          <MessageSquarePlus className="h-3.5 w-3.5" /> Nota
        </Button>
        {detailPath && (
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); navigate(detailPath); }}>
            <ExternalLink className="h-3.5 w-3.5" /> Abrir
          </Button>
        )}
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-display font-bold text-foreground">Prioridades</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        <Tabs defaultValue="hoje" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="hoje" className="gap-1.5">
              <Calendar className="h-4 w-4" />
              Para Hoje
              {tasksToday.length > 0 && <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">{tasksToday.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="atrasados" className="gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              Atrasados
              {atrasados.length > 0 && <Badge variant="destructive" className="ml-1 text-xs h-5 px-1.5">{atrasados.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="sem_contato" className="gap-1.5">
              <PhoneOff className="h-4 w-4" />
              Sem Contato
              {semContato.length > 0 && <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">{semContato.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* TAB A: Para Hoje */}
          <TabsContent value="hoje">
            <div className="space-y-2">
              {tasksToday.length === 0 && (
                <Card className="p-8 text-center text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Nenhuma tarefa para hoje. Tudo em dia!</p>
                </Card>
              )}
              {tasksToday.map((task) => {
                const RelIcon = getRelatedIcon(task.related_type);
                const relName = getRelatedName(task.related_type, task.related_id) || "Sem vínculo";
                const isCritico = isClientCritico(task);
                return (
                  <Card key={task.id} className={`shadow-sm hover:shadow-md transition-shadow ${isCritico ? "border-destructive/50 bg-destructive/5" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] shrink-0">{taskTipoLabels[task.tipo] || task.tipo}</Badge>
                            {isCritico && <Badge variant="destructive" className="text-[10px]">CRÍTICO</Badge>}
                            <span className="font-semibold text-foreground truncate">{task.descricao || "Sem descrição"}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDateTime(task.due_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <RelIcon className="h-3 w-3" />
                              {relName}
                            </span>
                          </div>
                        </div>
                        {task.related_type && task.related_id && (
                          <ActionButtons
                            relatedType={task.related_type}
                            relatedId={task.related_id}
                            relatedName={relName}
                            taskId={task.id}
                          />
                        )}
                        {(!task.related_type || !task.related_id) && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => markDone(task.id)}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Concluir
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB B: Atrasados */}
          <TabsContent value="atrasados">
            <div className="space-y-2">
              {atrasados.length === 0 && (
                <Card className="p-8 text-center text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Nenhum item atrasado. Excelente!</p>
                </Card>
              )}
              {atrasados.map((item) => {
                if (item._type === "task") {
                  const RelIcon = getRelatedIcon(item.related_type);
                  const relName = getRelatedName(item.related_type, item.related_id) || "Sem vínculo";
                  return (
                    <Card key={`task-${item.id}`} className="shadow-sm hover:shadow-md transition-shadow border-destructive/30">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="destructive" className="text-[10px]">{item.daysLate}d atraso</Badge>
                              <Badge variant="outline" className="text-[10px]">{taskTipoLabels[item.tipo] || item.tipo}</Badge>
                              <span className="font-semibold text-foreground truncate">{item.descricao || "Sem descrição"}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Vencimento: {formatDateTime(item.due_at)}
                              </span>
                              <span className="flex items-center gap-1">
                                <RelIcon className="h-3 w-3" />
                                {relName}
                              </span>
                            </div>
                          </div>
                          {item.related_type && item.related_id ? (
                            <ActionButtons relatedType={item.related_type} relatedId={item.related_id} relatedName={relName} taskId={item.id} />
                          ) : (
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => markDone(item.id)}>
                              <CheckCircle2 className="h-3.5 w-3.5" /> Concluir
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                } else {
                  // Opportunity
                  return (
                    <Card key={`opp-${item.id}`} className="shadow-sm hover:shadow-md transition-shadow border-accent/30">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="destructive" className="text-[10px]">{item.daysLate}d atraso</Badge>
                              <Badge variant="secondary" className={opportunityStageColors[item.stage]}>
                                {opportunityStageLabels[item.stage]}
                              </Badge>
                              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-semibold text-foreground truncate">{item.titulo}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                              <span>Fechamento: {formatDate(item.close_date)}</span>
                              <span>{formatCurrency(item.valor_estimado)}</span>
                            </div>
                          </div>
                          <ActionButtons relatedType="OPPORTUNITY" relatedId={item.id} relatedName={item.titulo} />
                        </div>
                      </CardContent>
                    </Card>
                  );
                }
              })}
            </div>
          </TabsContent>

          {/* TAB C: Sem Contato */}
          <TabsContent value="sem_contato">
            <div className="space-y-2">
              {semContato.length === 0 && (
                <Card className="p-8 text-center text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Todos os contatos estão em dia!</p>
                </Card>
              )}
              {semContato.map((item) => {
                const isLead = item._entity === "LEAD";
                const valor = isLead ? item.valor_potencial : item.patrimonio_ou_receita;
                const statusLabel = isLead ? leadStatusLabels[item.status] : clientStatusLabels[item.status];
                const statusColor = isLead ? leadStatusColors[item.status] : clientStatusColors[item.status];
                const daysNoContact = item.last_contact_at
                  ? Math.floor((Date.now() - new Date(item.last_contact_at).getTime()) / 86400000)
                  : null;

                return (
                  <Card key={`${item._entity}-${item.id}`} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px]">{isLead ? "Lead" : "Cliente"}</Badge>
                            <Badge variant="secondary" className={statusColor}>{statusLabel}</Badge>
                            <span className="font-semibold text-foreground truncate">{item.nome_razao}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <PhoneOff className="h-3 w-3" />
                              {daysNoContact !== null ? `${daysNoContact} dias sem contato` : "Nunca contatado"}
                            </span>
                            <span>{formatCurrency(valor)}</span>
                          </div>
                        </div>
                        <ActionButtons
                          relatedType={isLead ? "LEAD" : "CLIENT"}
                          relatedId={item.id}
                          relatedName={item.nome_razao}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Action: Create Task Dialog */}
        <Dialog open={quickAction?.type === "task"} onOpenChange={(open) => !open && setQuickAction(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Nova Tarefa — {quickAction?.relatedName}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <Label>Tipo</Label>
                <Select value={taskForm.tipo} onValueChange={(v) => setTaskForm({ ...taskForm, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(taskTipoLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={taskForm.descricao} onChange={(e) => setTaskForm({ ...taskForm, descricao: e.target.value })} rows={2} />
              </div>
              <div>
                <Label>Vencimento</Label>
                <Input type="datetime-local" value={taskForm.due_at} onChange={(e) => setTaskForm({ ...taskForm, due_at: e.target.value })} />
              </div>
              <Button type="submit" className="w-full">Criar Tarefa</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Quick Action: Add Note Dialog */}
        <Dialog open={quickAction?.type === "note"} onOpenChange={(open) => !open && setQuickAction(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Nota — {quickAction?.relatedName}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddNote} className="space-y-3">
              <div>
                <Label>Texto da nota</Label>
                <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={4} required />
              </div>
              <Button type="submit" className="w-full">Salvar Nota</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
