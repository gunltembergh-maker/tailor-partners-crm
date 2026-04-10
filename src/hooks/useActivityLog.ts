import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useActivityLog() {
  const { user } = useAuth();

  const logActivity = useCallback(
    async (acao: string, detalhe?: string, pagina?: string) => {
      if (!user?.id) return;
      try {
        await supabase.from("user_activity_log" as any).insert({
          user_id: user.id,
          email: user.email,
          acao,
          detalhe: detalhe || null,
          pagina: pagina || null,
        } as any);
      } catch {
        // silent fail — activity logging should never block the user
      }
    },
    [user?.id, user?.email]
  );

  return { logActivity };
}
