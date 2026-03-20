

# Drill-down na tabela Receita Bruta Tailor por Categoria

## Resumo
Renomear o título da tabela e implementar drill-down por categoria. Ao clicar em uma categoria, a tabela mostra subcategorias/produtos daquela categoria usando os dados do `rpc_receita_matriz_rows` já existente. Um botão "← Voltar" retorna à visão de categorias.

## Mudanças (apenas `QuantitativoTab.tsx`)

### 1. Novo estado para drill-down
```ts
const [drillCategory, setDrillCategory] = useState<string|null>(null);
```
Reset automático quando `clickedMonth` ou `effectiveFilters` mudam:
```ts
useEffect(() => { setDrillCategory(null); }, [clickedMonth, filters.anoMes]);
```

### 2. Título dinâmico
- Sem drill: `"RECEITA BRUTA TAILOR POR CATEGORIA"`
- Com drill ativo: `"RECEITA BRUTA TAILOR (ESTIMADA) POR CATEGORIA"`

### 3. Lógica de clique na categoria
Ao clicar na seta `>` ou no nome da categoria:
- Se `drillCategory === null` → `setDrillCategory(categoria)` (entra no drill-down)
- Se `drillCategory === categoria` → `setDrillCategory(null)` (volta, toggle)

### 4. Renderização condicional do corpo da tabela
- **Sem drill** (`drillCategory === null`): mostra a tabela atual com todas as categorias (linha Total + categorias)
- **Com drill** (`drillCategory !== null`):
  - Botão "← Voltar" acima da tabela
  - Usa `buildDetailTree(receitaMatrizRows, drillCategory, matrizMeses)` para gerar subcategorias/produtos
  - Linha Total mostra apenas os totais daquela categoria
  - Cada subcategoria é renderizada via `MatrizRow` existente (com expand/collapse já funcional)

### 5. Visual
- Seta `>` gira para `∨` quando a categoria é a que está em drill-down
- O botão "← Voltar" fica no canto superior esquerdo do card da tabela

### Sem alterações em
- Nenhum outro componente
- Nenhuma RPC (usa `rpc_receita_matriz_rows` já existente)
- Nenhuma outra seção do dashboard

