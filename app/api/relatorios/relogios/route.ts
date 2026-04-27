// GET /api/relatorios/relogios — Relatório de histórico de relógio/contador
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  authenticateReport,
  extractReportParams,
  calcularPeriodo,
  buildProdutoIdFragment,
  fillMonthlyData,
  FAIXAS_VARIACAO_RELOGIO,
} from '@/lib/relatorios-helpers'

export async function GET(req: NextRequest) {
  const authResult = await authenticateReport(req)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { periodo, dataInicio, dataFim } = extractReportParams(req)
    const produtoId = new URL(req.url).searchParams.get('produtoId') || undefined
    const { inicio, fim } = calcularPeriodo(periodo, dataInicio, dataFim)

    const produtoIdFragment = buildProdutoIdFragment(produtoId)

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
      prisma.historicoRelogio.count({
        where: { dataAlteracao: { gte: inicio, lte: fim }, ...(produtoId && { produtoId }) },
      }),
      prisma.$queryRaw<{ media: number }[]>(Prisma.sql`
        SELECT COALESCE(AVG("fichasRodadas"), 0)::float as media
        FROM cobrancas
        WHERE "deletedAt" IS NULL
          AND "createdAt" >= ${inicio} AND "createdAt" <= ${fim}
      `),
      prisma.$queryRaw<{ maior: number }[]>(Prisma.sql`
        SELECT COALESCE(MAX(
          ABS("relogioNovo"::numeric - "relogioAnterior"::numeric)
        ), 0)::float as maior
        FROM historico_relogio
        WHERE "dataAlteracao" >= ${inicio} AND "dataAlteracao" <= ${fim}
        ${produtoIdFragment}
      `),
      prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
        SELECT COUNT(DISTINCT "produtoId")::int as count
        FROM historico_relogio
        WHERE "dataAlteracao" >= ${inicio} AND "dataAlteracao" <= ${fim}
      `),
      prisma.$queryRaw<{ mes: Date; count: number }[]>(Prisma.sql`
        SELECT DATE_TRUNC('month', "dataAlteracao") as mes, COUNT(*)::int as count
        FROM historico_relogio
        WHERE "dataAlteracao" >= ${new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1)}
        ${produtoIdFragment}
        GROUP BY mes ORDER BY mes ASC
      `),
      prisma.$queryRaw<{ produtoIdentificador: string; count: number }[]>(Prisma.sql`
        SELECT p.identificador as "produtoIdentificador",
          COUNT(*)::int as count
        FROM historico_relogio h
        JOIN produtos p ON h."produtoId" = p.id AND p."deletedAt" IS NULL
        WHERE h."dataAlteracao" >= ${inicio} AND h."dataAlteracao" <= ${fim}
        GROUP BY p.identificador
        ORDER BY count DESC LIMIT 10
      `),
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
      prisma.historicoRelogio.findMany({
        where: { dataAlteracao: { gte: inicio, lte: fim }, ...(produtoId && { produtoId }) },
        include: { produto: { select: { identificador: true, tipoNome: true } } },
        orderBy: { dataAlteracao: 'desc' },
        take: 500,
      }),
    ])

    const alteracoesPorMes = fillMonthlyData(alteracoesPorMesRaw, 12, (mes, existente) => ({
      mes,
      count: (existente as { count: number } | undefined)?.count ?? 0,
    }))

    const distribuicaoVariacaoCompleta = FAIXAS_VARIACAO_RELOGIO.map(faixa => {
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
        produtoIdentificador: p.produtoIdentificador, count: p.count,
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
