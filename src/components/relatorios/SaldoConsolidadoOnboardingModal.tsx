import { Filter, Table as TableIcon, Download, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  {
    icon: <Filter className="w-5 h-5" />,
    title: "Filtros",
    subtitle: "Use os filtros para refinar sua visão",
    description:
      "Filtre por Casa (XP, Avenue, Morgan Stanley) e Data. Pesquise clientes pelo nome ou CPF para encontrar rapidamente o que precisa.",
  },
  {
    icon: <TableIcon className="w-5 h-5" />,
    title: "Tabela de Saldos",
    subtitle: "Visualize a posição consolidada de cada cliente",
    description:
      "Veja o saldo total por cliente, com detalhamento por casa de custódia. Os valores são atualizados diariamente.",
  },
  {
    icon: <Download className="w-5 h-5" />,
    title: "Exportar para Excel",
    subtitle: "Baixe sua visão filtrada com 1 clique",
    description:
      'O botão "Exportar" gera uma planilha Excel com todos os clientes que estão na sua tela atual, pronta para análise ou envio.',
  },
  {
    icon: <Mail className="w-5 h-5" />,
    title: "Enviar por E-mail",
    subtitle: "Mande o saldo direto pro cliente",
    description:
      'Selecione um cliente e clique em "Enviar por E-mail" para gerar uma mensagem personalizada com o saldo consolidado dele, pronta para enviar.',
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SaldoConsolidadoOnboardingModal({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-2xl font-bold text-[#082537]">
            Bem-vindo ao Saldo Consolidado
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Veja como aproveitar a tela em 4 passos rápidos
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-muted/30 p-4 flex flex-col gap-2 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#082537] text-white text-sm font-bold shrink-0">
                  {i + 1}
                </div>
                <div className="text-[#082537]">{step.icon}</div>
                <h3 className="font-semibold text-foreground text-sm">{step.title}</h3>
              </div>
              <p className="text-xs font-medium text-foreground/80">{step.subtitle}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

        <DialogFooter className="sm:justify-center">
          <Button
            onClick={onClose}
            className="bg-[#082537] hover:bg-[#002035] text-white px-8"
          >
            Entendi, vamos começar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
