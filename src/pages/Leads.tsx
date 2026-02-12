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
import { Plus, Search } from "lucide-react";
import { formatCurrency, formatDate, leadStatusLabels, leadStatusColors, canalOrigemLabels, tipoPessoaLabels } from "@/lib/format";

export default function Leads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    tipo_pessoa: "PF", nome_razao: "", cpf_cnpj: "", email: "", telefone: "",
    canal_origem: "Outro", valor_potencial: "", segmento: "", score: "", observacoes: "",
  });

  async function loadLeads() {
    const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    setLeads(data || []);
  }

  useEffect(() => { loadLeads(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("leads").insert({
      tipo_pessoa: form.tipo_pessoa as any,
      nome_razao: form.nome_razao,
      cpf_cnpj: form.cpf_cnpj || null,
      email: form.email || null,
      telefone: form.telefone || null,
      canal_origem: form.canal_origem,
      valor_potencial: form.valor_potencial ? parseFloat(form.valor_potencial) : 0,
      segmento: form.segmento || null,
      score: form.score ? parseInt(form.score) : null,
      observacoes: form.observacoes || null,
      owner_id: user.id,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Lead criado!" });
      setForm({ tipo_pessoa: "PF", nome_razao: "", cpf_cnpj: "", email: "", telefone: "", canal_origem: "Outro", valor_potencial: "", segmento: "", score: "", observacoes: "" });
      setOpen(false);
      loadLeads();
    }
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("leads").update({ status: status as any }).eq("id", id);
    loadLeads();
  }

  const filtered = leads.filter(
    (l) =>
      l.nome_razao.toLowerCase().includes(search.toLowerCase()) ||
      (l.cpf_cnpj || "").includes(search) ||
      (l.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-display font-bold text-foreground">Leads</h1>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Novo Lead</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display">Novo Lead</DialogTitle>
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
                    <Label>Canal de Origem</Label>
                    <Select value={form.canal_origem} onValueChange={(v) => setForm({ ...form, canal_origem: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(canalOrigemLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Valor Potencial (R$)</Label><Input type="number" step="0.01" value={form.valor_potencial} onChange={(e) => setForm({ ...form, valor_potencial: e.target.value })} /></div>
                    <div><Label>Score (0-100)</Label><Input type="number" min="0" max="100" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} /></div>
                  </div>
                  <div><Label>Segmento</Label><Input value={form.segmento} onChange={(e) => setForm({ ...form, segmento: e.target.value })} /></div>
                  <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} /></div>
                  <Button type="submit" className="w-full">Criar Lead</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-3">
          {filtered.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">Nenhum lead encontrado.</Card>
          )}
          {filtered.map((lead) => (
            <Card key={lead.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate">{lead.nome_razao}</h3>
                      <Badge variant="outline" className="text-[10px] shrink-0">{tipoPessoaLabels[lead.tipo_pessoa]}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {lead.email && `${lead.email} · `}{lead.telefone}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(lead.created_at)} · {formatCurrency(lead.valor_potencial)}
                      {lead.segmento && ` · ${lead.segmento}`}
                      {lead.score != null && ` · Score: ${lead.score}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className={leadStatusColors[lead.status]}>
                      {leadStatusLabels[lead.status]}
                    </Badge>
                    <Select value={lead.status} onValueChange={(v) => updateStatus(lead.id, v)}>
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(leadStatusLabels).map(([k, v]) => (
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
