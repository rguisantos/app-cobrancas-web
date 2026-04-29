import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, notFound, serverError, forbidden, validateBody, handleApiError } from '@/lib/api-helpers'
import { estabelecimentoUpdateSchema } from '@/lib/validations'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  try {
    const item = await prisma.estabelecimento.findFirst({
      where: { id, deletedAt: null },
    })
    if (!item) return notFound('Estabelecimento não encontrado')
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
    const existing = await prisma.estabelecimento.findFirst({ where: { id, deletedAt: null } })
    if (!existing) return notFound('Estabelecimento não encontrado')

    const body = await req.json()
    const data = validateBody(estabelecimentoUpdateSchema, body)

    const updateData: Record<string, any> = {
      version: { increment: 1 },
      deviceId: 'web',
      needsSync: true,
    }
    if (data.nome !== undefined) updateData.nome = data.nome
    if (data.endereco !== undefined) updateData.endereco = data.endereco || null
    if (data.observacao !== undefined) updateData.observacao = data.observacao || null

    const item = await prisma.estabelecimento.update({
      where: { id },
      data: updateData,
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
    const existing = await prisma.estabelecimento.findFirst({ where: { id, deletedAt: null } })
    if (!existing) return notFound('Estabelecimento não encontrado')

    await prisma.estabelecimento.update({
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
