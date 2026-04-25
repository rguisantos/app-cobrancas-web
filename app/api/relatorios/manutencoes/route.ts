// GET /api/relatorios/manutencoes — Relatório de manutenções
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
    const tipoFilter = searchParams.get('tipo') || undefined

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

    const inicioStr = inicio.toISOString().split('T')[0]
    const fimStr = fim.toISOString().split('T')[0]

    // Build reusable SQL fragment
    const tipoFragment = tipoFilter
      ? Prisma.sql`AND m.tipo = ${tipoFilter}`
      : Prisma.empty

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
      // 1. Total de manutenções no período
      prisma.manutencao.count({
        where: {
          deletedAt: null,
          data: { gte: inicioStr, lte: fimStr },
          ...(tipoFilter && { tipo: tipoFilter }),
        },
      }),

      // 2. Trocas de pano
      prisma.manutencao.count({
        where: {
          deletedAt: null,
          tipo: 'trocaPano',
          data: { gte: inicioStr, lte: fimStr },
        },
      }),

      // 3. Manutenções gerais
      prisma.manutencao.count({
        where: {
          deletedAt: null,
          tipo: 'manutencao',
          data: { gte: inicioStr, lte: fimStr },
        },
      }),

      // 4. Produtos em manutenção atualmente
      prisma.produto.count({
        where: { deletedAt: null, statusProduto: 'Manutenção' },
      }),

      // 5. Tempo médio de manutenção (dias entre manutenções do mesmo produto)
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

      // 6. Manutenções por mês — breakdown trocaPano vs manutencao (últimos 12 meses)
      prisma.$queryRaw<{ mes: Date; trocaPano: number; manutencao: number }[]>(Prisma.sql`
        SELECT DATE_TRUNC('month', data::timestamp) as mes,
          COUNT(CASE WHEN tipo = 'trocaPano' THEN 1 END)::int as "trocaPano",
          COUNT(CASE WHEN tipo = 'manutencao' THEN 1 END)::int as manutencao
        FROM manutencoes
        WHERE "deletedAt" IS NULL
          AND data >= ${new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1).toISOString().split('T')[0]}
        GROUP BY mes ORDER BY mes ASC
      `),

      // 7. Por tipo de produto
      prisma.$queryRaw<{ tipoNome: string; count: number }[]>(Prisma.sql`
        SELECT p."tipoNome", COUNT(m.id)::int as count
        FROM manutencoes m
        JOIN produtos p ON m."produtoId" = p.id AND p."deletedAt" IS NULL
        WHERE m."deletedAt" IS NULL
          AND m.data >= ${inicioStr} AND m.data <= ${fimStr}
        GROUP BY p."tipoNome" ORDER BY count DESC
      `),

      // 8. Por tipo (trocaPano vs manutencao)
      prisma.$queryRaw<{ tipo: string; count: number }[]>(Prisma.sql`
        SELECT tipo, COUNT(*)::int as count
        FROM manutencoes
        WHERE "deletedAt" IS NULL
          AND data >= ${inicioStr} AND data <= ${fimStr}
        GROUP BY tipo ORDER BY count DESC
      `),

      // 9. Manutenções por rota (via cliente/produto)
      prisma.$queryRaw<{ rotaDescricao: string; count: number }[]>(Prisma.sql`
        SELECT COALESCE(r.descricao, 'Sem Rota') as "rotaDescricao", COUNT(m.id)::int as count
        FROM manutencoes m
        LEFT JOIN clientes c ON m."clienteId" = c.id AND c."deletedAt" IS NULL
        LEFT JOIN rotas r ON c."rotaId" = r.id AND r."deletedAt" IS NULL
        WHERE m."deletedAt" IS NULL
          AND m.data >= ${inicioStr} AND m.data <= ${fimStr}
        GROUP BY r.descricao ORDER BY count DESC
      `),

      // 10. Manutenções detalhadas
      prisma.manutencao.findMany({
        where: {
          deletedAt: null,
          data: { gte: inicioStr, lte: fimStr },
          ...(tipoFilter && { tipo: tipoFilter }),
        },
        orderBy: { data: 'desc' },
        take: 500,
      }),
    ])

    // Process monthly data
    const mesesLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

    const manutencoesPorMes = Array.from({ length: 12 }, (_, i) => {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - (11 - i), 1)
      const mesIndex = data.getMonth()
      const existente = manutencoesPorMesRaw.find(e => {
        const eDate = new Date(e.mes)
        return eDate.getMonth() === mesIndex && eDate.getFullYear() === data.getFullYear()
      })
      return {
        mes: `${mesesLabels[mesIndex]}/${data.getFullYear().toString().slice(-2)}`,
        trocaPano: existente?.trocaPano ?? 0,
        manutencao: existente?.manutencao ?? 0,
      }
    })

    const kpis = {
      totalManutencoes,
      trocasPano,
      manutencoesGerais,
      produtosEmManutencao,
      tempoMedioManutencao: Math.round(tempoMedioManutencao[0]?.media ?? 0),
    }

    const charts = {
      manutencoesPorMes,
      porTipoProduto: porTipoProduto.map(t => ({
        tipoNome: t.tipoNome,
        count: t.count,
      })),
      porTipo: porTipo.map(t => ({
        tipo: t.tipo,
        count: t.count,
      })),
      manutencoesPorRota: manutencoesPorRota.map(r => ({
        rotaDescricao: r.rotaDescricao,
        count: r.count,
      })),
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
