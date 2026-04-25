import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, forbidden, serverError, badRequest } from '@/lib/api-helpers'
import { z } from 'zod'

const createSchema = z.object({
  produtoId: z.string().min(1, 'Produto é obrigatório'),
  relogioNovo: z.string().min(1, 'Novo relógio é obrigatório'),
  motivo: z.string().min(1, 'Motivo é obrigatório'),
})

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const { searchParams } = new URL(req.url)
  const produtoId = searchParams.get('produtoId')
  const dataInicio = searchParams.get('dataInicio')
  const dataFim = searchParams.get('dataFim')
  const busca = searchParams.get('busca')
  const page = Number(searchParams.get('page') || 1)
  const limit = Number(searchParams.get('limit') || 20)

  const where: any = {}

  if (produtoId) where.produtoId = produtoId

  if (dataInicio || dataFim) {
    where.dataAlteracao = {}
    if (dataInicio) where.dataAlteracao.gte = new Date(dataInicio)
    if (dataFim) where.dataAlteracao.lte = new Date(dataFim + 'T23:59:59')
  }

  if (busca) {
    where.OR = [
      { produto: { identificador: { contains: busca, mode: 'insensitive' } } },
      { produto: { tipoNome: { contains: busca, mode: 'insensitive' } } },
      { motivo: { contains: busca, mode: 'insensitive' } },
      { relogioAnterior: { contains: busca } },
      { relogioNovo: { contains: busca } },
    ]
  }

  const [historico, total] = await Promise.all([
    prisma.historicoRelogio.findMany({
      where,
      include: {
        produto: {
          select: {
            id: true,
            identificador: true,
            tipoNome: true,
            descricaoNome: true,
            numeroRelogio: true,
          },
        },
      },
      orderBy: { dataAlteracao: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.historicoRelogio.count({ where }),
  ])

  return NextResponse.json({ data: historico, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  if (session.user.tipoPermissao === 'AcessoControlado' &&
      !session.user.permissoesWeb?.todosCadastros) {
    return forbidden('Sem permissão para alterar relógio')
  }

  try {
    const body = await req.json()
    const data = createSchema.parse(body)

    // Buscar produto atual para obter o relogioAnterior
    const produto = await prisma.produto.findFirst({
      where: { id: data.produtoId, deletedAt: null },
    })

    if (!produto) {
      return badRequest('Produto não encontrado')
    }

    const relogioAnterior = produto.numeroRelogio

    // Criar histórico e atualizar produto em transação
    const [historico] = await prisma.$transaction([
      prisma.historicoRelogio.create({
        data: {
          produtoId: data.produtoId,
          relogioAnterior,
          relogioNovo: data.relogioNovo,
          motivo: data.motivo,
          usuarioResponsavel: session.user.name || session.user.email || 'Desconhecido',
        },
        include: {
          produto: {
            select: {
              id: true,
              identificador: true,
              tipoNome: true,
              descricaoNome: true,
              numeroRelogio: true,
            },
          },
        },
      }),
      prisma.produto.update({
        where: { id: data.produtoId },
        data: {
          numeroRelogio: data.relogioNovo,
          needsSync: true,
          version: { increment: 1 },
          deviceId: 'web',
        },
      }),
    ])

    return NextResponse.json(historico, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: err.errors },
        { status: 400 }
      )
    }
    console.error('[POST /historico-relogio]', err)
    return serverError()
  }
}
