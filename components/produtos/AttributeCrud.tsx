'use client'

import { useState } from 'react'
import { Plus, Loader2, Pencil, Check, X, Trash2, ArrowLeft, LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from '@/components/ui/toaster'
import { ConfirmModal } from '@/components/ui/confirm-modal'

// ============================================================================
// TIPOS
// ============================================================================

interface AttributeItem {
  id: string
  nome: string
  createdAt: string
}

interface AttributeCrudConfig {
  /** Rota da API (ex: '/api/tipos-produto') */
  apiBase: string
  /** Nome de exibição singular (ex: 'Tipo de Produto') */
  label: string
  /** Nome de exibição plural (ex: 'Tipos de Produto') */
  labelPlural: string
  /** Placeholder do campo de criação */
  placeholder: string
  /** Ícone para o estado vazio */
  icon: LucideIcon
  /** Comprimento mínimo do nome (padrão: 2) */
  minNameLength?: number
}

interface AttributeCrudProps {
  config: AttributeCrudConfig
  initialItems: AttributeItem[]
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function AttributeCrud({ config, initialItems }: AttributeCrudProps) {
  const {
    apiBase,
    label,
    labelPlural,
    placeholder,
    icon: Icon,
    minNameLength = 2,
  } = config

  const { error: toastError } = useToast()

  const [items, setItems] = useState<AttributeItem[]>(initialItems)
  const [novoNome, setNovoNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  // Modal de confirmação para exclusão
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    id: string
  }>({ open: false, id: '' })

  const isValidName = (name: string) => name.trim().length >= minNameLength

  // ---- CRUD Operations ----

  const handleCriar = async () => {
    const nome = novoNome.trim()
    if (!nome || !isValidName(nome)) return

    setLoading(true)
    try {
      const res = await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      })
      if (!res.ok) {
        const data = await res.json()
        toastError(data.error || `Erro ao criar ${label.toLowerCase()}`)
        return
      }
      const novo = await res.json()
      setItems(prev => [...prev, { id: novo.id, nome: novo.nome, createdAt: novo.createdAt }])
      setNovoNome('')
    } catch {
      toastError(`Erro ao criar ${label.toLowerCase()}`)
    } finally {
      setLoading(false)
    }
  }

  const handleEditar = async (id: string) => {
    const nome = editNome.trim()
    if (!nome || !isValidName(nome)) return

    setEditLoading(true)
    try {
      const res = await fetch(`${apiBase}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      })
      if (!res.ok) {
        const data = await res.json()
        toastError(data.error || `Erro ao atualizar ${label.toLowerCase()}`)
        return
      }
      const atualizado = await res.json()
      setItems(prev => prev.map(item => item.id === id ? { ...item, nome: atualizado.nome } : item))
      setEditingId(null)
    } catch {
      toastError(`Erro ao atualizar ${label.toLowerCase()}`)
    } finally {
      setEditLoading(false)
    }
  }

  const handleExcluir = async (id: string) => {
    setDeleteLoading(id)
    try {
      const res = await fetch(`${apiBase}/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        toastError(`Erro ao excluir ${label.toLowerCase()}`)
        return
      }
      setItems(prev => prev.filter(item => item.id !== id))
    } catch {
      toastError(`Erro ao excluir ${label.toLowerCase()}`)
    } finally {
      setDeleteLoading(null)
      setConfirmModal({ open: false, id: '' })
    }
  }

  const startEditing = (item: AttributeItem) => {
    setEditingId(item.id)
    setEditNome(item.nome)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditNome('')
  }

  // ---- Render ----

  return (
    <div>
      {/* Voltar */}
      <Link
        href="/admin/cadastros"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para Cadastros
      </Link>

      {/* Formulário de criação inline */}
      <div className="card p-4 sm:p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo(a) {label}
        </h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCriar()}
            placeholder={placeholder}
            className="input flex-1"
            disabled={loading}
          />
          <button
            onClick={handleCriar}
            disabled={loading || !isValidName(novoNome)}
            className="btn-primary whitespace-nowrap"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Adicionar</span>
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {items.length === 0 ? (
          <div className="empty-state py-12">
            <div className="empty-state-icon">
              <Icon className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">Nenhum(a) {label.toLowerCase()} cadastrado(a)</p>
            <p className="text-sm text-slate-400 mt-1">Use o formulário acima para adicionar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="table-header px-4 py-3 text-left">Nome</th>
                  <th className="table-header px-4 py-3 text-left hidden sm:table-cell">Data de Criação</th>
                  <th className="table-header px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="table-row">
                    {editingId === item.id ? (
                      <>
                        <td className="table-cell px-4">
                          <input
                            type="text"
                            value={editNome}
                            onChange={(e) => setEditNome(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditar(item.id)
                              if (e.key === 'Escape') cancelEditing()
                            }}
                            className="input"
                            autoFocus
                            disabled={editLoading}
                          />
                        </td>
                        <td className="table-cell px-4 hidden sm:table-cell text-slate-500">
                          {format(new Date(item.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                        </td>
                        <td className="table-cell px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEditar(item.id)}
                              disabled={editLoading || !isValidName(editNome)}
                              className="btn-ghost text-green-600 hover:bg-green-50 p-2"
                              title="Salvar"
                            >
                              {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={editLoading}
                              className="btn-ghost text-slate-500 hover:bg-slate-100 p-2"
                              title="Cancelar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="table-cell px-4 font-medium text-slate-900">
                          {item.nome}
                        </td>
                        <td className="table-cell px-4 text-slate-500 hidden sm:table-cell">
                          {format(new Date(item.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                        </td>
                        <td className="table-cell px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => startEditing(item)}
                              className="btn-ghost text-slate-500 hover:bg-slate-100 p-2"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirmModal({ open: true, id: item.id })}
                              disabled={deleteLoading === item.id}
                              className="btn-ghost text-red-500 hover:bg-red-50 p-2"
                              title="Excluir"
                            >
                              {deleteLoading === item.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de confirmação de exclusão */}
      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: '' })}
        onConfirm={() => handleExcluir(confirmModal.id)}
        title={`Excluir ${label}`}
        message={`Deseja realmente excluir este(a) ${label.toLowerCase()}? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        isLoading={deleteLoading === confirmModal.id}
      />
    </div>
  )
}
