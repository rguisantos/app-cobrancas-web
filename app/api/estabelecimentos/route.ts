import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Listar estabelecimentos
export async function GET(req: NextRequest) {
  try {
    const estabelecimentos = await prisma.estabelecimento.findMany({
      where: { deletedAt: null },
      orderBy: { nome: 'asc' },
      select: {
        id: true,
        nome: true,
      }
    })

    return NextResponse.json(estabelecimentos)
  } catch (err) {
    console.error('Erro ao listar estabelecimentos:', err)
    return NextResponse.json({ error: 'Erro ao listar estabelecimentos' }, { status: 500 })
  }
}
