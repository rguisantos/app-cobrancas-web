import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, forbidden, notFound, validateBody, handleApiError } from '@/lib/api-helpers'
import { manutencaoUpdateSchema } from '@/lib/validations'
import { registrarAuditoria, extractRequestInfo } from '@/lib/auditoria'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  try {
    const manutencao = await prisma.manutencao.findFirst({
      where: { id, deletedAt: null },
      include: {
        produto: {
          select: {
            id: true,
            identificador: true,
            tipoNome: true,
            descricaoNome: true,
            tamanhoNome: true,
            statusProduto: true,
            conservacao: true,
            dataUltimaManutencao: true,
          },
        },
      },
    })

    if (!manutencao) return notFound('Manutenção não encontrada')
    return NextResponse.json(manutencao)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  if (!session.user.permissoesWeb?.todosCadastros) {
    return forbidden('Sem permissão para editar manutenções')
  }

  try {
    const manutencaoExistente = await prisma.manutencao.findFirst({
      where: { id, deletedAt: null },
    })

    if (!manutencaoExistente) return notFound('Manutenção não encontrada')

    const body = await req.json()
    const data = validateBody(manutencaoUpdateSchema, body)

    const manutencaoAtualizada = await prisma.manutencao.update({
      where: { id },
      data: {
        ...(data.tipo !== undefined && { tipo: data.tipo }),
        ...(data.descricao !== undefined && { descricao: data.descricao }),
        ...(data.data !== undefined && { data: data.data }),
        ...(data.clienteId !== undefined && { clienteId: data.clienteId }),
        ...(data.clienteNome !== undefined && { clienteNome: data.clienteNome }),
        ...(data.locacaoId !== undefined && { locacaoId: data.locacaoId }),
        ...(data.cobrancaId !== undefined && { cobrancaId: data.cobrancaId }),
        updatedAt: new Date(),
      },
    })

    // Se o tipo foi alterado para 'manutencao', atualizar o produto
    if (data.tipo === 'manutencao' && data.tipo !== manutencaoExistente.tipo) {
      await prisma.produto.update({
        where: { id: manutencaoExistente.produtoId },
        data: {
          dataUltimaManutencao: data.data || manutencaoExistente.data,
          statusProduto: 'Manutenção',
          needsSync: true,
          version: { increment: 1 },
          deviceId: 'web',
        },
      })
    }

    // Calcular campos alterados
    const campos: Record<string, any> = {}
    if (data.tipo !== undefined && data.tipo !== manutencaoExistente.tipo) campos.tipo = { de: manutencaoExistente.tipo, para: data.tipo }
    if (data.descricao !== undefined && data.descricao !== manutencaoExistente.descricao) campos.descricao = true
    if (data.data !== undefined) campos.data = true
    if (data.clienteId !== undefined) campos.clienteId = true
    if (data.clienteNome !== undefined) campos.clienteNome = true

    registrarAuditoria({
      acao: 'editar_manutencao',
      entidade: 'manutencao',
      entidadeId: id,
      entidadeNome: manutencaoExistente?.produtoIdentificador && manutencaoExistente?.clienteNome ? `${manutencaoExistente.clienteNome} - ${manutencaoExistente.produtoIdentificador}` : manutencaoExistente?.produtoIdentificador || manutencaoExistente?.clienteNome || undefined,
      detalhes: { campos },
      ...extractRequestInfo(req),
    }).catch(() => {})

    return NextResponse.json(manutencaoAtualizada)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  if (!session.user.permissoesWeb?.todosCadastros) {
    return forbidden('Sem permissão para excluir manutenções')
  }

  try {
    const manutencaoExistente = await prisma.manutencao.findFirst({
      where: { id, deletedAt: null },
    })

    if (!manutencaoExistente) return notFound('Manutenção não encontrada')

    // Soft delete
    await prisma.manutencao.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    })

    registrarAuditoria({
      acao: 'excluir_manutencao',
      entidade: 'manutencao',
      entidadeId: id,
      entidadeNome: manutencaoExistente.produtoIdentificador && manutencaoExistente.clienteNome ? `${manutencaoExistente.clienteNome} - ${manutencaoExistente.produtoIdentificador}` : manutencaoExistente.produtoIdentificador || undefined,
      detalhes: { softDelete: true, produtoIdentificador: manutencaoExistente.produtoIdentificador, tipo: manutencaoExistente.tipo },
      ...extractRequestInfo(_),
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err)
  }
}
