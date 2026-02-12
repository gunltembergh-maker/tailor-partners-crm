import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function Paineis() {
  return (
    <AppLayout>
      <div className="animate-fade-in">
        <h1 className="text-2xl font-display font-bold text-foreground mb-6">Painéis</h1>
        <Card className="p-12 text-center text-muted-foreground">
          <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Em breve</p>
          <p className="text-sm mt-1">Os painéis estão sendo desenvolvidos.</p>
        </Card>
      </div>
    </AppLayout>
  );
}
