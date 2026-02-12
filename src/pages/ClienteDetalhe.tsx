import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DetailLayout } from "@/components/DetailLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, clientStatusLabels, clientStatusColors, tipoPessoaLabels } from "@/lib/format";

export default function ClienteDetalhe() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from("clients").select("*").eq("id", id).single().then(({ data }) => setClient(data));
  }, [id]);

  if (!client) {
    return (
      <DetailLayout title="Carregando..." relatedType="CLIENT" relatedId={id || ""} backTo="/clientes" resumo={<div />} />
    );
  }

  const resumo = (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="font-display font-semibold text-foreground">Informações Gerais</h3>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-muted-foreground">Tipo</span>
            <span>{tipoPessoaLabels[client.tipo_pessoa]}</span>
            <span className="text-muted-foreground">CPF/CNPJ</span>
            <span>{client.cpf_cnpj || "-"}</span>
            <span className="text-muted-foreground">E-mail</span>
            <span>{client.email || "-"}</span>
            <span className="text-muted-foreground">Telefone</span>
            <span>{client.telefone || "-"}</span>
            <span className="text-muted-foreground">Segmento</span>
            <span>{client.segmento || "-"}</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="font-display font-semibold text-foreground">Dados Comerciais</h3>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant="secondary" className={clientStatusColors[client.status]}>{clientStatusLabels[client.status]}</Badge>
            <span className="text-muted-foreground">Patrimônio</span>
            <span>{formatCurrency(client.patrimonio_ou_receita)}</span>
            <span className="text-muted-foreground">Risco/Alertas</span>
            <span>{client.risco_ou_alertas || "-"}</span>
            <span className="text-muted-foreground">Criado em</span>
            <span>{formatDate(client.created_at)}</span>
          </div>
          {client.observacoes && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Observações</p>
              <p className="text-sm">{client.observacoes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <DetailLayout
      title={client.nome_razao}
      subtitle={`Conta · ${clientStatusLabels[client.status]}`}
      relatedType="CLIENT"
      relatedId={id!}
      backTo="/clientes"
      resumo={resumo}
    />
  );
}
