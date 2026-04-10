import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized } from '@/lib/api-helpers'

// GET - Listar estabelecimentos
export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

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
