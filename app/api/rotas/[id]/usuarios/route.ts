import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, notFound, serverError } from '@/lib/api-helpers'
import { z } from 'zod'

// ─── Schema ──────────────────────────────────────────────────

const gerenciarUsuariosSchema = z.object({
  usuarioIds: z.array(z.string()).min(0, 'Lista de usuários é obrigatória'),
})

// ─── GET /api/rotas/[id]/usuarios ────────────────────────────
// Lista todos os usuários com acesso a esta rota.
// Inclui administradores (acesso total) + usuários com acesso controlado.

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  try {
    // Verificar se a rota existe
    const rota = await prisma.rota.findFirst({ where: { id, deletedAt: null } })
    if (!rota) return notFound('Rota não encontrada')

    // Buscar administradores (têm acesso total a todas as rotas)
    const adminUsers = await prisma.usuario.findMany({
      where: {
        deletedAt: null,
        status: 'Ativo',
        tipoPermissao: 'Administrador',
      },
      select: { id: true, nome: true, email: true, tipoPermissao: true },
    })

    // Buscar usuários com acesso controlado vinculados a esta rota
    const usuariosControlados = await prisma.usuarioRota.findMany({
      where: { rotaId: id },
      include: {
        usuario: {
          select: { id: true, nome: true, email: true, tipoPermissao: true, status: true },
        },
      },
    })

    // Filtrar apenas usuários ativos com acesso controlado
    const controlados = usuariosControlados
      .filter(ur => ur.usuario.status === 'Ativo' && ur.usuario.tipoPermissao === 'AcessoControlado')
      .map(ur => ur.usuario)

    // Combinar admins + controlados (sem duplicatas)
    const adminIds = new Set(adminUsers.map(u => u.id))
    const usuariosComAcesso = [
      ...adminUsers,
      ...controlados.filter(u => !adminIds.has(u.id)),
    ]

    // Buscar todos os usuários com acesso controlado ativos (para o select)
    const todosControlados = await prisma.usuario.findMany({
      where: {
        deletedAt: null,
        status: 'Ativo',
        tipoPermissao: 'AcessoControlado',
      },
      select: { id: true, nome: true, email: true, tipoPermissao: true },
    })

    return NextResponse.json({
      usuariosComAcesso,
      todosControlados,
    })
  } catch (err) {
    console.error('[GET /rotas/id/usuarios]', err)
    return serverError()
  }
}

// ─── PUT /api/rotas/[id]/usuarios ────────────────────────────
// Define os usuários com acesso controlado a esta rota.
// Substitui toda a lista de vínculos. Apenas Administradores.

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()
  if (session.user.tipoPermissao !== 'Administrador') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = gerenciarUsuariosSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const { usuarioIds } = parsed.data

    // Verificar se a rota existe
    const rota = await prisma.rota.findFirst({ where: { id, deletedAt: null } })
    if (!rota) return notFound('Rota não encontrada')

    // Verificar se todos os usuários existem e são AcessoControlado
    if (usuarioIds.length > 0) {
      const usuarios = await prisma.usuario.findMany({
        where: {
          id: { in: usuarioIds },
          deletedAt: null,
          status: 'Ativo',
        },
        select: { id: true, tipoPermissao: true },
      })

      const idsEncontrados = new Set(usuarios.map(u => u.id))
      const idsInvalidos = usuarioIds.filter(uid => !idsEncontrados.has(uid))
      if (idsInvalidos.length > 0) {
        return NextResponse.json(
          { error: `Usuários não encontrados ou inativos: ${idsInvalidos.join(', ')}` },
          { status: 400 },
        )
      }
    }

    // Transação: remover vínculos antigos e criar novos
    await prisma.$transaction(async (tx) => {
      // Remover vínculos existentes desta rota
      await tx.usuarioRota.deleteMany({ where: { rotaId: id } })

      // Criar novos vínculos
      if (usuarioIds.length > 0) {
        await tx.usuarioRota.createMany({
          data: usuarioIds.map(usuarioId => ({ usuarioId, rotaId: id })),
          skipDuplicates: true,
        })
      }
    })

    // Buscar dados atualizados para retorno
    const usuariosAtualizados = await prisma.usuarioRota.findMany({
      where: { rotaId: id },
      include: {
        usuario: {
          select: { id: true, nome: true, email: true, tipoPermissao: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      usuariosVinculados: usuariosAtualizados.map(ur => ur.usuario),
    })
  } catch (err) {
    console.error('[PUT /rotas/id/usuarios]', err)
    return serverError()
  }
}
