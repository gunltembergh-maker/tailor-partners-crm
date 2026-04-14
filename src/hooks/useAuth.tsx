import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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

    // Safety timeout: never leave user stuck on loading screen
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

    let sessionLoggedForUser: string | null = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchMeuPerfil(session.user.id), 0);

        // Track session login for SIGNED_IN, TOKEN_REFRESHED (SSO/magic-link), and INITIAL_SESSION
        if (
          (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED' || _event === 'INITIAL_SESSION') &&
          sessionLoggedForUser !== session.user.id
        ) {
          sessionLoggedForUser = session.user.id;
          // Fire-and-forget: don't block auth flow
          const uid = session.user.id;
          const email = session.user.email;
          setTimeout(async () => {
            try {
              await supabase.from("user_sessions_log" as any).insert({
                user_id: uid,
                email: email,
                login_at: new Date().toISOString(),
                user_agent: navigator.userAgent,
              } as any);
            } catch {
              // silent fail
            }
          }, 100);
        }
      } else {
        // Track session logout
        if (_event === 'SIGNED_OUT' && user?.id) {
          // Fire-and-forget: don't block sign-out
          const uid = user.id;
          supabase
            .from("user_sessions_log" as any)
            .select("id, login_at")
            .eq("user_id", uid)
            .is("logout_at", null)
            .order("login_at", { ascending: false })
            .limit(1)
            .single()
            .then(({ data: openSession }) => {
              if (openSession) {
                const duracao = Math.round((Date.now() - new Date((openSession as any).login_at).getTime()) / 60000);
                supabase.from("user_sessions_log" as any).update({
                  logout_at: new Date().toISOString(),
                  duracao_minutos: duracao,
                } as any).eq("id", (openSession as any).id);
              }
            });
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
      try {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchMeuPerfil(session.user.id);
        }
      } catch (e) {
        console.error("Error fetching profile on init:", e);
      } finally {
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

  async function fetchMeuPerfil(userId: string) {
    try {
      const { data, error } = await supabase.rpc("rpc_meu_perfil");
      if (error || !data) {
        await fetchProfileFallback(userId);
        return;
      }

      // rpc_meu_perfil returns a table (array). Handle both array and object.
      const perfil: any = Array.isArray(data) ? data[0] : data;
      if (!perfil) {
        await fetchProfileFallback(userId);
        return;
      }

      // Check if blocked — show waiting screen instead of signing out
      if (perfil.blocked) {
        setIsBlocked(true);
        setProfile({ full_name: perfil.banker_name || "", email: "", avatar_url: null });
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
      setRole(perfil.role ?? null);
      setPermissoes((perfil.permissoes as Record<string, boolean>) ?? null);
      setBankerName(perfil.banker_name ?? null);
      setFinderName(perfil.finder_name ?? null);
      setPrimeiroAcesso(perfil.primeiro_acesso ?? false);
      setArea(perfil.area ?? null);

      // Register access timestamp (fire-and-forget)
      (async () => { try { await supabase.rpc("rpc_registrar_acesso" as any); } catch {} })();
    } catch {
      await fetchProfileFallback(userId);
    }
  }

  async function fetchProfileFallback(userId: string) {
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email, avatar_url")
        .eq("user_id", userId)
        .single();
      if (profileData) setProfile(profileData);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      setRole(roleData?.role ?? null);
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
