import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, MoreHorizontal, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatCurrency, formatDate, clientStatusLabels, clientStatusColors, tipoPessoaLabels, taskTipoLabels } from "@/lib/format";

export default function Clientes() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [clients, setClients] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "__all__");
  const [bankerFilter, setBankerFilter] = useState("__all__");
  const [assessorFilter, setAssessorFilter] = useState("__all__");
  const [segmentoFilter, setSegmentoFilter] = useState("__all__");
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Quick action dialogs
  const [taskDialogClient, setTaskDialogClient] = useState<any>(null);
  const [noteDialogClient, setNoteDialogClient] = useState<any>(null);
  const [taskForm, setTaskForm] = useState({ tipo: "OUTRO", descricao: "", due_at: "" });
  const [noteText, setNoteText] = useState("");

  const [form, setForm] = useState({
    tipo_pessoa: "PF", nome_razao: "", cpf_cnpj: "", email: "", telefone: "",
    status: "ATIVO_NET", patrimonio_ou_receita: "", segmento: "", risco_ou_alertas: "", observacoes: "",
  });

  async function load() {
    const [clientsRes, profilesRes] = await Promise.all([
      supabase.from("clients").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name"),
    ]);
    setClients(clientsRes.data || []);
    setProfiles(profilesRes.data || []);
  }

  useEffect(() => { load(); }, []);

  const profileName = (userId: string | null) => {
    if (!userId) return "-";
    return profiles.find((p) => p.user_id === userId)?.full_name || "-";
  };

  const bankerDisplay = (client: any) => {
    if (client.banker_id) return profileName(client.banker_id);
    return client.banker_name || "-";
  };

  const assessorDisplay = (client: any) => {
    if (client.assessor_id) return profileName(client.assessor_id);
    return client.advisor_name || "-";
  };

  const segmentos = [...new Set(clients.map((c) => c.segmento).filter(Boolean))];
  const bankers = [...new Map(clients.filter((c) => c.banker_id).map((c) => [c.banker_id, profileName(c.banker_id)])).entries()].filter(([, name]) => name !== "-");
  const assessors = [...new Map(clients.filter((c) => c.assessor_id).map((c) => [c.assessor_id, profileName(c.assessor_id)])).entries()].filter(([, name]) => name !== "-");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("clients").insert({
      tipo_pessoa: form.tipo_pessoa as any,
      nome_razao: form.nome_razao,
      cpf_cnpj: form.cpf_cnpj || null,
      email: form.email || null,
      telefone: form.telefone || null,
      status: form.status as any,
      patrimonio_ou_receita: form.patrimonio_ou_receita ? parseFloat(form.patrimonio_ou_receita) : 0,
      segmento: form.segmento || null,
      risco_ou_alertas: form.risco_ou_alertas || null,
      observacoes: form.observacoes || null,
      banker_id: user.id,
      assessor_id: user.id,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cliente criado!" });
      setForm({ tipo_pessoa: "PF", nome_razao: "", cpf_cnpj: "", email: "", telefone: "", status: "ATIVO_NET", patrimonio_ou_receita: "", segmento: "", risco_ou_alertas: "", observacoes: "" });
      setOpen(false);
      load();
    }
  }

  async function toggleCritico(client: any) {
    const newStatus = client.status === "CRITICO" ? "ATIVO_NET" : "CRITICO";
    await supabase.from("clients").update({ status: newStatus as any }).eq("id", client.id);
    toast({ title: newStatus === "CRITICO" ? "Marcado como crítico" : "Status restaurado" });
    load();
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !taskDialogClient) return;
    const { error } = await supabase.from("tasks").insert({
      tipo: taskForm.tipo as any,
      descricao: taskForm.descricao || null,
      due_at: taskForm.due_at || null,
      related_type: "CLIENT" as any,
      related_id: taskDialogClient.id,
      owner_id: user.id,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tarefa criada!" });
      setTaskDialogClient(null);
      setTaskForm({ tipo: "OUTRO", descricao: "", due_at: "" });
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !noteDialogClient || !noteText.trim()) return;
    const { error } = await supabase.from("notes").insert({
      texto: noteText.trim(),
      related_type: "CLIENT" as any,
      related_id: noteDialogClient.id,
      author_id: user.id,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Nota adicionada!" });
      setNoteDialogClient(null);
      setNoteText("");
    }
  }

  const filtered = clients
    .filter((c) =>
      c.nome_razao.toLowerCase().includes(search.toLowerCase()) ||
      (c.cpf_cnpj || "").includes(search) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase())
    )
    .filter((c) => statusFilter === "__all__" || c.status === statusFilter)
    .filter((c) => bankerFilter === "__all__" || c.banker_id === bankerFilter)
    .filter((c) => assessorFilter === "__all__" || c.assessor_id === assessorFilter)
    .filter((c) => segmentoFilter === "__all__" || c.segmento === segmentoFilter);

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-display font-bold text-foreground">Contas</h1>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar contas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Nova Conta</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display">Nova Conta</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-3">
                  <div>
                    <Label>Tipo Pessoa</Label>
                    <Select value={form.tipo_pessoa} onValueChange={(v) => setForm({ ...form, tipo_pessoa: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(tipoPessoaLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Nome / Razão Social *</Label><Input value={form.nome_razao} onChange={(e) => setForm({ ...form, nome_razao: e.target.value })} required /></div>
                  <div><Label>CPF / CNPJ</Label><Input value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                    <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(clientStatusLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Patrimônio / Receita (R$)</Label><Input type="number" step="0.01" value={form.patrimonio_ou_receita} onChange={(e) => setForm({ ...form, patrimonio_ou_receita: e.target.value })} /></div>
                    <div><Label>Segmento</Label><Input value={form.segmento} onChange={(e) => setForm({ ...form, segmento: e.target.value })} /></div>
                  </div>
                  <div><Label>Risco / Alertas</Label><Input value={form.risco_ou_alertas} onChange={(e) => setForm({ ...form, risco_ou_alertas: e.target.value })} /></div>
                  <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} /></div>
                  <Button type="submit" className="w-full">Criar Conta</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos Status</SelectItem>
              {Object.entries(clientStatusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={bankerFilter} onValueChange={setBankerFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Banker" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos Bankers</SelectItem>
              {bankers.map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assessorFilter} onValueChange={setAssessorFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Assessor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos Assessores</SelectItem>
              {assessors.map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={segmentoFilter} onValueChange={setSegmentoFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Segmento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos Segmentos</SelectItem>
              {segmentos.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">Nenhuma conta encontrada.</Card>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome / Razão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Banker</TableHead>
                  <TableHead className="hidden md:table-cell">Assessor</TableHead>
                  <TableHead className="hidden lg:table-cell">Patrimônio</TableHead>
                  <TableHead className="hidden lg:table-cell">Últ. Contato</TableHead>
                  <TableHead className="hidden lg:table-cell">Próx. Ação</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((client) => (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/clientes/${client.id}`)}
                  >
                    <TableCell className="font-medium">{client.nome_razao}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={clientStatusColors[client.status]}>
                        {clientStatusLabels[client.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{bankerDisplay(client)}</TableCell>
                    <TableCell className="hidden md:table-cell">{assessorDisplay(client)}</TableCell>
                    <TableCell className="hidden lg:table-cell">{formatCurrency(client.patrimonio_ou_receita)}</TableCell>
                    <TableCell className="hidden lg:table-cell">{formatDate(client.last_contact_at)}</TableCell>
                    <TableCell className="hidden lg:table-cell">{formatDate(client.next_action_at)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => setTaskDialogClient(client)}>
                            <CheckCircle2 className="h-4 w-4 mr-2" />Criar tarefa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setNoteDialogClient(client)}>
                            Adicionar nota
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleCritico(client)}>
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            {client.status === "CRITICO" ? "Desmarcar crítico" : "Marcar como crítico"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Task Dialog */}
        <Dialog open={!!taskDialogClient} onOpenChange={(v) => !v && setTaskDialogClient(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Criar Tarefa — {taskDialogClient?.nome_razao}</DialogTitle></DialogHeader>
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
              <div><Label>Descrição</Label><Input value={taskForm.descricao} onChange={(e) => setTaskForm({ ...taskForm, descricao: e.target.value })} /></div>
              <div><Label>Prazo</Label><Input type="datetime-local" value={taskForm.due_at} onChange={(e) => setTaskForm({ ...taskForm, due_at: e.target.value })} /></div>
              <Button type="submit" className="w-full">Criar</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Note Dialog */}
        <Dialog open={!!noteDialogClient} onOpenChange={(v) => !v && setNoteDialogClient(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Nota — {noteDialogClient?.nome_razao}</DialogTitle></DialogHeader>
            <form onSubmit={handleAddNote} className="space-y-3">
              <Textarea placeholder="Escreva a nota..." value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={3} />
              <Button type="submit" className="w-full" disabled={!noteText.trim()}>Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
