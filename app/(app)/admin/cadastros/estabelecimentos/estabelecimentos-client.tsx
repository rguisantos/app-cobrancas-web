'use client'

import { useState } from 'react'
import { Plus, Loader2, Pencil, Check, X, Trash2, Building2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Estabelecimento {
  id: string
  nome: string
  endereco: string | null
  observacao: string | null
  createdAt: string
}

interface EstabelecimentosClientProps {
  estabelecimentosIniciais: Estabelecimento[]
}

export default function EstabelecimentosClient({ estabelecimentosIniciais }: EstabelecimentosClientProps) {
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>(estabelecimentosIniciais)
  const [novoNome, setNovoNome] = useState('')
  const [novoEndereco, setNovoEndereco] = useState('')
  const [novoObservacao, setNovoObservacao] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editEndereco, setEditEndereco] = useState('')
  const [editObservacao, setEditObservacao] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  const handleCriar = async () => {
    const nome = novoNome.trim()
    if (!nome || nome.length < 2) return

    setLoading(true)
    try {
      const res = await fetch('/api/estabelecimentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          endereco: novoEndereco.trim() || null,
          observacao: novoObservacao.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Erro ao criar estabelecimento')
        return
      }
      const novo = await res.json()
      setEstabelecimentos(prev => [...prev, {
        id: novo.id,
        nome: novo.nome,
        endereco: novo.endereco,
        observacao: novo.observacao,
        createdAt: novo.createdAt,
      }])
      setNovoNome('')
      setNovoEndereco('')
      setNovoObservacao('')
    } catch {
      alert('Erro ao criar estabelecimento')
    } finally {
      setLoading(false)
    }
  }

  const handleEditar = async (id: string) => {
    const nome = editNome.trim()
    if (!nome || nome.length < 2) return

    setEditLoading(true)
    try {
      const res = await fetch(`/api/estabelecimentos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          endereco: editEndereco.trim() || null,
          observacao: editObservacao.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Erro ao atualizar estabelecimento')
        return
      }
      const atualizado = await res.json()
      setEstabelecimentos(prev => prev.map(e => e.id === id ? {
        ...e,
        nome: atualizado.nome,
        endereco: atualizado.endereco,
        observacao: atualizado.observacao,
      } : e))
      setEditingId(null)
    } catch {
      alert('Erro ao atualizar estabelecimento')
    } finally {
      setEditLoading(false)
    }
  }

  const handleExcluir = async (id: string) => {
    if (!confirm('Deseja realmente excluir este estabelecimento?')) return

    setDeleteLoading(id)
    try {
      const res = await fetch(`/api/estabelecimentos/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        alert('Erro ao excluir estabelecimento')
        return
      }
      setEstabelecimentos(prev => prev.filter(e => e.id !== id))
    } catch {
      alert('Erro ao excluir estabelecimento')
    } finally {
      setDeleteLoading(null)
    }
  }

  const startEditing = (estab: Estabelecimento) => {
    setEditingId(estab.id)
    setEditNome(estab.nome)
    setEditEndereco(estab.endereco || '')
    setEditObservacao(estab.observacao || '')
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditNome('')
    setEditEndereco('')
    setEditObservacao('')
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
          Novo Estabelecimento
        </h2>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Nome *</label>
              <input
                type="text"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCriar()}
                placeholder="Ex: Barracão, Depósito Central..."
                className="input"
                disabled={loading}
              />
            </div>
          </div>
          <div className="flex gap-3 flex-col sm:flex-row">
            <div className="flex-1">
              <label className="label">Endereço</label>
              <input
                type="text"
                value={novoEndereco}
                onChange={(e) => setNovoEndereco(e.target.value)}
                placeholder="Endereço do estabelecimento"
                className="input"
                disabled={loading}
              />
            </div>
            <div className="flex-1">
              <label className="label">Observação</label>
              <input
                type="text"
                value={novoObservacao}
                onChange={(e) => setNovoObservacao(e.target.value)}
                placeholder="Observação (opcional)"
                className="input"
                disabled={loading}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleCriar}
              disabled={loading || !novoNome.trim() || novoNome.trim().length < 2}
              className="btn-primary"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Adicionar
            </button>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {estabelecimentos.length === 0 ? (
          <div className="empty-state py-12">
            <div className="empty-state-icon">
              <Building2 className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">Nenhum estabelecimento cadastrado</p>
            <p className="text-sm text-slate-400 mt-1">Use o formulário acima para adicionar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="table-header px-4 py-3 text-left">Nome</th>
                  <th className="table-header px-4 py-3 text-left hidden md:table-cell">Endereço</th>
                  <th className="table-header px-4 py-3 text-left hidden lg:table-cell">Observação</th>
                  <th className="table-header px-4 py-3 text-left hidden sm:table-cell">Data de Criação</th>
                  <th className="table-header px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {estabelecimentos.map((estab) => (
                  <tr key={estab.id} className="table-row">
                    {editingId === estab.id ? (
                      <>
                        <td className="table-cell px-4">
                          <input
                            type="text"
                            value={editNome}
                            onChange={(e) => setEditNome(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditar(estab.id)
                              if (e.key === 'Escape') cancelEditing()
                            }}
                            className="input"
                            autoFocus
                            disabled={editLoading}
                          />
                        </td>
                        <td className="table-cell px-4 hidden md:table-cell">
                          <input
                            type="text"
                            value={editEndereco}
                            onChange={(e) => setEditEndereco(e.target.value)}
                            className="input"
                            disabled={editLoading}
                          />
                        </td>
                        <td className="table-cell px-4 hidden lg:table-cell">
                          <input
                            type="text"
                            value={editObservacao}
                            onChange={(e) => setEditObservacao(e.target.value)}
                            className="input"
                            disabled={editLoading}
                          />
                        </td>
                        <td className="table-cell px-4 hidden sm:table-cell text-slate-500">
                          {format(new Date(estab.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                        </td>
                        <td className="table-cell px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEditar(estab.id)}
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
                          {estab.nome}
                        </td>
                        <td className="table-cell px-4 text-slate-500 hidden md:table-cell">
                          {estab.endereco || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="table-cell px-4 text-slate-500 hidden lg:table-cell max-w-[200px] truncate">
                          {estab.observacao || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="table-cell px-4 text-slate-500 hidden sm:table-cell">
                          {format(new Date(estab.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                        </td>
                        <td className="table-cell px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => startEditing(estab)}
                              className="btn-ghost text-slate-500 hover:bg-slate-100 p-2"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleExcluir(estab.id)}
                              disabled={deleteLoading === estab.id}
                              className="btn-ghost text-red-500 hover:bg-red-50 p-2"
                              title="Excluir"
                            >
                              {deleteLoading === estab.id ? (
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
