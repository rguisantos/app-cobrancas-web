# Task 11+14: Dashboard Activity Feed & Filters

## Summary

Implemented the Activity Feed widget for the Dashboard and added comprehensive filter support (period selector + rota dropdown) to the Dashboard page.

## Files Created

### 1. `/app/api/dashboard/atividade/route.ts`
- **GET** endpoint that returns the last 15 ChangeLog entries
- Formats entries as human-readable activities with:
  - `operacao` (create/update/delete)
  - `entidade` (entity type label in Portuguese)
  - `entidadeId`
  - `descricao` (auto-generated description like "Cliente 'João Silva' criado")
  - `timestamp` (ISO string)
  - `link` (route to the entity)
- Uses `buildDescription()` helper that extracts identifiable names from the `changes` JSON
- Protected by auth session check

### 2. `/app/(app)/dashboard/atividade-recente.tsx`
- Client component showing the last 10 activities
- Features:
  - Color-coded icons: Plus (green) for create, Pencil (amber) for update, Trash2 (red) for delete
  - Entity type labels in Portuguese (Cliente, Produto, Locação, Cobrança)
  - Relative timestamps (há 5 minutos, há 2 horas, etc.)
  - Clickable links to entities
  - Auto-refresh every 60 seconds via `setInterval`
  - Skeleton loading state
  - Empty state when no activities exist
  - Max height with scroll overflow (`max-h-96 overflow-y-auto`)

## Files Modified

### 3. `/app/api/dashboard/route.ts`
- Added full query param support:
  - `periodo` (mes, trimestre, semestre, ano, personalizado)
  - `dataInicio`, `dataFim` (custom range)
  - `rotaId` (filter by route)
- All aggregation queries now use the filtered period and rotaId
- When `rotaId` is provided, cobranca queries join via `cliente.rotaId`
- Raw SQL queries conditionally include rotaId filter with `INNER JOIN`
- Period calculation via `calcularPeriodo()` helper
- Previous period calculation adjusted based on period type (1 month, 3 months, 6 months, etc.)
- Serialized `cobrancasRecentes` dates to ISO strings for client compatibility

### 4. `/app/(app)/dashboard/page.tsx`
- Updated to accept `searchParams` as a Promise (Next.js 15 pattern)
- Extracts `periodo`, `dataInicio`, `dataFim`, `rotaId` from search params
- Passes all filter params to `getDashboardData()`
- Added `getRotas()` function to fetch active routes for the filter dropdown
- Passes `rotas`, `periodoAtual`, `rotaIdAtual` to `DashboardClient`
- `getDashboardData()` now accepts and applies all filter parameters
- All Prisma queries use filtered where clauses
- Raw SQL queries conditionally include rotaId JOINs
- Cobranca dates serialized for client compatibility

### 5. `/app/(app)/dashboard/dashboard-client.tsx`
- Added comprehensive `FilterBar` component with:
  - Period selector buttons (Este mês, Trimestre, Semestre, Este ano, Personalizado)
  - Rota dropdown populated from API
  - Custom date range inputs for Personalizado
  - Loading indicator during refetch
- Added `LoadingOverlay` component for visual feedback during data refresh
- When filters change:
  - Updates URL with search params for bookmarkability
  - Fetches fresh data via `/api/dashboard` API endpoint
  - Shows loading overlay during fetch
- Integrated `AtividadeRecente` component in the layout
- Layout restructured: Cobranças Recentes + Alertas in a 3-column grid, then Activity Feed + Top Clientes in a 2-column grid
- Empty state for Top Clientes when no data
- KPI title changed from "Receita do Mês" to "Receita do Período"
- Trend label changed from "vs mês anterior" to "vs período anterior"

## Design Decisions

- Filters use URL search params for bookmarkability and server-side rendering
- Client-side refetch via API for instant feedback (no full page reload)
- Activity feed auto-refreshes independently from dashboard filters
- Pre-existing TypeScript errors in other files (sync/conflitos, export-utils) are not related to our changes
