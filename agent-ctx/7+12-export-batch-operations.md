# Task 7+12 — CSV/XLSX Export & Batch Operations

## Agent: fullstack-dev
## Date: 2026-03-05

## Summary

Implemented complete CSV export on all listing pages and batch operations on clientes, produtos, and cobrancas pages.

## Files Modified

### Export Utility
- `lib/export-utils.ts` — Added `exportToCSV()`, `exportEntityList()`, and entity-specific formatters for clientes, produtos, locacoes, cobrancas, manutencoes. Added backward-compatible aliases for existing report exports.

### Client Components (Export + Batch UI)
- `app/(app)/clientes/clientes-client.tsx` — Added Export CSV button, checkbox selection column, "selecionar todos" checkbox, BatchActionBar with delete/updateRota actions, ConfirmModal
- `app/(app)/produtos/produtos-client.tsx` — Added Export CSV button, checkbox selection, BatchActionBar with delete/updateStatus actions
- `app/(app)/cobrancas/cobrancas-client.tsx` — Added Export CSV button, checkbox selection, BatchActionBar with delete/updateStatus actions
- `app/(app)/locacoes/locacoes-client.tsx` — Added Export CSV button only (no batch per spec)
- `app/(app)/manutencoes/manutencoes-client.tsx` — Added Export CSV button only (no batch per spec)

### Batch API Routes
- `app/api/clientes/batch/route.ts` — POST: delete (soft), updateRota
- `app/api/produtos/batch/route.ts` — POST: delete (soft), updateStatus, updateEstabelecimento
- `app/api/cobrancas/batch/route.ts` — POST: delete (soft), updateStatus

### Server Components (data passthrough)
- `app/(app)/clientes/page.tsx` — Added rotaId to client data
- `app/(app)/produtos/page.tsx` — Added estabelecimento to client data

## Design Decisions

1. **Export**: Uses client-side generation via Blob + URL.createObjectURL. No server round-trip needed for export of current page data.
2. **Batch Operations**: Floating action bar at bottom center with slate-900 background. Appears only when items are selected.
3. **Checkbox Selection**: Both mobile cards and desktop table rows support selection. Selected items get a subtle primary ring/highlight.
4. **Confirmation**: Uses existing `ConfirmModal` component for all batch operations to prevent accidental data loss.
5. **Soft Delete**: All batch deletes set `deletedAt` rather than removing records, consistent with existing patterns.
6. **Limit**: Max 100 items per batch operation to prevent abuse.
7. **Permissions**: Only users with `todosCadastros` permission can execute batch operations.

## Type Check Results
- All new/modified files pass TypeScript and ESLint checks.
- Pre-existing error in `app/(app)/admin/sync/conflitos/conflitos-client.tsx` (duplicate property) is unrelated.
