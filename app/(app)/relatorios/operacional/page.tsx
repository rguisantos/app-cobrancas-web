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
import { FileText, CheckCircle, Clock, Zap } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend,
} from 'recharts'

const CHART_STYLE = { backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }

export default function OperacionalPage() {
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
    const res = await fetch(`/api/relatorios/operacional?${params}`)
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
    { key: 'data', label: 'Data' },
    { key: 'cobrancasCriadas', label: 'Cobranças Criadas' },
    { key: 'valorTotal', label: 'Valor Total' },
    { key: 'valorRecebido', label: 'Valor Recebido' },
    { key: 'saldoDevedor', label: 'Saldo Devedor' },
  ]

  const handleExportCSV = () => {
    if (!data?.tabela) return
    exportarCSV(data.tabela, csvColumns, 'relatorio_operacional')
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
    { key: 'data', label: 'Data' },
    { key: 'cobrancasCriadas', label: 'Cobranças Criadas', align: 'right' },
    {
      key: 'valorTotal', label: 'Valor Total', align: 'right',
      format: (v: number) => formatarMoeda(v),
    },
    {
      key: 'valorRecebido', label: 'Valor Recebido', align: 'right',
      format: (v: number) => <span className="text-emerald-600 font-medium">{formatarMoeda(v)}</span>,
    },
    {
      key: 'saldoDevedor', label: 'Saldo Devedor', align: 'right',
      format: (v: number) => (
        <span className={v > 0 ? 'text-red-600 font-medium' : ''}>{formatarMoeda(v)}</span>
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
      <Header title="Relatório Operacional" subtitle="Acompanhamento de cobranças e produtividade" />
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
          title="Cobranças Criadas"
          value={kpis.cobrancasCriadasPeriodo}
          subtitle="No período selecionado"
          icon={FileText}
          iconColor="text-blue-600"
          accentColor="bg-blue-500"
        />
        <IndicadorCard
          title="Taxa de Pagamento"
          value={`${kpis.taxaPagamentoPeriodo.toFixed(1)}%`}
          subtitle="Cobranças pagas"
          icon={CheckCircle}
          iconColor="text-emerald-600"
          accentColor="bg-emerald-500"
        />
        <IndicadorCard
          title="Tempo Médio Pagto"
          value={`${kpis.tempoMedioPagamento} dias`}
          subtitle="Entre criação e pagamento"
          icon={Clock}
          iconColor="text-purple-600"
          accentColor="bg-purple-500"
        />
        <IndicadorCard
          title="Produtividade Diária"
          value={`${kpis.produtividadeDiaria.toFixed(1)} cobranças/dia`}
          subtitle="Média diária"
          icon={Zap}
          iconColor="text-amber-600"
          accentColor="bg-amber-500"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Cobranças por Dia da Semana" subtitle="Distribuição por dia da semana">
          {(charts.cobrancasPorDiaSemana || []).length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.cobrancasPorDiaSemana} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, 'Cobranças']} contentStyle={CHART_STYLE} />
                  <Bar dataKey="count" name="Cobranças" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Nenhum dado por dia da semana</p>
          )}
        </ChartCard>

        <ChartCard title="Receita por Dia da Semana" subtitle="Valor recebido por dia da semana">
          {(charts.receitaPorDiaSemana || []).length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.receitaPorDiaSemana} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [formatarMoeda(v), 'Receita']} contentStyle={CHART_STYLE} />
                  <Bar dataKey="total" name="Receita" fill="#16A34A" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Nenhum dado de receita por dia</p>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Evolução Cobranças" subtitle="Criadas vs pagas nos últimos 12 meses">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.evolucaoCobrancasCriadas} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradCriadas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradPagas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16A34A" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={CHART_STYLE} />
                <Legend />
                <Area type="monotone" dataKey="criadas" name="Criadas" stroke="#2563EB" strokeWidth={2.5} fill="url(#gradCriadas)" dot={{ fill: '#2563EB', strokeWidth: 2, r: 3 }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="pagas" name="Pagas" stroke="#16A34A" strokeWidth={2.5} fill="url(#gradPagas)" dot={{ fill: '#16A34A', strokeWidth: 2, r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Recebido vs Pendente Mensal" subtitle="Comparativo dos últimos 12 meses">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.comparativoRecebidoPendenteMensal} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number, name: string) => [formatarMoeda(v), name === 'recebido' ? 'Recebido' : 'Pendente']} contentStyle={CHART_STYLE} />
                <Legend />
                <Bar dataKey="recebido" name="Recebido" fill="#16A34A" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="pendente" name="Pendente" fill="#DC2626" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Tabela de Resumo Diário */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Resumo Diário</h2>
        <ReportTable columns={tableColumns} data={data.tabela} />
      </div>
    </div>
  )
}
