import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, getUserRotaIds, unauthorized, notFound, forbidden, serverError } from '@/lib/api-helpers'
import { rotaUpdateSchema } from '@/lib/validations'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  // Verificar se o usuário tem acesso a esta rota
  const rotaIds = await getUserRotaIds(session)
  if (rotaIds !== null && !rotaIds.includes(id)) {
    return forbidden('Você não tem acesso a esta rota')
  }

  try {
    const rota = await prisma.rota.findFirst({
      where: { id, deletedAt: null },
      include: {
        clientes: {
          where: { deletedAt: null },
          select: {
            id: true,
            nomeExibicao: true,
            identificador: true,
            status: true,
            cidade: true,
            locacoes: {
              where: { status: 'Ativa' },
              select: { id: true, precoFicha: true },
            },
          },
          orderBy: { nomeExibicao: 'asc' },
        },
        usuarioRotas: {
          include: {
            usuario: {
              select: {
                id: true,
                nome: true,
                email: true,
                tipoPermissao: true,
              },
            },
          },
        },
        _count: {
          select: {
            clientes: { where: { deletedAt: null } },
          },
        },
      },
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

    // Validação com Zod
    const parsed = rotaUpdateSchema.safeParse(body)
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors
      const firstError = Object.values(errors).flat()[0] || 'Dados inválidos'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { descricao, status } = parsed.data

    // Verificar se a rota existe
    const rotaExistente = await prisma.rota.findFirst({
      where: { id, deletedAt: null },
    })
    if (!rotaExistente) return notFound('Rota não encontrada')

    // Verificar unicidade da descrição (se foi alterada)
    if (descricao && descricao !== rotaExistente.descricao) {
      const rotaComMesmoNome = await prisma.rota.findFirst({
        where: {
          descricao: { equals: descricao, mode: 'insensitive' },
          deletedAt: null,
          id: { not: id },
        },
      })
      if (rotaComMesmoNome) {
        return NextResponse.json(
          { error: 'Já existe uma rota com esta descrição' },
          { status: 409 },
        )
      }
    }

    // Atualizar rota
    const rota = await prisma.rota.update({
      where: { id },
      data: {
        ...(descricao !== undefined && { descricao }),
        ...(status !== undefined && { status }),
        version: { increment: 1 },
        deviceId: 'web',
        needsSync: true,
      },
    })

    // Se a descrição foi alterada, atualizar o campo rotaNome em todos os clientes vinculados
    if (descricao && descricao !== rotaExistente.descricao) {
      await prisma.cliente.updateMany({
        where: { rotaId: id, deletedAt: null },
        data: { rotaNome: descricao },
      })
    }

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
    // Verificar se a rota existe
    const rota = await prisma.rota.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: { clientes: { where: { deletedAt: null } } },
        },
      },
    })
    if (!rota) return notFound('Rota não encontrada')

    // Soft delete da rota
    await prisma.rota.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        needsSync: true,
        version: { increment: 1 },
      },
    })

    // Desvincular clientes da rota deletada (nullify rotaId e rotaNome)
    await prisma.cliente.updateMany({
      where: { rotaId: id, deletedAt: null },
      data: { rotaId: null, rotaNome: null },
    })

    // Remover associações de usuários com esta rota (UsuarioRota)
    await prisma.usuarioRota.deleteMany({
      where: { rotaId: id },
    })

    return NextResponse.json({
      success: true,
      clientesDesvinculados: rota._count.clientes,
    })
  } catch (err) {
    console.error('[DELETE /rotas/id]', err)
    return serverError()
  }
}
