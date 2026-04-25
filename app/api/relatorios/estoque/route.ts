// GET /api/relatorios/estoque — Relatório de estoque/inventário
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tipoId = searchParams.get('tipoId') || undefined
    const conservacao = searchParams.get('conservacao') || undefined
    const estabelecimento = searchParams.get('estabelecimento') || undefined

    // Build reusable SQL fragments for conditional filters
    const tipoIdFragment = tipoId
      ? Prisma.sql`AND p."tipoId" = ${tipoId}`
      : Prisma.empty

    const tipoIdFragment2 = tipoId
      ? Prisma.sql`AND "tipoId" = ${tipoId}`
      : Prisma.empty

    const conservacaoFragment = conservacao
      ? Prisma.sql`AND conservacao = ${conservacao}`
      : Prisma.empty

    const estabelecimentoFragment = estabelecimento
      ? Prisma.sql`AND estabelecimento = ${estabelecimento}`
      : Prisma.empty

    const [
      totalEstoqueResult,
      totalLocadosResult,
      totalManutencaoResult,
      estoquePorTipo,
      estoquePorConservacao,
      estoquePorEstabelecimento,
      ocupacaoPorTipo,
      produtosEstoque,
    ] = await Promise.all([
      // 1. Total em estoque (ativos sem locação ativa)
      prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
        SELECT COUNT(*)::int as count
        FROM produtos p
        WHERE p."deletedAt" IS NULL
          AND p."statusProduto" = 'Ativo'
          ${tipoIdFragment}
          ${conservacaoFragment}
          ${estabelecimentoFragment}
          AND p.id NOT IN (
            SELECT "produtoId" FROM locacoes WHERE status = 'Ativa' AND "deletedAt" IS NULL
          )
      `),

      // 2. Total locados
      prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
        SELECT COUNT(DISTINCT p.id)::int as count
        FROM produtos p
        JOIN locacoes l ON p.id = l."produtoId"
        WHERE p."deletedAt" IS NULL AND l.status = 'Ativa' AND l."deletedAt" IS NULL
        ${tipoId ? Prisma.sql`AND p."tipoId" = ${tipoId}` : Prisma.empty}
      `),

      // 3. Total em manutenção
      prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
        SELECT COUNT(*)::int as count
        FROM produtos
        WHERE "deletedAt" IS NULL AND "statusProduto" = 'Manutenção'
        ${tipoIdFragment2}
      `),

      // 4. Estoque por tipo (breakdown: estoque, locado, manutenção)
      prisma.$queryRaw<{ tipoNome: string; estoque: number; locado: number; manutencao: number }[]>(Prisma.sql`
        SELECT p."tipoNome",
          COUNT(DISTINCT CASE WHEN p."statusProduto" = 'Ativo'
            AND p.id NOT IN (SELECT "produtoId" FROM locacoes WHERE status = 'Ativa' AND "deletedAt" IS NULL)
            THEN p.id END)::int as estoque,
          COUNT(DISTINCT CASE WHEN p.id IN (SELECT "produtoId" FROM locacoes WHERE status = 'Ativa' AND "deletedAt" IS NULL)
            THEN p.id END)::int as locado,
          COUNT(DISTINCT CASE WHEN p."statusProduto" = 'Manutenção' THEN p.id END)::int as manutencao
        FROM produtos p
        WHERE p."deletedAt" IS NULL
        ${tipoIdFragment}
        GROUP BY p."tipoNome" ORDER BY estoque DESC
      `),

      // 5. Estoque por conservação (produtos disponíveis — não locados)
      prisma.$queryRaw<{ conservacao: string; count: number }[]>(Prisma.sql`
        SELECT conservacao, COUNT(*)::int as count
        FROM produtos
        WHERE "deletedAt" IS NULL AND "statusProduto" = 'Ativo'
          ${conservacaoFragment}
          ${estabelecimentoFragment}
          AND id NOT IN (
            SELECT "produtoId" FROM locacoes WHERE status = 'Ativa' AND "deletedAt" IS NULL
          )
        GROUP BY conservacao ORDER BY count DESC
      `),

      // 6. Estoque por estabelecimento (produtos disponíveis — não locados)
      prisma.$queryRaw<{ estabelecimento: string; count: number }[]>(Prisma.sql`
        SELECT COALESCE(estabelecimento, 'Sem local') as estabelecimento, COUNT(*)::int as count
        FROM produtos
        WHERE "deletedAt" IS NULL AND "statusProduto" = 'Ativo'
          ${conservacaoFragment}
          ${estabelecimentoFragment}
          AND id NOT IN (
            SELECT "produtoId" FROM locacoes WHERE status = 'Ativa' AND "deletedAt" IS NULL
          )
        GROUP BY estabelecimento ORDER BY count DESC
      `),

      // 7. Ocupação por tipo (total vs locados com percentual)
      prisma.$queryRaw<{ tipoNome: string; total: number; locados: number }[]>(Prisma.sql`
        SELECT p."tipoNome",
          COUNT(DISTINCT p.id)::int as total,
          COUNT(DISTINCT l.id)::int as locados
        FROM produtos p
        LEFT JOIN locacoes l ON p.id = l."produtoId" AND l.status = 'Ativa' AND l."deletedAt" IS NULL
        WHERE p."deletedAt" IS NULL
        ${tipoIdFragment}
        GROUP BY p."tipoNome" ORDER BY total DESC
      `),

      // 8. Produtos em estoque detalhados (não locados)
      prisma.produto.findMany({
        where: {
          deletedAt: null,
          statusProduto: 'Ativo',
          ...(tipoId && { tipoId }),
          ...(conservacao && { conservacao }),
          ...(estabelecimento && { estabelecimento }),
        },
        include: {
          locacoes: {
            where: { status: 'Ativa', deletedAt: null },
            select: { id: true },
            take: 1,
          },
        },
        orderBy: { identificador: 'asc' },
        take: 500,
      }),
    ])

    const totalEstoque = totalEstoqueResult[0]?.count ?? 0
    const totalLocados = totalLocadosResult[0]?.count ?? 0
    const totalManutencao = totalManutencaoResult[0]?.count ?? 0
    const totalGeral = totalEstoque + totalLocados + totalManutencao

    const kpis = {
      totalEstoque,
      totalLocados,
      totalManutencao,
      taxaOcupacao: totalGeral > 0 ? (totalLocados / totalGeral) * 100 : 0,
      produtosDisponiveis: totalEstoque,
    }

    const charts = {
      estoquePorTipo: estoquePorTipo.map(t => ({
        tipoNome: t.tipoNome,
        estoque: t.estoque,
        locado: t.locado,
        manutencao: t.manutencao,
      })),
      estoquePorConservacao: estoquePorConservacao.map(c => ({
        conservacao: c.conservacao,
        count: c.count,
      })),
      estoquePorEstabelecimento: estoquePorEstabelecimento.map(e => ({
        estabelecimento: e.estabelecimento,
        count: e.count,
      })),
      ocupacaoPorTipo: ocupacaoPorTipo.map(o => ({
        tipoNome: o.tipoNome,
        total: o.total,
        locados: o.locados,
        percentual: o.total > 0 ? (o.locados / o.total) * 100 : 0,
      })),
    }

    // Filter to only show products not currently located
    const tabela = produtosEstoque
      .filter(p => !p.locacoes?.length)
      .map(p => ({
        id: p.id,
        identificador: p.identificador,
        tipoNome: p.tipoNome,
        descricaoNome: p.descricaoNome,
        tamanhoNome: p.tamanhoNome,
        conservacao: p.conservacao,
        estabelecimento: p.estabelecimento || '',
        statusProduto: p.statusProduto,
      }))

    return NextResponse.json({ kpis, charts, tabela })
  } catch (error) {
    console.error('[relatorios/estoque]', error)
    return NextResponse.json({ error: 'Erro ao gerar relatório de estoque' }, { status: 500 })
  }
}
