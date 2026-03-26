# App Cobranças — Web + Backend

Sistema web completo com backend integrado para sincronização bidirecional com o app mobile.

## Stack

- **Next.js 15** — Framework full-stack (frontend + API Routes)
- **PostgreSQL** — Banco central (Supabase ou Railway)
- **Prisma 6** — ORM com migrations e type-safety
- **NextAuth v4** — Autenticação web com JWT
- **Tailwind CSS 3** — Estilização
- **Zod** — Validação de schemas (mesmo do mobile)

## Início Rápido

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# Preencher DATABASE_URL, NEXTAUTH_SECRET e JWT_SECRET

# 3. Criar banco e rodar migrations
npm run db:push

# 4. Popular banco com admin e dados iniciais
npm run db:seed

# 5. Iniciar em desenvolvimento
npm run dev
```

Acesse: http://localhost:3000
Login: admin@locacao.com / admin123

## Integração com Mobile

Configurar no app mobile (.env):
```
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_USE_MOCK=false
```

### Endpoints consumidos pelo mobile
| Endpoint | Método | Função |
|---|---|---|
| /api/health | GET | Verificação de disponibilidade |
| /api/auth/login | POST | Login mobile → JWT |
| /api/sync/push | POST | Mobile envia alterações |
| /api/sync/pull | POST | Mobile recebe alterações |
| /api/equipamentos | POST | Registro de dispositivo |

## Deploy (Vercel + Supabase)

```bash
# 1. Criar projeto no Supabase → copiar DATABASE_URL
# 2. Criar projeto na Vercel → conectar repositório
# 3. Configurar variáveis de ambiente na Vercel:
#    DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, JWT_SECRET
# 4. Rodar seed em produção:
npx prisma db push
npm run db:seed
```

## Estrutura

```
app/
├── (app)/              # Páginas autenticadas
│   ├── dashboard/      # Dashboard com KPIs
│   ├── clientes/       # Listagem e detalhes
│   ├── produtos/       # Listagem e detalhes
│   ├── cobrancas/      # Histórico de cobranças
│   ├── relatorios/     # Relatórios financeiros
│   └── admin/          # Painel administrativo
│       ├── usuarios/   # Gerenciar usuários
│       ├── dispositivos/ # Dispositivos móveis
│       └── sync/       # Monitor de sincronização
├── api/                # Backend (API Routes)
│   ├── auth/           # Login mobile + NextAuth
│   ├── sync/           # Push e Pull
│   ├── clientes/       # CRUD
│   ├── produtos/       # CRUD
│   ├── locacoes/       # CRUD
│   ├── cobrancas/      # CRUD
│   ├── rotas/          # CRUD
│   ├── usuarios/       # CRUD (admin)
│   ├── equipamentos/   # Registro dispositivos
│   ├── dashboard/      # Métricas
│   └── health/         # Healthcheck
├── login/              # Tela de login
lib/
├── prisma.ts           # Singleton do client
├── auth.ts             # NextAuth config
├── jwt.ts              # JWT para mobile
├── hash.ts             # bcrypt
├── sync-engine.ts      # Motor de sincronização
└── api-helpers.ts      # Utilitários de API
shared/
└── types.ts            # Tipos compartilhados com mobile
prisma/
├── schema.prisma       # Schema do banco
└── seed.ts             # Dados iniciais
```
