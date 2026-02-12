import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText, ClipboardList, MessageSquare, Briefcase, Plus, Link2 } from "lucide-react";
import {
  formatCurrency, formatDate, formatDateTime,
  clientStatusLabels, clientStatusColors, tipoPessoaLabels,
  taskTipoLabels, taskStatusLabels, taskStatusColors,
  opportunityStageLabels, opportunityStageColors,
} from "@/lib/format";

export default function ClienteDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [client, setClient] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [unlinkedOpps, setUnlinkedOpps] = useState<any[]>([]);

  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Dialogs
  const [newOppOpen, setNewOppOpen] = useState(false);
  const [linkOppOpen, setLinkOppOpen] = useState(false);
  const [oppForm, setOppForm] = useState({ titulo: "", valor_estimado: "", probabilidade: "50", close_date: "", observacoes: "" });
  const [selectedOppId, setSelectedOppId] = useState("");

  async function loadAll() {
    if (!id) return;
    const [clientRes, tasksRes, notesRes, oppsRes, unlinkedRes] = await Promise.all([
      supabase.from("clients").select("*").eq("id", id).single(),
      supabase.from("tasks").select("*").eq("related_type", "CLIENT").eq("related_id", id).order("due_at", { ascending: true }),
      supabase.from("notes").select("*").eq("related_type", "CLIENT").eq("related_id", id).order("created_at", { ascending: false }),
      supabase.from("opportunities").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("opportunities").select("id, titulo, valor_estimado, stage").is("client_id", null),
    ]);
    setClient(clientRes.data);
    setTasks(tasksRes.data || []);
    setNotes(notesRes.data || []);
    setOpportunities(oppsRes.data || []);
    setUnlinkedOpps(unlinkedRes.data || []);
  }

  useEffect(() => { loadAll(); }, [id]);

  async function addNote() {
    if (!newNote.trim() || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from("notes").insert({
      texto: newNote.trim(),
      related_type: "CLIENT" as any,
      related_id: id!,
      author_id: user.id,
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { setNewNote(""); loadAll(); }
    setSubmitting(false);
  }

  async function handleCreateOpp(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("opportunities").insert({
      titulo: oppForm.titulo,
      client_id: id!,
      valor_estimado: oppForm.valor_estimado ? parseFloat(oppForm.valor_estimado) : 0,
      probabilidade: parseInt(oppForm.probabilidade) || 50,
      close_date: oppForm.close_date || null,
      observacoes: oppForm.observacoes || null,
      owner_id: user.id,
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Oportunidade criada!" });
      setOppForm({ titulo: "", valor_estimado: "", probabilidade: "50", close_date: "", observacoes: "" });
      setNewOppOpen(false);
      loadAll();
    }
  }

  async function handleLinkOpp() {
    if (!selectedOppId) return;
    const { error } = await supabase.from("opportunities").update({ client_id: id! }).eq("id", selectedOppId);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Oportunidade vinculada!" });
      setSelectedOppId("");
      setLinkOppOpen(false);
      loadAll();
    }
  }

  if (!client) {
    return (
      <AppLayout>
        <div className="animate-fade-in p-8 text-center text-muted-foreground">Carregando...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clientes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{client.nome_razao}</h1>
            <p className="text-sm text-muted-foreground">Conta · {clientStatusLabels[client.status]}</p>
          </div>
        </div>

        <Tabs defaultValue="resumo">
          <TabsList className="mb-4">
            <TabsTrigger value="resumo" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Resumo</TabsTrigger>
            <TabsTrigger value="tarefas" className="gap-1.5"><ClipboardList className="h-3.5 w-3.5" />Tarefas</TabsTrigger>
            <TabsTrigger value="historico" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" />Histórico</TabsTrigger>
            <TabsTrigger value="oportunidades" className="gap-1.5"><Briefcase className="h-3.5 w-3.5" />Oportunidades</TabsTrigger>
          </TabsList>

          {/* RESUMO */}
          <TabsContent value="resumo">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-display font-semibold text-foreground">Informações Gerais</h3>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <span className="text-muted-foreground">Tipo</span>
                    <span>{tipoPessoaLabels[client.tipo_pessoa]}</span>
                    <span className="text-muted-foreground">CPF/CNPJ</span>
                    <span>{client.cpf_cnpj || "-"}</span>
                    <span className="text-muted-foreground">E-mail</span>
                    <span>{client.email || "-"}</span>
                    <span className="text-muted-foreground">Telefone</span>
                    <span>{client.telefone || "-"}</span>
                    <span className="text-muted-foreground">Segmento</span>
                    <span>{client.segmento || "-"}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-display font-semibold text-foreground">Dados Comerciais</h3>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="secondary" className={clientStatusColors[client.status]}>{clientStatusLabels[client.status]}</Badge>
                    <span className="text-muted-foreground">Patrimônio</span>
                    <span>{formatCurrency(client.patrimonio_ou_receita)}</span>
                    <span className="text-muted-foreground">Risco/Alertas</span>
                    <span>{client.risco_ou_alertas || "-"}</span>
                    <span className="text-muted-foreground">Criado em</span>
                    <span>{formatDate(client.created_at)}</span>
                  </div>
                  {client.observacoes && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-1">Observações</p>
                      <p className="text-sm">{client.observacoes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAREFAS */}
          <TabsContent value="tarefas">
            <div className="space-y-3">
              {tasks.length === 0 && (
                <Card className="p-6 text-center text-muted-foreground">Nenhuma tarefa vinculada.</Card>
              )}
              {tasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{task.descricao || taskTipoLabels[task.tipo]}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.due_at ? `Vence: ${formatDateTime(task.due_at)}` : "Sem prazo"}
                      </p>
                    </div>
                    <Badge variant="secondary" className={taskStatusColors[task.status]}>
                      {taskStatusLabels[task.status]}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* HISTÓRICO */}
          <TabsContent value="historico">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Textarea placeholder="Adicionar nota..." value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={2} className="flex-1" />
                <Button onClick={addNote} disabled={submitting || !newNote.trim()} className="self-end">Salvar</Button>
              </div>
              {notes.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhuma nota registrada.</p>}
              <div className="relative pl-6 border-l-2 border-border space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className="relative">
                    <div className="absolute -left-[1.55rem] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{note.texto}</p>
                        <p className="text-xs text-muted-foreground mt-2">{formatDateTime(note.created_at)}</p>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* OPORTUNIDADES */}
          <TabsContent value="oportunidades">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={() => setNewOppOpen(true)}><Plus className="h-4 w-4 mr-2" />Nova Oportunidade</Button>
                <Button variant="outline" onClick={() => setLinkOppOpen(true)}><Link2 className="h-4 w-4 mr-2" />Vincular Existente</Button>
              </div>

              {opportunities.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">Nenhuma oportunidade vinculada.</Card>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Estágio</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Fechamento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {opportunities.map((opp) => (
                        <TableRow key={opp.id} className="cursor-pointer" onClick={() => navigate(`/oportunidades/${opp.id}`)}>
                          <TableCell className="font-medium">{opp.titulo}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={opportunityStageColors[opp.stage]}>{opportunityStageLabels[opp.stage]}</Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(opp.valor_estimado)}</TableCell>
                          <TableCell>{formatDate(opp.close_date)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* New Opportunity Dialog */}
            <Dialog open={newOppOpen} onOpenChange={setNewOppOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Nova Oportunidade</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateOpp} className="space-y-3">
                  <div><Label>Título *</Label><Input value={oppForm.titulo} onChange={(e) => setOppForm({ ...oppForm, titulo: e.target.value })} required /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={oppForm.valor_estimado} onChange={(e) => setOppForm({ ...oppForm, valor_estimado: e.target.value })} /></div>
                    <div><Label>Probabilidade (%)</Label><Input type="number" min="0" max="100" value={oppForm.probabilidade} onChange={(e) => setOppForm({ ...oppForm, probabilidade: e.target.value })} /></div>
                  </div>
                  <div><Label>Prev. Fechamento</Label><Input type="date" value={oppForm.close_date} onChange={(e) => setOppForm({ ...oppForm, close_date: e.target.value })} /></div>
                  <div><Label>Observações</Label><Textarea value={oppForm.observacoes} onChange={(e) => setOppForm({ ...oppForm, observacoes: e.target.value })} rows={2} /></div>
                  <Button type="submit" className="w-full">Criar</Button>
                </form>
              </DialogContent>
            </Dialog>

            {/* Link Existing Dialog */}
            <Dialog open={linkOppOpen} onOpenChange={setLinkOppOpen}>
              <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>Vincular Oportunidade</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  {unlinkedOpps.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma oportunidade sem cliente disponível.</p>
                  ) : (
                    <>
                      <Select value={selectedOppId} onValueChange={setSelectedOppId}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {unlinkedOpps.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.titulo} — {formatCurrency(o.valor_estimado)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={handleLinkOpp} disabled={!selectedOppId} className="w-full">Vincular</Button>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
