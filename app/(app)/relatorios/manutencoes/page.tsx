'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/header'
import { IndicadorCard } from '../components/indicador-card'
import { ReportTable, TableColumn } from '../components/report-table'
import { ReportFilters, FilterConfig } from '../components/report-filters'
import { exportarCSV } from '../components/csv-export'
import { ChartCard } from '../components/chart-card'
import { formatarMoeda } from '@/shared/types'
import { Wrench, Repeat, Settings, PackageX, Clock } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const CHART_STYLE = { backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }

const tipoColors: Record<string, string> = {
  trocaPano: '#2563EB',
  manutencao: '#F59E0B',
}

const tipoLabels: Record<string, string> = {
  trocaPano: 'Troca Pano',
  manutencao: 'Manutenção',
}

export default function ManutencoesPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, string>>({ periodo: 'mes' })

  async function fetchData() {
    setLoading(true)
    const params = new URLSearchParams(filters)
    const res = await fetch(`/api/relatorios/manutencoes?${params}`)
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
    { key: 'produtoTipo', label: 'Tipo Produto' },
    { key: 'clienteNome', label: 'Cliente' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'descricao', label: 'Descrição' },
    { key: 'data', label: 'Data' },
    { key: 'registradoPor', label: 'Registrado Por' },
  ]

  const handleExportCSV = () => {
    if (!data?.tabela) return
    exportarCSV(data.tabela, csvColumns, 'relatorio_manutencoes')
  }

  const filterConfigs: FilterConfig[] = [
    {
      key: 'tipo',
      label: 'Tipo',
      type: 'select',
      options: [
        { value: '', label: 'Todos' },
        { value: 'trocaPano', label: 'Troca Pano' },
        { value: 'manutencao', label: 'Manutenção' },
      ],
    },
  ]

  const tableColumns: TableColumn[] = [
    { key: 'produtoIdentificador', label: 'Produto' },
    { key: 'produtoTipo', label: 'Tipo Produto' },
    { key: 'clienteNome', label: 'Cliente', format: (v: string) => v || '—' },
    {
      key: 'tipo', label: 'Tipo', align: 'center',
      format: (v: string) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
          v === 'trocaPano' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
        }`}>{tipoLabels[v] || v}</span>
      ),
    },
    { key: 'descricao', label: 'Descrição', format: (v: string) => v || '—' },
    { key: 'data', label: 'Data' },
    { key: 'registradoPor', label: 'Registrado Por', format: (v: string) => v || '—' },
  ]

  if (loading || !data) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  )

  const kpis = data.kpis
  const charts = data.charts

  // Pie chart data with proper labels
  const porTipoData = (charts.porTipo || []).map((t: any) => ({
    name: tipoLabels[t.tipo] || t.tipo,
    value: t.count,
    tipo: t.tipo,
  }))

  return (
    <div className="space-y-6">
      <Header title="Relatório de Manutenções" subtitle="Acompanhamento de trocas de pano e manutenções gerais" />
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
          title="Total Manutenções"
          value={kpis.totalManutencoes}
          subtitle="No período selecionado"
          icon={Wrench}
          iconColor="text-amber-600"
          accentColor="bg-amber-500"
        />
        <IndicadorCard
          title="Trocas de Pano"
          value={kpis.trocasPano}
          subtitle="Trocas registradas"
          icon={Repeat}
          iconColor="text-blue-600"
          accentColor="bg-blue-500"
        />
        <IndicadorCard
          title="Manutenções Gerais"
          value={kpis.manutencoesGerais}
          subtitle="Manutenções diversas"
          icon={Settings}
          iconColor="text-slate-600"
          accentColor="bg-slate-500"
        />
        <IndicadorCard
          title="Produtos em Manutenção"
          value={kpis.produtosEmManutencao}
          subtitle="Atualmente"
          icon={PackageX}
          iconColor="text-red-600"
          accentColor="bg-red-500"
        />
        <IndicadorCard
          title="Tempo Médio"
          value={`${kpis.tempoMedioManutencao} dias`}
          subtitle="Entre manutenções"
          icon={Clock}
          iconColor="text-purple-600"
          accentColor="bg-purple-500"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Manutenções por Mês" subtitle="Últimos 12 meses — Troca Pano vs Manutenção">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.manutencoesPorMes} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={CHART_STYLE} />
                <Legend />
                <Bar dataKey="trocaPano" name="Troca Pano" stackId="a" fill="#2563EB" radius={[0, 0, 0, 0]} maxBarSize={40} />
                <Bar dataKey="manutencao" name="Manutenção" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Por Tipo de Produto" subtitle="Manutenções por categoria de produto">
          {(charts.porTipoProduto || []).length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.porTipoProduto} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="tipoNome" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_STYLE} />
                  <Bar dataKey="count" name="Quantidade" fill="#0891B2" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Nenhum dado por tipo de produto</p>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Por Tipo" subtitle="Distribuição entre troca de pano e manutenção">
          {porTipoData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="h-56 w-56 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={porTipoData}
                      cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2} dataKey="value"
                    >
                      {porTipoData.map((entry: any, i: number) => (
                        <Cell key={i} fill={tipoColors[entry.tipo] || '#94A3B8'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, 'Quantidade']} contentStyle={CHART_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {porTipoData.map((item: any) => (
                  <div key={item.tipo} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tipoColors[item.tipo] || '#94A3B8' }} />
                      <span className="text-sm text-slate-600">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Nenhum dado por tipo</p>
          )}
        </ChartCard>

        <ChartCard title="Manutenções por Rota" subtitle="Distribuição por área de atuação">
          {(charts.manutencoesPorRota || []).length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.manutencoesPorRota} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="rotaDescricao" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} width={120} />
                  <Tooltip formatter={(v: number) => [v, 'Quantidade']} contentStyle={CHART_STYLE} />
                  <Bar dataKey="count" name="Quantidade" fill="#7C3AED" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Nenhum dado por rota</p>
          )}
        </ChartCard>
      </div>

      {/* Tabela de Manutenções */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Manutenções do Período</h2>
        <ReportTable columns={tableColumns} data={data.tabela} />
      </div>
    </div>
  )
}
