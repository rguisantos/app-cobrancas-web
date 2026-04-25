// GET /api/relatorios/recebimentos — Relatório de recebimentos/pagamentos
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const hoje = new Date()
    const periodo = searchParams.get('periodo') || undefined
    const dataInicioStr = searchParams.get('dataInicio')
    const dataFimStr = searchParams.get('dataFim')
    const rotaId = searchParams.get('rotaId') || undefined
    const statusFilter = searchParams.get('status') || undefined

    // Determine date range
    let inicio: Date
    let fim: Date

    if (dataInicioStr && dataFimStr) {
      inicio = new Date(dataInicioStr)
      fim = new Date(dataFimStr)
    } else if (periodo === 'mes') {
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      fim = new Date(hoje)
    } else if (periodo === 'trimestre') {
      inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1)
      fim = new Date(hoje)
    } else if (periodo === 'semestre') {
      inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1)
      fim = new Date(hoje)
    } else if (periodo === 'ano') {
      inicio = new Date(hoje.getFullYear(), 0, 1)
      fim = new Date(hoje)
    } else {
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      fim = new Date(hoje)
    }
    fim.setHours(23, 59, 59, 999)

    // Build status filter for cobrancas — focus on 'Pago' unless status is specified
    const cobrancaStatusFilter = statusFilter || 'Pago'
    const isPagoOnly = cobrancaStatusFilter === 'Pago'

    const cobrancaWhere = {
      deletedAt: null,
      status: cobrancaStatusFilter as string,
      createdAt: { gte: inicio, lte: fim },
      ...(rotaId && { cliente: { rotaId } }),
    }

    // Build reusable SQL fragments
    const rotaSubqueryFragment = rotaId
      ? Prisma.sql`AND "clienteId" IN (SELECT id FROM clientes WHERE "rotaId" = ${rotaId} AND "deletedAt" IS NULL)`
      : Prisma.empty

    const statusFragment = statusFilter
      ? Prisma.sql`AND status = ${statusFilter}`
      : Prisma.empty

    const rotaJoinFragment = rotaId
      ? Prisma.sql`JOIN clientes c ON cb."clienteId" = c.id AND c."rotaId" = ${rotaId} AND c."deletedAt" IS NULL`
      : Prisma.empty

    const [
      totalRecebidoResult,
      recebimentosNoPeriodo,
      totalCobrancasPeriodo,
      receitaPendente,
      recebimentosPorMesRaw,
      recebimentosPorFormaPagamento,
      comparativoRecebidoPendenteRaw,
      ticketMedioPorMesRaw,
      cobrancasPagas,
    ] = await Promise.all([
      // 1. Total recebido and count (only paid)
      prisma.cobranca.aggregate({
        where: {
          deletedAt: null,
          status: 'Pago',
          createdAt: { gte: inicio, lte: fim },
          ...(rotaId && { cliente: { rotaId } }),
        },
        _sum: { valorRecebido: true },
        _count: true,
      }),

      // 2. Recebimentos no período (cobranças pagas)
      prisma.cobranca.count({
        where: {
          deletedAt: null,
          status: 'Pago',
          dataPagamento: { not: null as unknown as string },
          createdAt: { gte: inicio, lte: fim },
          ...(rotaId && { cliente: { rotaId } }),
        },
      }),

      // 3. Total de cobranças no período (for taxa)
      prisma.cobranca.count({
        where: {
          deletedAt: null,
          createdAt: { gte: inicio, lte: fim },
          ...(rotaId && { cliente: { rotaId } }),
          ...(statusFilter && { status: statusFilter }),
        },
      }),

      // 4. Receita pendente
      prisma.$queryRaw<{ total: number }[]>(Prisma.sql`
        SELECT COALESCE(SUM("saldoDevedorGerado"), 0)::float as total
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND status IN ('Parcial', 'Pendente', 'Atrasado') AND "saldoDevedorGerado" > 0
        ${rotaSubqueryFragment}
      `),

      // 5. Recebimentos por mês (últimos 12 meses)
      prisma.$queryRaw<{ mes: Date; total: number; count: number }[]>(Prisma.sql`
        SELECT DATE_TRUNC('month', "createdAt") as mes,
          COALESCE(SUM(CASE WHEN status = 'Pago' THEN "valorRecebido" ELSE 0 END), 0)::float as total,
          COUNT(*)::int as count
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND "createdAt" >= ${new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1)}
        ${rotaSubqueryFragment}
        ${statusFragment}
        GROUP BY mes ORDER BY mes ASC
      `),

      // 6. Recebimentos por forma de pagamento
      prisma.$queryRaw<{ formaPagamento: string; total: number; count: number }[]>(Prisma.sql`
        SELECT l."formaPagamento",
          COALESCE(SUM(cb."valorRecebido"), 0)::float as total,
          COUNT(cb.id)::int as count
        FROM cobrancas cb
        JOIN locacoes l ON cb."locacaoId" = l.id AND l."deletedAt" IS NULL
        ${rotaJoinFragment}
        WHERE cb."deletedAt" IS NULL AND cb.status = 'Pago'
          AND cb."createdAt" >= ${inicio} AND cb."createdAt" <= ${fim}
        GROUP BY l."formaPagamento" ORDER BY total DESC
      `),

      // 7. Comparativo recebido vs pendente (últimos 12 meses)
      prisma.$queryRaw<{ mes: Date; recebido: number; pendente: number }[]>(Prisma.sql`
        SELECT DATE_TRUNC('month', "createdAt") as mes,
          COALESCE(SUM(CASE WHEN status = 'Pago' THEN "valorRecebido" ELSE 0 END), 0)::float as recebido,
          COALESCE(SUM(CASE WHEN status IN ('Parcial', 'Pendente', 'Atrasado') THEN "saldoDevedorGerado" ELSE 0 END), 0)::float as pendente
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND "createdAt" >= ${new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1)}
        ${rotaSubqueryFragment}
        GROUP BY mes ORDER BY mes ASC
      `),

      // 8. Ticket médio por mês (últimos 12 meses)
      prisma.$queryRaw<{ mes: Date; ticketMedio: number }[]>(Prisma.sql`
        SELECT DATE_TRUNC('month', "createdAt") as mes,
          CASE WHEN COUNT(*) > 0
            THEN (COALESCE(SUM(CASE WHEN status = 'Pago' THEN "valorRecebido" ELSE 0 END), 0) / COUNT(*))::float
            ELSE 0 END as "ticketMedio"
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND "createdAt" >= ${new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1)}
        ${rotaSubqueryFragment}
        GROUP BY mes ORDER BY mes ASC
      `),

      // 9. Cobranças pagas detalhadas
      prisma.cobranca.findMany({
        where: cobrancaWhere,
        include: {
          cliente: { select: { nomeExibicao: true, rotaNome: true } },
          locacao: { select: { formaPagamento: true } },
        },
        orderBy: { dataPagamento: 'desc' },
        take: 500,
      }),
    ])

    // Process monthly data
    const mesesLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

    const recebimentosPorMes = Array.from({ length: 12 }, (_, i) => {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - (11 - i), 1)
      const mesIndex = data.getMonth()
      const existente = recebimentosPorMesRaw.find(e => {
        const eDate = new Date(e.mes)
        return eDate.getMonth() === mesIndex && eDate.getFullYear() === data.getFullYear()
      })
      return {
        mes: `${mesesLabels[mesIndex]}/${data.getFullYear().toString().slice(-2)}`,
        total: existente?.total ?? 0,
        count: existente?.count ?? 0,
      }
    })

    const comparativoRecebidoPendente = Array.from({ length: 12 }, (_, i) => {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - (11 - i), 1)
      const mesIndex = data.getMonth()
      const existente = comparativoRecebidoPendenteRaw.find(e => {
        const eDate = new Date(e.mes)
        return eDate.getMonth() === mesIndex && eDate.getFullYear() === data.getFullYear()
      })
      return {
        mes: `${mesesLabels[mesIndex]}/${data.getFullYear().toString().slice(-2)}`,
        recebido: existente?.recebido ?? 0,
        pendente: existente?.pendente ?? 0,
      }
    })

    const ticketMedioPorMes = Array.from({ length: 12 }, (_, i) => {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - (11 - i), 1)
      const mesIndex = data.getMonth()
      const existente = ticketMedioPorMesRaw.find(e => {
        const eDate = new Date(e.mes)
        return eDate.getMonth() === mesIndex && eDate.getFullYear() === data.getFullYear()
      })
      return {
        mes: `${mesesLabels[mesIndex]}/${data.getFullYear().toString().slice(-2)}`,
        ticketMedio: existente?.ticketMedio ?? 0,
      }
    })

    const totalRecebido = totalRecebidoResult._sum.valorRecebido ?? 0
    const recebimentosCount = totalRecebidoResult._count

    const kpis = {
      totalRecebido,
      mediaPorRecebimento: recebimentosCount > 0 ? totalRecebido / recebimentosCount : 0,
      recebimentosNoPeriodo,
      taxaRecebimento: totalCobrancasPeriodo > 0 ? (recebimentosCount / totalCobrancasPeriodo) * 100 : 0,
      receitaPendente: receitaPendente[0]?.total ?? 0,
    }

    const charts = {
      recebimentosPorMes,
      recebimentosPorFormaPagamento: recebimentosPorFormaPagamento.map(f => ({
        formaPagamento: f.formaPagamento,
        total: f.total,
        count: f.count,
      })),
      comparativoRecebidoPendente,
      ticketMedioPorMes,
    }

    const tabela = cobrancasPagas.map(c => ({
      id: c.id,
      clienteNome: c.cliente?.nomeExibicao || c.clienteNome,
      produtoIdentificador: c.produtoIdentificador,
      dataPagamento: c.dataPagamento || '',
      valorRecebido: c.valorRecebido,
      formaPagamento: (c as any).locacao?.formaPagamento || '',
      rotaNome: c.cliente?.rotaNome || '',
    }))

    return NextResponse.json({ kpis, charts, tabela })
  } catch (error) {
    console.error('[relatorios/recebimentos]', error)
    return NextResponse.json({ error: 'Erro ao gerar relatório de recebimentos' }, { status: 500 })
  }
}
