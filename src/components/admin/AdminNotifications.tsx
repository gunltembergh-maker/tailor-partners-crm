import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useViewAs } from "@/contexts/ViewAsContext";
import { useToast } from "@/hooks/use-toast";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const PERFIS = ["ADMIN", "LIDER", "BANKER", "FINDER", "ASSESSOR", "OPERACOES"];

interface Notif {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  dados: any;
  lida: boolean;
  created_at: string;
}

export function AdminNotifications() {
  const { effectiveRole } = useViewAs();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [approveNotif, setApproveNotif] = useState<Notif | null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [approving, setApproving] = useState(false);

  const isAdmin = effectiveRole === "ADMIN" || effectiveRole === "LIDER";

  const { data: notifs } = useQuery({
    queryKey: ["admin-notificacoes"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_admin_notificacoes");
      if (error) throw error;
      return data as unknown as Notif[];
    },
    enabled: isAdmin,
    refetchInterval: 60000,
  });

  if (!isAdmin) return null;

  const unreadCount = notifs?.filter((n) => !n.lida).length ?? 0;

  const handleIgnore = async (id: string) => {
    await supabase.rpc("rpc_admin_marcar_notif_lida", { p_id: id });
    queryClient.invalidateQueries({ queryKey: ["admin-notificacoes"] });
  };

  const handleApprove = async () => {
    if (!approveNotif || !selectedRole) return;
    setApproving(true);
    try {
      const userId = approveNotif.dados?.user_id;
      if (!userId) throw new Error("user_id não encontrado na notificação");
      const { data, error } = await supabase.rpc("rpc_admin_aprovar_usuario", {
        p_user_id: userId,
        p_role: selectedRole,
        p_notif_id: approveNotif.id,
      });
      if (error) throw error;
      toast({ title: "Usuário aprovado!" });
      setApproveNotif(null);
      setSelectedRole("");
      queryClient.invalidateQueries({ queryKey: ["admin-notificacoes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setApproving(false);
    }
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-8 w-8">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 max-h-96 overflow-y-auto p-0">
          <div className="p-3 border-b border-border">
            <p className="text-sm font-semibold">Notificações</p>
          </div>
          {!notifs?.length ? (
            <p className="text-sm text-muted-foreground p-4 text-center">Nenhuma notificação</p>
          ) : (
            <div className="divide-y divide-border">
              {notifs.map((n) => (
                <div key={n.id} className={`p-3 text-sm ${n.lida ? "opacity-50" : ""}`}>
                  <p className="font-medium text-foreground">{n.titulo}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.mensagem}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(n.created_at).toLocaleDateString("pt-BR")}
                  </p>
                  {!n.lida && (
                    <div className="flex gap-2 mt-2">
                      {n.dados?.user_id && (
                        <Button size="sm" variant="default" className="h-6 text-xs" onClick={() => { setApproveNotif(n); setSelectedRole(""); }}>
                          Aprovar
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => handleIgnore(n.id)}>
                        Ignorar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Approve dialog */}
      <Dialog open={!!approveNotif} onOpenChange={() => setApproveNotif(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Usuário</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Selecione o perfil de acesso para {approveNotif?.dados?.email || "o usuário"}:
          </p>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o perfil..." />
            </SelectTrigger>
            <SelectContent>
              {PERFIS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveNotif(null)}>Cancelar</Button>
            <Button onClick={handleApprove} disabled={!selectedRole || approving}>
              {approving ? "Aprovando..." : "Aprovar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
