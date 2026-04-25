'use client'

import Link from 'next/link'
import { 
  Users,
  Phone,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Search,
  Filter,
  Building,
  Download,
  Trash2,
  Route,
  CheckSquare,
  Square,
  X,
  Loader2,
} from 'lucide-react'
import { useState, useCallback } from 'react'
import { StatusClienteBadge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { exportToCSV, exportEntityList } from '@/lib/export-utils'

// ============================================================================
// TIPOS
// ============================================================================

interface Cliente {
  id: string
  identificador: string
  nomeExibicao: string
  telefonePrincipal: string
  cidade: string
  estado: string
  rotaDescricao?: string
  rotaId?: string
  status: string
}

interface ClientesClientProps {
  clientes: Cliente[]
  total: number
  page: number
  limit: number
  rotas: { id: string; descricao: string }[]
  podeEditar: boolean
  buscaFilter?: string
  rotaIdFilter?: string
  statusFilter?: string
}

// ============================================================================
// COMPONENTE DE CARD PARA MOBILE
// ============================================================================

function ClienteCard({ 
  cliente, 
  podeEditar, 
  selected, 
  onToggleSelect 
}: { 
  cliente: Cliente
  podeEditar: boolean
  selected: boolean
  onToggleSelect: () => void
}) {
  const iniciais = cliente.nomeExibicao?.charAt(0)?.toUpperCase() ?? '?'
  
  return (
    <div className={`card p-4 space-y-3 transition-colors ${selected ? 'ring-2 ring-primary-500 bg-primary-50/30' : ''}`}>
      {/* Header com avatar e nome */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold shadow-sm flex-shrink-0">
          {iniciais}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              #{cliente.identificador}
            </span>
            <StatusClienteBadge status={cliente.status} />
          </div>
          <Link 
            href={`/clientes/${cliente.id}`} 
            className="font-semibold text-slate-900 hover:text-primary-600 transition-colors block mt-1"
          >
            {cliente.nomeExibicao}
          </Link>
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
          <Phone className="w-3.5 h-3.5 text-slate-400" />
          <span>{cliente.telefonePrincipal}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-600">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span>{cliente.cidade}/{cliente.estado}</span>
        </div>
      </div>

      {/* Rota */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-600">
            {cliente.rotaDescricao ?? <span className="text-slate-400">Sem rota</span>}
          </span>
        </div>
        <Link
          href={`/clientes/${cliente.id}`}
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

function ClientesTable({ 
  clientes, 
  podeEditar, 
  selectedIds, 
  onToggleSelect, 
  onToggleSelectAll, 
  allSelected 
}: { 
  clientes: Cliente[]
  podeEditar: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  allSelected: boolean
}) {
  return (
    <div className="overflow-x-auto -webkit-overflow-scrolling-touch" style={{ WebkitOverflowScrolling: 'touch' }}>
      <table className="w-full text-sm min-w-[700px]">
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
            <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Código</th>
            <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Nome</th>
            <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Telefone</th>
            <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Rota</th>
            <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Cidade</th>
            <th className="text-center font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Status</th>
            <th className="px-4 py-3 whitespace-nowrap" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {clientes.map(c => {
            const isSelected = selectedIds.has(c.id)
            return (
              <tr key={c.id} className={`hover:bg-slate-50 transition-colors group ${isSelected ? 'bg-primary-50/50' : ''}`}>
                {podeEditar && (
                  <td className="px-4 py-3 text-center">
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
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.identificador}</td>
                <td className="px-4 py-3">
                  <Link href={`/clientes/${c.id}`} className="font-medium text-slate-900 hover:text-primary-600 transition-colors">
                    {c.nomeExibicao}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{c.telefonePrincipal}</td>
                <td className="px-4 py-3 text-slate-600">{c.rotaDescricao ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{c.cidade}/{c.estado}</td>
                <td className="px-4 py-3 text-center"><StatusClienteBadge status={c.status} /></td>
                <td className="px-4 py-3">
                  <Link href={`/clientes/${c.id}`} className="text-primary-600 hover:text-primary-800 text-xs font-medium">
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
  onBatchUpdateRota,
  rotas,
  loading,
}: {
  selectedCount: number
  onClearSelection: () => void
  onBatchDelete: () => void
  onBatchUpdateRota: (rotaId: string) => void
  rotas: { id: string; descricao: string }[]
  loading: boolean
}) {
  const [showRotaSelect, setShowRotaSelect] = useState(false)

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
            onClick={() => setShowRotaSelect(!showRotaSelect)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Route className="w-4 h-4" />}
            Alterar Rota
          </button>
          {showRotaSelect && (
            <div className="absolute bottom-full mb-2 left-0 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 w-64 max-h-72 overflow-y-auto z-50">
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                Selecionar Rota
              </div>
              {rotas.map(r => (
                <button
                  key={r.id}
                  onClick={() => { onBatchUpdateRota(r.id); setShowRotaSelect(false) }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                >
                  {r.descricao}
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

export function ClientesClient({
  clientes,
  total,
  page,
  limit,
  rotas,
  podeEditar,
  buscaFilter,
  rotaIdFilter,
  statusFilter,
}: ClientesClientProps) {
  const totalPages = Math.ceil(total / limit)
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
    if (selectedIds.size === clientes.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(clientes.map(c => c.id)))
    }
  }, [selectedIds.size, clientes])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleExport = () => {
    const data = exportEntityList('clientes', clientes)
    exportToCSV(data, `clientes_${new Date().toISOString().split('T')[0]}`)
  }

  const handleBatchDelete = async () => {
    setConfirmModal({
      open: true,
      title: 'Excluir clientes selecionados',
      message: `Tem certeza que deseja excluir ${selectedIds.size} cliente${selectedIds.size > 1 ? 's' : ''}? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setBatchLoading(true)
        try {
          const res = await fetch('/api/clientes/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', ids: Array.from(selectedIds) }),
          })
          if (res.ok) {
            setSelectedIds(new Set())
            window.location.reload()
          } else {
            const data = await res.json()
            alert(data.error || 'Erro ao excluir clientes')
          }
        } catch {
          alert('Erro ao excluir clientes')
        } finally {
          setBatchLoading(false)
          setConfirmModal(prev => ({ ...prev, open: false }))
        }
      },
    })
  }

  const handleBatchUpdateRota = async (rotaId: string) => {
    const rota = rotas.find(r => r.id === rotaId)
    setConfirmModal({
      open: true,
      title: 'Alterar rota dos clientes',
      message: `Tem certeza que deseja alterar a rota de ${selectedIds.size} cliente${selectedIds.size > 1 ? 's' : ''} para "${rota?.descricao ?? 'N/A'}"?`,
      onConfirm: async () => {
        setBatchLoading(true)
        try {
          const res = await fetch('/api/clientes/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'updateRota', ids: Array.from(selectedIds), data: { rotaId } }),
          })
          if (res.ok) {
            setSelectedIds(new Set())
            window.location.reload()
          } else {
            const data = await res.json()
            alert(data.error || 'Erro ao alterar rota')
          }
        } catch {
          alert('Erro ao alterar rota')
        } finally {
          setBatchLoading(false)
          setConfirmModal(prev => ({ ...prev, open: false }))
        }
      },
    })
  }

  const allSelected = clientes.length > 0 && selectedIds.size === clientes.length

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
            placeholder="Nome, código ou telefone..." 
            defaultValue={buscaFilter} 
          />
        </div>
        <div className="w-36 md:w-48">
          <label className="label text-xs flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            Rota
          </label>
          <select name="rotaId" className="input text-sm" defaultValue={rotaIdFilter}>
            <option value="">Todas as rotas</option>
            {rotas.map(r => <option key={r.id} value={r.id}>{r.descricao}</option>)}
          </select>
        </div>
        <div className="w-28 md:w-36">
          <label className="label text-xs">Status</label>
          <select name="status" className="input text-sm" defaultValue={statusFilter}>
            <option value="">Todos</option>
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
          </select>
        </div>
        <button type="submit" className="btn-primary text-sm py-2">Filtrar</button>
        <Link href="/clientes" className="btn-secondary text-sm py-2 hidden sm:inline-flex">Limpar</Link>
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
      {clientes.length === 0 ? (
        <div className="card">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Nenhum cliente encontrado
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              {buscaFilter || rotaIdFilter || statusFilter
                ? 'Tente ajustar os filtros para encontrar o que procura.'
                : 'Os clientes aparecerão aqui assim que forem cadastrados.'}
            </p>
            {podeEditar && (
              <Link href="/clientes/novo" className="btn-primary">
                + Novo Cliente
              </Link>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Cards em mobile, tabela em desktop */}
          <div className="block lg:hidden space-y-3">
            {clientes.map(c => (
              <ClienteCard 
                key={c.id} 
                cliente={c} 
                podeEditar={podeEditar}
                selected={selectedIds.has(c.id)}
                onToggleSelect={() => toggleSelect(c.id)}
              />
            ))}
          </div>
          
          <div className="hidden lg:block card overflow-hidden">
            <ClientesTable 
              clientes={clientes} 
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
                    href={`?page=${page - 1}&busca=${buscaFilter || ''}&rotaId=${rotaIdFilter || ''}&status=${statusFilter || ''}`}
                    className="btn-secondary py-2 px-3 text-sm flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`?page=${page + 1}&busca=${buscaFilter || ''}&rotaId=${rotaIdFilter || ''}&status=${statusFilter || ''}`}
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
            Role para ver mais clientes
          </p>
        </>
      )}

      {/* Barra de ações em lote */}
      {podeEditar && (
        <BatchActionBar
          selectedCount={selectedIds.size}
          onClearSelection={clearSelection}
          onBatchDelete={handleBatchDelete}
          onBatchUpdateRota={handleBatchUpdateRota}
          rotas={rotas}
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
