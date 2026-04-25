// POST /api/admin/migrate-db — Executa migração de geolocalização, notificações e metas
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    // ── Authorization ──────────────────────────────────────────────
    const migrationToken = request.headers.get('x-migration-token')
    const expectedToken = process.env.MIGRATION_TOKEN

    if (!expectedToken) {
      return NextResponse.json(
        { error: 'MIGRATION_TOKEN não configurado no servidor' },
        { status: 500 }
      )
    }

    if (migrationToken !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Migration steps ────────────────────────────────────────────
    const steps: { sql: string; desc: string }[] = [
      // 1. Adicionar coluna latitude na tabela clientes
      {
        sql: `
          DO $$
          BEGIN
              IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'clientes' AND column_name = 'latitude'
              ) THEN
                  ALTER TABLE "clientes" ADD COLUMN "latitude" DOUBLE PRECISION;
              END IF;
          END $$;
        `,
        desc: 'Coluna latitude em clientes',
      },
      // 2. Adicionar coluna longitude na tabela clientes
      {
        sql: `
          DO $$
          BEGIN
              IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'clientes' AND column_name = 'longitude'
              ) THEN
                  ALTER TABLE "clientes" ADD COLUMN "longitude" DOUBLE PRECISION;
              END IF;
          END $$;
        `,
        desc: 'Coluna longitude em clientes',
      },
      // 3. Criar tabela notificacoes
      {
        sql: `
          CREATE TABLE IF NOT EXISTS "notificacoes" (
              "id" TEXT NOT NULL,
              "usuarioId" TEXT NOT NULL,
              "tipo" TEXT NOT NULL,
              "titulo" TEXT NOT NULL,
              "mensagem" TEXT NOT NULL,
              "lida" BOOLEAN NOT NULL DEFAULT false,
              "link" TEXT,
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
          );
        `,
        desc: 'Tabela notificacoes',
      },
      // 4. Índice notificacoes(usuarioId, lida)
      {
        sql: `CREATE INDEX IF NOT EXISTS "notificacoes_usuarioId_lida_idx" ON "notificacoes"("usuarioId", "lida");`,
        desc: 'Índice notificacoes_usuarioId_lida_idx',
      },
      // 5. Índice notificacoes(createdAt)
      {
        sql: `CREATE INDEX IF NOT EXISTS "notificacoes_createdAt_idx" ON "notificacoes"("createdAt");`,
        desc: 'Índice notificacoes_createdAt_idx',
      },
      // 6. Foreign key notificacoes -> usuarios
      {
        sql: `
          DO $$
          BEGIN
              IF NOT EXISTS (
                  SELECT 1 FROM pg_constraint
                  WHERE conname = 'notificacoes_usuarioId_fkey'
              ) THEN
                  ALTER TABLE "notificacoes"
                  ADD CONSTRAINT "notificacoes_usuarioId_fkey"
                  FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
              END IF;
          END $$;
        `,
        desc: 'Foreign key notificacoes_usuarioId_fkey',
      },
      // 7. Criar tabela metas
      {
        sql: `
          CREATE TABLE IF NOT EXISTS "metas" (
              "id" TEXT NOT NULL,
              "nome" TEXT NOT NULL,
              "tipo" TEXT NOT NULL DEFAULT 'receita',
              "valorMeta" DOUBLE PRECISION NOT NULL,
              "valorAtual" DOUBLE PRECISION NOT NULL DEFAULT 0,
              "dataInicio" TIMESTAMP(3) NOT NULL,
              "dataFim" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "rotaId" TEXT,
              "status" TEXT NOT NULL DEFAULT 'ativa',
              "criadoPor" TEXT,
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT "metas_pkey" PRIMARY KEY ("id")
          );
        `,
        desc: 'Tabela metas',
      },
      // 8. Índice metas(status)
      {
        sql: `CREATE INDEX IF NOT EXISTS "metas_status_idx" ON "metas"("status");`,
        desc: 'Índice metas_status_idx',
      },
      // 9. Índice metas(dataInicio, dataFim)
      {
        sql: `CREATE INDEX IF NOT EXISTS "metas_dataInicio_dataFim_idx" ON "metas"("dataInicio", "dataFim");`,
        desc: 'Índice metas_dataInicio_dataFim_idx',
      },
      // 10. Índice metas(rotaId)
      {
        sql: `CREATE INDEX IF NOT EXISTS "metas_rotaId_idx" ON "metas"("rotaId");`,
        desc: 'Índice metas_rotaId_idx',
      },
    ]

    const results: { step: string; status: string; detail?: string }[] = []
    let hasErrors = false

    for (const step of steps) {
      try {
        await prisma.$executeRawUnsafe(step.sql)
        results.push({ step: step.desc, status: 'ok' })
      } catch (error: unknown) {
        hasErrors = true
        const message =
          error instanceof Error ? error.message : String(error)
        results.push({ step: step.desc, status: 'erro', detail: message })
      }
    }

    // ── Verificação pós-migração ──────────────────────────────────
    const verification: Record<string, string[]> = {}

    // Colunas de clientes
    const clienteCols = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'clientes'
      ORDER BY ordinal_position
    `
    verification.clientes = (clienteCols as { column_name: string }[]).map(
      (c) => c.column_name
    )

    // Tabela notificacoes existe?
    const notifTables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'notificacoes'
    `
    verification.notificacoes_existe =
      (notifTables as { table_name: string }[]).length > 0
        ? ['sim']
        : ['nao']

    // Tabela metas existe?
    const metasTables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'metas'
    `
    verification.metas_existe =
      (metasTables as { table_name: string }[]).length > 0 ? ['sim'] : ['nao']

    // Índices criados
    const indexes = await prisma.$queryRaw`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename IN ('notificacoes', 'metas')
      ORDER BY indexname
    `
    verification.indices = (
      indexes as { indexname: string }[]
    ).map((i) => i.indexname)

    return NextResponse.json({
      success: !hasErrors,
      migration: '20260422000000_add_geolocation_notifications_goals',
      results,
      verification,
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message:
      'Use POST com header x-migration-token: <MIGRATION_TOKEN> para executar a migration de geolocalização, notificações e metas',
  })
}
