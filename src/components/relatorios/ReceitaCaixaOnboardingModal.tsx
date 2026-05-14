import { Calendar, Filter, ChevronRight, BarChart3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STEPS = [
  { icon: <Calendar className="w-5 h-5" />, title: "Filtro Ano/Mês no topo", subtitle: "Eixo principal da tela", description: "Por padrão abre no mês corrente, mas você pode escolher qualquer mês retroativo. Todos os visuais recalculam automaticamente." },
  { icon: <Filter className="w-5 h-5" />, title: "Filtros à esquerda", subtitle: "Refinamentos acumulativos", description: "Use Financial Advisor, Finder, Advisor XP, Canal, Categoria e Subcategoria para refinar sua análise. Os filtros são acumulativos. Em '+ Ações', alterne entre PF/PJ." },
  { icon: <ChevronRight className="w-5 h-5" />, title: "Pivots com drill", subtitle: "Expanda para ver detalhe", description: "Clique no ▶ ao lado da Categoria para expandir e ver as Subcategorias." },
  { icon: <BarChart3 className="w-5 h-5" />, title: "Gráficos temporais", subtitle: "Janela de 12 meses", description: "Mostram sempre os 12 meses anteriores ao mês selecionado no topo." },
];

interface Props { open: boolean; onClose: () => void; }

export function ReceitaCaixaOnboardingModal({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-2xl font-bold text-[#082537]">Bem-vindo à Receita Caixa</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">Veja como navegar pela tela em 4 passos</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          {STEPS.map((step, i) => (
            <div key={i} className="rounded-xl border border-border bg-muted/30 p-4 flex flex-col gap-2 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#082537] text-white text-sm font-bold shrink-0">{i + 1}</div>
                <div className="text-[#082537]">{step.icon}</div>
                <h3 className="font-semibold text-foreground text-sm">{step.title}</h3>
              </div>
              <p className="text-xs font-medium text-foreground/80">{step.subtitle}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
        <DialogFooter className="sm:justify-center">
          <Button onClick={onClose} className="bg-[#082537] hover:bg-[#002035] text-white px-8">Entendi, vamos começar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
