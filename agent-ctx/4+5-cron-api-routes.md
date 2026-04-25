# Task 4+5 — API Routes for Automated Cobrança Vencimento Check and Auto-Generation

## Summary

Created two API routes for automated cron jobs, updated middleware to allow cron routes with custom auth, built an admin UI page, and updated the sidebar.

## Files Created

### 1. `/app/api/cron/vencimento/route.ts`
- **POST**: Checks for cobranças with status "Pendente" and dataVencimento < today, updates them to "Atrasado"
- **GET**: Preview — lists cobranças that would be affected without making changes
- Auth: CRON_SECRET (via `x-cron-secret` header or `secret` query param) OR admin session
- Returns count and details of updated records

### 2. `/app/api/cron/gerar-cobrancas/route.ts`
- **POST**: Generates pending cobranças for active locações with `formaPagamento = 'Periodo'`
- **GET**: Preview — lists locações and whether they already have cobranças for the current period
- Period calculation:
  - **Mensal**: 1st to last day of month
  - **Quinzenal**: 1st-15th or 16th-end of month
  - **Semanal**: Monday to Sunday of current week
  - **Diária**: Current day
- Creates cobrança with: valorFixo as totalBruto/totalClientePaga/saldoDevedorGerado, relogioAnterior from locação, dataVencimento = end of period
- Checks for existing cobranças before creating (avoids duplicates)
- Updates locação's dataUltimaCobranca after generation
- Auth: Same as vencimento route

### 3. `/app/(app)/admin/cron/page.tsx`
- Client component with full admin UI
- KPI cards showing: Pendentes, Atrasadas, Locações Ativas, Tarefas Auto
- "Verificar Vencimentos" section with Execute and Preview buttons
- "Gerar Cobranças Pendentes" section with Execute and Preview buttons
- Expandable tables showing affected records
- Last execution timestamps
- Success/error result feedback
- Information card explaining how automation works and CRON setup
- Admin-only access (redirects non-admins)

## Files Modified

### 4. `middleware.ts`
- Added `/api/cron/:path*` to the matcher
- Added early return in middleware function for `/api/cron/` paths (bypasses NextAuth)
- Modified `authorized` callback to allow cron routes without token
- Added comments explaining the CRON_SECRET-based auth pattern

### 5. `components/layout/sidebar.tsx`
- Added `Clock` icon import from lucide-react
- Added `{ href: '/admin/cron', label: 'Automação', icon: Clock }` to NAV_ADMIN array

## Architecture Decisions
- Cron routes handle their own auth (CRON_SECRET or admin session) rather than relying on NextAuth middleware
- Preview endpoints (GET) allow admins to see what would be affected before executing
- Period calculation uses simple date string comparison (YYYY-MM-DD format) matching the existing schema's String type for dates
- Generated cobranças include observacao with periodicidade label for traceability
