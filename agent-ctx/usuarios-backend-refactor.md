# Task: Refactor Users (Usuarios) Area Backend

## Summary
Updated backend code for the users area in the app-cobrancas-web repository. Removed the old `rotasPermitidas` JSON field handling, expanded permissions structure, added audit logging, and created new API endpoints.

## Files Created
1. **`lib/permissoes-padrao.ts`** — Default permissions per role (Administrador, Secretario, AcessoControlado) using expanded PermissoesWeb and PermissoesMobile interfaces
2. **`lib/auditoria.ts`** — Audit logging helper with `registrarAuditoria()` function
3. **`app/api/usuarios/[id]/desbloquear/route.ts`** — POST endpoint for admin to unlock blocked user accounts
4. **`app/api/usuarios/[id]/reset-senha/route.ts`** — POST endpoint for admin to reset user password (with strong password validation)
5. **`app/api/usuarios/[id]/sessoes/route.ts`** — GET/DELETE endpoints to list and terminate active user sessions

## Files Updated
1. **`app/api/usuarios/route.ts`** — Updated Zod schemas to expanded permissions, removed `rotasPermitidas` JSON field from prisma create, added audit logging on creation, enforced strong password policy
2. **`app/api/usuarios/[id]/route.ts`** — Updated Zod schemas to expanded permissions, removed `rotasPermitidas` JSON field handling (keeps UsuarioRota relation only), added PATCH for toggleBlock, added audit logging on update/delete, auto-apply default permissions when tipoPermissao changes
3. **`types/next-auth.d.ts`** — Updated Session type to use expanded PermissoesWeb and PermissoesMobile from @cobrancas/shared
4. **`lib/auth.ts`** — Added permissoesMobile to authorize return, JWT token, re-validation query, and session callback

## No Changes Needed (confirmed)
- **`lib/auth-core.ts`** — Already reads from DB (Json type), works with expanded format
- **`app/api/auth/change-password/route.ts`** — Already validates with strong password schema

## Key Design Decisions
- `rotasPermitidas` in Zod schemas still accepts an array of route IDs as input, but it only creates `UsuarioRota` relations (no longer writes to a JSON field)
- When `tipoPermissao` changes during update and no explicit permissions are provided, defaults from `PERMISSOES_PADRAO` are applied
- DELETE now also revokes all user sessions and logs audit
- Auditoria logs are fire-and-forget (errors logged to console but don't break main flow)
