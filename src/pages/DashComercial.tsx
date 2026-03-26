import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Maximize, X, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const POWERBI_URL =
  "https://app.powerbi.com/reportEmbed?reportId=b727e014-fd47-4c15-9917-01f41619fc61&autoAuth=true&ctid=3332cd4c-5c72-4dfa-8bde-4dad53c24a2f";

export default function DashComercial() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeout, setTimeout_] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const allowed = user?.email?.endsWith("@tailorpartners.com.br") ?? false;

  const handleLoad = useCallback(() => {
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!allowed) return;
    const timer = window.setTimeout(() => setTimeout_(true), 15000);
    if (!loading) clearTimeout(timer);
    return () => clearTimeout(timer);
  }, [allowed, loading]);

  // Access denied
  if (!allowed) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Dash Comercial</h1>
            <p className="text-sm text-muted-foreground mt-1">Dashboard Power BI (TailorPartners)</p>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <AlertTriangle className="h-10 w-10 text-destructive" />
              <h2 className="text-lg font-semibold text-foreground">Acesso negado</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Entre com seu email corporativo TailorPartners para acessar o Dash Comercial.
                Se o problema persistir, contate o administrador do Dashboard.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Dash Comercial</h1>
            <p className="text-sm text-muted-foreground mt-1">Dashboard Power BI (TailorPartners)</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setFullscreen(true)}>
            <Maximize className="h-4 w-4 mr-1" /> Tela cheia
          </Button>
        </div>

        {/* Timeout warning */}
        {timeout && loading && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Dashboard não carregou</AlertTitle>
            <AlertDescription>
              Verifique se você está logado no Microsoft/Power BI com o <strong>mesmo email corporativo</strong> do CRM.
              Caso esteja com outra conta, troque a conta e tente novamente.
            </AlertDescription>
          </Alert>
        )}

        {/* Iframe area */}
        <div className="relative rounded-lg border overflow-hidden">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center gap-3 bg-card">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Carregando dashboard...</span>
            </div>
          )}
          <iframe
            src={POWERBI_URL}
            className="w-full border-0"
            style={{ height: "calc(100vh - 180px)" }}
            allowFullScreen
            onLoad={handleLoad}
          />
        </div>
      </div>

      {/* Fullscreen overlay */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <span className="text-sm font-medium text-foreground">Dash Comercial — Tela cheia</span>
            <Button variant="ghost" size="icon" onClick={() => setFullscreen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <iframe
            src={POWERBI_URL}
            className="flex-1 w-full border-0"
            allowFullScreen
          />
        </div>
      )}
    </AppLayout>
  );
}
