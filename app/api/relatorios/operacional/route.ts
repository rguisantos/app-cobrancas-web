// GET /api/relatorios/operacional — Relatório operacional
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

    // For tabela: last 30 days
    const inicio30 = new Date(hoje)
    inicio30.setDate(inicio30.getDate() - 29)
    inicio30.setHours(0, 0, 0, 0)

    // Build reusable SQL fragment for rotaId filter
    const rotaSubqueryFragment = rotaId
      ? Prisma.sql`AND "clienteId" IN (SELECT id FROM clientes WHERE "rotaId" = ${rotaId} AND "deletedAt" IS NULL)`
      : Prisma.empty

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
      // 1. Cobranças criadas no período
      prisma.cobranca.count({
        where: {
          deletedAt: null,
          createdAt: { gte: inicio, lte: fim },
          ...(rotaId && { cliente: { rotaId } }),
        },
      }),

      // 2. Taxa de pagamento no período (% pagas)
      prisma.$queryRaw<{ taxa: number }[]>(Prisma.sql`
        SELECT CASE WHEN COUNT(*) > 0
          THEN (COUNT(CASE WHEN status = 'Pago' THEN 1 END)::float / COUNT(*)) * 100
          ELSE 0 END as taxa
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND "createdAt" >= ${inicio} AND "createdAt" <= ${fim}
        ${rotaSubqueryFragment}
      `),

      // 3. Tempo médio de pagamento (dias entre criação e pagamento)
      prisma.$queryRaw<{ media: number }[]>(Prisma.sql`
        SELECT COALESCE(AVG(
          EXTRACT(DAY FROM "dataPagamento"::timestamp - "createdAt")
        ), 0)::float as media
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND status = 'Pago' AND "dataPagamento" IS NOT NULL
          AND "createdAt" >= ${inicio} AND "createdAt" <= ${fim}
        ${rotaSubqueryFragment}
      `),

      // 4. Produtividade diária (cobranças criadas por dia)
      prisma.$queryRaw<{ media: number }[]>(Prisma.sql`
        SELECT CASE WHEN COUNT(DISTINCT DATE("createdAt")) > 0
          THEN (COUNT(*)::float / COUNT(DISTINCT DATE("createdAt")))
          ELSE 0 END as media
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND "createdAt" >= ${inicio} AND "createdAt" <= ${fim}
        ${rotaSubqueryFragment}
      `),

      // 5. Cobranças por dia da semana (count + total)
      prisma.$queryRaw<{ diaSemana: number; count: number; total: number }[]>(Prisma.sql`
        SELECT EXTRACT(DOW FROM "createdAt")::int as "diaSemana",
          COUNT(*)::int as count,
          COALESCE(SUM("valorRecebido"), 0)::float as total
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND "createdAt" >= ${inicio} AND "createdAt" <= ${fim}
        ${rotaSubqueryFragment}
        GROUP BY "diaSemana" ORDER BY "diaSemana"
      `),

      // 6. Receita por dia da semana
      prisma.$queryRaw<{ diaSemana: number; total: number }[]>(Prisma.sql`
        SELECT EXTRACT(DOW FROM "createdAt")::int as "diaSemana",
          COALESCE(SUM("valorRecebido"), 0)::float as total
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND status = 'Pago'
          AND "createdAt" >= ${inicio} AND "createdAt" <= ${fim}
        ${rotaSubqueryFragment}
        GROUP BY "diaSemana" ORDER BY "diaSemana"
      `),

      // 7. Evolução cobranças criadas vs pagas (últimos 12 meses)
      prisma.$queryRaw<{ mes: Date; criadas: number; pagas: number }[]>(Prisma.sql`
        SELECT DATE_TRUNC('month', "createdAt") as mes,
          COUNT(*)::int as criadas,
          COUNT(CASE WHEN status = 'Pago' THEN 1 END)::int as pagas
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND "createdAt" >= ${new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1)}
        ${rotaSubqueryFragment}
        GROUP BY mes ORDER BY mes ASC
      `),

      // 8. Comparativo recebido vs pendente mensal (últimos 12 meses)
      prisma.$queryRaw<{ mes: Date; recebido: number; pendente: number }[]>(Prisma.sql`
        SELECT DATE_TRUNC('month', "createdAt") as mes,
          COALESCE(SUM(CASE WHEN status = 'Pago' THEN "valorRecebido" ELSE 0 END), 0)::float as recebido,
          COALESCE(SUM(CASE WHEN status IN ('Parcial', 'Pendente', 'Atrasado') THEN "saldoDevedorGerado" ELSE 0 END), 0)::float as pendente
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND "createdAt" >= ${new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1)}
        ${rotaSubqueryFragment}
        GROUP BY mes ORDER BY mes ASC
      `),

      // 9. Resumo diário (last 30 days)
      prisma.$queryRaw<{ data: Date; cobrancasCriadas: number; valorTotal: number; valorRecebido: number; saldoDevedor: number }[]>(Prisma.sql`
        SELECT DATE("createdAt") as data,
          COUNT(*)::int as "cobrancasCriadas",
          COALESCE(SUM("totalBruto"), 0)::float as "valorTotal",
          COALESCE(SUM("valorRecebido"), 0)::float as "valorRecebido",
          COALESCE(SUM("saldoDevedorGerado"), 0)::float as "saldoDevedor"
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND "createdAt" >= ${inicio30} AND "createdAt" <= ${fim}
        ${rotaSubqueryFragment}
        GROUP BY DATE("createdAt")
        ORDER BY data DESC LIMIT 30
      `),
    ])

    // Process monthly data
    const mesesLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

    // Portuguese day names mapped to DOW (0=Dom, 1=Seg, ..., 6=Sáb)
    const diasSemanaLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

    const evolucaoCobrancasCriadas = Array.from({ length: 12 }, (_, i) => {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - (11 - i), 1)
      const mesIndex = data.getMonth()
      const existente = evolucaoCobrancasCriadasRaw.find(e => {
        const eDate = new Date(e.mes)
        return eDate.getMonth() === mesIndex && eDate.getFullYear() === data.getFullYear()
      })
      return {
        mes: `${mesesLabels[mesIndex]}/${data.getFullYear().toString().slice(-2)}`,
        criadas: existente?.criadas ?? 0,
        pagas: existente?.pagas ?? 0,
      }
    })

    const comparativoRecebidoPendenteMensal = Array.from({ length: 12 }, (_, i) => {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - (11 - i), 1)
      const mesIndex = data.getMonth()
      const existente = comparativoRecebidoPendenteMensalRaw.find(e => {
        const eDate = new Date(e.mes)
        return eDate.getMonth() === mesIndex && eDate.getFullYear() === data.getFullYear()
      })
      return {
        mes: `${mesesLabels[mesIndex]}/${data.getFullYear().toString().slice(-2)}`,
        recebido: existente?.recebido ?? 0,
        pendente: existente?.pendente ?? 0,
      }
    })

    // Build cobrancasPorDiaSemana with Portuguese day names (Seg-Ter-Qua-Qui-Sex-Sáb-Dom)
    // Reorder to start from Monday (Seg)
    const ordemSegunda = [1, 2, 3, 4, 5, 6, 0] // Seg, Ter, Qua, Qui, Sex, Sáb, Dom
    const cobrancasPorDiaSemana = ordemSegunda.map(dow => {
      const existente = cobrancasPorDiaSemanaRaw.find(d => d.diaSemana === dow)
      return {
        dia: diasSemanaLabels[dow],
        count: existente?.count ?? 0,
        total: existente?.total ?? 0,
      }
    })

    const receitaPorDiaSemana = ordemSegunda.map(dow => {
      const existente = receitaPorDiaSemanaRaw.find(d => d.diaSemana === dow)
      return {
        dia: diasSemanaLabels[dow],
        total: existente?.total ?? 0,
      }
    })

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
