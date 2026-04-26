import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, notFound, serverError } from '@/lib/api-helpers'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session || session.user.tipoPermissao !== 'Administrador') return unauthorized()

  try {
    const usuario = await prisma.usuario.findFirst({ where: { id, deletedAt: null } })
    if (!usuario) return notFound('Usuário não encontrado')

    const sessoes = await prisma.sessao.findMany({
      where: { usuarioId: id, expiraEm: { gt: new Date() } },
      select: {
        id: true,
        dispositivo: true,
        ip: true,
        userAgent: true,
        expiraEm: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(sessoes)
  } catch (err) {
    console.error('[GET /usuarios/:id/sessoes]', err)
    return serverError()
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session || session.user.tipoPermissao !== 'Administrador') return unauthorized()

  try {
    const result = await prisma.sessao.deleteMany({ where: { usuarioId: id } })
    return NextResponse.json({ success: true, message: `${result.count} sessões encerradas` })
  } catch (err) {
    console.error('[DELETE /usuarios/:id/sessoes]', err)
    return serverError()
  }
}
