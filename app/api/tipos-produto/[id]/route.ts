import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, notFound, serverError, forbidden, handleApiError } from '@/lib/api-helpers'
import { atributoProdutoUpdateSchema } from '@/lib/validations'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  try {
    const item = await prisma.tipoProduto.findFirst({
      where: { id, deletedAt: null },
    })
    if (!item) return notFound('Tipo de produto não encontrado')
    return NextResponse.json(item)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()
  if (session.user.tipoPermissao !== 'Administrador') return forbidden()

  try {
    const existing = await prisma.tipoProduto.findFirst({ where: { id, deletedAt: null } })
    if (!existing) return notFound('Tipo de produto não encontrado')

    const body = await req.json()
    const data = atributoProdutoUpdateSchema.parse(body)

    const item = await prisma.tipoProduto.update({
      where: { id },
      data: {
        nome: data.nome,
        version: { increment: 1 },
        deviceId: 'web',
        needsSync: true,
      },
    })
    return NextResponse.json(item)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()
  if (session.user.tipoPermissao !== 'Administrador') return forbidden()

  try {
    const existing = await prisma.tipoProduto.findFirst({ where: { id, deletedAt: null } })
    if (!existing) return notFound('Tipo de produto não encontrado')

    await prisma.tipoProduto.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        needsSync: true,
        version: { increment: 1 },
      },
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err)
  }
}
