import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, getUserRotaIds, unauthorized, serverError, badRequest } from '@/lib/api-helpers'
import { registrarAuditoria, extractRequestInfo } from '@/lib/auditoria'
import { rotaCreateSchema } from '@/lib/validations'

// ─── GET /api/rotas ──────────────────────────────────────────
// Lista rotas com contagem de clientes e cobradores.
// Filtra por permissão do usuário (AcessoControlado só vê suas rotas).
// Suporta paginação e filtros via query params.

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const busca = searchParams.get('busca')
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

  const where: any = { deletedAt: null }
  if (status) where.status = status
  if (busca) where.descricao = { contains: busca, mode: 'insensitive' }

  // Filtrar rotas por permissão do usuário
  const rotaIds = await getUserRotaIds(session)
  if (rotaIds !== null) {
    // AcessoControlado: só pode ver suas rotas permitidas
    where.id = { in: rotaIds }
  }

  const [rotas, total] = await Promise.all([
    prisma.rota.findMany({
      where,
      orderBy: [{ ordem: 'asc' }, { descricao: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: {
            clientes: { where: { deletedAt: null } },
            usuarioRotas: true,
          },
        },
      },
    }),
    prisma.rota.count({ where }),
  ])

  return NextResponse.json({
    data: rotas,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

// ─── POST /api/rotas ─────────────────────────────────────────
// Cria uma nova rota. Apenas Administradores.

export async function POST(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()
  if (session.user.tipoPermissao !== 'Administrador') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    const body = await req.json()

    // Validação com Zod
    const parsed = rotaCreateSchema.safeParse(body)
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors
      const firstError = Object.values(errors).flat()[0] || 'Dados inválidos'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { descricao, status, cor, regiao, ordem, observacao } = parsed.data

    // Verificar unicidade da descrição
    const rotaExistente = await prisma.rota.findFirst({
      where: { descricao: { equals: descricao, mode: 'insensitive' }, deletedAt: null },
    })
    if (rotaExistente) {
      return NextResponse.json(
        { error: 'Já existe uma rota com esta descrição' },
        { status: 409 },
      )
    }

    const rota = await prisma.rota.create({
      data: {
        descricao,
        status,
        cor,
        regiao,
        ordem,
        observacao,
        deviceId: 'web',
        version: 1,
      },
    })

    registrarAuditoria({
      acao: 'criar_rota',
      entidade: 'rota',
      entidadeId: rota.id,
      entidadeNome: descricao,
      detalhes: { descricao },
      ...extractRequestInfo(req),
    }).catch(() => {})

    return NextResponse.json(rota, { status: 201 })
  } catch (err) {
    console.error('[POST /rotas]', err)
    return serverError()
  }
}
