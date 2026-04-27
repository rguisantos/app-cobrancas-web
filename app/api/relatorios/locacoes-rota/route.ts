// GET /api/relatorios/locacoes-rota — Relatório de locações por rota
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  authenticateReport,
  extractReportParams,
  calcularPeriodo,
  buildRotaFragments,
} from '@/lib/relatorios-helpers'

export async function GET(req: NextRequest) {
  const authResult = await authenticateReport(req, extractReportParams(req).rotaId)
  if (authResult instanceof NextResponse) return authResult
  const { effectiveRotaId } = authResult

  try {
    const { periodo, dataInicio, dataFim } = extractReportParams(req)
    const { inicio, fim } = calcularPeriodo(periodo, dataInicio, dataFim)

    const rotaFrags = buildRotaFragments(effectiveRotaId)

    const [
      totalRotasAtivas,
      mediaLocacoesPorRota,
      receitaMediaPorRota,
      rotaMaiorReceita,
      locacoesPorRotaRaw,
      receitaPorRota,
      inadimplenciaPorRota,
      distribuicaoFormaPagamentoPorRota,
      resumoPorRotaRaw,
    ] = await Promise.all([
      // 1. Total de rotas ativas
      prisma.rota.count({
        where: { deletedAt: null, status: 'Ativo', ...(effectiveRotaId && { id: effectiveRotaId }) },
      }),
      // 2. Média de locações por rota
      prisma.$queryRaw<{ media: number }[]>(Prisma.sql`
        SELECT CASE WHEN COUNT(DISTINCT r.id) > 0
          THEN (COUNT(l.id)::float / COUNT(DISTINCT r.id))
          ELSE 0 END as media
        FROM rotas r
        LEFT JOIN clientes c ON r.id = c."rotaId" AND c."deletedAt" IS NULL
        LEFT JOIN locacoes l ON c.id = l."clienteId" AND l."deletedAt" IS NULL AND l.status = 'Ativa'
        WHERE r."deletedAt" IS NULL AND r.status = 'Ativo'
        ${rotaFrags.rotaFilter}
      `),
      // 3. Receita média por rota
      prisma.$queryRaw<{ media: number }[]>(Prisma.sql`
        SELECT CASE WHEN COUNT(DISTINCT r.id) > 0
          THEN (COALESCE(SUM(cb."valorRecebido"), 0)::float / COUNT(DISTINCT r.id))
          ELSE 0 END as media
        FROM rotas r
        LEFT JOIN clientes c ON r.id = c."rotaId" AND c."deletedAt" IS NULL
        LEFT JOIN cobrancas cb ON c.id = cb."clienteId" AND cb."deletedAt" IS NULL
          AND cb."createdAt" >= ${inicio} AND cb."createdAt" <= ${fim}
        WHERE r."deletedAt" IS NULL AND r.status = 'Ativo'
        ${rotaFrags.rotaFilter}
      `),
      // 4. Rota com maior receita
      prisma.$queryRaw<{ rotaDescricao: string; total: number }[]>(Prisma.sql`
        SELECT r.descricao as "rotaDescricao", COALESCE(SUM(cb."valorRecebido"), 0)::float as total
        FROM rotas r
        JOIN clientes c ON r.id = c."rotaId" AND c."deletedAt" IS NULL
        JOIN cobrancas cb ON c.id = cb."clienteId" AND cb."deletedAt" IS NULL
          AND cb."createdAt" >= ${inicio} AND cb."createdAt" <= ${fim}
        WHERE r."deletedAt" IS NULL AND r.status = 'Ativo'
        ${rotaFrags.rotaFilter}
        GROUP BY r.descricao ORDER BY total DESC LIMIT 1
      `),
      // 5. Locações por rota
      prisma.$queryRaw<{ rotaDescricao: string; ativas: number; finalizadas: number; canceladas: number }[]>(Prisma.sql`
        SELECT r.descricao as "rotaDescricao",
          COUNT(CASE WHEN l.status = 'Ativa' THEN 1 END)::int as ativas,
          COUNT(CASE WHEN l.status = 'Finalizada' THEN 1 END)::int as finalizadas,
          COUNT(CASE WHEN l.status = 'Cancelada' THEN 1 END)::int as canceladas
        FROM rotas r
        LEFT JOIN clientes c ON r.id = c."rotaId" AND c."deletedAt" IS NULL
        LEFT JOIN locacoes l ON c.id = l."clienteId" AND l."deletedAt" IS NULL
        WHERE r."deletedAt" IS NULL
        ${rotaFrags.rotaFilter}
        GROUP BY r.descricao ORDER BY ativas DESC
      `),
      // 6. Receita por rota
      prisma.$queryRaw<{ rotaDescricao: string; total: number; count: number }[]>(Prisma.sql`
        SELECT r.descricao as "rotaDescricao",
          COALESCE(SUM(cb."valorRecebido"), 0)::float as total,
          COUNT(cb.id)::int as count
        FROM rotas r
        LEFT JOIN clientes c ON r.id = c."rotaId" AND c."deletedAt" IS NULL
        LEFT JOIN cobrancas cb ON c.id = cb."clienteId" AND cb."deletedAt" IS NULL
          AND cb."createdAt" >= ${inicio} AND cb."createdAt" <= ${fim}
        WHERE r."deletedAt" IS NULL
        ${rotaFrags.rotaFilter}
        GROUP BY r.descricao ORDER BY total DESC
      `),
      // 7. Inadimplência por rota
      prisma.$queryRaw<{ rotaDescricao: string; total: number; count: number }[]>(Prisma.sql`
        SELECT r.descricao as "rotaDescricao",
          COALESCE(SUM(cb."saldoDevedorGerado"), 0)::float as total,
          COUNT(cb.id)::int as count
        FROM rotas r
        LEFT JOIN clientes c ON r.id = c."rotaId" AND c."deletedAt" IS NULL
        LEFT JOIN cobrancas cb ON c.id = cb."clienteId" AND cb."deletedAt" IS NULL
          AND cb.status IN ('Parcial', 'Pendente', 'Atrasado') AND cb."saldoDevedorGerado" > 0
        WHERE r."deletedAt" IS NULL
        ${rotaFrags.rotaFilter}
        GROUP BY r.descricao ORDER BY total DESC
      `),
      // 8. Distribuição forma de pagamento por rota (top 5)
      prisma.$queryRaw<{ rotaDescricao: string; formaPagamento: string; count: number }[]>(Prisma.sql`
        SELECT r.descricao as "rotaDescricao",
          l."formaPagamento", COUNT(l.id)::int as count
        FROM rotas r
        JOIN clientes c ON r.id = c."rotaId" AND c."deletedAt" IS NULL
        JOIN locacoes l ON c.id = l."clienteId" AND l."deletedAt" IS NULL
        WHERE r."deletedAt" IS NULL
        ${rotaFrags.rotaFilter}
        AND r.id IN (
          SELECT r2.id FROM rotas r2
          JOIN clientes c2 ON r2.id = c2."rotaId" AND c2."deletedAt" IS NULL
          JOIN locacoes l2 ON c2.id = l2."clienteId" AND l2."deletedAt" IS NULL
          WHERE r2."deletedAt" IS NULL
          GROUP BY r2.id ORDER BY COUNT(l2.id) DESC LIMIT 5
        )
        GROUP BY r.descricao, l."formaPagamento"
        ORDER BY "rotaDescricao", count DESC
      `),
      // 9. Resumo por rota (FIX: remove SUM(DISTINCT) — use subquery instead)
      prisma.$queryRaw<{ rotaNome: string; totalLocacoes: number; locacoesAtivas: number; receitaTotal: number; saldoDevedor: number }[]>(Prisma.sql`
        SELECT r.descricao as "rotaNome",
          COUNT(DISTINCT l.id)::int as "totalLocacoes",
          COUNT(DISTINCT CASE WHEN l.status = 'Ativa' THEN l.id END)::int as "locacoesAtivas",
          (SELECT COALESCE(SUM(cb2."valorRecebido"), 0) FROM cobrancas cb2
           JOIN clientes c2 ON cb2."clienteId" = c2.id AND c2."deletedAt" IS NULL
           WHERE c2."rotaId" = r.id AND cb2."deletedAt" IS NULL
             AND cb2."createdAt" >= ${inicio} AND cb2."createdAt" <= ${fim}
          )::float as "receitaTotal",
          (SELECT COALESCE(SUM(cb3."saldoDevedorGerado"), 0) FROM cobrancas cb3
           JOIN clientes c3 ON cb3."clienteId" = c3.id AND c3."deletedAt" IS NULL
           WHERE c3."rotaId" = r.id AND cb3."deletedAt" IS NULL
             AND cb3.status IN ('Parcial','Pendente','Atrasado')
          )::float as "saldoDevedor"
        FROM rotas r
        LEFT JOIN clientes c ON r.id = c."rotaId" AND c."deletedAt" IS NULL
        LEFT JOIN locacoes l ON c.id = l."clienteId" AND l."deletedAt" IS NULL
        WHERE r."deletedAt" IS NULL
        ${rotaFrags.rotaFilter}
        GROUP BY r.id, r.descricao
        ORDER BY "receitaTotal" DESC
      `),
    ])

    const kpis = {
      totalRotasAtivas,
      mediaLocacoesPorRota: Math.round(mediaLocacoesPorRota[0]?.media ?? 0),
      receitaMediaPorRota: receitaMediaPorRota[0]?.media ?? 0,
      rotaMaiorReceita: rotaMaiorReceita[0]?.rotaDescricao ?? 'N/A',
    }

    const charts = {
      locacoesPorRota: locacoesPorRotaRaw.map(r => ({
        rotaDescricao: r.rotaDescricao, ativas: r.ativas, finalizadas: r.finalizadas, canceladas: r.canceladas,
      })),
      receitaPorRota: receitaPorRota.map(r => ({ rotaDescricao: r.rotaDescricao, total: r.total, count: r.count })),
      inadimplenciaPorRota: inadimplenciaPorRota.map(r => ({ rotaDescricao: r.rotaDescricao, total: r.total, count: r.count })),
      distribuicaoFormaPagamentoPorRota: distribuicaoFormaPagamentoPorRota.map(f => ({
        rotaDescricao: f.rotaDescricao, formaPagamento: f.formaPagamento, count: f.count,
      })),
    }

    const tabela = resumoPorRotaRaw.map(r => ({
      rotaNome: r.rotaNome,
      totalLocacoes: r.totalLocacoes,
      locacoesAtivas: r.locacoesAtivas,
      receitaTotal: r.receitaTotal,
      saldoDevedor: r.saldoDevedor,
      percentualInadimplencia: r.receitaTotal > 0
        ? (r.saldoDevedor / (r.receitaTotal + r.saldoDevedor)) * 100
        : 0,
    }))

    return NextResponse.json({ kpis, charts, tabela })
  } catch (error) {
    console.error('[relatorios/locacoes-rota]', error)
    return NextResponse.json({ error: 'Erro ao gerar relatório de locações por rota' }, { status: 500 })
  }
}
