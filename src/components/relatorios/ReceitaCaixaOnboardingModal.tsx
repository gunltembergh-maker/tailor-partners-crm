import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STEPS: { title: string; body: string }[] = [
  {
    title: "O que é esse dashboard",
    body: "Este dashboard mostra a Receita Caixa do Grupo Tailor — comissões brutas geradas, agrupadas por mês, categoria, advisor e cliente. Os dados são atualizados diariamente a partir do SharePoint.",
  },
  {
    title: "Quando os dados foram atualizados",
    body: "No canto superior direito você vê quando os dados foram atualizados e quando a última ingestão aconteceu. Se quiser forçar uma atualização imediata, clique em 'Atualizar Dados'.",
  },
  {
    title: "Filtros para refinar a análise",
    body: "Use os filtros à esquerda para refinar a análise por Financial Advisor, Finder, Advisor XP, Canal, Categoria e Subcategoria. Em '+ Ações' você encontra ainda o filtro de Tipo de Pessoa (PF/PJ). Os filtros se aplicam a todos os cards da tela simultaneamente.",
  },
  {
    title: "KPI principal — Receita do mês",
    body: "Mostra a receita do mês selecionado no topo, com variação percentual versus o mês anterior, valor de comparação e quantidade de clientes ativos que geraram receita. É a primeira métrica que executivos buscam.",
  },
  {
    title: "Receita por Advisor",
    body: "Lista os Advisors do XP por receita gerada no período selecionado. Útil para acompanhar performance individual e identificar top performers.",
  },
  {
    title: "Receita por Categoria",
    body: "Divide a receita por categoria de produto (Câmbio, Lavoro, Consórcio, Assessoria, Wealth Solutions, Seguro de Vida, Offshore, etc.). Câmbio costuma ser a maior categoria. Use para visualizar concentração.",
  },
  {
    title: "Receita por Subcategoria",
    body: "Detalha as categorias em subcategorias específicas (ex: dentro de Câmbio, mostra Spot, Forward, etc.). Clique no ▶ ao lado da categoria para expandir e ver o drill, sem precisar abrir relatório separado.",
  },
  {
    title: "Receita Total — últimos 12 meses",
    body: "Barras verticais empilhadas mostram a receita total mês a mês nos últimos 12 meses. Cada barra é colorida por categoria, permitindo ver evolução de cada produto. Útil para detectar tendências e sazonalidade.",
  },
  {
    title: "Matriz Financial Advisor / Finder / Canal",
    body: "Esse card permite alternar entre 3 visões via o toggle no topo: por Financial Advisor (FA), por Finder ou por Canal. Em todos, mostra uma matriz com receita de cada pessoa/canal por categoria. Use o botão 'Exportar Excel' para baixar essa visão.",
  },
  {
    title: "Fonte da Receita — composição mensal",
    body: "Diferente do gráfico anterior, aqui cada coluna é proporcional (sempre 100%) e mostra o percentual de cada categoria dentro do mês. Ideal para ver mudança no mix de produtos ao longo do tempo.",
  },
  {
    title: "Tooltips detalhados",
    body: "Passe o mouse sobre qualquer barra dos gráficos temporais para ver o detalhamento por categoria daquele mês — valor absoluto, percentual da composição e total geral.",
  },
  {
    title: "Tudo pronto!",
    body: "Você está pronto para usar o Dashboard Receita. Lembre-se: o botão de Ajuda no canto superior direito da tela reabre esse tutorial a qualquer momento. Em caso de dúvidas, fale com o Alessandro.",
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ReceitaCaixaOnboardingModal({ open, onClose }: Props) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const total = STEPS.length;
  const isLast = step === total - 1;
  const current = STEPS[step];
  const progressPct = ((step + 1) / total) * 100;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="max-w-[700px] p-0 gap-0"
        style={{ fontFamily: "'Source Sans 3', system-ui, sans-serif" }}
      >
        {/* Header */}
        <div style={{ padding: "32px 32px 16px 32px" }}>
          <p
            className="text-xs uppercase tracking-[0.15em] mb-2"
            style={{ color: "#5F7A8E" }}
          >
            Passo {step + 1} de {total}
          </p>
          <h2
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: 28,
              fontWeight: 400,
              color: "#0A2337",
              lineHeight: 1.15,
              letterSpacing: "-0.3px",
              margin: 0,
            }}
          >
            {step === 0 ? "Bem-vindo ao Dashboard Receita" : current.title}
          </h2>
          {step === 0 && (
            <p className="text-sm mt-2" style={{ color: "#5F7A8E" }}>
              Conheça cada componente da tela em alguns passos rápidos
            </p>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: "rgba(10,35,55,0.08)", margin: "0 32px" }}>
          <div
            style={{
              height: "100%",
              width: `${progressPct}%`,
              background: "#0A2337",
              transition: "width 0.25s ease",
            }}
          />
        </div>

        {/* Body */}
        <div style={{ padding: "24px 32px 16px 32px", minHeight: 160 }}>
          {step !== 0 && (
            <h3
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: 22,
                fontWeight: 400,
                color: "#0A2337",
                margin: "0 0 12px 0",
                letterSpacing: "-0.2px",
              }}
            >
              {current.title}
            </h3>
          )}
          {step === 0 && (
            <h3
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: 22,
                fontWeight: 400,
                color: "#0A2337",
                margin: "0 0 12px 0",
              }}
            >
              {current.title}
            </h3>
          )}
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.6,
              color: "#1a1a1a",
              margin: 0,
            }}
          >
            {current.body}
          </p>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: "16px 32px 28px 32px",
            borderTop: "1px solid rgba(10,35,55,0.08)",
            marginTop: 8,
          }}
        >
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="text-xs tabular-nums" style={{ color: "#5F7A8E" }}>
            {step + 1} / {total}
          </span>
          {isLast ? (
            <Button
              onClick={onClose}
              style={{ background: "#0A2337", color: "#fff" }}
              className="hover:opacity-90"
            >
              Entendi, vamos começar
            </Button>
          ) : (
            <Button
              onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
              style={{ background: "#0A2337", color: "#fff" }}
              className="hover:opacity-90 gap-1"
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
