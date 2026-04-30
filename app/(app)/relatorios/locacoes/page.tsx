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
import { FileText, FileCheck, FileX, Clock, DollarSign } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts'

const CHART_STYLE = { backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }

const PIE_COLORS = ['#2563EB', '#7C3AED', '#0891B2']

const formaPagamentoLabels: Record<string, string> = {
  Periodo: 'Período', PercentualPagar: '% a Pagar', PercentualReceber: '% a Receber',
}

const statusBadgeClasses: Record<string, string> = {
  Ativa: 'bg-green-100 text-green-700',
  Finalizada: 'bg-slate-100 text-slate-600',
  Cancelada: 'bg-red-100 text-red-700',
}

export default function LocacoesPage() {
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
    const res = await fetch(`/api/relatorios/locacoes?${params}`)
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
    { key: 'produtoTipo', label: 'Tipo' },
    { key: 'dataLocacao', label: 'Data Locação' },
    { key: 'dataFim', label: 'Data Fim' },
    { key: 'formaPagamento', label: 'Forma Pagto' },
    { key: 'percentualEmpresa', label: '% Empresa' },
    { key: 'precoFicha', label: 'Preço Ficha' },
    { key: 'valorFixo', label: 'Valor Fixo' },
    { key: 'status', label: 'Status' },
    { key: 'rotaNome', label: 'Rota' },
  ]

  const handleExportCSV = () => {
    if (!data?.tabela) return
    exportarCSV(data.tabela, csvColumns, 'relatorio_locacoes')
  }

  const filterConfigs: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: '', label: 'Todas' },
        { value: 'Ativa', label: 'Ativa' },
        { value: 'Finalizada', label: 'Finalizada' },
        { value: 'Cancelada', label: 'Cancelada' },
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
    { key: 'produtoTipo', label: 'Tipo' },
    { key: 'dataLocacao', label: 'Data Locação' },
    { key: 'dataFim', label: 'Data Fim' },
    {
      key: 'formaPagamento', label: 'Forma Pagto',
      format: (v: string) => formaPagamentoLabels[v] || v,
    },
    {
      key: 'percentualEmpresa', label: '% Empresa', align: 'right',
      format: (v: number) => v != null ? `${v}%` : '',
    },
    {
      key: 'precoFicha', label: 'Preço Ficha', align: 'right',
      format: (v: number) => v != null ? formatarMoeda(v) : '',
    },
    {
      key: 'valorFixo', label: 'Valor Fixo', align: 'right',
      format: (v: number) => v != null ? formatarMoeda(v) : '',
    },
    {
      key: 'status', label: 'Status', align: 'center',
      format: (v: string) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClasses[v] || 'bg-slate-100 text-slate-600'}`}>
          {v}
        </span>
      ),
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
      <Header title="Relatório de Locações" subtitle="Análise detalhada das locações do período" />
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
          title="Locações Ativas"
          value={kpis.totalLocacoesAtivas}
          icon={FileText}
          iconColor="text-emerald-600"
          accentColor="bg-emerald-500"
        />
        <IndicadorCard
          title="Finalizadas"
          value={kpis.totalLocacoesFinalizadas}
          icon={FileCheck}
          iconColor="text-slate-600"
          accentColor="bg-slate-500"
        />
        <IndicadorCard
          title="Canceladas"
          value={kpis.totalLocacoesCanceladas}
          icon={FileX}
          iconColor="text-red-600"
          accentColor="bg-red-500"
        />
        <IndicadorCard
          title="Duração Média"
          value={`${kpis.duracaoMediaDias} dias`}
          icon={Clock}
          iconColor="text-blue-600"
          accentColor="bg-blue-500"
        />
        <IndicadorCard
          title="Receita Total"
          value={formatarMoeda(kpis.receitaTotalLocacoes)}
          icon={DollarSign}
          iconColor="text-purple-600"
          accentColor="bg-purple-500"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Locações por Mês" subtitle="Últimos 12 meses">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.locacoesPorMes} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradLocacoes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [v, 'Locações']} contentStyle={CHART_STYLE} />
                <Area type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2.5} fill="url(#gradLocacoes)" dot={{ fill: '#2563EB', strokeWidth: 2, r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Forma de Pagamento" subtitle="Distribuição das locações">
          {charts.distribuicaoFormaPagamento.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="h-56 w-56 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.distribuicaoFormaPagamento.map((f: any) => ({
                        name: formaPagamentoLabels[f.formaPagamento] || f.formaPagamento,
                        value: f.count,
                      }))}
                      cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2} dataKey="value"
                    >
                      {charts.distribuicaoFormaPagamento.map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, 'Locações']} contentStyle={CHART_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {charts.distribuicaoFormaPagamento.map((f: any, i: number) => (
                  <div key={f.formaPagamento} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-sm text-slate-600">{formaPagamentoLabels[f.formaPagamento] || f.formaPagamento}</span>
                    </div>
                    <span className="text-sm font-medium text-slate-900">{f.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Nenhuma locação registrada</p>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Locações por Tipo" subtitle="Distribuição por tipo de produto">
          {charts.locacoesPorTipoProduto.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.locacoesPorTipoProduto} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="tipoNome" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [v, 'Locações']} contentStyle={CHART_STYLE} />
                  <Bar dataKey="count" fill="#7C3AED" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Nenhum tipo com locações</p>
          )}
        </ChartCard>

        <ChartCard title="Duração Média por Tipo" subtitle="Em dias">
          {charts.duracaoMediaPorTipo.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.duracaoMediaPorTipo} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="tipoNome" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v} dias`, 'Duração Média']} contentStyle={CHART_STYLE} />
                  <Bar dataKey="duracaoMedia" fill="#0891B2" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Nenhum tipo com dados</p>
          )}
        </ChartCard>
      </div>

      {/* Tabela */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Locações do Período</h2>
        <ReportTable columns={tableColumns} data={data.tabela} />
      </div>
    </div>
  )
}
