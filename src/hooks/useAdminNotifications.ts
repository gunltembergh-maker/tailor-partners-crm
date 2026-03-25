import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useCallback } from "react";

interface AdminNotification {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  dados: { nome?: string; email?: string; user_id?: string } | null;
  lida: boolean;
  created_at: string;
}

export function useAdminNotifications() {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = role === "ADMIN";

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["admin-notificacoes"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_admin_notificacoes" as any);
      if (error) throw error;
      return (data as unknown as AdminNotification[]) ?? [];
    },
    refetchInterval: 60_000,
    enabled: isAdmin,
  });

  const unreadCount = notifications.filter((n) => !n.lida).length;
  const unreadNotifications = notifications.filter((n) => !n.lida);

  const dismiss = useCallback(async (notifId: string) => {
    const { error } = await supabase.rpc("rpc_admin_marcar_notif_lida" as any, { p_id: notifId });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["admin-notificacoes"] });
  }, [queryClient, toast]);

  const approve = useCallback(async (userId: string, selectedRole: string, notifId: string) => {
    const { data, error } = await supabase.rpc("rpc_admin_aprovar_usuario" as any, {
      p_user_id: userId,
      p_role: selectedRole,
      p_notif_id: notifId,
    });
    if (error) {
      toast({ title: "Erro ao aprovar", description: error.message, variant: "destructive" });
      return false;
    }
    const result = data as any;
    if (result?.success === false) {
      toast({ title: "Erro", description: result.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Acesso liberado com sucesso!" });
    queryClient.invalidateQueries({ queryKey: ["admin-notificacoes"] });
    queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
    return true;
  }, [queryClient, toast]);

  return { notifications, unreadNotifications, unreadCount, isLoading, isAdmin, dismiss, approve };
}
