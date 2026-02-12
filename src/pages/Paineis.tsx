import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Brain, Share2, BookOpen, TrendingUp, ChevronRight } from "lucide-react";

const steps = [
  {
    icon: Globe,
    title: "Captura de Dados",
    description: "Fontes de entrada de leads e contatos",
    items: ["Site", "WhatsApp", "Formulários", "Plataformas"],
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Brain,
    title: "Processamento & Análise",
    description: "Qualificação e classificação automática",
    items: ["Segmento", "Potencial", "Score"],
    color: "text-accent-foreground",
    bg: "bg-accent/30",
  },
  {
    icon: Share2,
    title: "Distribuição Interna",
    description: "Roteamento para equipes responsáveis",
    items: ["Comercial", "Marketing", "Atendimento", "Operações"],
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: BookOpen,
    title: "Histórico & Aprendizado",
    description: "Memória contínua de interações",
    items: ["Registro contínuo", "Alertas", "Previsões"],
    color: "text-accent-foreground",
    bg: "bg-accent/30",
  },
  {
    icon: TrendingUp,
    title: "Expansão de Receita",
    description: "Oportunidades de crescimento na base",
    items: ["Upsell", "Cross-sell", "Novas ofertas"],
    color: "text-primary",
    bg: "bg-primary/10",
  },
];

export default function Paineis() {
  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold text-foreground">
            Fluxo de Inteligência (CRM)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral das etapas do ciclo de relacionamento com o cliente
          </p>
        </div>

        {/* Desktop: horizontal flow with arrows */}
        <div className="hidden lg:flex items-stretch gap-2">
          {steps.map((step, i) => (
            <div key={step.title} className="flex items-stretch">
              <Card className="flex-1 min-w-[180px] flex flex-col">
                <CardHeader className="pb-3">
                  <div className={`w-10 h-10 rounded-lg ${step.bg} flex items-center justify-center mb-2`}>
                    <step.icon className={`h-5 w-5 ${step.color}`} />
                  </div>
                  <CardTitle className="text-sm font-semibold leading-tight">
                    {step.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {step.description}
                  </p>
                </CardHeader>
                <CardContent className="pt-0 mt-auto">
                  <ul className="space-y-1.5">
                    {step.items.map((item) => (
                      <li key={item} className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-primary/50 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              {i < steps.length - 1 && (
                <div className="flex items-center px-1">
                  <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Mobile / Tablet: stacked with down arrows */}
        <div className="lg:hidden space-y-3">
          {steps.map((step, i) => (
            <div key={step.title}>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${step.bg} flex items-center justify-center shrink-0`}>
                      <step.icon className={`h-5 w-5 ${step.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">
                        {step.title}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {step.items.map((item) => (
                      <span
                        key={item}
                        className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
              {i < steps.length - 1 && (
                <div className="flex justify-center py-1">
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
