import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  ChevronDown,
  ChevronRight,
  Search,
  Info,
  Loader2,
  AlertTriangle,
} from "lucide-react";

type TipoVinculo = "FA" | "FINDER" | "ADVISOR";

interface Vinculo {
  tipo: TipoVinculo;
  valor: string;
}

interface Props {
  userId: string;
}

const TIPOS: { tipo: TipoVinculo; label: string }[] = [
  { tipo: "FA", label: "Financial Advisors (FA)" },
  { tipo: "FINDER", label: "Finders" },
  { tipo: "ADVISOR", label: "Advisors XP" },
];

export function VinculosReceita({ userId }: Props) {
  const [vinculosAtuais, setVinculosAtuais] = useState<Vinculo[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [opcoesPorTipo, setOpcoesPorTipo] = useState<Record<TipoVinculo, string[]>>({
    FA: [],
    FINDER: [],
    ADVISOR: [],
  });
  const [buscaPorTipo, setBuscaPorTipo] = useState<Record<TipoVinculo, string>>({
    FA: "",
    FINDER: "",
    ADVISOR: "",
  });
  const [expandido, setExpandido] = useState<Record<TipoVinculo, boolean>>({
    FA: true,
    FINDER: false,
    ADVISOR: false,
  });
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [vinculosRes, faRes, finderRes, advisorRes] = await Promise.all([
      supabase.rpc("rpc_listar_vinculos_usuario" as any, { p_user_id: userId }),
      supabase.rpc("rpc_buscar_pessoas_raw" as any, { p_tipo: "FA", p_busca: "" }),
      supabase.rpc("rpc_buscar_pessoas_raw" as any, { p_tipo: "FINDER", p_busca: "" }),
      supabase.rpc("rpc_buscar_pessoas_raw" as any, { p_tipo: "ADVISOR", p_busca: "" }),
    ]);

    if (vinculosRes.error) {
      toast.error(`Erro ao carregar vínculos: ${vinculosRes.error.message}`);
    }
    const vincs = ((vinculosRes.data ?? []) as Vinculo[]).map((v) => ({
      tipo: v.tipo,
      valor: v.valor,
    }));
    setVinculosAtuais(vincs);
    setSelecionados(new Set(vincs.map((v) => `${v.tipo}::${v.valor}`)));

    setOpcoesPorTipo({
      FA: ((faRes.data ?? []) as { valor: string }[]).map((r) => r.valor).filter(Boolean),
      FINDER: ((finderRes.data ?? []) as { valor: string }[]).map((r) => r.valor).filter(Boolean),
      ADVISOR: ((advisorRes.data ?? []) as { valor: string }[]).map((r) => r.valor).filter(Boolean),
    });

    setCarregando(false);
  }, [userId]);

  useEffect(() => {
    if (userId) carregar();
  }, [userId, carregar]);

  const toggleSelecionado = (tipo: TipoVinculo, valor: string) => {
    const key = `${tipo}::${valor}`;
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const opcoesFiltradas = useMemo(() => {
    const result: Record<TipoVinculo, string[]> = { FA: [], FINDER: [], ADVISOR: [] };
    for (const { tipo } of TIPOS) {
      const busca = buscaPorTipo[tipo]?.toLowerCase().trim() ?? "";
      result[tipo] = busca
        ? opcoesPorTipo[tipo].filter((v) => v.toLowerCase().includes(busca))
        : opcoesPorTipo[tipo];
    }
    return result;
  }, [opcoesPorTipo, buscaPorTipo]);

  const alterado = useMemo(() => {
    const atual = new Set(vinculosAtuais.map((v) => `${v.tipo}::${v.valor}`));
    if (atual.size !== selecionados.size) return true;
    for (const k of selecionados) if (!atual.has(k)) return true;
    return false;
  }, [vinculosAtuais, selecionados]);

  const handleSalvar = async () => {
    setSalvando(true);
    const vinculos = Array.from(selecionados).map((key) => {
      const [tipo, ...rest] = key.split("::");
      return { tipo, valor: rest.join("::") };
    });

    const { data, error } = await supabase.rpc("rpc_sincronizar_vinculos_usuario" as any, {
      p_user_id: userId,
      p_vinculos: vinculos as any,
    });

    if (error) {
      toast.error(`Erro: ${error.message}`);
    } else {
      const inseridos = (data as any)?.inseridos ?? vinculos.length;
      toast.success(`Vínculos atualizados: ${inseridos} salvo(s)`);
      setVinculosAtuais(vinculos as Vinculo[]);
    }
    setSalvando(false);
  };

  if (carregando) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 border rounded-md">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando vínculos...
      </div>
    );
  }

  const totalSelecionados = selecionados.size;

  return (
    <div className="space-y-3 rounded-md border p-4 bg-muted/30">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold">Vínculos de Receita</h4>
          <p className="text-xs text-muted-foreground">
            Defina quais FAs, Finders ou Advisors este usuário pode ver na Receita.
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {totalSelecionados} selecionado(s)
        </Badge>
      </div>

      {totalSelecionados === 0 && (
        <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10 py-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-sm">Sem vínculos selecionados</AlertTitle>
          <AlertDescription className="text-xs">
            Marque ao menos 1 vínculo para este usuário ver dados de Receita.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        {TIPOS.map(({ tipo, label }) => {
          const total = opcoesPorTipo[tipo].length;
          const marcadosDesseTipo = Array.from(selecionados).filter((k) =>
            k.startsWith(`${tipo}::`)
          ).length;
          const isExpanded = expandido[tipo];
          const opts = opcoesFiltradas[tipo];

          return (
            <div key={tipo} className="border rounded-md bg-background overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandido((prev) => ({ ...prev, [tipo]: !prev[tipo] }))}
                className="w-full flex items-center justify-between p-3 hover:bg-muted/30"
              >
                <div className="flex items-center gap-2 text-sm">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">({total} disponíveis)</span>
                </div>
                {marcadosDesseTipo > 0 && (
                  <Badge variant="default">{marcadosDesseTipo}</Badge>
                )}
              </button>

              {isExpanded && (
                <div className="border-t p-3 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder={`Buscar ${label.toLowerCase()}...`}
                      value={buscaPorTipo[tipo]}
                      onChange={(e) =>
                        setBuscaPorTipo((prev) => ({ ...prev, [tipo]: e.target.value }))
                      }
                      className="pl-8 h-8 text-sm"
                    />
                  </div>

                  <div className="max-h-56 overflow-auto space-y-1 pr-1">
                    {opts.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2 text-center">
                        Nenhum resultado
                      </p>
                    ) : (
                      opts.map((valor) => {
                        const key = `${tipo}::${valor}`;
                        const checked = selecionados.has(key);
                        return (
                          <label
                            key={key}
                            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleSelecionado(tipo, valor)}
                            />
                            <span className="truncate">{valor}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Info className="h-3 w-3" />
          Mudanças só são aplicadas ao clicar em Salvar.
        </p>
        <Button
          type="button"
          onClick={handleSalvar}
          disabled={!alterado || salvando}
          size="sm"
        >
          {salvando ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Salvando...
            </>
          ) : (
            "Salvar vínculos"
          )}
        </Button>
      </div>
    </div>
  );
}
