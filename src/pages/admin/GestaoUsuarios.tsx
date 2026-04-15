import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { PopupComunicado } from "@/components/PopupComunicado";
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
import { Plus, Pencil, Lock, Unlock, Trash2, Eye, EyeOff, Users, UserCheck, Clock, ShieldOff, UserX, CheckCircle, Mail, RotateCcw, XCircle, KeyRound, Link2, ChevronDown, LogIn } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserFormModal, type UserFormData } from "@/components/admin/UserFormModal";
import { UserDetailSheet } from "@/components/admin/UserDetailSheet";

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
  profile_id: string;
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
  primeiro_acesso: boolean;
  invited_at: string | null;
  operacao_tipo: string | null;
  perfil_id: string | null;
  convite_status?: string | null;
  convite_enviado_em?: string | null;
  convite_aceito_em?: string | null;
  convite_expira_em?: string | null;
  convite_cancelado_em?: string | null;
  convite_reenvios?: number | null;
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

function formatUltimoAcesso(dateStr: string | null): string {
  if (!dateStr) return "Nunca acessou";
  const date = new Date(dateStr);
  const now = new Date();
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  
  const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  if (isToday) return `Hoje às ${time}`;
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return `Ontem às ${time}`;
  
  return `${date.toLocaleDateString("pt-BR")} às ${time}`;
}

function formatConvite(u: Usuario): { icon: string; text: string; className: string } {
  if (u.invited_at) {
    const d = new Date(u.invited_at);
    const formatted = `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    return { icon: "📤", text: `Enviado em ${formatted}`, className: "bg-blue-500/10 text-blue-600" };
  }
  return { icon: "—", text: "Não enviado", className: "bg-muted text-muted-foreground" };
}

function getStatusDisplay(u: Usuario) {
  if (u.blocked) return { label: "Bloqueado", icon: "🔒", className: "bg-red-500/10 text-red-400" };
  if (!u.active && !u.blocked) return { label: "Pré-cadastrado", icon: "👤", className: "bg-muted text-muted-foreground" };
  if (u.primeiro_acesso) return { label: "Nunca acessou", icon: "⏳", className: "bg-yellow-500/10 text-yellow-400" };
  return { label: "Ativo", icon: "✅", className: "bg-green-500/10 text-green-400" };
}

function getBankerFinderDisplay(u: Usuario): string {
  if (u.role === "OPERACOES") return u.operacao_tipo || "—";
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
  const [lastSentMap, setLastSentMap] = useState<Record<string, number>>({});

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_admin_lista_usuarios" as any);
      if (error) throw error;
      return ((data as any[]) || []).map((row: any) => ({
        ...row,
        profile_id: row.id,
      })) as unknown as Usuario[];
    },
  });

  // Realtime: auto-refresh when team_reference changes (e.g. invite sent)
  useEffect(() => {
    const channel = supabase
      .channel("team-reference-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_reference" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const refetch = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: ["admin-usuarios"], exact: true });
  }, [queryClient]);

  // Metrics
  const metrics = useMemo(() => {
    if (!usuarios) return { total: 0, active: 0, nuncaAcessou: 0, preCadastrado: 0, blocked: 0 };
    return {
      total: usuarios.length,
      active: usuarios.filter((u) => !u.primeiro_acesso && u.ultimo_acesso && !u.blocked).length,
      nuncaAcessou: usuarios.filter((u) => u.primeiro_acesso && u.active && !u.blocked).length,
      preCadastrado: usuarios.filter((u) => !u.active && !u.blocked).length,
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
        (statusFilter === "Ativo" && !u.primeiro_acesso && u.active && !u.blocked) ||
        (statusFilter === "Nunca acessou" && u.primeiro_acesso && u.active && !u.blocked) ||
        (statusFilter === "Pré-cadastrado" && !u.active && !u.blocked) ||
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
      editProfileId: u.profile_id,
      perfilId: u.perfil_id || "",
      area: u.area || "",
      gestor: u.gestor || "",
      operacao_tipo: u.operacao_tipo || "",
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
      // If user has no profile (team_reference-only), delete from team_reference directly
      if (!deleteUser.tem_conta && !deleteUser.user_id) {
        const { error } = await supabase
          .from("team_reference")
          .delete()
          .eq("email", deleteUser.email.toLowerCase().trim());
        if (error) throw error;
      } else {
        const { data, error } = await supabase.rpc("rpc_admin_excluir_usuario" as any, {
          p_profile_id: deleteUser.profile_id,
        });
        if (error) throw error;
        if (data && typeof data === "object" && "success" in data && !(data as any).success) {
          throw new Error((data as any).error || "Erro ao excluir");
        }
      }
      toast.success(`Usuário ${deleteUser.full_name || deleteUser.email} excluído com sucesso.`, { duration: 3000 });
      setDeleteUser(null);
      await queryClient.invalidateQueries();
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

  const getResendCooldown = useCallback((email: string): number => {
    const sentAt = lastSentMap[email];
    if (!sentAt) return 0;
    const elapsed = Date.now() - sentAt;
    const cooldown = 60 * 60 * 1000; // 60 minutes
    return Math.max(0, cooldown - elapsed);
  }, [lastSentMap]);

  const handleEnviarEmail = useCallback(async (u: Usuario, tipo: 'invite' | 'recovery' | 'magiclink' = 'invite') => {
    // Check cooldown for invite type
    if (tipo === 'invite') {
      const remaining = getResendCooldown(u.email);
      if (remaining > 0) {
        const mins = Math.ceil(remaining / 60000);
        toast.error(`Convite já enviado recentemente. Aguarde ${mins} minuto(s) antes de reenviar.`, { duration: 4000 });
        return;
      }
    }

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
          tipo,
        },
      });
      if (error) throw error;

      await supabase.rpc("rpc_registrar_convite" as any, {
        p_email: u.email,
        p_acao: tipo === 'invite' ? "enviado" : "reenvio",
      });

      // Track send time for cooldown
      if (tipo === 'invite') {
        setLastSentMap(prev => ({ ...prev, [u.email]: Date.now() }));
      }

      const labels: Record<string, string> = {
        invite: "Convite enviado",
        recovery: "E-mail de redefinição de senha enviado",
        magiclink: "Magic Link enviado",
      };
      toast.success(`${labels[tipo]} para ${u.email}`, { duration: 3000 });
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar convite", { duration: 4000 });
    } finally {
      setLoadingInviteId(null);
    }
  }, [refetch, getResendCooldown]);

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
    { label: "Ativos", value: metrics.active, icon: UserCheck, color: "text-green-400" },
    { label: "Nunca acessou", value: metrics.nuncaAcessou, icon: Clock, color: "text-yellow-400" },
    { label: "Pré-cadastrados", value: metrics.preCadastrado, icon: Clock, color: "text-muted-foreground" },
    { label: "Bloqueados", value: metrics.blocked, icon: ShieldOff, color: "text-red-400" },
  ], [metrics]);

  return (
    <AppLayout>
      <PopupComunicado />
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
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
                <SelectItem value="Nunca acessou">Nunca acessou</SelectItem>
                <SelectItem value="Pré-cadastrado">Pré-cadastrado</SelectItem>
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
                  <TableHead>Primeiro Acesso</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const status = getStatusDisplay(u);
                  const badgeClass = BADGE_COLORS[u.role] ?? "bg-slate-500 text-white hover:bg-slate-500";
                  const convite = formatConvite(u);
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
                        <Badge variant="outline" className={status.className}>{status.icon} {status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${convite.className} text-xs`}>{convite.icon} {convite.text}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {u.primeiro_acesso
                          ? <span className="text-yellow-500">⏳ Aguardando</span>
                          : <span className="text-green-500">✅ Acessou</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatUltimoAcesso(u.ultimo_acesso)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditModal(u)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isInviteLoading}
                                title="Enviar e-mail">
                                <Mail className="h-3.5 w-3.5 text-blue-500" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem onClick={() => handleEnviarEmail(u, 'invite')}>
                                <Mail className="h-4 w-4 mr-2 text-blue-500" />
                                Enviar Convite
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEnviarEmail(u, 'recovery')}>
                                <KeyRound className="h-4 w-4 mr-2 text-orange-500" />
                                Reset de Senha
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEnviarEmail(u, 'magiclink')}>
                                <Link2 className="h-4 w-4 mr-2 text-green-500" />
                                Magic Link (Acesso Direto)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
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
        onEdit={(u) => { setDetailOpen(false); openEditModal(u); }}
        onBlock={(u) => { setDetailOpen(false); setBlockUser(u); }}
        onDelete={(u) => { setDetailOpen(false); setDeleteUser(u); }}
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
            <AlertDialogTitle>Excluir usuário permanentemente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteUser?.full_name || deleteUser?.email}</strong>?
              {" "}Esta ação não pode ser desfeita. Todos os dados do usuário serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Excluir permanentemente
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
