// GET /api/relatorios/recebimentos — Relatório de recebimentos/pagamentos
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  authenticateReport,
  extractReportParams,
  calcularPeriodo,
  buildRotaFragments,
  buildStatusFragment,
  fillMonthlyData,
} from '@/lib/relatorios-helpers'

export async function GET(req: NextRequest) {
  const authResult = await authenticateReport(req, extractReportParams(req).rotaId)
  if (authResult instanceof NextResponse) return authResult
  const { effectiveRotaId } = authResult

  try {
    const { periodo, dataInicio, dataFim, status } = extractReportParams(req)
    const { inicio, fim } = calcularPeriodo(periodo, dataInicio, dataFim)

    const rotaFrags = buildRotaFragments(effectiveRotaId)
    const statusFragment = buildStatusFragment(status)

    const cobrancaStatusFilter = status || 'Pago'

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
      // 1. Total recebido and count
      prisma.cobranca.aggregate({
        where: {
          deletedAt: null,
          status: 'Pago',
          createdAt: { gte: inicio, lte: fim },
          ...(effectiveRotaId && { cliente: { rotaId: effectiveRotaId } }),
        },
        _sum: { valorRecebido: true },
        _count: true,
      }),

      // 2. Recebimentos no período
      prisma.cobranca.count({
        where: {
          deletedAt: null,
          status: 'Pago',
          dataPagamento: { not: null },
          createdAt: { gte: inicio, lte: fim },
          ...(effectiveRotaId && { cliente: { rotaId: effectiveRotaId } }),
        },
      }),

      // 3. Total de cobranças no período (for taxa)
      prisma.cobranca.count({
        where: {
          deletedAt: null,
          createdAt: { gte: inicio, lte: fim },
          ...(effectiveRotaId && { cliente: { rotaId: effectiveRotaId } }),
          ...(status && { status }),
        },
      }),

      // 4. Receita pendente
      prisma.$queryRaw<{ total: number }[]>(Prisma.sql`
        SELECT COALESCE(SUM("saldoDevedorGerado"), 0)::float as total
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND status IN ('Parcial', 'Pendente', 'Atrasado') AND "saldoDevedorGerado" > 0
        ${rotaFrags.rotaSubquery}
      `),

      // 5. Recebimentos por mês (últimos 12 meses)
      prisma.$queryRaw<{ mes: Date; total: number; count: number }[]>(Prisma.sql`
        SELECT DATE_TRUNC('month', "createdAt") as mes,
          COALESCE(SUM(CASE WHEN status = 'Pago' THEN "valorRecebido" ELSE 0 END), 0)::float as total,
          COUNT(*)::int as count
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND "createdAt" >= ${new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1)}
        ${rotaFrags.rotaSubquery}
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
        LEFT JOIN clientes c ON cb."clienteId" = c.id
        WHERE cb."deletedAt" IS NULL AND cb.status = 'Pago'
          AND cb."createdAt" >= ${inicio} AND cb."createdAt" <= ${fim}
        ${effectiveRotaId ? Prisma.sql`AND c."rotaId" = ${effectiveRotaId}` : Prisma.empty}
        GROUP BY l."formaPagamento" ORDER BY total DESC
      `),

      // 7. Comparativo recebido vs pendente (últimos 12 meses)
      prisma.$queryRaw<{ mes: Date; recebido: number; pendente: number }[]>(Prisma.sql`
        SELECT DATE_TRUNC('month', "createdAt") as mes,
          COALESCE(SUM(CASE WHEN status = 'Pago' THEN "valorRecebido" ELSE 0 END), 0)::float as recebido,
          COALESCE(SUM(CASE WHEN status IN ('Parcial', 'Pendente', 'Atrasado') THEN "saldoDevedorGerado" ELSE 0 END), 0)::float as pendente
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND "createdAt" >= ${new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1)}
        ${rotaFrags.rotaSubquery}
        GROUP BY mes ORDER BY mes ASC
      `),

      // 8. Ticket médio por mês (últimos 12 meses)
      prisma.$queryRaw<{ mes: Date; ticketMedio: number }[]>(Prisma.sql`
        SELECT DATE_TRUNC('month', "createdAt") as mes,
          CASE WHEN COUNT(*) > 0
            THEN (COALESCE(SUM(CASE WHEN status = 'Pago' THEN "valorRecebido" ELSE 0 END), 0) / COUNT(*))::float
            ELSE 0 END as "ticketMedio"
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND "createdAt" >= ${new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1)}
        ${rotaFrags.rotaSubquery}
        GROUP BY mes ORDER BY mes ASC
      `),

      // 9. Cobranças pagas detalhadas
      prisma.cobranca.findMany({
        where: {
          deletedAt: null,
          status: cobrancaStatusFilter,
          createdAt: { gte: inicio, lte: fim },
          ...(effectiveRotaId && { cliente: { rotaId: effectiveRotaId } }),
        },
        include: {
          cliente: { select: { nomeExibicao: true, rotaNome: true } },
          locacao: { select: { formaPagamento: true } },
        },
        orderBy: { dataPagamento: 'desc' },
        take: 500,
      }),
    ])

    // Process monthly data
    const recebimentosPorMes = fillMonthlyData(recebimentosPorMesRaw, 12, (mes, existente) => ({
      mes,
      total: (existente as { total: number } | undefined)?.total ?? 0,
      count: (existente as { count: number } | undefined)?.count ?? 0,
    }))

    const comparativoRecebidoPendente = fillMonthlyData(comparativoRecebidoPendenteRaw, 12, (mes, existente) => ({
      mes,
      recebido: (existente as { recebido: number } | undefined)?.recebido ?? 0,
      pendente: (existente as { pendente: number } | undefined)?.pendente ?? 0,
    }))

    const ticketMedioPorMes = fillMonthlyData(ticketMedioPorMesRaw, 12, (mes, existente) => ({
      mes,
      ticketMedio: (existente as { ticketMedio: number } | undefined)?.ticketMedio ?? 0,
    }))

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
      formaPagamento: c.locacao?.formaPagamento || '',
      rotaNome: c.cliente?.rotaNome || '',
    }))

    return NextResponse.json({ kpis, charts, tabela })
  } catch (error) {
    console.error('[relatorios/recebimentos]', error)
    return NextResponse.json({ error: 'Erro ao gerar relatório de recebimentos' }, { status: 500 })
  }
}
