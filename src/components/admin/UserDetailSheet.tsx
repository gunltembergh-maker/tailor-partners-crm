import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { User, ClipboardList, History, Activity } from "lucide-react";

interface Usuario {
  profile_id?: string;
  user_id: string;
  email: string;
  full_name: string;
  cpf: string | null;
  empresa: string | null;
  role: string;
  banker_name: string | null;
  finder_name: string | null;
  advisor_name?: string | null;
  blocked: boolean;
  active: boolean;
  created_at: string | null;
  ultimo_acesso: string | null;
  pre_cadastrado: boolean;
  tem_conta?: boolean;
  area?: string | null;
  gestor?: string | null;
  operacao_tipo?: string | null;
  primeiro_acesso?: boolean;
  perfil_id?: string | null;
  invited_at?: string | null;
  convite_status?: string | null;
  convite_enviado_em?: string | null;
  convite_aceito_em?: string | null;
  convite_expira_em?: string | null;
  convite_cancelado_em?: string | null;
  convite_reenvios?: number | null;
  [key: string]: any;
}

interface Props {
  user: Usuario | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (u: Usuario) => void;
  onBlock?: (u: Usuario) => void;
  onDelete?: (u: Usuario) => void;
}

function formatCpfFull(cpf: string | null): string {
  if (!cpf || cpf.length !== 11) return cpf || "-";
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

function getStatusBadge(u: any) {
  if (u?.blocked) return { label: "Bloqueado", className: "bg-red-500/10 text-red-400" };
  if (u?.active === false) return { label: "Pré-cadastrado", className: "bg-muted text-muted-foreground" };
  if (u?.primeiro_acesso) return { label: "Nunca acessou", className: "bg-yellow-500/10 text-yellow-400" };
  return { label: "Ativo", className: "bg-green-500/10 text-green-400" };
}

const EVENTO_ICONS: Record<string, string> = {
  "Pré-cadastro realizado": "📋",
  "Convite enviado": "📧",
  "E-mail confirmado": "✅",
  "Primeiro acesso": "🚀",
};

const ACAO_ICONS: Record<string, string> = {
  "Acesso ao Dashboard": "📊",
  "Filtro aplicado": "🔍",
  "Export de dados": "📥",
  "Acesso ao Qualitativo": "📈",
  "Sincronização manual": "🔄",
  "Login": "🔐",
  "Logout": "🚪",
};

export function UserDetailSheet({ user, open, onOpenChange, onEdit, onBlock, onDelete }: Props) {
  const queryClient = useQueryClient();

  // Fetch full detail from RPC
  const { data: detalhe } = useQuery({
    queryKey: ["admin-detalhe-usuario", user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const { data, error } = await supabase.rpc("rpc_admin_detalhe_usuario" as any, { p_email: user.email });
      if (error) throw error;
      return data as any;
    },
    enabled: open && !!user?.email,
    refetchInterval: open ? 15000 : false,
  });

  // Invite timeline
  const { data: conviteTimeline } = useQuery({
    queryKey: ["admin-historico-convites", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase.rpc("rpc_admin_historico_convites" as any, { p_email: user.email });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: open && !!user?.email,
  });

  // Session logs
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["admin-sessoes-usuario", user?.email],
    queryFn: async () => {
      if (!user?.user_id) return [];
      const { data, error } = await supabase
        .from("user_sessions_log" as any)
        .select("id, login_at, logout_at, duracao_minutos, ip_address, user_agent")
        .eq("user_id", user.user_id)
        .order("login_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: open && !!user?.user_id,
  });

  // Activity logs
  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["admin-atividade-usuario", user?.email],
    queryFn: async () => {
      if (!user?.user_id) return [];
      const { data, error } = await supabase
        .from("user_activity_log" as any)
        .select("id, acao, detalhe, pagina, created_at")
        .eq("user_id", user.user_id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: open && !!user?.user_id,
  });

  // Realtime refresh
  useEffect(() => {
    if (!open || !user?.email) return;
    const channel = supabase
      .channel(`user-detail-${user.email}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "team_reference" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-detalhe-usuario", user.email] });
        queryClient.invalidateQueries({ queryKey: ["admin-historico-convites", user.email] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, user?.email, queryClient]);

  if (!user) return null;

  const perfil = detalhe?.perfil || {};
  const auth = detalhe?.auth || {};
  const convite = detalhe?.convite || {};
  const displayName = perfil.nome || user.full_name || user.email;
  const displayRole = detalhe?.role || user.role;
  const status = getStatusBadge({ ...user, ...perfil });

  const vinculo = displayRole === "BANKER"
    ? (perfil.banker_name || user.banker_name)
    : displayRole === "FINDER"
      ? (perfil.finder_name || user.finder_name)
      : displayRole === "ASSESSOR"
        ? (perfil.advisor_name || user.advisor_name)
        : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <div className="p-6 pb-0">
          <SheetHeader>
            <SheetTitle className="text-xl">{displayName}</SheetTitle>
            <SheetDescription>Histórico completo do usuário</SheetDescription>
          </SheetHeader>
        </div>

        <Tabs defaultValue="perfil" className="mt-4">
          <div className="px-6">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="perfil" className="text-xs gap-1"><User className="h-3.5 w-3.5" /> Perfil</TabsTrigger>
              <TabsTrigger value="convites" className="text-xs gap-1"><ClipboardList className="h-3.5 w-3.5" /> Convites</TabsTrigger>
              <TabsTrigger value="sessoes" className="text-xs gap-1"><History className="h-3.5 w-3.5" /> Sessões</TabsTrigger>
              <TabsTrigger value="atividade" className="text-xs gap-1"><Activity className="h-3.5 w-3.5" /> Atividade</TabsTrigger>
            </TabsList>
          </div>

          {/* ABA PERFIL */}
          <TabsContent value="perfil" className="px-6 pb-6 mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <InfoField label="E-mail" value={perfil.email || user.email} />
              <InfoField label="CPF" value={formatCpfFull(perfil.cpf || user.cpf)} mono />
              <InfoField label="Perfil" value={displayRole === "BANKER" ? "FINANCIAL ADVISOR" : displayRole || "-"} />
              <InfoField label="Financial Advisor/Finder" value={vinculo || "-"} />
              {displayRole === "OPERACOES" && (
                <InfoField label="Tipo de Operação" value={perfil.operacao_tipo || user.operacao_tipo || "-"} />
              )}
              <InfoField label="Área" value={perfil.area || user.area || "-"} />
              <InfoField label="Gestor" value={perfil.gestor || user.gestor || "-"} />
              <InfoField label="Empresa" value={perfil.empresa || user.empresa || "-"} />
              <div>
                <p className="text-muted-foreground text-xs mb-1">Status</p>
                <Badge variant="outline" className={status.className}>{status.label}</Badge>
              </div>
              <InfoField label="Cadastrado em" value={perfil.created_at ? new Date(perfil.created_at).toLocaleDateString("pt-BR") : user.created_at ? new Date(user.created_at).toLocaleDateString("pt-BR") : "-"} />
              <InfoField label="Último Acesso" value={perfil.ultimo_acesso ? formatDateTime(perfil.ultimo_acesso) : user.ultimo_acesso ? formatDateTime(user.ultimo_acesso) : "Nunca"} />
              <InfoField label="Total de Sessões" value={String(detalhe?.total_sessoes ?? 0)} />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              {onEdit && (
                <Button size="sm" variant="outline" onClick={() => onEdit(user)}>
                  Editar
                </Button>
              )}
              {onBlock && (
                <Button size="sm" variant="outline" onClick={() => onBlock(user)}>
                  {user.blocked ? "Desbloquear" : "Bloquear"}
                </Button>
              )}
              {onDelete && (
                <Button size="sm" variant="destructive" onClick={() => onDelete(user)}>
                  Excluir
                </Button>
              )}
            </div>
          </TabsContent>

          {/* ABA CONVITES */}
          <TabsContent value="convites" className="px-6 pb-6 mt-4">
            <div className="space-y-1 mb-4">
              <h3 className="text-sm font-semibold text-foreground">Timeline do Convite</h3>
              <p className="text-xs text-muted-foreground">Eventos do ciclo de vida do usuário</p>
            </div>

            {/* Convite summary */}
            {(convite.reenvios > 0 || convite.status) && (
              <div className="rounded-lg border border-border p-3 mb-4 text-sm space-y-1">
                {convite.status && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status atual</span>
                    <Badge variant="outline" className="text-xs">{convite.status}</Badge>
                  </div>
                )}
                {convite.reenvios > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reenvios</span>
                    <span className="font-medium">{convite.reenvios}x</span>
                  </div>
                )}
              </div>
            )}

            {/* Timeline */}
            {conviteTimeline && conviteTimeline.length > 0 ? (
              <div className="relative pl-6 space-y-4">
                <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
                {conviteTimeline.map((ev: any, i: number) => (
                  <div key={i} className="relative flex gap-3 items-start">
                    <div className="absolute -left-4 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center text-xs">
                      {EVENTO_ICONS[ev.evento] || "📌"}
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-foreground">{ev.evento}</p>
                      <p className="text-xs text-muted-foreground">{ev.detalhe}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ev.data_hora ? formatDateTime(ev.data_hora) : "-"}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
            )}

            {/* Auth info */}
            {auth.invited_at && (
              <div className="mt-4 rounded-lg border border-border p-3 text-xs space-y-1">
                <p className="font-semibold text-foreground mb-1">Dados do Auth</p>
                <div className="flex justify-between"><span className="text-muted-foreground">Convite enviado</span><span>{formatDateTime(auth.invited_at)}</span></div>
                {auth.email_confirmed_at && <div className="flex justify-between"><span className="text-muted-foreground">E-mail confirmado</span><span>{formatDateTime(auth.email_confirmed_at)}</span></div>}
                {auth.last_sign_in_at && <div className="flex justify-between"><span className="text-muted-foreground">Último sign-in</span><span>{formatDateTime(auth.last_sign_in_at)}</span></div>}
              </div>
            )}
          </TabsContent>

          {/* ABA SESSÕES */}
          <TabsContent value="sessoes" className="px-6 pb-6 mt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Histórico de Sessões</h3>
                <p className="text-xs text-muted-foreground">Últimas 30 sessões registradas</p>
              </div>
              <Badge variant="outline" className="text-xs">{detalhe?.total_sessoes ?? sessions?.length ?? 0} total</Badge>
            </div>

            {sessionsLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : !sessions?.length ? (
              <p className="text-sm text-muted-foreground">Nenhuma sessão registrada.</p>
            ) : (
              <div className="border border-border rounded-lg overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Login</TableHead>
                      <TableHead className="text-xs">Logout</TableHead>
                      <TableHead className="text-xs">Duração</TableHead>
                      <TableHead className="text-xs">Dispositivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-xs">{formatDateTime(s.login_at)}</TableCell>
                        <TableCell className="text-xs">
                          {s.logout_at ? formatDateTime(s.logout_at) : (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 text-[10px]">Sessão ativa</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{s.duracao_minutos ? `${s.duracao_minutos} min` : "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate" title={s.user_agent || ""}>
                          {s.user_agent ? parseUserAgent(s.user_agent) : s.ip_address || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ABA ATIVIDADE */}
          <TabsContent value="atividade" className="px-6 pb-6 mt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Atividade no Hub</h3>
                <p className="text-xs text-muted-foreground">Últimas 50 ações registradas</p>
              </div>
              <Badge variant="outline" className="text-xs">{detalhe?.total_atividades ?? activities?.length ?? 0} total</Badge>
            </div>

            {activitiesLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : !activities?.length ? (
              <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-auto">
                {activities.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-3 text-sm border-b border-border pb-2 last:border-0">
                    <span className="text-base mt-0.5">{ACAO_ICONS[a.acao] || "📌"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{a.acao}</p>
                      {a.detalhe && <p className="text-xs text-muted-foreground">{a.detalhe}</p>}
                      {a.pagina && <p className="text-xs text-muted-foreground">Página: {a.pagina}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(a.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function InfoField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs mb-0.5">{label}</p>
      <p className={`font-medium ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function parseUserAgent(ua: string): string {
  if (!ua) return "-";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Edge")) return "Edge";
  if (ua.includes("Mobile")) return "Mobile";
  return ua.slice(0, 30);
}
