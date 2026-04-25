'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/header'
import { IndicadorCard } from '../components/indicador-card'
import { ReportTable, TableColumn } from '../components/report-table'
import { ReportFilters, FilterConfig } from '../components/report-filters'
import { exportarCSV } from '../components/csv-export'
import { ChartCard } from '../components/chart-card'
import { formatarMoeda } from '@/shared/types'
import { DollarSign, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts'

const CHART_STYLE = { backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }

const statusColors: Record<string, string> = {
  Pago: '#16A34A', Parcial: '#F59E0B', Pendente: '#2563EB', Atrasado: '#DC2626',
}

const formaPagamentoLabels: Record<string, string> = {
  Periodo: 'Período', PercentualPagar: '% a Pagar', PercentualReceber: '% a Receber',
}

export default function FinanceiroPage() {
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
    const res = await fetch(`/api/relatorios/financeiro?${params}`)
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
    { key: 'dataInicio', label: 'Início' },
    { key: 'dataFim', label: 'Fim' },
    { key: 'totalBruto', label: 'Bruto' },
    { key: 'descontos', label: 'Descontos' },
    { key: 'valorRecebido', label: 'Recebido' },
    { key: 'saldoDevedorGerado', label: 'Saldo Dev.' },
    { key: 'status', label: 'Status' },
    { key: 'formaPagamento', label: 'Forma Pagto' },
  ]

  const handleExportCSV = () => {
    if (!data?.tabela) return
    exportarCSV(data.tabela, csvColumns, 'relatorio_financeiro')
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
    { key: 'clienteNome', label: 'Cliente' },
    { key: 'produtoIdentificador', label: 'Produto' },
    { key: 'produtoTipo', label: 'Tipo' },
    { key: 'dataInicio', label: 'Início' },
    { key: 'dataFim', label: 'Fim' },
    { key: 'totalBruto', label: 'Bruto', align: 'right', format: (v: number) => formatarMoeda(v) },
    { key: 'descontos', label: 'Descontos', align: 'right', format: (v: number) => formatarMoeda(v) },
    { key: 'valorRecebido', label: 'Recebido', align: 'right', format: (v: number) => formatarMoeda(v) },
    { key: 'saldoDevedorGerado', label: 'Saldo Dev.', align: 'right', format: (v: number) => formatarMoeda(v) },
    {
      key: 'status', label: 'Status', align: 'center',
      format: (v: string) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
          v === 'Pago' ? 'bg-green-100 text-green-700' :
          v === 'Atrasado' ? 'bg-red-100 text-red-700' :
          v === 'Parcial' ? 'bg-amber-100 text-amber-700' :
          'bg-blue-100 text-blue-700'
        }`}>{v}</span>
      ),
    },
    {
      key: 'formaPagamento', label: 'Forma Pagto',
      format: (v: string) => formaPagamentoLabels[v] || v,
    },
  ]

  if (loading || !data) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  )

  const kpis = data.kpis
  const charts = data.charts
  const comp = charts.comparativo

  return (
    <div className="space-y-6">
      <Header title="Relatório Financeiro" subtitle="Análise detalhada da receita e cobranças do período" />
      <ReportFilters
        filters={filterConfigs}
        values={filters}
        onFilterChange={handleFilterChange}
        onExportCSV={handleExportCSV}
        onApply={handleApply}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <IndicadorCard
          title="Receita Total"
          value={formatarMoeda(kpis.receitaTotal)}
          subtitle={`${kpis.cobrancasTotal} cobranças`}
          icon={DollarSign}
          iconColor="text-emerald-600"
          accentColor="bg-emerald-500"
          trend={{ value: comp?.variacaoReceita ?? 0, label: 'vs anterior' }}
        />
        <IndicadorCard
          title="Receita Bruta"
          value={formatarMoeda(kpis.receitaBruta)}
          subtitle="Antes de descontos"
          icon={DollarSign}
          iconColor="text-blue-600"
          accentColor="bg-blue-500"
        />
        <IndicadorCard
          title="Total Descontos"
          value={formatarMoeda(kpis.totalDescontos)}
          subtitle="Partidas + dinheiro"
          icon={TrendingUp}
          iconColor="text-amber-600"
          accentColor="bg-amber-500"
        />
        <IndicadorCard
          title="Taxa Pagamento"
          value={`${kpis.percentualPago.toFixed(1)}%`}
          subtitle={`${kpis.cobrancasPagas} de ${kpis.cobrancasTotal}`}
          icon={CheckCircle}
          iconColor="text-blue-600"
          accentColor="bg-blue-500"
        />
        <IndicadorCard
          title="Ticket Médio"
          value={formatarMoeda(kpis.ticketMedio)}
          subtitle="Valor médio/cobrança"
          icon={TrendingUp}
          iconColor="text-purple-600"
          accentColor="bg-purple-500"
          trend={{ value: comp?.variacaoTicket ?? 0, label: 'vs anterior' }}
        />
        <IndicadorCard
          title="Saldo Devedor"
          value={formatarMoeda(kpis.saldoDevedor)}
          subtitle={`${kpis.locacoesComSaldo} locações em aberto`}
          icon={AlertTriangle}
          iconColor={kpis.saldoDevedor > 0 ? 'text-red-600' : 'text-emerald-600'}
          accentColor={kpis.saldoDevedor > 0 ? 'bg-red-500' : 'bg-emerald-500'}
          trend={comp?.variacaoReceita !== undefined ? { value: -(comp.variacaoReceita), label: 'vs anterior' } : undefined}
        />
      </div>

      {/* Charts Row 1 - Evolução + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Evolução da Receita" subtitle="Últimos 12 meses">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.evolucaoMensal} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [formatarMoeda(v), 'Receita']} contentStyle={CHART_STYLE} />
                <Area type="monotone" dataKey="valor" stroke="#2563EB" strokeWidth={2.5} fill="url(#gradReceita)" dot={{ fill: '#2563EB', strokeWidth: 2, r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Distribuição por Status" subtitle="Cobranças do período">
          <div className="flex items-center gap-4">
            <div className="h-56 w-56 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.porStatus.map((s: any) => ({ name: s.status, value: s.count }))}
                    cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2} dataKey="value"
                  >
                    {charts.porStatus.map((entry: any, i: number) => (
                      <Cell key={i} fill={statusColors[entry.status] || '#94A3B8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, 'Cobranças']} contentStyle={CHART_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {charts.porStatus.map((item: any) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors[item.status] || '#94A3B8' }} />
                    <span className="text-sm text-slate-600">{item.status}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-slate-900">{item.count}</span>
                    <span className="text-xs text-slate-400 ml-2">({formatarMoeda(item.valor)})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Charts Row 2 - Receita por Rota + Tipo Produto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Receita por Rota" subtitle="Top 10 por faturamento">
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

        <ChartCard title="Receita por Tipo de Produto" subtitle="Faturamento por categoria">
          {charts.receitaPorTipoProduto.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.receitaPorTipoProduto} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="tipoNome" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [formatarMoeda(v), 'Receita']} contentStyle={CHART_STYLE} />
                  <Bar dataKey="total" fill="#0891B2" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Nenhum tipo com receita</p>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 3 - Forma Pagamento + Comparativo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Receita por Forma de Pagamento" subtitle="Distribuição por modalidade">
          {charts.receitaPorFormaPagamento.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="h-56 w-56 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.receitaPorFormaPagamento.map((f: any) => ({
                        name: formaPagamentoLabels[f.formaPagamento] || f.formaPagamento,
                        value: f.total,
                      }))}
                      cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2} dataKey="value"
                    >
                      {charts.receitaPorFormaPagamento.map((_: any, i: number) => (
                        <Cell key={i} fill={['#2563EB', '#7C3AED', '#0891B2'][i % 3]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [formatarMoeda(v), 'Receita']} contentStyle={CHART_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {charts.receitaPorFormaPagamento.map((f: any, i: number) => (
                  <div key={f.formaPagamento} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#2563EB', '#7C3AED', '#0891B2'][i % 3] }} />
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
            <p className="text-sm text-slate-400 text-center py-12">Nenhuma forma de pagamento</p>
          )}
        </ChartCard>

        <ChartCard title="Comparativo com Período Anterior" subtitle="Atual vs período anterior">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Receita', Atual: comp?.atual?.receita ?? 0, Anterior: comp?.anterior?.receita ?? 0 },
                  { name: 'Cobranças', Atual: comp?.atual?.cobrancas ?? 0, Anterior: comp?.anterior?.cobrancas ?? 0 },
                  { name: 'Ticket Médio', Atual: comp?.atual?.ticketMedio ?? 0, Anterior: comp?.anterior?.ticketMedio ?? 0 },
                ]}
                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={CHART_STYLE} />
                <Legend />
                <Bar dataKey="Atual" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Anterior" fill="#CBD5E1" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Tabela de Cobranças */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Cobranças do Período</h2>
        <ReportTable columns={tableColumns} data={data.tabela} />
      </div>
    </div>
  )
}
