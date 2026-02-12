import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Plus, Search, ArrowUpDown } from "lucide-react";
import { formatCurrency, formatDate, opportunityStageLabels, opportunityStageColors } from "@/lib/format";

export default function Oportunidades() {
  const navigate = useNavigate();
  const [opps, setOpps] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("__all__");
  const [sortBy, setSortBy] = useState("recent");
  const [open, setOpen] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    titulo: "", origem: "LEAD", lead_id: "", client_id: "",
    valor_estimado: "", probabilidade: "50", close_date: "", observacoes: "",
  });

  async function load() {
    const [oppsRes, leadsRes, clientsRes] = await Promise.all([
      supabase.from("opportunities").select("*").order("created_at", { ascending: false }),
      supabase.from("leads").select("id, nome_razao"),
      supabase.from("clients").select("id, nome_razao"),
    ]);
    setOpps(oppsRes.data || []);
    setLeads(leadsRes.data || []);
    setClients(clientsRes.data || []);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("opportunities").insert({
      titulo: form.titulo,
      origem: form.origem,
      lead_id: form.origem === "LEAD" && form.lead_id ? form.lead_id : null,
      client_id: form.origem === "CLIENT" && form.client_id ? form.client_id : null,
      valor_estimado: form.valor_estimado ? parseFloat(form.valor_estimado) : 0,
      probabilidade: parseInt(form.probabilidade) || 50,
      close_date: form.close_date || null,
      observacoes: form.observacoes || null,
      owner_id: user.id,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Oportunidade criada!" });
      setForm({ titulo: "", origem: "LEAD", lead_id: "", client_id: "", valor_estimado: "", probabilidade: "50", close_date: "", observacoes: "" });
      setOpen(false);
      load();
    }
  }

  async function updateStage(id: string, stage: string) {
    await supabase.from("opportunities").update({ stage: stage as any }).eq("id", id);
    load();
  }

  const filtered = opps
    .filter((o) => o.titulo.toLowerCase().includes(search.toLowerCase()))
    .filter((o) => stageFilter === "__all__" || o.stage === stageFilter)
    .sort((a, b) => {
      if (sortBy === "recent") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "name") return a.titulo.localeCompare(b.titulo);
      if (sortBy === "value") return (b.valor_estimado || 0) - (a.valor_estimado || 0);
      return 0;
    });

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-display font-bold text-foreground">Oportunidades</h1>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Estágio" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {Object.entries(opportunityStageLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]"><ArrowUpDown className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="oldest">Mais antigos</SelectItem>
                <SelectItem value="name">Título A-Z</SelectItem>
                <SelectItem value="value">Maior valor</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Nova</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display">Nova Oportunidade</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-3">
                  <div><Label>Título *</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required /></div>
                  <div>
                    <Label>Origem</Label>
                    <Select value={form.origem} onValueChange={(v) => setForm({ ...form, origem: v, lead_id: "", client_id: "" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LEAD">Lead</SelectItem>
                        <SelectItem value="CLIENT">Cliente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.origem === "LEAD" && (
                    <div>
                      <Label>Lead</Label>
                      <Select value={form.lead_id} onValueChange={(v) => setForm({ ...form, lead_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione um lead" /></SelectTrigger>
                        <SelectContent>
                          {leads.map((l) => (
                            <SelectItem key={l.id} value={l.id}>{l.nome_razao}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {form.origem === "CLIENT" && (
                    <div>
                      <Label>Cliente</Label>
                      <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                        <SelectContent>
                          {clients.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.nome_razao}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Valor Estimado (R$)</Label><Input type="number" step="0.01" value={form.valor_estimado} onChange={(e) => setForm({ ...form, valor_estimado: e.target.value })} /></div>
                    <div><Label>Probabilidade (%)</Label><Input type="number" min="0" max="100" value={form.probabilidade} onChange={(e) => setForm({ ...form, probabilidade: e.target.value })} /></div>
                  </div>
                  <div><Label>Previsão de fechamento</Label><Input type="date" value={form.close_date} onChange={(e) => setForm({ ...form, close_date: e.target.value })} /></div>
                  <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} /></div>
                  <Button type="submit" className="w-full">Criar Oportunidade</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-3">
          {filtered.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">Nenhuma oportunidade encontrada.</Card>
          )}
          {filtered.map((opp) => (
            <Card
              key={opp.id}
              className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/oportunidades/${opp.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{opp.titulo}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(opp.valor_estimado)} · {opp.probabilidade}% · Prev: {formatDate(opp.close_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Badge variant="secondary" className={opportunityStageColors[opp.stage]}>
                      {opportunityStageLabels[opp.stage]}
                    </Badge>
                    <Select value={opp.stage} onValueChange={(v) => updateStage(opp.id, v)}>
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(opportunityStageLabels).map(([k, v]) => (
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
