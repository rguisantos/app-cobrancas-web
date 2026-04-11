import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import Header from '@/components/layout/header'
import { formatarMoeda } from '@/shared/types'
import { RelatoriosClient } from './relatorios-client'

export const metadata: Metadata = { title: 'Relatórios' }

async function getRelatoriosData(dataInicio?: Date, dataFim?: Date) {
  const hoje = new Date()
  const inicio = dataInicio || new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const fim = dataFim || hoje

  const [
    receitaTotal,
    cobrancasTotal,
    cobrancasPagas,
    saldoDevedor,
    receitaPorRota,
    evolucaoMensal,
    topClientes,
    porStatus,
  ] = await Promise.all([
    // Receita total no período
    prisma.cobranca.aggregate({
      where: { deletedAt: null, createdAt: { gte: inicio, lte: fim } },
      _sum: { valorRecebido: true },
    }),
    // Total de cobranças no período
    prisma.cobranca.count({
      where: { deletedAt: null, createdAt: { gte: inicio, lte: fim } },
    }),
    // Cobranças pagas
    prisma.cobranca.count({
      where: { deletedAt: null, status: 'Pago', createdAt: { gte: inicio, lte: fim } },
    }),
    // Saldo devedor total
    prisma.$queryRaw<{ total: number; count: number }[]>`
      SELECT
        COALESCE(SUM("saldoDevedorGerado"), 0)::float AS total,
        COUNT(*)::int AS count
      FROM (
        SELECT DISTINCT ON ("locacaoId") "saldoDevedorGerado"
        FROM cobrancas
        WHERE "deletedAt" IS NULL
          AND status IN ('Parcial', 'Pendente', 'Atrasado')
          AND "saldoDevedorGerado" > 0
        ORDER BY "locacaoId", "updatedAt" DESC, "createdAt" DESC
      ) latest
    `,
    // Receita por rota
    prisma.$queryRaw<{ rotaId: string; rotaDescricao: string; total: number; count: number }[]>`
      SELECT 
        COALESCE(c."rotaId", 'sem-rota') as "rotaId",
        COALESCE(r.descricao, 'Sem Rota') as "rotaDescricao",
        SUM(cb."valorRecebido")::float as total,
        COUNT(*)::int as count
      FROM cobrancas cb
      LEFT JOIN clientes c ON cb."clienteId" = c.id
      LEFT JOIN rotas r ON c."rotaId" = r.id
      WHERE cb."deletedAt" IS NULL
        AND cb."createdAt" >= ${inicio}
        AND cb."createdAt" <= ${fim}
      GROUP BY c."rotaId", r.descricao
      ORDER BY total DESC
      LIMIT 10
    `,
    // Evolução mensal (últimos 12 meses)
    prisma.$queryRaw<{ mes: Date; total: number; count: number }[]>`
      SELECT 
        DATE_TRUNC('month', "createdAt") as mes,
        COALESCE(SUM("valorRecebido"), 0)::float as total,
        COUNT(*)::int as count
      FROM cobrancas
      WHERE "deletedAt" IS NULL
        AND "createdAt" >= ${new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1)}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY mes ASC
    `,
    // Top clientes
    prisma.$queryRaw<{ clienteId: string; clienteNome: string; total: number; count: number }[]>`
      SELECT 
        c."clienteId",
        c."clienteNome",
        SUM(c."valorRecebido")::float as total,
        COUNT(*)::int as count
      FROM cobrancas c
      WHERE c."deletedAt" IS NULL
        AND c."createdAt" >= ${inicio}
        AND c."createdAt" <= ${fim}
      GROUP BY c."clienteId", c."clienteNome"
      ORDER BY total DESC
      LIMIT 10
    `,
    // Por status
    prisma.cobranca.groupBy({
      by: ['status'],
      where: { deletedAt: null, createdAt: { gte: inicio, lte: fim } },
      _count: true,
      _sum: { valorRecebido: true },
    }),
  ])

  // Calcular indicadores
  const ticketMedio = cobrancasTotal > 0 
    ? (receitaTotal._sum.valorRecebido ?? 0) / cobrancasTotal 
    : 0
  const percentualPago = cobrancasTotal > 0 
    ? (cobrancasPagas / cobrancasTotal) * 100 
    : 0

  // Formatar evolução mensal
  const mesesLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const evolucaoFormatada = evolucaoMensal.map(e => ({
    mes: mesesLabels[new Date(e.mes).getMonth()],
    valor: e.total,
    count: e.count,
  }))

  // Preencher meses faltantes
  const evolucaoCompleta = Array.from({ length: 12 }, (_, i) => {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - (11 - i), 1)
    const mesIndex = data.getMonth()
    const existente = evolucaoMensal.find(e => {
      const eDate = new Date(e.mes)
      return eDate.getMonth() === mesIndex && eDate.getFullYear() === data.getFullYear()
    })
    return {
      mes: mesesLabels[mesIndex],
      valor: existente?.total ?? 0,
      count: existente?.count ?? 0,
    }
  }).slice(-6) // Últimos 6 meses

  return {
    receitaTotal: receitaTotal._sum.valorRecebido ?? 0,
    cobrancasTotal,
    cobrancasPagas,
    saldoDevedor: saldoDevedor[0]?.total ?? 0,
    locacoesComSaldo: saldoDevedor[0]?.count ?? 0,
    ticketMedio,
    percentualPago,
    receitaPorRota: receitaPorRota.map(r => ({
      rotaId: r.rotaId,
      rotaDescricao: r.rotaDescricao,
      total: r.total,
      count: r.count,
    })),
    evolucaoMensal: evolucaoCompleta,
    topClientes: topClientes.map(c => ({
      clienteId: c.clienteId,
      clienteNome: c.clienteNome,
      total: c.total,
      count: c.count,
    })),
    porStatus: porStatus.map(s => ({
      status: s.status,
      count: s._count,
      valor: s._sum.valorRecebido ?? 0,
    })),
  }
}

export default async function RelatoriosPage({
  searchParams,
}: { searchParams: Promise<{ periodo?: string; dataInicio?: string; dataFim?: string }> }) {
  const params = await searchParams
  
  // Calcular datas baseado no período
  let dataInicio: Date | undefined
  let dataFim: Date | undefined
  const hoje = new Date()

  switch (params.periodo) {
    case 'mes':
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      break
    case 'trimestre':
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1)
      break
    case 'ano':
      dataInicio = new Date(hoje.getFullYear(), 0, 1)
      break
    case 'personalizado':
      if (params.dataInicio) dataInicio = new Date(params.dataInicio)
      if (params.dataFim) dataFim = new Date(params.dataFim)
      break
    default:
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  }

  const data = await getRelatoriosData(dataInicio, dataFim)

  return (
    <div className="space-y-6">
      <Header
        title="Relatórios"
        subtitle="Análise financeira e operacional do sistema"
      />
      <RelatoriosClient data={data} periodoAtual={params.periodo || 'mes'} />
    </div>
  )
}
