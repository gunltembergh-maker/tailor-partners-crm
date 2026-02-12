import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface TeamMember {
  user_id: string;
  full_name: string;
  role: string;
}

interface ViewAsContextType {
  viewAsUserId: string | null;
  setViewAs: (userId: string | null) => void;
  teamMembers: TeamMember[];
  isLider: boolean;
}

const ViewAsContext = createContext<ViewAsContextType>({
  viewAsUserId: null,
  setViewAs: () => {},
  teamMembers: [],
  isLider: false,
});

export function ViewAsProvider({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  const [viewAsUserId, setViewAs] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const isLider = role === "LIDER";

  useEffect(() => {
    if (!isLider) return;
    async function loadTeam() {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      if (!roles) return;
      const userIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      if (!profiles) return;
      const members = roles.map((r) => {
        const profile = profiles.find((p) => p.user_id === r.user_id);
        return {
          user_id: r.user_id,
          full_name: profile?.full_name || "Usuário",
          role: r.role,
        };
      });
      setTeamMembers(members);
    }
    loadTeam();
  }, [isLider]);

  return (
    <ViewAsContext.Provider value={{ viewAsUserId, setViewAs, teamMembers, isLider }}>
      {children}
    </ViewAsContext.Provider>
  );
}

export function useViewAs() {
  return useContext(ViewAsContext);
}
