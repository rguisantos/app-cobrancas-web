'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/header'
import { IndicadorCard } from '../components/indicador-card'
import { ReportTable, TableColumn } from '../components/report-table'
import { ReportFilters, FilterConfig } from '../components/report-filters'
import { exportarCSV } from '../components/csv-export'
import { ChartCard } from '../components/chart-card'
import { formatarMoeda } from '@/shared/types'
import { MapPin, Users, DollarSign, AlertTriangle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'

const CHART_STYLE = { backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }

const LINE_COLORS = ['#2563EB', '#DC2626', '#16A34A', '#F59E0B', '#7C3AED']

export default function RotasPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, string>>({ periodo: 'mes' })

  async function fetchData() {
    setLoading(true)
    const params = new URLSearchParams(filters)
    const res = await fetch(`/api/relatorios/rotas?${params}`)
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
    { key: 'rotaNome', label: 'Rota' },
    { key: 'totalClientes', label: 'Total Clientes' },
    { key: 'totalLocacoes', label: 'Total Locações' },
    { key: 'receitaTotal', label: 'Receita Total' },
    { key: 'saldoDevedor', label: 'Saldo Devedor' },
    { key: 'percentualInadimplencia', label: '% Inadimplência' },
  ]

  const handleExportCSV = () => {
    if (!data?.tabela) return
    exportarCSV(data.tabela, csvColumns, 'relatorio_rotas')
  }

  const filterConfigs: FilterConfig[] = []

  const tableColumns: TableColumn[] = [
    { key: 'rotaNome', label: 'Rota' },
    { key: 'totalClientes', label: 'Total Clientes', align: 'right' },
    { key: 'totalLocacoes', label: 'Total Locações', align: 'right' },
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
      key: 'percentualInadimplencia', label: '% Inadimplência', align: 'right',
      format: (v: number) => {
        const color = v > 20 ? 'text-red-600' : v > 10 ? 'text-amber-600' : 'text-emerald-600'
        return <span className={`font-medium ${color}`}>{v.toFixed(1)}%</span>
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

  // Receita por Rota (horizontal bar)
  const receitaPorRotaData = (charts.comparativoRotas || [])
    .filter((r: any) => r.receita > 0)
    .sort((a: any, b: any) => b.receita - a.receita)
    .map((r: any) => ({
      rota: r.rotaDescricao.length > 20 ? r.rotaDescricao.substring(0, 20) + '…' : r.rotaDescricao,
      receita: r.receita,
    }))

  // Inadimplência por Rota (horizontal bar, red)
  const inadimplenciaPorRotaData = (charts.comparativoRotas || [])
    .filter((r: any) => r.inadimplencia > 0)
    .sort((a: any, b: any) => b.inadimplencia - a.inadimplencia)
    .map((r: any) => ({
      rota: r.rotaDescricao.length > 20 ? r.rotaDescricao.substring(0, 20) + '…' : r.rotaDescricao,
      inadimplencia: r.inadimplencia,
    }))

  // Clientes por Rota (bar)
  const clientesPorRotaData = (charts.comparativoRotas || [])
    .sort((a: any, b: any) => b.clientes - a.clientes)
    .map((r: any) => ({
      rota: r.rotaDescricao.length > 15 ? r.rotaDescricao.substring(0, 15) + '…' : r.rotaDescricao,
      clientes: r.clientes,
    }))

  // Evolução mensal — get top 3 rota names
  const evolucaoData = charts.evolucaoMensualPorRota || []
  const rotaNames = evolucaoData.length > 0
    ? Object.keys(evolucaoData[0]).filter(k => k !== 'mes').slice(0, 3)
    : []

  return (
    <div className="space-y-6">
      <Header title="Relatório de Rotas" subtitle="Análise de desempenho por rota e região" />
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
          title="Total Rotas"
          value={kpis.totalRotas}
          subtitle="Rotas cadastradas"
          icon={MapPin}
          iconColor="text-blue-600"
          accentColor="bg-blue-500"
        />
        <IndicadorCard
          title="Total Clientes"
          value={kpis.totalClientes}
          subtitle="Clientes nas rotas"
          icon={Users}
          iconColor="text-emerald-600"
          accentColor="bg-emerald-500"
        />
        <IndicadorCard
          title="Receita Total"
          value={formatarMoeda(kpis.receitaTotal)}
          subtitle="No período selecionado"
          icon={DollarSign}
          iconColor="text-purple-600"
          accentColor="bg-purple-500"
        />
        <IndicadorCard
          title="Inadimplência Total"
          value={formatarMoeda(kpis.inadimplenciaTotal)}
          subtitle="Saldo devedor total"
          icon={AlertTriangle}
          iconColor="text-red-600"
          accentColor="bg-red-500"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Receita por Rota" subtitle="Faturamento por área de atuação">
          {receitaPorRotaData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={receitaPorRotaData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="rota" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} width={120} />
                  <Tooltip formatter={(v: number) => [formatarMoeda(v), 'Receita']} contentStyle={CHART_STYLE} />
                  <Bar dataKey="receita" name="Receita" fill="#16A34A" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Nenhuma receita por rota</p>
          )}
        </ChartCard>

        <ChartCard title="Inadimplência por Rota" subtitle="Saldo devedor por área">
          {inadimplenciaPorRotaData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inadimplenciaPorRotaData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="rota" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} width={120} />
                  <Tooltip formatter={(v: number) => [formatarMoeda(v), 'Inadimplência']} contentStyle={CHART_STYLE} />
                  <Bar dataKey="inadimplencia" name="Inadimplência" fill="#DC2626" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Nenhuma inadimplência por rota</p>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Clientes por Rota" subtitle="Distribuição de clientes por área">
          {clientesPorRotaData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientesPorRotaData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="rota" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, 'Clientes']} contentStyle={CHART_STYLE} />
                  <Bar dataKey="clientes" name="Clientes" fill="#0891B2" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Nenhum cliente por rota</p>
          )}
        </ChartCard>

        <ChartCard title="Evolução Mensal" subtitle="Receita mensal das top 3 rotas">
          {evolucaoData.length > 0 && rotaNames.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolucaoData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [formatarMoeda(v), '']} contentStyle={CHART_STYLE} />
                  <Legend />
                  {rotaNames.map((name, i) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      name={name.length > 15 ? name.substring(0, 15) + '…' : name}
                      stroke={LINE_COLORS[i % LINE_COLORS.length]}
                      strokeWidth={2.5}
                      dot={{ fill: LINE_COLORS[i % LINE_COLORS.length], strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Nenhum dado de evolução mensal</p>
          )}
        </ChartCard>
      </div>

      {/* Tabela de Rotas */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Comparativo entre Rotas</h2>
        <ReportTable columns={tableColumns} data={data.tabela} />
      </div>
    </div>
  )
}
