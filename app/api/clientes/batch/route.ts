// POST /api/clientes/batch — Operações em lote para clientes
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, forbidden, badRequest, serverError } from '@/lib/api-helpers'

const batchSchema = {
  delete: {
    action: 'delete' as const,
    ids: [] as string[],
  },
  updateRota: {
    action: 'updateRota' as const,
    ids: [] as string[],
    data: { rotaId: '' } as { rotaId: string },
  },
}

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
        const result = await prisma.cliente.updateMany({
          where: { id: { in: ids }, deletedAt: null },
          data: { deletedAt: new Date(), status: 'Inativo' },
        })
        return NextResponse.json({
          success: true,
          action: 'delete',
          affected: result.count,
          message: `${result.count} cliente${result.count !== 1 ? 's' : ''} excluído${result.count !== 1 ? 's' : ''}`,
        })
      }

      case 'updateRota': {
        if (!data?.rotaId) {
          return badRequest('rotaId é obrigatório para alterar rota')
        }

        // Verificar se a rota existe
        const rota = await prisma.rota.findFirst({
          where: { id: data.rotaId, deletedAt: null },
        })
        if (!rota) {
          return badRequest('Rota não encontrada')
        }

        const result = await prisma.cliente.updateMany({
          where: { id: { in: ids }, deletedAt: null },
          data: { rotaId: data.rotaId, rotaNome: rota.descricao },
        })
        return NextResponse.json({
          success: true,
          action: 'updateRota',
          affected: result.count,
          message: `Rota alterada para ${result.count} cliente${result.count !== 1 ? 's' : ''}`,
        })
      }

      default:
        return badRequest(`Ação "${action}" não suportada. Use: delete, updateRota`)
    }
  } catch (err) {
    console.error('[POST /api/clientes/batch]', err)
    return serverError()
  }
}
