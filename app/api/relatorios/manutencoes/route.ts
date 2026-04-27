// GET /api/relatorios/manutencoes — Relatório de manutenções
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  authenticateReport,
  extractReportParams,
  calcularPeriodo,
  buildTipoManutencaoFragment,
  fillMonthlyData,
} from '@/lib/relatorios-helpers'

export async function GET(req: NextRequest) {
  const authResult = await authenticateReport(req)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { periodo, dataInicio, dataFim, status: tipoFilter } = extractReportParams(req)
    // Override: 'status' param is reused as 'tipo' filter for manutencoes
    const tipoParam = new URL(req.url).searchParams.get('tipo') || tipoFilter || undefined
    const { inicio, fim } = calcularPeriodo(periodo, dataInicio, dataFim)

    const inicioStr = inicio.toISOString().split('T')[0]
    const fimStr = fim.toISOString().split('T')[0]

    const tipoFragment = buildTipoManutencaoFragment(tipoParam)

    const [
      totalManutencoes,
      trocasPano,
      manutencoesGerais,
      produtosEmManutencao,
      tempoMedioManutencao,
      manutencoesPorMesRaw,
      porTipoProduto,
      porTipo,
      manutencoesPorRota,
      manutencoesDetalhadas,
    ] = await Promise.all([
      prisma.manutencao.count({
        where: { deletedAt: null, data: { gte: inicioStr, lte: fimStr }, ...(tipoParam && { tipo: tipoParam }) },
      }),
      prisma.manutencao.count({
        where: { deletedAt: null, tipo: 'trocaPano', data: { gte: inicioStr, lte: fimStr } },
      }),
      prisma.manutencao.count({
        where: { deletedAt: null, tipo: 'manutencao', data: { gte: inicioStr, lte: fimStr } },
      }),
      prisma.produto.count({ where: { deletedAt: null, statusProduto: 'Manutenção' } }),
      prisma.$queryRaw<{ media: number }[]>(Prisma.sql`
        SELECT COALESCE(AVG(
          EXTRACT(DAY FROM m.data::timestamp - p."dataUltimaManutencao"::timestamp)
        ), 0)::float as media
        FROM manutencoes m
        JOIN produtos p ON m."produtoId" = p.id AND p."deletedAt" IS NULL
        WHERE m."deletedAt" IS NULL AND p."dataUltimaManutencao" IS NOT NULL
          AND m.data >= ${inicioStr} AND m.data <= ${fimStr}
        ${tipoFragment}
      `),
      prisma.$queryRaw<{ mes: Date; trocaPano: number; manutencao: number }[]>(Prisma.sql`
        SELECT DATE_TRUNC('month', data::timestamp) as mes,
          COUNT(CASE WHEN tipo = 'trocaPano' THEN 1 END)::int as "trocaPano",
          COUNT(CASE WHEN tipo = 'manutencao' THEN 1 END)::int as manutencao
        FROM manutencoes
        WHERE "deletedAt" IS NULL
          AND data >= ${new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1).toISOString().split('T')[0]}
        GROUP BY mes ORDER BY mes ASC
      `),
      prisma.$queryRaw<{ tipoNome: string; count: number }[]>(Prisma.sql`
        SELECT p."tipoNome", COUNT(m.id)::int as count
        FROM manutencoes m
        JOIN produtos p ON m."produtoId" = p.id AND p."deletedAt" IS NULL
        WHERE m."deletedAt" IS NULL
          AND m.data >= ${inicioStr} AND m.data <= ${fimStr}
        GROUP BY p."tipoNome" ORDER BY count DESC
      `),
      prisma.$queryRaw<{ tipo: string; count: number }[]>(Prisma.sql`
        SELECT tipo, COUNT(*)::int as count
        FROM manutencoes
        WHERE "deletedAt" IS NULL
          AND data >= ${inicioStr} AND data <= ${fimStr}
        GROUP BY tipo ORDER BY count DESC
      `),
      prisma.$queryRaw<{ rotaDescricao: string; count: number }[]>(Prisma.sql`
        SELECT COALESCE(r.descricao, 'Sem Rota') as "rotaDescricao", COUNT(m.id)::int as count
        FROM manutencoes m
        LEFT JOIN clientes c ON m."clienteId" = c.id AND c."deletedAt" IS NULL
        LEFT JOIN rotas r ON c."rotaId" = r.id AND r."deletedAt" IS NULL
        WHERE m."deletedAt" IS NULL
          AND m.data >= ${inicioStr} AND m.data <= ${fimStr}
        GROUP BY r.descricao ORDER BY count DESC
      `),
      prisma.manutencao.findMany({
        where: { deletedAt: null, data: { gte: inicioStr, lte: fimStr }, ...(tipoParam && { tipo: tipoParam }) },
        orderBy: { data: 'desc' },
        take: 500,
      }),
    ])

    const manutencoesPorMes = fillMonthlyData(manutencoesPorMesRaw, 12, (mes, existente) => ({
      mes,
      trocaPano: (existente as { trocaPano: number } | undefined)?.trocaPano ?? 0,
      manutencao: (existente as { manutencao: number } | undefined)?.manutencao ?? 0,
    }))

    const kpis = {
      totalManutencoes,
      trocasPano,
      manutencoesGerais,
      produtosEmManutencao,
      tempoMedioManutencao: Math.round(tempoMedioManutencao[0]?.media ?? 0),
    }

    const charts = {
      manutencoesPorMes,
      porTipoProduto: porTipoProduto.map(t => ({ tipoNome: t.tipoNome, count: t.count })),
      porTipo: porTipo.map(t => ({ tipo: t.tipo, count: t.count })),
      manutencoesPorRota: manutencoesPorRota.map(r => ({ rotaDescricao: r.rotaDescricao, count: r.count })),
    }

    const tabela = manutencoesDetalhadas.map(m => ({
      id: m.id,
      produtoIdentificador: m.produtoIdentificador || '',
      produtoTipo: m.produtoTipo || '',
      clienteNome: m.clienteNome || '',
      tipo: m.tipo,
      descricao: m.descricao || '',
      data: m.data,
      registradoPor: m.registradoPor || '',
    }))

    return NextResponse.json({ kpis, charts, tabela })
  } catch (error) {
    console.error('[relatorios/manutencoes]', error)
    return NextResponse.json({ error: 'Erro ao gerar relatório de manutenções' }, { status: 500 })
  }
}
