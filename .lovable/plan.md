

# Restringir "Importar Base" para ADMIN

## O que sera feito
O item "Importar Base" no menu lateral sera exibido apenas para usuarios com role ADMIN. Usuarios com outros perfis (LIDER, BANKER, FINDER, ASSESSOR) nao verao esse link.

## Detalhes tecnicos

### Arquivo: `src/components/AppSidebar.tsx`

1. Importar o hook `useAuth` (ja importado) para acessar o `role` do usuario
2. Separar o item "Importar Base" do array fixo `menuItems`
3. Renderizar condicionalmente esse item apenas quando `role === "ADMIN"`

A rota `/import-clients` tambem sera protegida no `App.tsx` com `ProtectedRoute` para garantir que mesmo acessando a URL diretamente, apenas usuarios autenticados consigam entrar.

### Arquivos modificados
- `src/components/AppSidebar.tsx` - condicional no menu
- `src/App.tsx` - proteger a rota com `ProtectedRoute`

