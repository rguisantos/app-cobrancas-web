import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, forbidden, serverError } from '@/lib/api-helpers'
import { z } from 'zod'

const createSchema = z.object({
  id:                       z.string().optional(),
  tipo:                     z.string().default('produto'),
  identificador:            z.string(),
  numeroRelogio:            z.string(),
  tipoId:                   z.string(),
  tipoNome:                 z.string(),
  descricaoId:              z.string(),
  descricaoNome:            z.string(),
  tamanhoId:                z.string(),
  tamanhoNome:              z.string(),
  codigoCH:                 z.string().optional().nullable(),
  codigoABLF:               z.string().optional().nullable(),
  conservacao:              z.enum(['Ótima', 'Boa', 'Regular', 'Ruim', 'Péssima']).default('Boa'),
  statusProduto:            z.enum(['Ativo', 'Inativo', 'Manutenção']).default('Ativo'),
  dataFabricacao:           z.string().optional().nullable(),
  dataUltimaManutencao:     z.string().optional().nullable(),
  relatorioUltimaManutencao:z.string().optional().nullable(),
  dataAvaliacao:            z.string().optional().nullable(),
  aprovacao:                z.string().optional().nullable(),
  estabelecimento:          z.string().optional().nullable(),
  observacao:               z.string().optional().nullable(),
  dataCadastro:             z.string().optional().nullable(),
  dataUltimaAlteracao:      z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()
  const { searchParams } = new URL(req.url)
  const statusProduto = searchParams.get('status')
  const busca = searchParams.get('busca')
  const disponiveis = searchParams.get('disponiveis')
  const page  = Number(searchParams.get('page') || 1)
  const limit = Number(searchParams.get('limit') || 20)
  const where: any = { deletedAt: null }
  if (statusProduto) where.statusProduto = statusProduto
  if (busca) {
    where.OR = [
      { identificador: { contains: busca, mode: 'insensitive' } },
      { tipoNome:      { contains: busca, mode: 'insensitive' } },
      { numeroRelogio: { contains: busca } },
    ]
  }
  if (disponiveis === 'true') {
    const locacoesAtivas = await prisma.locacao.findMany({ where: { status: 'Ativa', deletedAt: null }, select: { produtoId: true } })
    const produtosLocados = locacoesAtivas.map(l => l.produtoId)
    where.statusProduto = 'Ativo'
    where.NOT = { id: { in: produtosLocados } }
  }
  const [produtos, total] = await Promise.all([
    prisma.produto.findMany({ where, orderBy: { identificador: 'asc' }, skip: (page-1)*limit, take: limit }),
    prisma.produto.count({ where }),
  ])
  return NextResponse.json({ data: produtos, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  // Somente quem tem todosCadastros pode criar produtos
  if (session.user.tipoPermissao === 'AcessoControlado' &&
      !session.user.permissoesWeb?.todosCadastros) {
    return forbidden('Sem permissão para cadastrar produtos')
  }

  try {
    const body = await req.json()
    const data = createSchema.parse(body)
    const { id, ...rest } = data

    const produto = await prisma.produto.create({
      data: {
        ...(id ? { id } : {}),
        ...rest,
        syncStatus: 'synced',
        needsSync:  false,
        deviceId:   'web',
        version:    1,
      },
    })
    return NextResponse.json(produto, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: err.errors }, { status: 400 })
    }
    console.error('[POST /produtos]', err)
    return serverError()
  }
}
