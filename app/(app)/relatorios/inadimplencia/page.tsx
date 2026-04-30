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
import { AlertTriangle, CreditCard, Clock, TrendingDown } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts'

const CHART_STYLE = { backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }

const faixaColors: Record<string, string> = {
  '0-30': '#F59E0B',
  '31-60': '#F97316',
  '61-90': '#EF4444',
  '90+': '#991B1B',
}

export default function InadimplenciaPage() {
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
    const res = await fetch(`/api/relatorios/inadimplencia?${params}`)
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
    { key: 'saldoDevedorGerado', label: 'Valor Devido' },
    { key: 'diasAtraso', label: 'Dias em Atraso' },
    { key: 'rotaNome', label: 'Rota' },
    { key: 'status', label: 'Status' },
  ]

  const handleExportCSV = () => {
    if (!data?.tabela) return
    exportarCSV(data.tabela, csvColumns, 'relatorio_inadimplencia')
  }

  const filterConfigs: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: '', label: 'Todos' },
        { value: 'Atrasado', label: 'Atrasado' },
        { value: 'Parcial', label: 'Parcial' },
        { value: 'Pendente', label: 'Pendente' },
      ],
    },
    {
      key: 'rotaId',
      label: 'Rota',
      type: 'select',
      options: [{ value: '', label: 'Todas' }, ...rotaOptions],
    },
  ]

  const tableColumns: TableColumn[] = [
    { key: 'clienteNome', label: 'Cliente' },
    { key: 'produtoIdentificador', label: 'Produto' },
    {
      key: 'saldoDevedorGerado', label: 'Valor Devido', align: 'right',
      format: (v: number) => <span className="font-medium text-red-600">{formatarMoeda(v)}</span>,
    },
    {
      key: 'diasAtraso', label: 'Dias em Atraso', align: 'right',
      format: (v: number) => {
        const color = v <= 30 ? 'text-amber-600' : v <= 60 ? 'text-orange-600' : v <= 90 ? 'text-red-600' : 'text-red-800'
        return <span className={`font-semibold ${color}`}>{v} dia{v !== 1 ? 's' : ''}</span>
      },
    },
    { key: 'rotaNome', label: 'Rota', format: (v: string) => v || '—' },
    {
      key: 'status', label: 'Status',
      format: (v: string) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
          v === 'Atrasado' ? 'bg-red-100 text-red-700' :
          v === 'Parcial' ? 'bg-amber-100 text-amber-700' :
          'bg-blue-100 text-blue-700'
        }`}>{v}</span>
      ),
    },
  ]

  if (loading || !data) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  )

  const kpis = data.kpis
  const charts = data.charts

  // Evolução da Inadimplência
  const inadimplenciaEvolucaoData = (charts.evolucaoInadimplencia || []).map((m: any) => ({
    mes: m.mes,
    total: m.valor ?? m.total,
    cobrancas: m.count,
  }))

  // Inadimplência por Rota
  const inadimplenciaPorRotaData = (charts.inadimplenciaPorRota || [])
    .filter((r: any) => r.total > 0)
    .map((r: any) => ({
      rota: r.rotaDescricao.length > 20 ? r.rotaDescricao.substring(0, 20) + '…' : r.rotaDescricao,
      total: r.total,
      cobrancas: r.count,
    }))

  // Distribuição por Faixa de Atraso
  const faixaOrder = ['0-30', '31-60', '61-90', '90+']
  const inadimplenciaPorFaixaData = faixaOrder.map(f => {
    const found = (charts.distribuicaoDiasAtraso || []).find((g: any) => g.faixa === f)
    return {
      faixa: f,
      count: found?.count ?? 0,
      total: found?.total ?? 0,
      color: faixaColors[f],
    }
  }).filter(f => f.count > 0 || f.total > 0)

  // Top 10 Devedores
  const topDevedoresData = (charts.topDevedores || []).map((d: any) => ({
    name: d.clienteNome.length > 18 ? d.clienteNome.substring(0, 18) + '…' : d.clienteNome,
    devido: d.totalDevido,
    cobrancas: d.cobrancas,
  }))

  return (
    <div className="space-y-6">
      <Header title="Relatório de Inadimplência" subtitle="Análise de cobranças atrasadas e saldo devedor" />
      <ReportFilters
        filters={filterConfigs}
        values={filters}
        onFilterChange={handleFilterChange}
        onExportCSV={handleExportCSV}
        onApply={handleApply}
      />

      {/* KPIs - 4 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <IndicadorCard
          title="Total Saldo Devedor"
          value={formatarMoeda(kpis.totalSaldoDevedor)}
          subtitle="Valores pendentes de pagamento"
          icon={AlertTriangle}
          iconColor="text-red-600"
          accentColor="bg-red-500"
        />
        <IndicadorCard
          title="Locações com Débito"
          value={kpis.locacoesComDebito}
          subtitle="Locações com saldo em aberto"
          icon={CreditCard}
          iconColor="text-amber-600"
          accentColor="bg-amber-500"
        />
        <IndicadorCard
          title="Cobranças Atrasadas"
          value={kpis.cobrancasAtrasadas}
          subtitle="Cobranças pendentes"
          icon={Clock}
          iconColor="text-orange-600"
          accentColor="bg-orange-500"
        />
        <IndicadorCard
          title="Dias Médios de Atraso"
          value={kpis.diasMediosAtraso}
          subtitle="Média geral de atraso"
          icon={TrendingDown}
          iconColor="text-rose-600"
          accentColor="bg-rose-500"
        />
      </div>

      {/* Charts Row 1 - Evolução + Inadimplência por Rota */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Evolução da Inadimplência" subtitle="Saldo devedor por mês nos últimos 12 meses">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={inadimplenciaEvolucaoData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="inadGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#DC2626" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#DC2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'total') return [formatarMoeda(value), 'Saldo Devedor']
                    return [value, 'Cobranças']
                  }}
                  contentStyle={CHART_STYLE}
                />
                <Area type="monotone" dataKey="total" stroke="#DC2626" strokeWidth={3} fill="url(#inadGradient)" dot={{ fill: '#DC2626', strokeWidth: 2, r: 3 }} activeDot={{ r: 6, fill: '#DC2626' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Inadimplência por Rota" subtitle="Saldo devedor por área">
          {inadimplenciaPorRotaData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inadimplenciaPorRotaData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="rota" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} width={120} />
                  <Tooltip formatter={(v: number) => [formatarMoeda(v), 'Saldo Devedor']} contentStyle={CHART_STYLE} />
                  <Bar dataKey="total" fill="#DC2626" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <AlertTriangle className="w-8 h-8 mb-2" />
              <p className="text-sm">Nenhuma inadimplência por rota</p>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2 - Distribuição por Faixa + Top Devedores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Distribuição por Dias de Atraso" subtitle="Cobranças agrupadas por faixa de atraso">
          {inadimplenciaPorFaixaData.length > 0 ? (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={inadimplenciaPorFaixaData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="faixa" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'total') return [formatarMoeda(value), 'Valor Devido']
                        return [value, 'Cobranças']
                      }}
                      contentStyle={CHART_STYLE}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={60}>
                      {inadimplenciaPorFaixaData.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {inadimplenciaPorFaixaData.map((item: any) => (
                  <div key={item.faixa} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-slate-600">{item.faixa} dias</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-slate-900">{item.count} cobranças</span>
                      <span className="text-xs text-slate-400 ml-2">({formatarMoeda(item.total)})</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <AlertTriangle className="w-8 h-8 mb-2" />
              <p className="text-sm">Nenhuma inadimplência registrada</p>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Top 10 Devedores" subtitle="Clientes com maior saldo devedor">
          {topDevedoresData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDevedoresData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} width={120} />
                  <Tooltip formatter={(v: number) => [formatarMoeda(v), 'Débito']} contentStyle={CHART_STYLE} />
                  <Bar dataKey="devido" fill="#DC2626" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <AlertTriangle className="w-8 h-8 mb-2" />
              <p className="text-sm">Nenhum devedor registrado</p>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Tabela de Cobranças Pendentes */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Cobranças Pendentes</h2>
        <ReportTable columns={tableColumns} data={data.tabela} />
      </div>
    </div>
  )
}
