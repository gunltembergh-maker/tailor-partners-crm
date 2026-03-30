import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import TailorLoader from "@/components/TailorLoader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Lock, Unlock, Trash2, Eye, EyeOff, Users, UserCheck, Clock, ShieldOff, UserX, CheckCircle, Mail, RotateCcw, XCircle } from "lucide-react";
import { UserFormModal, type UserFormData } from "@/components/admin/UserFormModal";
import { UserDetailSheet } from "@/components/admin/UserDetailSheet";
import { ConviteBadge, getConviteStatus } from "@/components/admin/ConviteBadge";

const BADGE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-600 text-white hover:bg-red-600",
  LIDER: "bg-purple-600 text-white hover:bg-purple-600",
  BANKER: "bg-blue-600 text-white hover:bg-blue-600",
  DIRETORIA: "bg-orange-500 text-white hover:bg-orange-500",
  RH: "bg-green-600 text-white hover:bg-green-600",
  JURIDICO: "bg-gray-500 text-white hover:bg-gray-500",
  MARKETING: "bg-pink-500 text-white hover:bg-pink-500",
  FINDER: "bg-teal-600 text-white hover:bg-teal-600",
  ASSESSOR: "bg-indigo-600 text-white hover:bg-indigo-600",
  OPERACOES: "bg-amber-600 text-white hover:bg-amber-600",
};

interface Usuario {
  user_id: string;
  email: string;
  full_name: string;
  cpf: string | null;
  empresa: string | null;
  role: string;
  banker_name: string | null;
  finder_name: string | null;
  advisor_name: string | null;
  blocked: boolean;
  active: boolean;
  ultimo_acesso: string | null;
  created_at: string | null;
  pre_cadastrado: boolean;
  tem_conta: boolean;
  area: string | null;
  gestor: string | null;
  convite_status: string | null;
  convite_enviado_em: string | null;
  convite_aceito_em: string | null;
  convite_expira_em: string | null;
  convite_cancelado_em: string | null;
  convite_reenvios: number | null;
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

function getStatusDisplay(u: Usuario) {
  if (u.blocked) return { label: "Bloqueado", className: "bg-red-500/10 text-red-400" };
  if (!u.tem_conta) return { label: "Pré-cadastrado", className: "bg-blue-500/10 text-blue-400" };
  if (!u.active && !u.role) return { label: "Aguardando", className: "bg-yellow-500/10 text-yellow-400" };
  return { label: "Ativo", className: "bg-green-500/10 text-green-400" };
}

function getBankerFinderDisplay(u: Usuario): string {
  if (u.role === "BANKER" && u.banker_name) return u.banker_name;
  if (u.role === "FINDER" && u.finder_name) return u.finder_name;
  return "-";
}

const PERFIS_FILTER = ["Todos", "ADMIN", "LIDER", "BANKER", "FINDER", "ASSESSOR", "OPERACOES"];

export default function GestaoUsuarios() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [perfilFilter, setPerfilFilter] = useState("Todos");
  const [revealedCpfs, setRevealedCpfs] = useState<Set<string>>(new Set());

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<UserFormData> | null>(null);
  const [detailUser, setDetailUser] = useState<Usuario | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Block/Delete dialogs
  const [blockUser, setBlockUser] = useState<Usuario | null>(null);
  const [deleteUser, setDeleteUser] = useState<Usuario | null>(null);

  // Approve dialog for sem pré-cadastro
  const [approveUser, setApproveUser] = useState<Usuario | null>(null);
  const [approveRole, setApproveRole] = useState("");
  const [approving, setApproving] = useState(false);
  const [loadingInviteId, setLoadingInviteId] = useState<string | null>(null);

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_admin_lista_usuarios" as any);
      if (error) throw error;
      return data as unknown as Usuario[];
    },
  });

  const refetch = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: ["admin-usuarios"], exact: true });
  }, [queryClient]);

  // Metrics
  const metrics = useMemo(() => {
    if (!usuarios) return { total: 0, active: 0, preCadastrado: 0, awaiting: 0, blocked: 0 };
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      total: usuarios.length,
      active: usuarios.filter((u) => u.tem_conta && u.ultimo_acesso && new Date(u.ultimo_acesso) >= thirtyDaysAgo).length,
      preCadastrado: usuarios.filter((u) => !u.tem_conta && !u.blocked).length,
      awaiting: usuarios.filter((u) => u.tem_conta && !u.active && !u.role && !u.blocked).length,
      blocked: usuarios.filter((u) => u.blocked).length,
    };
  }, [usuarios]);

  // Awaiting approval (sem pré-cadastro + bloqueado + sem perfil definido)
  const awaitingApproval = useMemo(() => {
    if (!usuarios) return [];
    return usuarios.filter((u) => !u.pre_cadastrado && u.blocked && !u.role);
  }, [usuarios]);

  // Filtered list
  const filtered = useMemo(() => {
    if (!usuarios) return [];
    return usuarios.filter((u) => {
      const searchLower = search.toLowerCase();
      const matchSearch = !search || (u.full_name?.toLowerCase().includes(searchLower) || u.email?.toLowerCase().includes(searchLower) || u.cpf?.includes(search.replace(/\D/g, "")));
      const matchStatus = statusFilter === "Todos" ||
        (statusFilter === "Ativo" && u.tem_conta && u.active && !u.blocked) ||
        (statusFilter === "Pré-cadastrado" && !u.tem_conta && !u.blocked) ||
        (statusFilter === "Aguardando" && u.tem_conta && !u.active && !u.role && !u.blocked) ||
        (statusFilter === "Bloqueado" && u.blocked);
      const matchPerfil = perfilFilter === "Todos" || u.role === perfilFilter;
      return matchSearch && matchStatus && matchPerfil;
    });
  }, [usuarios, search, statusFilter, perfilFilter]);

  const openCreateModal = useCallback(() => {
    setFormData(null);
    setFormOpen(true);
  }, []);

  const openEditModal = useCallback((u: Usuario) => {
    setFormData({
      email: u.email,
      nome: u.full_name,
      cpf: u.cpf || "",
      perfil: u.role,
      banker: u.banker_name || "",
      finder: u.finder_name || "",
      empresa: u.empresa || "Tailor Partners",
      isEdit: true,
      area: u.area || "",
      gestor: u.gestor || "",
    } as any);
    setFormOpen(true);
  }, []);

  const openDetail = useCallback((u: Usuario) => {
    setDetailUser(u);
    setDetailOpen(true);
  }, []);

  const handleBlock = async () => {
    if (!blockUser) return;
    try {
      const { error } = await supabase.rpc("rpc_admin_bloquear_usuario", {
        p_email: blockUser.email,
        p_blocked: !blockUser.blocked,
      });
      if (error) throw error;
      toast.success(blockUser.blocked ? "Usuário desbloqueado!" : "Usuário bloqueado!", { duration: 3000 });
      setBlockUser(null);
      await refetch();
    } catch (e: any) {
      toast.error(e.message || "Erro ao alterar bloqueio", { duration: 4000 });
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      const normalizedEmail = deleteUser.email.toLowerCase().trim();

      if (deleteUser.tem_conta && deleteUser.user_id) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ blocked: true, active: false })
          .eq("user_id", deleteUser.user_id);

        if (profileError) throw profileError;
      }

      const { error: teamRefError } = await supabase
        .from("team_reference")
        .delete()
        .eq("email", normalizedEmail);

      if (teamRefError) throw teamRefError;

      toast.success(`Cadastro de ${deleteUser.full_name || deleteUser.email} removido.`, { duration: 3000 });
      setDeleteUser(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-usuarios"], exact: true });
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir cadastro", { duration: 4000 });
    }
  };

  const handleApprove = async () => {
    if (!approveUser || !approveRole) return;
    setApproving(true);
    try {
      const { error } = await supabase.rpc("rpc_admin_aprovar_usuario", {
        p_user_id: approveUser.user_id,
        p_role: approveRole,
      });
      if (error) throw error;
      toast.success("Usuário aprovado!", { duration: 3000 });
      setApproveUser(null);
      setApproveRole("");
      await refetch();
    } catch (e: any) {
      toast.error(e.message || "Erro ao aprovar", { duration: 4000 });
    } finally {
      setApproving(false);
    }
  };

  const toggleCpf = useCallback((email: string) => {
    setRevealedCpfs((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }, []);

  const handleConvidar = useCallback(async (u: Usuario, isReenvio = false) => {
    setLoadingInviteId(u.email);
    try {
      const { error } = await supabase.functions.invoke("invite-user", {
        body: {
          email: u.email,
          nome: u.full_name,
          perfil: u.role,
          area: u.area,
          gestor: u.gestor,
          empresa: u.empresa,
        },
      });
      if (error) throw error;

      await supabase.rpc("rpc_registrar_convite" as any, {
        p_email: u.email,
        p_acao: isReenvio ? "reenvio" : "enviado",
      });

      toast.success(`Convite ${isReenvio ? "re" : ""}enviado para ${u.email}`, { duration: 3000 });
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar convite", { duration: 4000 });
    } finally {
      setLoadingInviteId(null);
    }
  }, [refetch]);

  const handleCancelarConvite = useCallback(async (u: Usuario) => {
    try {
      await supabase.rpc("rpc_registrar_convite" as any, {
        p_email: u.email,
        p_acao: "cancelado",
      });
      toast.success("Convite cancelado.", { duration: 3000 });
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Erro ao cancelar convite", { duration: 4000 });
    }
  }, [refetch]);


  const metricCards = useMemo(() => [
    { label: "Total", value: metrics.total, icon: Users, color: "text-primary" },
    { label: "Ativos (30 dias)", value: metrics.active, icon: UserCheck, color: "text-green-400" },
    { label: "Pré-cadastrados", value: metrics.preCadastrado, icon: Clock, color: "text-blue-400" },
    { label: "Bloqueados", value: metrics.blocked, icon: ShieldOff, color: "text-red-400" },
  ], [metrics]);

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

          {/* Awaiting Approval Section */}
          {awaitingApproval.length > 0 && (
            <Card className="border-orange-500/30">
              <CardContent className="pt-4 pb-4">
                <h3 className="text-sm font-semibold text-orange-400 mb-3 flex items-center gap-2">
                  <UserX className="h-4 w-4" /> Aguardando Aprovação ({awaitingApproval.length})
                </h3>
                <div className="space-y-2">
                  {awaitingApproval.map((u) => (
                    <div key={u.email} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.full_name || u.email}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => { setApproveUser(u); setApproveRole(""); }}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Aprovar
                        </Button>
                        {u.user_id !== user?.id && (
                          <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setDeleteUser(u)}>
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Recusar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
                <SelectItem value="Pré-cadastrado">Pré-cadastrado</SelectItem>
                <SelectItem value="Aguardando">Aguardando</SelectItem>
                <SelectItem value="Bloqueado">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={perfilFilter} onValueChange={setPerfilFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERFIS_FILTER.map((p) => (
                  <SelectItem key={p} value={p}>{p === "Todos" ? "Todos os Perfis" : p === "BANKER" ? "FINANCIAL ADVISOR" : p}</SelectItem>
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
                  <TableHead>Perfil</TableHead>
                  <TableHead>Financial Advisor/Finder</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Convite</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const status = getStatusDisplay(u);
                  const badgeClass = BADGE_COLORS[u.role] ?? "bg-slate-500 text-white hover:bg-slate-500";
                  const conviteStatus = getConviteStatus(u);
                  const isInviteLoading = loadingInviteId === u.email;
                  return (
                    <TableRow key={u.email} className="cursor-pointer" onClick={() => openDetail(u)}>
                      <TableCell className="font-medium">{u.full_name || "-"}</TableCell>
                      <TableCell className="text-sm">{u.email}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
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
                      <TableCell>
                        {u.role ? <Badge className={badgeClass}>{u.role === "BANKER" ? "FINANCIAL ADVISOR" : u.role}</Badge> : <span className="text-muted-foreground text-sm">-</span>}
                      </TableCell>
                      <TableCell className="text-sm">{getBankerFinderDisplay(u)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={status.className}>{status.label}</Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <ConviteBadge usuario={u} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.ultimo_acesso
                          ? new Date(u.ultimo_acesso).toLocaleDateString("pt-BR") + " " + new Date(u.ultimo_acesso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                          : "Nunca"}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditModal(u)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {/* Invite actions */}
                          {(conviteStatus === "pendente" || conviteStatus === "cancelado") && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isInviteLoading} onClick={() => handleConvidar(u)}>
                              <Mail className="h-3.5 w-3.5 text-blue-500" />
                            </Button>
                          )}
                          {(conviteStatus === "enviado" || conviteStatus === "expirado") && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isInviteLoading} onClick={() => handleConvidar(u, true)}>
                              <RotateCcw className="h-3.5 w-3.5 text-orange-500" />
                            </Button>
                          )}
                          {conviteStatus === "enviado" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCancelarConvite(u)}>
                              <XCircle className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBlockUser(u)}>
                            {u.blocked ? <Unlock className="h-3.5 w-3.5 text-green-400" /> : <Lock className="h-3.5 w-3.5 text-yellow-400" />}
                          </Button>
                          {!u.pre_cadastrado && u.blocked && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setApproveUser(u); setApproveRole(""); }}>
                              <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                            </Button>
                          )}
                          {u.user_id !== user?.id && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" title="Excluir cadastro" onClick={() => setDeleteUser(u)}>
                              <Trash2 className="h-3.5 w-3.5" />
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
      <UserFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        initialData={formData}
        onSaved={refetch}
      />

      {/* Detail Sheet */}
      <UserDetailSheet
        user={detailUser}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      {/* Block/Unblock AlertDialog */}
      <AlertDialog open={!!blockUser} onOpenChange={() => setBlockUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{blockUser?.blocked ? "Desbloquear usuário" : "Bloquear usuário"}</AlertDialogTitle>
            <AlertDialogDescription>
              {blockUser?.blocked
                ? `Reativar acesso de ${blockUser?.full_name || blockUser?.email}?`
                : `Bloquear ${blockUser?.full_name || blockUser?.email}? O usuário perderá acesso imediatamente.`}
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
            <AlertDialogTitle>Excluir cadastro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cadastro de{" "}
              <strong>{deleteUser?.full_name}</strong>?
              {deleteUser?.tem_conta
                ? " O usuário perderá o acesso ao Hub imediatamente."
                : " O pré-cadastro será removido."}
              {" "}Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve AlertDialog */}
      <AlertDialog open={!!approveUser} onOpenChange={() => setApproveUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione o perfil de acesso para {approveUser?.full_name || approveUser?.email}:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Select value={approveRole} onValueChange={setApproveRole}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o perfil..." />
            </SelectTrigger>
            <SelectContent>
              {["ADMIN", "LIDER", "BANKER", "FINDER", "ASSESSOR", "OPERACOES"].map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={!approveRole || approving}>
              {approving ? "Aprovando..." : "Aprovar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
