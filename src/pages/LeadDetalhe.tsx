import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DetailLayout } from "@/components/DetailLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, leadStatusLabels, leadStatusColors, tipoPessoaLabels, porteLabels } from "@/lib/format";

export default function LeadDetalhe() {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from("leads").select("*").eq("id", id).single().then(({ data }) => setLead(data));
  }, [id]);

  if (!lead) {
    return (
      <DetailLayout title="Carregando..." relatedType="LEAD" relatedId={id || ""} backTo="/leads" resumo={<div />} />
    );
  }

  const resumo = (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="font-display font-semibold text-foreground">Informações Gerais</h3>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-muted-foreground">Tipo</span>
            <span>{tipoPessoaLabels[lead.tipo_pessoa]}</span>
            <span className="text-muted-foreground">CPF/CNPJ</span>
            <span>{lead.cpf_cnpj || "-"}</span>
            <span className="text-muted-foreground">E-mail</span>
            <span>{lead.email || "-"}</span>
            <span className="text-muted-foreground">Telefone</span>
            <span>{lead.telefone || "-"}</span>
            <span className="text-muted-foreground">Segmento</span>
            <span>{lead.segmento || "-"}</span>
            {lead.porte && (
              <>
                <span className="text-muted-foreground">Porte</span>
                <span>{porteLabels[lead.porte] || lead.porte}</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="font-display font-semibold text-foreground">Dados Comerciais</h3>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant="secondary" className={leadStatusColors[lead.status]}>{leadStatusLabels[lead.status]}</Badge>
            <span className="text-muted-foreground">Valor Potencial</span>
            <span>{formatCurrency(lead.valor_potencial)}</span>
            <span className="text-muted-foreground">Score</span>
            <span>{lead.score ?? "-"}</span>
            <span className="text-muted-foreground">Canal</span>
            <span>{lead.canal_origem || "-"}</span>
            <span className="text-muted-foreground">Criado em</span>
            <span>{formatDate(lead.created_at)}</span>
          </div>
          {lead.observacoes && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Observações</p>
              <p className="text-sm">{lead.observacoes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <DetailLayout
      title={lead.nome_razao}
      subtitle={`Lead · ${leadStatusLabels[lead.status]}`}
      relatedType="LEAD"
      relatedId={id!}
      backTo="/leads"
      resumo={resumo}
    />
  );
}
