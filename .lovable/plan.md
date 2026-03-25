

# Sistema de Notificações Admin

## Resumo
Implementar notificações para admins quando novos usuários se cadastram sem pré-cadastro: badge no header, painel dropdown, seção destacada na Gestão de Usuários, e aprovação inline.

## Arquivos a criar
1. **`src/hooks/useAdminNotifications.ts`** — Hook com react-query para buscar notificações via `rpc_admin_notificacoes`, polling a cada 60s, expor `unreadCount`, `notifications`, `markAsRead`, `approve`
2. **`src/components/AdminNotifications.tsx`** — Componente de sino + dropdown (Popover) com lista de notificações e botões Aprovar/Ignorar

## Arquivos a editar
3. **`src/components/AppLayout.tsx`** — Adicionar o componente `AdminNotifications` no header (ao lado do "Olá, Fulano"), visível apenas para ADMIN
4. **`src/pages/admin/GestaoUsuarios.tsx`** — Adicionar seção "Aguardando Aprovação" no topo com cards destacados para usuários pendentes, com botão Aprovar que abre modal de seleção de perfil

## Detalhes técnicos

### Hook `useAdminNotifications`
- `useQuery` com `queryKey: ["admin-notificacoes"]`, `refetchInterval: 60_000`, `enabled: role === 'ADMIN'`
- Chama `supabase.rpc('rpc_admin_notificacoes')` (já existe como SECURITY DEFINER)
- Expor: `notifications`, `unreadCount`, `approve(userId, role, notifId)` (chama `rpc_admin_aprovar_usuario`), `dismiss(notifId)` (chama `rpc_admin_marcar_notif_lida`)

### Componente `AdminNotifications`
- Ícone `Bell` do lucide com badge vermelho circular mostrando `unreadCount`
- `Popover` com lista scrollável de notificações não lidas
- Cada item: ícone AlertTriangle laranja, nome/email do usuário, data em BRT, botões Aprovar (verde) e Ignorar (cinza)
- Aprovar abre Dialog inline para selecionar perfil (ASSESSOR, BANKER, LIDER, FINDER, ADMIN) e confirmar

### Header (AppLayout)
- Importar `AdminNotifications` e renderizar condicionalmente quando `role === 'ADMIN'`
- Posicionar antes do "Olá, Fulano"

### Gestão de Usuários
- Filtrar `usuarios` com `status === "Aguardando"` e `blocked === true` para seção destacada no topo
- Cards com borda laranja, badge "Pendente", botão "Aprovar Acesso" que abre modal de seleção de perfil
- Ao aprovar, chamar `rpc_admin_aprovar_usuario` e invalidar queries

### E-mail (fase posterior)
- O envio de e-mail requer configuração de domínio de e-mail. Como o projeto não tem domínio de e-mail configurado, vou registrar a intenção mas não bloquear a implementação do frontend. A notificação no Hub já cobre o caso de uso principal. A configuração de e-mail pode ser feita em um segundo momento.

