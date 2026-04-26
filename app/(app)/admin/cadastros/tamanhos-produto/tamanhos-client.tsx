'use client'

import { useState } from 'react'
import { Plus, Loader2, Pencil, Check, X, Trash2, Ruler, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from '@/components/ui/toaster'

interface TamanhoProduto {
  id: string
  nome: string
  createdAt: string
}

interface TamanhosProdutoClientProps {
  tamanhosIniciais: TamanhoProduto[]
}

export default function TamanhosProdutoClient({ tamanhosIniciais }: TamanhosProdutoClientProps) {
  const { error: toastError } = useToast()
  const [tamanhos, setTamanhos] = useState<TamanhoProduto[]>(tamanhosIniciais)
  const [novoNome, setNovoNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  const handleCriar = async () => {
    const nome = novoNome.trim()
    if (!nome) return

    setLoading(true)
    try {
      const res = await fetch('/api/tamanhos-produto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      })
      if (!res.ok) {
        const data = await res.json()
        toastError(data.error || 'Erro ao criar tamanho de produto')
        return
      }
      const novo = await res.json()
      setTamanhos(prev => [...prev, { id: novo.id, nome: novo.nome, createdAt: novo.createdAt }])
      setNovoNome('')
    } catch {
      toastError('Erro ao criar tamanho de produto')
    } finally {
      setLoading(false)
    }
  }

  const handleEditar = async (id: string) => {
    const nome = editNome.trim()
    if (!nome) return

    setEditLoading(true)
    try {
      const res = await fetch(`/api/tamanhos-produto/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      })
      if (!res.ok) {
        const data = await res.json()
        toastError(data.error || 'Erro ao atualizar tamanho de produto')
        return
      }
      const atualizado = await res.json()
      setTamanhos(prev => prev.map(t => t.id === id ? { ...t, nome: atualizado.nome } : t))
      setEditingId(null)
    } catch {
      toastError('Erro ao atualizar tamanho de produto')
    } finally {
      setEditLoading(false)
    }
  }

  const handleExcluir = async (id: string) => {
    if (!confirm('Deseja realmente excluir este tamanho de produto?')) return

    setDeleteLoading(id)
    try {
      const res = await fetch(`/api/tamanhos-produto/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        toastError('Erro ao excluir tamanho de produto')
        return
      }
      setTamanhos(prev => prev.filter(t => t.id !== id))
    } catch {
      toastError('Erro ao excluir tamanho de produto')
    } finally {
      setDeleteLoading(null)
    }
  }

  const startEditing = (tamanho: TamanhoProduto) => {
    setEditingId(tamanho.id)
    setEditNome(tamanho.nome)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditNome('')
  }

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
          Novo Tamanho de Produto
        </h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCriar()}
            placeholder="Ex: 2,00 / 2,20 / Grande / Média..."
            className="input flex-1"
            disabled={loading}
          />
          <button
            onClick={handleCriar}
            disabled={loading || !novoNome.trim()}
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
        {tamanhos.length === 0 ? (
          <div className="empty-state py-12">
            <div className="empty-state-icon">
              <Ruler className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">Nenhum tamanho de produto cadastrado</p>
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
                {tamanhos.map((tamanho) => (
                  <tr key={tamanho.id} className="table-row">
                    {editingId === tamanho.id ? (
                      <>
                        <td className="table-cell px-4">
                          <input
                            type="text"
                            value={editNome}
                            onChange={(e) => setEditNome(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditar(tamanho.id)
                              if (e.key === 'Escape') cancelEditing()
                            }}
                            className="input"
                            autoFocus
                            disabled={editLoading}
                          />
                        </td>
                        <td className="table-cell px-4 hidden sm:table-cell text-slate-500">
                          {format(new Date(tamanho.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                        </td>
                        <td className="table-cell px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEditar(tamanho.id)}
                              disabled={editLoading || !editNome.trim()}
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
                          {tamanho.nome}
                        </td>
                        <td className="table-cell px-4 text-slate-500 hidden sm:table-cell">
                          {format(new Date(tamanho.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                        </td>
                        <td className="table-cell px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => startEditing(tamanho)}
                              className="btn-ghost text-slate-500 hover:bg-slate-100 p-2"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleExcluir(tamanho.id)}
                              disabled={deleteLoading === tamanho.id}
                              className="btn-ghost text-red-500 hover:bg-red-50 p-2"
                              title="Excluir"
                            >
                              {deleteLoading === tamanho.id ? (
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
    </div>
  )
}
