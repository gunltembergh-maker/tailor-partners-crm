

# Move "Aplicar" and "Limpar" buttons right after "Tipo de Cliente"

Currently the buttons are pinned to the bottom of the sidebar (outside `ScrollArea`). The change moves them inside the scroll area, immediately after the "Tipo de Cliente" filter (and before "Vencimento" if visible).

## Change in `src/components/dashboard/FiltersSidebar.tsx`

1. **Remove** the footer `div` (lines 148-168) that contains the Aplicar/Limpar buttons.
2. **Insert** the same buttons block inside the `ScrollArea`, right after the "Tipo de Cliente" `PbiMultiSelect` (after line 131), before the Vencimento conditional block.

The buttons will now scroll with the filters and sit directly below "Tipo de Cliente".

