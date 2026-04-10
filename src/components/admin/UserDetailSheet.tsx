import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { getConviteStatus } from "@/components/admin/ConviteBadge";

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
  blocked: boolean;
  active: boolean;
  created_at: string | null;
  ultimo_acesso: string | null;
  pre_cadastrado: boolean;
  tem_conta?: boolean;
  area?: string | null;
  gestor?: string | null;
  convite_status?: string | null;
  convite_enviado_em?: string | null;
  convite_aceito_em?: string | null;
  convite_expira_em?: string | null;
  convite_cancelado_em?: string | null;
  convite_reenvios?: number | null;
  operacao_tipo?: string | null;
}

function formatCpfFull(cpf: string | null): string {
  if (!cpf || cpf.length !== 11) return cpf || "-";
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

function getStatusBadge(u: Usuario) {
  if (u.blocked) return { label: "Bloqueado", className: "bg-red-500/10 text-red-400" };
  if (u.tem_conta === false) return { label: "Pré-cadastrado", className: "bg-blue-500/10 text-blue-400" };
  if (!u.active && !u.role) return { label: "Aguardando", className: "bg-yellow-500/10 text-yellow-400" };
  return { label: "Ativo", className: "bg-green-500/10 text-green-400" };
}

interface Props {
  user: Usuario | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailSheet({ user, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();

  // Fetch fresh user data from the RPC when opened
  const { data: freshUser } = useQuery({
    queryKey: ["admin-usuario-detalhe", user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const { data, error } = await supabase.rpc("rpc_admin_lista_usuarios" as any);
      if (error) throw error;
      const found = ((data as any[]) || []).find(
        (r: any) => r.email?.toLowerCase() === user.email.toLowerCase()
      );
      return found ? { ...found, profile_id: found.id } as unknown as Usuario : null;
    },
    enabled: open && !!user?.email,
    refetchInterval: open ? 10000 : false, // poll every 10s while open
  });

  const displayUser = freshUser || user;

  const { data: accessLogs, isLoading } = useQuery({
    queryKey: ["user-access-logs", displayUser?.user_id],
    queryFn: async () => {
      if (!displayUser?.user_id) return [];
      const { data, error } = await supabase
        .from("access_logs")
        .select("logged_in_at, logged_out_at, duration_minutes, ip_address")
        .eq("user_id", displayUser.user_id)
        .order("logged_in_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: open && !!displayUser?.user_id,
  });

  // Realtime: refresh when team_reference changes
  useEffect(() => {
    if (!open || !user?.email) return;
    const channel = supabase
      .channel(`detail-${user.email}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_reference" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-usuario-detalhe", user.email] });
          queryClient.invalidateQueries({ queryKey: ["user-access-logs", displayUser?.user_id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, user?.email, displayUser?.user_id, queryClient]);

  if (!displayUser) return null;

  const status = getStatusBadge(displayUser);
  const vinculo = displayUser.role === "BANKER" ? displayUser.banker_name : displayUser.role === "FINDER" ? displayUser.finder_name : null;
  const conviteStatus = getConviteStatus(displayUser);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{displayUser.full_name || displayUser.email}</SheetTitle>
          <SheetDescription>Detalhes, convite e histórico de acesso</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* User info */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-foreground">Dados do Usuário</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">E-mail</p>
                <p className="font-medium">{displayUser.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">CPF</p>
                <p className="font-medium font-mono">{formatCpfFull(displayUser.cpf)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Perfil</p>
                <p className="font-medium">{displayUser.role || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Financial Advisor/Finder</p>
                <p className="font-medium">{vinculo || "-"}</p>
              </div>
              {displayUser.role === "OPERACOES" && (
                <div>
                  <p className="text-muted-foreground text-xs">Tipo de Operação</p>
                  <p className="font-medium">{displayUser.operacao_tipo || "—"}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground text-xs">Área</p>
                <p className="font-medium">{displayUser.area || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Gestor</p>
                <p className="font-medium">{displayUser.gestor || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Empresa</p>
                <p className="font-medium">{displayUser.empresa || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Status</p>
                <Badge variant="outline" className={status.className}>{status.label}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Cadastrado em</p>
                <p className="font-medium">{displayUser.created_at ? new Date(displayUser.created_at).toLocaleDateString("pt-BR") : "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Último Acesso</p>
                <p className="font-medium">{displayUser.ultimo_acesso ? formatDateTime(displayUser.ultimo_acesso) : "Nunca"}</p>
              </div>
            </div>
          </div>

          {/* Invite history */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-foreground">Histórico do Convite</h3>
            <div className="space-y-3">
              {displayUser.convite_enviado_em && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-blue-500">📤</span>
                  <span className="text-muted-foreground">Convite enviado em</span>
                  <span className="font-medium ml-auto">{formatDateTime(displayUser.convite_enviado_em)}</span>
                </div>
              )}
              {displayUser.convite_expira_em && conviteStatus === "enviado" && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-orange-500">⏱️</span>
                  <span className="text-muted-foreground">Expira em</span>
                  <span className="font-medium ml-auto">{formatDateTime(displayUser.convite_expira_em)}</span>
                </div>
              )}
              {displayUser.convite_aceito_em && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-green-500">✅</span>
                  <span className="text-muted-foreground">Convite aceito em</span>
                  <span className="font-medium ml-auto">{formatDateTime(displayUser.convite_aceito_em)}</span>
                </div>
              )}
              {displayUser.convite_cancelado_em && conviteStatus === "cancelado" && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-red-500">🚫</span>
                  <span className="text-muted-foreground">Convite cancelado em</span>
                  <span className="font-medium ml-auto">{formatDateTime(displayUser.convite_cancelado_em)}</span>
                </div>
              )}
              {(displayUser.convite_reenvios ?? 0) > 0 && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">↩️</span>
                  <span className="text-muted-foreground">Reenvios</span>
                  <span className="font-medium ml-auto">{displayUser.convite_reenvios}x</span>
                </div>
              )}
              {!displayUser.convite_enviado_em && !displayUser.convite_aceito_em && (
                <p className="text-sm text-muted-foreground">Nenhum convite enviado.</p>
              )}
            </div>
          </div>

          {/* Access logs */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-foreground">Histórico de Sessões</h3>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : !accessLogs?.length ? (
              <p className="text-sm text-muted-foreground">Nenhum registro de acesso encontrado.</p>
            ) : (
              <div className="border border-border rounded-lg overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Login</TableHead>
                      <TableHead className="text-xs">Logout</TableHead>
                      <TableHead className="text-xs">Duração</TableHead>
                      <TableHead className="text-xs">IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accessLogs.map((log, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{formatDateTime(log.logged_in_at)}</TableCell>
                        <TableCell className="text-xs">{formatDateTime(log.logged_out_at)}</TableCell>
                        <TableCell className="text-xs">{log.duration_minutes ? `${log.duration_minutes} min` : "-"}</TableCell>
                        <TableCell className="text-xs font-mono">{log.ip_address || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
