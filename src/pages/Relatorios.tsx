import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function Relatorios() {
  return (
    <AppLayout>
      <div className="animate-fade-in">
        <h1 className="text-2xl font-display font-bold text-foreground mb-6">Relatórios</h1>
        <Card className="p-12 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Em breve</p>
          <p className="text-sm mt-1">Os relatórios estão sendo desenvolvidos.</p>
        </Card>
      </div>
    </AppLayout>
  );
}
