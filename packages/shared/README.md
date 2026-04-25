# @cobrancas/shared

Shared types, constants, and utilities for the **Cobrancas** system — used by both the web app (`app-cobrancas-web`) and the mobile app (`app-cobrancas`).

## Structure

```
packages/shared/
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts         # Re-exports everything
    ├── types.ts         # All shared TypeScript types and interfaces
    ├── constants.ts     # Shared constants (entity types, sync limits, etc.)
    └── utils.ts         # Shared utility functions (formatarMoeda, getSaudacao, etc.)
```

## What's included

### Types (`types.ts`)
- All sync-related types: `SyncResponse`, `SyncConflict`, `ChangeLog`, `UpdatedVersion`, `SyncPayload`
- Entity types: `Cliente`, `Produto`, `Locacao`, `HistoricoCobranca`, `Usuario`, `Rota`
- Support types: `SyncableEntity`, `SyncMetadata`, `SyncConfig`, `Equipamento`
- Filter types: `ClienteFilters`, `ProdutoFilters`, `CobrancaFilters`, `LocacaoFilters`
- Dashboard types: `DashboardWebData`, `DashboardMobileData`
- Device activation types: `DeviceActivationRequest`, `DeviceActivationResponse`

### Constants (`constants.ts`)
- `ENTITY_TYPES` — All entity type values
- `SYNC_CONFLICT_STRATEGIES` — Conflict resolution strategy values
- `SYNC_STATUSES` — All sync status values
- `ENTITY_TABLE_MAP` — Entity type → database table name mapping
- `SYNC_PROCESSING_ORDER` — Dependency-ordered processing sequence
- `SYNC_PULL_LIMIT` — Max records per pull request (500)
- `SYNC_STALE_THRESHOLD_DAYS` — Days before device is considered stale (30)
- `SYNC_STATUS_COLORS` — Color mapping for sync status indicators

### Utilities (`utils.ts`)
- `formatarMoeda(valor)` — Format number as BRL currency
- `getSaudacao()` — Time-of-day greeting in Portuguese
- `getProdutoNome(produto)` — Product display name (e.g., "Bilhar N° 515")
- `getSyncStatusColor(status)` — Color for sync status indicator

## Usage in the Web Project

```typescript
// Import types
import type { ChangeLog, SyncResponse, Cliente } from '@cobrancas/shared'

// Import constants
import { ENTITY_TYPES, SYNC_PULL_LIMIT } from '@cobrancas/shared'

// Import utilities
import { formatarMoeda, getSaudacao } from '@cobrancas/shared'
```

The web project already has TypeScript path aliases configured in `tsconfig.json` so `@cobrancas/shared` resolves to `packages/shared/src/index.ts`.

## Usage in the Mobile Project

### Option 1: Git Dependency (Recommended)

Add the shared package as a git dependency in the mobile project's `package.json`:

```json
{
  "dependencies": {
    "@cobrancas/shared": "github:rguisantos/app-cobrancas-web/packages/shared"
  }
}
```

Then import as usual:

```typescript
import type { SyncResponse, ChangeLog } from '@cobrancas/shared'
import { formatarMoeda, SYNC_PULL_LIMIT } from '@cobrancas/shared'
```

> **Note:** This requires the `packages/shared` directory to be published as a separate npm package or accessible via the monorepo's git repository. For GitHub dependencies, the repo must be accessible.

### Option 2: npm link (Development Only)

For local development, you can link the shared package:

```bash
# In the web project
cd packages/shared
npm link

# In the mobile project
npm link @cobrancas/shared
```

### Option 3: Copy Types (Current Approach)

The simplest but least maintainable approach — copy `packages/shared/src/` contents to the mobile project's `src/types/` directory. This is the current workflow, but it requires manual synchronization when types change.

### Option 4: Private npm Registry

Publish `@cobrancas/shared` to a private npm registry (e.g., GitHub Packages, Verdaccio):

```bash
cd packages/shared
npm publish --registry=https://npm.pkg.github.com
```

Then in the mobile project:

```json
{
  "dependencies": {
    "@cobrancas/shared": "^1.0.0"
  }
}
```

## Migration from `shared/types.ts`

The old `shared/types.ts` file at the web project root has been replaced with a re-export:

```typescript
// shared/types.ts (deprecated)
export * from '@cobrancas/shared'
```

All existing `import ... from '@/shared/types'` statements continue to work. New code should use `import ... from '@cobrancas/shared'` directly.

## Adding New Shared Types

1. Add the type/interface to `packages/shared/src/types.ts`
2. If it's a constant, add it to `packages/shared/src/constants.ts`
3. If it's a utility function, add it to `packages/shared/src/utils.ts`
4. The re-export in `packages/shared/src/index.ts` will automatically include it
5. Update the mobile project's copy if using Option 3
