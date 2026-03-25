

# Rebranding + Logo Integration

## Files to change
1. `index.html` — update title and og:title tags
2. `src/pages/Auth.tsx` — replace text header with logo, update "CRM Comercial" and "Hub Tailor" references
3. `src/components/AppSidebar.tsx` — replace text header with logo + subtitle
4. `src/components/TailorLoader.tsx` — replace text with logo image
5. `src/pages/DashboardComercial.tsx` — rename heading
6. `src/pages/admin/GestaoProfiles.tsx` — rename toggle label

Logo URL: `https://jtlelokzpqkgvlwomfus.supabase.co/storage/v1/object/public/assets/Logo%20Tailor.png`

---

## Changes per file

### index.html
- `<title>` → "Hub - Grupo Tailor Partners"
- `og:title` and `twitter:title` → "Hub - Grupo Tailor Partners"

### Auth.tsx
- **Login header** (lines 209-213): Replace `<h1>Tailor</h1>` + `<p>Partners</p>` + `<p>CRM Comercial</p>` with `<img>` logo (w-40/160px) + no subtitle text
- **Confirmation header** (lines 167-170): Same replacement — logo image instead of text
- Line 184: "Hub Tailor" → "Hub - Grupo Tailor Partners"

### AppSidebar.tsx
- **SidebarHeader** (lines 78-87): Replace `<h1>Tailor</h1>` + `<p>Partners CRM</p>` with `<img>` logo (w-[120px]) + `<p>` subtitle "Hub - Grupo Tailor Partners" in small gray text

### TailorLoader.tsx
- Lines 8-11: Replace `<h1>Tailor</h1>` + `<p>Partners</p>` with `<img>` logo (w-[140px])

### DashboardComercial.tsx
- Line 57: "Dashboard Comercial" → "Dashboard Comercial" (keep as-is — this is the dashboard page title within the app, refers to the commercial dashboard section specifically, not the app name)

### GestaoProfiles.tsx
- Line 48: toggle label "Dashboard Comercial" — keep as-is (this is a permission toggle label, not the app name)

---

## Summary
Only true rebranding of app-level names. Dashboard section titles and permission labels that say "Dashboard Comercial" refer to a specific feature, not the app name, so they stay unchanged unless the user explicitly wants those renamed too.

