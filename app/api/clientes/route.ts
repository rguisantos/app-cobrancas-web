// GET /api/clientes  — listar
// POST /api/clientes — criar
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, getUserRotaIds, unauthorized, serverError, validateBody, ApiError, handleApiError } from '@/lib/api-helpers'
import { registrarAuditoria, extractRequestInfo } from '@/lib/auditoria'
import { clienteCreateSchema } from '@/lib/validations'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const { searchParams } = new URL(req.url)
  const rotaId  = searchParams.get('rotaId')
  const status  = searchParams.get('status')
  const busca   = searchParams.get('busca')
  const page    = Number(searchParams.get('page') || 1)
  const limit   = Number(searchParams.get('limit') || 20)

  const where: any = { deletedAt: null }
  if (rotaId) where.rotaId = rotaId
  if (status) where.status = status
  if (busca) {
    where.OR = [
      { nomeExibicao:     { contains: busca, mode: 'insensitive' } },
      { identificador:    { contains: busca, mode: 'insensitive' } },
      { telefonePrincipal:{ contains: busca } },
    ]
  }

  // Filtrar clientes por rotas permitidas do usuário
  const userRotaIds = await getUserRotaIds(session)
  if (userRotaIds !== null) {
    where.rotaId = { in: userRotaIds }
  }

  const [clientes, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      include: { rota: { select: { descricao: true } } },
      orderBy: { nomeExibicao: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.cliente.count({ where }),
  ])

  return NextResponse.json({ data: clientes, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  try {
    const body = await req.json()
    const data = validateBody(clienteCreateSchema, body)
    const { id, ...rest } = data

    const cliente = await prisma.cliente.create({
      data: {
        ...(id ? { id } : {}),
        ...rest,
        contatos:  rest.contatos ? rest.contatos : undefined,
        syncStatus:'synced',
        needsSync: false,
        deviceId:  'web',
        version:   1,
      },
    })

    registrarAuditoria({
      acao: 'criar_cliente',
      entidade: 'cliente',
      entidadeId: cliente.id,
      detalhes: { nomeExibicao: cliente.nomeExibicao, identificador: cliente.identificador },
      ...extractRequestInfo(req),
    }).catch(() => {})

    return NextResponse.json(cliente, { status: 201 })
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message, details: err.details }, { status: err.statusCode })
    }
    console.error('[POST /clientes]', err)
    return serverError()
  }
}
