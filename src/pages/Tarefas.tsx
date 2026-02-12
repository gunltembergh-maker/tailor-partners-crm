import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Calendar } from "lucide-react";
import { formatDateTime, taskTipoLabels, taskStatusLabels, taskStatusColors } from "@/lib/format";

export default function Tarefas() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    tipo: "OUTRO", descricao: "", due_at: "", related_type: "" as string, related_id: "",
  });

  async function load() {
    const [tasksRes, leadsRes, clientsRes] = await Promise.all([
      supabase.from("tasks").select("*").order("due_at", { ascending: true }),
      supabase.from("leads").select("id, nome_razao"),
      supabase.from("clients").select("id, nome_razao"),
    ]);
    setTasks(tasksRes.data || []);
    setLeads(leadsRes.data || []);
    setClients(clientsRes.data || []);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("tasks").insert({
      tipo: form.tipo as any,
      descricao: form.descricao || null,
      due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
      related_type: form.related_type ? form.related_type as any : null,
      related_id: form.related_id || null,
      owner_id: user.id,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tarefa criada!" });
      setForm({ tipo: "OUTRO", descricao: "", due_at: "", related_type: "", related_id: "" });
      setOpen(false);
      load();
    }
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("tasks").update({ status: status as any }).eq("id", id);
    load();
  }

  const filtered = tasks.filter((t) => (t.descricao || "").toLowerCase().includes(search.toLowerCase()));

  const relatedOptions = form.related_type === "LEAD" ? leads : form.related_type === "CLIENT" ? clients : [];

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-display font-bold text-foreground">Tarefas</h1>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar tarefas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Nova Tarefa</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display">Nova Tarefa</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-3">
                  <div>
                    <Label>Tipo *</Label>
                    <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(taskTipoLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} /></div>
                  <div><Label>Vencimento</Label><Input type="datetime-local" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} /></div>
                  <div>
                    <Label>Relacionado a</Label>
                    <Select value={form.related_type} onValueChange={(v) => setForm({ ...form, related_type: v, related_id: "" })}>
                      <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LEAD">Lead</SelectItem>
                        <SelectItem value="CLIENT">Cliente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.related_type && relatedOptions.length > 0 && (
                    <div>
                      <Label>{form.related_type === "LEAD" ? "Lead" : "Cliente"}</Label>
                      <Select value={form.related_id} onValueChange={(v) => setForm({ ...form, related_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {relatedOptions.map((o: any) => (
                            <SelectItem key={o.id} value={o.id}>{o.nome_razao}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button type="submit" className="w-full">Criar Tarefa</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-3">
          {filtered.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">Nenhuma tarefa encontrada.</Card>
          )}
          {filtered.map((task) => (
            <Card key={task.id} className={`shadow-sm hover:shadow-md transition-shadow ${task.status === "CONCLUIDA" ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] shrink-0">{taskTipoLabels[task.tipo]}</Badge>
                      <h3 className={`font-semibold text-foreground truncate ${task.status === "CONCLUIDA" ? "line-through" : ""}`}>
                        {task.descricao || "Sem descrição"}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDateTime(task.due_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className={taskStatusColors[task.status]}>
                      {taskStatusLabels[task.status]}
                    </Badge>
                    <Select value={task.status} onValueChange={(v) => updateStatus(task.id, v)}>
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(taskStatusLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
