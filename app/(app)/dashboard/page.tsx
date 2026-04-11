import { Metadata } from 'next'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Header from '@/components/layout/header'
import { formatarMoeda } from '@/shared/types'
import { DashboardClient } from './dashboard-client'

export const metadata: Metadata = { title: 'Dashboard' }

async function getDashboardData() {
  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const inicioMesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
  const fimMesPassado = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
  const seisMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1)

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
  ] = await Promise.all([
    prisma.cliente.count({ where: { status: 'Ativo', deletedAt: null } }),
    prisma.produto.count({ where: { deletedAt: null } }),
    prisma.locacao.count({ where: { status: 'Ativa', deletedAt: null } }),
    prisma.cobranca.aggregate({
      where: { deletedAt: null, createdAt: { gte: inicioMes } },
      _sum: { valorRecebido: true },
      _count: true,
    }),
    prisma.cobranca.aggregate({
      where: { deletedAt: null, createdAt: { gte: inicioMesPassado, lt: inicioMes } },
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
    prisma.cobranca.count({ where: { status: 'Atrasado', deletedAt: null } }),
    prisma.cobranca.findMany({
      where: { deletedAt: null },
      include: { cliente: { select: { nomeExibicao: true, id: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.syncConflict.count({ where: { resolution: null } }),
    prisma.cobranca.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: true,
      _sum: { valorRecebido: true },
    }),
    // Receita dos últimos 6 meses
    prisma.$queryRaw<{ mes: Date; total: number }[]>`
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
    prisma.$queryRaw<{ clienteId: string; clienteNome: string; total: number; count: number }[]>`
      SELECT 
        c."clienteId",
        c."clienteNome",
        SUM(c."valorRecebido")::float as total,
        COUNT(*)::int as count
      FROM cobrancas c
      WHERE c."deletedAt" IS NULL
        AND c."createdAt" >= ${inicioMes}
      GROUP BY c."clienteId", c."clienteNome"
      ORDER BY total DESC
      LIMIT 5
    `,
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
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i), 1)
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
    cobrancasRecentes,
    conflictsPendentes,
    distribuicaoStatus,
    receitaMensal,
    miniChartData,
    topClientes,
  }
}

export default async function DashboardPage() {
  const session = await getSession()
  const data = await getDashboardData()

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="space-y-6">
      <Header
        title={`${saudacao}, ${session?.user.name?.split(' ')[0]}!`}
        subtitle="Veja o resumo completo do seu negócio"
      />

      <DashboardClient data={data} />
    </div>
  )
}
