// POST /api/admin/migrate — Executa migrações manuais no banco
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma' // CORREÇÃO: usar singleton em vez de new PrismaClient()
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    // CORREÇÃO: Remover fallback inseguro — falhar se MIGRATION_TOKEN não configurado
    const expectedToken = process.env.MIGRATION_TOKEN
    if (!expectedToken) {
      logger.error('[migrate] MIGRATION_TOKEN não configurado no servidor')
      return NextResponse.json({ error: 'MIGRATION_TOKEN não configurado no servidor' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results: string[] = []

    // Garantir que as colunas existam com os nomes corretos (camelCase como o Prisma espera)
    const migrations = [
      // Cobrancas - colunas que podem estar faltando
      {
        sql: `ALTER TABLE "cobrancas" ADD COLUMN IF NOT EXISTS "locacaoId" TEXT`,
        desc: 'locacaoId em cobrancas'
      },
      {
        sql: `ALTER TABLE "cobrancas" ADD COLUMN IF NOT EXISTS "clienteId" TEXT`,
        desc: 'clienteId em cobrancas'
      },
      {
        sql: `ALTER TABLE "cobrancas" ADD COLUMN IF NOT EXISTS "produtoId" TEXT`,
        desc: 'produtoId em cobrancas'
      },
      {
        sql: `ALTER TABLE "cobrancas" ADD COLUMN IF NOT EXISTS "saldoDevedorGerado" DOUBLE PRECISION NOT NULL DEFAULT 0`,
        desc: 'saldoDevedorGerado em cobrancas'
      },
      {
        sql: `ALTER TABLE "cobrancas" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)`,
        desc: 'deletedAt em cobrancas'
      },
      // Clientes
      {
        sql: `ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "rotaId" TEXT`,
        desc: 'rotaId em clientes'
      },
      {
        sql: `ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)`,
        desc: 'deletedAt em clientes'
      },
      // Produtos
      {
        sql: `ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "tipoId" TEXT`,
        desc: 'tipoId em produtos'
      },
      {
        sql: `ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "descricaoId" TEXT`,
        desc: 'descricaoId em produtos'
      },
      {
        sql: `ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "tamanhoId" TEXT`,
        desc: 'tamanhoId em produtos'
      },
      {
        sql: `ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)`,
        desc: 'deletedAt em produtos'
      },
      // Locacoes
      {
        sql: `ALTER TABLE "locacoes" ADD COLUMN IF NOT EXISTS "clienteId" TEXT`,
        desc: 'clienteId em locacoes'
      },
      {
        sql: `ALTER TABLE "locacoes" ADD COLUMN IF NOT EXISTS "produtoId" TEXT`,
        desc: 'produtoId em locacoes'
      },
      {
        sql: `ALTER TABLE "locacoes" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)`,
        desc: 'deletedAt em locacoes'
      },
      // Rotas
      {
        sql: `ALTER TABLE "rotas" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)`,
        desc: 'deletedAt em rotas'
      },
      // Usuarios
      {
        sql: `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)`,
        desc: 'deletedAt em usuarios'
      }
    ];

    for (const migration of migrations) {
      try {
        await prisma.$executeRawUnsafe(migration.sql);
        results.push(`Adicionado: ${migration.desc}`);
      } catch (error: any) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          results.push(`Já existe: ${migration.desc}`);
        } else {
          results.push(`Erro em ${migration.desc}: ${error.message}`);
        }
      }
    }

    // Verificar estrutura atual
    const tabelas = ['cobrancas', 'clientes', 'produtos', 'locacoes'];
    const estrutura: Record<string, string[]> = {};
    
    for (const tabela of tabelas) {
      const cols = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = ${tabela}
        ORDER BY ordinal_position
      `;
      estrutura[tabela] = (cols as any[]).map(c => c.column_name);
    }

    logger.info('[migrate] Migrações executadas com sucesso')

    return NextResponse.json({
      success: true,
      results,
      estrutura
    });
  } catch (error: any) {
    logger.error('[migrate] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
  // NOTA: Não chamar prisma.$disconnect() — usar singleton do @/lib/prisma
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST com header Authorization: Bearer <MIGRATION_TOKEN> para executar a migration'
  });
}
