// GET /api/notificacoes — Listar notificações do usuário
// PUT /api/notificacoes — Marcar todas como lidas
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, handleApiError } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const userId = session.user.id
  const { searchParams } = new URL(req.url)
  const onlyUnread = searchParams.get('lida') === 'false'
  const limit = Math.min(Number(searchParams.get('limit') || 20), 50)

  try {
    const where: any = { usuarioId: userId }
    if (onlyUnread) where.lida = false

    const [notificacoes, unreadCount] = await Promise.all([
      prisma.notificacao.findMany({
        where,
        orderBy: [{ lida: 'asc' }, { createdAt: 'desc' }],
        take: limit,
      }),
      prisma.notificacao.count({
        where: { usuarioId: userId, lida: false },
      }),
    ])

    return NextResponse.json({ data: notificacoes, unreadCount })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const userId = session.user.id

  try {
    const result = await prisma.notificacao.updateMany({
      where: { usuarioId: userId, lida: false },
      data: { lida: true },
    })

    return NextResponse.json({ updated: result.count })
  } catch (error) {
    return handleApiError(error)
  }
}
