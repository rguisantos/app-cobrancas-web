import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, getUserRotaIds, unauthorized, forbidden, serverError, validateBody, ApiError, handleApiError } from '@/lib/api-helpers'
import { locacaoCreateSchema } from '@/lib/validations'

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

  const [locacoes, total] = await Promise.all([
    prisma.locacao.findMany({ where, include: { cliente: { select: { nomeExibicao: true, rotaId: true } }, produto: { select: { tipoNome: true, identificador: true } } }, orderBy: { dataLocacao: 'desc' }, skip: (page-1)*limit, take: limit }),
    prisma.locacao.count({ where }),
  ])
  return NextResponse.json({ data: locacoes, total, page, limit })
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
    const { id, ...rest } = data

    // Verificar se produto já está locado
    const locacaoExistente = await prisma.locacao.findFirst({
      where: { produtoId: data.produtoId, status: 'Ativa', deletedAt: null },
    })
    if (locacaoExistente) {
      return NextResponse.json({ error: 'Produto já está locado para outro cliente' }, { status: 409 })
    }

    const locacao = await prisma.locacao.create({
      data: {
        ...(id ? { id } : {}),
        ...rest,
        syncStatus: 'synced',
        needsSync:  false,
        deviceId:   'web',
        version:    1,
      },
    })
    return NextResponse.json(locacao, { status: 201 })
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message, details: err.details }, { status: err.statusCode })
    }
    console.error('[POST /locacoes]', err)
    return serverError()
  }
}
