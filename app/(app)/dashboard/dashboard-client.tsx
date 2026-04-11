'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Users,
  Package,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  PackageCheck,
  Clock,
  RefreshCw,
  Eye,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts'
import { KpiCard } from '@/components/ui/kpi-card'
import { StatusPagamentoBadge } from '@/components/ui/badge'
import { formatarMoeda } from '@/shared/types'

// ============================================================================
// TIPOS
// ============================================================================

interface DashboardData {
  totalClientes: number
  totalProdutos: number
  produtosLocados: number
  produtosEstoque: number
  receitaMes: number
  totalCobrancasMes: number
  variacaoReceita: number
  saldoDevedor: number
  cobrancasAtrasadas: number
  cobrancasRecentes: any[]
  conflictsPendentes: number
  distribuicaoStatus: { name: string; value: number; color: string }[]
  receitaMensal: { mes: string; valor: number }[]
  miniChartData: number[]
  topClientes: { clienteId: string; clienteNome: string; total: number; count: number }[]
}

interface DashboardClientProps {
  data: DashboardData
}

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

function CobrancasRecentesTable({ cobrancas }: { cobrancas: any[] }) {
  if (!cobrancas.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <DollarSign className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">
          Nenhuma cobrança registrada
        </h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          As cobranças aparecerão aqui assim que forem criadas
        </p>
        <Link
          href="/cobrancas"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          Criar primeira cobrança
        </Link>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto -mx-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="table-header px-6 pb-3">Cliente</th>
            <th className="table-header text-right px-6 pb-3">Valor</th>
            <th className="table-header text-center px-6 pb-3">Status</th>
            <th className="table-header text-right px-6 pb-3">Data</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {cobrancas.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
              <td className="px-6 py-4">
                <Link href={`/cobrancas/${c.id}`} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0 shadow-sm">
                    {(c.cliente?.nomeExibicao ?? c.clienteNome)?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 group-hover:text-primary-600 transition-colors">
                      {c.cliente?.nomeExibicao ?? c.clienteNome}
                    </p>
                    <p className="text-xs text-slate-400">
                      {c.produtoIdentificador}
                    </p>
                  </div>
                </Link>
              </td>
              <td className="px-6 py-4 text-right">
                <p className="font-bold text-lg text-slate-900">
                  {formatarMoeda(c.valorRecebido)}
                </p>
                {c.saldoDevedorGerado > 0 && (
                  <p className="text-xs text-red-500">
                    Saldo: {formatarMoeda(c.saldoDevedorGerado)}
                  </p>
                )}
              </td>
              <td className="px-6 py-4 text-center">
                <StatusPagamentoBadge status={c.status} />
              </td>
              <td className="px-6 py-4 text-right">
                <p className="text-slate-600">
                  {format(new Date(c.createdAt), 'dd MMM', { locale: ptBR })}
                </p>
                <p className="text-xs text-slate-400">
                  {format(new Date(c.createdAt), 'HH:mm')}
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AlertasCard({ atrasadas, saldoDevedor, conflictos }: { atrasadas: number; saldoDevedor: number; conflictos: number }) {
  const alertas = [
    {
      show: atrasadas > 0,
      icon: AlertCircle,
      title: `${atrasadas} cobrança${atrasadas > 1 ? 's' : ''} atrasada${atrasadas > 1 ? 's' : ''}`,
      desc: 'Requerem atenção imediata',
      href: '/cobrancas?status=Atrasado',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      titleColor: 'text-red-800',
    },
    {
      show: saldoDevedor > 0,
      icon: AlertTriangle,
      title: `Saldo devedor: ${formatarMoeda(saldoDevedor)}`,
      desc: 'Pagamentos parciais em aberto',
      href: '/cobrancas?status=Parcial',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      iconColor: 'text-amber-600',
      titleColor: 'text-amber-800',
    },
    {
      show: conflictos > 0,
      icon: RefreshCw,
      title: `${conflictos} conflito${conflictos > 1 ? 's' : ''} de sincronização`,
      desc: 'Requerem resolução manual',
      href: '/admin/sync',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-800',
    },
  ].filter(a => a.show)

  if (!alertas.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">
          Tudo em ordem!
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Nenhum alerta pendente
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {alertas.map((a, i) => {
        const Icon = a.icon
        return (
          <Link
            key={i}
            href={a.href}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 ${a.bgColor} ${a.borderColor} hover:shadow-md transition-all group`}
          >
            <div className={`p-2 rounded-lg bg-white/50 ${a.iconColor}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${a.titleColor}`}>
                {a.title}
              </p>
              <p className="text-xs text-slate-500">{a.desc}</p>
            </div>
            <ArrowRight className={`w-4 h-4 ${a.iconColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
          </Link>
        )
      })}
    </div>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function DashboardClient({ data }: DashboardClientProps) {
  const formatCurrency = (value: number) => formatarMoeda(value)

  return (
    <div className="space-y-6">
      {/* KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Receita do Mês"
          value={formatarMoeda(data.receitaMes)}
          subtitle={`${data.totalCobrancasMes} cobranças processadas`}
          iconName={DollarSign}
          iconColor="text-emerald-600"
          accentColor="bg-emerald-500"
          trend={{
            value: data.variacaoReceita,
            label: 'vs mês anterior',
          }}
          miniChart={{
            data: data.miniChartData,
            color: '#16A34A',
          }}
        />
        <KpiCard
          title="Clientes Ativos"
          value={data.totalClientes}
          subtitle="Total de clientes cadastrados"
          iconName={Users}
          iconColor="text-blue-600"
          accentColor="bg-blue-500"
        />
        <KpiCard
          title="Produtos Locados"
          value={data.produtosLocados}
          subtitle={`${data.produtosEstoque} em estoque`}
          iconName={Package}
          iconColor="text-purple-600"
          accentColor="bg-purple-500"
        />
        <KpiCard
          title="Saldo Devedor"
          value={formatarMoeda(data.saldoDevedor)}
          subtitle={data.saldoDevedor > 0 ? 'Valores pendentes' : 'Sem pendências'}
          iconName={AlertTriangle}
          iconColor={data.saldoDevedor > 0 ? 'text-red-600' : 'text-emerald-600'}
          accentColor={data.saldoDevedor > 0 ? 'bg-red-500' : 'bg-emerald-500'}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Receita Mensal */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Receita Mensal</h2>
              <p className="text-sm text-slate-500">Últimos 6 meses</p>
            </div>
            <Link
              href="/relatorios"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              Ver relatório completo →
            </Link>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.receitaMensal} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="mes"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Receita']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar
                  dataKey="valor"
                  fill="#2563EB"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Distribuição por Status */}
        <div className="card p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Distribuição por Status</h2>
            <p className="text-sm text-slate-500">Todas as cobranças</p>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.distribuicaoStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.distribuicaoStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [value, 'Cobranças']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {data.distribuicaoStatus.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-slate-600">{item.name}</span>
                </div>
                <span className="text-sm font-medium text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cobranças Recentes e Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cobranças Recentes */}
        <div className="lg:col-span-2 card p-6">
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

        {/* Alertas */}
        <div className="card p-6">
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

      {/* Top Clientes */}
      {data.topClientes.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Top Clientes do Mês</h2>
              <p className="text-sm text-slate-500 mt-0.5">Maiores valores de recebimento</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {data.topClientes.map((cliente, index) => (
              <Link
                key={cliente.clienteId}
                href={`/clientes/${cliente.clienteId}`}
                className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-sm font-semibold text-white shadow-sm">
                    {cliente.clienteNome?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400">#{index + 1}</p>
                    <p className="text-sm font-medium text-slate-900 truncate group-hover:text-primary-600 transition-colors">
                      {cliente.clienteNome}
                    </p>
                  </div>
                </div>
                <p className="text-lg font-bold text-slate-900">
                  {formatarMoeda(cliente.total)}
                </p>
                <p className="text-xs text-slate-500">
                  {cliente.count} cobrança{cliente.count > 1 ? 's' : ''}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Footer Stats */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-5 border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Resumo do Sistema</p>
              <p className="text-xs text-slate-500">
                {data.totalClientes} clientes • {data.totalProdutos} produtos • {data.produtosLocados} em locação
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
