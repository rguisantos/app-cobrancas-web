// GET /api/relatorios/comparativo — Comparação entre dois períodos
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import {
  authenticateReport,
  extractReportParams,
  calcVariacao,
} from '@/lib/relatorios-helpers'

interface PeriodData {
  receita: { receita: number; total_cobrado: number; saldo_devedor: number; total_cobrancas: number }
  cobrancasStatus: { status: string; total: number; valor: number }[]
  topClientes: { nome: string; total_pago: number }[]
  inadimplencia: { total_atrasadas: number; valor_atrasado: number }
  locacoesAtivas: number
}

export async function GET(request: NextRequest) {
  const authResult = await authenticateReport(request, extractReportParams(request).rotaId)
  if (authResult instanceof NextResponse) return authResult
  const { effectiveRotaId } = authResult

  try {
    const { searchParams } = new URL(request.url)
    const periodo1Inicio = searchParams.get('periodo1Inicio')
    const periodo1Fim = searchParams.get('periodo1Fim')
    const periodo2Inicio = searchParams.get('periodo2Inicio')
    const periodo2Fim = searchParams.get('periodo2Fim')

    if (!periodo1Inicio || !periodo1Fim || !periodo2Inicio || !periodo2Fim) {
      return NextResponse.json(
        { error: 'Informe os dois períodos para comparação' },
        { status: 400 }
      )
    }

    const rotaFilter = effectiveRotaId
      ? Prisma.sql`AND cl."rotaId" = ${effectiveRotaId}`
      : Prisma.empty

    async function getPeriodData(inicio: string, fim: string): Promise<PeriodData> {
      const dataInicio = new Date(inicio)
      const dataFim = new Date(fim + 'T23:59:59')
      // dataVencimento is text — cast to timestamp for comparison
      const dataInicioStr = dataInicio.toISOString()
      const dataFimStr = dataFim.toISOString()

      const [receita, cobrancasStatus, topClientes, inadimplencia, locacoesAtivas] = await Promise.all([
        prisma.$queryRaw<{ receita: number; total_cobrado: number; saldo_devedor: number; total_cobrancas: number }[]>(Prisma.sql`
          SELECT 
            COALESCE(SUM(cb."valorRecebido"), 0)::float as receita,
            COALESCE(SUM(cb."totalClientePaga"), 0)::float as total_cobrado,
            COALESCE(SUM(cb."saldoDevedorGerado"), 0)::float as saldo_devedor,
            COUNT(*)::int as total_cobrancas
          FROM cobrancas cb
          INNER JOIN locacoes l ON l.id = cb."locacaoId"
          INNER JOIN clientes cl ON cl.id = l."clienteId"
          WHERE cb."dataVencimento"::timestamp >= ${dataInicioStr}::timestamp
            AND cb."dataVencimento"::timestamp <= ${dataFimStr}::timestamp
            AND cb."deletedAt" IS NULL
            ${rotaFilter}
        `),
        prisma.$queryRaw<{ status: string; total: number; valor: number }[]>(Prisma.sql`
          SELECT 
            cb.status,
            COUNT(*)::int as total,
            COALESCE(SUM(cb."totalClientePaga"), 0)::float as valor
          FROM cobrancas cb
          INNER JOIN locacoes l ON l.id = cb."locacaoId"
          INNER JOIN clientes cl ON cl.id = l."clienteId"
          WHERE cb."dataVencimento"::timestamp >= ${dataInicioStr}::timestamp
            AND cb."dataVencimento"::timestamp <= ${dataFimStr}::timestamp
            AND cb."deletedAt" IS NULL
            ${rotaFilter}
          GROUP BY cb.status
        `),
        prisma.$queryRaw<{ nome: string; total_pago: number }[]>(Prisma.sql`
          SELECT 
            cl."nomeExibicao" as nome,
            COALESCE(SUM(cb."valorRecebido"), 0)::float as total_pago
          FROM cobrancas cb
          INNER JOIN locacoes l ON l.id = cb."locacaoId"
          INNER JOIN clientes cl ON cl.id = l."clienteId"
          WHERE cb."dataVencimento"::timestamp >= ${dataInicioStr}::timestamp
            AND cb."dataVencimento"::timestamp <= ${dataFimStr}::timestamp
            AND cb."deletedAt" IS NULL
            ${rotaFilter}
          GROUP BY cl."nomeExibicao"
          ORDER BY total_pago DESC
          LIMIT 5
        `),
        prisma.$queryRaw<{ total_atrasadas: number; valor_atrasado: number }[]>(Prisma.sql`
          SELECT 
            COUNT(*)::int as total_atrasadas,
            COALESCE(SUM(cb."saldoDevedorGerado"), 0)::float as valor_atrasado
          FROM cobrancas cb
          INNER JOIN locacoes l ON l.id = cb."locacaoId"
          INNER JOIN clientes cl ON cl.id = l."clienteId"
          WHERE cb.status = 'Atrasado'
            AND cb."dataVencimento"::timestamp >= ${dataInicioStr}::timestamp
            AND cb."dataVencimento"::timestamp <= ${dataFimStr}::timestamp
            AND cb."deletedAt" IS NULL
            ${rotaFilter}
        `),
        prisma.$queryRaw<{ total: number }[]>(Prisma.sql`
          SELECT COUNT(*)::int as total
          FROM locacoes l
          INNER JOIN clientes cl ON cl.id = l."clienteId"
          WHERE l.status = 'Ativa'
            AND l."deletedAt" IS NULL
            AND l."dataLocacao"::timestamp <= ${dataFimStr}::timestamp
            ${rotaFilter}
        `),
      ])

      return {
        receita: receita[0] || { receita: 0, total_cobrado: 0, saldo_devedor: 0, total_cobrancas: 0 },
        cobrancasStatus,
        topClientes,
        inadimplencia: inadimplencia[0] || { total_atrasadas: 0, valor_atrasado: 0 },
        locacoesAtivas: locacoesAtivas[0]?.total || 0,
      }
    }

    // FIX: Fetch both periods in parallel (was sequential before)
    const [periodo1, periodo2] = await Promise.all([
      getPeriodData(periodo1Inicio, periodo1Fim),
      getPeriodData(periodo2Inicio, periodo2Fim),
    ])

    const comparacao = {
      receita: {
        periodo1: periodo1.receita.receita,
        periodo2: periodo2.receita.receita,
        variacao: calcVariacao(periodo2.receita.receita, periodo1.receita.receita),
      },
      totalCobrado: {
        periodo1: periodo1.receita.total_cobrado,
        periodo2: periodo2.receita.total_cobrado,
        variacao: calcVariacao(periodo2.receita.total_cobrado, periodo1.receita.total_cobrado),
      },
      saldoDevedor: {
        periodo1: periodo1.receita.saldo_devedor,
        periodo2: periodo2.receita.saldo_devedor,
        variacao: calcVariacao(periodo2.receita.saldo_devedor, periodo1.receita.saldo_devedor),
      },
      totalCobrancas: {
        periodo1: periodo1.receita.total_cobrancas,
        periodo2: periodo2.receita.total_cobrancas,
        variacao: calcVariacao(periodo2.receita.total_cobrancas, periodo1.receita.total_cobrancas),
      },
      inadimplencia: {
        periodo1: periodo1.inadimplencia.total_atrasadas,
        periodo2: periodo2.inadimplencia.total_atrasadas,
        valor1: periodo1.inadimplencia.valor_atrasado,
        valor2: periodo2.inadimplencia.valor_atrasado,
        variacao: calcVariacao(periodo1.inadimplencia.total_atrasadas, periodo2.inadimplencia.total_atrasadas),
      },
      locacoesAtivas: {
        periodo1: periodo1.locacoesAtivas,
        periodo2: periodo2.locacoesAtivas,
        variacao: calcVariacao(periodo2.locacoesAtivas, periodo1.locacoesAtivas),
      },
      cobrancasStatus: { periodo1: periodo1.cobrancasStatus, periodo2: periodo2.cobrancasStatus },
      topClientes: { periodo1: periodo1.topClientes, periodo2: periodo2.topClientes },
    }

    return NextResponse.json(comparacao)
  } catch (error) {
    console.error('Erro no relatório comparativo:', error)
    return NextResponse.json({ error: 'Erro ao gerar relatório comparativo' }, { status: 500 })
  }
}
