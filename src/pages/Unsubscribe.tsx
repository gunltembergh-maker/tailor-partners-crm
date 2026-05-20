import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MailCheck, MailX, MailWarning } from "lucide-react";
import { LOGO_DARK_BG } from "@/lib/constants";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type State =
  | { kind: "loading" }
  | { kind: "valid"; email: string }
  | { kind: "already"; email: string }
  | { kind: "done"; email: string }
  | { kind: "invalid"; message: string }
  | { kind: "submitting"; email: string }
  | { kind: "error"; message: string };

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid", message: "Link sem token. Verifique o email recebido." });
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${FUNCTIONS_URL}?token=${encodeURIComponent(token)}`, {
          method: "GET",
          headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
        });
        const json = await res.json();
        if (json.status === "valid") setState({ kind: "valid", email: json.email });
        else if (json.status === "already_unsubscribed") setState({ kind: "already", email: json.email });
        else setState({ kind: "invalid", message: json.message ?? "Link inválido ou expirado." });
      } catch (e: any) {
        setState({ kind: "error", message: e?.message ?? "Erro ao validar link." });
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (state.kind !== "valid") return;
    setState({ kind: "submitting", email: state.email });
    try {
      const res = await fetch(FUNCTIONS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (json.status === "unsubscribed" || json.status === "already_unsubscribed") {
        setState({ kind: "done", email: json.email });
      } else {
        setState({ kind: "error", message: json.message ?? "Erro ao confirmar descadastro." });
      }
    } catch (e: any) {
      setState({ kind: "error", message: e?.message ?? "Erro ao confirmar descadastro." });
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#082537] to-[#0b3d57] p-6">
      <img src={LOGO_DARK_BG} alt="Tailor Partners" className="w-[160px] mb-8" />
      <Card className="w-full max-w-md bg-white shadow-xl">
        <CardHeader>
          <CardTitle className="text-[#082537]">Comunicações por Email</CardTitle>
          <CardDescription>Hub Grupo Tailor Partners</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.kind === "loading" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Validando link…
            </div>
          )}

          {state.kind === "valid" && (
            <>
              <div className="flex items-start gap-3">
                <MailWarning className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm">Confirmar descadastro do email:</p>
                  <p className="text-sm font-medium text-[#082537]">{state.email}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Você deixará de receber comunicações operacionais do Hub Tailor Partners.
                    Emails de autenticação (login, recuperação de senha) continuam sendo enviados.
                  </p>
                </div>
              </div>
              <Button onClick={confirm} className="w-full bg-[#0A2337] hover:bg-[#082537]">
                Confirmar descadastro
              </Button>
            </>
          )}

          {state.kind === "submitting" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Processando…
            </div>
          )}

          {state.kind === "done" && (
            <div className="flex items-start gap-3">
              <MailCheck className="h-5 w-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#082537]">Descadastro confirmado</p>
                <p className="text-xs text-muted-foreground mt-1">
                  O email <span className="font-medium">{state.email}</span> não receberá mais comunicações do Hub.
                </p>
              </div>
            </div>
          )}

          {state.kind === "already" && (
            <div className="flex items-start gap-3">
              <MailCheck className="h-5 w-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#082537]">Você já está descadastrado</p>
                <p className="text-xs text-muted-foreground mt-1">
                  O email <span className="font-medium">{state.email}</span> já está na lista de descadastrados.
                </p>
              </div>
            </div>
          )}

          {state.kind === "invalid" && (
            <div className="flex items-start gap-3">
              <MailX className="h-5 w-5 text-destructive mt-0.5" />
              <p className="text-sm text-muted-foreground">{state.message}</p>
            </div>
          )}

          {state.kind === "error" && (
            <div className="flex items-start gap-3">
              <MailX className="h-5 w-5 text-destructive mt-0.5" />
              <p className="text-sm text-muted-foreground">{state.message}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
