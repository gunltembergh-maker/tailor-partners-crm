

## Plan: Update sync-sharepoint Edge Function

Replace the entire content of `supabase/functions/sync-sharepoint/index.ts` with the provided code.

### Key changes in the new version:
- Uses `DRIVE_ID` instead of `SITE_ID` for SharePoint access
- Updated `FOLDER_PATH` from `'Documentos Compartilhados/Bases'` to `'Bases'`
- Updated `FILE_MAP` with corrected file/sheet names and added `required` flag for optional sheets
- Added `DePara.xlsm` with `Base CRM` and `DePara` sheets
- Added `Positivador M0 Agrupado` as optional sheet
- New `excelDateToISO` function for date conversion
- Improved `processSheet` with `cellDates: true` and date field detection
- Enhanced `upsertTable` with multiple delete strategies before insert
- Download URL now uses `/drives/${DRIVE_ID}/root:/...` path

### Files modified:
- `supabase/functions/sync-sharepoint/index.ts` — full replacement

No other files, screens, or components will be changed.

