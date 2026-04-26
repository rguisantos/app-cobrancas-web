import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, getUserRotaIds, unauthorized, forbidden, serverError } from '@/lib/api-helpers'
import { z } from 'zod'

// Schema explícito — sem mass assignment
const createSchema = z.object({
  id:                   z.string().optional(),
  locacaoId:            z.string(),
  clienteId:            z.string(),
  clienteNome:          z.string(),
  produtoId:            z.string().optional(),
  produtoIdentificador: z.string(),
  dataInicio:           z.string(),
  dataFim:              z.string(),
  dataPagamento:        z.string().optional().nullable(),
  relogioAnterior:      z.number(),
  relogioAtual:         z.number(),
  fichasRodadas:        z.number(),
  valorFicha:           z.number(),
  totalBruto:           z.number(),
  descontoPartidasQtd:  z.number().optional().nullable(),
  descontoPartidasValor:z.number().optional().nullable(),
  descontoDinheiro:     z.number().optional().nullable(),
  percentualEmpresa:    z.number(),
  subtotalAposDescontos:z.number(),
  valorPercentual:      z.number(),
  totalClientePaga:     z.number(),
  valorRecebido:        z.number(),
  saldoDevedorGerado:   z.number(),
  status:               z.enum(['Pago', 'Parcial', 'Pendente', 'Atrasado']).default('Pendente'),
  dataVencimento:       z.string().optional().nullable(),
  observacao:           z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()
  const { searchParams } = new URL(req.url)
  const clienteId  = searchParams.get('clienteId')
  const status     = searchParams.get('status')
  const dataInicio = searchParams.get('dataInicio')
  const dataFim    = searchParams.get('dataFim')
  const page  = Number(searchParams.get('page') || 1)
  const limit = Number(searchParams.get('limit') || 20)
  const where: any = { deletedAt: null }
  if (clienteId)  where.clienteId = clienteId
  if (status)     where.status    = status
  if (dataInicio || dataFim) {
    where.dataFim = {}
    if (dataInicio) where.dataFim.gte = dataInicio
    if (dataFim)    where.dataFim.lte = dataFim
  }

  // Filtrar cobranças por rotas permitidas do usuário (via cliente.rotaId)
  const userRotaIds = await getUserRotaIds(session)
  if (userRotaIds !== null) {
    where.cliente = { rotaId: { in: userRotaIds } }
  }

  const [cobrancas, total] = await Promise.all([
    prisma.cobranca.findMany({ where, include: { cliente: { select: { nomeExibicao: true, rotaId: true } } }, orderBy: { createdAt: 'desc' }, skip: (page-1)*limit, take: limit }),
    prisma.cobranca.count({ where }),
  ])
  return NextResponse.json({ data: cobrancas, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  // Verificar permissão: somente quem pode realizar cobranças
  if (session.user.tipoPermissao === 'AcessoControlado' &&
      !session.user.permissoesWeb?.todosCadastros) {
    return forbidden('Sem permissão para registrar cobranças')
  }

  try {
    const body = await req.json()
    const data = createSchema.parse(body)
    const { id, ...rest } = data

    const cobranca = await prisma.cobranca.create({
      data: {
        ...(id ? { id } : {}),
        ...rest,
        syncStatus: 'synced',
        needsSync:  false,
        deviceId:   'web',
        version:    1,
      },
    })
    return NextResponse.json(cobranca, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: err.errors }, { status: 400 })
    }
    console.error('[POST /cobrancas]', err)
    return serverError()
  }
}
