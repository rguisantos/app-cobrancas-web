# Task: Create minimal test suite for sync engine and rate limiter

## Summary

Created a comprehensive test suite for the sync engine and rate limiter modules in the Next.js project. All 70 tests pass.

## What was done

### 1. Test Framework Setup
- Installed `jest`, `@types/jest`, `ts-jest` as dev dependencies
- Created `jest.config.js` with TypeScript support and path alias mapping (`@/*` → `<rootDir>/*`)
- Added `"test": "jest --verbose"` script to `package.json`

### 2. Exported Pure Functions from sync-engine.ts
- `parseChanges` — was private, now exported
- `filterAllowedFields` — was private, now exported
- `convertForPrisma` — was private, now exported
- `parseSafeSince` — was private, now exported
- `sortChangesByDependency` — was private, now exported
- `TABLE_MAP` — was private, now exported
- `PROCESSING_ORDER` — was private, now exported

### 3. Created `__tests__/lib/sync-engine.test.ts` (54 tests)

**parseChanges()** — 6 tests:
- Parses JSON string, returns empty for invalid JSON, passes objects through, handles null/undefined

**filterAllowedFields()** — 8 tests:
- Filters unknown fields, keeps allowed fields, silently drops virtual fields (id, createdAt, cpfCnpj, etc.), passes unknown models through, keeps lat/long for cliente, removes senha from usuario

**convertForPrisma()** — 25 tests:
- JSON string → object for contatos, permissoesWeb, permissoesMobile, rotasPermitidas
- Boolean conversion: 'true'/'1'/1 → true, 'false'/'0'/0/'' → false for needsSync, trocaPano, bloqueado
- Numeric conversion: string → number for version, precoFicha, latitude, longitude, etc.
- Null/undefined passthrough, mixed conversions

**parseSafeSince()** — 4 tests:
- Valid ISO → Date, invalid → epoch, empty → epoch, various formats

**sortChangesByDependency()** — 6 tests:
- Correct dependency order (rota → cliente → produto → locacao → cobranca → usuario), empty array, single element, unknown types, stable sort

**processPush() with mocks** — 3 tests:
- Create new cliente, version conflict detection, replay detection

### 4. Created `__tests__/lib/rate-limit.test.ts` (16 tests)

**rateLimit()** — 7 tests:
- Allows within limit, blocks over limit, resets after window, tracks remaining, independent keys, resetAt timestamp, sliding window behavior

**getClientIp()** — 7 tests:
- Extracts from x-forwarded-for, x-real-ip, cf-connecting-ip, true-client-ip, returns "unknown", prioritization, whitespace trimming

## Test Results
```
Test Suites: 2 passed, 2 total
Tests:       70 passed, 70 total
Time:        0.721 s
```

## Key Technical Decisions
- Used `jest.mock()` at module level (not `jest.doMock` inside tests) for prisma and logger mocking — this is required because `sync-engine.ts` imports prisma at the top level
- The mock prisma object is a plain object with jest.fn() methods, defined outside the mock factory so tests can access it for assertions
- Rate limiter tests use `jest.useFakeTimers()` for time-dependent sliding window tests
