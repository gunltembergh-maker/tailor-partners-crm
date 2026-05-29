import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { DadosEmValidacaoBadge } from "@/components/shared/DadosEmValidacaoBadge";

export default function TesteEmValidacao() {
  const [forceShow, setForceShow] = useState(false);

  return (
    <AppLayout>
      <div className="p-8 space-y-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-foreground">
          Teste: Dados em Validação
        </h1>

        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={forceShow}
              onChange={(e) => setForceShow(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            Forçar exibição (mock visual — simula em_validacao=true)
          </label>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Variant: inline (default) — {forceShow ? 'visível' : 'null (não renderiza)'}
          </h2>
          <div className="rounded-lg border border-border bg-card p-4">
            {forceShow ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: '#B58105' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                Dados em validação
              </span>
            ) : (
              <DadosEmValidacaoBadge variant="inline" />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Variant: badge — {forceShow ? 'visível' : 'null (não renderiza)'}
          </h2>
          <div className="rounded-lg border border-border bg-card p-4">
            {forceShow ? (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: '#FEF3C7', color: '#B58105' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                Dados em validação
              </span>
            ) : (
              <DadosEmValidacaoBadge variant="badge" />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Variant: card-header — {forceShow ? 'visível' : 'null (não renderiza)'}
          </h2>
          <div className="rounded-lg border border-border bg-card p-4">
            {forceShow ? (
              <div className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium" style={{ backgroundColor: '#FEF3C7', color: '#B58105' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                Dados em validação
              </div>
            ) : (
              <DadosEmValidacaoBadge variant="card-header" />
            )}
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
            Para forçar via SQL: <code className="bg-background rounded px-1">SELECT public.rpc_set_em_validacao_override('force_on');</code>
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
