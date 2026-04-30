'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/header'
import { IndicadorCard } from '../components/indicador-card'
import { ReportTable, TableColumn } from '../components/report-table'
import { ReportFilters, FilterConfig } from '../components/report-filters'
import { exportarCSV } from '../components/csv-export'
import { ChartCard } from '../components/chart-card'
import { formatarMoeda } from '@/shared/types'
import { extractArray } from '@/lib/utils'
import { DollarSign, TrendingUp, CreditCard, CheckCircle, AlertTriangle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend, LineChart, Line,
} from 'recharts'

const CHART_STYLE = { backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }

const PIE_COLORS = ['#2563EB', '#7C3AED', '#0891B2']

const formaPagamentoLabels: Record<string, string> = {
  Periodo: 'Período', PercentualPagar: '% a Pagar', PercentualReceber: '% a Receber',
}

export default function RecebimentosPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, string>>({ periodo: 'mes' })
  const [rotaOptions, setRotaOptions] = useState<{ value: string; label: string }[]>([])

  async function fetchRotas() {
    try {
      const res = await fetch('/api/rotas')
      const json = await res.json()
      const rotasList = extractArray(json)
      setRotaOptions(rotasList.map((r: any) => ({ value: String(r.id), label: r.descricao })))
    } catch {}
  }

  async function fetchData() {
    setLoading(true)
    const params = new URLSearchParams(filters)
    const res = await fetch(`/api/relatorios/recebimentos?${params}`)
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleApply = () => fetchData()

  useEffect(() => {
    fetchRotas()
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const csvColumns = [
    { key: 'clienteNome', label: 'Cliente' },
    { key: 'produtoIdentificador', label: 'Produto' },
    { key: 'dataPagamento', label: 'Data Pagamento' },
    { key: 'valorRecebido', label: 'Valor Recebido' },
    { key: 'formaPagamento', label: 'Forma Pagto' },
    { key: 'rotaNome', label: 'Rota' },
  ]

  const handleExportCSV = () => {
    if (!data?.tabela) return
    exportarCSV(data.tabela, csvColumns, 'relatorio_recebimentos')
  }

  const filterConfigs: FilterConfig[] = [
    {
      key: 'rotaId',
      label: 'Rota',
      type: 'select',
      options: [{ value: '', label: 'Todas' }, ...rotaOptions],
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: '', label: 'Todos' },
        { value: 'Pago', label: 'Pago' },
        { value: 'Parcial', label: 'Parcial' },
      ],
    },
  ]

  const tableColumns: TableColumn[] = [
    { key: 'clienteNome', label: 'Cliente' },
    { key: 'produtoIdentificador', label: 'Produto' },
    { key: 'dataPagamento', label: 'Data Pagamento' },
    {
      key: 'valorRecebido', label: 'Valor Recebido', align: 'right',
      format: (v: number) => formatarMoeda(v),
    },
    {
      key: 'formaPagamento', label: 'Forma Pagto',
      format: (v: string) => formaPagamentoLabels[v] || v,
    },
    { key: 'rotaNome', label: 'Rota' },
  ]

  if (loading || !data) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  )

  const kpis = data.kpis
  const charts = data.charts

  return (
    <div className="space-y-6">
      <Header title="Relatório de Recebimentos" subtitle="Análise detalhada dos recebimentos do período" />
      <ReportFilters
        filters={filterConfigs}
        values={filters}
        onFilterChange={handleFilterChange}
        onExportCSV={handleExportCSV}
        onApply={handleApply}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <IndicadorCard
          title="Total Recebido"
          value={formatarMoeda(kpis.totalRecebido)}
          icon={DollarSign}
          iconColor="text-emerald-600"
          accentColor="bg-emerald-500"
        />
        <IndicadorCard
          title="Média por Recebimento"
          value={formatarMoeda(kpis.mediaPorRecebimento)}
          icon={TrendingUp}
          iconColor="text-blue-600"
          accentColor="bg-blue-500"
        />
        <IndicadorCard
          title="Recebimentos no Período"
          value={kpis.recebimentosNoPeriodo}
          subtitle="cobranças pagas"
          icon={CreditCard}
          iconColor="text-purple-600"
          accentColor="bg-purple-500"
        />
        <IndicadorCard
          title="Taxa de Recebimento"
          value={`${kpis.taxaRecebimento.toFixed(1)}%`}
          icon={CheckCircle}
          iconColor="text-green-600"
          accentColor="bg-green-500"
        />
        <IndicadorCard
          title="Receita Pendente"
          value={formatarMoeda(kpis.receitaPendente)}
          icon={AlertTriangle}
          iconColor={kpis.receitaPendente > 0 ? 'text-red-600' : 'text-green-600'}
          accentColor={kpis.receitaPendente > 0 ? 'bg-red-500' : 'bg-green-500'}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Recebimentos por Mês" subtitle="Últimos 12 meses">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.recebimentosPorMes} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRecebimentos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [formatarMoeda(v), 'Total']} contentStyle={CHART_STYLE} />
                <Area type="monotone" dataKey="total" stroke="#2563EB" strokeWidth={2.5} fill="url(#gradRecebimentos)" dot={{ fill: '#2563EB', strokeWidth: 2, r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Por Forma de Pagamento" subtitle="Distribuição dos recebimentos">
          {charts.recebimentosPorFormaPagamento.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="h-56 w-56 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.recebimentosPorFormaPagamento.map((f: any) => ({
                        name: formaPagamentoLabels[f.formaPagamento] || f.formaPagamento,
                        value: f.total,
                      }))}
                      cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2} dataKey="value"
                    >
                      {charts.recebimentosPorFormaPagamento.map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [formatarMoeda(v), 'Recebido']} contentStyle={CHART_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {charts.recebimentosPorFormaPagamento.map((f: any, i: number) => (
                  <div key={f.formaPagamento} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-sm text-slate-600">{formaPagamentoLabels[f.formaPagamento] || f.formaPagamento}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-slate-900">{formatarMoeda(f.total)}</span>
                      <span className="text-xs text-slate-400 ml-2">({f.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Nenhum recebimento registrado</p>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Comparativo Recebido vs Pendente" subtitle="Últimos 12 meses">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.comparativoRecebidoPendente} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [formatarMoeda(v), '']} contentStyle={CHART_STYLE} />
                <Legend />
                <Bar dataKey="recebido" name="Recebido" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="pendente" name="Pendente" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Ticket Médio por Mês" subtitle="Valor médio por recebimento">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.ticketMedioPorMes} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(1)}k`} />
                <Tooltip formatter={(v: number) => [formatarMoeda(v), 'Ticket Médio']} contentStyle={CHART_STYLE} />
                <Line type="monotone" dataKey="ticketMedio" stroke="#7C3AED" strokeWidth={2.5} dot={{ fill: '#7C3AED', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Tabela */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Recebimentos do Período</h2>
        <ReportTable columns={tableColumns} data={data.tabela} />
      </div>
    </div>
  )
}
