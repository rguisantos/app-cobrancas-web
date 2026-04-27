// GET /api/relatorios/inadimplencia — Relatório de inadimplência
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import {
  authenticateReport,
  extractReportParams,
  buildRotaFragments,
  fillMonthlyData,
  FAIXAS_INADIMPLENCIA,
} from '@/lib/relatorios-helpers'

export async function GET(request: NextRequest) {
  const authResult = await authenticateReport(request, extractReportParams(request).rotaId)
  if (authResult instanceof NextResponse) return authResult
  const { effectiveRotaId } = authResult

  try {
    const rotaFrags = buildRotaFragments(effectiveRotaId)

    // ── Parallel queries (sem duplicação de queries para rotaId) ──
    const [
      totalSaldoDevedor,
      locacoesComDebito,
      cobrancasAtrasadas,
      diasMediosAtraso,
      evolucaoInadimplencia,
      distribuicaoDiasAtraso,
      totalCobrancas,
      cobrancasInadimplentes,
      inadimplenciaPorRota,
      topDevedores,
    ] = await Promise.all([
      // 1. Total saldo devedor
      prisma.$queryRaw<{ total: number }[]>`
        SELECT COALESCE(SUM("saldoDevedorGerado"), 0)::float AS total
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND status IN ('Parcial','Pendente','Atrasado') AND "saldoDevedorGerado" > 0
        ${rotaFrags.rotaSubquery}
      `,
      // 2. Locações com débito
      prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(DISTINCT "locacaoId")::int AS count
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND status IN ('Parcial','Pendente','Atrasado') AND "saldoDevedorGerado" > 0
        ${rotaFrags.rotaSubquery}
      `,
      // 3. Cobranças atrasadas/pendentes/parciais
      prisma.cobranca.count({
        where: {
          deletedAt: null,
          status: { in: ['Atrasado', 'Pendente', 'Parcial'] },
          saldoDevedorGerado: { gt: 0 },
          ...(effectiveRotaId && { cliente: { rotaId: effectiveRotaId } }),
        },
      }),
      // 4. Dias médios de atraso
      prisma.$queryRaw<{ media: number }[]>`
        SELECT COALESCE(AVG(EXTRACT(DAY FROM NOW() - COALESCE("dataVencimento"::timestamp, "createdAt"))), 0)::float as media
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND status IN ('Atrasado','Pendente') AND "saldoDevedorGerado" > 0
        ${rotaFrags.rotaSubquery}
      `,
      // 5. Evolução inadimplência (12 meses)
      prisma.$queryRaw<{ mes: Date; total: number; count: number }[]>`
        SELECT DATE_TRUNC('month', "createdAt") as mes,
          COALESCE(SUM("saldoDevedorGerado"), 0)::float as total,
          COUNT(*)::int as count
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND status IN ('Parcial','Pendente','Atrasado')
          AND "createdAt" >= ${new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1)}
        ${rotaFrags.rotaSubquery}
        GROUP BY mes ORDER BY mes ASC
      `,
      // 6. Distribuição por dias de atraso
      prisma.$queryRaw<{ faixa: string; count: number; total: number }[]>`
        SELECT
          CASE WHEN EXTRACT(DAY FROM NOW() - COALESCE("dataVencimento"::timestamp, "createdAt")) <= 30 THEN '0-30'
               WHEN EXTRACT(DAY FROM NOW() - COALESCE("dataVencimento"::timestamp, "createdAt")) <= 60 THEN '31-60'
               WHEN EXTRACT(DAY FROM NOW() - COALESCE("dataVencimento"::timestamp, "createdAt")) <= 90 THEN '61-90'
               ELSE '90+' END as faixa,
          COUNT(*)::int as count,
          COALESCE(SUM("saldoDevedorGerado"), 0)::float as total
        FROM cobrancas
        WHERE "deletedAt" IS NULL AND status IN ('Atrasado','Pendente') AND "saldoDevedorGerado" > 0
        ${rotaFrags.rotaSubquery}
        GROUP BY faixa ORDER BY faixa
      `,
      // 7. Total cobrancas (for percentual calculation)
      prisma.cobranca.count({ where: { deletedAt: null } }),
      // 8. Cobranças inadimplentes detalhadas
      prisma.cobranca.findMany({
        where: {
          deletedAt: null,
          status: { in: ['Atrasado', 'Pendente', 'Parcial'] },
          saldoDevedorGerado: { gt: 0 },
          ...(effectiveRotaId && { cliente: { rotaId: effectiveRotaId } }),
        },
        include: {
          cliente: { select: { nomeExibicao: true, rotaNome: true } },
          locacao: { select: { produto: { select: { identificador: true, tipoNome: true } } } },
        },
        orderBy: { saldoDevedorGerado: 'desc' },
        take: 500,
      }),
      // 9. Inadimplência por rota
      prisma.$queryRaw<{ rotaId: string; rotaDescricao: string; total: number; count: number }[]>`
        SELECT COALESCE(c."rotaId"::text, 'sem-rota') as "rotaId",
          COALESCE(r.descricao, 'Sem Rota') as "rotaDescricao",
          SUM(cb."saldoDevedorGerado")::float as total, COUNT(*)::int as count
        FROM cobrancas cb
        LEFT JOIN clientes c ON cb."clienteId" = c.id
        LEFT JOIN rotas r ON c."rotaId" = r.id
        WHERE cb."deletedAt" IS NULL AND cb.status IN ('Parcial','Pendente','Atrasado')
          AND cb."saldoDevedorGerado" > 0
        ${rotaFrags.rotaClienteFilter}
        GROUP BY c."rotaId", r.descricao ORDER BY total DESC
      `,
      // 10. Top devedores
      prisma.$queryRaw<{ clienteId: string; clienteNome: string; totalDevido: number; cobrancas: number }[]>`
        SELECT cb."clienteId", cb."clienteNome",
          SUM(cb."saldoDevedorGerado")::float as "totalDevido", COUNT(*)::int as cobrancas
        FROM cobrancas cb
        WHERE cb."deletedAt" IS NULL AND cb.status IN ('Parcial','Pendente','Atrasado')
          AND cb."saldoDevedorGerado" > 0
        ${rotaFrags.rotaSubquery}
        GROUP BY cb."clienteId", cb."clienteNome"
        ORDER BY "totalDevido" DESC LIMIT 10
      `,
    ])

    // ── Processing ──
    const evolucaoInadimplenciaCompleta = fillMonthlyData(evolucaoInadimplencia, 12, (mes, existente) => ({
      mes,
      valor: (existente as { total: number } | undefined)?.total ?? 0,
      count: (existente as { count: number } | undefined)?.count ?? 0,
    }))

    // Ensure all aging ranges are present
    const distribuicaoCompleta = FAIXAS_INADIMPLENCIA.map(faixa => {
      const existente = distribuicaoDiasAtraso.find(d => d.faixa === faixa)
      return { faixa, count: existente?.count ?? 0, total: existente?.total ?? 0 }
    })

    const kpis = {
      totalSaldoDevedor: totalSaldoDevedor[0]?.total ?? 0,
      locacoesComDebito: locacoesComDebito[0]?.count ?? 0,
      cobrancasAtrasadas,
      diasMediosAtraso: Math.round(diasMediosAtraso[0]?.media ?? 0),
      percentualInadimplencia: totalCobrancas > 0 ? (cobrancasAtrasadas / totalCobrancas) * 100 : 0,
    }

    const charts = {
      evolucaoInadimplencia: evolucaoInadimplenciaCompleta,
      inadimplenciaPorRota: inadimplenciaPorRota.map(r => ({ rotaId: r.rotaId, rotaDescricao: r.rotaDescricao, total: r.total, count: r.count })),
      distribuicaoDiasAtraso: distribuicaoCompleta,
      topDevedores: topDevedores.map(d => ({
        clienteId: d.clienteId,
        clienteNome: d.clienteNome,
        totalDevido: d.totalDevido,
        cobrancas: d.cobrancas,
      })),
    }

    const hoje = new Date()
    const tabela = cobrancasInadimplentes.map(c => {
      const dataRef = c.dataVencimento ? new Date(c.dataVencimento) : new Date(c.createdAt)
      const diasAtraso = Math.max(0, Math.floor((hoje.getTime() - dataRef.getTime()) / (1000 * 60 * 60 * 24)))

      return {
        id: c.id,
        clienteNome: c.cliente?.nomeExibicao || c.clienteNome,
        produtoIdentificador: c.produtoIdentificador,
        produtoTipo: c.locacao?.produto?.tipoNome || '',
        saldoDevedorGerado: c.saldoDevedorGerado,
        diasAtraso,
        rotaNome: c.cliente?.rotaNome || '',
        status: c.status,
        dataVencimento: c.dataVencimento || '',
        dataInicio: c.dataInicio,
        dataFim: c.dataFim,
        valorRecebido: c.valorRecebido,
        totalBruto: c.totalBruto,
      }
    })

    return NextResponse.json({ kpis, charts, tabela })
  } catch (error) {
    console.error('[relatorios/inadimplencia]', error)
    return NextResponse.json({ error: 'Erro ao gerar relatório de inadimplência' }, { status: 500 })
  }
}
