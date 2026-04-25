// GET /api/relatorios/relogios — Relatório de histórico de relógio/contador
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
    const produtoId = searchParams.get('produtoId') || undefined

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

    // Build reusable SQL fragment
    const produtoIdFragment = produtoId
      ? Prisma.sql`AND "produtoId" = ${produtoId}`
      : Prisma.empty

    const [
      totalAlteracoes,
      mediaFichasRodadas,
      maiorVariacao,
      produtosComMaisAlteracoes,
      alteracoesPorMesRaw,
      topProdutosAlteracoes,
      distribuicaoVariacao,
      historicoRelogio,
    ] = await Promise.all([
      // 1. Total de alterações no período
      prisma.historicoRelogio.count({
        where: {
          dataAlteracao: { gte: inicio, lte: fim },
          ...(produtoId && { produtoId }),
        },
      }),

      // 2. Média de fichas rodadas (from cobrancas)
      prisma.$queryRaw<{ media: number }[]>(Prisma.sql`
        SELECT COALESCE(AVG("fichasRodadas"), 0)::float as media
        FROM cobrancas
        WHERE "deletedAt" IS NULL
          AND "createdAt" >= ${inicio} AND "createdAt" <= ${fim}
      `),

      // 3. Maior variação (max abs diff relogioAtual - relogioAnterior)
      prisma.$queryRaw<{ maior: number }[]>(Prisma.sql`
        SELECT COALESCE(MAX(
          ABS("relogioNovo"::numeric - "relogioAnterior"::numeric)
        ), 0)::float as maior
        FROM historico_relogio
        WHERE "dataAlteracao" >= ${inicio} AND "dataAlteracao" <= ${fim}
        ${produtoIdFragment}
      `),

      // 4. Produtos com mais alterações (count of distinct products)
      prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
        SELECT COUNT(DISTINCT "produtoId")::int as count
        FROM historico_relogio
        WHERE "dataAlteracao" >= ${inicio} AND "dataAlteracao" <= ${fim}
      `),

      // 5. Alterações por mês (últimos 12 meses)
      prisma.$queryRaw<{ mes: Date; count: number }[]>(Prisma.sql`
        SELECT DATE_TRUNC('month', "dataAlteracao") as mes, COUNT(*)::int as count
        FROM historico_relogio
        WHERE "dataAlteracao" >= ${new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1)}
        ${produtoIdFragment}
        GROUP BY mes ORDER BY mes ASC
      `),

      // 6. Top produtos com mais alterações
      prisma.$queryRaw<{ produtoIdentificador: string; count: number }[]>(Prisma.sql`
        SELECT p.identificador as "produtoIdentificador",
          COUNT(*)::int as count
        FROM historico_relogio h
        JOIN produtos p ON h."produtoId" = p.id AND p."deletedAt" IS NULL
        WHERE h."dataAlteracao" >= ${inicio} AND h."dataAlteracao" <= ${fim}
        GROUP BY p.identificador
        ORDER BY count DESC LIMIT 10
      `),

      // 7. Distribuição de variação (0-50, 51-100, 101-200, 200+)
      prisma.$queryRaw<{ faixa: string; count: number }[]>(Prisma.sql`
        SELECT
          CASE WHEN ABS("relogioNovo"::numeric - "relogioAnterior"::numeric) <= 50 THEN '0-50'
               WHEN ABS("relogioNovo"::numeric - "relogioAnterior"::numeric) <= 100 THEN '51-100'
               WHEN ABS("relogioNovo"::numeric - "relogioAnterior"::numeric) <= 200 THEN '101-200'
               ELSE '200+' END as faixa,
          COUNT(*)::int as count
        FROM historico_relogio
        WHERE "dataAlteracao" >= ${inicio} AND "dataAlteracao" <= ${fim}
        ${produtoIdFragment}
        GROUP BY faixa ORDER BY faixa
      `),

      // 8. Histórico detalhado
      prisma.historicoRelogio.findMany({
        where: {
          dataAlteracao: { gte: inicio, lte: fim },
          ...(produtoId && { produtoId }),
        },
        include: {
          produto: { select: { identificador: true, tipoNome: true } },
        },
        orderBy: { dataAlteracao: 'desc' },
        take: 500,
      }),
    ])

    // Process monthly data
    const mesesLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

    const alteracoesPorMes = Array.from({ length: 12 }, (_, i) => {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - (11 - i), 1)
      const mesIndex = data.getMonth()
      const existente = alteracoesPorMesRaw.find(e => {
        const eDate = new Date(e.mes)
        return eDate.getMonth() === mesIndex && eDate.getFullYear() === data.getFullYear()
      })
      return {
        mes: `${mesesLabels[mesIndex]}/${data.getFullYear().toString().slice(-2)}`,
        count: existente?.count ?? 0,
      }
    })

    // Ensure all distribution ranges are present
    const faixasEsperadas = ['0-50', '51-100', '101-200', '200+']
    const distribuicaoVariacaoCompleta = faixasEsperadas.map(faixa => {
      const existente = distribuicaoVariacao.find(d => d.faixa === faixa)
      return { faixa, count: existente?.count ?? 0 }
    })

    const kpis = {
      totalAlteracoes,
      mediaFichasRodadas: Math.round(mediaFichasRodadas[0]?.media ?? 0),
      maiorVariacao: maiorVariacao[0]?.maior ?? 0,
      produtosComMaisAlteracoes: produtosComMaisAlteracoes[0]?.count ?? 0,
    }

    const charts = {
      alteracoesPorMes,
      topProdutosAlteracoes: topProdutosAlteracoes.map(p => ({
        produtoIdentificador: p.produtoIdentificador,
        count: p.count,
      })),
      distribuicaoVariacao: distribuicaoVariacaoCompleta,
    }

    const tabela = historicoRelogio.map(h => ({
      id: h.id,
      produtoIdentificador: h.produto?.identificador || '',
      relogioAnterior: h.relogioAnterior,
      relogioNovo: h.relogioNovo,
      motivo: h.motivo,
      dataAlteracao: h.dataAlteracao,
      usuarioResponsavel: h.usuarioResponsavel,
    }))

    return NextResponse.json({ kpis, charts, tabela })
  } catch (error) {
    console.error('[relatorios/relogios]', error)
    return NextResponse.json({ error: 'Erro ao gerar relatório de relógios' }, { status: 500 })
  }
}
