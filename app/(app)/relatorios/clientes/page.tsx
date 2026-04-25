'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/header'
import { IndicadorCard } from '../components/indicador-card'
import { ReportTable, TableColumn } from '../components/report-table'
import { ReportFilters, FilterConfig } from '../components/report-filters'
import { exportarCSV } from '../components/csv-export'
import { ChartCard } from '../components/chart-card'
import { formatarMoeda } from '@/shared/types'
import { Users, UserCheck, AlertTriangle, DollarSign } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts'

const CHART_STYLE = { backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }

export default function ClientesPage() {
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
    const res = await fetch(`/api/relatorios/clientes?${params}`)
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
    { key: 'nomeExibicao', label: 'Nome' },
    { key: 'cpfCnpj', label: 'CPF/CNPJ' },
    { key: 'cidade', label: 'Cidade' },
    { key: 'estado', label: 'Estado' },
    { key: 'rotaNome', label: 'Rota' },
    { key: 'status', label: 'Status' },
    { key: 'locacoesAtivas', label: 'Loc. Ativas' },
    { key: 'receitaPeriodo', label: 'Receita Período' },
    { key: 'saldoDevedor', label: 'Saldo Devedor' },
  ]

  const handleExportCSV = () => {
    if (!data?.tabela) return
    exportarCSV(data.tabela, csvColumns, 'relatorio_clientes')
  }

  const filterConfigs: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: '', label: 'Todos' },
        { value: 'Ativo', label: 'Ativo' },
        { value: 'Inativo', label: 'Inativo' },
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
    { key: 'nomeExibicao', label: 'Nome' },
    { key: 'cpfCnpj', label: 'CPF/CNPJ', format: (v: string) => v || '—' },
    { key: 'cidade', label: 'Cidade' },
    { key: 'estado', label: 'Estado' },
    { key: 'rotaNome', label: 'Rota', format: (v: string) => v || '—' },
    {
      key: 'status', label: 'Status',
      format: (v: string) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
          v === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
        }`}>{v}</span>
      ),
    },
    { key: 'locacoesAtivas', label: 'Loc. Ativas', align: 'center' },
    {
      key: 'receitaPeriodo', label: 'Receita Período', align: 'right',
      format: (v: number) => <span className="font-medium text-emerald-600">{formatarMoeda(v)}</span>,
    },
    {
      key: 'saldoDevedor', label: 'Saldo Devedor', align: 'right',
      format: (v: number) => v > 0 ? (
        <span className="font-medium text-red-600">{formatarMoeda(v)}</span>
      ) : (
        <span className="text-slate-400">—</span>
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

  // Top 10 Clientes por Receita
  const topClientesData = (charts.topClientesReceita || []).map((c: any) => ({
    name: c.clienteNome.length > 18 ? c.clienteNome.substring(0, 18) + '…' : c.clienteNome,
    receita: c.total,
    cobrancas: c.count,
  }))

  // Clientes por Rota
  const clientesPorRotaData = (charts.clientesPorRota || [])
    .filter((r: any) => r.count > 0)
    .map((r: any) => ({
      rota: r.rotaDescricao.length > 20 ? r.rotaDescricao.substring(0, 20) + '…' : r.rotaDescricao,
      count: r.count,
    }))

  // Evolução Novos Clientes
  const novosClientesData = (charts.evolucaoNovosClientes || []).map((m: any) => ({
    mes: m.mes,
    novos: m.count,
  }))

  // Distribuição por Estado
  const distribuicaoEstadoData = (charts.distribuicaoPorEstado || []).map((e: any) => ({
    estado: e.estado,
    count: e.count,
  }))

  return (
    <div className="space-y-6">
      <Header title="Relatório de Clientes" subtitle="Análise de clientes, receita e distribuição geográfica" />
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
          title="Clientes Ativos"
          value={kpis.totalClientesAtivos}
          subtitle="Total de clientes cadastrados"
          icon={Users}
          iconColor="text-blue-600"
          accentColor="bg-blue-500"
        />
        <IndicadorCard
          title="Com Locação Ativa"
          value={kpis.clientesComLocacao}
          subtitle="Clientes com locação em andamento"
          icon={UserCheck}
          iconColor="text-emerald-600"
          accentColor="bg-emerald-500"
        />
        <IndicadorCard
          title="Com Saldo Devedor"
          value={kpis.clientesComSaldo}
          subtitle="Clientes com débitos pendentes"
          icon={AlertTriangle}
          iconColor="text-red-600"
          accentColor="bg-red-500"
        />
        <IndicadorCard
          title="Receita Média / Cliente"
          value={formatarMoeda(kpis.receitaMediaCliente)}
          subtitle="Valor médio no período"
          icon={DollarSign}
          iconColor="text-purple-600"
          accentColor="bg-purple-500"
        />
      </div>

      {/* Charts Row 1 - Top Clientes + Clientes por Rota */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top 10 Clientes por Receita" subtitle="Maiores valores no período">
          {topClientesData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topClientesData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} width={120} />
                  <Tooltip formatter={(v: number) => [formatarMoeda(v), 'Receita']} contentStyle={CHART_STYLE} />
                  <Bar dataKey="receita" fill="#2563EB" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Users className="w-8 h-8 mb-2" />
              <p className="text-sm">Nenhum cliente no período</p>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Clientes por Rota" subtitle="Distribuição geográfica">
          {clientesPorRotaData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientesPorRotaData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="rota" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [v, 'Clientes']} contentStyle={CHART_STYLE} />
                  <Bar dataKey="count" fill="#0EA5E9" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Users className="w-8 h-8 mb-2" />
              <p className="text-sm">Nenhuma rota cadastrada</p>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2 - Evolução Novos Clientes + Distribuição por Estado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Evolução de Novos Clientes" subtitle="Cadastros por mês nos últimos 12 meses">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={novosClientesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="newClientsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [v, 'Novos Clientes']} contentStyle={CHART_STYLE} />
                <Area type="monotone" dataKey="novos" stroke="#0EA5E9" strokeWidth={3} fill="url(#newClientsGradient)" dot={{ fill: '#0EA5E9', strokeWidth: 2, r: 3 }} activeDot={{ r: 6, fill: '#0EA5E9' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Distribuição por Estado" subtitle="Clientes por unidade federativa">
          {distribuicaoEstadoData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribuicaoEstadoData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="estado" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, 'Clientes']} contentStyle={CHART_STYLE} />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Users className="w-8 h-8 mb-2" />
              <p className="text-sm">Nenhum dado disponível</p>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Tabela de Clientes */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Clientes</h2>
        <ReportTable columns={tableColumns} data={data.tabela} />
      </div>
    </div>
  )
}
