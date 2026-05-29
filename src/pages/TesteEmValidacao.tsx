import { AppLayout } from "@/components/AppLayout";
import { DadosEmValidacaoBadge } from "@/components/shared/DadosEmValidacaoBadge";

export default function TesteEmValidacao() {
  return (
    <AppLayout>
      <div className="p-8 space-y-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-foreground">
          Teste: Dados em Validação
        </h1>

        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Variant: inline (default)
          </h2>
          <div className="rounded-lg border border-border bg-card p-4">
            <DadosEmValidacaoBadge variant="inline" />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Variant: badge
          </h2>
          <div className="rounded-lg border border-border bg-card p-4">
            <DadosEmValidacaoBadge variant="badge" />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Variant: card-header
          </h2>
          <div className="rounded-lg border border-border bg-card p-4">
            <DadosEmValidacaoBadge variant="card-header" />
          </div>
        </div>

        <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
          <p className="font-medium mb-2">Teste manual (DevTools console):</p>
          <code className="block bg-background rounded p-2 font-mono text-xs">
            const {'{'} data {'}'} = await window.supabase.rpc('rpc_get_em_validacao');
            <br />
            console.log(data);
          </code>
          <p className="mt-2">
            Para forçar visual: rode no SQL <code className="bg-background rounded px-1">SELECT public.rpc_set_em_validacao_override('force_on');</code> e recarregue.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
