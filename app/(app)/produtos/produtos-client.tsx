'use client'

import Link from 'next/link'
import { 
  Package,
  Box,
  Hash,
  Settings,
  ChevronRight,
  ChevronLeft,
  Search,
  Filter,
  User,
  Wrench,
  Download,
  Trash2,
  CheckSquare,
  Square,
  X,
  Loader2,
  ArrowRightLeft,
} from 'lucide-react'
import { useState, useCallback } from 'react'
import { StatusProdutoBadge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { exportToCSV, exportEntityList } from '@/lib/export-utils'
import { useToast } from '@/components/ui/toaster'

// ============================================================================
// TIPOS
// ============================================================================

interface Produto {
  id: string
  identificador: string
  tipoNome: string
  descricaoNome: string
  tamanhoNome: string
  numeroRelogio: string
  conservacao: string
  statusProduto: string
  clienteNome?: string
  locacaoId?: string
  estabelecimento?: string | null
}

interface ProdutosClientProps {
  produtos: Produto[]
  total: number
  page: number
  limit: number
  podeEditar: boolean
  buscaFilter?: string
  statusFilter?: string
}

// ============================================================================
// COMPONENTE DE CARD PARA MOBILE
// ============================================================================

function ProdutoCard({ 
  produto, 
  podeEditar, 
  selected, 
  onToggleSelect 
}: { 
  produto: Produto
  podeEditar: boolean
  selected: boolean
  onToggleSelect: () => void
}) {
  const estaLocado = !!produto.clienteNome
  
  return (
    <div className={`card p-4 space-y-3 transition-colors ${selected ? 'ring-2 ring-primary-500 bg-primary-50/30' : ''}`}>
      {/* Header com identificador e status */}
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm flex-shrink-0 ${
          estaLocado 
            ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white' 
            : 'bg-gradient-to-br from-slate-400 to-slate-500 text-white'
        }`}>
          {produto.identificador}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-slate-900">{produto.tipoNome}</span>
            <StatusProdutoBadge status={produto.statusProduto} />
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="bg-slate-100 px-2 py-0.5 rounded">{produto.descricaoNome}</span>
            <span className="bg-slate-100 px-2 py-0.5 rounded">{produto.tamanhoNome}</span>
          </div>
        </div>
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
      </div>

      {/* Informações */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <div className="flex items-center gap-1.5 text-slate-600">
          <Hash className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono">Relógio: {produto.numeroRelogio}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-600">
          <Wrench className="w-3.5 h-3.5 text-slate-400" />
          <span>{produto.conservacao}</span>
        </div>
      </div>

      {/* Locação */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          {estaLocado ? (
            <>
              <User className="w-4 h-4 text-purple-500" />
              <Link 
                href={`/locacoes/${produto.locacaoId}`}
                className="text-sm font-medium text-purple-600 hover:text-purple-800"
              >
                {produto.clienteNome}
              </Link>
            </>
          ) : (
            <>
              <Box className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-500">Em estoque</span>
            </>
          )}
        </div>
        <Link
          href={`/produtos/${produto.id}`}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors text-sm font-medium"
        >
          Ver
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}

// ============================================================================
// COMPONENTE DE TABELA PARA DESKTOP
// ============================================================================

function ProdutosTable({ 
  produtos, 
  podeEditar, 
  selectedIds, 
  onToggleSelect, 
  onToggleSelectAll, 
  allSelected 
}: { 
  produtos: Produto[]
  podeEditar: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  allSelected: boolean
}) {
  return (
    <div className="overflow-x-auto -webkit-overflow-scrolling-touch" style={{ WebkitOverflowScrolling: 'touch' }}>
      <table className="w-full text-sm min-w-[800px]">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {podeEditar && (
              <th className="text-center font-medium text-slate-500 px-4 py-3 whitespace-nowrap w-12">
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
            <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Nº</th>
            <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Tipo</th>
            <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Descrição</th>
            <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Tamanho</th>
            <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Relógio</th>
            <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Conservação</th>
            <th className="text-center font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Status</th>
            <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Locado em</th>
            <th className="px-4 py-3 whitespace-nowrap" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {produtos.map(p => {
            const isSelected = selectedIds.has(p.id)
            return (
              <tr key={p.id} className={`hover:bg-slate-50 transition-colors group ${isSelected ? 'bg-primary-50/50' : ''}`}>
                {podeEditar && (
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onToggleSelect(p.id)}
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
                <td className="px-4 py-3 font-mono font-bold text-slate-900">{p.identificador}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{p.tipoNome}</td>
                <td className="px-4 py-3 text-slate-600">{p.descricaoNome}</td>
                <td className="px-4 py-3 text-slate-600">{p.tamanhoNome}</td>
                <td className="px-4 py-3 font-mono text-slate-600">{p.numeroRelogio}</td>
                <td className="px-4 py-3 text-slate-600">{p.conservacao}</td>
                <td className="px-4 py-3 text-center"><StatusProdutoBadge status={p.statusProduto} /></td>
                <td className="px-4 py-3 text-slate-600 text-xs">
                  {p.clienteNome ? (
                    <Link href={`/locacoes/${p.locacaoId}`} className="text-purple-600 hover:text-purple-800 font-medium">
                      {p.clienteNome}
                    </Link>
                  ) : (
                    <span className="text-slate-400">Estoque</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/produtos/${p.id}`} className="text-primary-600 hover:text-primary-800 text-xs font-medium">
                    Ver →
                  </Link>
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
    { value: 'Ativo', label: 'Ativo' },
    { value: 'Inativo', label: 'Inativo' },
    { value: 'Manutenção', label: 'Manutenção' },
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

export function ProdutosClient({
  produtos,
  total,
  page,
  limit,
  podeEditar,
  buscaFilter,
  statusFilter,
}: ProdutosClientProps) {
  const totalPages = Math.ceil(total / limit)
  const { error: toastError } = useToast()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchLoading, setBatchLoading] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({ open: false, title: '', message: '', onConfirm: () => {} })

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === produtos.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(produtos.map(p => p.id)))
    }
  }, [selectedIds.size, produtos])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleExport = () => {
    const data = exportEntityList('produtos', produtos)
    exportToCSV(data, `produtos_${new Date().toISOString().split('T')[0]}`)
  }

  const handleBatchDelete = () => {
    setConfirmModal({
      open: true,
      title: 'Excluir produtos selecionados',
      message: `Tem certeza que deseja excluir ${selectedIds.size} produto${selectedIds.size > 1 ? 's' : ''}? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setBatchLoading(true)
        try {
          const res = await fetch('/api/produtos/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', ids: Array.from(selectedIds) }),
          })
          if (res.ok) {
            setSelectedIds(new Set())
            window.location.reload()
          } else {
            const data = await res.json()
            toastError(data.error || 'Erro ao excluir produtos')
          }
        } catch {
          toastError('Erro ao excluir produtos')
        } finally {
          setBatchLoading(false)
          setConfirmModal(prev => ({ ...prev, open: false }))
        }
      },
    })
  }

  const handleBatchUpdateStatus = (status: string) => {
    setConfirmModal({
      open: true,
      title: 'Alterar status dos produtos',
      message: `Tem certeza que deseja alterar o status de ${selectedIds.size} produto${selectedIds.size > 1 ? 's' : ''} para "${status}"?`,
      onConfirm: async () => {
        setBatchLoading(true)
        try {
          const res = await fetch('/api/produtos/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'updateStatus', ids: Array.from(selectedIds), data: { statusProduto: status } }),
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

  const allSelected = produtos.length > 0 && selectedIds.size === produtos.length

  return (
    <div>
      {/* Filtros */}
      <form className="card p-3 md:p-4 mb-6 flex flex-wrap gap-2 md:gap-3 items-end">
        <div className="flex-1 min-w-[140px]">
          <label className="label text-xs flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" />
            Buscar
          </label>
          <input 
            name="busca" 
            className="input text-sm" 
            placeholder="Número, tipo ou relógio..." 
            defaultValue={buscaFilter} 
          />
        </div>
        <div className="w-32 md:w-44">
          <label className="label text-xs flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            Status
          </label>
          <select name="status" className="input text-sm" defaultValue={statusFilter}>
            <option value="">Todos</option>
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
            <option value="Manutenção">Manutenção</option>
          </select>
        </div>
        <button type="submit" className="btn-primary text-sm py-2">Filtrar</button>
        <Link href="/produtos" className="btn-secondary text-sm py-2 hidden sm:inline-flex">Limpar</Link>
        <button
          type="button"
          onClick={handleExport}
          className="btn-secondary text-sm py-2 flex items-center gap-1.5"
          title="Exportar para CSV"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Exportar CSV</span>
        </button>
      </form>

      {/* Conteúdo */}
      {produtos.length === 0 ? (
        <div className="card">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
              <Package className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Nenhum produto encontrado
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              {buscaFilter || statusFilter
                ? 'Tente ajustar os filtros para encontrar o que procura.'
                : 'Os produtos aparecerão aqui assim que forem cadastrados.'}
            </p>
            {podeEditar && (
              <Link href="/produtos/novo" className="btn-primary">
                + Novo Produto
              </Link>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Cards em mobile, tabela em desktop */}
          <div className="block lg:hidden space-y-3">
            {produtos.map(p => (
              <ProdutoCard 
                key={p.id} 
                produto={p} 
                podeEditar={podeEditar}
                selected={selectedIds.has(p.id)}
                onToggleSelect={() => toggleSelect(p.id)}
              />
            ))}
          </div>
          
          <div className="hidden lg:block card overflow-hidden">
            <ProdutosTable 
              produtos={produtos} 
              podeEditar={podeEditar}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              allSelected={allSelected}
            />
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-slate-500">
                Mostrando {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`?page=${page - 1}&busca=${buscaFilter || ''}&status=${statusFilter || ''}`}
                    className="btn-secondary py-2 px-3 text-sm flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`?page=${page + 1}&busca=${buscaFilter || ''}&status=${statusFilter || ''}`}
                    className="btn-secondary py-2 px-3 text-sm flex items-center gap-1"
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Indicador de scroll para mobile */}
          <p className="text-xs text-slate-400 mt-3 lg:hidden text-center">
            Role para ver mais produtos
          </p>
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
