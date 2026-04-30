'use client'

import { useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  FileText,
  Users,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { extractArray } from '@/lib/utils'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface ComparacaoData {
  receita: { periodo1: number; periodo2: number; variacao: number }
  totalCobrado: { periodo1: number; periodo2: number; variacao: number }
  saldoDevedor: { periodo1: number; periodo2: number; variacao: number }
  totalCobrancas: { periodo1: number; periodo2: number; variacao: number }
  inadimplencia: { periodo1: number; periodo2: number; variacao: number; valor1: number; valor2: number }
  locacoesAtivas: { periodo1: number; periodo2: number; variacao: number }
  cobrancasStatus: {
    periodo1: { status: string; total: number; valor: number }[]
    periodo2: { status: string; total: number; valor: number }[]
  }
  topClientes: {
    periodo1: { nome: string; total_pago: number }[]
    periodo2: { nome: string; total_pago: number }[]
  }
}

export default function ComparativoClient() {
  const [p1Inicio, setP1Inicio] = useState('')
  const [p1Fim, setP1Fim] = useState('')
  const [p2Inicio, setP2Inicio] = useState('')
  const [p2Fim, setP2Fim] = useState('')
  const [rotaId, setRotaId] = useState('all')
  const [rotas, setRotas] = useState<{ id: string; descricao: string }[]>([])
  const [data, setData] = useState<ComparacaoData | null>(null)
  const [loading, setLoading] = useState(false)

  useState(() => {
    fetch('/api/rotas')
      .then(r => r.ok ? r.json() : [])
      .then(d => setRotas(extractArray(d)))
      .catch(() => {})
  })

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  async function handleComparar() {
    if (!p1Inicio || !p1Fim || !p2Inicio || !p2Fim) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        periodo1Inicio: p1Inicio,
        periodo1Fim: p1Fim,
        periodo2Inicio: p2Inicio,
        periodo2Fim: p2Fim,
      })
      if (rotaId !== 'all') params.set('rotaId', rotaId)
      const res = await fetch(`/api/relatorios/comparativo?${params}`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const VariacaoBadge = ({ value, invert = false }: { value: number; invert?: boolean }) => {
    const isPositive = invert ? value < 0 : value > 0
    const isZero = value === 0
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
        isZero
          ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
          : isPositive
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      }`}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : isZero ? null : <TrendingDown className="w-3 h-3" />}
        {value > 0 ? '+' : ''}{value}%
      </span>
    )
  }

  // Chart data for status comparison
  const statusChartData = data ? ['Pago', 'Parcial', 'Pendente', 'Atrasado'].map(status => {
    const p1 = data.cobrancasStatus.periodo1.find(s => s.status === status)
    const p2 = data.cobrancasStatus.periodo2.find(s => s.status === status)
    return {
      status,
      'Período 1': p1?.valor || 0,
      'Período 2': p2?.valor || 0,
    }
  }) : []

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Selecione os períodos para comparação
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Period 1 */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-primary-600 dark:text-primary-400">Período 1 (Base)</label>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-slate-500 dark:text-slate-400">Início</label>
                <input
                  type="date"
                  value={p1Inicio}
                  onChange={e => setP1Inicio(e.target.value)}
                  className="w-full mt-1 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-500 dark:text-slate-400">Fim</label>
                <input
                  type="date"
                  value={p1Fim}
                  onChange={e => setP1Fim(e.target.value)}
                  className="w-full mt-1 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Period 2 */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Período 2 (Comparação)</label>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-slate-500 dark:text-slate-400">Início</label>
                <input
                  type="date"
                  value={p2Inicio}
                  onChange={e => setP2Inicio(e.target.value)}
                  className="w-full mt-1 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-500 dark:text-slate-400">Fim</label>
                <input
                  type="date"
                  value={p2Fim}
                  onChange={e => setP2Fim(e.target.value)}
                  className="w-full mt-1 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          {rotas.length > 0 && (
            <select
              value={rotaId}
              onChange={e => setRotaId(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
            >
              <option value="all">Todas as Rotas</option>
              {rotas.map(r => (
                <option key={r.id} value={r.id}>{r.descricao}</option>
              ))}
            </select>
          )}
          <button
            onClick={handleComparar}
            disabled={loading || !p1Inicio || !p1Fim || !p2Inicio || !p2Fim}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            Comparar
          </button>
        </div>
      </div>

      {/* Results */}
      {data && (
        <>
          {/* KPI Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Receita */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-green-500" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Receita</h4>
                <VariacaoBadge value={data.receita.variacao} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-primary-600 dark:text-primary-400">Período 1</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(data.receita.periodo1)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">Período 2</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(data.receita.periodo2)}</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
                  <div className="bg-primary-500 h-full rounded-l-full" style={{ width: `${data.receita.periodo1 > 0 ? Math.min(50, (data.receita.periodo1 / Math.max(data.receita.periodo1, data.receita.periodo2)) * 50) : 0}%` }} />
                  <div className="bg-emerald-500 h-full rounded-r-full" style={{ width: `${data.receita.periodo2 > 0 ? Math.min(50, (data.receita.periodo2 / Math.max(data.receita.periodo1, data.receita.periodo2)) * 50) : 0}%` }} />
                </div>
              </div>
            </div>

            {/* Saldo Devedor */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Saldo Devedor</h4>
                <VariacaoBadge value={data.saldoDevedor.variacao} invert />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-primary-600 dark:text-primary-400">Período 1</span>
                  <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(data.saldoDevedor.periodo1)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">Período 2</span>
                  <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(data.saldoDevedor.periodo2)}</span>
                </div>
              </div>
            </div>

            {/* Cobranças & Locações */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-primary-500" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Cobranças & Locações</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Cobranças P1 / P2</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{data.totalCobrancas.periodo1} / {data.totalCobrancas.periodo2} <VariacaoBadge value={data.totalCobrancas.variacao} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Locações Ativas P1 / P2</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{data.locacoesAtivas.periodo1} / {data.locacoesAtivas.periodo2} <VariacaoBadge value={data.locacoesAtivas.variacao} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Inadimplência P1 / P2</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">{data.inadimplencia.periodo1} / {data.inadimplencia.periodo2} <VariacaoBadge value={data.inadimplencia.variacao} invert /></span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Comparison Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Cobranças por Status (Valores)
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="Período 1" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Período 2" fill="#16A34A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Clientes Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h4 className="text-sm font-semibold text-primary-600 dark:text-primary-400 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" /> Top 5 Clientes - Período 1
              </h4>
              <div className="space-y-2">
                {data.topClientes.periodo1.map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold dark:bg-primary-900/30 dark:text-primary-400">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 truncate">{c.nome}</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(c.total_pago)}</span>
                  </div>
                ))}
                {data.topClientes.periodo1.length === 0 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">Nenhum dado</p>
                )}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" /> Top 5 Clientes - Período 2
              </h4>
              <div className="space-y-2">
                {data.topClientes.periodo2.map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold dark:bg-emerald-900/30 dark:text-emerald-400">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 truncate">{c.nome}</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(c.total_pago)}</span>
                  </div>
                ))}
                {data.topClientes.periodo2.length === 0 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">Nenhum dado</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
