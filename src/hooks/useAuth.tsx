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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchMeuPerfil(session.user.id), 0);

        // Track session login
        if (_event === 'SIGNED_IN') {
          try {
            await supabase.from("user_sessions_log" as any).insert({
              user_id: session.user.id,
              email: session.user.email,
              login_at: new Date().toISOString(),
              user_agent: navigator.userAgent,
            } as any);
          } catch { /* silent */ }
        }
      } else {
        // Track session logout
        if (_event === 'SIGNED_OUT' && user?.id) {
          try {
            const { data: openSession } = await supabase
              .from("user_sessions_log" as any)
              .select("id, login_at")
              .eq("user_id", user.id)
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
        }

        setProfile(null);
        setRole(null);
        setPermissoes(null);
        setBankerName(null);
        setFinderName(null);
        setPrimeiroAcesso(false);
        setArea(null);
        setIsBlocked(false);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchMeuPerfil(session.user.id);
        }
      } catch (e) {
        console.error("Error fetching profile on init:", e);
      } finally {
        setLoading(false);
      }
    }).catch(() => {
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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

      // Fetch profile name/email from profiles table for display
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("full_name, email, avatar_url")
        .eq("user_id", userId)
        .single();

      setProfile(profileRow ?? {
        full_name: perfil.banker_name || "",
        email: "",
        avatar_url: null,
      });
      setRole(perfil.role ?? null);
      setPermissoes((perfil.permissoes as Record<string, boolean>) ?? null);
      setBankerName(perfil.banker_name ?? null);
      setFinderName(perfil.finder_name ?? null);
      setPrimeiroAcesso(perfil.primeiro_acesso ?? false);
      setArea(perfil.area ?? null);

      // Register access timestamp
      Promise.resolve(supabase.rpc("rpc_registrar_acesso" as any)).catch(() => {});
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
