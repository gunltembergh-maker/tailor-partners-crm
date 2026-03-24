

# Logo Constants + Correct Usage

## Files to create
1. **`src/lib/constants.ts`** — New file with `LOGO_DARK_BG` and `LOGO_LIGHT_BG` constants

## Files to edit
1. **`index.html`** — Add favicon `<link>` using the transparent logo URL
2. **`src/components/AppSidebar.tsx`** — Import `LOGO_DARK_BG`, replace hardcoded URL, set width to 130px
3. **`src/pages/Auth.tsx`** — Import `LOGO_DARK_BG`, replace both logo instances (login + confirmation), keep 160px
4. **`src/components/TailorLoader.tsx`** — Import `LOGO_DARK_BG`, replace hardcoded URL, keep 140px

## Details

### New: `src/lib/constants.ts`
```typescript
export const LOGO_DARK_BG = "https://jtlelokzpqkgvlwomfus.supabase.co/storage/v1/object/public/assets/Logo%20Tailor.png";
export const LOGO_LIGHT_BG = "https://jtlelokzpqkgvlwomfus.supabase.co/storage/v1/object/public/assets/logo_Tailor_transparente.png";
```

### `index.html`
- Add: `<link rel="icon" type="image/png" href="https://...logo_Tailor_transparente.png" />`

### `AppSidebar.tsx`
- Import `LOGO_DARK_BG` from constants
- Replace hardcoded URL with `LOGO_DARK_BG`
- Change `w-[120px]` → `w-[130px]`

### `Auth.tsx`
- Import `LOGO_DARK_BG` from constants
- Replace both hardcoded logo URLs with `LOGO_DARK_BG`

### `TailorLoader.tsx`
- Import `LOGO_DARK_BG` from constants
- Replace hardcoded URL with `LOGO_DARK_BG`

No logic, RPC, or auth changes.

