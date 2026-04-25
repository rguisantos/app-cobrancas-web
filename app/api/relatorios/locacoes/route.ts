// GET /api/relatorios/locacoes — Relatório de locações
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
    const statusFilter = searchParams.get('status') || undefined
    const rotaId = searchParams.get('rotaId') || undefined

    // Determine date range based on periodo or explicit dates
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

    const locacaoWhere = {
      deletedAt: null,
      ...(statusFilter && { status: statusFilter }),
      ...(rotaId && { cliente: { rotaId } }),
      createdAt: { gte: inicio, lte: fim },
    }

    // Build reusable SQL fragments for conditional filters
    const rotaJoinFragment = rotaId
      ? Prisma.sql`JOIN clientes c ON l."clienteId" = c.id AND c."deletedAt" IS NULL AND c."rotaId" = ${rotaId}`
      : Prisma.empty

    const rotaJoinFragmentShort = rotaId
      ? Prisma.sql`JOIN clientes c ON l."clienteId" = c.id AND c."rotaId" = ${rotaId}`
      : Prisma.empty

    const statusFragment = statusFilter
      ? Prisma.sql`AND l.status = ${statusFilter}`
      : Prisma.empty

    // Execute all queries in parallel
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
      // 1. Total locações ativas
      prisma.locacao.count({
        where: {
          deletedAt: null,
          status: 'Ativa',
          ...(rotaId && { cliente: { rotaId } }),
        },
      }),

      // 2. Total locações finalizadas no período
      prisma.locacao.count({
        where: {
          deletedAt: null,
          status: 'Finalizada',
          createdAt: { gte: inicio, lte: fim },
          ...(rotaId && { cliente: { rotaId } }),
        },
      }),

      // 3. Total locações canceladas no período
      prisma.locacao.count({
        where: {
          deletedAt: null,
          status: 'Cancelada',
          createdAt: { gte: inicio, lte: fim },
          ...(rotaId && { cliente: { rotaId } }),
        },
      }),

      // 4. Duração média em dias (locações ativas e finalizadas)
      prisma.$queryRaw<{ media: number }[]>(Prisma.sql`
        SELECT COALESCE(AVG(
          EXTRACT(DAY FROM COALESCE(l."dataFim"::timestamp, NOW()) - l."dataLocacao"::timestamp)
        ), 0)::float as media
        FROM locacoes l
        ${rotaJoinFragment}
        WHERE l."deletedAt" IS NULL AND l.status IN ('Ativa', 'Finalizada')
        ${statusFragment}
      `),

      // 5. Receita total das locações (via cobranças)
      prisma.$queryRaw<{ total: number }[]>(Prisma.sql`
        SELECT COALESCE(SUM(cb."valorRecebido"), 0)::float as total
        FROM locacoes l
        JOIN cobrancas cb ON l.id = cb."locacaoId" AND cb."deletedAt" IS NULL
        ${rotaJoinFragmentShort}
        WHERE l."deletedAt" IS NULL
          AND cb."createdAt" >= ${inicio} AND cb."createdAt" <= ${fim}
      `),

      // 6. Locações por mês (últimos 12 meses) com receita
      prisma.$queryRaw<{ mes: Date; count: number; receita: number }[]>(Prisma.sql`
        SELECT DATE_TRUNC('month', l."createdAt") as mes,
          COUNT(*)::int as count,
          COALESCE(SUM(cb."valorRecebido"), 0)::float as receita
        FROM locacoes l
        LEFT JOIN cobrancas cb ON l.id = cb."locacaoId" AND cb."deletedAt" IS NULL
        ${rotaJoinFragmentShort}
        WHERE l."deletedAt" IS NULL
          AND l."createdAt" >= ${new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1)}
        GROUP BY mes ORDER BY mes ASC
      `),

      // 7. Distribuição por forma de pagamento
      prisma.$queryRaw<{ formaPagamento: string; count: number }[]>(Prisma.sql`
        SELECT l."formaPagamento", COUNT(*)::int as count
        FROM locacoes l
        ${rotaJoinFragment}
        WHERE l."deletedAt" IS NULL
        ${statusFragment}
        GROUP BY l."formaPagamento" ORDER BY count DESC
      `),

      // 8. Locações por tipo de produto
      prisma.$queryRaw<{ tipoNome: string; count: number }[]>(Prisma.sql`
        SELECT p."tipoNome", COUNT(*)::int as count
        FROM locacoes l
        JOIN produtos p ON l."produtoId" = p.id
        ${rotaJoinFragment}
        WHERE l."deletedAt" IS NULL
        ${statusFragment}
        GROUP BY p."tipoNome" ORDER BY count DESC
      `),

      // 9. Duração média por tipo de produto (locações finalizadas)
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

      // 10. Locações detalhadas para tabela
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

    // Process monthly data to fill all 12 months
    const mesesLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

    const locacoesPorMes = Array.from({ length: 12 }, (_, i) => {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - (11 - i), 1)
      const mesIndex = data.getMonth()
      const existente = locacoesPorMesRaw.find(e => {
        const eDate = new Date(e.mes)
        return eDate.getMonth() === mesIndex && eDate.getFullYear() === data.getFullYear()
      })
      return {
        mes: `${mesesLabels[mesIndex]}/${data.getFullYear().toString().slice(-2)}`,
        count: existente?.count ?? 0,
        receita: existente?.receita ?? 0,
      }
    })

    const kpis = {
      totalLocacoesAtivas,
      totalLocacoesFinalizadas,
      totalLocacoesCanceladas,
      duracaoMediaDias: Math.round(duracaoMediaDias[0]?.media ?? 0),
      receitaTotalLocacoes: receitaTotalLocacoes[0]?.total ?? 0,
    }

    const charts = {
      locacoesPorMes,
      distribuicaoFormaPagamento: distribuicaoFormaPagamento.map(f => ({
        formaPagamento: f.formaPagamento,
        count: f.count,
      })),
      locacoesPorTipoProduto: locacoesPorTipoProduto.map(t => ({
        tipoNome: t.tipoNome,
        count: t.count,
      })),
      duracaoMediaPorTipo: duracaoMediaPorTipo.map(d => ({
        tipoNome: d.tipoNome,
        duracaoMedia: Math.round(d.duracaoMedia),
      })),
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
