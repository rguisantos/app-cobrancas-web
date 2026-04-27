// GET /api/relatorios/financeiro — Relatório financeiro por período
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import {
  authenticateReport,
  extractReportParams,
  calcularPeriodo,
  calcularPeriodoAnterior,
  buildRotaFragments,
  fillMonthlyData,
  calcVariacao,
  MESES_LABELS,
} from '@/lib/relatorios-helpers'

export async function GET(request: NextRequest) {
  const authResult = await authenticateReport(request, extractReportParams(request).rotaId)
  if (authResult instanceof NextResponse) return authResult
  const { effectiveRotaId } = authResult

  try {
    const { periodo, dataInicio, dataFim, status } = extractReportParams(request)
    const { inicio, fim } = calcularPeriodo(periodo, dataInicio, dataFim)
    const { inicioAnterior, fimAnterior } = calcularPeriodoAnterior(inicio, fim)

    const rotaFrags = buildRotaFragments(effectiveRotaId)

    const baseWhere = {
      deletedAt: null,
      createdAt: { gte: inicio, lte: fim },
      ...(effectiveRotaId && { cliente: { rotaId: effectiveRotaId } }),
      ...(status && { status }),
    }

    // ── Parallel queries (todas com fragments, sem duplicação) ──
    const [
      receitaTotal,
      receitaBruta,
      totalDescontos,
      cobrancasTotal,
      cobrancasPagas,
      saldoDevedor,
      evolucaoMensal,
      topClientes,
      porStatus,
      comparativoAtual,
      comparativoAnterior,
      cobrancasDetalhadas,
      receitaPorRota,
      receitaPorTipoProduto,
      receitaPorFormaPagamento,
    ] = await Promise.all([
      // 1. Receita total (valorRecebido)
      prisma.cobranca.aggregate({
        where: baseWhere,
        _sum: { valorRecebido: true },
      }),
      // 2. Receita bruta
      prisma.cobranca.aggregate({
        where: baseWhere,
        _sum: { totalBruto: true },
      }),
      // 3. Total descontos
      prisma.cobranca.aggregate({
        where: baseWhere,
        _sum: { descontoPartidasValor: true, descontoDinheiro: true },
      }),
      // 4. Total cobranças
      prisma.cobranca.count({ where: baseWhere }),
      // 5. Cobranças pagas
      prisma.cobranca.count({
        where: {
          deletedAt: null,
          status: 'Pago',
          createdAt: { gte: inicio, lte: fim },
          ...(effectiveRotaId && { cliente: { rotaId: effectiveRotaId } }),
        },
      }),
      // 6. Saldo devedor (latest per locacao — evita dupla contagem)
      prisma.$queryRaw<{ total: number; count: number }[]>`
        SELECT COALESCE(SUM("saldoDevedorGerado"), 0)::float AS total, COUNT(*)::int AS count
        FROM (
          SELECT DISTINCT ON ("locacaoId") "saldoDevedorGerado"
          FROM cobrancas
          WHERE "deletedAt" IS NULL AND status IN ('Parcial','Pendente','Atrasado') AND "saldoDevedorGerado" > 0
          ORDER BY "locacaoId", "updatedAt" DESC, "createdAt" DESC
        ) latest
      `,
      // 7. Evolução mensal (12 meses)
      prisma.$queryRaw<{ mes: Date; total: number; count: number }[]>`
        SELECT DATE_TRUNC('month', "createdAt") as mes,
          COALESCE(SUM("valorRecebido"), 0)::float as total,
          COUNT(*)::int as count
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND "createdAt" >= ${new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1)}
        ${rotaFrags.rotaSubquery}
        GROUP BY mes ORDER BY mes ASC
      `,
      // 8. Top 10 clientes por receita
      prisma.$queryRaw<{ clienteId: string; clienteNome: string; total: number; count: number }[]>`
        SELECT cb."clienteId", cb."clienteNome",
          SUM(cb."valorRecebido")::float as total, COUNT(*)::int as count
        FROM cobrancas cb
        WHERE cb."deletedAt" IS NULL AND cb."createdAt" >= ${inicio} AND cb."createdAt" <= ${fim}
        ${rotaFrags.rotaSubquery}
        GROUP BY cb."clienteId", cb."clienteNome"
        ORDER BY total DESC LIMIT 10
      `,
      // 9. Por status
      prisma.cobranca.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: true,
        _sum: { valorRecebido: true },
      }),
      // 10. Comparativo período atual
      prisma.$queryRaw<{ receita: number; cobrancas: number; ticketMedio: number }[]>`
        SELECT COALESCE(SUM("valorRecebido"),0)::float as receita, COUNT(*)::int as cobrancas,
          CASE WHEN COUNT(*) > 0 THEN (SUM("valorRecebido")/COUNT(*))::float ELSE 0 END as "ticketMedio"
        FROM cobrancas WHERE "deletedAt" IS NULL AND "createdAt" >= ${inicio} AND "createdAt" <= ${fim}
        ${rotaFrags.rotaSubquery}
      `,
      // 11. Comparativo período anterior
      prisma.$queryRaw<{ receita: number; cobrancas: number; ticketMedio: number }[]>`
        SELECT COALESCE(SUM("valorRecebido"),0)::float as receita, COUNT(*)::int as cobrancas,
          CASE WHEN COUNT(*) > 0 THEN (SUM("valorRecebido")/COUNT(*))::float ELSE 0 END as "ticketMedio"
        FROM cobrancas WHERE "deletedAt" IS NULL AND "createdAt" >= ${inicioAnterior} AND "createdAt" <= ${fimAnterior}
        ${rotaFrags.rotaSubquery}
      `,
      // 12. Cobranças detalhadas
      prisma.cobranca.findMany({
        where: baseWhere,
        include: {
          cliente: { select: { nomeExibicao: true, rotaNome: true } },
          locacao: { select: { formaPagamento: true, produto: { select: { tipoNome: true, identificador: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      // 13. Receita por rota
      prisma.$queryRaw<{ rotaId: string; rotaDescricao: string; total: number; count: number }[]>(Prisma.sql`
        SELECT COALESCE(c."rotaId"::text, 'sem-rota') as "rotaId",
          COALESCE(r.descricao, 'Sem Rota') as "rotaDescricao",
          SUM(cb."valorRecebido")::float as total, COUNT(*)::int as count
        FROM cobrancas cb
        LEFT JOIN clientes c ON cb."clienteId" = c.id
        LEFT JOIN rotas r ON c."rotaId" = r.id
        WHERE cb."deletedAt" IS NULL AND cb."createdAt" >= ${inicio} AND cb."createdAt" <= ${fim}
        ${rotaFrags.rotaClienteFilter}
        GROUP BY c."rotaId", r.descricao ORDER BY total DESC LIMIT 10
      `),
      // 14. Receita por tipo de produto
      prisma.$queryRaw<{ tipoNome: string; total: number; count: number }[]>(Prisma.sql`
        SELECT p."tipoNome", SUM(cb."valorRecebido")::float as total, COUNT(*)::int as count
        FROM cobrancas cb
        JOIN locacoes l ON cb."locacaoId" = l.id
        JOIN produtos p ON l."produtoId" = p.id
        LEFT JOIN clientes c ON cb."clienteId" = c.id
        WHERE cb."deletedAt" IS NULL AND cb."createdAt" >= ${inicio} AND cb."createdAt" <= ${fim}
        ${rotaFrags.rotaClienteFilter}
        GROUP BY p."tipoNome" ORDER BY total DESC
      `),
      // 15. Receita por forma de pagamento
      prisma.$queryRaw<{ formaPagamento: string; total: number; count: number }[]>(Prisma.sql`
        SELECT l."formaPagamento", SUM(cb."valorRecebido")::float as total, COUNT(*)::int as count
        FROM cobrancas cb
        JOIN locacoes l ON cb."locacaoId" = l.id
        LEFT JOIN clientes c ON cb."clienteId" = c.id
        WHERE cb."deletedAt" IS NULL AND cb."createdAt" >= ${inicio} AND cb."createdAt" <= ${fim}
        ${rotaFrags.rotaClienteFilter}
        GROUP BY l."formaPagamento" ORDER BY total DESC
      `),
    ])

    // ── Processing ──
    const evolucaoCompleta = fillMonthlyData(evolucaoMensal, 12, (mes, existente) => ({
      mes,
      valor: (existente as { total: number } | undefined)?.total ?? 0,
      count: (existente as { count: number } | undefined)?.count ?? 0,
    }))

    const receitaTotalVal = receitaTotal._sum.valorRecebido ?? 0
    const totalDescVal = (totalDescontos._sum.descontoPartidasValor ?? 0) + (totalDescontos._sum.descontoDinheiro ?? 0)

    const atual = comparativoAtual[0]
    const anterior = comparativoAnterior[0]

    const kpis = {
      receitaTotal: receitaTotalVal,
      receitaBruta: receitaBruta._sum.totalBruto ?? 0,
      totalDescontos: totalDescVal,
      cobrancasTotal,
      cobrancasPagas,
      saldoDevedor: saldoDevedor[0]?.total ?? 0,
      locacoesComSaldo: saldoDevedor[0]?.count ?? 0,
      ticketMedio: cobrancasTotal > 0 ? receitaTotalVal / cobrancasTotal : 0,
      percentualPago: cobrancasTotal > 0 ? (cobrancasPagas / cobrancasTotal) * 100 : 0,
    }

    const charts = {
      evolucaoMensal: evolucaoCompleta,
      receitaPorRota: receitaPorRota.map(r => ({ rotaId: r.rotaId, rotaDescricao: r.rotaDescricao, total: r.total, count: r.count })),
      receitaPorTipoProduto: receitaPorTipoProduto.map(t => ({ tipoNome: t.tipoNome, total: t.total, count: t.count })),
      receitaPorFormaPagamento: receitaPorFormaPagamento.map(f => ({ formaPagamento: f.formaPagamento, total: f.total, count: f.count })),
      topClientes: topClientes.map(c => ({ clienteId: c.clienteId, clienteNome: c.clienteNome, total: c.total, count: c.count })),
      porStatus: porStatus.map(s => ({ status: s.status, count: s._count, valor: s._sum.valorRecebido ?? 0 })),
      comparativo: {
        atual: { receita: atual?.receita ?? 0, cobrancas: atual?.cobrancas ?? 0, ticketMedio: atual?.ticketMedio ?? 0 },
        anterior: { receita: anterior?.receita ?? 0, cobrancas: anterior?.cobrancas ?? 0, ticketMedio: anterior?.ticketMedio ?? 0 },
        variacaoReceita: calcVariacao(atual?.receita ?? 0, anterior?.receita ?? 0),
        variacaoCobrancas: calcVariacao(atual?.cobrancas ?? 0, anterior?.cobrancas ?? 0),
        variacaoTicket: calcVariacao(atual?.ticketMedio ?? 0, anterior?.ticketMedio ?? 0),
      },
    }

    const tabela = cobrancasDetalhadas.map(c => ({
      id: c.id,
      clienteNome: c.cliente?.nomeExibicao || c.clienteNome,
      produtoIdentificador: c.produtoIdentificador,
      produtoTipo: c.locacao?.produto?.tipoNome || '',
      dataInicio: c.dataInicio,
      dataFim: c.dataFim,
      totalBruto: c.totalBruto,
      descontos: (c.descontoPartidasValor || 0) + (c.descontoDinheiro || 0),
      valorRecebido: c.valorRecebido,
      saldoDevedorGerado: c.saldoDevedorGerado,
      status: c.status,
      formaPagamento: c.locacao?.formaPagamento || '',
    }))

    return NextResponse.json({ kpis, charts, tabela })
  } catch (error) {
    console.error('[relatorios/financeiro]', error)
    return NextResponse.json({ error: 'Erro ao gerar relatório financeiro' }, { status: 500 })
  }
}
