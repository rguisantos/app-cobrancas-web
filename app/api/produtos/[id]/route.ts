import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, notFound, serverError, forbidden, badRequest } from '@/lib/api-helpers'
import { registrarAuditoria, extractRequestInfo } from '@/lib/auditoria'
import { z } from 'zod'

// Schema de validação para atualização — todos os campos opcionais, mas validados se presentes
const updateSchema = z.object({
  numeroRelogio:            z.string().min(1).optional(),
  tipoId:                   z.string().min(1).optional(),
  tipoNome:                 z.string().min(1).optional(),
  descricaoId:              z.string().min(1).optional(),
  descricaoNome:            z.string().min(1).optional(),
  tamanhoId:                z.string().min(1).optional(),
  tamanhoNome:              z.string().min(1).optional(),
  codigoCH:                 z.string().optional().nullable(),
  codigoABLF:               z.string().optional().nullable(),
  conservacao:              z.enum(['Ótima', 'Boa', 'Regular', 'Ruim', 'Péssima']).optional(),
  statusProduto:            z.enum(['Ativo', 'Inativo', 'Manutenção']).optional(),
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

// ============================================================================
// GET — Buscar produto por ID
// ============================================================================

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const produto = await prisma.produto.findFirst({
    where: { id, deletedAt: null },
    include: {
      locacoes: { where: { status: 'Ativa' }, take: 1 },
      historicoRelogio: { orderBy: { dataAlteracao: 'desc' }, take: 5 },
    },
  })
  if (!produto) return notFound('Produto não encontrado')
  return NextResponse.json(produto)
}

// ============================================================================
// PUT — Atualizar produto
// ============================================================================

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  if (session.user.tipoPermissao === 'AcessoControlado' && !session.user.permissoesWeb?.todosCadastros) {
    return forbidden('Sem permissão para esta operação')
  }

  try {
    // Verificar se o produto existe
    const produto = await prisma.produto.findFirst({ where: { id, deletedAt: null } })
    if (!produto) return notFound('Produto não encontrado')

    const body = await req.json()

    // Rejeitar tentativa de alterar o identificador
    if (body.identificador !== undefined && body.identificador !== produto.identificador) {
      return badRequest('O identificador do produto não pode ser alterado')
    }

    // Validar com Zod
    const data = updateSchema.parse(body)

    // Se tipoId foi alterado, buscar o nome correspondente
    if (data.tipoId && data.tipoId !== produto.tipoId) {
      const tipo = await prisma.tipoProduto.findFirst({ where: { id: data.tipoId, deletedAt: null } })
      if (tipo) data.tipoNome = tipo.nome
    }

    // Se descricaoId foi alterado, buscar o nome correspondente
    if (data.descricaoId && data.descricaoId !== produto.descricaoId) {
      const descricao = await prisma.descricaoProduto.findFirst({ where: { id: data.descricaoId, deletedAt: null } })
      if (descricao) data.descricaoNome = descricao.nome
    }

    // Se tamanhoId foi alterado, buscar o nome correspondente
    if (data.tamanhoId && data.tamanhoId !== produto.tamanhoId) {
      const tamanho = await prisma.tamanhoProduto.findFirst({ where: { id: data.tamanhoId, deletedAt: null } })
      if (tamanho) data.tamanhoNome = tamanho.nome
    }

    const produtoAtualizado = await prisma.produto.update({
      where: { id },
      data: {
        ...data,
        version: { increment: 1 },
        deviceId: 'web',
        needsSync: true,
      },
    })

    registrarAuditoria({
      acao: 'editar_produto',
      entidade: 'produto',
      entidadeId: id,
      detalhes: { identificador: produto.identificador, campos: data },
      ...extractRequestInfo(req),
    }).catch(() => {})

    return NextResponse.json(produtoAtualizado)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: err.errors }, { status: 400 })
    }
    console.error(err)
    return serverError()
  }
}

// ============================================================================
// DELETE — Excluir produto (soft delete)
// ============================================================================

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  // Somente quem tem todosCadastros pode excluir produtos
  if (session.user.tipoPermissao === 'AcessoControlado' && !session.user.permissoesWeb?.todosCadastros) {
    return forbidden('Sem permissão para excluir produtos')
  }

  try {
    // Verificar se o produto existe e não está já excluído
    const produto = await prisma.produto.findFirst({ where: { id, deletedAt: null } })
    if (!produto) return notFound('Produto não encontrado')

    // Verificar se existe locação ativa vinculada
    const locacaoAtiva = await prisma.locacao.findFirst({
      where: { produtoId: id, status: 'Ativa', deletedAt: null },
    })
    if (locacaoAtiva) {
      return NextResponse.json(
        { error: 'Não é possível excluir um produto com locação ativa. Finalize a locação primeiro.' },
        { status: 400 }
      )
    }

    await prisma.produto.update({
      where: { id },
      data: { deletedAt: new Date(), statusProduto: 'Inativo', needsSync: true, version: { increment: 1 } },
    })

    registrarAuditoria({
      acao: 'excluir_produto',
      entidade: 'produto',
      entidadeId: id,
      detalhes: { identificador: produto.identificador, softDelete: true },
      ...extractRequestInfo(_),
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch { return serverError() }
}
