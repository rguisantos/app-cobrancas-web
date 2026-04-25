import { Metadata } from 'next'
import { Prisma } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Header from '@/components/layout/header'
import { DashboardClient } from './dashboard-client'

export const metadata: Metadata = { title: 'Dashboard' }

async function getDashboardData(
  periodo?: string,
  dataInicio?: string,
  dataFim?: string,
  rotaId?: string
) {
  const hoje = new Date()
  let inicio: Date
  let fim: Date = hoje

  switch (periodo) {
    case 'mes':
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      break
    case 'trimestre':
      inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1)
      break
    case 'semestre':
      inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1)
      break
    case 'ano':
      inicio = new Date(hoje.getFullYear(), 0, 1)
      break
    case 'personalizado':
      inicio = dataInicio ? new Date(dataInicio) : new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      fim = dataFim ? new Date(dataFim) : hoje
      break
    default:
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  }

  // Período anterior para variação
  const diffMonths = periodo === 'trimestre' ? 3 : periodo === 'semestre' ? 6 : 1
  const inicioMesPassado = new Date(inicio)
  inicioMesPassado.setMonth(inicioMesPassado.getMonth() - diffMonths)

  const seisMesesAtras = new Date(fim)
  seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 5)
  seisMesesAtras.setDate(1)

  // Base where clauses
  const clienteWhere: any = { status: 'Ativo', deletedAt: null }
  if (rotaId) clienteWhere.rotaId = rotaId

  const cobrancaWherePeriodo: any = {
    deletedAt: null,
    createdAt: { gte: inicio, lte: fim },
  }
  if (rotaId) cobrancaWherePeriodo.cliente = { rotaId }

  const cobrancaWhereAnterior: any = {
    deletedAt: null,
    createdAt: { gte: inicioMesPassado, lt: inicio },
  }
  if (rotaId) cobrancaWhereAnterior.cliente = { rotaId }

  const cobrancaWhereStatus: any = {
    deletedAt: null,
    createdAt: { gte: inicio, lte: fim },
  }
  if (rotaId) cobrancaWhereStatus.cliente = { rotaId }

  const locacaoWhere: any = { status: 'Ativa', deletedAt: null }
  if (rotaId) locacaoWhere.cliente = { rotaId }

  const cobrancaAtrasadaWhere: any = { status: 'Atrasado', deletedAt: null }
  if (rotaId) cobrancaAtrasadaWhere.cliente = { rotaId }

  const cobrancaRecenteWhere: any = { deletedAt: null }
  if (rotaId) cobrancaRecenteWhere.cliente = { rotaId }

  const receita6MesesWhere: any = {
    deletedAt: null,
    createdAt: { gte: seisMesesAtras },
  }
  if (rotaId) receita6MesesWhere.cliente = { rotaId }

  const topClientesWhere: any = {
    deletedAt: null,
    createdAt: { gte: inicio, lte: fim },
  }
  if (rotaId) topClientesWhere.cliente = { rotaId }

  // SQL fragments for conditional filters
  const rotaFilterFragment = rotaId
    ? Prisma.sql`AND cl."rotaId" = ${rotaId}`
    : Prisma.empty

  const dateFilterFragment = Prisma.sql`AND c."createdAt" >= ${inicio} AND c."createdAt" <= ${fim}`

  const [
    totalClientes,
    totalProdutos,
    produtosLocados,
    cobrancasMes,
    cobrancasMesPassado,
    saldoDevedor,
    cobrancasAtrasadas,
    cobrancasRecentes,
    conflictsPendentes,
    cobrancasPorStatus,
    receitaUltimos6Meses,
    topClientes,
    evolucaoInadimplencia,
    ocupacaoPorRota,
    receitaPorRota,
  ] = await Promise.all([
    prisma.cliente.count({ where: clienteWhere }),
    prisma.produto.count({ where: { deletedAt: null } }),
    prisma.locacao.count({ where: locacaoWhere }),
    prisma.cobranca.aggregate({
      where: cobrancaWherePeriodo,
      _sum: { valorRecebido: true },
      _count: true,
    }),
    prisma.cobranca.aggregate({
      where: cobrancaWhereAnterior,
      _sum: { valorRecebido: true },
    }),
    prisma.$queryRaw<{ total: number }[]>`
      SELECT COALESCE(SUM("saldoDevedorGerado"), 0)::float AS total
      FROM (
        SELECT DISTINCT ON ("locacaoId") "saldoDevedorGerado"
        FROM cobrancas
        WHERE "deletedAt" IS NULL
          AND status IN ('Parcial', 'Pendente', 'Atrasado')
          AND "saldoDevedorGerado" > 0
        ORDER BY "locacaoId", "updatedAt" DESC, "createdAt" DESC
      ) latest
    `,
    prisma.cobranca.count({ where: cobrancaAtrasadaWhere }),
    prisma.cobranca.findMany({
      where: cobrancaRecenteWhere,
      include: { cliente: { select: { nomeExibicao: true, id: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.syncConflict.count({ where: { resolution: null } }),
    prisma.cobranca.groupBy({
      by: ['status'],
      where: cobrancaWhereStatus,
      _count: true,
      _sum: { valorRecebido: true },
    }),
    // Receita dos últimos 6 meses
    rotaId
      ? prisma.$queryRaw<{ mes: Date; total: number }[]>`
          SELECT
            DATE_TRUNC('month', cb."createdAt") as mes,
            COALESCE(SUM(cb."valorRecebido"), 0)::float as total
          FROM cobrancas cb
          INNER JOIN clientes c ON cb."clienteId" = c.id
          WHERE cb."deletedAt" IS NULL
            AND cb."createdAt" >= ${seisMesesAtras}
            AND c."rotaId" = ${rotaId}
          GROUP BY DATE_TRUNC('month', cb."createdAt")
          ORDER BY mes ASC
        `
      : prisma.$queryRaw<{ mes: Date; total: number }[]>`
          SELECT
            DATE_TRUNC('month', "createdAt") as mes,
            COALESCE(SUM("valorRecebido"), 0)::float as total
          FROM cobrancas
          WHERE "deletedAt" IS NULL
            AND "createdAt" >= ${seisMesesAtras}
          GROUP BY DATE_TRUNC('month', "createdAt")
          ORDER BY mes ASC
        `,
    // Top clientes por valor cobrado
    rotaId
      ? prisma.$queryRaw<{ clienteId: string; clienteNome: string; total: number; count: number }[]>`
          SELECT
            c."clienteId",
            c."clienteNome",
            SUM(c."valorRecebido")::float as total,
            COUNT(*)::int as count
          FROM cobrancas c
          INNER JOIN clientes cl ON c."clienteId" = cl.id
          WHERE c."deletedAt" IS NULL
            AND c."createdAt" >= ${inicio}
            AND c."createdAt" <= ${fim}
            AND cl."rotaId" = ${rotaId}
          GROUP BY c."clienteId", c."clienteNome"
          ORDER BY total DESC
          LIMIT 5
        `
      : prisma.$queryRaw<{ clienteId: string; clienteNome: string; total: number; count: number }[]>`
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
          LIMIT 5
        `,
    // Evolução inadimplência (6 meses)
    prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', "dataVencimento"::date), 'YYYY-MM') as mes,
        COUNT(*)::int as total_atrasadas,
        COALESCE(SUM("saldoDevedorGerado"), 0)::float as saldo_devedor
      FROM cobrancas
      WHERE status = 'Atrasado'
        AND "deletedAt" IS NULL
        AND "dataVencimento" IS NOT NULL
        AND "dataVencimento"::date >= NOW() - INTERVAL '6 months'
        ${rotaId ? Prisma.sql`AND "clienteId" IN (SELECT id FROM clientes WHERE "rotaId" = ${rotaId})` : Prisma.empty}
      GROUP BY DATE_TRUNC('month', "dataVencimento"::date)
      ORDER BY mes
    `),
    // Ocupação por Rota
    prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        r.id, r.descricao as nome,
        COUNT(DISTINCT p.id)::int as total_produtos,
        COUNT(DISTINCT l.id)::int as produtos_locados,
        CASE WHEN COUNT(DISTINCT p.id) > 0
          THEN ROUND(COUNT(DISTINCT l.id)::numeric / COUNT(DISTINCT p.id)::numeric * 100, 1)
          ELSE 0
        END::float as taxa_ocupacao
      FROM rotas r
      LEFT JOIN clientes c ON c."rotaId" = r.id AND c."deletedAt" IS NULL
      LEFT JOIN produtos p ON p."deletedAt" IS NULL
      LEFT JOIN locacoes l ON l."produtoId" = p.id AND l.status = 'Ativa' AND l."deletedAt" IS NULL
      WHERE r."deletedAt" IS NULL
      ${rotaId ? Prisma.sql`AND r.id = ${rotaId}` : Prisma.empty}
      GROUP BY r.id, r.descricao
      ORDER BY r.descricao
    `),
    // Receita por Rota
    prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        r.id, r.descricao as nome,
        COALESCE(SUM(c."valorRecebido"), 0)::float as receita,
        COALESCE(SUM(c."saldoDevedorGerado"), 0)::float as saldo_devedor
      FROM rotas r
      LEFT JOIN clientes cl ON cl."rotaId" = r.id AND cl."deletedAt" IS NULL
      LEFT JOIN locacoes l ON l."clienteId" = cl.id AND l."deletedAt" IS NULL
      LEFT JOIN cobrancas c ON c."locacaoId" = l.id AND c."deletedAt" IS NULL
        ${dateFilterFragment}
      WHERE r."deletedAt" IS NULL
      ${rotaFilterFragment}
      GROUP BY r.id, r.descricao
      ORDER BY receita DESC
    `),
  ])

  // Calcular variação percentual da receita
  const receitaMesAtual = cobrancasMes._sum.valorRecebido ?? 0
  const receitaMesPassado = cobrancasMesPassado._sum.valorRecebido ?? 0
  const variacaoReceita = receitaMesPassado > 0
    ? ((receitaMesAtual - receitaMesPassado) / receitaMesPassado) * 100
    : 0

  // Dados para o gráfico de receita mensal
  const mesesLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const receitaMensal = Array.from({ length: 6 }, (_, i) => {
    const data = new Date(fim.getFullYear(), fim.getMonth() - (5 - i), 1)
    const mesIndex = data.getMonth()
    const receita = receitaUltimos6Meses.find(r => {
      const rDate = new Date(r.mes)
      return rDate.getMonth() === mesIndex && rDate.getFullYear() === data.getFullYear()
    })
    return {
      mes: mesesLabels[mesIndex],
      valor: receita?.total ?? 0,
    }
  })

  // Dados para o gráfico de distribuição por status
  const statusColors: Record<string, string> = {
    Pago: '#16A34A',
    Parcial: '#F59E0B',
    Pendente: '#2563EB',
    Atrasado: '#DC2626',
  }

  const distribuicaoStatus = cobrancasPorStatus.map(s => ({
    name: s.status,
    value: s._count,
    color: statusColors[s.status] || '#94A3B8',
  }))

  // Mini chart data para KPIs (últimos 6 meses)
  const miniChartData = receitaMensal.map(r => r.valor)

  // Serializar cobrancasRecentes
  const cobrancasRecentesSerialized = cobrancasRecentes.map(c => ({
    id: c.id,
    clienteNome: c.clienteNome,
    cliente: c.cliente ? { nomeExibicao: c.cliente.nomeExibicao, id: c.cliente.id } : null,
    produtoIdentificador: c.produtoIdentificador,
    valorRecebido: c.valorRecebido,
    saldoDevedorGerado: c.saldoDevedorGerado,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
  }))

  // Evolução inadimplência — fill missing months
  const evolucaoInadimplenciaFormatted = Array.from({ length: 6 }, (_, i) => {
    const data = new Date(fim.getFullYear(), fim.getMonth() - (5 - i), 1)
    const mesKey = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
    const found = evolucaoInadimplencia.find((r: any) => r.mes === mesKey)
    return {
      mes: mesesLabels[data.getMonth()],
      total_atrasadas: found?.total_atrasadas ?? 0,
      saldo_devedor: found?.saldo_devedor ?? 0,
    }
  })

  // Ocupação por Rota — serialize
  const ocupacaoPorRotaFormatted = ocupacaoPorRota.map((r: any) => ({
    id: r.id,
    nome: r.nome,
    total_produtos: r.total_produtos,
    produtos_locados: r.produtos_locados,
    taxa_ocupacao: r.taxa_ocupacao,
  }))

  // Receita por Rota — serialize
  const receitaPorRotaFormatted = receitaPorRota.map((r: any) => ({
    id: r.id,
    nome: r.nome,
    receita: r.receita,
    saldo_devedor: r.saldo_devedor,
  }))

  return {
    totalClientes,
    totalProdutos,
    produtosLocados,
    produtosEstoque: totalProdutos - produtosLocados,
    receitaMes: receitaMesAtual,
    totalCobrancasMes: cobrancasMes._count,
    variacaoReceita: Math.round(variacaoReceita),
    saldoDevedor: saldoDevedor[0]?.total ?? 0,
    cobrancasAtrasadas,
    cobrancasRecentes: cobrancasRecentesSerialized,
    conflictsPendentes,
    distribuicaoStatus,
    receitaMensal,
    miniChartData,
    topClientes,
    evolucaoInadimplencia: evolucaoInadimplenciaFormatted,
    ocupacaoPorRota: ocupacaoPorRotaFormatted,
    receitaPorRota: receitaPorRotaFormatted,
  }
}

async function getRotas() {
  return prisma.rota.findMany({
    where: { deletedAt: null, status: 'Ativo' },
    orderBy: { descricao: 'asc' },
    select: { id: true, descricao: true },
  })
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; dataInicio?: string; dataFim?: string; rotaId?: string }>
}) {
  const params = await searchParams
  const session = await getSession()
  const [data, rotas] = await Promise.all([
    getDashboardData(params.periodo, params.dataInicio, params.dataFim, params.rotaId),
    getRotas(),
  ])

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="space-y-6">
      <Header
        title={`${saudacao}, ${session?.user.name?.split(' ')[0]}!`}
        subtitle="Veja o resumo completo do seu negócio"
      />

      <DashboardClient
        data={data}
        rotas={rotas}
        periodoAtual={params.periodo || 'mes'}
        rotaIdAtual={params.rotaId || ''}
      />
    </div>
  )
}
