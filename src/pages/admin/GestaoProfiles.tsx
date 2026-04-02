import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import TailorLoader from "@/components/TailorLoader";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2 } from "lucide-react";

const BADGE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-600 text-white hover:bg-red-600",
  LIDER: "bg-purple-600 text-white hover:bg-purple-600",
  BANKER: "bg-blue-600 text-white hover:bg-blue-600",
  "FINANCIAL ADVISOR": "bg-blue-600 text-white hover:bg-blue-600",
  DIRETORIA: "bg-orange-500 text-white hover:bg-orange-500",
  RH: "bg-green-600 text-white hover:bg-green-600",
  JURIDICO: "bg-gray-500 text-white hover:bg-gray-500",
  MARKETING: "bg-pink-500 text-white hover:bg-pink-500",
};

const DEFAULT_PROFILES = ["ADMIN", "LIDER", "BANKER", "DIRETORIA"];

const PERMISSION_GROUPS = [
  {
    title: "Menu Principal (CRM)",
    items: [
      { key: "menu_inicio", label: "Início", desc: "Página inicial com resumo do CRM" },
      { key: "menu_prioridades", label: "Prioridades", desc: "Clientes prioritários" },
      { key: "menu_leads", label: "Leads", desc: "Gestão de leads" },
      { key: "menu_contas", label: "Contas", desc: "Clientes e contas" },
      { key: "menu_tarefas", label: "Tarefas", desc: "Gestão de tarefas" },
      { key: "menu_calendario", label: "Calendário", desc: "Agenda e compromissos" },
      { key: "menu_oportunidades", label: "Oportunidades", desc: "Pipeline de oportunidades" },
      { key: "menu_paineis", label: "Painéis", desc: "Painéis analíticos" },
      { key: "menu_relatorios", label: "Relatórios", desc: "Relatórios gerenciais" },
    ],
  },
  {
    title: "Dashboards",
    items: [
      { key: "menu_dashboard_comercial", label: "Dashboard Comercial", desc: "Acesso à página principal de dashboards" },
      { key: "menu_quantitativo", label: "Dashboard Quantitativo", desc: "Aba com KPIs de captação, AuC e receita" },
      { key: "menu_qualitativo", label: "Dashboard Qualitativo", desc: "Aba com custódia, ROA e vencimentos" },
    ],
  },
  {
    title: "Admin",
    items: [
      { key: "menu_importar_bases", label: "Importar Bases", desc: "Página de upload de arquivos" },
      { key: "menu_auditoria", label: "Auditoria Comercial", desc: "Relatórios de auditoria" },
      { key: "menu_gestao_usuarios", label: "Gestão de Usuários", desc: "Administrar usuários do Hub" },
      { key: "menu_perfis_acesso", label: "Perfis de Acesso", desc: "Esta tela — gerenciar perfis" },
      { key: "menu_regras_acesso", label: "Regras de Acesso", desc: "Gerenciar regras de visualização de dados" },
    ],
  },
  {
    title: "Dados e Visualização",
    items: [
      { key: "dados_ver_todos_bankers", label: "Ver todos os Financial Advisors", desc: "Visualiza dados de toda a equipe" },
      { key: "dados_filtro_banker", label: "Usar filtro de Financial Advisor", desc: "Pode filtrar por Financial Advisor" },
      { key: "dados_filtro_finder", label: "Usar filtro de Finder", desc: "Pode filtrar por Finder" },
      { key: "dados_exportar", label: "Exportar dados", desc: "Pode exportar tabelas e relatórios" },
    ],
  },
];

interface Perfil {
  id: string;
  nome: string;
  descricao: string | null;
  permissoes: Record<string, boolean>;
  created_at: string;
}

function ProfileCard({ perfil, onRefetch }: { perfil: Perfil; onRefetch: () => void }) {
  const { toast } = useToast();
  const [descricao, setDescricao] = useState(perfil.descricao ?? "");
  const [permissoes, setPermissoes] = useState<Record<string, boolean>>(
    (perfil.permissoes as Record<string, boolean>) ?? {}
  );
  const [saving, setSaving] = useState(false);

  const isDefault = DEFAULT_PROFILES.includes(perfil.nome);

  const isModified =
    descricao !== (perfil.descricao ?? "") ||
    JSON.stringify(permissoes) !== JSON.stringify(perfil.permissoes ?? {});

  const handleToggle = (key: string, checked: boolean) => {
    setPermissoes((prev) => ({ ...prev, [key]: checked }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("rpc_admin_salvar_perfil", {
        p_id: perfil.id,
        p_nome: perfil.nome,
        p_descricao: descricao,
        p_permissoes: permissoes as any,
      });
      if (error) throw error;
      const result = data as any;
      if (result?.success === false) {
        toast({ title: "Erro", description: result.message, variant: "destructive" });
      } else {
        toast({ title: `Perfil ${perfil.nome} atualizado com sucesso!` });
        onRefetch();
      }
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { data, error } = await supabase.rpc("rpc_admin_deletar_perfil", { p_id: perfil.id });
      if (error) throw error;
      const result = data as any;
      if (result?.success === false) {
        toast({ title: "Não foi possível excluir", description: result.message, variant: "destructive" });
      } else {
        toast({ title: `Perfil ${perfil.nome} excluído.` });
        onRefetch();
      }
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    }
  };

  const badgeClass = BADGE_COLORS[perfil.nome] ?? "bg-slate-500 text-white hover:bg-slate-500";
  const updatedAt = perfil.created_at
    ? new Date(perfil.created_at).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "";

  return (
    <Card className={`transition-all ${isModified ? "border-yellow-500/50" : "border-border"}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="flex-1 space-y-2">
          <Badge className={badgeClass}>{perfil.nome === "BANKER" ? "FINANCIAL ADVISOR" : perfil.nome}</Badge>
          <Input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descrição do perfil..."
            className="text-sm h-8"
          />
        </div>
        {!isDefault && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir perfil</AlertDialogTitle>
                <AlertDialogDescription>
                  Excluir o perfil {perfil.nome}? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {PERMISSION_GROUPS.map((group) => (
          <div key={group.title}>
            <h4 className="text-sm font-semibold text-foreground mb-3">{group.title}</h4>
            <div className="space-y-3">
              {group.items.map((t) => (
                <div key={t.key} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Label className="text-sm">{t.label}</Label>
                    <p className="text-xs text-muted-foreground truncate">{t.desc}</p>
                  </div>
                  <Switch
                    checked={!!permissoes[t.key]}
                    onCheckedChange={(v) => handleToggle(t.key, v)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Última atualização: {updatedAt}</span>
        <Button size="sm" disabled={!isModified || saving} onClick={handleSave}>
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function GestaoProfiles() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newNome, setNewNome] = useState("");
  const [newDescricao, setNewDescricao] = useState("");
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: perfis, isLoading } = useQuery({
    queryKey: ["admin-perfis"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_admin_lista_perfis");
      if (error) throw error;
      return data as unknown as Perfil[];
    },
  });

  const refetch = () => queryClient.invalidateQueries({ queryKey: ["admin-perfis"] });

  const handleCreate = async () => {
    if (!newNome.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.rpc("rpc_admin_criar_perfil", {
        p_nome: newNome.toUpperCase(),
        p_descricao: newDescricao,
      });
      if (error) throw error;
      const result = data as any;
      if (result?.success === false) {
        toast({ title: "Erro", description: result.message, variant: "destructive" });
      } else {
        toast({ title: `Perfil ${newNome.toUpperCase()} criado!` });
        setNewNome("");
        setNewDescricao("");
        setDialogOpen(false);
        refetch();
      }
    } catch (e: any) {
      toast({ title: "Erro ao criar", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppLayout>
      {isLoading && <TailorLoader overlay={false} />}
      {!isLoading && (
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Perfis de Acesso</h1>
              <p className="text-sm text-muted-foreground">Defina o que cada perfil pode visualizar no Hub</p>
              <p className="text-xs text-amber-600 mt-1">⚠ Itens desabilitados ficam ocultos no menu do usuário. O ADMIN sempre tem acesso total.</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" /> Novo Perfil</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Perfil</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1">
                    <Label>Nome do Perfil</Label>
                    <Input
                      value={newNome}
                      onChange={(e) => setNewNome(e.target.value)}
                      placeholder="Ex: COMERCIAL"
                    />
                    <p className="text-xs text-muted-foreground">Será convertido para maiúsculas</p>
                  </div>
                  <div className="space-y-1">
                    <Label>Descrição</Label>
                    <Input
                      value={newDescricao}
                      onChange={(e) => setNewDescricao(e.target.value)}
                      placeholder="Descrição opcional"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                  </DialogClose>
                  <Button onClick={handleCreate} disabled={!newNome.trim() || creating}>
                    {creating ? "Criando..." : "Criar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {perfis?.map((p) => (
              <ProfileCard key={p.id} perfil={p} onRefetch={refetch} />
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
