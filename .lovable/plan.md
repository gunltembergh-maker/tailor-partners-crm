

# Dash Comercial - Nova Rota e Item no Menu

## O que sera feito
Adicionar um novo item "Dash Comercial" no menu lateral, criar a rota `/relatorios/dash-comercial` e uma pagina placeholder seguindo o padrao visual existente.

## Mudancas

### 1. Novo arquivo: `src/pages/DashComercial.tsx`
- Pagina usando `AppLayout` (mesmo padrao das demais)
- Titulo "Dash Comercial" e subtitulo "Dashboard Power BI (TailorPartners)"
- Um Card placeholder com texto "Carregando dashboard..."
- Layout responsivo com Tailwind

### 2. `src/components/AppSidebar.tsx`
- Adicionar item "Dash Comercial" com icone `BarChart3` (ou `PieChart`) no array `menuItems`, logo apos "Relatorios"
- Path: `/relatorios/dash-comercial`

### 3. `src/App.tsx`
- Importar o componente `DashComercial`
- Adicionar rota `/relatorios/dash-comercial` com `ProtectedRoute`, posicionada antes da rota `/relatorios`

## O que NAO sera alterado
- Nenhuma rota ou item de menu existente
- Nenhum componente ou pagina existente

