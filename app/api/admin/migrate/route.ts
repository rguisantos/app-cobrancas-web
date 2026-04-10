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

    // Lista de colunas a verificar/adicionar
    const migrations = [
      {
        table: 'cobrancas',
        column: 'saldo_devedor_gerado',
        sql: `ALTER TABLE "cobrancas" ADD COLUMN IF NOT EXISTS "saldo_devedor_gerado" DOUBLE PRECISION NOT NULL DEFAULT 0`
      },
      {
        table: 'cobrancas',
        column: 'deleted_at',
        sql: `ALTER TABLE "cobrancas" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3)`
      },
      {
        table: 'clientes',
        column: 'deleted_at',
        sql: `ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3)`
      },
      {
        table: 'produtos',
        column: 'deleted_at',
        sql: `ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3)`
      },
      {
        table: 'locacoes',
        column: 'deleted_at',
        sql: `ALTER TABLE "locacoes" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3)`
      },
      {
        table: 'rotas',
        column: 'deleted_at',
        sql: `ALTER TABLE "rotas" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3)`
      },
      {
        table: 'usuarios',
        column: 'deleted_at',
        sql: `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3)`
      }
    ];

    for (const migration of migrations) {
      const checkColumn = await prisma.$queryRaw`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = ${migration.table}
        AND column_name = ${migration.column}
      `;

      if (Array.isArray(checkColumn) && checkColumn.length === 0) {
        await prisma.$executeRawUnsafe(migration.sql);
        results.push(`Coluna ${migration.column} adicionada em ${migration.table}`);
      } else {
        results.push(`Coluna ${migration.column} já existe em ${migration.table}`);
      }
    }

    return NextResponse.json({
      success: true,
      results
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
