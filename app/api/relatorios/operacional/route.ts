// GET /api/relatorios/operacional — Relatório operacional
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  authenticateReport,
  extractReportParams,
  calcularPeriodo,
  buildRotaFragments,
  fillMonthlyData,
  mapDiaSemana,
} from '@/lib/relatorios-helpers'

export async function GET(req: NextRequest) {
  const authResult = await authenticateReport(req, extractReportParams(req).rotaId)
  if (authResult instanceof NextResponse) return authResult
  const { effectiveRotaId } = authResult

  try {
    const { periodo, dataInicio, dataFim } = extractReportParams(req)
    const { inicio, fim } = calcularPeriodo(periodo, dataInicio, dataFim)

    // For tabela: last 30 days
    const inicio30 = new Date()
    inicio30.setDate(inicio30.getDate() - 29)
    inicio30.setHours(0, 0, 0, 0)

    const rotaFrags = buildRotaFragments(effectiveRotaId)

    const [
      cobrancasCriadasPeriodo,
      taxaPagamentoPeriodo,
      tempoMedioPagamento,
      produtividadeDiaria,
      cobrancasPorDiaSemanaRaw,
      receitaPorDiaSemanaRaw,
      evolucaoCobrancasCriadasRaw,
      comparativoRecebidoPendenteMensalRaw,
      resumoDiario,
    ] = await Promise.all([
      prisma.cobranca.count({
        where: { deletedAt: null, createdAt: { gte: inicio, lte: fim }, ...(effectiveRotaId && { cliente: { rotaId: effectiveRotaId } }) },
      }),
      prisma.$queryRaw<{ taxa: number }[]>(Prisma.sql`
        SELECT CASE WHEN COUNT(*) > 0
          THEN (COUNT(CASE WHEN status = 'Pago' THEN 1 END)::float / COUNT(*)) * 100
          ELSE 0 END as taxa
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND "createdAt" >= ${inicio} AND "createdAt" <= ${fim}
        ${rotaFrags.rotaSubquery}
      `),
      prisma.$queryRaw<{ media: number }[]>(Prisma.sql`
        SELECT COALESCE(AVG(
          EXTRACT(DAY FROM "dataPagamento"::timestamp - "createdAt")
        ), 0)::float as media
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND status = 'Pago' AND "dataPagamento" IS NOT NULL
          AND "createdAt" >= ${inicio} AND "createdAt" <= ${fim}
        ${rotaFrags.rotaSubquery}
      `),
      prisma.$queryRaw<{ media: number }[]>(Prisma.sql`
        SELECT CASE WHEN COUNT(DISTINCT DATE("createdAt")) > 0
          THEN (COUNT(*)::float / COUNT(DISTINCT DATE("createdAt")))
          ELSE 0 END as media
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND "createdAt" >= ${inicio} AND "createdAt" <= ${fim}
        ${rotaFrags.rotaSubquery}
      `),
      prisma.$queryRaw<{ diaSemana: number; count: number; total: number }[]>(Prisma.sql`
        SELECT EXTRACT(DOW FROM "createdAt")::int as "diaSemana",
          COUNT(*)::int as count,
          COALESCE(SUM("valorRecebido"), 0)::float as total
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND "createdAt" >= ${inicio} AND "createdAt" <= ${fim}
        ${rotaFrags.rotaSubquery}
        GROUP BY "diaSemana" ORDER BY "diaSemana"
      `),
      prisma.$queryRaw<{ diaSemana: number; total: number }[]>(Prisma.sql`
        SELECT EXTRACT(DOW FROM "createdAt")::int as "diaSemana",
          COALESCE(SUM("valorRecebido"), 0)::float as total
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND status = 'Pago'
          AND "createdAt" >= ${inicio} AND "createdAt" <= ${fim}
        ${rotaFrags.rotaSubquery}
        GROUP BY "diaSemana" ORDER BY "diaSemana"
      `),
      prisma.$queryRaw<{ mes: Date; criadas: number; pagas: number }[]>(Prisma.sql`
        SELECT DATE_TRUNC('month', "createdAt") as mes,
          COUNT(*)::int as criadas,
          COUNT(CASE WHEN status = 'Pago' THEN 1 END)::int as pagas
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND "createdAt" >= ${new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1)}
        ${rotaFrags.rotaSubquery}
        GROUP BY mes ORDER BY mes ASC
      `),
      prisma.$queryRaw<{ mes: Date; recebido: number; pendente: number }[]>(Prisma.sql`
        SELECT DATE_TRUNC('month', "createdAt") as mes,
          COALESCE(SUM(CASE WHEN status = 'Pago' THEN "valorRecebido" ELSE 0 END), 0)::float as recebido,
          COALESCE(SUM(CASE WHEN status IN ('Parcial', 'Pendente', 'Atrasado') THEN "saldoDevedorGerado" ELSE 0 END), 0)::float as pendente
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND "createdAt" >= ${new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1)}
        ${rotaFrags.rotaSubquery}
        GROUP BY mes ORDER BY mes ASC
      `),
      prisma.$queryRaw<{ data: Date; cobrancasCriadas: number; valorTotal: number; valorRecebido: number; saldoDevedor: number }[]>(Prisma.sql`
        SELECT DATE("createdAt") as data,
          COUNT(*)::int as "cobrancasCriadas",
          COALESCE(SUM("totalBruto"), 0)::float as "valorTotal",
          COALESCE(SUM("valorRecebido"), 0)::float as "valorRecebido",
          COALESCE(SUM("saldoDevedorGerado"), 0)::float as "saldoDevedor"
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND "createdAt" >= ${inicio30} AND "createdAt" <= ${fim}
        ${rotaFrags.rotaSubquery}
        GROUP BY DATE("createdAt")
        ORDER BY data DESC LIMIT 30
      `),
    ])

    const evolucaoCobrancasCriadas = fillMonthlyData(evolucaoCobrancasCriadasRaw, 12, (mes, existente) => ({
      mes,
      criadas: (existente as { criadas: number } | undefined)?.criadas ?? 0,
      pagas: (existente as { pagas: number } | undefined)?.pagas ?? 0,
    }))

    const comparativoRecebidoPendenteMensal = fillMonthlyData(comparativoRecebidoPendenteMensalRaw, 12, (mes, existente) => ({
      mes,
      recebido: (existente as { recebido: number } | undefined)?.recebido ?? 0,
      pendente: (existente as { pendente: number } | undefined)?.pendente ?? 0,
    }))

    const cobrancasPorDiaSemana = mapDiaSemana(cobrancasPorDiaSemanaRaw, (dow, existente) => ({
      count: existente?.count ?? 0,
      total: existente?.total ?? 0,
    }))

    const receitaPorDiaSemana = mapDiaSemana(receitaPorDiaSemanaRaw, (dow, existente) => ({
      total: existente?.total ?? 0,
    }))

    const kpis = {
      cobrancasCriadasPeriodo,
      taxaPagamentoPeriodo: taxaPagamentoPeriodo[0]?.taxa ?? 0,
      tempoMedioPagamento: Math.round(tempoMedioPagamento[0]?.media ?? 0),
      produtividadeDiaria: Math.round(produtividadeDiaria[0]?.media ?? 0),
    }

    const charts = {
      cobrancasPorDiaSemana,
      receitaPorDiaSemana,
      evolucaoCobrancasCriadas,
      comparativoRecebidoPendenteMensal,
    }

    const tabela = resumoDiario.map(r => ({
      data: r.data.toISOString().split('T')[0],
      cobrancasCriadas: r.cobrancasCriadas,
      valorTotal: r.valorTotal,
      valorRecebido: r.valorRecebido,
      saldoDevedor: r.saldoDevedor,
    }))

    return NextResponse.json({ kpis, charts, tabela })
  } catch (error) {
    console.error('[relatorios/operacional]', error)
    return NextResponse.json({ error: 'Erro ao gerar relatório operacional' }, { status: 500 })
  }
}
