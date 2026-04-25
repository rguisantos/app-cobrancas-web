'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/header'
import { IndicadorCard } from '../components/indicador-card'
import { ReportTable, TableColumn } from '../components/report-table'
import { ReportFilters, FilterConfig } from '../components/report-filters'
import { exportarCSV } from '../components/csv-export'
import { ChartCard } from '../components/chart-card'
import { formatarMoeda } from '@/shared/types'
import { Warehouse, PackageCheck, Wrench, BarChart3, Package } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const CHART_STYLE = { backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }

const CONSERVACAO_COLORS: Record<string, string> = {
  'Ótima': '#16A34A', 'Boa': '#2563EB', 'Regular': '#F59E0B', 'Ruim': '#F97316', 'Péssima': '#DC2626',
}

const STATUS_BADGE: Record<string, string> = {
  'Ativo': 'bg-green-100 text-green-700',
  'Inativo': 'bg-slate-100 text-slate-600',
  'Manutenção': 'bg-amber-100 text-amber-700',
}

export default function EstoquePage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, string>>({ periodo: 'mes' })
  const [tipoProdutoOptions, setTipoProdutoOptions] = useState<{ value: string; label: string }[]>([])
  const [estabelecimentoInput, setEstabelecimentoInput] = useState('')

  async function fetchTiposProduto() {
    try {
      const res = await fetch('/api/tipos-produto')
      const json = await res.json()
      const arr = Array.isArray(json) ? json : json.tipos || []
      setTipoProdutoOptions(arr.map((t: any) => ({ value: String(t.id), label: t.nome })))
    } catch {}
  }

  async function fetchData() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.tipoId) params.set('tipoId', filters.tipoId)
    if (filters.conservacao) params.set('conservacao', filters.conservacao)
    if (estabelecimentoInput) params.set('estabelecimento', estabelecimentoInput)
    const res = await fetch(`/api/relatorios/estoque?${params}`)
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleApply = () => fetchData()

  useEffect(() => {
    fetchTiposProduto()
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const csvColumns = [
    { key: 'identificador', label: 'Identificador' },
    { key: 'tipoNome', label: 'Tipo' },
    { key: 'descricaoNome', label: 'Descrição' },
    { key: 'tamanhoNome', label: 'Tamanho' },
    { key: 'conservacao', label: 'Conservação' },
    { key: 'estabelecimento', label: 'Estabelecimento' },
    { key: 'statusProduto', label: 'Status' },
  ]

  const handleExportCSV = () => {
    if (!data?.tabela) return
    exportarCSV(data.tabela, csvColumns, 'relatorio_estoque')
  }

  const filterConfigs: FilterConfig[] = [
    {
      key: 'tipoId',
      label: 'Tipo',
      type: 'select',
      options: [{ value: '', label: 'Todos' }, ...tipoProdutoOptions],
    },
    {
      key: 'conservacao',
      label: 'Conservação',
      type: 'select',
      options: [
        { value: '', label: 'Todas' },
        { value: 'Ótima', label: 'Ótima' },
        { value: 'Boa', label: 'Boa' },
        { value: 'Regular', label: 'Regular' },
        { value: 'Ruim', label: 'Ruim' },
        { value: 'Péssima', label: 'Péssima' },
      ],
    },
  ]

  const tableColumns: TableColumn[] = [
    { key: 'identificador', label: 'Identificador' },
    { key: 'tipoNome', label: 'Tipo' },
    { key: 'descricaoNome', label: 'Descrição' },
    { key: 'tamanhoNome', label: 'Tamanho' },
    {
      key: 'conservacao', label: 'Conservação',
      format: (v: string) => (
        <span className="inline-flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CONSERVACAO_COLORS[v] || '#94A3B8' }} />
          {v}
        </span>
      ),
    },
    { key: 'estabelecimento', label: 'Estabelecimento' },
    {
      key: 'statusProduto', label: 'Status', align: 'center',
      format: (v: string) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[v] || 'bg-slate-100 text-slate-600'}`}>
          {v}
        </span>
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

  return (
    <div className="space-y-6">
      <Header title="Relatório de Estoque" subtitle="Visão geral do inventário de produtos" />
      <ReportFilters
        filters={filterConfigs}
        values={filters}
        onFilterChange={handleFilterChange}
        onExportCSV={handleExportCSV}
        onApply={handleApply}
      />

      {/* Estabelecimento filter (text input) */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs text-slate-500">Estabelecimento:</label>
          <input
            type="text"
            value={estabelecimentoInput}
            onChange={e => setEstabelecimentoInput(e.target.value)}
            placeholder="Filtrar por estabelecimento..."
            className="input text-sm w-auto min-w-[200px]"
          />
          <button onClick={handleApply} className="btn-primary text-sm">Filtrar</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <IndicadorCard
          title="Total em Estoque"
          value={kpis.totalEstoque}
          subtitle="Produtos não locados"
          icon={Warehouse}
          iconColor="text-blue-600"
          accentColor="bg-blue-500"
        />
        <IndicadorCard
          title="Produtos Locados"
          value={kpis.totalLocados}
          icon={PackageCheck}
          iconColor="text-emerald-600"
          accentColor="bg-emerald-500"
        />
        <IndicadorCard
          title="Em Manutenção"
          value={kpis.totalManutencao}
          icon={Wrench}
          iconColor="text-amber-600"
          accentColor="bg-amber-500"
        />
        <IndicadorCard
          title="Taxa de Ocupação"
          value={`${kpis.taxaOcupacao.toFixed(1)}%`}
          icon={BarChart3}
          iconColor="text-purple-600"
          accentColor="bg-purple-500"
        />
        <IndicadorCard
          title="Produtos Disponíveis"
          value={kpis.produtosDisponiveis}
          subtitle="Prontos para locação"
          icon={Package}
          iconColor="text-green-600"
          accentColor="bg-green-500"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Estoque por Tipo" subtitle="Disponíveis, locados e em manutenção">
          {charts.estoquePorTipo.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.estoquePorTipo} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="tipoNome" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <Tooltip contentStyle={CHART_STYLE} />
                  <Legend />
                  <Bar dataKey="estoque" name="Estoque" stackId="a" fill="#2563EB" radius={[0, 0, 0, 0]} maxBarSize={50} />
                  <Bar dataKey="locado" name="Locado" stackId="a" fill="#16A34A" radius={[0, 0, 0, 0]} maxBarSize={50} />
                  <Bar dataKey="manutencao" name="Manutenção" stackId="a" fill="#F59E0B" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Nenhum produto cadastrado</p>
          )}
        </ChartCard>

        <ChartCard title="Por Conservação" subtitle="Produtos disponíveis por estado">
          {charts.estoquePorConservacao.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="h-56 w-56 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.estoquePorConservacao.map((c: any) => ({
                        name: c.conservacao,
                        value: c.count,
                      }))}
                      cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2} dataKey="value"
                    >
                      {charts.estoquePorConservacao.map((c: any, i: number) => (
                        <Cell key={i} fill={CONSERVACAO_COLORS[c.conservacao] || '#94A3B8'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, 'Produtos']} contentStyle={CHART_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {charts.estoquePorConservacao.map((c: any) => (
                  <div key={c.conservacao} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CONSERVACAO_COLORS[c.conservacao] || '#94A3B8' }} />
                      <span className="text-sm text-slate-600">{c.conservacao}</span>
                    </div>
                    <span className="text-sm font-medium text-slate-900">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Nenhum produto disponível</p>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Por Estabelecimento" subtitle="Produtos disponíveis por local">
          {charts.estoquePorEstabelecimento.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.estoquePorEstabelecimento} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="estabelecimento" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [v, 'Produtos']} contentStyle={CHART_STYLE} />
                  <Bar dataKey="count" fill="#0891B2" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Nenhum estabelecimento cadastrado</p>
          )}
        </ChartCard>

        <ChartCard title="Ocupação por Tipo" subtitle="Total vs locados com percentual">
          {charts.ocupacaoPorTipo.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.ocupacaoPorTipo} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="tipoNome" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => `${v}%`} />
                  <Tooltip contentStyle={CHART_STYLE} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="total" name="Total" fill="#CBD5E1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar yAxisId="left" dataKey="locados" name="Locados" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Nenhum dado de ocupação</p>
          )}
        </ChartCard>
      </div>

      {/* Tabela */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Produtos em Estoque</h2>
        <ReportTable columns={tableColumns} data={data.tabela} />
      </div>
    </div>
  )
}
