import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { Plus, Search, Loader2, ArrowUpDown } from "lucide-react";
import { formatCurrency, formatDate, isDaysAgo, leadStatusLabels, leadStatusColors, canalOrigemLabels, tipoPessoaLabels, porteLabels, canalRelacionamentoLabels, estadosBR } from "@/lib/format";

export default function Leads() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [leads, setLeads] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "__all__");
  const [customFilter, setCustomFilter] = useState(searchParams.get("filter") || "");
  const [sortBy, setSortBy] = useState("recent");
  const [open, setOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    tipo_pessoa: "PF", nome_razao: "", cpf_cnpj: "", email: "", telefone: "",
    canal_origem: "Outro", valor_potencial: "", segmento: "", score: "", observacoes: "",
    porte: "", canal_relacionamento: "",
    logradouro: "", numero: "", complemento: "", bairro: "", cep: "", cidade: "", estado: "",
  });

  async function loadLeads() {
    const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    setLeads(data || []);
  }

  useEffect(() => { loadLeads(); }, []);

  async function consultarCNPJ() {
    if (!form.cpf_cnpj) {
      toast({ title: "Informe o CNPJ", variant: "destructive" });
      return;
    }
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("consulta-cnpj", {
        body: { cnpj: form.cpf_cnpj },
      });
      if (error || data?.error) {
        toast({ title: "Erro", description: data?.error || error?.message || "CNPJ não encontrado", variant: "destructive" });
      } else {
        setForm((prev) => ({
          ...prev,
          nome_razao: data.razao_social || prev.nome_razao,
          email: data.email || prev.email,
          telefone: data.telefone || prev.telefone,
          segmento: data.atividade_principal || prev.segmento,
          porte: data.porte || prev.porte,
          logradouro: data.logradouro || prev.logradouro,
          numero: data.numero || prev.numero,
          complemento: data.complemento || prev.complemento,
          bairro: data.bairro || prev.bairro,
          cep: data.cep || prev.cep,
          cidade: data.municipio || prev.cidade,
          estado: data.uf || prev.estado,
        }));
        toast({ title: "CNPJ encontrado!", description: "Dados preenchidos automaticamente." });
      }
    } catch (err: any) {
      toast({ title: "Erro na consulta", description: err.message, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  }

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
      porte: form.tipo_pessoa === "PJ" && form.porte ? form.porte : null,
      canal_relacionamento: form.canal_relacionamento || null,
      logradouro: form.logradouro || null,
      numero: form.numero || null,
      complemento: form.complemento || null,
      bairro: form.bairro || null,
      cep: form.cep || null,
      cidade: form.cidade || null,
      estado: form.estado || null,
    } as any);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Lead criado!" });
      setForm({ tipo_pessoa: "PF", nome_razao: "", cpf_cnpj: "", email: "", telefone: "", canal_origem: "Outro", valor_potencial: "", segmento: "", score: "", observacoes: "", porte: "", canal_relacionamento: "", logradouro: "", numero: "", complemento: "", bairro: "", cep: "", cidade: "", estado: "" });
      setOpen(false);
      loadLeads();
    }
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("leads").update({ status: status as any }).eq("id", id);
    loadLeads();
  }

  const filtered = leads
    .filter((l) =>
      l.nome_razao.toLowerCase().includes(search.toLowerCase()) ||
      (l.cpf_cnpj || "").includes(search) ||
      (l.email || "").toLowerCase().includes(search.toLowerCase())
    )
    .filter((l) => statusFilter === "__all__" || l.status === statusFilter)
    .filter((l) => {
      if (customFilter === "sem_contato") {
        return !l.last_contact_at || isDaysAgo(l.last_contact_at, 30);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "recent") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "name") return a.nome_razao.localeCompare(b.nome_razao);
      return 0;
    });

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-display font-bold text-foreground">Leads</h1>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {Object.entries(leadStatusLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]"><ArrowUpDown className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="oldest">Mais antigos</SelectItem>
                <SelectItem value="name">Nome A-Z</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Novo</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display">Novo Lead</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-3">
                  <div>
                    <Label>Tipo Pessoa</Label>
                    <Select value={form.tipo_pessoa} onValueChange={(v) => setForm({ ...form, tipo_pessoa: v, cpf_cnpj: "", porte: "" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(tipoPessoaLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {form.tipo_pessoa === "PJ" ? (
                    <div>
                      <Label>CNPJ</Label>
                      <div className="flex gap-2">
                        <Input value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} placeholder="00.000.000/0000-00" className="flex-1" />
                        <Button type="button" variant="outline" onClick={consultarCNPJ} disabled={isSearching} className="shrink-0">
                          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Consultar"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label>CPF</Label>
                      <Input value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} placeholder="000.000.000-00" />
                    </div>
                  )}

                  <div><Label>Nome / Razão Social *</Label><Input value={form.nome_razao} onChange={(e) => setForm({ ...form, nome_razao: e.target.value })} required /></div>
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

                  {form.tipo_pessoa === "PJ" && (
                    <div>
                      <Label>Porte</Label>
                      <Select value={form.porte} onValueChange={(v) => setForm({ ...form, porte: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione o porte" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(porteLabels).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label>Canal de Relacionamento</Label>
                    <Select value={form.canal_relacionamento} onValueChange={(v) => setForm({ ...form, canal_relacionamento: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione o canal" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(canalRelacionamentoLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold">Endereço</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2"><Input placeholder="Logradouro (Rua/Av)" value={form.logradouro} onChange={(e) => setForm({ ...form, logradouro: e.target.value })} /></div>
                      <div><Input placeholder="Número" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} /></div>
                    </div>
                    <Input placeholder="Complemento" value={form.complemento} onChange={(e) => setForm({ ...form, complemento: e.target.value })} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Bairro" value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} />
                      <Input placeholder="CEP" value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Cidade" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
                      <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                        <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(estadosBR).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
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
            <Card
              key={lead.id}
              className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/leads/${lead.id}`)}
            >
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
                      {lead.porte && ` · Porte: ${porteLabels[lead.porte] || lead.porte}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
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
