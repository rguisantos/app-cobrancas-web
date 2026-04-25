// POST /api/produtos/batch — Operações em lote para produtos
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, forbidden, badRequest, serverError } from '@/lib/api-helpers'

export async function POST(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  // Somente quem tem todosCadastros pode executar operações em lote
  if (session.user.tipoPermissao === 'AcessoControlado' &&
      !session.user.permissoesWeb?.todosCadastros) {
    return forbidden('Sem permissão para operações em lote')
  }

  try {
    const body = await req.json()
    const { action, ids, data } = body

    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return badRequest('Ação e lista de IDs são obrigatórios')
    }

    // Limite de 100 itens por operação
    if (ids.length > 100) {
      return badRequest('Máximo de 100 itens por operação')
    }

    switch (action) {
      case 'delete': {
        // Soft delete: set deletedAt
        const result = await prisma.produto.updateMany({
          where: { id: { in: ids }, deletedAt: null },
          data: { deletedAt: new Date(), statusProduto: 'Inativo' },
        })
        return NextResponse.json({
          success: true,
          action: 'delete',
          affected: result.count,
          message: `${result.count} produto${result.count !== 1 ? 's' : ''} excluído${result.count !== 1 ? 's' : ''}`,
        })
      }

      case 'updateStatus': {
        if (!data?.statusProduto) {
          return badRequest('statusProduto é obrigatório para alterar status')
        }

        const validStatuses = ['Ativo', 'Inativo', 'Manutenção']
        if (!validStatuses.includes(data.statusProduto)) {
          return badRequest(`Status inválido. Use: ${validStatuses.join(', ')}`)
        }

        const result = await prisma.produto.updateMany({
          where: { id: { in: ids }, deletedAt: null },
          data: { statusProduto: data.statusProduto },
        })
        return NextResponse.json({
          success: true,
          action: 'updateStatus',
          affected: result.count,
          message: `Status alterado para ${result.count} produto${result.count !== 1 ? 's' : ''}`,
        })
      }

      case 'updateEstabelecimento': {
        if (!data || data.estabelecimento === undefined) {
          return badRequest('estabelecimento é obrigatório para alterar estabelecimento')
        }

        const result = await prisma.produto.updateMany({
          where: { id: { in: ids }, deletedAt: null },
          data: { estabelecimento: data.estabelecimento || null },
        })
        return NextResponse.json({
          success: true,
          action: 'updateEstabelecimento',
          affected: result.count,
          message: `Estabelecimento alterado para ${result.count} produto${result.count !== 1 ? 's' : ''}`,
        })
      }

      default:
        return badRequest(`Ação "${action}" não suportada. Use: delete, updateStatus, updateEstabelecimento`)
    }
  } catch (err) {
    console.error('[POST /api/produtos/batch]', err)
    return serverError()
  }
}
