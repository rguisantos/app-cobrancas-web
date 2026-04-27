// GET /api/relatorios/clientes — Relatório de clientes
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import {
  authenticateReport,
  extractReportParams,
  calcularPeriodo,
  buildRotaFragments,
  fillMonthlyData,
} from '@/lib/relatorios-helpers'

export async function GET(request: NextRequest) {
  const authResult = await authenticateReport(request, extractReportParams(request).rotaId)
  if (authResult instanceof NextResponse) return authResult
  const { effectiveRotaId } = authResult

  try {
    const { periodo, dataInicio, dataFim, status } = extractReportParams(request)
    const { inicio, fim } = calcularPeriodo(periodo, dataInicio, dataFim)

    const rotaFrags = buildRotaFragments(effectiveRotaId)

    const clienteWhere = {
      deletedAt: null,
      ...(status && { status }),
      ...(effectiveRotaId && { rotaId: effectiveRotaId }),
    }

    const [
      totalClientesAtivos,
      clientesComLocacao,
      clientesComSaldo,
      evolucaoNovosClientes,
      distribuicaoPorEstado,
      clientesDetalhados,
      clientesPorRota,
      topClientesReceita,
      receitaMediaQuery,
    ] = await Promise.all([
      // 1. Total clientes ativos
      prisma.cliente.count({
        where: { deletedAt: null, status: 'Ativo', ...(effectiveRotaId && { rotaId: effectiveRotaId }) },
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
        ${rotaFrags.rotaSubquery}
      `,
      // 4. Evolução novos clientes (12 meses)
      prisma.$queryRaw<{ mes: Date; count: number }[]>`
        SELECT DATE_TRUNC('month', "createdAt") as mes, COUNT(*)::int as count
        FROM clientes
        WHERE "deletedAt" IS NULL AND "createdAt" >= ${new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1)}
        ${effectiveRotaId ? Prisma.sql`AND "rotaId" = ${effectiveRotaId}` : Prisma.empty}
        GROUP BY mes ORDER BY mes ASC
      `,
      // 5. Distribuição por estado
      prisma.$queryRaw<{ estado: string; count: number }[]>`
        SELECT estado, COUNT(*)::int as count
        FROM clientes
        WHERE "deletedAt" IS NULL AND status = 'Ativo'
        ${effectiveRotaId ? Prisma.sql`AND "rotaId" = ${effectiveRotaId}` : Prisma.empty}
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
      // 7. Clientes por rota
      prisma.$queryRaw<{ rotaId: string; rotaDescricao: string; count: number }[]>`
        SELECT COALESCE(r.id::text, 'sem-rota') as "rotaId",
          COALESCE(r.descricao, 'Sem Rota') as "rotaDescricao",
          COUNT(c.id)::int as count
        FROM clientes c
        LEFT JOIN rotas r ON c."rotaId" = r.id
        WHERE c."deletedAt" IS NULL AND c.status = 'Ativo'
        ${rotaFrags.rotaClienteFilter}
        GROUP BY r.id, r.descricao ORDER BY count DESC
      `,
      // 8. Top clientes por receita
      prisma.$queryRaw<{ clienteId: string; clienteNome: string; total: number; count: number }[]>`
        SELECT cb."clienteId", cb."clienteNome",
          SUM(cb."valorRecebido")::float as total, COUNT(*)::int as count
        FROM cobrancas cb
        WHERE cb."deletedAt" IS NULL AND cb."createdAt" >= ${inicio} AND cb."createdAt" <= ${fim}
        ${rotaFrags.rotaSubquery}
        GROUP BY cb."clienteId", cb."clienteNome"
        ORDER BY total DESC LIMIT 10
      `,
      // 9. Receita média por cliente
      prisma.$queryRaw<{ media: number }[]>`
        SELECT CASE WHEN COUNT(DISTINCT "clienteId") > 0
          THEN (SUM("valorRecebido")/COUNT(DISTINCT "clienteId"))::float
          ELSE 0 END as media
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND "createdAt" >= ${inicio} AND "createdAt" <= ${fim}
        ${rotaFrags.rotaSubquery}
      `,
    ])

    // ── Processing ──
    const evolucaoNovosClientesCompleta = fillMonthlyData(evolucaoNovosClientes, 12, (mes, existente) => ({
      mes,
      count: (existente as { count: number } | undefined)?.count ?? 0,
    }))

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
