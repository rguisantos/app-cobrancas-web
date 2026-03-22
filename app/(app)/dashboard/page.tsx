import { Metadata } from 'next'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Header from '@/components/layout/header'
import StatCard from '@/components/ui/stat-card'
import { formatarMoeda } from '@/shared/types'
import CobrancasRecentesTable from './cobrancas-recentes'
import AlertasCard from './alertas-card'

export const metadata: Metadata = { title: 'Dashboard' }
export const revalidate = 60 // revalida a cada 60s

async function getDashboardData() {
  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

  const [
    totalClientes,
    totalProdutos,
    produtosLocados,
    cobrancasMes,
    saldoDevedor,
    cobrancasAtrasadas,
    cobrancasRecentes,
    conflictsPendentes,
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
      where: { deletedAt: null, status: { in: ['Parcial', 'Pendente', 'Atrasado'] } },
      _sum: { saldoDevedorGerado: true },
    }),
    prisma.cobranca.count({ where: { status: 'Atrasado', deletedAt: null } }),
    prisma.cobranca.findMany({
      where: { deletedAt: null },
      include: { cliente: { select: { nomeExibicao: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.syncConflict.count({ where: { resolution: null } }),
  ])

  return {
    totalClientes,
    totalProdutos,
    produtosLocados,
    produtosEstoque: totalProdutos - produtosLocados,
    receitaMes: cobrancasMes._sum.valorRecebido ?? 0,
    totalCobrancasMes: cobrancasMes._count,
    saldoDevedor: saldoDevedor._sum.saldoDevedorGerado ?? 0,
    cobrancasAtrasadas,
    cobrancasRecentes,
    conflictsPendentes,
  }
}

export default async function DashboardPage() {
  const session = await getSession()
  const data = await getDashboardData()

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div>
      <Header
        title={`${saudacao}, ${session?.user.name?.split(' ')[0]}! 👋`}
        subtitle="Aqui está o resumo do sistema hoje."
      />

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Clientes Ativos"    value={data.totalClientes}      icon="👥" color="blue"  />
        <StatCard title="Produtos Locados"   value={data.produtosLocados}     icon="🎱" color="green" />
        <StatCard title="Receita do Mês"     value={formatarMoeda(data.receitaMes)} icon="💰" color="green" subtitle={`${data.totalCobrancasMes} cobranças`} />
        <StatCard title="Saldo Devedor"      value={formatarMoeda(data.saldoDevedor)} icon="⚠️" color={data.saldoDevedor > 0 ? 'red' : 'green'} />
      </div>

      {/* Segunda linha KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Produtos"     value={data.totalProdutos}       icon="📦" color="slate" />
        <StatCard title="Em Estoque"         value={data.produtosEstoque}     icon="🏪" color="slate" />
        <StatCard title="Cobranças Atrasadas"value={data.cobrancasAtrasadas}  icon="🔴" color={data.cobrancasAtrasadas > 0 ? 'red' : 'green'} />
        <StatCard title="Conflitos de Sync"  value={data.conflictsPendentes}  icon="🔄" color={data.conflictsPendentes > 0 ? 'yellow' : 'green'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cobranças recentes */}
        <div className="lg:col-span-2 card p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Cobranças Recentes</h2>
          <CobrancasRecentesTable cobrancas={data.cobrancasRecentes} />
        </div>

        {/* Alertas */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Alertas</h2>
          <AlertasCard
            atrasadas={data.cobrancasAtrasadas}
            saldoDevedor={data.saldoDevedor}
            conflictos={data.conflictsPendentes}
          />
        </div>
      </div>
    </div>
  )
}
