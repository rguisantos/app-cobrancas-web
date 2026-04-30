'use client'

import { useEffect, useState } from 'react'
import {
  Target,
  Plus,
  Trash2,
  Loader2,
  TrendingUp,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle2,
  Clock,
  X,
} from 'lucide-react'
import { extractArray } from '@/lib/utils'

interface Meta {
  id: string
  nome: string
  tipo: string
  valorMeta: number
  valorAtual: number
  dataInicio: string
  dataFim: string
  rotaId: string | null
  status: string
  percentual: number
  diasRestantes: number
}

const TIPO_CONFIG: Record<string, { label: string; icon: any; color: string; unit: string }> = {
  receita: { label: 'Receita', icon: DollarSign, color: '#16A34A', unit: 'R$' },
  cobrancas: { label: 'Cobranças', icon: FileText, color: '#2563EB', unit: '' },
  adimplencia: { label: 'Adimplência', icon: TrendingUp, color: '#D97706', unit: '%' },
}

export default function MetasClient() {
  const [metas, setMetas] = useState<Meta[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState<string>('todas')
  const [rotas, setRotas] = useState<{ id: string; descricao: string }[]>([])

  // Form state
  const [formNome, setFormNome] = useState('')
  const [formTipo, setFormTipo] = useState('receita')
  const [formValor, setFormValor] = useState('')
  const [formInicio, setFormInicio] = useState('')
  const [formFim, setFormFim] = useState('')
  const [formRota, setFormRota] = useState('all')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchMetas()
    fetch('/api/rotas')
      .then(r => r.ok ? r.json() : [])
      .then(d => setRotas(extractArray(d)))
      .catch(() => {})
  }, [])

  async function fetchMetas() {
    try {
      setLoading(true)
      const res = await fetch('/api/metas')
      if (res.ok) setMetas(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!formNome || !formValor || !formInicio || !formFim) return
    setSaving(true)
    try {
      const res = await fetch('/api/metas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formNome,
          tipo: formTipo,
          valorMeta: formValor,
          dataInicio: formInicio,
          dataFim: formFim,
          rotaId: formRota !== 'all' ? formRota : null,
        }),
      })
      if (res.ok) {
        setShowForm(false)
        resetForm()
        fetchMetas()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta meta?')) return
    try {
      const res = await fetch(`/api/metas/${id}`, { method: 'DELETE' })
      if (res.ok) fetchMetas()
    } catch (err) {
      console.error(err)
    }
  }

  function resetForm() {
    setFormNome('')
    setFormTipo('receita')
    setFormValor('')
    setFormInicio('')
    setFormFim('')
    setFormRota('all')
  }

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const formatValue = (meta: Meta) => {
    if (meta.tipo === 'receita') return formatCurrency(meta.valorAtual)
    if (meta.tipo === 'adimplencia') return `${meta.valorAtual.toFixed(1)}%`
    return Math.round(meta.valorAtual).toString()
  }

  const formatTarget = (meta: Meta) => {
    if (meta.tipo === 'receita') return formatCurrency(meta.valorMeta)
    if (meta.tipo === 'adimplencia') return `${meta.valorMeta}%`
    return meta.valorMeta.toString()
  }

  const filteredMetas = metas.filter(m =>
    filtroStatus === 'todas' ? true : m.status === filtroStatus
  )

  const ativas = metas.filter(m => m.status === 'ativa')
  const atingidas = metas.filter(m => m.status === 'atingida')
  const progressoMedio = ativas.length > 0
    ? ativas.reduce((s, m) => s + m.percentual, 0) / ativas.length
    : 0

  function getProgressColor(percentual: number) {
    if (percentual >= 80) return 'bg-green-500'
    if (percentual >= 50) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-primary-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Total de Metas</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{metas.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Ativas</span>
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{ativas.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Atingidas</span>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{atingidas.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Progresso Médio</span>
          </div>
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{progressoMedio.toFixed(0)}%</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {['todas', 'ativa', 'atingida', 'expirada'].map(status => (
            <button
              key={status}
              onClick={() => setFiltroStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filtroStatus === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              {status === 'todas' ? 'Todas' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Meta
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Nova Meta</h3>
            <button onClick={() => { setShowForm(false); resetForm() }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nome da Meta</label>
              <input
                type="text"
                value={formNome}
                onChange={e => setFormNome(e.target.value)}
                placeholder="Ex: Meta Janeiro 2024"
                className="w-full mt-1 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo</label>
              <select
                value={formTipo}
                onChange={e => setFormTipo(e.target.value)}
                className="w-full mt-1 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
              >
                <option value="receita">Receita (R$)</option>
                <option value="cobrancas">Cobranças (quantidade)</option>
                <option value="adimplencia">Adimplência (%)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Valor da Meta {formTipo === 'receita' ? '(R$)' : formTipo === 'adimplencia' ? '(%)' : '(qtd)'}
              </label>
              <input
                type="number"
                value={formValor}
                onChange={e => setFormValor(e.target.value)}
                placeholder={formTipo === 'receita' ? '5000.00' : formTipo === 'adimplencia' ? '90' : '50'}
                className="w-full mt-1 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Rota (opcional)</label>
              <select
                value={formRota}
                onChange={e => setFormRota(e.target.value)}
                className="w-full mt-1 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
              >
                <option value="all">Global (todas as rotas)</option>
                {rotas.map(r => (
                  <option key={r.id} value={r.id}>{r.descricao}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Data Início</label>
              <input
                type="date"
                value={formInicio}
                onChange={e => setFormInicio(e.target.value)}
                className="w-full mt-1 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Data Fim</label>
              <input
                type="date"
                value={formFim}
                onChange={e => setFormFim(e.target.value)}
                className="w-full mt-1 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => { setShowForm(false); resetForm() }}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg dark:text-slate-400 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !formNome || !formValor || !formInicio || !formFim}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar Meta
            </button>
          </div>
        </div>
      )}

      {/* Metas list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : filteredMetas.length === 0 ? (
        <div className="text-center py-12">
          <Target className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Nenhuma meta encontrada</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 text-primary-600 hover:text-primary-700 text-sm font-medium dark:text-primary-400"
          >
            Criar primeira meta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMetas.map(meta => {
            const cfg = TIPO_CONFIG[meta.tipo] || TIPO_CONFIG.receita
            const Icon = cfg.icon
            return (
              <div
                key={meta.id}
                className={`bg-white dark:bg-slate-800 rounded-xl border overflow-hidden transition-shadow hover:shadow-md ${
                  meta.status === 'atingida' ? 'border-green-200 dark:border-green-800' :
                  meta.status === 'expirada' ? 'border-slate-200 dark:border-slate-700' :
                  'border-primary-200 dark:border-primary-800'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${cfg.color}15` }}>
                        <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100">{meta.nome}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{cfg.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        meta.status === 'atingida' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        meta.status === 'expirada' ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' :
                        'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      }`}>
                        {meta.status === 'atingida' ? '✓ Atingida' : meta.status === 'expirada' ? 'Expirada' : 'Ativa'}
                      </span>
                      <button
                        onClick={() => handleDelete(meta.id)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 dark:text-slate-400">{formatValue(meta)} de {formatTarget(meta)}</span>
                      <span className="font-semibold" style={{ color: cfg.color }}>{meta.percentual}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(meta.percentual)}`}
                        style={{ width: `${meta.percentual}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(meta.dataInicio).toLocaleDateString('pt-BR')} - {new Date(meta.dataFim).toLocaleDateString('pt-BR')}</span>
                    </div>
                    {meta.status === 'ativa' && meta.diasRestantes > 0 && (
                      <span className="text-amber-600 dark:text-amber-400">
                        {meta.diasRestantes} dias restantes
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
