import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import TailorLoader from "@/components/TailorLoader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Search, Info, X } from "lucide-react";

const CANAIS = ["XP", "Avenue", "Morgan Stanley", "Itaú", "Gestora"];

interface AccessRule {
  profile_id: string;
  full_name: string;
  email: string;
  bankers: string[] | null;
  finders: string[] | null;
  advisors: string[] | null;
  documentos: string[] | null;
  canais: string[] | null;
  descricao: string | null;
}

function ChipSelect({
  options,
  selected,
  onChange,
  label,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  label: string;
}) {
  const allSelected = selected.length === 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          variant={allSelected ? "default" : "outline"}
          size="sm"
          onClick={() => onChange([])}
          className="text-xs"
        >
          Todos
        </Button>
        <span className="text-xs text-muted-foreground">
          {allSelected ? `Sem restrição de ${label}` : `${selected.length} selecionado(s)`}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <Badge
              key={opt}
              variant={isSelected ? "default" : "outline"}
              className="cursor-pointer select-none text-xs"
              onClick={() => {
                if (isSelected) {
                  onChange(selected.filter((s) => s !== opt));
                } else {
                  onChange([...selected, opt]);
                }
              }}
            >
              {opt}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}

function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const addTag = () => {
    const clean = input.replace(/[^\d]/g, "").trim();
    if (clean && !tags.includes(clean)) {
      onChange([...tags, clean]);
    }
    setInput("");
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addTag(); }
          }}
          placeholder="Digite o CPF ou CNPJ e pressione Enter"
          className="flex-1"
        />
        <Button variant="outline" size="sm" onClick={addTag}>Adicionar</Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onChange(tags.filter((t) => t !== tag))}
              />
            </Badge>
          ))}
        </div>
      )}
      {tags.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhum documento específico — todos os clientes dos bankers/finders selecionados</p>
      )}
    </div>
  );
}

function RuleSummary({ rule }: { rule: AccessRule }) {
  const hasBankers = rule.bankers && rule.bankers.length > 0;
  const hasFinders = rule.finders && rule.finders.length > 0;
  const hasDocs = rule.documentos && rule.documentos.length > 0;
  const hasCanais = rule.canais && rule.canais.length > 0;
  const hasRule = hasBankers || hasFinders || hasDocs || hasCanais;

  if (!hasRule) {
    return <Badge variant="secondary" className="text-xs">Padrão do perfil</Badge>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {hasBankers && (
        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
          📊 FA: {rule.bankers!.join(", ")}
        </Badge>
      )}
      {hasFinders && (
        <Badge variant="outline" className="text-xs bg-teal-50 text-teal-700 border-teal-200">
          🔗 Finder: {rule.finders!.join(", ")}
        </Badge>
      )}
      {hasDocs && (
        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
          👤 {rule.documentos!.length} clientes específicos
        </Badge>
      )}
      {hasCanais && (
        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
          🏦 {rule.canais!.join(", ")}
        </Badge>
      )}
    </div>
  );
}

export default function RegrasAcesso() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<AccessRule | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<AccessRule | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formBankers, setFormBankers] = useState<string[]>([]);
  const [formFinders, setFormFinders] = useState<string[]>([]);
  const [formDocumentos, setFormDocumentos] = useState<string[]>([]);
  const [formCanais, setFormCanais] = useState<string[]>([]);
  const [formDescricao, setFormDescricao] = useState("");

  const { data: rules, isLoading } = useQuery({
    queryKey: ["admin-access-rules"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_admin_listar_access_rules" as any);
      if (error) throw error;
      return data as AccessRule[];
    },
  });

  const { data: bankerOptions } = useQuery({
    queryKey: ["admin-banker-options"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_filtro_financial_advisors" as any);
      if (error) throw error;
      return (data as any[])?.map((r: any) => r.banker).filter(Boolean).sort() as string[];
    },
  });

  const { data: finderOptions } = useQuery({
    queryKey: ["admin-finder-options"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_filtro_finders" as any);
      if (error) throw error;
      return (data as any[])?.map((r: any) => r.finder).filter(Boolean).sort() as string[];
    },
  });

  const openEdit = useCallback((rule: AccessRule) => {
    setEditUser(rule);
    setFormBankers(rule.bankers || []);
    setFormFinders(rule.finders || []);
    setFormDocumentos(rule.documentos || []);
    setFormCanais(rule.canais || []);
    setFormDescricao(rule.descricao || "");
  }, []);

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc("rpc_admin_salvar_access_rule" as any, {
        p_profile_id: editUser.profile_id,
        p_bankers: formBankers.length > 0 ? formBankers : null,
        p_finders: formFinders.length > 0 ? formFinders : null,
        p_advisors: null,
        p_documentos: formDocumentos.length > 0 ? formDocumentos : null,
        p_canais: formCanais.length > 0 ? formCanais : null,
        p_descricao: formDescricao || null,
      });
      if (error) throw error;
      toast.success("Regra de acesso salva com sucesso");
      setEditUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-access-rules"] });
    } catch (err: any) {
      toast.error("Erro ao salvar regra: " + (err.message || "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirmRemove) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc("rpc_admin_remover_access_rule" as any, {
        p_profile_id: confirmRemove.profile_id,
      });
      if (error) throw error;
      toast.success("Regra removida — usuário voltou ao padrão do perfil");
      setConfirmRemove(null);
      setEditUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-access-rules"] });
    } catch (err: any) {
      toast.error("Erro ao remover regra: " + (err.message || "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  const filtered = (rules || []).filter(
    (r) =>
      r.full_name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <AppLayout>
        <TailorLoader />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Regras de Acesso</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure quais dados cada usuário pode visualizar no dashboard
          </p>
        </div>

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
              <Info className="h-4 w-4" />
              Como funciona?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-blue-700 space-y-1">
            <p>• <strong>Gestora</strong> → selecione FA: Gestora</p>
            <p>• <strong>Dois advisors</strong> → selecione FA: Raphael Pereira + Leonardo Burle</p>
            <p>• <strong>Clientes específicos</strong> → adicione os CPFs no campo Clientes</p>
            <p>• <strong>Canal XP apenas</strong> → marque somente XP em Canal</p>
            <p className="pt-1 text-blue-600">Filtros são combinados com AND. Campos vazios = sem restrição.</p>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Regra atual</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((rule) => (
                  <TableRow key={rule.profile_id}>
                    <TableCell className="font-medium">{rule.full_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{rule.email}</TableCell>
                    <TableCell><RuleSummary rule={rule} /></TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => openEdit(rule)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Acesso — {editUser?.full_name}</DialogTitle>
          </DialogHeader>

          <Accordion type="multiple" defaultValue={["bankers", "finders"]} className="w-full">
            <AccordionItem value="bankers">
              <AccordionTrigger className="text-sm">📊 Financial Advisors (Bankers)</AccordionTrigger>
              <AccordionContent>
                <ChipSelect
                  options={bankerOptions || []}
                  selected={formBankers}
                  onChange={setFormBankers}
                  label="banker"
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="finders">
              <AccordionTrigger className="text-sm">🔗 Finders</AccordionTrigger>
              <AccordionContent>
                <ChipSelect
                  options={finderOptions || []}
                  selected={formFinders}
                  onChange={setFormFinders}
                  label="finder"
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="documentos">
              <AccordionTrigger className="text-sm">👤 Clientes Específicos</AccordionTrigger>
              <AccordionContent>
                <TagInput tags={formDocumentos} onChange={setFormDocumentos} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="canais">
              <AccordionTrigger className="text-sm">🏦 Canal / Casa</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Button
                      variant={formCanais.length === 0 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFormCanais([])}
                      className="text-xs"
                    >
                      Todos
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {formCanais.length === 0 ? "Sem restrição de canal" : `${formCanais.length} selecionado(s)`}
                    </span>
                  </div>
                  {CANAIS.map((canal) => (
                    <div key={canal} className="flex items-center gap-2">
                      <Checkbox
                        id={`canal-${canal}`}
                        checked={formCanais.includes(canal)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormCanais([...formCanais, canal]);
                          } else {
                            setFormCanais(formCanais.filter((c) => c !== canal));
                          }
                        }}
                      />
                      <Label htmlFor={`canal-${canal}`} className="text-sm cursor-pointer">
                        {canal}
                      </Label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="descricao">
              <AccordionTrigger className="text-sm">📝 Descrição</AccordionTrigger>
              <AccordionContent>
                <Textarea
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  placeholder="Ex: Vê carteira da Gestora + Pedro Chagas"
                  rows={2}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialog open={!!confirmRemove} onOpenChange={(open) => !open && setConfirmRemove(null)}>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmRemove(editUser)}
                className="mr-auto"
              >
                Remover regra
              </Button>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover regra de acesso?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O usuário voltará ao acesso padrão definido pelo perfil.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRemove} disabled={saving}>
                    Confirmar remoção
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
