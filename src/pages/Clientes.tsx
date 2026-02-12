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
import { Plus, Search, Building2 } from "lucide-react";
import { formatCurrency, formatDate, clientStatusLabels, clientStatusColors, tipoPessoaLabels } from "@/lib/format";

export default function Clientes() {
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    tipo_pessoa: "PF", nome_razao: "", cpf_cnpj: "", email: "", telefone: "",
    status: "ATIVO_NET", patrimonio_ou_receita: "", segmento: "", risco_ou_alertas: "", observacoes: "",
  });

  async function load() {
    const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    setClients(data || []);
  }

  useEffect(() => { load(); }, []);

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

  async function updateStatus(id: string, status: string) {
    await supabase.from("clients").update({ status: status as any }).eq("id", id);
    load();
  }

  const filtered = clients.filter(
    (c) =>
      c.nome_razao.toLowerCase().includes(search.toLowerCase()) ||
      (c.cpf_cnpj || "").includes(search) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-display font-bold text-foreground">Clientes</h1>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar clientes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Novo Cliente</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display">Novo Cliente</DialogTitle>
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
                  <Button type="submit" className="w-full">Criar Cliente</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-3">
          {filtered.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">Nenhum cliente encontrado.</Card>
          )}
          {filtered.map((client) => (
            <Card key={client.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-secondary rounded-lg shrink-0">
                    <Building2 className="h-5 w-5 text-tailor-copper" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate">{client.nome_razao}</h3>
                      <Badge variant="outline" className="text-[10px] shrink-0">{tipoPessoaLabels[client.tipo_pessoa]}</Badge>
                      <Badge variant="secondary" className={clientStatusColors[client.status]}>
                        {clientStatusLabels[client.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {client.segmento && `${client.segmento} · `}{client.cpf_cnpj}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                      {client.email && <span>{client.email}</span>}
                      {client.telefone && <span>{client.telefone}</span>}
                      <span>Patrimônio: {formatCurrency(client.patrimonio_ou_receita)}</span>
                      <span>{formatDate(client.created_at)}</span>
                    </div>
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
