import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, forbidden, serverError, badRequest, validateBody, ApiError } from '@/lib/api-helpers'
import { manutencaoCreateSchema } from '@/lib/validations'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const { searchParams } = new URL(req.url)
  const tipo      = searchParams.get('tipo')
  const produtoId = searchParams.get('produtoId')
  const dataInicio = searchParams.get('dataInicio')
  const dataFim    = searchParams.get('dataFim')
  const busca      = searchParams.get('busca')
  const page  = Number(searchParams.get('page') || 1)
  const limit = Number(searchParams.get('limit') || 20)

  const where: any = { deletedAt: null }
  if (tipo) where.tipo = tipo
  if (produtoId) where.produtoId = produtoId
  if (dataInicio || dataFim) {
    where.data = {}
    if (dataInicio) where.data.gte = dataInicio
    if (dataFim)    where.data.lte = dataFim
  }
  if (busca) {
    where.OR = [
      { produtoIdentificador: { contains: busca, mode: 'insensitive' } },
      { clienteNome:          { contains: busca, mode: 'insensitive' } },
      { descricao:            { contains: busca, mode: 'insensitive' } },
    ]
  }

  const [manutencoes, total] = await Promise.all([
    prisma.manutencao.findMany({
      where,
      include: {
        produto: {
          select: {
            id: true,
            identificador: true,
            tipoNome: true,
            statusProduto: true,
          },
        },
      },
      orderBy: { data: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.manutencao.count({ where }),
  ])

  return NextResponse.json({ data: manutencoes, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  if (session.user.tipoPermissao === 'AcessoControlado' &&
      !session.user.permissoesWeb?.todosCadastros) {
    return forbidden('Sem permissão para registrar manutenções')
  }

  try {
    const body = await req.json()
    const data = validateBody(manutencaoCreateSchema, body)

    // Buscar dados do produto se não foram fornecidos
    let produtoIdentificador = data.produtoIdentificador
    let produtoTipo = data.produtoTipo
    let clienteId = data.clienteId
    let clienteNome = data.clienteNome
    let locacaoId = data.locacaoId

    if (!produtoIdentificador || !produtoTipo) {
      const produto = await prisma.produto.findFirst({
        where: { id: data.produtoId, deletedAt: null },
        select: { identificador: true, tipoNome: true },
      })
      if (!produto) return badRequest('Produto não encontrado')
      produtoIdentificador = produtoIdentificador || produto.identificador
      produtoTipo = produtoTipo || produto.tipoNome
    }

    // Se não tem cliente, buscar locação ativa do produto
    if (!clienteId || !clienteNome || !locacaoId) {
      const locacaoAtiva = await prisma.locacao.findFirst({
        where: { produtoId: data.produtoId, status: 'Ativa', deletedAt: null },
        select: { id: true, clienteId: true, clienteNome: true },
      })
      if (locacaoAtiva) {
        clienteId = clienteId || locacaoAtiva.clienteId
        clienteNome = clienteNome || locacaoAtiva.clienteNome
        locacaoId = locacaoId || locacaoAtiva.id
      }
    }

    const manutencao = await prisma.manutencao.create({
      data: {
        produtoId: data.produtoId,
        produtoIdentificador,
        produtoTipo,
        clienteId,
        clienteNome,
        locacaoId,
        cobrancaId: data.cobrancaId,
        tipo: data.tipo,
        descricao: data.descricao,
        data: data.data,
        registradoPor: data.registradoPor || session.user.id,
      },
    })

    // Se tipo for 'manutencao', atualizar o produto
    if (data.tipo === 'manutencao') {
      await prisma.produto.update({
        where: { id: data.produtoId },
        data: {
          dataUltimaManutencao: data.data,
          statusProduto: 'Manutenção',
        },
      })
    }

    // Se tipo for 'trocaPano', atualizar a dataUltimaManutencao do produto
    if (data.tipo === 'trocaPano') {
      await prisma.produto.update({
        where: { id: data.produtoId },
        data: {
          dataUltimaManutencao: data.data,
        },
      })
    }

    return NextResponse.json(manutencao, { status: 201 })
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message, details: err.details }, { status: err.statusCode })
    }
    console.error('[POST /manutencoes]', err)
    return serverError()
  }
}
