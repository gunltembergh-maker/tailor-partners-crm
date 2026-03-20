

# TailorLoader — Componente global de loading

## 1. Criar `src/components/TailorLoader.tsx`

Overlay semitransparente cobrindo a area de conteúdo (não a tela inteira, para manter o menu visível). Card centralizado com:
- "Tailor" em `font-display font-bold text-primary` (#1B2A3D) + "Partners" em `text-muted-foreground uppercase tracking-widest`
- "Carregando..." em cinza claro
- Spinner animado (border-spin) na cor primária

Aceita prop opcional `overlay?: boolean` (default true). Quando `overlay=false`, renderiza inline sem fundo escuro (para uso dentro de cards/tabs).

## 2. Aplicar nos seguintes pontos

### `src/App.tsx` — ProtectedRoute
Substituir o loading atual (div com texto "Carregando...") por `<TailorLoader />` com overlay cobrindo tela inteira (neste caso sim, pois não há sidebar ainda).

### `src/pages/DashboardComercial.tsx`
Não tem loading próprio — os dados carregam nas tabs. Sem mudança aqui.

### `src/components/dashboard/QuantitativoTab.tsx`
Linha 277: `const loading = [l1,...l14].some(Boolean)`. Já há Skeleton loading implícito nos MetricCards. Adicionar um check no topo: se `loading` for true nos primeiros renders, mostrar `<TailorLoader overlay={false} />` no lugar do conteúdo inteiro da tab.

### `src/components/dashboard/QualitativoTab.tsx`
Linha 198: já tem `if (loading) return <Skeleton ...>`. Substituir o bloco de Skeletons por `<TailorLoader overlay={false} />`.

### `src/pages/Dashboard.tsx`
Linha 42: `loading` state. Substituir o conteúdo de loading por `<TailorLoader overlay={false} />`.

### `src/pages/Prioridades.tsx`
Tem `loading` state. Aplicar `<TailorLoader overlay={false} />` no loading.

## 3. Não alterar
- Lógica de dados, rotas, autenticação
- `ImportarBases.tsx` e `ImportClients.tsx` (loading contextual de upload, não de página)
- `DashComercial.tsx` (loading de iframe Power BI, diferente)

## Arquivos afetados
| Arquivo | Mudança |
|---|---|
| `src/components/TailorLoader.tsx` | Criar componente |
| `src/App.tsx` | Substituir loading do ProtectedRoute |
| `src/components/dashboard/QuantitativoTab.tsx` | Substituir loading |
| `src/components/dashboard/QualitativoTab.tsx` | Substituir Skeleton loading |
| `src/pages/Dashboard.tsx` | Substituir loading |
| `src/pages/Prioridades.tsx` | Substituir loading |

