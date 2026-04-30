import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface ViewAsProfile {
  /** Stable key used for selection — email-based to support pre-registered users */
  key: string;
  user_id: string | null;
  full_name: string;
  email: string;
  role: string;
  banker_name: string | null;
  finder_name: string | null;
  advisor_name: string | null;
  permissoes?: Record<string, boolean> | null;
  preCadastrado: boolean;
}

interface ViewAsContextType {
  viewAsKey: string | null;
  viewAsProfile: ViewAsProfile | null;
  /** Activates Minha Visão for the given email (calls RPC + reloads). */
  setViewAs: (key: string | null) => Promise<void>;
  teamMembers: ViewAsProfile[];
  isLider: boolean;
  viewLoading: boolean;
  /** Effective user_id to use for permission/menu lookups — simulated when active. */
  effectiveUserId: string | null;
  /** Effective role for menu filtering — simulated when active. */
  effectiveRole: string | null;
  /** Effective permissoes for menu filtering — simulated when active. */
  effectivePermissoes: Record<string, boolean> | null;
  /** True when an Admin has Minha Visão active (simulating another user). */
  isViewingAs: boolean;
  /** @deprecated use viewAsProfile?.user_id */
  viewAsUserId: string | null;
}

const ViewAsContext = createContext<ViewAsContextType>({
  viewAsKey: null,
  viewAsProfile: null,
  setViewAs: async () => {},
  teamMembers: [],
  isLider: false,
  viewLoading: false,
  effectiveUserId: null,
  effectiveRole: null,
  effectivePermissoes: null,
  isViewingAs: false,
  viewAsUserId: null,
});

export function ViewAsProvider({ children }: { children: ReactNode }) {
  const { role, user, permissoes } = useAuth();
  const [viewAsProfile, setViewAsProfile] = useState<ViewAsProfile | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<ViewAsProfile[]>([]);
  const isLider = role === "LIDER" || role === "ADMIN";

  // Load team list (for the dropdown)
  useEffect(() => {
    if (!isLider) return;
    async function loadTeam() {
      const { data } = await supabase.rpc("rpc_admin_lista_usuarios" as any);
      if (!data) return;
      const members: ViewAsProfile[] = (data as any[])
        .filter((u: any) => u.email)
        .map((u: any) => ({
          key: u.email as string,
          user_id: u.user_id ?? null,
          full_name: u.full_name || "Usuário",
          email: u.email,
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

  // Hydrate active view on mount / user change
  useEffect(() => {
    if (!user) {
      setViewAsProfile(null);
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.rpc("rpc_admin_get_view_as" as any);
        if (error || !data) return;
        const d: any = data;
        if (d.ativo) {
          // Fetch effective permissoes for the simulated user (for sidebar)
          const perms = await fetchPermissoes(d.target_user_id);
          setViewAsProfile({
            key: d.target_email,
            user_id: d.target_user_id,
            full_name: d.target_full_name,
            email: d.target_email,
            role: d.target_role,
            banker_name: null,
            finder_name: null,
            advisor_name: null,
            permissoes: perms,
            preCadastrado: false,
          });
        } else {
          setViewAsProfile(null);
        }
      } catch {
        // silent
      }
    })();
  }, [user]);

  /**
   * Resolve effective permissoes for the simulated user, replicating the same
   * logic used by rpc_meu_perfil (which uses auth.uid() and can't be reused here):
   *   1. profiles.perfil_id -> perfis_acesso.permissoes (explicit override)
   *   2. fallback: user_roles.role -> perfis_acesso.nome -> permissoes
   */
  async function fetchPermissoes(userId: string, fallbackRole?: string | null): Promise<Record<string, boolean> | null> {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("perfil_id")
        .eq("user_id", userId)
        .maybeSingle();

      // 1. Explicit perfil_id override
      if (profile?.perfil_id) {
        const { data: perfil } = await supabase
          .from("perfis_acesso")
          .select("permissoes")
          .eq("id", profile.perfil_id)
          .maybeSingle();
          if (perfil?.permissoes) return perfil.permissoes as Record<string, boolean>;
      }

      // 2. Fallback: lookup by role name (matches rpc_meu_perfil JOIN pa.nome = ur.role)
      let roleName = fallbackRole ?? null;
      if (!roleName) {
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle();
        roleName = (roleRow?.role as string | undefined) ?? null;
      }
      if (!roleName) return {};

      const { data: perfilByName } = await supabase
        .from("perfis_acesso")
        .select("permissoes")
        .eq("nome", roleName)
        .maybeSingle();
      return (perfilByName?.permissoes as Record<string, boolean>) ?? {};
    } catch {
      return {};
    }
  }

  const setViewAs = useCallback(async (key: string | null) => {
    setViewLoading(true);
    try {
      if (!key) {
        const { data, error } = await supabase.rpc("rpc_admin_clear_view_as" as any);
        if (error) throw error;
        const d: any = data;
        toast.success(d?.mensagem || "Voltou para a visão Admin");
        // Reload to refresh all cached data with the real uid
        setTimeout(() => window.location.reload(), 400);
      } else {
        const { data, error } = await supabase.rpc("rpc_admin_set_view_as" as any, {
          p_target_email: key,
        } as any);
        if (error) throw error;
        const d: any = data;
        if (d?.sucesso === false) {
          toast.error(d?.mensagem || "Não foi possível ativar a Minha Visão");
          setViewLoading(false);
          return;
        }
        toast.success(d?.mensagem || `Visualizando como ${d?.target_full_name}`);
        setTimeout(() => window.location.reload(), 400);
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao alterar Minha Visão");
      setViewLoading(false);
    }
  }, []);

  // Effective values used by sidebar / menus
  const effectiveUserId = viewAsProfile?.user_id ?? user?.id ?? null;
  const effectiveRole = viewAsProfile?.role ?? role ?? null;
  const effectivePermissoes = viewAsProfile
    ? viewAsProfile.permissoes ?? {}
    : permissoes;

  return (
    <ViewAsContext.Provider
      value={{
        viewAsKey: viewAsProfile?.key ?? null,
        viewAsProfile,
        setViewAs,
        teamMembers,
        isLider,
        viewLoading,
        effectiveUserId,
        effectiveRole,
        effectivePermissoes,
        isViewingAs: !!viewAsProfile,
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
 * Returns the effective user id to use for permission lookups — simulated when active.
 */
export function useEffectiveUserId(): string | null {
  return useContext(ViewAsContext).effectiveUserId;
}

/**
 * Backwards-compat: the DB-side functions now apply the simulated uid automatically.
 * Returning nulls keeps the existing scoped filters from double-applying overrides.
 */
export function useViewAsFilters(): {
  overrideBanker: string[] | null;
  overrideFinder: string[] | null;
  overrideAdvisor: string[] | null;
  viewRole: string | null;
} {
  const { viewAsProfile } = useViewAs();
  return {
    overrideBanker: null,
    overrideFinder: null,
    overrideAdvisor: null,
    viewRole: viewAsProfile?.role ?? null,
  };
}
