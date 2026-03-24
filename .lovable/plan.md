

# Corrigir uso dos logos conforme fundo

## Situação atual
- **AppSidebar.tsx** — usa `LOGO_DARK_BG` ✅ (fundo escuro navy)
- **Auth.tsx** — usa `LOGO_DARK_BG` ❌ (fundo `bg-background` que é bege claro)
- **TailorLoader.tsx** — usa `LOGO_DARK_BG` ❌ (fundo `bg-card` que é branco)
- **index.html** — favicon já usa logo transparente ✅

## Alterações

### 1. `src/pages/Auth.tsx`
- Importar `LOGO_LIGHT_BG` ao invés de `LOGO_DARK_BG`
- Trocar as duas referências de `LOGO_DARK_BG` → `LOGO_LIGHT_BG` (tela de login e tela de confirmação)
- O fundo da página é `bg-background` (bege claro `hsl(40, 20%, 96%)`), portanto o logo de fundo claro é o correto

### 2. `src/components/TailorLoader.tsx`
- Importar `LOGO_LIGHT_BG` ao invés de `LOGO_DARK_BG`
- O card do loader usa `bg-card` (branco `hsl(0, 0%, 100%)`), portanto o logo de fundo claro é o correto

### 3. Sem alteração
- **AppSidebar.tsx** — já está correto com `LOGO_DARK_BG` (sidebar tem fundo navy escuro)
- **index.html** — favicon já usa o logo transparente
- **constants.ts** — já tem as duas constantes definidas
- Nenhuma lógica de dados ou autenticação será alterada

