import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, notFound, serverError, forbidden } from '@/lib/api-helpers'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  try {
    const item = await prisma.descricaoProduto.findFirst({
      where: { id, deletedAt: null },
    })
    if (!item) return notFound('Descrição de produto não encontrada')
    return NextResponse.json(item)
  } catch (err) {
    console.error('[GET /descricoes-produto/id]', err)
    return serverError()
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()
  if (session.user.tipoPermissao !== 'Administrador') return forbidden()

  try {
    const body = await req.json()
    const nome = typeof body.nome === 'string' ? body.nome.trim() : ''
    if (!nome || nome.length < 2) {
      return NextResponse.json({ error: 'Nome deve ter pelo menos 2 caracteres' }, { status: 400 })
    }

    const existing = await prisma.descricaoProduto.findFirst({ where: { id, deletedAt: null } })
    if (!existing) return notFound('Descrição de produto não encontrada')

    const item = await prisma.descricaoProduto.update({
      where: { id },
      data: {
        nome,
        version: { increment: 1 },
        deviceId: 'web',
        needsSync: true,
      },
    })
    return NextResponse.json(item)
  } catch (err) {
    console.error('[PUT /descricoes-produto/id]', err)
    return serverError()
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()
  if (session.user.tipoPermissao !== 'Administrador') return forbidden()

  try {
    const existing = await prisma.descricaoProduto.findFirst({ where: { id, deletedAt: null } })
    if (!existing) return notFound('Descrição de produto não encontrada')

    await prisma.descricaoProduto.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        needsSync: true,
        version: { increment: 1 },
      },
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /descricoes-produto/id]', err)
    return serverError()
  }
}
