'use client'

import { useState } from 'react'
import { Plus, Loader2, Pencil, Check, X, Trash2, FileText, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface DescricaoProduto {
  id: string
  nome: string
  createdAt: string
}

interface DescricoesProdutoClientProps {
  descricoesIniciais: DescricaoProduto[]
}

export default function DescricoesProdutoClient({ descricoesIniciais }: DescricoesProdutoClientProps) {
  const [descricoes, setDescricoes] = useState<DescricaoProduto[]>(descricoesIniciais)
  const [novoNome, setNovoNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  const handleCriar = async () => {
    const nome = novoNome.trim()
    if (!nome || nome.length < 2) return

    setLoading(true)
    try {
      const res = await fetch('/api/descricoes-produto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Erro ao criar descrição de produto')
        return
      }
      const nova = await res.json()
      setDescricoes(prev => [...prev, { id: nova.id, nome: nova.nome, createdAt: nova.createdAt }])
      setNovoNome('')
    } catch {
      alert('Erro ao criar descrição de produto')
    } finally {
      setLoading(false)
    }
  }

  const handleEditar = async (id: string) => {
    const nome = editNome.trim()
    if (!nome || nome.length < 2) return

    setEditLoading(true)
    try {
      const res = await fetch(`/api/descricoes-produto/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Erro ao atualizar descrição de produto')
        return
      }
      const atualizada = await res.json()
      setDescricoes(prev => prev.map(d => d.id === id ? { ...d, nome: atualizada.nome } : d))
      setEditingId(null)
    } catch {
      alert('Erro ao atualizar descrição de produto')
    } finally {
      setEditLoading(false)
    }
  }

  const handleExcluir = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta descrição de produto?')) return

    setDeleteLoading(id)
    try {
      const res = await fetch(`/api/descricoes-produto/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        alert('Erro ao excluir descrição de produto')
        return
      }
      setDescricoes(prev => prev.filter(d => d.id !== id))
    } catch {
      alert('Erro ao excluir descrição de produto')
    } finally {
      setDeleteLoading(null)
    }
  }

  const startEditing = (descricao: DescricaoProduto) => {
    setEditingId(descricao.id)
    setEditNome(descricao.nome)
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
          Nova Descrição de Produto
        </h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCriar()}
            placeholder="Ex: Azul, Branco, Preto..."
            className="input flex-1"
            disabled={loading}
          />
          <button
            onClick={handleCriar}
            disabled={loading || !novoNome.trim() || novoNome.trim().length < 2}
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
        {descricoes.length === 0 ? (
          <div className="empty-state py-12">
            <div className="empty-state-icon">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">Nenhuma descrição de produto cadastrada</p>
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
                {descricoes.map((descricao) => (
                  <tr key={descricao.id} className="table-row">
                    {editingId === descricao.id ? (
                      <>
                        <td className="table-cell px-4">
                          <input
                            type="text"
                            value={editNome}
                            onChange={(e) => setEditNome(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditar(descricao.id)
                              if (e.key === 'Escape') cancelEditing()
                            }}
                            className="input"
                            autoFocus
                            disabled={editLoading}
                          />
                        </td>
                        <td className="table-cell px-4 hidden sm:table-cell text-slate-500">
                          {format(new Date(descricao.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                        </td>
                        <td className="table-cell px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEditar(descricao.id)}
                              disabled={editLoading || !editNome.trim() || editNome.trim().length < 2}
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
                          {descricao.nome}
                        </td>
                        <td className="table-cell px-4 text-slate-500 hidden sm:table-cell">
                          {format(new Date(descricao.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                        </td>
                        <td className="table-cell px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => startEditing(descricao)}
                              className="btn-ghost text-slate-500 hover:bg-slate-100 p-2"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleExcluir(descricao.id)}
                              disabled={deleteLoading === descricao.id}
                              className="btn-ghost text-red-500 hover:bg-red-50 p-2"
                              title="Excluir"
                            >
                              {deleteLoading === descricao.id ? (
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
