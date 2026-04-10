import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // Verificar autenticação básica via header
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.MIGRATION_TOKEN || 'migrate-token-2024';

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verificar se a coluna já existe
    const checkColumn = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'cobrancas'
      AND column_name = 'saldo_devedor_gerado'
    `;

    if (Array.isArray(checkColumn) && checkColumn.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Coluna saldo_devedor_gerado já existe'
      });
    }

    // Adicionar a coluna
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "cobrancas"
      ADD COLUMN "saldo_devedor_gerado" DOUBLE PRECISION NOT NULL DEFAULT 0
    `);

    return NextResponse.json({
      success: true,
      message: 'Coluna saldo_devedor_gerado adicionada com sucesso'
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
