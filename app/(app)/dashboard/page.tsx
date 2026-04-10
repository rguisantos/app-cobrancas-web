import { Metadata } from 'next'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Header from '@/components/layout/header'
import StatCard from '@/components/ui/stat-card'
import { formatarMoeda } from '@/shared/types'
import CobrancasRecentesTable from './cobrancas-recentes'
import AlertasCard from './alertas-card'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Dashboard' }
// revalidate removido — dados financeiros não devem ser cacheados entre usuários

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
    // Saldo correto: somente a última cobrança por locação (evita duplicação)
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
    saldoDevedor: saldoDevedor[0]?.total ?? 0,
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
    <div className="space-y-6">
      <Header
        title={`${saudacao}, ${session?.user.name?.split(' ')[0]}!`}
        subtitle="Veja o resumo completo do seu negócio"
      />

      {/* Main KPIs - First Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Clientes Ativos" 
          value={data.totalClientes} 
          iconName="users" 
          color="blue"
          subtitle="Total de clientes cadastrados"
        />
        <StatCard 
          title="Produtos Locados" 
          value={data.produtosLocados} 
          iconName="package" 
          color="green"
          subtitle="Em locação no momento"
        />
        <StatCard 
          title="Receita do Mês" 
          value={formatarMoeda(data.receitaMes)} 
          iconName="dollar" 
          color="green"
          subtitle={`${data.totalCobrancasMes} cobranças processadas`}
          trend="up"
        />
        <StatCard 
          title="Saldo Devedor" 
          value={formatarMoeda(data.saldoDevedor)} 
          iconName="alert" 
          color={data.saldoDevedor > 0 ? 'red' : 'green'}
          subtitle={data.saldoDevedor > 0 ? 'Valores pendentes' : 'Sem pendências'}
        />
      </div>

      {/* Secondary KPIs - Second Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Produtos" 
          value={data.totalProdutos} 
          iconName="package" 
          color="slate"
          subtitle="Catálogo completo"
        />
        <StatCard 
          title="Em Estoque" 
          value={data.produtosEstoque} 
          iconName="packageCheck" 
          color="yellow"
          subtitle="Disponíveis para locação"
        />
        <StatCard 
          title="Cobranças Atrasadas" 
          value={data.cobrancasAtrasadas} 
          iconName="clock" 
          color={data.cobrancasAtrasadas > 0 ? 'red' : 'green'}
          subtitle={data.cobrancasAtrasadas > 0 ? 'Requer atenção' : 'Em dia'}
        />
        <StatCard 
          title="Conflitos de Sync" 
          value={data.conflictsPendentes} 
          iconName="refresh" 
          color={data.conflictsPendentes > 0 ? 'yellow' : 'green'}
          subtitle={data.conflictsPendentes > 0 ? 'Resolução pendente' : 'Sincronizado'}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cobranças Recentes - Takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Cobranças Recentes</h2>
                <p className="text-sm text-slate-500 mt-0.5">Últimas transações registradas</p>
              </div>
              <Link
                href="/cobrancas"
                className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
              >
                Ver todas →
              </Link>
            </div>
            <CobrancasRecentesTable cobrancas={data.cobrancasRecentes} />
          </div>
        </div>

        {/* Alertas - Takes 1 column */}
        <div className="lg:col-span-1">
          <div className="card p-6 h-full">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">Alertas</h2>
              <p className="text-sm text-slate-500 mt-0.5">Itens que precisam de atenção</p>
            </div>
            <AlertasCard
              atrasadas={data.cobrancasAtrasadas}
              saldoDevedor={data.saldoDevedor}
              conflictos={data.conflictsPendentes}
            />
          </div>
        </div>
      </div>

      {/* Quick Stats Footer */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-5 border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <span className="text-lg">📊</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Resumo do Sistema</p>
              <p className="text-xs text-slate-500">
                {data.totalClientes} clientes • {data.totalProdutos} produtos • Última atualização: agora
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Sistema Online
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
