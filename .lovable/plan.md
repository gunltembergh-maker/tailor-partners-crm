

## Plan: Add Real-time Preview, Logo Selection, and Hub Name Toggle to Popup Modal

### 1. Database Migration

Add two new columns to `admin_popups`:
- `logo_url text DEFAULT NULL`
- `mostrar_nome_hub boolean DEFAULT true`

Update `rpc_get_popups_ativos` to return these new fields. Update `rpc_admin_salvar_popup` to accept `p_logo_url` and `p_mostrar_nome_hub` parameters.

### 2. Update PopupComunicado Component

**File: `src/components/PopupComunicado.tsx`**

- Add `logo_url` and `mostrar_nome_hub` to the `PopupData` interface
- Use `popup.logo_url` for the logo image (fallback to current white logo)
- Conditionally render "HUB GRUPO TAILOR PARTNERS" text below the logo when `mostrar_nome_hub` is true
- Extract the popup card rendering into a reusable sub-component (or export a `PopupPreview` component) so the admin modal can reuse it

### 3. Redesign Admin Modal to Two-Column Layout

**File: `src/pages/admin/GerenciarPopups.tsx`**

- Widen the dialog to `max-w-4xl`
- **Left column** (form fields):
  - Existing fields: Titulo, Mensagem, Destinatarios, Paginas, Periodo, Ativo toggle
  - New "Escolha o logo" field: 3 clickable thumbnail options with navy border on selected:
    1. White logo (default): `...assets/logos/logo-white.png`
    2. Dark logo: `...assets/logos/logo-dark.png`
    3. "Sem logo" option
  - New "Mostrar nome do Hub" toggle
- **Right column** (live preview):
  - Title "Pre-visualizacao"
  - Light gray background simulating the Hub screen with dark overlay
  - Renders the popup card using the same visual structure as `PopupComunicado`, fed by form state in real-time

### 4. Form State Changes

Add to `defaultForm`:
- `logo_url`: default white logo URL
- `mostrar_nome_hub`: default `true`

Update `openEdit` to populate these from the popup record. Update `handleSave` payload to include `p_logo_url` and `p_mostrar_nome_hub`.

### 5. Update PopupRow Interface

Add `logo_url` and `mostrar_nome_hub` fields to the `PopupRow` interface.

### Files Changed
- `src/pages/admin/GerenciarPopups.tsx` -- two-column modal, logo selector, hub name toggle, live preview
- `src/components/PopupComunicado.tsx` -- use `logo_url` and `mostrar_nome_hub` from popup data
- New migration SQL -- add columns + update RPCs

