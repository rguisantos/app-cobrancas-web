'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Users,
  Package,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  PackageCheck,
  RefreshCw,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Calendar,
  MapPin,
  Loader2,
  BarChart3,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Area,
} from 'recharts'
import { KpiCard } from '@/components/ui/kpi-card'
import { StatusPagamentoBadge } from '@/components/ui/badge'
import { formatarMoeda } from '@/shared/types'
import AtividadeRecente from './atividade-recente'

// ============================================================================
// TIPOS
// ============================================================================

interface DashboardData {
  totalClientes: number
  totalProdutos: number
  produtosLocados: number
  produtosEstoque: number
  receitaMes: number
  totalCobrancasMes: number
  variacaoReceita: number
  saldoDevedor: number
  cobrancasAtrasadas: number
  cobrancasRecentes: any[]
  conflictsPendentes: number
  distribuicaoStatus: { name: string; value: number; color: string }[]
  receitaMensal: { mes: string; valor: number }[]
  miniChartData: number[]
  topClientes: { clienteId: string; clienteNome: string; total: number; count: number }[]
  evolucaoInadimplencia: { mes: string; total_atrasadas: number; saldo_devedor: number }[]
  ocupacaoPorRota: { id: string; nome: string; total_produtos: number; produtos_locados: number; taxa_ocupacao: number }[]
  receitaPorRota: { id: string; nome: string; receita: number; saldo_devedor: number }[]
}

interface RotaOption {
  id: string
  descricao: string
}

interface DashboardClientProps {
  data: DashboardData
  rotas: RotaOption[]
  periodoAtual: string
  rotaIdAtual: string
}

// ============================================================================
// CHART COLORS
// ============================================================================

const ROTA_COLORS = [
  '#2563EB', '#16A34A', '#D97706', '#DC2626', '#7C3AED',
  '#0891B2', '#DB2777', '#65A30D', '#EA580C', '#4F46E5',
]

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

function CobrancasRecentesTable({ cobrancas }: { cobrancas: any[] }) {
  if (!cobrancas.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <DollarSign className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">
          Nenhuma cobrança registrada
        </h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          As cobranças aparecerão aqui assim que forem criadas
        </p>
        <Link
          href="/cobrancas"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          Criar primeira cobrança
        </Link>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto -mx-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="table-header px-6 pb-3">Cliente</th>
            <th className="table-header text-right px-6 pb-3">Valor</th>
            <th className="table-header text-center px-6 pb-3">Status</th>
            <th className="table-header text-right px-6 pb-3">Data</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {cobrancas.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
              <td className="px-6 py-4">
                <Link href={`/cobrancas/${c.id}`} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0 shadow-sm">
                    {(c.cliente?.nomeExibicao ?? c.clienteNome)?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 group-hover:text-primary-600 transition-colors">
                      {c.cliente?.nomeExibicao ?? c.clienteNome}
                    </p>
                    <p className="text-xs text-slate-400">
                      {c.produtoIdentificador}
                    </p>
                  </div>
                </Link>
              </td>
              <td className="px-6 py-4 text-right">
                <p className="font-bold text-lg text-slate-900">
                  {formatarMoeda(c.valorRecebido)}
                </p>
                {c.saldoDevedorGerado > 0 && (
                  <p className="text-xs text-red-500">
                    Saldo: {formatarMoeda(c.saldoDevedorGerado)}
                  </p>
                )}
              </td>
              <td className="px-6 py-4 text-center">
                <StatusPagamentoBadge status={c.status} />
              </td>
              <td className="px-6 py-4 text-right">
                <p className="text-slate-600">
                  {format(new Date(c.createdAt), 'dd MMM', { locale: ptBR })}
                </p>
                <p className="text-xs text-slate-400">
                  {format(new Date(c.createdAt), 'HH:mm')}
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AlertasCard({ atrasadas, saldoDevedor, conflictos }: { atrasadas: number; saldoDevedor: number; conflictos: number }) {
  const alertas = [
    {
      show: atrasadas > 0,
      icon: AlertCircle,
      title: `${atrasadas} cobrança${atrasadas > 1 ? 's' : ''} atrasada${atrasadas > 1 ? 's' : ''}`,
      desc: 'Requerem atenção imediata',
      href: '/cobrancas?status=Atrasado',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      titleColor: 'text-red-800',
    },
    {
      show: saldoDevedor > 0,
      icon: AlertTriangle,
      title: `Saldo devedor: ${formatarMoeda(saldoDevedor)}`,
      desc: 'Pagamentos parciais em aberto',
      href: '/cobrancas?status=Parcial',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      iconColor: 'text-amber-600',
      titleColor: 'text-amber-800',
    },
    {
      show: conflictos > 0,
      icon: RefreshCw,
      title: `${conflictos} conflito${conflictos > 1 ? 's' : ''} de sincronização`,
      desc: 'Requerem resolução manual',
      href: '/admin/sync',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-800',
    },
  ].filter(a => a.show)

  if (!alertas.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">
          Tudo em ordem!
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Nenhum alerta pendente
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {alertas.map((a, i) => {
        const Icon = a.icon
        return (
          <Link
            key={i}
            href={a.href}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 ${a.bgColor} ${a.borderColor} hover:shadow-md transition-all group`}
          >
            <div className={`p-2 rounded-lg bg-white/50 ${a.iconColor}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${a.titleColor}`}>
                {a.title}
              </p>
              <p className="text-xs text-slate-500">{a.desc}</p>
            </div>
            <ArrowRight className={`w-4 h-4 ${a.iconColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
          </Link>
        )
      })}
    </div>
  )
}

// ============================================================================
// CUSTOM TOOLTIP COMPONENTS
// ============================================================================

function ChartTooltipContent({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-slate-700 mb-1">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-500">{entry.name}:</span>
          <span className="font-semibold text-slate-900">{formatter ? formatter(entry.value, entry.name) : entry.value}</span>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// OCUPAÇÃO POR ROTA — Progress Bars
// ============================================================================

function OcupacaoPorRotaCard({ data }: { data: DashboardData['ocupacaoPorRota'] }) {
  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <PackageCheck className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">Sem dados de ocupação</h3>
        <p className="text-sm text-slate-500 mt-1">Nenhuma rota encontrada</p>
      </div>
    )
  }

  const getBarColor = (taxa: number) => {
    if (taxa >= 70) return 'bg-emerald-500'
    if (taxa >= 40) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const getBarBgColor = (taxa: number) => {
    if (taxa >= 70) return 'bg-emerald-100'
    if (taxa >= 40) return 'bg-amber-100'
    return 'bg-red-100'
  }

  const getTextColor = (taxa: number) => {
    if (taxa >= 70) return 'text-emerald-700'
    if (taxa >= 40) return 'text-amber-700'
    return 'text-red-700'
  }

  return (
    <div className="space-y-4 max-h-80 overflow-y-auto">
      {data.map((rota, index) => (
        <div key={rota.id} className="group">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: ROTA_COLORS[index % ROTA_COLORS.length] }}
              />
              <span className="text-sm font-medium text-slate-700 truncate max-w-[160px]">
                {rota.nome}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                {rota.produtos_locados}/{rota.total_produtos} produtos
              </span>
              <span className={`text-sm font-bold ${getTextColor(rota.taxa_ocupacao)}`}>
                {rota.taxa_ocupacao}%
              </span>
            </div>
          </div>
          <div className={`h-2.5 rounded-full ${getBarBgColor(rota.taxa_ocupacao)}`}>
            <div
              className={`h-full rounded-full ${getBarColor(rota.taxa_ocupacao)} transition-all duration-500`}
              style={{ width: `${Math.min(rota.taxa_ocupacao, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// RECEITA POR ROTA — Horizontal Bar Chart
// ============================================================================

function ReceitaPorRotaChart({ data }: { data: DashboardData['receitaPorRota'] }) {
  if (!data.length || data.every(r => r.receita === 0 && r.saldo_devedor === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <BarChart3 className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">Sem receita por rota</h3>
        <p className="text-sm text-slate-500 mt-1">Nenhuma receita registrada no período</p>
      </div>
    )
  }

  const chartData = data.map((r, i) => ({
    nome: r.nome.length > 15 ? r.nome.substring(0, 15) + '…' : r.nome,
    receita: r.receita,
    saldo_devedor: r.saldo_devedor,
    fill: ROTA_COLORS[i % ROTA_COLORS.length],
  }))

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748B', fontSize: 11 }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <YAxis
            type="category"
            dataKey="nome"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748B', fontSize: 12 }}
            width={90}
          />
          <Tooltip
            content={<ChartTooltipContent formatter={(v: number) => formatarMoeda(v)} />}
          />
          <Bar dataKey="receita" name="Receita" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={28}>
            {chartData.map((entry, index) => (
              <Cell key={`receita-${index}`} fill={ROTA_COLORS[index % ROTA_COLORS.length]} />
            ))}
          </Bar>
          <Bar dataKey="saldo_devedor" name="Saldo Devedor" stackId="a" radius={[0, 4, 4, 0]} maxBarSize={28} fill="#DC2626" fillOpacity={0.6} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ============================================================================
// EVOLUÇÃO DA INADIMPLÊNCIA — Area Chart
// ============================================================================

function EvolucaoInadimplenciaChart({ data }: { data: DashboardData['evolucaoInadimplencia'] }) {
  const hasData = data.some(d => d.total_atrasadas > 0 || d.saldo_devedor > 0)

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">Sem inadimplência</h3>
        <p className="text-sm text-slate-500 mt-1">Nenhuma cobrança atrasada nos últimos 6 meses</p>
      </div>
    )
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="inadimplenciaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#DC2626" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#DC2626" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="saldoGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D97706" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#D97706" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis
            dataKey="mes"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748B', fontSize: 12 }}
          />
          <YAxis
            yAxisId="left"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748B', fontSize: 11 }}
            orientation="left"
          />
          <YAxis
            yAxisId="right"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748B', fontSize: 11 }}
            orientation="right"
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            content={<ChartTooltipContent formatter={(v: number, name: string) => name === 'Saldo Devedor' ? formatarMoeda(v) : v} />}
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="total_atrasadas"
            name="Cobranças Atrasadas"
            stroke="#DC2626"
            strokeWidth={2}
            fill="url(#inadimplenciaGradient)"
          />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="saldo_devedor"
            name="Saldo Devedor"
            stroke="#D97706"
            strokeWidth={2}
            fill="url(#saldoGradient)"
          />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value: string) => <span className="text-xs text-slate-600">{value}</span>}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// ============================================================================
// RECEITA VS META — Gauge/Progress
// ============================================================================

function ReceitaVsMetaCard({ receitaMes }: { receitaMes: number }) {
  // Simple monthly target: 20% above current or a baseline
  const meta = receitaMes > 0 ? receitaMes * 1.2 : 10000
  const percentual = meta > 0 ? Math.min((receitaMes / meta) * 100, 100) : 0

  const getColor = () => {
    if (percentual >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-100' }
    if (percentual >= 50) return { bar: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-100' }
    return { bar: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-100' }
  }

  const colors = getColor()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Receita Atual</p>
          <p className="text-2xl font-bold text-slate-900">{formatarMoeda(receitaMes)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Meta Mensal</p>
          <p className="text-2xl font-bold text-slate-400">{formatarMoeda(meta)}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-sm font-semibold ${colors.text}`}>
            {percentual.toFixed(1)}% da meta
          </span>
          <span className="text-xs text-slate-400">
            Faltam {formatarMoeda(Math.max(meta - receitaMes, 0))}
          </span>
        </div>
        <div className={`h-3 rounded-full ${colors.bg}`}>
          <div
            className={`h-full rounded-full ${colors.bar} transition-all duration-700`}
            style={{ width: `${percentual}%` }}
          />
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2">
        {percentual >= 80 ? (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm text-emerald-700 font-medium">Meta quase atingida!</span>
          </>
        ) : percentual >= 50 ? (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-sm text-amber-700 font-medium">Caminho bom para a meta</span>
          </>
        ) : (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-sm text-red-700 font-medium">Abaixo do esperado</span>
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// FILTER BAR
// ============================================================================

function FilterBar({
  periodo,
  rotaId,
  rotas,
  dataInicio,
  dataFim,
  onPeriodoChange,
  onRotaChange,
  onDataInicioChange,
  onDataFimChange,
  onAplicarPersonalizado,
  loading,
}: {
  periodo: string
  rotaId: string
  rotas: RotaOption[]
  dataInicio: string
  dataFim: string
  onPeriodoChange: (v: string) => void
  onRotaChange: (v: string) => void
  onDataInicioChange: (v: string) => void
  onDataFimChange: (v: string) => void
  onAplicarPersonalizado: () => void
  loading: boolean
}) {
  const periodos = [
    { value: 'mes', label: 'Este mês' },
    { value: 'trimestre', label: 'Trimestre' },
    { value: 'semestre', label: 'Semestre' },
    { value: 'ano', label: 'Este ano' },
    { value: 'personalizado', label: 'Personalizado' },
  ]

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Período */}
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <Calendar className="w-4 h-4" />
          <span className="hidden sm:inline">Período:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {periodos.map(opt => (
            <button
              key={opt.value}
              onClick={() => onPeriodoChange(opt.value)}
              disabled={loading}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                periodo === opt.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Separador */}
        <div className="hidden md:block w-px h-6 bg-slate-200" />

        {/* Rota filter */}
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-500" />
          <select
            value={rotaId}
            onChange={e => onRotaChange(e.target.value)}
            disabled={loading}
            className="input text-sm py-1.5 px-3 w-auto min-w-[160px] disabled:opacity-50"
          >
            <option value="">Todas as rotas</option>
            {rotas.map(r => (
              <option key={r.id} value={r.id}>{r.descricao}</option>
            ))}
          </select>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-primary-600 ml-auto">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="hidden sm:inline">Atualizando...</span>
          </div>
        )}
      </div>

      {/* Período personalizado */}
      {periodo === 'personalizado' && (
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-slate-200">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Data Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={e => onDataInicioChange(e.target.value)}
              className="input text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={e => onDataFimChange(e.target.value)}
              className="input text-sm"
            />
          </div>
          <button
            onClick={onAplicarPersonalizado}
            disabled={loading || !dataInicio || !dataFim}
            className="btn-primary text-sm mt-5 disabled:opacity-50"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// LOADING OVERLAY
// ============================================================================

function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex items-start justify-center pt-20">
      <div className="pointer-events-auto bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 px-5 py-3 flex items-center gap-3 animate-pulse">
        <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
        <span className="text-sm font-medium text-slate-700">Atualizando dados...</span>
      </div>
    </div>
  )
}

// ============================================================================
// SECTION CARD WRAPPER
// ============================================================================

function ChartCard({
  title,
  description,
  children,
  action,
  className = '',
}: {
  title: string
  description: string
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`card p-6 ${className}`}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function DashboardClient({ data, rotas, periodoAtual, rotaIdAtual }: DashboardClientProps) {
  const router = useRouter()
  const [periodo, setPeriodo] = useState(periodoAtual)
  const [rotaId, setRotaId] = useState(rotaIdAtual)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentData, setCurrentData] = useState<DashboardData>(data)

  const fetchData = useCallback(async (newPeriodo: string, newRotaId: string, customInicio?: string, customFim?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('periodo', newPeriodo)
      if (newRotaId) params.set('rotaId', newRotaId)
      if (newPeriodo === 'personalizado' && customInicio) params.set('dataInicio', customInicio)
      if (newPeriodo === 'personalizado' && customFim) params.set('dataFim', customFim)

      const res = await fetch(`/api/dashboard?${params.toString()}`)
      if (res.ok) {
        const newData = await res.json()
        setCurrentData(newData)
      }
    } catch {
      // Silently fail — keep existing data
    } finally {
      setLoading(false)
    }
  }, [])

  const handlePeriodoChange = useCallback((novoPeriodo: string) => {
    setPeriodo(novoPeriodo)
    const params = new URLSearchParams()
    params.set('periodo', novoPeriodo)
    if (rotaId) params.set('rotaId', rotaId)
    router.push(`/dashboard?${params.toString()}`)
    fetchData(novoPeriodo, rotaId)
  }, [rotaId, router, fetchData])

  const handleRotaChange = useCallback((novoRotaId: string) => {
    setRotaId(novoRotaId)
    const params = new URLSearchParams()
    params.set('periodo', periodo)
    if (novoRotaId) params.set('rotaId', novoRotaId)
    router.push(`/dashboard?${params.toString()}`)
    fetchData(periodo, novoRotaId)
  }, [periodo, router, fetchData])

  const handleAplicarPersonalizado = useCallback(() => {
    if (dataInicio && dataFim) {
      const params = new URLSearchParams()
      params.set('periodo', 'personalizado')
      params.set('dataInicio', dataInicio)
      params.set('dataFim', dataFim)
      if (rotaId) params.set('rotaId', rotaId)
      router.push(`/dashboard?${params.toString()}`)
      fetchData('personalizado', rotaId, dataInicio, dataFim)
    }
  }, [dataInicio, dataFim, rotaId, router, fetchData])

  const formatCurrency = (value: number) => formatarMoeda(value)
  const d = currentData

  return (
    <div className="space-y-6">
      {/* Loading overlay */}
      {loading && <LoadingOverlay />}

      {/* Filter Bar */}
      <FilterBar
        periodo={periodo}
        rotaId={rotaId}
        rotas={rotas}
        dataInicio={dataInicio}
        dataFim={dataFim}
        onPeriodoChange={handlePeriodoChange}
        onRotaChange={handleRotaChange}
        onDataInicioChange={setDataInicio}
        onDataFimChange={setDataFim}
        onAplicarPersonalizado={handleAplicarPersonalizado}
        loading={loading}
      />

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Receita do Período"
          value={formatarMoeda(d.receitaMes)}
          subtitle={`${d.totalCobrancasMes} cobranças processadas`}
          iconName={DollarSign}
          iconColor="text-emerald-600"
          accentColor="bg-emerald-500"
          trend={{
            value: d.variacaoReceita,
            label: 'vs período anterior',
          }}
          miniChart={{
            data: d.miniChartData,
            color: '#16A34A',
          }}
        />
        <KpiCard
          title="Clientes Ativos"
          value={d.totalClientes}
          subtitle="Total de clientes cadastrados"
          iconName={Users}
          iconColor="text-blue-600"
          accentColor="bg-blue-500"
        />
        <KpiCard
          title="Produtos Locados"
          value={d.produtosLocados}
          subtitle={`${d.produtosEstoque} em estoque`}
          iconName={Package}
          iconColor="text-purple-600"
          accentColor="bg-purple-500"
        />
        <KpiCard
          title="Saldo Devedor"
          value={formatarMoeda(d.saldoDevedor)}
          subtitle={d.saldoDevedor > 0 ? 'Valores pendentes' : 'Sem pendências'}
          iconName={AlertTriangle}
          iconColor={d.saldoDevedor > 0 ? 'text-red-600' : 'text-emerald-600'}
          accentColor={d.saldoDevedor > 0 ? 'bg-red-500' : 'bg-emerald-500'}
        />
      </div>

      {/* Row 2: Receita Mensal + Cobranças por Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Receita Mensal */}
        <ChartCard
          title="Receita Mensal"
          description="Últimos 6 meses"
          action={
            <Link
              href="/relatorios"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              Ver relatório completo →
            </Link>
          }
          className="lg:col-span-2"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.receitaMensal} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="mes"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Receita']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar
                  dataKey="valor"
                  fill="#2563EB"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Gráfico de Distribuição por Status */}
        <ChartCard
          title="Distribuição por Status"
          description="Cobranças do período"
        >
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={d.distribuicaoStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {d.distribuicaoStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [value, 'Cobranças']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {d.distribuicaoStatus.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-slate-600">{item.name}</span>
                </div>
                <span className="text-sm font-medium text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Row 3: Evolução Inadimplência + Receita por Rota */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução da Inadimplência */}
        <ChartCard
          title="Evolução da Inadimplência"
          description="Últimos 6 meses — cobranças atrasadas e saldo devedor"
          action={
            <Link
              href="/relatorios/inadimplencia"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              Ver relatório →
            </Link>
          }
        >
          <EvolucaoInadimplenciaChart data={d.evolucaoInadimplencia} />
        </ChartCard>

        {/* Receita por Rota */}
        <ChartCard
          title="Receita por Rota"
          description="Receita e saldo devedor por rota"
          action={
            <Link
              href="/relatorios/rotas"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              Ver relatório →
            </Link>
          }
        >
          <ReceitaPorRotaChart data={d.receitaPorRota} />
        </ChartCard>
      </div>

      {/* Row 4: Ocupação por Rota + Top Clientes + Receita vs Meta */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ocupação por Rota */}
        <ChartCard
          title="Taxa de Ocupação por Rota"
          description="Produtos locados vs total de produtos"
          action={
            <Link
              href="/relatorios/locacoes-rota"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              Ver detalhes →
            </Link>
          }
        >
          <OcupacaoPorRotaCard data={d.ocupacaoPorRota} />
        </ChartCard>

        {/* Top Clientes */}
        {d.topClientes.length > 0 && (
          <ChartCard
            title="Top Clientes do Período"
            description="Maiores valores de recebimento"
          >
            <div className="space-y-3">
              {d.topClientes.map((cliente, index) => (
                <Link
                  key={cliente.clienteId}
                  href={`/clientes/${cliente.clienteId}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-sm font-semibold text-white shadow-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate group-hover:text-primary-600 transition-colors">
                      {cliente.clienteNome}
                    </p>
                    <p className="text-xs text-slate-400">
                      {cliente.count} cobrança{cliente.count > 1 ? 's' : ''}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    {formatarMoeda(cliente.total)}
                  </p>
                </Link>
              ))}
            </div>
          </ChartCard>
        )}

        {d.topClientes.length === 0 && (
          <ChartCard
            title="Top Clientes do Período"
            description="Maiores valores de recebimento"
          >
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Nenhum cliente no período
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Os top clientes aparecerão aqui quando houver cobranças
              </p>
            </div>
          </ChartCard>
        )}

        {/* Receita vs Meta */}
        <ChartCard
          title="Receita vs Meta"
          description="Progresso em relação à meta mensal"
          action={
            <Link
              href="/relatorios/financeiro"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              Ver financeiro →
            </Link>
          }
        >
          <ReceitaVsMetaCard receitaMes={d.receitaMes} />
        </ChartCard>
      </div>

      {/* Row 5: Cobranças Recentes + Alertas + Atividade */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cobranças Recentes */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Cobranças Recentes</h2>
              <p className="text-sm text-slate-500 mt-0.5">Últimas transações registradas</p>
            </div>
            <Link
              href="/cobrancas"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              Ver todas →
            </Link>
          </div>
          <CobrancasRecentesTable cobrancas={d.cobrancasRecentes} />
        </div>

        {/* Coluna direita: Alertas */}
        <div className="space-y-6">
          <div className="card p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">Alertas</h2>
              <p className="text-sm text-slate-500 mt-0.5">Itens que precisam de atenção</p>
            </div>
            <AlertasCard
              atrasadas={d.cobrancasAtrasadas}
              saldoDevedor={d.saldoDevedor}
              conflictos={d.conflictsPendentes}
            />
          </div>
        </div>
      </div>

      {/* Atividade Recente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AtividadeRecente />

        {/* Summary Footer */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Resumo do Sistema</p>
              <p className="text-xs text-slate-500">Visão geral dos números atuais</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-3 border border-slate-100">
              <p className="text-xs text-slate-500">Clientes</p>
              <p className="text-xl font-bold text-slate-900">{d.totalClientes}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-100">
              <p className="text-xs text-slate-500">Produtos</p>
              <p className="text-xl font-bold text-slate-900">{d.totalProdutos}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-100">
              <p className="text-xs text-slate-500">Em Locação</p>
              <p className="text-xl font-bold text-slate-900">{d.produtosLocados}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-100">
              <p className="text-xs text-slate-500">Cobranças Atrasadas</p>
              <p className="text-xl font-bold text-red-600">{d.cobrancasAtrasadas}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Sistema Online
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
