import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const PRIVILEGED_ROLES = new Set(["ADMIN", "LIDER"]);

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: { full_name: string; email: string; avatar_url: string | null } | null;
  role: string | null;
  permissoes: Record<string, boolean> | null;
  bankerName: string | null;
  finderName: string | null;
  primeiroAcesso: boolean;
  area: string | null;
  isBlocked: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, nomeCompleto: string, cpf?: string, empresa?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [role, setRole] = useState<string | null>(null);
  const [permissoes, setPermissoes] = useState<Record<string, boolean> | null>(null);
  const [bankerName, setBankerName] = useState<string | null>(null);
  const [finderName, setFinderName] = useState<string | null>(null);
  const [primeiroAcesso, setPrimeiroAcesso] = useState(false);
  const [area, setArea] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  let navigate: ReturnType<typeof useNavigate>;
  try {
    navigate = useNavigate();
  } catch {
    navigate = () => {};
  }

  useEffect(() => {
    let mounted = true;
    let sessionLoggedForUser: string | null = null;

    // Safety timeout: só libera UI se realmente não houver sessão.
    // Se há session mas perfil carregando, NÃO força loading=false — Loader continua.
    const safetyTimer = setTimeout(() => {
      if (!mounted) return;
      setSession(currentSession => {
        if (!currentSession) {
          console.warn('[useAuth] Safety timer: sem sessão após 5s, liberando UI');
          setLoading(false);
        } else {
          console.log('[useAuth] Safety timer: sessão existe mas perfil ainda carregando — mantendo Loader');
        }
        return currentSession;
      });
    }, 5000);

    // Centralized tracking helper — fire-and-forget, never blocks auth
    function trackLogin(uid: string, email: string | undefined) {
      if (sessionLoggedForUser === uid) return;
      sessionLoggedForUser = uid;

      // 1. Register session in user_sessions_log
      (async () => {
        try {
          await supabase.from("user_sessions_log" as any).insert({
            user_id: uid,
            email: email ?? null,
            login_at: new Date().toISOString(),
            user_agent: navigator.userAgent,
          } as any);
        } catch { /* silent */ }
      })();

      // 2. Register activity in user_activity_log
      (async () => {
        try {
          await supabase.from("user_activity_log" as any).insert({
            user_id: uid,
            email: email ?? null,
            acao: "Login",
            detalhe: "Sessão iniciada",
            pagina: window.location.pathname,
          } as any);
        } catch { /* silent */ }
      })();

      // 3. Update ultimo_acesso via RPC
      (async () => {
        try { await supabase.rpc("rpc_registrar_acesso" as any); } catch { /* silent */ }
      })();
    }

    function trackLogout(uid: string) {
      // Close open session
      (async () => {
        try {
          const { data: openSession } = await supabase
            .from("user_sessions_log" as any)
            .select("id, login_at")
            .eq("user_id", uid)
            .is("logout_at", null)
            .order("login_at", { ascending: false })
            .limit(1)
            .single();
          if (openSession) {
            const duracao = Math.round((Date.now() - new Date((openSession as any).login_at).getTime()) / 60000);
            await supabase.from("user_sessions_log" as any).update({
              logout_at: new Date().toISOString(),
              duracao_minutos: duracao,
            } as any).eq("id", (openSession as any).id);
          }
        } catch { /* silent */ }
      })();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Sinaliza que perfil está carregando — evita race com PermissionRoute
        setLoading(true);
        try {
          await fetchMeuPerfil(session.user.id, session.user);
        } catch (err) {
          console.error('[useAuth] Erro ao carregar perfil pós-login:', err);
        } finally {
          if (mounted) setLoading(false);
        }
        // Track login for all relevant events (fire-and-forget)
        if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED' || _event === 'INITIAL_SESSION') {
          trackLogin(session.user.id, session.user.email);
        }
      } else {
        if (_event === 'SIGNED_OUT' && user?.id) {
          trackLogout(user.id);
        }
        setProfile(null);
        setRole(null);
        setPermissoes(null);
        setBankerName(null);
        setFinderName(null);
        setPrimeiroAcesso(false);
        setArea(null);
        setIsBlocked(false);
        if (mounted) setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setLoading(true); // explicitamente sinaliza que perfil está carregando
        try {
          await fetchMeuPerfil(session.user.id, session.user);
          trackLogin(session.user.id, session.user.email);
        } catch (e) {
          console.error("Error fetching profile on init:", e);
        } finally {
          if (mounted) setLoading(false);
        }
      } else {
        if (mounted) setLoading(false);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  async function fetchMeuPerfil(userId: string, sessionUser?: User | null) {
    try {
      const { data, error } = await supabase.rpc("rpc_meu_perfil");
      if (error || !data) {
        await fetchProfileFallback(userId, sessionUser);
        return;
      }

      // rpc_meu_perfil returns a table (array). Handle both array and object.
      const perfil: any = Array.isArray(data) ? data[0] : data;
      if (!perfil) {
        await fetchProfileFallback(userId, sessionUser);
        return;
      }

      // Check if blocked — show waiting screen instead of signing out
      if (perfil.blocked) {
        setIsBlocked(true);
        // Fetch empresa to distinguish domain-rejected vs awaiting-approval
        const { data: blockedProfile } = await supabase
          .from("profiles")
          .select("full_name, email, avatar_url, empresa")
          .eq("user_id", userId)
          .single();
        setProfile(blockedProfile ?? { full_name: perfil.banker_name || "", email: "", avatar_url: null });
        setLoading(false);
        return;
      }

      // Fetch profile display info in background (non-blocking)
      supabase
        .from("profiles")
        .select("full_name, email, avatar_url")
        .eq("user_id", userId)
        .single()
        .then(({ data: profileRow }) => {
          if (profileRow) setProfile(profileRow);
          else setProfile({ full_name: perfil.banker_name || "", email: "", avatar_url: null });
        });
      setRole(perfil.role ?? ((sessionUser?.user_metadata?.perfil as string | undefined) ?? null));
      setPermissoes((perfil.permissoes as Record<string, boolean>) ?? null);
      setBankerName(perfil.banker_name ?? null);
      setFinderName(perfil.finder_name ?? null);
      setPrimeiroAcesso(perfil.primeiro_acesso ?? false);
      setArea(perfil.area ?? null);
    } catch {
      await fetchProfileFallback(userId, sessionUser);
    }
  }

  async function fetchProfileFallback(userId: string, sessionUser?: User | null) {
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email, avatar_url")
        .eq("user_id", userId)
        .single();

      if (!profileData) {
        // No profile exists — domain not authorized. Sign out immediately.
        console.warn("No profile found for user — unauthorized domain. Signing out.");
        await supabase.auth.signOut();
        try {
          navigate("/auth?blocked=dominio");
        } catch { /* ignore navigation errors */ }
        return;
      }

      setProfile(profileData);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      const fallbackRole = roleData?.role ?? ((sessionUser?.user_metadata?.perfil as string | undefined) ?? null);
      if (!fallbackRole) {
        // Role indeterminado — NÃO zerar permissoes, mantém null pra PermissionRoute renderizar Loader
        // até que próxima tentativa de fetchMeuPerfil resolva. Evita falso AccessDenied pra ADMIN.
        console.warn('[useAuth] fetchProfileFallback: role indeterminado — preservando permissoes=null');
        return;
      }
      setRole(fallbackRole);
      setPermissoes(PRIVILEGED_ROLES.has(fallbackRole) ? {} : {});
    } catch (e) {
      console.error("fetchProfileFallback error:", e);
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, nomeCompleto: string, cpf?: string, empresa?: string) => {
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome_completo: nomeCompleto,
          full_name: nomeCompleto,
          cpf: cpf ?? undefined,
          empresa: empresa ?? undefined,
        },
        emailRedirectTo: window.location.origin,
      },
    });

    // After signup, try to update profile with CPF and empresa
    if (!error && signUpData?.user) {
      await supabase
        .from("profiles")
        .update({
          nome_completo: nomeCompleto,
          cpf: cpf ?? null,
          empresa: empresa ?? null,
        })
        .eq("user_id", signUpData.user.id);
    }

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, role, permissoes, bankerName, finderName, primeiroAcesso, area, isBlocked, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
