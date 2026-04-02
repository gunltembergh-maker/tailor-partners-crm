

## Plan: Fix SharePoint Sync Button

### What's happening
The current `handleSync` in `ImportarBases.tsx` (line 306-330) already uses `supabase.functions.invoke`, which is correct. The only code change needed per the user's request is changing `tipo: 'manual'` to `tipo: 'todos'`.

However, the "Failed to send a request to the Edge Function" error is likely a transient deployment issue rather than a code bug — the JWT is already disabled (`verify_jwt = false` in config.toml) and `supabase.functions.invoke` handles auth correctly.

### Change

**File: `src/pages/ImportarBases.tsx`** (lines 306-330)

Replace `handleSync` with the user's provided implementation:
- Change body from `{ tipo: 'manual' }` to `{ tipo: 'todos' }`
- Add more granular error handling with `setSyncLog` messages
- Add a 3-second delayed reload of sync logs on success
- Keep existing toast notifications and query invalidation

The rest of the file remains untouched.

