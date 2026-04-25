import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, forbidden, notFound, serverError } from '@/lib/api-helpers'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

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

    const dadosAtualizacao: any = {
      updatedAt: new Date(),
    }

    if (body.tipo !== undefined) dadosAtualizacao.tipo = body.tipo
    if (body.descricao !== undefined) dadosAtualizacao.descricao = body.descricao
    if (body.data !== undefined) dadosAtualizacao.data = body.data
    if (body.clienteId !== undefined) dadosAtualizacao.clienteId = body.clienteId
    if (body.clienteNome !== undefined) dadosAtualizacao.clienteNome = body.clienteNome
    if (body.locacaoId !== undefined) dadosAtualizacao.locacaoId = body.locacaoId
    if (body.cobrancaId !== undefined) dadosAtualizacao.cobrancaId = body.cobrancaId

    const manutencaoAtualizada = await prisma.manutencao.update({
      where: { id },
      data: dadosAtualizacao,
    })

    // Se o tipo foi alterado para 'manutencao', atualizar o produto
    if (body.tipo === 'manutencao' && body.tipo !== manutencaoExistente.tipo) {
      await prisma.produto.update({
        where: { id: manutencaoExistente.produtoId },
        data: {
          dataUltimaManutencao: body.data || manutencaoExistente.data,
          statusProduto: 'Manutenção',
        },
      })
    }

    return NextResponse.json(manutencaoAtualizada)
  } catch (err) {
    console.error(err)
    return serverError()
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
    const manutencaoExcluida = await prisma.manutencao.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return serverError()
  }
}
