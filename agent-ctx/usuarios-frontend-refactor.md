# Task: Usuarios Frontend Refactor

## Summary
Refactored the users (usuarios) area frontend to support expanded permissions, new API endpoints, and shared form component.

## Changes Made

### 1. Created `/components/usuarios/UsuarioForm.tsx`
- Shared form component for both "New User" and "Edit User" pages
- Eliminates ~90% code duplication between create and edit
- Props: `mode: 'create' | 'edit'`, `initialData?`, `rotas: Rota[]`, `onSubmit`, `onCancel`
- Expanded permissions with category groupings:
  - Web: Cadastros (3), Operações (4), Visualização (4), Admin (5)
  - Mobile: Cadastros (2), Operações (4), Visualização (2)
- CPF/phone auto-formatting
- Password visibility toggle
- Password strength indicator (5 criteria, real-time feedback)
- Auto-apply default permissions when tipoPermissao changes
- Edit mode: optional password, reset password modal, unlock button
- Route selection for AcessoControlado

### 2. Updated `/app/(app)/admin/usuarios/novo/page.tsx`
- Replaced with clean version using shared UsuarioForm component
- Fetches rotas from API on mount
- Uses `<UsuarioForm mode="create" />`

### 3. Updated `/app/(app)/admin/usuarios/[id]/editar/page.tsx`
- Replaced with clean version using shared UsuarioForm component
- Fetches both rotas and existing user data
- Maps `rotasPermitidasRel` to `rotasPermitidas` (array of IDs)
- Uses `<UsuarioForm mode="edit" />`
- On submit, only sends password if provided

### 4. Created `/app/(app)/admin/usuarios/[id]/page.tsx`
- New detail/view page for a user
- User avatar, full info, status badges
- Web permissions displayed in grouped cards (4 categories)
- Mobile permissions displayed in grouped cards (3 categories)
- Assigned routes (for AcessoControlado)
- Active sessions list (fetched from `/api/usuarios/[id]/sessoes`)
- Security info: last access, device, creation date, lockout status
- Action buttons: Edit, Unlock, Toggle Status, Delete
- Visual style matching perfil page (rounded-xl, gradient headers)

### 5. Updated `/app/(app)/admin/usuarios/page.tsx`
- Changed from server component to client component
- Fetches from API instead of direct Prisma query
- Added search/filter (by name/email, tipo permissao, status)
- Each user row links to detail page
- Quick action buttons: View, Edit, Unlock, Toggle Status
- "Bloqueado" badge when user is blocked
- Filtered results count display
- Desktop table and mobile cards layouts preserved

### 6. Updated `/app/(app)/perfil/profile-client.tsx`
- Strong password validation (8+ chars, uppercase, lowercase, number, special)
- Real-time password strength indicator with 5-level bar
- Added expanded permissions display (web and mobile, grouped by category)
- Updated security tip to show password policy requirements
- Uses `as any` cast for Prisma JsonValue type compatibility

### 7. Updated `/app/(app)/perfil/page.tsx`
- Added `permissoesWeb` and `permissoesMobile` to select query
- Added `as any` cast for type compatibility with ProfileClient

## No TypeScript Errors
All changed files compile without errors. Pre-existing errors in other files (`todosCadastros` references) are unrelated to this refactor.
