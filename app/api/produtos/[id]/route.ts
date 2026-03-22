import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, notFound, serverError } from '@/lib/api-helpers'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession()
  if (!session) return unauthorized()
  const produto = await prisma.produto.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { locacoes: { where: { status: 'Ativa' }, take: 1 }, historicoRelogio: { orderBy: { dataAlteracao: 'desc' }, take: 5 } },
  })
  if (!produto) return notFound('Produto não encontrado')
  return NextResponse.json(produto)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession()
  if (!session) return unauthorized()
  try {
    const body = await req.json()
    const { id: _, ...data } = body
    const produto = await prisma.produto.update({ where: { id: params.id }, data: { ...data, version: { increment: 1 }, deviceId: 'web', needsSync: true } })
    return NextResponse.json(produto)
  } catch (err) { console.error(err); return serverError() }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession()
  if (!session) return unauthorized()
  try {
    await prisma.produto.update({ where: { id: params.id }, data: { deletedAt: new Date(), needsSync: true, version: { increment: 1 } } })
    return NextResponse.json({ success: true })
  } catch { return serverError() }
}
