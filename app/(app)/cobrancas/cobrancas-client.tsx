'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Eye, 
  Edit, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Inbox,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Receipt,
  TrendingUp,
  Calendar,
  Download,
  Trash2,
  CheckSquare,
  Square,
  X,
  Loader2,
  ArrowRightLeft,
} from 'lucide-react'
import { formatarMoeda } from '@/shared/types'
import { useToast } from '@/components/ui/toaster'
import { useState, useCallback } from 'react'
import Header from '@/components/layout/header'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { exportToCSV, exportToXLSX, exportEntityList } from '@/lib/export-utils'

// ============================================================================
// TIPOS
// ============================================================================

interface Cobranca {
  id: string
  clienteId: string
  clienteNome: string
  produtoIdentificador: string
  locacaoId: string
  dataInicio: string | Date
  dataFim: string | Date
  relogioAnterior: number
  relogioAtual: number
  fichasRodadas: number
  totalClientePaga: number
  valorRecebido: number
  saldoDevedorGerado: number
  status: string
  createdAt: string | Date
  podeEditar?: boolean
}

interface CobrancasClientProps {
  cobrancas: Cobranca[]
  total: number
  page: number
  limit: number
  totalRecebido: number
  totalSaldoDevedor: number
  statusFilter?: string
  buscaFilter?: string
}

// ============================================================================
// CONFIGURAÇÃO DE STATUS
// ============================================================================

const statusConfig: Record<string, {
  bg: string
  text: string
  border: string
  icon: typeof CheckCircle
  iconColor: string
  gradient: string
}> = {
  Pago: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle,
    iconColor: 'text-emerald-500',
    gradient: 'from-emerald-500 to-emerald-600',
  },
  Parcial: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: Clock,
    iconColor: 'text-amber-500',
    gradient: 'from-amber-500 to-amber-600',
  },
  Pendente: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: Clock,
    iconColor: 'text-blue-500',
    gradient: 'from-blue-500 to-blue-600',
  },
  Atrasado: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: AlertTriangle,
    iconColor: 'text-red-500',
    gradient: 'from-red-500 to-red-600',
  },
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: XCircle,
    iconColor: 'text-slate-500',
    gradient: 'from-slate-500 to-slate-600',
  }
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
      <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
      {status}
    </span>
  )
}

// ============================================================================
// COMPONENTE DE CARD PARA MOBILE
// ============================================================================

function CobrancaCard({ 
  cobranca, 
  selected, 
  onToggleSelect, 
  podeEditar 
}: { 
  cobranca: Cobranca
  selected: boolean
  onToggleSelect: () => void
  podeEditar: boolean
}) {
  const iniciais = cobranca.clienteNome?.charAt(0)?.toUpperCase() ?? '?'
  const config = statusConfig[cobranca.status] || statusConfig['Pendente']
  
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow ${selected ? 'ring-2 ring-primary-500' : ''}`}>
      {/* Header colorido por status */}
      <div className={`h-1.5 bg-gradient-to-r ${config.gradient}`} />
      
      <div className="p-4 space-y-4">
        {/* Header com avatar e nome */}
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white font-bold shadow-sm flex-shrink-0`}>
            {iniciais}
          </div>
          <div className="flex-1 min-w-0">
            <Link href={`/clientes/${cobranca.clienteId}`} className="font-semibold text-slate-900 hover:text-primary-600 transition-colors truncate block text-lg">
              {cobranca.clienteNome}
            </Link>
            <Link href={`/locacoes/${cobranca.locacaoId}`} className="text-sm text-slate-500 font-mono hover:text-primary-600 flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5" />
              {cobranca.produtoIdentificador}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {podeEditar && (
              <button
                onClick={(e) => { e.preventDefault(); onToggleSelect() }}
                className="p-1 rounded hover:bg-slate-100 transition-colors"
                title={selected ? 'Desmarcar' : 'Selecionar'}
              >
                {selected ? (
                  <CheckSquare className="w-5 h-5 text-primary-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-300" />
                )}
              </button>
            )}
            <StatusBadge status={cobranca.status} />
          </div>
        </div>

        {/* Informações de período e relógio */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm bg-slate-50 -mx-4 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600">
              {format(new Date(cobranca.dataFim), 'dd/MM/yy', { locale: ptBR })}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-slate-600">{cobranca.fichasRodadas.toLocaleString('pt-BR')} fichas</span>
          </div>
        </div>

        {/* Valores */}
        <div className="flex items-end justify-between pt-2">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Valor recebido</p>
            <p className="text-2xl font-bold text-emerald-600">{formatarMoeda(cobranca.valorRecebido)}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-slate-500">
                Total: {formatarMoeda(cobranca.totalClientePaga)}
              </p>
              {cobranca.saldoDevedorGerado > 0 && (
                <p className="text-xs font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                  Saldo: {formatarMoeda(cobranca.saldoDevedorGerado)}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/cobrancas/${cobranca.id}`}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors text-sm font-medium shadow-sm"
            >
              <Eye className="w-4 h-4" />
              Ver
            </Link>
            {cobranca.podeEditar && (
              <Link
                href={`/cobrancas/${cobranca.id}/editar`}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-sm font-medium"
              >
                <Edit className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// COMPONENTE DE TABELA PARA DESKTOP
// ============================================================================

function CobrancasTable({ 
  cobrancas, 
  selectedIds, 
  onToggleSelect, 
  onToggleSelectAll, 
  allSelected, 
  podeEditar 
}: { 
  cobrancas: Cobranca[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  allSelected: boolean
  podeEditar: boolean
}) {
  return (
    <div className="overflow-x-auto -webkit-overflow-scrolling-touch" style={{ WebkitOverflowScrolling: 'touch' }}>
      <table className="w-full text-sm min-w-[900px]">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {podeEditar && (
              <th className="text-center font-medium text-slate-500 px-4 py-3.5 whitespace-nowrap w-12">
                <button
                  onClick={onToggleSelectAll}
                  className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                  title={allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                >
                  {allSelected ? (
                    <CheckSquare className="w-5 h-5 text-primary-600" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-300" />
                  )}
                </button>
              </th>
            )}
            <th className="text-left font-medium text-slate-500 px-4 py-3.5 whitespace-nowrap">Cliente</th>
            <th className="text-left font-medium text-slate-500 px-4 py-3.5 whitespace-nowrap">Produto</th>
            <th className="text-left font-medium text-slate-500 px-4 py-3.5 whitespace-nowrap">Período</th>
            <th className="text-center font-medium text-slate-500 px-4 py-3.5 whitespace-nowrap">Fichas</th>
            <th className="text-right font-medium text-slate-500 px-4 py-3.5 whitespace-nowrap">Total</th>
            <th className="text-right font-medium text-slate-500 px-4 py-3.5 whitespace-nowrap">Recebido</th>
            <th className="text-center font-medium text-slate-500 px-4 py-3.5 whitespace-nowrap">Status</th>
            <th className="text-center font-medium text-slate-500 px-4 py-3.5 whitespace-nowrap">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {cobrancas.map(c => {
            const config = statusConfig[c.status] || statusConfig['Pendente']
            const isSelected = selectedIds.has(c.id)
            return (
              <tr key={c.id} className={`hover:bg-slate-50 transition-colors group ${isSelected ? 'bg-primary-50/50' : ''}`}>
                {podeEditar && (
                  <td className="px-4 py-3.5 text-center">
                    <button
                      onClick={() => onToggleSelect(c.id)}
                      className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-primary-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300" />
                      )}
                    </button>
                  </td>
                )}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center text-sm font-bold text-white shadow-sm flex-shrink-0`}>
                      {c.clienteNome?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <Link href={`/clientes/${c.clienteId}`} className="font-semibold text-slate-900 hover:text-primary-600 truncate max-w-[180px] block">
                        {c.clienteNome}
                      </Link>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <Link href={`/locacoes/${c.locacaoId}`} className="font-mono text-slate-700 hover:text-primary-600 whitespace-nowrap flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-slate-400" />
                    {c.produtoIdentificador}
                  </Link>
                </td>
                <td className="px-4 py-3.5 text-slate-600 text-xs whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {format(new Date(c.dataInicio), 'dd/MM/yy', { locale: ptBR })} — {format(new Date(c.dataFim), 'dd/MM/yy', { locale: ptBR })}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {c.fichasRodadas.toLocaleString('pt-BR')}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right text-slate-700 font-medium">{formatarMoeda(c.totalClientePaga)}</td>
                <td className="px-4 py-3.5 text-right">
                  <span className="font-bold text-emerald-600 text-base">{formatarMoeda(c.valorRecebido)}</span>
                  {c.saldoDevedorGerado > 0 && (
                    <p className="text-xs font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded inline-block ml-1">
                      -{formatarMoeda(c.saldoDevedorGerado)}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3.5 text-center"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-center gap-1">
                    <Link 
                      href={`/cobrancas/${c.id}`}
                      className="p-2.5 rounded-lg hover:bg-primary-50 text-slate-500 hover:text-primary-600 transition-colors group-hover:bg-primary-50"
                      title="Ver detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    {c.podeEditar && (
                      <Link 
                        href={`/cobrancas/${c.id}/editar`}
                        className="p-2.5 rounded-lg hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-colors"
                        title="Editar (última cobrança)"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================================
// BARRA DE AÇÕES EM LOTE
// ============================================================================

function BatchActionBar({
  selectedCount,
  onClearSelection,
  onBatchDelete,
  onBatchUpdateStatus,
  loading,
}: {
  selectedCount: number
  onClearSelection: () => void
  onBatchDelete: () => void
  onBatchUpdateStatus: (status: string) => void
  loading: boolean
}) {
  const [showStatusSelect, setShowStatusSelect] = useState(false)
  const statusOptions = [
    { value: 'Pago', label: 'Pago' },
    { value: 'Parcial', label: 'Parcial' },
    { value: 'Pendente', label: 'Pendente' },
    { value: 'Atrasado', label: 'Atrasado' },
  ]

  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-slate-900 text-white rounded-xl shadow-2xl px-5 py-3 flex items-center gap-3">
        <span className="text-sm font-medium">
          {selectedCount} selecionado{selectedCount > 1 ? 's' : ''}
        </span>
        <div className="w-px h-6 bg-slate-700" />
        <button
          onClick={onBatchDelete}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Excluir
        </button>
        <div className="relative">
          <button
            onClick={() => setShowStatusSelect(!showStatusSelect)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
            Alterar Status
          </button>
          {showStatusSelect && (
            <div className="absolute bottom-full mb-2 left-0 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 w-52 z-50">
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                Alterar Status Para
              </div>
              {statusOptions.map(s => (
                <button
                  key={s.value}
                  onClick={() => { onBatchUpdateStatus(s.value); setShowStatusSelect(false) }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onClearSelection}
          className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
          title="Limpar seleção"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function CobrancasClient({
  cobrancas,
  total,
  page,
  limit,
  totalRecebido,
  totalSaldoDevedor,
  statusFilter,
  buscaFilter,
}: CobrancasClientProps) {
  const { error: toastError } = useToast()
  const [busca, setBusca] = useState(buscaFilter || '')
  const [status, setStatus] = useState(statusFilter || '')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchLoading, setBatchLoading] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({ open: false, title: '', message: '', onConfirm: () => {} })

  const totalPages = Math.ceil(total / limit)

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === cobrancas.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(cobrancas.map(c => c.id)))
    }
  }, [selectedIds.size, cobrancas])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleExportCSV = () => {
    const data = exportEntityList('cobrancas', cobrancas)
    exportToCSV(data, `cobrancas_${new Date().toISOString().split('T')[0]}`)
  }

  const handleExportXLSX = async () => {
    const data = exportEntityList('cobrancas', cobrancas)
    const columns = Object.keys(data[0] || {}).map(key => ({ key, label: key }))
    await exportToXLSX(data, columns, `cobrancas_${new Date().toISOString().split('T')[0]}`)
  }

  const handleBatchDelete = () => {
    setConfirmModal({
      open: true,
      title: 'Excluir cobranças selecionadas',
      message: `Tem certeza que deseja excluir ${selectedIds.size} cobrança${selectedIds.size > 1 ? 's' : ''}? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setBatchLoading(true)
        try {
          const res = await fetch('/api/cobrancas/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', ids: Array.from(selectedIds) }),
          })
          if (res.ok) {
            setSelectedIds(new Set())
            window.location.reload()
          } else {
            const data = await res.json()
            toastError(data.error || 'Erro ao excluir cobranças')
          }
        } catch {
          toastError('Erro ao excluir cobranças')
        } finally {
          setBatchLoading(false)
          setConfirmModal(prev => ({ ...prev, open: false }))
        }
      },
    })
  }

  const handleBatchUpdateStatus = (newStatus: string) => {
    setConfirmModal({
      open: true,
      title: 'Alterar status das cobranças',
      message: `Tem certeza que deseja alterar o status de ${selectedIds.size} cobrança${selectedIds.size > 1 ? 's' : ''} para "${newStatus}"?`,
      onConfirm: async () => {
        setBatchLoading(true)
        try {
          const res = await fetch('/api/cobrancas/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'updateStatus', ids: Array.from(selectedIds), data: { status: newStatus } }),
          })
          if (res.ok) {
            setSelectedIds(new Set())
            window.location.reload()
          } else {
            const data = await res.json()
            toastError(data.error || 'Erro ao alterar status')
          }
        } catch {
          toastError('Erro ao alterar status')
        } finally {
          setBatchLoading(false)
          setConfirmModal(prev => ({ ...prev, open: false }))
        }
      },
    })
  }

  const allSelected = cobrancas.length > 0 && selectedIds.size === cobrancas.length

  // Verificar se tem permissão para batch (podeEditar via cobrança)
  const podeEditar = cobrancas.some(c => c.podeEditar)

  return (
    <div>
      <Header
        title="Cobranças"
        subtitle={`${total} registro${total !== 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="btn-secondary text-sm flex items-center gap-1.5"
              title="Exportar para CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              onClick={handleExportXLSX}
              className="btn-secondary text-sm flex items-center gap-1.5"
              title="Exportar para Excel"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">XLSX</span>
            </button>
            <Link href="/cobrancas/nova" className="btn-primary text-sm">+ Nova Cobrança</Link>
          </div>
        }
      />

      {/* Resumo totalizadores */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-emerald-200 shadow-sm overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600" />
          <div className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-100">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-emerald-600 font-medium">Total Recebido</p>
                <p className="text-2xl md:text-3xl font-bold text-emerald-700">{formatarMoeda(totalRecebido)}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-red-500 to-red-600" />
          <div className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-red-100">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-red-600 font-medium">Saldo Devedor</p>
                <p className="text-2xl md:text-3xl font-bold text-red-700">{formatarMoeda(totalSaldoDevedor)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
        <form className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="label text-xs flex items-center gap-1.5 mb-1.5">
              <Search className="w-3.5 h-3.5" />
              Buscar
            </label>
            <input
              name="busca"
              className="input text-sm"
              placeholder="Cliente ou produto..."
              defaultValue={buscaFilter}
            />
          </div>
          <div className="w-40 md:w-48">
            <label className="label text-xs flex items-center gap-1.5 mb-1.5">
              <Filter className="w-3.5 h-3.5" />
              Status
            </label>
            <select name="status" className="input text-sm" defaultValue={statusFilter}>
              <option value="">Todos</option>
              <option value="Pago">Pago</option>
              <option value="Parcial">Parcial</option>
              <option value="Pendente">Pendente</option>
              <option value="Atrasado">Atrasado</option>
            </select>
          </div>
          <button type="submit" className="btn-primary text-sm py-2.5 px-5">Filtrar</button>
          <Link href="/cobrancas" className="btn-secondary text-sm py-2.5 px-5 hidden sm:inline-flex">Limpar</Link>
        </form>
      </div>

      {/* Conteúdo */}
      {cobrancas.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
              <Inbox className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Nenhuma cobrança encontrada
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              {buscaFilter || statusFilter
                ? 'Tente ajustar os filtros para encontrar o que procura.'
                : 'As cobranças aparecerão aqui assim que forem registradas no sistema.'}
            </p>
            <Link href="/cobrancas/nova" className="btn-primary">
              + Nova Cobrança
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Cards em mobile, tabela em desktop */}
          <div className="block lg:hidden space-y-4">
            {cobrancas.map(c => (
              <CobrancaCard 
                key={c.id} 
                cobranca={c}
                selected={selectedIds.has(c.id)}
                onToggleSelect={() => toggleSelect(c.id)}
                podeEditar={podeEditar}
              />
            ))}
          </div>
          
          <div className="hidden lg:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <CobrancasTable 
              cobrancas={cobrancas}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              allSelected={allSelected}
              podeEditar={podeEditar}
            />
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">
                Mostrando <span className="font-medium">{(page - 1) * limit + 1}</span>–<span className="font-medium">{Math.min(page * limit, total)}</span> de <span className="font-medium">{total}</span>
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`?page=${page - 1}&status=${statusFilter || ''}&busca=${buscaFilter || ''}`}
                    className="btn-secondary py-2 px-4 text-sm flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`?page=${page + 1}&status=${statusFilter || ''}&busca=${buscaFilter || ''}`}
                    className="btn-primary py-2 px-4 text-sm flex items-center gap-1"
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Barra de ações em lote */}
      {podeEditar && (
        <BatchActionBar
          selectedCount={selectedIds.size}
          onClearSelection={clearSelection}
          onBatchDelete={handleBatchDelete}
          onBatchUpdateStatus={handleBatchUpdateStatus}
          loading={batchLoading}
        />
      )}

      {/* Modal de confirmação */}
      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Confirmar"
        cancelText="Cancelar"
        variant="danger"
        isLoading={batchLoading}
      />
    </div>
  )
}
