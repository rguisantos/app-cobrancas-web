import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, getUserRotaIds, unauthorized, forbidden, validateBody, handleApiError } from '@/lib/api-helpers'
import { locacaoCreateSchema } from '@/lib/validations'
import { criarLocacao } from '@/lib/locacao-service'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const { searchParams } = new URL(req.url)
  const clienteId = searchParams.get('clienteId')
  const status    = searchParams.get('status')
  const page  = Number(searchParams.get('page') || 1)
  const limit = Number(searchParams.get('limit') || 20)

  const where: any = { deletedAt: null }
  if (clienteId) where.clienteId = clienteId
  if (status)    where.status    = status

  // Filtrar locações por rotas permitidas do usuário (via cliente.rotaId)
  const userRotaIds = await getUserRotaIds(session)
  if (userRotaIds !== null) {
    where.cliente = { rotaId: { in: userRotaIds } }
  }

  try {
    const [locacoes, total] = await Promise.all([
      prisma.locacao.findMany({
        where,
        include: {
          cliente: { select: { nomeExibicao: true, rotaId: true } },
          produto: { select: { tipoNome: true, identificador: true } },
        },
        orderBy: { dataLocacao: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.locacao.count({ where }),
    ])

    return NextResponse.json({ data: locacoes, total, page, limit })
  } catch (err) {
    console.error('[GET /locacoes]', err)
    return NextResponse.json({ error: 'Erro ao buscar locações' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  // Apenas quem tem permissão de locação/relocação pode criar
  if (session.user.tipoPermissao === 'AcessoControlado' &&
      !session.user.permissoesWeb?.locacaoRelocacaoEstoque) {
    return forbidden('Sem permissão para criar locações')
  }

  try {
    const body = await req.json()
    const data = validateBody(locacaoCreateSchema, body)

    const locacao = await criarLocacao(data, session.user.id)

    return NextResponse.json(locacao, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}
