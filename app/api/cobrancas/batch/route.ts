// POST /api/cobrancas/batch — Operações em lote para cobranças
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
        const result = await prisma.cobranca.updateMany({
          where: { id: { in: ids }, deletedAt: null },
          data: { deletedAt: new Date() },
        })
        return NextResponse.json({
          success: true,
          action: 'delete',
          affected: result.count,
          message: `${result.count} cobrança${result.count !== 1 ? 's' : ''} excluída${result.count !== 1 ? 's' : ''}`,
        })
      }

      case 'updateStatus': {
        if (!data?.status) {
          return badRequest('status é obrigatório para alterar status')
        }

        const validStatuses = ['Pago', 'Parcial', 'Pendente', 'Atrasado']
        if (!validStatuses.includes(data.status)) {
          return badRequest(`Status inválido. Use: ${validStatuses.join(', ')}`)
        }

        const updateData: any = { status: data.status }
        // Se o status for Pago, registrar data de pagamento
        if (data.status === 'Pago') {
          updateData.dataPagamento = new Date().toISOString()
        }

        const result = await prisma.cobranca.updateMany({
          where: { id: { in: ids }, deletedAt: null },
          data: updateData,
        })
        return NextResponse.json({
          success: true,
          action: 'updateStatus',
          affected: result.count,
          message: `Status alterado para ${result.count} cobrança${result.count !== 1 ? 's' : ''}`,
        })
      }

      default:
        return badRequest(`Ação "${action}" não suportada. Use: delete, updateStatus`)
    }
  } catch (err) {
    console.error('[POST /api/cobrancas/batch]', err)
    return serverError()
  }
}
