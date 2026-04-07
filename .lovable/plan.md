

## Plan: Fix Logo URLs in Popup Admin Modal

### Problem
The logo URLs point to non-existent paths (`/assets/logos/logo-white.png` and `/assets/logos/logo-dark.png`). Need to replace with the correct URLs.

### Changes

**File: `src/pages/admin/GerenciarPopups.tsx`**
- Replace `LOGO_WHITE` with: `https://jtlelokzpqkgvlwomfus.supabase.co/storage/v1/object/public/assets/Logo%20Tailor.png`
- Replace `LOGO_DARK` with: `https://jtlelokzpqkgvlwomfus.supabase.co/storage/v1/object/public/assets/logo_Tailor_transparente.png`
- Update labels: "Logo Tailor completa" and "Logo Tailor transparente"
- Set both thumbnail backgrounds to `#082537` (both logos have transparent backgrounds)

**File: `src/components/PopupComunicado.tsx`**
- Update `DEFAULT_LOGO_URL` to the "Logo Tailor completa" URL
- Ensure `PopupCard` uses `max-height: 48px` and `object-fit: contain` for the logo image

### Files Changed
- `src/pages/admin/GerenciarPopups.tsx` — correct logo URLs, labels, thumbnail backgrounds
- `src/components/PopupComunicado.tsx` — update default logo URL and image sizing

