'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/header'
import { IndicadorCard } from '../components/indicador-card'
import { ReportTable, TableColumn } from '../components/report-table'
import { ReportFilters, FilterConfig } from '../components/report-filters'
import { exportarCSV } from '../components/csv-export'
import { ChartCard } from '../components/chart-card'
import { formatarMoeda } from '@/shared/types'
import { MapPin, BarChart3, DollarSign, Trophy } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const CHART_STYLE = { backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }

const formaPagamentoLabels: Record<string, string> = {
  Periodo: 'Período', PercentualPagar: '% a Pagar', PercentualReceber: '% a Receber',
}

const FORMA_PAGTO_COLORS: Record<string, string> = {
  Periodo: '#2563EB',
  PercentualPagar: '#7C3AED',
  PercentualReceber: '#0891B2',
}

export default function LocacoesRotaPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, string>>({ periodo: 'mes' })
  const [rotaOptions, setRotaOptions] = useState<{ value: string; label: string }[]>([])

  async function fetchRotas() {
    try {
      const res = await fetch('/api/rotas')
      const json = await res.json()
      if (Array.isArray(json)) {
        setRotaOptions(json.map((r: any) => ({ value: String(r.id), label: r.descricao })))
      } else if (json.rotas) {
        setRotaOptions(json.rotas.map((r: any) => ({ value: String(r.id), label: r.descricao })))
      }
    } catch {}
  }

  async function fetchData() {
    setLoading(true)
    const params = new URLSearchParams(filters)
    const res = await fetch(`/api/relatorios/locacoes-rota?${params}`)
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
    { key: 'rotaNome', label: 'Rota' },
    { key: 'totalLocacoes', label: 'Total Locações' },
    { key: 'locacoesAtivas', label: 'Loc. Ativas' },
    { key: 'receitaTotal', label: 'Receita Total' },
    { key: 'saldoDevedor', label: 'Saldo Devedor' },
    { key: 'percentualInadimplencia', label: '% Inadimplência' },
  ]

  const handleExportCSV = () => {
    if (!data?.tabela) return
    exportarCSV(data.tabela, csvColumns, 'relatorio_locacoes_rota')
  }

  const filterConfigs: FilterConfig[] = [
    {
      key: 'rotaId',
      label: 'Rota',
      type: 'select',
      options: [{ value: '', label: 'Todas' }, ...rotaOptions],
    },
  ]

  const tableColumns: TableColumn[] = [
    { key: 'rotaNome', label: 'Rota' },
    {
      key: 'totalLocacoes', label: 'Total Locações', align: 'center',
    },
    {
      key: 'locacoesAtivas', label: 'Loc. Ativas', align: 'center',
    },
    {
      key: 'receitaTotal', label: 'Receita Total', align: 'right',
      format: (v: number) => formatarMoeda(v),
    },
    {
      key: 'saldoDevedor', label: 'Saldo Devedor', align: 'right',
      format: (v: number) => (
        <span className={v > 0 ? 'text-red-600 font-medium' : ''}>{formatarMoeda(v)}</span>
      ),
    },
    {
      key: 'percentualInadimplencia', label: '% Inadimplência', align: 'center',
      format: (v: number) => {
        const cls = v > 20 ? 'text-red-600' : v > 10 ? 'text-amber-600' : 'text-green-600'
        return <span className={`font-medium ${cls}`}>{v.toFixed(1)}%</span>
      },
    },
  ]

  if (loading || !data) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  )

  const kpis = data.kpis
  const charts = data.charts

  // Process grouped bar chart data for forma de pagamento por rota
  const formaPagamentoGrouped = (() => {
    const rotas = [...new Set(charts.distribuicaoFormaPagamentoPorRota.map((f: any) => f.rotaDescricao))]
    const formas = [...new Set(charts.distribuicaoFormaPagamentoPorRota.map((f: any) => f.formaPagamento))]
    return rotas.map(rota => {
      const row: Record<string, any> = { rotaDescricao: rota }
      formas.forEach((forma: any) => {
        const found = charts.distribuicaoFormaPagamentoPorRota.find(
          (f: any) => f.rotaDescricao === rota && f.formaPagamento === forma
        )
        row[forma as string] = found?.count ?? 0
      })
      return row
    })
  })()

  const formasUnicas = [...new Set(charts.distribuicaoFormaPagamentoPorRota.map((f: any) => f.formaPagamento))]

  return (
    <div className="space-y-6">
      <Header title="Relatório de Locações por Rota" subtitle="Análise de locações e receita agrupadas por rota" />
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
          title="Rotas Ativas"
          value={kpis.totalRotasAtivas}
          icon={MapPin}
          iconColor="text-blue-600"
          accentColor="bg-blue-500"
        />
        <IndicadorCard
          title="Média Locações/Rota"
          value={kpis.mediaLocacoesPorRota}
          icon={BarChart3}
          iconColor="text-emerald-600"
          accentColor="bg-emerald-500"
        />
        <IndicadorCard
          title="Receita Média/Rota"
          value={formatarMoeda(kpis.receitaMediaPorRota)}
          icon={DollarSign}
          iconColor="text-purple-600"
          accentColor="bg-purple-500"
        />
        <IndicadorCard
          title="Rota Maior Receita"
          value={kpis.rotaMaiorReceita}
          icon={Trophy}
          iconColor="text-amber-600"
          accentColor="bg-amber-500"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Locações por Rota" subtitle="Ativas, finalizadas e canceladas">
          {charts.locacoesPorRota.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.locacoesPorRota} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="rotaDescricao" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <Tooltip contentStyle={CHART_STYLE} />
                  <Legend />
                  <Bar dataKey="ativas" name="Ativas" stackId="a" fill="#16A34A" maxBarSize={50} />
                  <Bar dataKey="finalizadas" name="Finalizadas" stackId="a" fill="#64748B" maxBarSize={50} />
                  <Bar dataKey="canceladas" name="Canceladas" stackId="a" fill="#DC2626" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Nenhuma rota com locações</p>
          )}
        </ChartCard>

        <ChartCard title="Receita por Rota" subtitle="Faturamento por rota no período">
          {charts.receitaPorRota.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.receitaPorRota} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="rotaDescricao" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} width={120} />
                  <Tooltip formatter={(v: number) => [formatarMoeda(v), 'Receita']} contentStyle={CHART_STYLE} />
                  <Bar dataKey="total" fill="#7C3AED" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Nenhuma rota com receita</p>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Inadimplência por Rota" subtitle="Saldo devedor acumulado">
          {charts.inadimplenciaPorRota.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.inadimplenciaPorRota} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="rotaDescricao" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} width={120} />
                  <Tooltip formatter={(v: number) => [formatarMoeda(v), 'Inadimplência']} contentStyle={CHART_STYLE} />
                  <Bar dataKey="total" fill="#DC2626" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Nenhuma inadimplência registrada</p>
          )}
        </ChartCard>

        <ChartCard title="Forma Pagto por Rota" subtitle="Top 5 rotas por volume">
          {formaPagamentoGrouped.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formaPagamentoGrouped} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="rotaDescricao" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <Tooltip contentStyle={CHART_STYLE} />
                  <Legend />
                  {formasUnicas.map((forma: any) => (
                    <Bar
                      key={forma}
                      dataKey={forma}
                      name={formaPagamentoLabels[forma] || forma}
                      fill={FORMA_PAGTO_COLORS[forma] || '#94A3B8'}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={30}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Nenhuma distribuição registrada</p>
          )}
        </ChartCard>
      </div>

      {/* Tabela */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Resumo por Rota</h2>
        <ReportTable columns={tableColumns} data={data.tabela} />
      </div>
    </div>
  )
}
