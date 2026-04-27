// GET /api/relatorios/rotas — Relatório de rotas
import { NextRequest, NextResponse } from 'next/server'
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

    const [
      totalRotas,
      totalClientes,
      receitaTotal,
      inadimplenciaTotal,
      comparativoRotas,
      evolucaoMensalPorRotaRaw,
    ] = await Promise.all([
      // 1. Total de rotas
      prisma.rota.count({ where: { deletedAt: null } }),

      // 2. Total de clientes nas rotas
      prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(DISTINCT c.id)::int as count
        FROM clientes c
        JOIN rotas r ON c."rotaId" = r.id
        WHERE c."deletedAt" IS NULL AND r."deletedAt" IS NULL
      `,

      // 3. Receita total no período
      prisma.$queryRaw<{ total: number }[]>`
        SELECT COALESCE(SUM(cb."valorRecebido"), 0)::float as total
        FROM cobrancas cb
        JOIN clientes c ON cb."clienteId" = c.id AND c."deletedAt" IS NULL
        JOIN rotas r ON c."rotaId" = r.id AND r."deletedAt" IS NULL
        WHERE cb."deletedAt" IS NULL
          AND cb."createdAt" >= ${inicio} AND cb."createdAt" <= ${fim}
      `,

      // 4. Inadimplência total
      prisma.$queryRaw<{ total: number }[]>`
        SELECT COALESCE(SUM(cb."saldoDevedorGerado"), 0)::float as total
        FROM cobrancas cb
        JOIN clientes c ON cb."clienteId" = c.id AND c."deletedAt" IS NULL
        JOIN rotas r ON c."rotaId" = r.id AND r."deletedAt" IS NULL
        WHERE cb."deletedAt" IS NULL
          AND cb.status IN ('Parcial', 'Pendente', 'Atrasado') AND cb."saldoDevedorGerado" > 0
      `,

      // 5. Comparativo entre rotas (clientes, locações, receita, inadimplência)
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

      // 6. Evolução mensal por rota (últimos 12 meses)
      prisma.$queryRaw<{ rotaDescricao: string; mes: Date; total: number }[]>`
        SELECT r.descricao as "rotaDescricao",
          DATE_TRUNC('month', cb."createdAt") as mes,
          COALESCE(SUM(cb."valorRecebido"), 0)::float as total
        FROM rotas r
        JOIN clientes c ON r.id = c."rotaId" AND c."deletedAt" IS NULL
        JOIN cobrancas cb ON c.id = cb."clienteId" AND cb."deletedAt" IS NULL
          AND cb."createdAt" >= ${new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1)}
        WHERE r."deletedAt" IS NULL
        GROUP BY r.descricao, mes
        ORDER BY r.descricao, mes ASC
      `,
    ])

    // Process evolução mensal por rota — pivot format with top 5 rotas
    const mesesLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

    // Determine top 5 rotas by total receita
    const rotasOrdenadas = [...comparativoRotas]
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 5)
    const top5Nomes = rotasOrdenadas.map(r => r.rotaDescricao)

    // Build pivot: { mes, rota1: valor, rota2: valor, ... }
    const evolucaoMensualPorRota = Array.from({ length: 12 }, (_, i) => {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - (11 - i), 1)
      const mesIndex = data.getMonth()
      const mesLabel = `${mesesLabels[mesIndex]}/${data.getFullYear().toString().slice(-2)}`

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
        rotaDescricao: r.rotaDescricao,
        clientes: r.clientes,
        locacoes: r.locacoes,
        receita: r.receita,
        inadimplencia: r.inadimplencia,
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
