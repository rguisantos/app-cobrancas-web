import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, forbidden, serverError } from '@/lib/api-helpers'
import { z } from 'zod'

const createSchema = z.object({
  id:                   z.string().optional(),
  clienteId:            z.string(),
  clienteNome:          z.string(),
  produtoId:            z.string(),
  produtoIdentificador: z.string(),
  produtoTipo:          z.string(),
  dataLocacao:          z.string(),
  dataFim:              z.string().optional().nullable(),
  observacao:           z.string().optional().nullable(),
  formaPagamento:       z.enum(['Periodo', 'PercentualPagar', 'PercentualReceber']),
  numeroRelogio:        z.string(),
  precoFicha:           z.number(),
  percentualEmpresa:    z.number().min(0).max(100),
  percentualCliente:    z.number().min(0).max(100),
  periodicidade:        z.string().optional().nullable(),
  valorFixo:            z.number().optional().nullable(),
  dataPrimeiraCobranca: z.string().optional().nullable(),
  status:               z.enum(['Ativa', 'Finalizada', 'Cancelada']).default('Ativa'),
  ultimaLeituraRelogio: z.number().optional().nullable(),
  dataUltimaCobranca:   z.string().optional().nullable(),
  trocaPano:            z.boolean().optional(),
  dataUltimaManutencao: z.string().optional().nullable(),
})

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
  const [locacoes, total] = await Promise.all([
    prisma.locacao.findMany({ where, include: { cliente: { select: { nomeExibicao: true } }, produto: { select: { tipoNome: true, identificador: true } } }, orderBy: { dataLocacao: 'desc' }, skip: (page-1)*limit, take: limit }),
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
    const data = createSchema.parse(body)
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
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: err.errors }, { status: 400 })
    }
    console.error('[POST /locacoes]', err)
    return serverError()
  }
}
