import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DetailLayout } from "@/components/DetailLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, opportunityStageLabels, opportunityStageColors } from "@/lib/format";

export default function OportunidadeDetalhe() {
  const { id } = useParams<{ id: string }>();
  const [opp, setOpp] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from("opportunities").select("*").eq("id", id).single().then(({ data }) => setOpp(data));
  }, [id]);

  if (!opp) {
    return (
      <DetailLayout title="Carregando..." relatedType="OPPORTUNITY" relatedId={id || ""} backTo="/oportunidades" resumo={<div />} />
    );
  }

  const resumo = (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="font-display font-semibold text-foreground">Dados da Oportunidade</h3>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-muted-foreground">Estágio</span>
            <Badge variant="secondary" className={opportunityStageColors[opp.stage]}>{opportunityStageLabels[opp.stage]}</Badge>
            <span className="text-muted-foreground">Valor Estimado</span>
            <span>{formatCurrency(opp.valor_estimado)}</span>
            <span className="text-muted-foreground">Probabilidade</span>
            <span>{opp.probabilidade}%</span>
            <span className="text-muted-foreground">Previsão</span>
            <span>{formatDate(opp.close_date)}</span>
            <span className="text-muted-foreground">Origem</span>
            <span>{opp.origem || "-"}</span>
            <span className="text-muted-foreground">Criada em</span>
            <span>{formatDate(opp.created_at)}</span>
          </div>
          {opp.observacoes && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Observações</p>
              <p className="text-sm">{opp.observacoes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <DetailLayout
      title={opp.titulo}
      subtitle={`Oportunidade · ${opportunityStageLabels[opp.stage]}`}
      relatedType="OPPORTUNITY"
      relatedId={id!}
      backTo="/oportunidades"
      resumo={resumo}
    />
  );
}
