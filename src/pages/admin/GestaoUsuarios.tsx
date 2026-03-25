import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import TailorLoader from "@/components/TailorLoader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Lock, Unlock, Trash2, Eye, EyeOff, Users, UserCheck, Clock, ShieldOff, Check, AlertTriangle, Mail } from "lucide-react";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";

const BADGE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-600 text-white hover:bg-red-600",
  LIDER: "bg-purple-600 text-white hover:bg-purple-600",
  BANKER: "bg-blue-600 text-white hover:bg-blue-600",
  DIRETORIA: "bg-orange-500 text-white hover:bg-orange-500",
  RH: "bg-green-600 text-white hover:bg-green-600",
  JURIDICO: "bg-gray-500 text-white hover:bg-gray-500",
  MARKETING: "bg-pink-500 text-white hover:bg-pink-500",
};

const BANKER_LIST = [
  "Adonias Noronha", "Caroline Vlavianos", "Felipe Steiman", "Gestora",
  "Legado", "Leonardo Burle", "Raphael Farias", "Raphael Pereira",
  "Sem Advisor", "Thayane Freitas",
];

interface Usuario {
  email: string;
  nome: string | null;
  cpf: string | null;
  empresa: string | null;
  perfil_nome: string | null;
  banker_name: string | null;
  blocked: boolean;
  ultimo_acesso: string | null;
  created_at: string | null;
  status: string;
  user_id: string | null;
}

function maskCpf(cpf: string | null): string {
  if (!cpf) return "-";
  if (cpf.length === 11) return `***.${cpf.slice(3, 6)}.***-**`;
  return "***.***.***-**";
}

function formatCpfFull(cpf: string | null): string {
  if (!cpf || cpf.length !== 11) return cpf || "-";
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "Nunca";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Há 1 dia";
  return `Há ${diffDays} dias`;
}

export default function GestaoUsuarios() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [perfilFilter, setPerfilFilter] = useState("Todos");
  const [revealedCpfs, setRevealedCpfs] = useState<Set<string>>(new Set());

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [modalNome, setModalNome] = useState("");
  const [modalEmail, setModalEmail] = useState("");
  const [modalPerfil, setModalPerfil] = useState("");
  const [modalBanker, setModalBanker] = useState("");
  const [modalEmpresa, setModalEmpresa] = useState("Tailor Partners");
  const [modalSaving, setModalSaving] = useState(false);

  // Block/Delete dialogs
  const [blockUser, setBlockUser] = useState<Usuario | null>(null);
  const [deleteUser, setDeleteUser] = useState<Usuario | null>(null);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);

  // Approve dialog
  const [approveTarget, setApproveTarget] = useState<Usuario | null>(null);
  const [approveRole, setApproveRole] = useState("");
  const [approveSaving, setApproveSaving] = useState(false);
  const { approve: approveNotif, unreadNotifications } = useAdminNotifications();

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_admin_lista_usuarios" as any);
      if (error) throw error;
      return data as unknown as Usuario[];
    },
  });

  const { data: perfis } = useQuery({
    queryKey: ["admin-perfis"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_admin_lista_perfis");
      if (error) throw error;
      return data as unknown as { id: string; nome: string }[];
    },
  });

  const refetch = () => queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });

  // Metrics
  const metrics = useMemo(() => {
    if (!usuarios) return { total: 0, active: 0, awaiting: 0, blocked: 0 };
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      total: usuarios.length,
      active: usuarios.filter((u) => u.ultimo_acesso && new Date(u.ultimo_acesso) >= thirtyDaysAgo).length,
      awaiting: usuarios.filter((u) => u.status === "Aguardando").length,
      blocked: usuarios.filter((u) => u.blocked).length,
    };
  }, [usuarios]);

  // Filtered list
  const filtered = useMemo(() => {
    if (!usuarios) return [];
    return usuarios.filter((u) => {
      const searchLower = search.toLowerCase();
      const matchSearch = !search || (u.nome?.toLowerCase().includes(searchLower) || u.email?.toLowerCase().includes(searchLower) || u.cpf?.includes(search.replace(/\D/g, "")));
      const matchStatus = statusFilter === "Todos" ||
        (statusFilter === "Ativo" && u.status === "Ativo") ||
        (statusFilter === "Aguardando" && u.status === "Aguardando") ||
        (statusFilter === "Bloqueado" && u.blocked);
      const matchPerfil = perfilFilter === "Todos" || u.perfil_nome === perfilFilter;
      return matchSearch && matchStatus && matchPerfil;
    });
  }, [usuarios, search, statusFilter, perfilFilter]);

  const openCreateModal = () => {
    setEditingUser(null);
    setModalNome("");
    setModalEmail("");
    setModalPerfil("");
    setModalBanker("");
    setModalEmpresa("Tailor Partners");
    setModalOpen(true);
  };

  const openEditModal = (u: Usuario) => {
    setEditingUser(u);
    setModalNome(u.nome || "");
    setModalEmail(u.email);
    setModalPerfil(u.perfil_nome || "");
    setModalBanker(u.banker_name || "");
    setModalEmpresa(u.empresa || "Tailor Partners");
    setModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!modalEmail.trim()) return;
    setModalSaving(true);
    try {
      const { data, error } = await supabase.rpc("rpc_admin_salvar_usuario" as any, {
        p_email: modalEmail,
        p_nome: modalNome,
        p_role: modalPerfil,
        p_perfil_nome: modalPerfil,
        p_banker_name: modalPerfil === "BANKER" ? modalBanker : null,
        p_empresa: modalEmpresa,
      });
      if (error) throw error;
      const result = data as any;
      if (result?.success === false) {
        toast({ title: "Erro", description: result.message, variant: "destructive" });
      } else {
        toast({ title: editingUser ? "Usuário atualizado!" : "Pré-cadastro criado!" });
        setModalOpen(false);
        refetch();
      }
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setModalSaving(false);
    }
  };

  const handleBlock = async () => {
    if (!blockUser) return;
    try {
      const { data, error } = await supabase.rpc("rpc_admin_bloquear_usuario", {
        p_email: blockUser.email,
        p_blocked: !blockUser.blocked,
      });
      if (error) throw error;
      toast({ title: blockUser.blocked ? "Usuário desbloqueado!" : "Usuário bloqueado!" });
      setBlockUser(null);
      refetch();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      const { data, error } = await supabase.rpc("rpc_admin_remover_precadastro" as any, {
        p_email: deleteUser.email,
      });
      if (error) throw error;
      const result = data as any;
      if (result?.success === false) {
        toast({ title: "Erro", description: result.message, variant: "destructive" });
      } else {
        toast({ title: "Pré-cadastro removido!" });
        refetch();
      }
      setDeleteUser(null);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleResendConfirmation = async (email: string) => {
    setResendingEmail(email);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) {
        toast({ title: "Erro ao reenviar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "E-mail reenviado!", description: `Confirmação reenviada para ${email}` });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setResendingEmail(null);
    }
  };


    setRevealedCpfs((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const getStatusDisplay = (u: Usuario) => {
    if (u.blocked) return { label: "Bloqueado", className: "bg-red-500/10 text-red-400" };
    if (u.status === "Aguardando") return { label: "Aguardando cadastro", className: "bg-yellow-500/10 text-yellow-400" };
    return { label: "Ativo", className: "bg-green-500/10 text-green-400" };
  };

  const metricCards = [
    { label: "Total Cadastrados", value: metrics.total, icon: Users, color: "text-primary" },
    { label: "Ativos (30 dias)", value: metrics.active, icon: UserCheck, color: "text-green-400" },
    { label: "Aguardando Cadastro", value: metrics.awaiting, icon: Clock, color: "text-yellow-400" },
    { label: "Bloqueados", value: metrics.blocked, icon: ShieldOff, color: "text-red-400" },
  ];

  return (
    <AppLayout>
      {isLoading && <TailorLoader overlay={false} />}
      {!isLoading && (
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Gestão de Usuários</h1>
              <p className="text-sm text-muted-foreground">Gerencie os usuários e acessos do Hub</p>
            </div>
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-1" /> Pré-cadastrar Usuário
            </Button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metricCards.map((m) => (
              <Card key={m.label}>
                <CardContent className="pt-4 pb-4 flex items-center gap-3">
                  <m.icon className={`h-8 w-8 ${m.color} shrink-0`} />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{m.value}</p>
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Aguardando Aprovação */}
          {(() => {
            const pendentes = (usuarios || []).filter((u) => u.status === "Aguardando" && u.blocked);
            if (pendentes.length === 0) return null;
            return (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-400" />
                  Aguardando Aprovação ({pendentes.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pendentes.map((u) => (
                    <Card key={u.email} className="border-orange-500/30">
                      <CardContent className="pt-4 pb-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-foreground text-sm truncate">{u.nome || u.email}</p>
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-400 text-[10px]">Pendente</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Cadastro: {u.created_at ? new Date(u.created_at).toLocaleDateString("pt-BR") : "-"}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-7 text-xs border-green-500/50 text-green-500 hover:bg-green-500/10"
                            onClick={() => { setApproveTarget(u); setApproveRole(""); }}
                          >
                            <Check className="h-3 w-3 mr-1" /> Aprovar
                          </Button>
                          {u.user_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={resendingEmail === u.email}
                              onClick={() => handleResendConfirmation(u.email)}
                            >
                              <Mail className="h-3 w-3 mr-1" /> {resendingEmail === u.email ? "Enviando..." : "Reenviar e-mail"}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Buscar por nome, email ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Aguardando">Aguardando</SelectItem>
                <SelectItem value="Bloqueado">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={perfilFilter} onValueChange={setPerfilFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os Perfis</SelectItem>
                {perfis?.map((p) => (
                  <SelectItem key={p.nome} value={p.nome}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="relative w-full overflow-auto border border-border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Banker</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const status = getStatusDisplay(u);
                  const badgeClass = BADGE_COLORS[u.perfil_nome || ""] ?? "bg-slate-500 text-white hover:bg-slate-500";
                  return (
                    <TableRow key={u.email}>
                      <TableCell className="font-medium">{u.nome || "-"}</TableCell>
                      <TableCell className="text-sm">{u.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-mono">
                            {revealedCpfs.has(u.email) ? formatCpfFull(u.cpf) : maskCpf(u.cpf)}
                          </span>
                          {u.cpf && (
                            <button onClick={() => toggleCpf(u.email)} className="text-muted-foreground hover:text-foreground">
                              {revealedCpfs.has(u.email) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{u.empresa || "-"}</TableCell>
                      <TableCell>
                        {u.perfil_nome ? <Badge className={badgeClass}>{u.perfil_nome}</Badge> : <span className="text-muted-foreground text-sm">-</span>}
                      </TableCell>
                      <TableCell className="text-sm">{u.banker_name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={status.className}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{relativeTime(u.ultimo_acesso)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString("pt-BR") : "-"}
                      </TableCell>
                      <TableCell>
                         <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditModal(u)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBlockUser(u)}>
                            {u.blocked ? <Unlock className="h-3.5 w-3.5 text-green-400" /> : <Lock className="h-3.5 w-3.5 text-yellow-400" />}
                          </Button>
                          {u.user_id && u.status !== "Ativo" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={resendingEmail === u.email}
                              onClick={() => handleResendConfirmation(u.email)}
                              title="Reenviar e-mail de confirmação"
                            >
                              <Mail className="h-3.5 w-3.5 text-primary" />
                            </Button>
                          )}
                          {u.status === "Aguardando" && !u.user_id && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteUser(u)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar Usuário" : "Pré-cadastrar Usuário"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nome Completo</Label>
              <Input value={modalNome} onChange={(e) => setModalNome(e.target.value)} placeholder="Nome do colaborador" />
            </div>
            <div className="space-y-1">
              <Label>E-mail Corporativo</Label>
              <Input
                type="email"
                value={modalEmail}
                onChange={(e) => setModalEmail(e.target.value)}
                placeholder="nome@tailorpartners.com.br"
                disabled={!!editingUser}
              />
            </div>
            <div className="space-y-1">
              <Label>Perfil de Acesso</Label>
              <Select value={modalPerfil} onValueChange={setModalPerfil}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {perfis?.map((p) => (
                    <SelectItem key={p.nome} value={p.nome}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {modalPerfil === "BANKER" && (
              <div className="space-y-1">
                <Label>Banker Vinculado</Label>
                <Select value={modalBanker} onValueChange={setModalBanker}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {BANKER_LIST.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>Empresa</Label>
              <Input value={modalEmpresa} onChange={(e) => setModalEmpresa(e.target.value)} placeholder="Tailor Partners" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSaveUser} disabled={!modalEmail.trim() || modalSaving}>
              {modalSaving ? "Salvando..." : editingUser ? "Salvar" : "Pré-cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block/Unblock AlertDialog */}
      <AlertDialog open={!!blockUser} onOpenChange={() => setBlockUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{blockUser?.blocked ? "Desbloquear usuário" : "Bloquear usuário"}</AlertDialogTitle>
            <AlertDialogDescription>
              {blockUser?.blocked
                ? `Reativar acesso de ${blockUser?.nome || blockUser?.email}?`
                : `Bloquear ${blockUser?.nome || blockUser?.email}? O usuário perderá acesso imediatamente ao tentar logar.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock}>
              {blockUser?.blocked ? "Desbloquear" : "Bloquear"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete AlertDialog */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover pré-cadastro</AlertDialogTitle>
            <AlertDialogDescription>
              Remover pré-cadastro de {deleteUser?.email}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/80">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve Access Dialog */}
      <Dialog open={!!approveTarget} onOpenChange={() => { setApproveTarget(null); setApproveRole(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar acesso de {approveTarget?.nome || approveTarget?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Selecione o perfil de acesso:</p>
            <Select value={approveRole} onValueChange={setApproveRole}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o perfil..." />
              </SelectTrigger>
              <SelectContent>
                {["ASSESSOR", "BANKER", "LIDER", "FINDER", "ADMIN"].map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              disabled={!approveRole || approveSaving}
              onClick={async () => {
                if (!approveTarget) return;
                setApproveSaving(true);
                // Find matching notification
                const notif = unreadNotifications.find(
                  (n) => n.dados?.email === approveTarget.email
                );
                if (notif) {
                  await approveNotif(notif.dados?.user_id || "", approveRole, notif.id);
                } else {
                  // Fallback: call RPC directly
                  const { error } = await supabase.rpc("rpc_admin_aprovar_usuario" as any, {
                    p_user_id: "",
                    p_role: approveRole,
                    p_notif_id: "",
                  });
                  if (error) {
                    toast({ title: "Erro", description: error.message, variant: "destructive" });
                  } else {
                    toast({ title: `Acesso liberado para ${approveTarget.nome || approveTarget.email}!` });
                    refetch();
                  }
                }
                setApproveSaving(false);
                setApproveTarget(null);
                setApproveRole("");
              }}
            >
              {approveSaving ? "Aprovando..." : "Aprovar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
