// GET /api/relatorios/produtos — Relatório de produtos
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession, unauthorized, forbidden } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  // Somente quem tem permissão de relatórios ou todosCadastros pode acessar
  if (session.user.tipoPermissao === 'AcessoControlado' &&
      !session.user.permissoesWeb?.relatorios &&
      !session.user.permissoesWeb?.todosCadastros) {
    return forbidden('Sem permissão para acessar relatórios')
  }

  try {
    const { searchParams } = new URL(request.url)
    const hoje = new Date()
    const dataInicioStr = searchParams.get('dataInicio')
    const dataFimStr = searchParams.get('dataFim')
    const statusFilter = searchParams.get('status') || undefined

    const inicio = dataInicioStr ? new Date(dataInicioStr) : new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const fim = dataFimStr ? new Date(dataFimStr) : hoje
    fim.setHours(23, 59, 59, 999)

    const produtoWhere = {
      deletedAt: null,
      ...(statusFilter && { statusProduto: statusFilter }),
    }

    // ── Raw queries with conditional status filter ──

    // Distribuição por tipo
    const distribuicaoTipo = statusFilter
      ? await prisma.$queryRaw<{ tipoNome: string; count: number }[]>`
          SELECT "tipoNome", COUNT(*)::int as count
          FROM produtos WHERE "deletedAt" IS NULL AND "statusProduto" = ${statusFilter}
          GROUP BY "tipoNome" ORDER BY count DESC
        `
      : await prisma.$queryRaw<{ tipoNome: string; count: number }[]>`
          SELECT "tipoNome", COUNT(*)::int as count
          FROM produtos WHERE "deletedAt" IS NULL
          GROUP BY "tipoNome" ORDER BY count DESC
        `

    // Distribuição por conservação
    const distribuicaoConservacao = statusFilter
      ? await prisma.$queryRaw<{ conservacao: string; count: number }[]>`
          SELECT conservacao, COUNT(*)::int as count
          FROM produtos WHERE "deletedAt" IS NULL AND "statusProduto" = ${statusFilter}
          GROUP BY conservacao ORDER BY count DESC
        `
      : await prisma.$queryRaw<{ conservacao: string; count: number }[]>`
          SELECT conservacao, COUNT(*)::int as count
          FROM produtos WHERE "deletedAt" IS NULL
          GROUP BY conservacao ORDER BY count DESC
        `

    // ── Parallel queries ──
    const [
      totalProdutos,
      produtosLocados,
      produtosEstoque,
      produtosManutencao,
      distribuicaoStatus,
      topProdutosReceita,
      produtosDetalhados,
    ] = await Promise.all([
      // 1. Total de produtos
      prisma.produto.count({ where: produtoWhere }),
      // 2. Produtos locados (com locação ativa)
      prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(DISTINCT p.id)::int as count
        FROM produtos p
        JOIN locacoes l ON p.id = l."produtoId"
        WHERE p."deletedAt" IS NULL AND l.status = 'Ativa' AND l."deletedAt" IS NULL
      `,
      // 3. Produtos em estoque (ativos sem locação ativa)
      prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int as count
        FROM produtos p
        WHERE p."deletedAt" IS NULL
          AND p."statusProduto" = 'Ativo'
          AND p.id NOT IN (
            SELECT "produtoId" FROM locacoes WHERE status = 'Ativa' AND "deletedAt" IS NULL
          )
      `,
      // 4. Produtos em manutenção
      prisma.produto.count({
        where: { deletedAt: null, statusProduto: 'Manutenção' },
      }),
      // 5. Distribuição por status
      prisma.$queryRaw<{ statusProduto: string; count: number }[]>`
        SELECT "statusProduto", COUNT(*)::int as count
        FROM produtos WHERE "deletedAt" IS NULL
        GROUP BY "statusProduto" ORDER BY count DESC
      `,
      // 6. Top produtos por receita
      prisma.$queryRaw<{
        id: string; identificador: string; tipoNome: string; descricaoNome: string;
        statusProduto: string; conservacao: string; receita: number; cobrancas: number
      }[]>`
        SELECT p.id, p.identificador, p."tipoNome", p."descricaoNome", p."statusProduto", p.conservacao,
          COALESCE(SUM(cb."valorRecebido"), 0)::float as receita, COUNT(*)::int as cobrancas
        FROM produtos p
        LEFT JOIN locacoes l ON p.id = l."produtoId"
        LEFT JOIN cobrancas cb ON l.id = cb."locacaoId" AND cb."deletedAt" IS NULL
        WHERE p."deletedAt" IS NULL
        GROUP BY p.id, p.identificador, p."tipoNome", p."descricaoNome", p."statusProduto", p.conservacao
        ORDER BY receita DESC LIMIT 10
      `,
      // 7. Produtos detalhados
      prisma.produto.findMany({
        where: produtoWhere,
        include: {
          locacoes: {
            where: { status: 'Ativa', deletedAt: null },
            include: { cliente: { select: { nomeExibicao: true } } },
            take: 1,
          },
        },
        orderBy: { identificador: 'asc' },
        take: 500,
      }),
    ])

    const locados = produtosLocados[0]?.count ?? 0
    const estoque = produtosEstoque[0]?.count ?? 0

    const kpis = {
      totalProdutos,
      produtosLocados: locados,
      produtosEstoque: estoque,
      produtosManutencao,
      taxaOcupacao: totalProdutos > 0 ? (locados / totalProdutos) * 100 : 0,
    }

    const charts = {
      distribuicaoTipo: distribuicaoTipo.map(t => ({ tipoNome: t.tipoNome, count: t.count })),
      distribuicaoConservacao: distribuicaoConservacao.map(c => ({ conservacao: c.conservacao, count: c.count })),
      distribuicaoStatus: distribuicaoStatus.map(s => ({ statusProduto: s.statusProduto, count: s.count })),
      topProdutosReceita: topProdutosReceita.map(p => ({
        id: p.id,
        identificador: p.identificador,
        tipoNome: p.tipoNome,
        descricaoNome: p.descricaoNome,
        statusProduto: p.statusProduto,
        conservacao: p.conservacao,
        receita: p.receita,
        cobrancas: p.cobrancas,
      })),
    }

    const tabela = produtosDetalhados.map(p => ({
      id: p.id,
      identificador: p.identificador,
      tipoNome: p.tipoNome,
      descricaoNome: p.descricaoNome,
      tamanhoNome: p.tamanhoNome,
      statusProduto: p.statusProduto,
      conservacao: p.conservacao,
      numeroRelogio: p.numeroRelogio,
      clienteAtual: p.locacoes?.[0]?.cliente?.nomeExibicao || null,
      locacaoAtiva: !!p.locacoes?.length,
    }))

    return NextResponse.json({ kpis, charts, tabela })
  } catch (error) {
    console.error('[relatorios/produtos]', error)
    return NextResponse.json({ error: 'Erro ao gerar relatório de produtos' }, { status: 500 })
  }
}
