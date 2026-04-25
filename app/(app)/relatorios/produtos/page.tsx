'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/header'
import { IndicadorCard } from '../components/indicador-card'
import { ReportTable, TableColumn } from '../components/report-table'
import { ReportFilters, FilterConfig } from '../components/report-filters'
import { exportarCSV } from '../components/csv-export'
import { ChartCard } from '../components/chart-card'
import { formatarMoeda } from '@/shared/types'
import { Package, PackageCheck, Warehouse, Wrench, BarChart3 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

const CHART_STYLE = { backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }

const statusProdutoColors: Record<string, string> = {
  Ativo: '#16A34A',
  Inativo: '#94A3B8',
  'Manutenção': '#F59E0B',
}

const conservacaoColors: Record<string, string> = {
  'Ótima': '#16A34A',
  'Boa': '#2563EB',
  'Regular': '#F59E0B',
  'Ruim': '#F97316',
  'Péssima': '#DC2626',
}

export default function ProdutosPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, string>>({ periodo: 'mes' })

  async function fetchData() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.status && filters.status !== 'Todos') params.set('status', filters.status)
    if (filters.periodo) params.set('periodo', filters.periodo)
    if (filters.dataInicio) params.set('dataInicio', filters.dataInicio)
    if (filters.dataFim) params.set('dataFim', filters.dataFim)
    const res = await fetch(`/api/relatorios/produtos?${params}`)
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
    { key: 'identificador', label: 'Identificador' },
    { key: 'tipoNome', label: 'Tipo' },
    { key: 'descricaoNome', label: 'Descrição' },
    { key: 'tamanhoNome', label: 'Tamanho' },
    { key: 'statusProduto', label: 'Status' },
    { key: 'conservacao', label: 'Conservação' },
    { key: 'numeroRelogio', label: 'Nº Relógio' },
    { key: 'clienteAtual', label: 'Cliente Atual' },
  ]

  const handleExportCSV = () => {
    if (!data?.tabela) return
    exportarCSV(data.tabela, csvColumns, 'relatorio_produtos')
  }

  const filterConfigs: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'Todos', label: 'Todos' },
        { value: 'Ativo', label: 'Ativo' },
        { value: 'Inativo', label: 'Inativo' },
        { value: 'Manutenção', label: 'Manutenção' },
      ],
    },
  ]

  const tableColumns: TableColumn[] = [
    { key: 'identificador', label: 'Identificador', format: (v: string) => `#${v}` },
    { key: 'tipoNome', label: 'Tipo' },
    { key: 'descricaoNome', label: 'Descrição' },
    { key: 'tamanhoNome', label: 'Tamanho' },
    {
      key: 'statusProduto', label: 'Status',
      format: (v: string) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
          v === 'Ativo' ? 'bg-green-100 text-green-700' :
          v === 'Manutenção' ? 'bg-amber-100 text-amber-700' :
          'bg-slate-100 text-slate-700'
        }`}>{v}</span>
      ),
    },
    {
      key: 'conservacao', label: 'Conservação',
      format: (v: string) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: conservacaoColors[v] || '#94A3B8' }} />
          {v}
        </span>
      ),
    },
    { key: 'numeroRelogio', label: 'Nº Relógio' },
    {
      key: 'clienteAtual', label: 'Cliente Atual',
      format: (v: string | null) => v ? (
        <span className="text-sm font-medium text-primary-600">{v}</span>
      ) : (
        <span className="text-sm text-slate-400">—</span>
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

  // Pie chart data - Distribuição por Status
  const statusChartData = (charts.distribuicaoStatus || []).map((s: any) => ({
    name: s.statusProduto,
    value: s.count,
    color: statusProdutoColors[s.statusProduto] || '#94A3B8',
  }))

  // Bar chart data - Distribuição por Tipo
  const tipoChartData = (charts.distribuicaoTipo || []).slice(0, 10).map((t: any) => ({
    tipoNome: t.tipoNome,
    count: t.count,
  }))

  // Bar chart data - Distribuição por Conservação (ordered)
  const conservacaoOrder = ['Ótima', 'Boa', 'Regular', 'Ruim', 'Péssima']
  const conservacaoChartData = conservacaoOrder
    .map(c => {
      const found = (charts.distribuicaoConservacao || []).find((g: any) => g.conservacao === c)
      return { conservacao: c, count: found?.count ?? 0, color: conservacaoColors[c] }
    })
    .filter(c => c.count > 0)

  // Top produtos por receita - horizontal bar
  const topProdutosData = (charts.topProdutosReceita || []).map((p: any) => ({
    name: `${p.tipoNome} #${p.identificador}`,
    receita: p.receita,
    cobrancas: p.cobrancas,
  }))

  return (
    <div className="space-y-6">
      <Header title="Relatório de Produtos" subtitle="Análise de produtos, status e receita" />
      <ReportFilters
        filters={filterConfigs}
        values={filters}
        onFilterChange={handleFilterChange}
        onExportCSV={handleExportCSV}
        onApply={handleApply}
      />

      {/* KPIs - 5 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <IndicadorCard
          title="Total Produtos"
          value={kpis.totalProdutos}
          subtitle="Produtos cadastrados"
          icon={Package}
          iconColor="text-blue-600"
          accentColor="bg-blue-500"
        />
        <IndicadorCard
          title="Produtos Locados"
          value={kpis.produtosLocados}
          subtitle="Com locação ativa"
          icon={PackageCheck}
          iconColor="text-emerald-600"
          accentColor="bg-emerald-500"
        />
        <IndicadorCard
          title="Produtos em Estoque"
          value={kpis.produtosEstoque}
          subtitle="Disponíveis para locação"
          icon={Warehouse}
          iconColor="text-slate-600"
          accentColor="bg-slate-500"
        />
        <IndicadorCard
          title="Em Manutenção"
          value={kpis.produtosManutencao}
          subtitle="Indisponíveis temporariamente"
          icon={Wrench}
          iconColor="text-amber-600"
          accentColor="bg-amber-500"
        />
        <IndicadorCard
          title="Taxa de Ocupação"
          value={`${kpis.taxaOcupacao.toFixed(1)}%`}
          subtitle="Locados / Total"
          icon={BarChart3}
          iconColor="text-purple-600"
          accentColor="bg-purple-500"
        />
      </div>

      {/* Charts Row 1 - Status + Tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Distribuição por Status" subtitle="Situação atual dos produtos">
          <div className="flex items-center gap-4">
            <div className="h-48 w-48 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                    {statusChartData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, 'Produtos']} contentStyle={CHART_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {statusChartData.map((item: any) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-slate-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Distribuição por Tipo" subtitle="Quantidade por categoria">
          {tipoChartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tipoChartData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="tipoNome" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [v, 'Produtos']} contentStyle={CHART_STYLE} />
                  <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Package className="w-8 h-8 mb-2" />
              <p className="text-sm">Nenhum produto cadastrado</p>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2 - Conservação + Ranking Receita */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Distribuição por Conservação" subtitle="Estado de conservação dos produtos">
          {conservacaoChartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conservacaoChartData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="conservacao" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [v, 'Produtos']} contentStyle={CHART_STYLE} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={50}>
                    {conservacaoChartData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Package className="w-8 h-8 mb-2" />
              <p className="text-sm">Nenhum dado disponível</p>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Ranking por Receita" subtitle="Top 10 produtos com maior receita">
          {topProdutosData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProdutosData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} width={120} />
                  <Tooltip formatter={(v: number) => [formatarMoeda(v), 'Receita']} contentStyle={CHART_STYLE} />
                  <Bar dataKey="receita" fill="#7C3AED" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Package className="w-8 h-8 mb-2" />
              <p className="text-sm">Nenhum dado disponível</p>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Tabela de Produtos */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Produtos</h2>
        <ReportTable columns={tableColumns} data={data.tabela} />
      </div>
    </div>
  )
}
