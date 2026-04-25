'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/header'
import { IndicadorCard } from '../components/indicador-card'
import { ReportTable, TableColumn } from '../components/report-table'
import { ReportFilters, FilterConfig } from '../components/report-filters'
import { exportarCSV } from '../components/csv-export'
import { ChartCard } from '../components/chart-card'
import { formatarMoeda } from '@/shared/types'
import { Timer, Activity, TrendingUp, Package } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts'

const CHART_STYLE = { backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }

const variacaoColors: Record<string, string> = {
  '0-50': '#16A34A',
  '51-100': '#2563EB',
  '101-200': '#F59E0B',
  '200+': '#DC2626',
}

export default function RelogiosPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, string>>({ periodo: 'mes' })

  async function fetchData() {
    setLoading(true)
    const params = new URLSearchParams(filters)
    const res = await fetch(`/api/relatorios/relogios?${params}`)
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleApply = () => fetchData()

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const csvColumns = [
    { key: 'produtoIdentificador', label: 'Produto' },
    { key: 'relogioAnterior', label: 'Relógio Anterior' },
    { key: 'relogioNovo', label: 'Relógio Novo' },
    { key: 'motivo', label: 'Motivo' },
    { key: 'dataAlteracao', label: 'Data' },
    { key: 'usuarioResponsavel', label: 'Responsável' },
  ]

  const handleExportCSV = () => {
    if (!data?.tabela) return
    exportarCSV(data.tabela, csvColumns, 'relatorio_relogios')
  }

  const filterConfigs: FilterConfig[] = []

  const tableColumns: TableColumn[] = [
    { key: 'produtoIdentificador', label: 'Produto' },
    {
      key: 'relogioAnterior', label: 'Relógio Anterior', align: 'right',
      format: (v: string) => v || '—',
    },
    {
      key: 'relogioNovo', label: 'Relógio Novo', align: 'right',
      format: (v: string) => v || '—',
    },
    { key: 'motivo', label: 'Motivo', format: (v: string) => v || '—' },
    { key: 'dataAlteracao', label: 'Data' },
    { key: 'usuarioResponsavel', label: 'Responsável', format: (v: string) => v || '—' },
  ]

  if (loading || !data) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  )

  const kpis = data.kpis
  const charts = data.charts

  // Distribuição por variação with color cells
  const distribuicaoData = (charts.distribuicaoVariacao || []).map((d: any) => ({
    ...d,
    color: variacaoColors[d.faixa] || '#94A3B8',
  }))

  return (
    <div className="space-y-6">
      <Header title="Relatório de Relógios" subtitle="Histórico de alterações de contadores e relógios" />
      <ReportFilters
        filters={filterConfigs}
        values={filters}
        onFilterChange={handleFilterChange}
        onExportCSV={handleExportCSV}
        onApply={handleApply}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <IndicadorCard
          title="Total Alterações"
          value={kpis.totalAlteracoes}
          subtitle="No período selecionado"
          icon={Timer}
          iconColor="text-blue-600"
          accentColor="bg-blue-500"
        />
        <IndicadorCard
          title="Média Fichas Rodadas"
          value={kpis.mediaFichasRodadas.toFixed(1)}
          subtitle="Média por cobrança"
          icon={Activity}
          iconColor="text-emerald-600"
          accentColor="bg-emerald-500"
        />
        <IndicadorCard
          title="Maior Variação"
          value={kpis.maiorVariacao}
          subtitle="Maior diferença registrada"
          icon={TrendingUp}
          iconColor="text-amber-600"
          accentColor="bg-amber-500"
        />
        <IndicadorCard
          title="Produtos + Alterações"
          value={kpis.produtosComMaisAlteracoes}
          subtitle="Produtos distintos alterados"
          icon={Package}
          iconColor="text-purple-600"
          accentColor="bg-purple-500"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Alterações por Mês" subtitle="Últimos 12 meses">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.alteracoesPorMes} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradAlteracoes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [v, 'Alterações']} contentStyle={CHART_STYLE} />
                <Area type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2.5} fill="url(#gradAlteracoes)" dot={{ fill: '#2563EB', strokeWidth: 2, r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Top Produtos" subtitle="Produtos com mais alterações de relógio">
          {(charts.topProdutosAlteracoes || []).length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.topProdutosAlteracoes} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="produtoIdentificador" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} width={80} />
                  <Tooltip formatter={(v: number) => [v, 'Alterações']} contentStyle={CHART_STYLE} />
                  <Bar dataKey="count" name="Alterações" fill="#2563EB" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Nenhum produto com alterações</p>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Distribuição por Variação" subtitle="Faixas de variação entre relógio anterior e novo">
          {distribuicaoData.length > 0 ? (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distribuicaoData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="faixa" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip formatter={(v: number) => [v, 'Quantidade']} contentStyle={CHART_STYLE} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={60}>
                      {distribuicaoData.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {distribuicaoData.map((item: any) => (
                  <div key={item.faixa} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-slate-600">{item.faixa} fichas</span>
                    </div>
                    <span className="text-sm font-medium text-slate-900">{item.count} alterações</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Nenhuma variação registrada</p>
          )}
        </ChartCard>

        {/* Resumo visual - Pie das faixas */}
        <ChartCard title="Resumo das Variações" subtitle="Proporção por faixa de variação">
          {distribuicaoData.some((d: any) => d.count > 0) ? (
            <div className="flex items-center gap-4">
              <div className="h-56 w-56 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribuicaoData.filter((d: any) => d.count > 0)}
                      cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2} dataKey="count"
                    >
                      {distribuicaoData.filter((d: any) => d.count > 0).map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, 'Alterações']} contentStyle={CHART_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {distribuicaoData.filter((d: any) => d.count > 0).map((item: any) => (
                  <div key={item.faixa} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-slate-600">{item.faixa} fichas</span>
                    </div>
                    <span className="text-sm font-medium text-slate-900">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Nenhuma variação registrada</p>
          )}
        </ChartCard>
      </div>

      {/* Tabela de Histórico */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Histórico de Alterações</h2>
        <ReportTable columns={tableColumns} data={data.tabela} />
      </div>
    </div>
  )
}
