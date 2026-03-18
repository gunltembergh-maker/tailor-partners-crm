
# Embed Power BI no Dash Comercial

## Resumo
Substituir o placeholder atual por um iframe do Power BI com controle de acesso, loading state, timeout e modo tela cheia interno.

## Logica de acesso

1. A rota ja esta protegida por `ProtectedRoute` (usuario precisa estar logado).
2. Apos autenticado, validar se o email do usuario termina com `@tailorpartners.com.br` (dominio usado no projeto conforme contexto de restricao de dominio).
3. Se o dominio nao bater, exibir mensagem de acesso negado com orientacoes.

## Funcionalidades da pagina

### Estados
- **Acesso negado**: card com icone de alerta e mensagem orientando o usuario a usar email corporativo.
- **Carregando**: skeleton/loader cobrindo a area do iframe ate o evento `onLoad` disparar.
- **Timeout (15s)**: se o iframe nao carregar em 15 segundos, exibir aviso com passos para resolver (trocar conta Microsoft, etc).
- **Carregado**: iframe visivel, loader oculto.

### Iframe
- `src`: URL do Secure Embed fornecida
- `className="w-full"` com altura `calc(100vh - 180px)` para ocupar a area util
- `allowFullScreen`, `frameBorder="0"`

### Tela cheia interna
- Botao "Tela cheia" (icone `Maximize`) ao lado do titulo
- Ao clicar, abrir overlay `fixed inset-0 z-50 bg-background` com o mesmo iframe ocupando 100vh/100vw
- Botao "Fechar" (icone `X`) no canto superior direito do overlay
- Estado controlado por `useState<boolean>`

## Detalhes tecnicos

### Arquivo modificado: `src/pages/DashComercial.tsx`

- Importar `useAuth` para obter `user` e verificar `user.email`
- Importar `useState`, `useEffect`, `useCallback` do React
- Importar icones: `Maximize`, `X`, `AlertTriangle`, `Loader2`
- Importar componentes UI: `Card`, `CardContent`, `Button`, `Alert`, `Skeleton`

```text
Fluxo:
1. const { user } = useAuth()
2. Verificar user.email?.endsWith("@tailorpartners.com.br")
3. Se nao: renderizar card de acesso negado
4. Se sim:
   a. Estado loading = true, timeout = false, fullscreen = false
   b. setTimeout de 15s para setar timeout = true
   c. iframe onLoad -> loading = false, limpar timeout
   d. Renderizar header + iframe + botao tela cheia
   e. Se fullscreen: overlay fixed com iframe + botao fechar
```

### Nenhum outro arquivo sera alterado
- A rota ja existe e esta protegida
- O item de menu ja existe
- Nenhum secret ou token necessario (Secure Embed)
