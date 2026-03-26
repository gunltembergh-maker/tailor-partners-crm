import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ViewAsProfile {
  user_id: string;
  full_name: string;
  role: string;
  banker_name: string | null;
  finder_name: string | null;
  advisor_name: string | null;
}

interface ViewAsContextType {
  viewAsUserId: string | null;
  viewAsProfile: ViewAsProfile | null;
  setViewAs: (userId: string | null) => void;
  teamMembers: ViewAsProfile[];
  isLider: boolean;
}

const ViewAsContext = createContext<ViewAsContextType>({
  viewAsUserId: null,
  viewAsProfile: null,
  setViewAs: () => {},
  teamMembers: [],
  isLider: false,
});

export function ViewAsProvider({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  const [viewAsUserId, setViewAsId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<ViewAsProfile[]>([]);
  const isLider = role === "LIDER" || role === "ADMIN";

  useEffect(() => {
    if (!isLider) return;
    async function loadTeam() {
      const { data } = await supabase.rpc("rpc_admin_lista_usuarios" as any);
      if (!data) return;
      const members: ViewAsProfile[] = (data as any[]).map((u: any) => ({
        user_id: u.user_id,
        full_name: u.full_name || "Usuário",
        role: u.role || "",
        banker_name: u.banker_name ?? null,
        finder_name: u.finder_name ?? null,
        advisor_name: u.advisor_name ?? null,
      }));
      setTeamMembers(members);
    }
    loadTeam();
  }, [isLider]);

  const viewAsProfile = viewAsUserId
    ? teamMembers.find((m) => m.user_id === viewAsUserId) ?? null
    : null;

  function setViewAs(userId: string | null) {
    setViewAsId(userId);
  }

  return (
    <ViewAsContext.Provider value={{ viewAsUserId, viewAsProfile, setViewAs, teamMembers, isLider }}>
      {children}
    </ViewAsContext.Provider>
  );
}

export function useViewAs() {
  return useContext(ViewAsContext);
}

/**
 * Returns override filters based on the ViewAs selection.
 * When an Admin views as a BANKER, returns { p_banker: [banker_name] }, etc.
 * Returns empty object when no ViewAs is active.
 */
export function useViewAsFilters(): {
  overrideBanker: string[] | null;
  overrideFinder: string[] | null;
  overrideAdvisor: string[] | null;
  viewRole: string | null;
} {
  const { viewAsProfile } = useViewAs();
  if (!viewAsProfile) return { overrideBanker: null, overrideFinder: null, overrideAdvisor: null, viewRole: null };

  const { role, banker_name, finder_name, advisor_name } = viewAsProfile;

  if (role === "BANKER" && banker_name) {
    return { overrideBanker: [banker_name], overrideFinder: null, overrideAdvisor: null, viewRole: role };
  }
  if (role === "FINDER" && finder_name) {
    return { overrideBanker: null, overrideFinder: [finder_name], overrideAdvisor: null, viewRole: role };
  }
  if (role === "ASSESSOR" && advisor_name) {
    return { overrideBanker: null, overrideFinder: null, overrideAdvisor: [advisor_name], viewRole: role };
  }

  // LIDER, ADMIN, OPERACOES → no filter
  return { overrideBanker: null, overrideFinder: null, overrideAdvisor: null, viewRole: role };
}
