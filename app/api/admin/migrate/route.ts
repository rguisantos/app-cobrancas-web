import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.MIGRATION_TOKEN || 'migrate-token-2024';

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results: string[] = [];

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

    return NextResponse.json({
      success: true,
      results,
      estrutura
    });
  } catch (error: any) {
    console.error('Erro na migration:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST com header Authorization: Bearer <MIGRATION_TOKEN> para executar a migration'
  });
}
