import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function DashComercial() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Dash Comercial</h1>
          <p className="text-sm text-muted-foreground mt-1">Dashboard Power BI (TailorPartners)</p>
        </div>

        <Card>
          <CardContent className="flex items-center justify-center gap-3 py-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Carregando dashboard...</span>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
