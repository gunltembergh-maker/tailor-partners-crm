import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ViewAsProfile {
  /** Stable key used for selection — email-based to support pre-registered users */
  key: string;
  user_id: string | null;
  full_name: string;
  role: string;
  banker_name: string | null;
  finder_name: string | null;
  advisor_name: string | null;
  preCadastrado: boolean;
}

interface ViewAsContextType {
  viewAsKey: string | null;
  viewAsProfile: ViewAsProfile | null;
  setViewAs: (key: string | null) => void;
  teamMembers: ViewAsProfile[];
  isLider: boolean;
  viewLoading: boolean;
  /** @deprecated use viewAsKey */
  viewAsUserId: string | null;
}

const ViewAsContext = createContext<ViewAsContextType>({
  viewAsKey: null,
  viewAsProfile: null,
  setViewAs: () => {},
  teamMembers: [],
  isLider: false,
  viewLoading: false,
  viewAsUserId: null,
});

export function ViewAsProvider({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  const [viewAsKey, setViewAsKey] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<ViewAsProfile[]>([]);
  const isLider = role === "LIDER" || role === "ADMIN";

  useEffect(() => {
    if (!isLider) return;
    async function loadTeam() {
      const { data } = await supabase.rpc("rpc_admin_lista_usuarios" as any);
      if (!data) return;
      const members: ViewAsProfile[] = (data as any[])
        .filter((u: any) => u.email) // must have email
        .map((u: any) => ({
          key: u.email as string,
          user_id: u.user_id ?? null,
          full_name: u.full_name || "Usuário",
          role: u.role || "",
          banker_name: u.banker_name ?? null,
          finder_name: u.finder_name ?? null,
          advisor_name: u.advisor_name ?? null,
          preCadastrado: !u.user_id,
        }));
      setTeamMembers(members);
    }
    loadTeam();
  }, [isLider]);

  const viewAsProfile = viewAsKey
    ? teamMembers.find((m) => m.key === viewAsKey) ?? null
    : null;

  function setViewAs(key: string | null) {
    setViewLoading(true);
    setViewAsKey(key);
    setTimeout(() => setViewLoading(false), 400);
  }

  return (
    <ViewAsContext.Provider
      value={{
        viewAsKey,
        viewAsProfile,
        setViewAs,
        teamMembers,
        isLider,
        viewLoading,
        viewAsUserId: viewAsProfile?.user_id ?? null,
      }}
    >
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
