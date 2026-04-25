'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  Download,
  Calendar,
  Users,
  MapPin,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { formatarMoeda } from '@/shared/types'

// ============================================================================
// TIPOS
// ============================================================================

interface RelatoriosData {
  receitaTotal: number
  cobrancasTotal: number
  cobrancasPagas: number
  saldoDevedor: number
  locacoesComSaldo: number
  ticketMedio: number
  percentualPago: number
  receitaPorRota: { rotaId: string; rotaDescricao: string; total: number; count: number }[]
  evolucaoMensal: { mes: string; valor: number; count: number }[]
  topClientes: { clienteId: string; clienteNome: string; total: number; count: number }[]
  porStatus: { status: string; count: number; valor: number }[]
}

interface RelatoriosClientProps {
  data: RelatoriosData
  periodoAtual: string
}

// ============================================================================
// COMPONENTES
// ============================================================================

function IndicadorCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  accentColor,
  trend,
}: {
  title: string
  value: string
  subtitle?: string
  icon: typeof DollarSign
  iconColor: string
  accentColor: string
  trend?: { value: number; label: string }
}) {
  return (
    <div className={`relative bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden`}>
      <div className={`absolute top-0 left-0 right-0 h-1 ${accentColor}`} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className={`p-2 rounded-lg bg-slate-100 ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend.value >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {Math.abs(trend.value)}% {trend.label}
          </div>
        )}
      </div>
    </div>
  )
}

const statusColors: Record<string, string> = {
  Pago: '#16A34A',
  Parcial: '#F59E0B',
  Pendente: '#2563EB',
  Atrasado: '#DC2626',
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function RelatoriosClient({ data, periodoAtual }: RelatoriosClientProps) {
  const router = useRouter()
  const [periodo, setPeriodo] = useState(periodoAtual)
  const [showPersonalizado, setShowPersonalizado] = useState(periodoAtual === 'personalizado')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const handlePeriodoChange = (novoPeriodo: string) => {
    setPeriodo(novoPeriodo)
    setShowPersonalizado(novoPeriodo === 'personalizado')
    
    if (novoPeriodo !== 'personalizado') {
      const params = new URLSearchParams()
      params.set('periodo', novoPeriodo)
      router.push(`/relatorios?${params.toString()}`)
    }
  }

  const aplicarPeriodoPersonalizado = () => {
    if (dataInicio && dataFim) {
      const params = new URLSearchParams()
      params.set('periodo', 'personalizado')
      params.set('dataInicio', dataInicio)
      params.set('dataFim', dataFim)
      router.push(`/relatorios?${params.toString()}`)
    }
  }

  const exportarRelatorio = (formato: 'pdf' | 'csv') => {
    const params = new URLSearchParams()
    params.set('formato', formato)
    params.set('periodo', periodo)
    if (periodo === 'personalizado' && dataInicio) params.set('dataInicio', dataInicio)
    if (periodo === 'personalizado' && dataFim) params.set('dataFim', dataFim)
    
    window.open(`/api/relatorios/financeiro/exportar?${params.toString()}`, '_blank')
  }

  const formatCurrency = (value: number) => formatarMoeda(value)

  return (
    <div className="space-y-6">
      {/* Seletor de período */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Calendar className="w-4 h-4" />
            Período:
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'mes', label: 'Este mês' },
              { value: 'trimestre', label: 'Último trimestre' },
              { value: 'ano', label: 'Este ano' },
              { value: 'personalizado', label: 'Personalizado' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => handlePeriodoChange(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  periodo === opt.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        
        {showPersonalizado && (
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-slate-200">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Data Início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                className="input text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Data Fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
                className="input text-sm"
              />
            </div>
            <button
              onClick={aplicarPeriodoPersonalizado}
              className="btn-primary text-sm mt-5"
            >
              Aplicar
            </button>
          </div>
        )}
      </div>

      {/* Indicadores de Saúde */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <IndicadorCard
          title="Receita Total"
          value={formatCurrency(data.receitaTotal)}
          subtitle={`${data.cobrancasTotal} cobranças`}
          icon={DollarSign}
          iconColor="text-emerald-600"
          accentColor="bg-emerald-500"
        />
        <IndicadorCard
          title="Taxa de Pagamento"
          value={`${data.percentualPago.toFixed(1)}%`}
          subtitle={`${data.cobrancasPagas} de ${data.cobrancasTotal} pagas`}
          icon={CheckCircle}
          iconColor="text-blue-600"
          accentColor="bg-blue-500"
        />
        <IndicadorCard
          title="Ticket Médio"
          value={formatCurrency(data.ticketMedio)}
          subtitle="Valor médio por cobrança"
          icon={TrendingUp}
          iconColor="text-purple-600"
          accentColor="bg-purple-500"
        />
        <IndicadorCard
          title="Saldo Devedor"
          value={formatCurrency(data.saldoDevedor)}
          subtitle={`${data.locacoesComSaldo} locações em aberto`}
          icon={AlertTriangle}
          iconColor={data.saldoDevedor > 0 ? 'text-red-600' : 'text-emerald-600'}
          accentColor={data.saldoDevedor > 0 ? 'bg-red-500' : 'bg-emerald-500'}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução Mensal */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Evolução da Receita</h2>
              <p className="text-sm text-slate-500">Últimos 6 meses</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.evolucaoMensal} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                <Line
                  type="monotone"
                  dataKey="valor"
                  stroke="#2563EB"
                  strokeWidth={3}
                  dot={{ fill: '#2563EB', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#2563EB' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição por Status */}
        <div className="card p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Distribuição por Status</h2>
            <p className="text-sm text-slate-500">Todas as cobranças do período</p>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.porStatus.map(s => ({ name: s.status, value: s.count, color: statusColors[s.status] || '#94A3B8' }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.porStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={statusColors[entry.status] || '#94A3B8'} />
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
            {data.porStatus.map(item => (
              <div key={item.status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: statusColors[item.status] || '#94A3B8' }}
                  />
                  <span className="text-sm text-slate-600">{item.status}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-slate-900">{item.count}</span>
                  <span className="text-xs text-slate-400 ml-2">({formatCurrency(item.valor)})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Receita por Rota e Top Clientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receita por Rota */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Receita por Rota</h2>
              <p className="text-sm text-slate-500">Distribuição por área de atuação</p>
            </div>
            <MapPin className="w-5 h-5 text-slate-400" />
          </div>
          {data.receitaPorRota.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.receitaPorRota}
                  layout="vertical"
                  margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="rotaDescricao"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    width={100}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Receita']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="total" fill="#2563EB" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <MapPin className="w-8 h-8 mb-2" />
              <p className="text-sm">Nenhuma rota cadastrada</p>
            </div>
          )}
        </div>

        {/* Top Clientes */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Top Clientes</h2>
              <p className="text-sm text-slate-500">Maiores valores do período</p>
            </div>
            <Users className="w-5 h-5 text-slate-400" />
          </div>
          {data.topClientes.length > 0 ? (
            <div className="space-y-3">
              {data.topClientes.map((cliente, index) => (
                <Link
                  key={cliente.clienteId}
                  href={`/clientes/${cliente.clienteId}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate group-hover:text-primary-600 transition-colors">
                      {cliente.clienteNome}
                    </p>
                    <p className="text-xs text-slate-400">{cliente.count} cobranças</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(cliente.total)}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Users className="w-8 h-8 mb-2" />
              <p className="text-sm">Nenhum cliente no período</p>
            </div>
          )}
        </div>
      </div>

      {/* Botões Exportar */}
      <div className="flex justify-end gap-2">
        <button
          onClick={() => exportarRelatorio('csv')}
          className="btn-secondary flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
        <button
          onClick={() => exportarRelatorio('pdf')}
          className="btn-primary flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar PDF
        </button>
      </div>
    </div>
  )
}
