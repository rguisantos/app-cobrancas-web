import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, notFound, serverError } from '@/lib/api-helpers'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  try {
    const rota = await prisma.rota.findFirst({
      where: { id, deletedAt: null },
      include: {
        clientes: {
          where: { deletedAt: null },
          select: { id: true, nomeExibicao: true, identificador: true, status: true },
          orderBy: { nomeExibicao: 'asc' }
        }
      }
    })

    if (!rota) return notFound('Rota não encontrada')
    return NextResponse.json(rota)
  } catch (err) {
    console.error('[GET /rotas/id]', err)
    return serverError()
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()
  if (session.user.tipoPermissao !== 'Administrador') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { id: _, ...data } = body

    const rota = await prisma.rota.update({
      where: { id },
      data: {
        ...data,
        version: { increment: 1 },
        deviceId: 'web',
        needsSync: true
      }
    })

    return NextResponse.json(rota)
  } catch (err) {
    console.error('[PUT /rotas/id]', err)
    return serverError()
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()
  if (session.user.tipoPermissao !== 'Administrador') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    await prisma.rota.update({
      where: { id },
      data: { 
        deletedAt: new Date(),
        needsSync: true,
        version: { increment: 1 }
      }
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /rotas/id]', err)
    return serverError()
  }
}
