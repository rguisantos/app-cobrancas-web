// PUT /api/notificacoes/[id] — Marcar notificação como lida
// DELETE /api/notificacoes/[id] — Excluir notificação
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, notFound } from '@/lib/api-helpers'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const { id } = await params

  try {
    // Verify ownership
    const notificacao = await prisma.notificacao.findFirst({
      where: { id, usuarioId: session.user.id },
    })

    if (!notificacao) return notFound('Notificação não encontrada')

    const updated = await prisma.notificacao.update({
      where: { id },
      data: { lida: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PUT /api/notificacoes/[id]]', error)
    return NextResponse.json({ error: 'Erro ao atualizar notificação' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const { id } = await params

  try {
    // Verify ownership
    const notificacao = await prisma.notificacao.findFirst({
      where: { id, usuarioId: session.user.id },
    })

    if (!notificacao) return notFound('Notificação não encontrada')

    await prisma.notificacao.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/notificacoes/[id]]', error)
    return NextResponse.json({ error: 'Erro ao excluir notificação' }, { status: 500 })
  }
}
