import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";

export default function Prioridades() {
  return (
    <AppLayout>
      <div className="animate-fade-in">
        <h1 className="text-2xl font-display font-bold text-foreground mb-6">Tela de Prioridades</h1>
        <Card className="p-12 text-center text-muted-foreground">
          <Star className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Em breve</p>
          <p className="text-sm mt-1">A tela de prioridades está sendo desenvolvida.</p>
        </Card>
      </div>
    </AppLayout>
  );
}
