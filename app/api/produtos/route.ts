import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, forbidden, serverError, badRequest } from '@/lib/api-helpers'
import { registrarAuditoria, extractRequestInfo } from '@/lib/auditoria'
import { z } from 'zod'

// ============================================================================
// SCHEMAS DE VALIDAÇÃO — Compartilhados entre criar e atualizar
// ============================================================================

const conservacaoEnum = z.enum(['Ótima', 'Boa', 'Regular', 'Ruim', 'Péssima'])
const statusProdutoEnum = z.enum(['Ativo', 'Inativo', 'Manutenção'])

const produtoBaseSchema = z.object({
  identificador:            z.string().min(1, 'Identificador é obrigatório'),
  numeroRelogio:            z.string().min(1, 'Número do relógio é obrigatório'),
  tipoId:                   z.string().min(1, 'Tipo é obrigatório'),
  tipoNome:                 z.string().min(1, 'Nome do tipo é obrigatório'),
  descricaoId:              z.string().min(1, 'Descrição é obrigatória'),
  descricaoNome:            z.string().min(1, 'Nome da descrição é obrigatório'),
  tamanhoId:                z.string().min(1, 'Tamanho é obrigatório'),
  tamanhoNome:              z.string().min(1, 'Nome do tamanho é obrigatório'),
  codigoCH:                 z.string().optional().nullable(),
  codigoABLF:               z.string().optional().nullable(),
  conservacao:              conservacaoEnum.default('Boa'),
  statusProduto:            statusProdutoEnum.default('Ativo'),
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

const createSchema = produtoBaseSchema.extend({
  id:   z.string().optional(),
  tipo: z.string().default('produto'),
})

const updateSchema = produtoBaseSchema.partial().extend({
  // Identificador pode ser enviado mas será ignorado no update
  identificador: z.string().optional(),
})

// ============================================================================
// GET — Listar produtos com paginação e filtros
// ============================================================================

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const { searchParams } = new URL(req.url)
  const statusProduto = searchParams.get('status')
  const busca = searchParams.get('busca')
  const disponiveis = searchParams.get('disponiveis')
  const tipoId = searchParams.get('tipoId')
  const conservacao = searchParams.get('conservacao')
  const page  = Number(searchParams.get('page') || 1)
  const limit = Number(searchParams.get('limit') || 20)

  const where: Record<string, unknown> = { deletedAt: null }
  if (statusProduto) where.statusProduto = statusProduto
  if (tipoId) where.tipoId = tipoId
  if (conservacao) where.conservacao = conservacao

  if (busca) {
    where.OR = [
      { identificador: { contains: busca, mode: 'insensitive' } },
      { tipoNome:      { contains: busca, mode: 'insensitive' } },
      { numeroRelogio: { contains: busca } },
    ]
  }

  if (disponiveis === 'true') {
    const locacoesAtivas = await prisma.locacao.findMany({
      where: { status: 'Ativa', deletedAt: null },
      select: { produtoId: true },
    })
    const produtosLocados = locacoesAtivas.map(l => l.produtoId)
    where.statusProduto = 'Ativo'
    where.NOT = { id: { in: produtosLocados } }
  }

  const [produtos, total] = await Promise.all([
    prisma.produto.findMany({
      where,
      orderBy: { identificador: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.produto.count({ where }),
  ])
  return NextResponse.json({ data: produtos, total, page, limit })
}

// ============================================================================
// POST — Criar novo produto
// ============================================================================

export async function POST(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  if (session.user.tipoPermissao === 'AcessoControlado' &&
      !session.user.permissoesWeb?.todosCadastros) {
    return forbidden('Sem permissão para cadastrar produtos')
  }

  try {
    const body = await req.json()
    const data = createSchema.parse(body)

    // Verificar se identificador já existe
    const existente = await prisma.produto.findFirst({
      where: { identificador: data.identificador, deletedAt: null },
    })
    if (existente) {
      return badRequest(`Já existe um produto com o identificador "${data.identificador}"`)
    }

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

    registrarAuditoria({
      acao: 'criar_produto',
      entidade: 'produto',
      entidadeId: produto.id,
      detalhes: { identificador: produto.identificador, tipoNome: produto.tipoNome },
      ...extractRequestInfo(req),
    }).catch(() => {})

    return NextResponse.json(produto, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: err.errors }, { status: 400 })
    }
    console.error('[POST /produtos]', err)
    return serverError()
  }
}
