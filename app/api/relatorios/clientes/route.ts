// GET /api/relatorios/clientes — Relatório de clientes
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hoje = new Date()

    // ── Period parsing ──
    const periodo = searchParams.get('periodo') || 'mes'
    const rotaId = searchParams.get('rotaId') || undefined
    const statusFilter = searchParams.get('status') || undefined

    let inicio: Date, fim: Date
    switch (periodo) {
      case 'trimestre':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1)
        break
      case 'semestre':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1)
        break
      case 'ano':
        inicio = new Date(hoje.getFullYear(), 0, 1)
        break
      default:
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    }
    fim = new Date(hoje)
    fim.setHours(23, 59, 59, 999)

    // Override with explicit dates if provided
    if (searchParams.get('dataInicio')) {
      inicio = new Date(searchParams.get('dataInicio')!)
    }
    if (searchParams.get('dataFim')) {
      fim = new Date(searchParams.get('dataFim')!)
      fim.setHours(23, 59, 59, 999)
    }

    const clienteWhere = {
      deletedAt: null,
      ...(statusFilter && { status: statusFilter }),
      ...(rotaId && { rotaId }),
    }

    // ── Raw queries with conditional rotaId filter ──

    // Clientes por rota
    const clientesPorRota = rotaId
      ? await prisma.$queryRaw<{ rotaId: string; rotaDescricao: string; count: number }[]>`
          SELECT COALESCE(r.id::text, 'sem-rota') as "rotaId",
            COALESCE(r.descricao, 'Sem Rota') as "rotaDescricao",
            COUNT(c.id)::int as count
          FROM clientes c
          LEFT JOIN rotas r ON c."rotaId" = r.id
          WHERE c."deletedAt" IS NULL AND c.status = 'Ativo' AND c."rotaId" = ${rotaId}
          GROUP BY r.id, r.descricao ORDER BY count DESC
        `
      : await prisma.$queryRaw<{ rotaId: string; rotaDescricao: string; count: number }[]>`
          SELECT COALESCE(r.id::text, 'sem-rota') as "rotaId",
            COALESCE(r.descricao, 'Sem Rota') as "rotaDescricao",
            COUNT(c.id)::int as count
          FROM clientes c
          LEFT JOIN rotas r ON c."rotaId" = r.id
          WHERE c."deletedAt" IS NULL AND c.status = 'Ativo'
          GROUP BY r.id, r.descricao ORDER BY count DESC
        `

    // Top clientes por receita
    const topClientesReceita = rotaId
      ? await prisma.$queryRaw<{ clienteId: string; clienteNome: string; total: number; count: number }[]>`
          SELECT cb."clienteId", cb."clienteNome",
            SUM(cb."valorRecebido")::float as total, COUNT(*)::int as count
          FROM cobrancas cb
          JOIN clientes c ON cb."clienteId" = c.id
          WHERE cb."deletedAt" IS NULL AND cb."createdAt" >= ${inicio} AND cb."createdAt" <= ${fim}
            AND c."rotaId" = ${rotaId}
          GROUP BY cb."clienteId", cb."clienteNome"
          ORDER BY total DESC LIMIT 10
        `
      : await prisma.$queryRaw<{ clienteId: string; clienteNome: string; total: number; count: number }[]>`
          SELECT cb."clienteId", cb."clienteNome",
            SUM(cb."valorRecebido")::float as total, COUNT(*)::int as count
          FROM cobrancas cb
          WHERE cb."deletedAt" IS NULL AND cb."createdAt" >= ${inicio} AND cb."createdAt" <= ${fim}
          GROUP BY cb."clienteId", cb."clienteNome"
          ORDER BY total DESC LIMIT 10
        `

    // Receita média por cliente
    const receitaMediaQuery = rotaId
      ? await prisma.$queryRaw<{ media: number }[]>`
          SELECT CASE WHEN COUNT(DISTINCT cb."clienteId") > 0
            THEN (SUM(cb."valorRecebido")/COUNT(DISTINCT cb."clienteId"))::float
            ELSE 0 END as media
          FROM cobrancas cb
          JOIN clientes c ON cb."clienteId" = c.id
          WHERE cb."deletedAt" IS NULL AND cb."createdAt" >= ${inicio} AND cb."createdAt" <= ${fim}
            AND c."rotaId" = ${rotaId}
        `
      : await prisma.$queryRaw<{ media: number }[]>`
          SELECT CASE WHEN COUNT(DISTINCT "clienteId") > 0
            THEN (SUM("valorRecebido")/COUNT(DISTINCT "clienteId"))::float
            ELSE 0 END as media
          FROM cobrancas
          WHERE "deletedAt" IS NULL AND "createdAt" >= ${inicio} AND "createdAt" <= ${fim}
        `

    // ── Parallel queries ──
    const [
      totalClientesAtivos,
      clientesComLocacao,
      clientesComSaldo,
      evolucaoNovosClientes,
      distribuicaoPorEstado,
      clientesDetalhados,
    ] = await Promise.all([
      // 1. Total clientes ativos
      prisma.cliente.count({
        where: { deletedAt: null, status: 'Ativo', ...(rotaId && { rotaId }) },
      }),
      // 2. Clientes com locação ativa
      prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(DISTINCT "clienteId")::int as count
        FROM locacoes WHERE status = 'Ativa' AND "deletedAt" IS NULL
      `,
      // 3. Clientes com saldo devedor
      prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(DISTINCT cb."clienteId")::int as count
        FROM cobrancas cb
        WHERE cb."deletedAt" IS NULL AND cb.status IN ('Parcial','Pendente','Atrasado') AND cb."saldoDevedorGerado" > 0
      `,
      // 4. Evolução novos clientes (12 meses)
      prisma.$queryRaw<{ mes: Date; count: number }[]>`
        SELECT DATE_TRUNC('month', "createdAt") as mes, COUNT(*)::int as count
        FROM clientes
        WHERE "deletedAt" IS NULL AND "createdAt" >= ${new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1)}
        GROUP BY mes ORDER BY mes ASC
      `,
      // 5. Distribuição por estado
      prisma.$queryRaw<{ estado: string; count: number }[]>`
        SELECT estado, COUNT(*)::int as count
        FROM clientes
        WHERE "deletedAt" IS NULL AND status = 'Ativo'
        GROUP BY estado ORDER BY count DESC
      `,
      // 6. Clientes detalhados
      prisma.cliente.findMany({
        where: clienteWhere,
        select: {
          id: true,
          nomeExibicao: true,
          tipoPessoa: true,
          cpf: true,
          cnpj: true,
          cidade: true,
          estado: true,
          rotaNome: true,
          status: true,
          createdAt: true,
          locacoes: {
            where: { status: 'Ativa', deletedAt: null },
            select: {
              id: true,
              produtoIdentificador: true,
              produtoTipo: true,
              formaPagamento: true,
            },
          },
          cobrancas: {
            where: {
              deletedAt: null,
              createdAt: { gte: inicio, lte: fim },
            },
            select: {
              valorRecebido: true,
              saldoDevedorGerado: true,
              status: true,
            },
          },
        },
        orderBy: { nomeExibicao: 'asc' },
        take: 500,
      }),
    ])

    // ── Processing ──
    const mesesLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

    const evolucaoNovosClientesCompleta = Array.from({ length: 12 }, (_, i) => {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - (11 - i), 1)
      const mesIndex = data.getMonth()
      const existente = evolucaoNovosClientes.find(e => {
        const eDate = new Date(e.mes)
        return eDate.getMonth() === mesIndex && eDate.getFullYear() === data.getFullYear()
      })
      return {
        mes: `${mesesLabels[mesIndex]}/${data.getFullYear().toString().slice(-2)}`,
        count: existente?.count ?? 0,
      }
    })

    const kpis = {
      totalClientesAtivos,
      clientesComLocacao: clientesComLocacao[0]?.count ?? 0,
      clientesComSaldo: clientesComSaldo[0]?.count ?? 0,
      receitaMediaCliente: receitaMediaQuery[0]?.media ?? 0,
    }

    const charts = {
      clientesPorRota: clientesPorRota.map(r => ({ rotaId: r.rotaId, rotaDescricao: r.rotaDescricao, count: r.count })),
      evolucaoNovosClientes: evolucaoNovosClientesCompleta,
      topClientesReceita: topClientesReceita.map(c => ({
        clienteId: c.clienteId,
        clienteNome: c.clienteNome,
        total: c.total,
        count: c.count,
      })),
      distribuicaoPorEstado: distribuicaoPorEstado.map(e => ({ estado: e.estado, count: e.count })),
    }

    const tabela = clientesDetalhados.map(c => {
      const receitaPeriodo = c.cobrancas?.reduce((sum: number, cb: { valorRecebido: number }) => sum + (cb.valorRecebido || 0), 0) || 0
      const saldoDevedor = c.cobrancas
        ?.filter((cb: { status: string }) => ['Parcial', 'Pendente', 'Atrasado'].includes(cb.status))
        .reduce((sum: number, cb: { saldoDevedorGerado: number }) => sum + (cb.saldoDevedorGerado || 0), 0) || 0

      return {
        id: c.id,
        nomeExibicao: c.nomeExibicao,
        tipoPessoa: c.tipoPessoa,
        cpfCnpj: c.cpf || c.cnpj || '',
        cidade: c.cidade,
        estado: c.estado,
        rotaNome: c.rotaNome || 'Sem Rota',
        status: c.status,
        locacoesAtivas: c.locacoes?.length || 0,
        receitaPeriodo,
        saldoDevedor,
      }
    })

    return NextResponse.json({ kpis, charts, tabela })
  } catch (error) {
    console.error('[relatorios/clientes]', error)
    return NextResponse.json({ error: 'Erro ao gerar relatório de clientes' }, { status: 500 })
  }
}
