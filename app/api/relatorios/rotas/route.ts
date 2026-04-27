// GET /api/relatorios/rotas — Relatório de rotas
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  authenticateReport,
  extractReportParams,
  calcularPeriodo,
  fillMonthlyData,
  MESES_LABELS,
} from '@/lib/relatorios-helpers'

export async function GET(req: NextRequest) {
  const authResult = await authenticateReport(req, extractReportParams(req).rotaId)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { periodo, dataInicio, dataFim } = extractReportParams(req)
    const { inicio, fim } = calcularPeriodo(periodo, dataInicio, dataFim)

    const [
      totalRotas,
      totalClientes,
      receitaTotal,
      inadimplenciaTotal,
      comparativoRotas,
      evolucaoMensalPorRotaRaw,
    ] = await Promise.all([
      prisma.rota.count({ where: { deletedAt: null } }),
      prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(DISTINCT c.id)::int as count
        FROM clientes c
        JOIN rotas r ON c."rotaId" = r.id
        WHERE c."deletedAt" IS NULL AND r."deletedAt" IS NULL
      `,
      prisma.$queryRaw<{ total: number }[]>`
        SELECT COALESCE(SUM(cb."valorRecebido"), 0)::float as total
        FROM cobrancas cb
        JOIN clientes c ON cb."clienteId" = c.id AND c."deletedAt" IS NULL
        JOIN rotas r ON c."rotaId" = r.id AND r."deletedAt" IS NULL
        WHERE cb."deletedAt" IS NULL
          AND cb."createdAt" >= ${inicio} AND cb."createdAt" <= ${fim}
      `,
      prisma.$queryRaw<{ total: number }[]>`
        SELECT COALESCE(SUM(cb."saldoDevedorGerado"), 0)::float as total
        FROM cobrancas cb
        JOIN clientes c ON cb."clienteId" = c.id AND c."deletedAt" IS NULL
        JOIN rotas r ON c."rotaId" = r.id AND r."deletedAt" IS NULL
        WHERE cb."deletedAt" IS NULL
          AND cb.status IN ('Parcial', 'Pendente', 'Atrasado') AND cb."saldoDevedorGerado" > 0
      `,
      prisma.$queryRaw<{ rotaDescricao: string; clientes: number; locacoes: number; receita: number; inadimplencia: number }[]>`
        SELECT r.descricao as "rotaDescricao",
          COUNT(DISTINCT c.id)::int as clientes,
          COUNT(DISTINCT l.id)::int as locacoes,
          COALESCE(SUM(CASE WHEN cb."deletedAt" IS NULL THEN cb."valorRecebido" ELSE 0 END), 0)::float as receita,
          COALESCE(SUM(CASE WHEN cb."deletedAt" IS NULL AND cb.status IN ('Parcial','Pendente','Atrasado') THEN cb."saldoDevedorGerado" ELSE 0 END), 0)::float as inadimplencia
        FROM rotas r
        LEFT JOIN clientes c ON r.id = c."rotaId" AND c."deletedAt" IS NULL
        LEFT JOIN locacoes l ON c.id = l."clienteId" AND l."deletedAt" IS NULL
        LEFT JOIN cobrancas cb ON c.id = cb."clienteId" AND cb."deletedAt" IS NULL
          AND cb."createdAt" >= ${inicio} AND cb."createdAt" <= ${fim}
        WHERE r."deletedAt" IS NULL
        GROUP BY r.descricao
        ORDER BY receita DESC
      `,
      prisma.$queryRaw<{ rotaDescricao: string; mes: Date; total: number }[]>`
        SELECT r.descricao as "rotaDescricao",
          DATE_TRUNC('month', cb."createdAt") as mes,
          COALESCE(SUM(cb."valorRecebido"), 0)::float as total
        FROM rotas r
        JOIN clientes c ON r.id = c."rotaId" AND c."deletedAt" IS NULL
        JOIN cobrancas cb ON c.id = cb."clienteId" AND cb."deletedAt" IS NULL
          AND cb."createdAt" >= ${new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1)}
        WHERE r."deletedAt" IS NULL
        GROUP BY r.descricao, mes
        ORDER BY r.descricao, mes ASC
      `,
    ])

    // Process evolução mensal por rota — pivot format with top 5 rotas
    const rotasOrdenadas = [...comparativoRotas]
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 5)
    const top5Nomes = rotasOrdenadas.map(r => r.rotaDescricao)

    const evolucaoMensualPorRota = Array.from({ length: 12 }, (_, i) => {
      const hoje = new Date()
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - (11 - i), 1)
      const mesIndex = data.getMonth()
      const mesLabel = `${MESES_LABELS[mesIndex]}/${data.getFullYear().toString().slice(-2)}`

      const entry: Record<string, string | number> = { mes: mesLabel }

      for (const rotaNome of top5Nomes) {
        const existente = evolucaoMensalPorRotaRaw.find(e => {
          const eDate = new Date(e.mes)
          return e.rotaDescricao === rotaNome
            && eDate.getMonth() === mesIndex
            && eDate.getFullYear() === data.getFullYear()
        })
        entry[rotaNome] = existente?.total ?? 0
      }

      return entry
    })

    const kpis = {
      totalRotas,
      totalClientes: totalClientes[0]?.count ?? 0,
      receitaTotal: receitaTotal[0]?.total ?? 0,
      inadimplenciaTotal: inadimplenciaTotal[0]?.total ?? 0,
    }

    const charts = {
      comparativoRotas: comparativoRotas.map(r => ({
        rotaDescricao: r.rotaDescricao, clientes: r.clientes, locacoes: r.locacoes,
        receita: r.receita, inadimplencia: r.inadimplencia,
      })),
      evolucaoMensualPorRota,
    }

    const tabela = comparativoRotas.map(r => ({
      rotaNome: r.rotaDescricao,
      totalClientes: r.clientes,
      totalLocacoes: r.locacoes,
      receitaTotal: r.receita,
      saldoDevedor: r.inadimplencia,
      percentualInadimplencia: r.receita > 0
        ? (r.inadimplencia / (r.receita + r.inadimplencia)) * 100
        : 0,
    }))

    return NextResponse.json({ kpis, charts, tabela })
  } catch (error) {
    console.error('[relatorios/rotas]', error)
    return NextResponse.json({ error: 'Erro ao gerar relatório de rotas' }, { status: 500 })
  }
}
