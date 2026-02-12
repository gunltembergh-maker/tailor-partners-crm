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
import { formatCurrency, formatDate, opportunityStageLabels } from "@/lib/format";
import { Tables } from "@/integrations/supabase/types";

type Opportunity = Tables<"opportunities">;

const stageColors: Record<string, string> = {
  prospeccao: "bg-tailor-blue/10 text-tailor-blue",
  qualificacao: "bg-tailor-copper/10 text-tailor-copper",
  proposta: "bg-tailor-warning/10 text-tailor-warning",
  negociacao: "bg-accent/10 text-accent",
  fechado_ganho: "bg-tailor-success/20 text-tailor-success",
  fechado_perdido: "bg-destructive/10 text-destructive",
};

export default function Oportunidades() {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: "", value: "", probability: "50", expected_close_date: "", notes: "",
  });

  async function load() {
    const { data } = await supabase.from("opportunities").select("*").order("created_at", { ascending: false });
    setOpps(data || []);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("opportunities").insert({
      title: form.title,
      value: form.value ? parseFloat(form.value) : 0,
      probability: parseInt(form.probability) || 50,
      expected_close_date: form.expected_close_date || null,
      notes: form.notes || null,
      created_by: user.id,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Oportunidade criada!" });
      setForm({ title: "", value: "", probability: "50", expected_close_date: "", notes: "" });
      setOpen(false);
      load();
    }
  }

  async function updateStage(id: string, stage: string) {
    await supabase.from("opportunities").update({ stage: stage as Opportunity["stage"] }).eq("id", id);
    load();
  }

  const filtered = opps.filter((o) => o.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-display font-bold text-foreground">Oportunidades</h1>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Nova Oportunidade</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display">Nova Oportunidade</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-3">
                  <div><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
                    <div><Label>Probabilidade (%)</Label><Input type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} /></div>
                  </div>
                  <div><Label>Previsão de fechamento</Label><Input type="date" value={form.expected_close_date} onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })} /></div>
                  <div><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
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
            <Card key={opp.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{opp.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(opp.value)} · {opp.probability}% · Prev: {formatDate(opp.expected_close_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className={stageColors[opp.stage]}>
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
