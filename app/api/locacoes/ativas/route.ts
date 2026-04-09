// GET /api/locacoes/ativas — Lista todas as locações ativas
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extrairToken, verificarToken } from '@/lib/jwt'

export async function GET(req: NextRequest) {
  const token = extrairToken(req.headers.get('Authorization'))
  if (!token || !verificarToken(token)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const clienteId = searchParams.get('clienteId')
    const produtoId = searchParams.get('produtoId')

    const limitParam = req.nextUrl?.searchParams?.get('limit')
    const limit = limitParam ? Math.min(parseInt(limitParam), 500) : 200

    const locacoes = await prisma.locacao.findMany({
      where: {
        status: 'Ativa',
        deletedAt: null,
        ...(clienteId && { clienteId }),
        ...(produtoId && { produtoId }),
      },
      take: limit,
      include: {
        cliente: {
          select: {
            id: true,
            nomeExibicao: true,
            rotaId: true,
          },
        },
        produto: {
          select: {
            id: true,
            identificador: true,
            tipoNome: true,
          },
        },
      },
      orderBy: { dataLocacao: 'desc' },
    })

    return NextResponse.json({ locacoes })
  } catch (error) {
    console.error('[locacoes/ativas]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
