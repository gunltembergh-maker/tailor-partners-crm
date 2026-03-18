

# Replace ImportarBases.tsx with uploaded file (v2)

## Summary
Replace `src/pages/ImportarBases.tsx` with the uploaded 679-line file. The uploaded file is missing the `AppLayout` wrapper and import, so those must be added during the replacement.

## Changes

| File | Action |
|---|---|
| `src/pages/ImportarBases.tsx` | Overwrite with uploaded file content, adding `AppLayout` import and wrapper |

### Details
1. Add `import { AppLayout } from "@/components/AppLayout";` at line 2
2. Copy all uploaded content as-is
3. Wrap the return JSX with `<AppLayout>...</AppLayout>` (around the `<div className="max-w-3xl ...">` at line ~443)

No other files change.

