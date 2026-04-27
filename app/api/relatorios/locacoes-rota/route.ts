// GET /api/relatorios/locacoes-rota — Relatório de locações por rota
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAuthSession, getUserRotaIds, unauthorized } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

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

    // Build reusable SQL fragments
    const rotaFilterFragment = rotaId
      ? Prisma.sql`AND r.id = ${rotaId}`
      : Prisma.empty

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
        where: {
          deletedAt: null,
          status: 'Ativo',
          ...(rotaId && { id: rotaId }),
        },
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
        ${rotaFilterFragment}
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
        ${rotaFilterFragment}
      `),

      // 4. Rota com maior receita
      prisma.$queryRaw<{ rotaDescricao: string; total: number }[]>(Prisma.sql`
        SELECT r.descricao as "rotaDescricao", COALESCE(SUM(cb."valorRecebido"), 0)::float as total
        FROM rotas r
        JOIN clientes c ON r.id = c."rotaId" AND c."deletedAt" IS NULL
        JOIN cobrancas cb ON c.id = cb."clienteId" AND cb."deletedAt" IS NULL
          AND cb."createdAt" >= ${inicio} AND cb."createdAt" <= ${fim}
        WHERE r."deletedAt" IS NULL AND r.status = 'Ativo'
        ${rotaFilterFragment}
        GROUP BY r.descricao ORDER BY total DESC LIMIT 1
      `),

      // 5. Locações por rota — breakdown by status (ativas, finalizadas, canceladas)
      prisma.$queryRaw<{ rotaDescricao: string; ativas: number; finalizadas: number; canceladas: number }[]>(Prisma.sql`
        SELECT r.descricao as "rotaDescricao",
          COUNT(CASE WHEN l.status = 'Ativa' THEN 1 END)::int as ativas,
          COUNT(CASE WHEN l.status = 'Finalizada' THEN 1 END)::int as finalizadas,
          COUNT(CASE WHEN l.status = 'Cancelada' THEN 1 END)::int as canceladas
        FROM rotas r
        LEFT JOIN clientes c ON r.id = c."rotaId" AND c."deletedAt" IS NULL
        LEFT JOIN locacoes l ON c.id = l."clienteId" AND l."deletedAt" IS NULL
        WHERE r."deletedAt" IS NULL
        ${rotaFilterFragment}
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
        ${rotaFilterFragment}
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
        ${rotaFilterFragment}
        GROUP BY r.descricao ORDER BY total DESC
      `),

      // 8. Distribuição forma de pagamento por rota (top 5 rotas)
      prisma.$queryRaw<{ rotaDescricao: string; formaPagamento: string; count: number }[]>(Prisma.sql`
        SELECT r.descricao as "rotaDescricao",
          l."formaPagamento", COUNT(l.id)::int as count
        FROM rotas r
        JOIN clientes c ON r.id = c."rotaId" AND c."deletedAt" IS NULL
        JOIN locacoes l ON c.id = l."clienteId" AND l."deletedAt" IS NULL
        WHERE r."deletedAt" IS NULL
        ${rotaFilterFragment}
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

      // 9. Resumo por rota (for tabela)
      prisma.$queryRaw<{ rotaNome: string; totalLocacoes: number; locacoesAtivas: number; receitaTotal: number; saldoDevedor: number }[]>(Prisma.sql`
        SELECT r.descricao as "rotaNome",
          COUNT(DISTINCT l.id)::int as "totalLocacoes",
          COUNT(DISTINCT CASE WHEN l.status = 'Ativa' THEN l.id END)::int as "locacoesAtivas",
          COALESCE(SUM(DISTINCT cb."valorRecebido"), 0)::float as "receitaTotal",
          COALESCE(SUM(DISTINCT CASE WHEN cb.status IN ('Parcial','Pendente','Atrasado') THEN cb."saldoDevedorGerado" ELSE 0 END), 0)::float as "saldoDevedor"
        FROM rotas r
        LEFT JOIN clientes c ON r.id = c."rotaId" AND c."deletedAt" IS NULL
        LEFT JOIN locacoes l ON c.id = l."clienteId" AND l."deletedAt" IS NULL
        LEFT JOIN cobrancas cb ON c.id = cb."clienteId" AND cb."deletedAt" IS NULL
          AND cb."createdAt" >= ${inicio} AND cb."createdAt" <= ${fim}
        WHERE r."deletedAt" IS NULL
        ${rotaFilterFragment}
        GROUP BY r.descricao
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
        rotaDescricao: r.rotaDescricao,
        ativas: r.ativas,
        finalizadas: r.finalizadas,
        canceladas: r.canceladas,
      })),
      receitaPorRota: receitaPorRota.map(r => ({
        rotaDescricao: r.rotaDescricao,
        total: r.total,
        count: r.count,
      })),
      inadimplenciaPorRota: inadimplenciaPorRota.map(r => ({
        rotaDescricao: r.rotaDescricao,
        total: r.total,
        count: r.count,
      })),
      distribuicaoFormaPagamentoPorRota: distribuicaoFormaPagamentoPorRota.map(f => ({
        rotaDescricao: f.rotaDescricao,
        formaPagamento: f.formaPagamento,
        count: f.count,
      })),
    }

    const tabela = resumoPorRotaRaw.map(r => {
      const receitaTotal = r.receitaTotal
      const saldoDevedor = r.saldoDevedor
      return {
        rotaNome: r.rotaNome,
        totalLocacoes: r.totalLocacoes,
        locacoesAtivas: r.locacoesAtivas,
        receitaTotal,
        saldoDevedor,
        percentualInadimplencia: receitaTotal > 0
          ? (saldoDevedor / (receitaTotal + saldoDevedor)) * 100
          : 0,
      }
    })

    return NextResponse.json({ kpis, charts, tabela })
  } catch (error) {
    console.error('[relatorios/locacoes-rota]', error)
    return NextResponse.json({ error: 'Erro ao gerar relatório de locações por rota' }, { status: 500 })
  }
}
