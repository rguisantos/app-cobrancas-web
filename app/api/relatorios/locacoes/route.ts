// GET /api/relatorios/locacoes — Relatório de locações
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  authenticateReport,
  extractReportParams,
  calcularPeriodo,
  buildRotaFragments,
  fillMonthlyData,
} from '@/lib/relatorios-helpers'

export async function GET(req: NextRequest) {
  const authResult = await authenticateReport(req, extractReportParams(req).rotaId)
  if (authResult instanceof NextResponse) return authResult
  const { effectiveRotaId } = authResult

  try {
    const { periodo, dataInicio, dataFim, status: statusFilter } = extractReportParams(req)
    const { inicio, fim } = calcularPeriodo(periodo, dataInicio, dataFim)

    const rotaFrags = buildRotaFragments(effectiveRotaId)
    const statusFragment = statusFilter
      ? Prisma.sql`AND l.status = ${statusFilter}`
      : Prisma.empty

    const locacaoWhere = {
      deletedAt: null,
      ...(statusFilter && { status: statusFilter }),
      ...(effectiveRotaId && { cliente: { rotaId: effectiveRotaId } }),
      createdAt: { gte: inicio, lte: fim },
    }

    const rotaJoinFragment = effectiveRotaId
      ? Prisma.sql`JOIN clientes c ON l."clienteId" = c.id AND c."rotaId" = ${effectiveRotaId}`
      : Prisma.empty

    const [
      totalLocacoesAtivas,
      totalLocacoesFinalizadas,
      totalLocacoesCanceladas,
      duracaoMediaDias,
      receitaTotalLocacoes,
      locacoesPorMesRaw,
      distribuicaoFormaPagamento,
      locacoesPorTipoProduto,
      duracaoMediaPorTipo,
      locacoesDetalhadas,
    ] = await Promise.all([
      prisma.locacao.count({
        where: { deletedAt: null, status: 'Ativa', ...(effectiveRotaId && { cliente: { rotaId: effectiveRotaId } }) },
      }),
      prisma.locacao.count({
        where: { deletedAt: null, status: 'Finalizada', createdAt: { gte: inicio, lte: fim }, ...(effectiveRotaId && { cliente: { rotaId: effectiveRotaId } }) },
      }),
      prisma.locacao.count({
        where: { deletedAt: null, status: 'Cancelada', createdAt: { gte: inicio, lte: fim }, ...(effectiveRotaId && { cliente: { rotaId: effectiveRotaId } }) },
      }),
      prisma.$queryRaw<{ media: number }[]>(Prisma.sql`
        SELECT COALESCE(AVG(
          EXTRACT(DAY FROM COALESCE(l."dataFim"::timestamp, NOW()) - l."dataLocacao"::timestamp)
        ), 0)::float as media
        FROM locacoes l
        ${rotaJoinFragment}
        WHERE l."deletedAt" IS NULL AND l.status IN ('Ativa', 'Finalizada')
        ${statusFragment}
      `),
      prisma.$queryRaw<{ total: number }[]>(Prisma.sql`
        SELECT COALESCE(SUM(cb."valorRecebido"), 0)::float as total
        FROM locacoes l
        JOIN cobrancas cb ON l.id = cb."locacaoId" AND cb."deletedAt" IS NULL
        ${rotaJoinFragment}
        WHERE l."deletedAt" IS NULL
          AND cb."createdAt" >= ${inicio} AND cb."createdAt" <= ${fim}
      `),
      prisma.$queryRaw<{ mes: Date; count: number; receita: number }[]>(Prisma.sql`
        SELECT DATE_TRUNC('month', l."createdAt") as mes,
          COUNT(*)::int as count,
          COALESCE(SUM(cb."valorRecebido"), 0)::float as receita
        FROM locacoes l
        LEFT JOIN cobrancas cb ON l.id = cb."locacaoId" AND cb."deletedAt" IS NULL
        ${rotaJoinFragment}
        WHERE l."deletedAt" IS NULL
          AND l."createdAt" >= ${new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1)}
        GROUP BY mes ORDER BY mes ASC
      `),
      prisma.$queryRaw<{ formaPagamento: string; count: number }[]>(Prisma.sql`
        SELECT l."formaPagamento", COUNT(*)::int as count
        FROM locacoes l
        ${rotaJoinFragment}
        WHERE l."deletedAt" IS NULL
        ${statusFragment}
        GROUP BY l."formaPagamento" ORDER BY count DESC
      `),
      prisma.$queryRaw<{ tipoNome: string; count: number }[]>(Prisma.sql`
        SELECT p."tipoNome", COUNT(*)::int as count
        FROM locacoes l
        JOIN produtos p ON l."produtoId" = p.id
        ${rotaJoinFragment}
        WHERE l."deletedAt" IS NULL
        ${statusFragment}
        GROUP BY p."tipoNome" ORDER BY count DESC
      `),
      prisma.$queryRaw<{ tipoNome: string; duracaoMedia: number }[]>(Prisma.sql`
        SELECT p."tipoNome",
          COALESCE(AVG(
            EXTRACT(DAY FROM COALESCE(l."dataFim"::timestamp, NOW()) - l."dataLocacao"::timestamp)
          ), 0)::float as "duracaoMedia"
        FROM locacoes l
        JOIN produtos p ON l."produtoId" = p.id
        ${rotaJoinFragment}
        WHERE l."deletedAt" IS NULL AND l.status IN ('Ativa', 'Finalizada')
        GROUP BY p."tipoNome" ORDER BY "duracaoMedia" DESC
      `),
      prisma.locacao.findMany({
        where: locacaoWhere,
        include: {
          cliente: { select: { nomeExibicao: true, rotaNome: true } },
          produto: { select: { tipoNome: true, identificador: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    ])

    const locacoesPorMes = fillMonthlyData(locacoesPorMesRaw, 12, (mes, existente) => ({
      mes,
      count: (existente as { count: number } | undefined)?.count ?? 0,
      receita: (existente as { receita: number } | undefined)?.receita ?? 0,
    }))

    const kpis = {
      totalLocacoesAtivas,
      totalLocacoesFinalizadas,
      totalLocacoesCanceladas,
      duracaoMediaDias: Math.round(duracaoMediaDias[0]?.media ?? 0),
      receitaTotalLocacoes: receitaTotalLocacoes[0]?.total ?? 0,
    }

    const charts = {
      locacoesPorMes,
      distribuicaoFormaPagamento: distribuicaoFormaPagamento.map(f => ({ formaPagamento: f.formaPagamento, count: f.count })),
      locacoesPorTipoProduto: locacoesPorTipoProduto.map(t => ({ tipoNome: t.tipoNome, count: t.count })),
      duracaoMediaPorTipo: duracaoMediaPorTipo.map(d => ({ tipoNome: d.tipoNome, duracaoMedia: Math.round(d.duracaoMedia) })),
    }

    const tabela = locacoesDetalhadas.map(l => ({
      id: l.id,
      clienteNome: l.clienteNome || l.cliente?.nomeExibicao || '',
      produtoIdentificador: l.produtoIdentificador || l.produto?.identificador || '',
      produtoTipo: l.produtoTipo || l.produto?.tipoNome || '',
      dataLocacao: l.dataLocacao,
      dataFim: l.dataFim || '',
      formaPagamento: l.formaPagamento,
      percentualEmpresa: l.percentualEmpresa,
      precoFicha: l.precoFicha,
      valorFixo: l.valorFixo,
      status: l.status,
      rotaNome: l.cliente?.rotaNome || '',
    }))

    return NextResponse.json({ kpis, charts, tabela })
  } catch (error) {
    console.error('[relatorios/locacoes]', error)
    return NextResponse.json({ error: 'Erro ao gerar relatório de locações' }, { status: 500 })
  }
}
