'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  UserPlus, Shield, Mail, Clock, MapPin, Edit,
  Search, LockOpen, CheckCircle2, XCircle, Eye,
  Loader2, AlertTriangle,
} from 'lucide-react'
import Header from '@/components/layout/header'
import { StatusClienteBadge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toaster'

// ─── Types ──────────────────────────────────────────────────────

interface Usuario {
  id: string
  nome: string
  email: string
  cpf: string | null
  telefone: string | null
  tipoPermissao: string
  status: string
  bloqueado: boolean
  dataUltimoAcesso: string | null
  ultimoAcessoDispositivo: string | null
  createdAt: string
  rotasPermitidasRel: Array<{ rotaId: string; rota: { id: string; descricao: string } }>
  permissoesWeb: any
  permissoesMobile: any
}

// ─── Helpers ────────────────────────────────────────────────────

const getTipoColor = (tipo: string) => {
  switch (tipo) {
    case 'Administrador': return 'bg-purple-100 text-purple-700 border-purple-200'
    case 'Secretario': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'AcessoControlado': return 'bg-amber-100 text-amber-700 border-amber-200'
    default: return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

const getTipoLabel = (tipo: string) => {
  switch (tipo) {
    case 'Administrador': return 'Administrador'
    case 'Secretario': return 'Secretário'
    case 'AcessoControlado': return 'Acesso Controlado'
    default: return tipo
  }
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

// ─── Component ──────────────────────────────────────────────────

export default function UsuariosPage() {
  const toast = useToast()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState<string>('todos')
  const [filterStatus, setFilterStatus] = useState<string>('todos')

  const fetchUsuarios = useCallback(async () => {
    try {
      const res = await fetch('/api/usuarios')
      if (res.ok) {
        const data = await res.json()
        setUsuarios(data)
      } else {
        toast.error('Erro ao carregar usuários')
      }
    } catch {
      toast.error('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchUsuarios()
  }, [fetchUsuarios])

  const handleUnlock = async (userId: string, userName: string) => {
    setActionLoading(userId)
    try {
      const res = await fetch(`/api/usuarios/${userId}/desbloquear`, { method: 'POST' })
      if (res.ok) {
        toast.success(`Usuário "${userName}" desbloqueado`)
        fetchUsuarios()
      } else {
        toast.error('Erro ao desbloquear')
      }
    } catch {
      toast.error('Erro ao desbloquear')
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleStatus = async (userId: string, currentStatus: string, userName: string) => {
    setActionLoading(userId)
    try {
      const newStatus = currentStatus === 'Ativo' ? 'Inativo' : 'Ativo'
      const res = await fetch(`/api/usuarios/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        toast.success(`Usuário "${userName}" ${newStatus === 'Ativo' ? 'ativado' : 'desativado'}`)
        fetchUsuarios()
      } else {
        toast.error('Erro ao alterar status')
      }
    } catch {
      toast.error('Erro ao alterar status')
    } finally {
      setActionLoading(null)
    }
  }

  // Filtered list
  const filteredUsuarios = useMemo(() => {
    return usuarios.filter(u => {
      // Search
      if (search) {
        const q = search.toLowerCase()
        const matchesNome = u.nome.toLowerCase().includes(q)
        const matchesEmail = u.email.toLowerCase().includes(q)
        if (!matchesNome && !matchesEmail) return false
      }
      // Tipo filter
      if (filterTipo !== 'todos' && u.tipoPermissao !== filterTipo) return false
      // Status filter
      if (filterStatus !== 'todos') {
        if (filterStatus === 'bloqueado' && !u.bloqueado) return false
        if (filterStatus === 'Ativo' && (u.status !== 'Ativo' || u.bloqueado)) return false
        if (filterStatus === 'Inativo' && u.status !== 'Inativo') return false
      }
      return true
    })
  }, [usuarios, search, filterTipo, filterStatus])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div>
      <Header
        title="Usuários"
        subtitle={`${usuarios.length} usuário${usuarios.length !== 1 ? 's' : ''} cadastrado${usuarios.length !== 1 ? 's' : ''}`}
        actions={
          <Link href="/admin/usuarios/novo" className="btn-primary">
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Usuário</span>
          </Link>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-sm"
          />
        </div>
        <select
          value={filterTipo}
          onChange={e => setFilterTipo(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all bg-white text-sm"
        >
          <option value="todos">Todos os tipos</option>
          <option value="Administrador">Administrador</option>
          <option value="Secretario">Secretário</option>
          <option value="AcessoControlado">Acesso Controlado</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all bg-white text-sm"
        >
          <option value="todos">Todos os status</option>
          <option value="Ativo">Ativo</option>
          <option value="Inativo">Inativo</option>
          <option value="bloqueado">Bloqueado</option>
        </select>
      </div>

      {/* Results count */}
      {(search || filterTipo !== 'todos' || filterStatus !== 'todos') && (
        <p className="text-sm text-slate-500 mb-4">
          {filteredUsuarios.length} resultado{filteredUsuarios.length !== 1 ? 's' : ''} encontrado{filteredUsuarios.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left font-medium text-slate-500 px-6 py-4">Nome</th>
                <th className="text-left font-medium text-slate-500 px-6 py-4">Email</th>
                <th className="text-center font-medium text-slate-500 px-6 py-4">Tipo</th>
                <th className="text-center font-medium text-slate-500 px-6 py-4">Status</th>
                <th className="text-left font-medium text-slate-500 px-6 py-4">Rotas</th>
                <th className="text-left font-medium text-slate-500 px-6 py-4">Último Acesso</th>
                <th className="text-center font-medium text-slate-500 px-6 py-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsuarios.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <Link href={`/admin/usuarios/${u.id}`} className="flex items-center gap-3 group-hover:text-primary-600 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {u.nome[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <span className="font-medium text-slate-900 group-hover:text-primary-600 transition-colors">{u.nome}</span>
                        {u.bloqueado && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">
                            BLOQUEADO
                          </span>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{u.email}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getTipoColor(u.tipoPermissao)}`}>
                      {getTipoLabel(u.tipoPermissao)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StatusClienteBadge status={u.status} />
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-xs">
                    {u.rotasPermitidasRel?.length > 0
                      ? u.rotasPermitidasRel.map(r => r.rota.descricao).join(', ')
                      : <span className="text-slate-400">Todas</span>}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {formatDate(u.dataUltimoAcesso)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        href={`/admin/usuarios/${u.id}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/admin/usuarios/${u.id}/editar`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      {u.bloqueado && (
                        <button
                          onClick={() => handleUnlock(u.id, u.nome)}
                          disabled={actionLoading === u.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Desbloquear"
                        >
                          {actionLoading === u.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <LockOpen className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleStatus(u.id, u.status, u.nome)}
                        disabled={actionLoading === u.id}
                        className={`p-1.5 rounded-lg transition-colors ${
                          u.status === 'Ativo'
                            ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={u.status === 'Ativo' ? 'Desativar' : 'Ativar'}
                      >
                        {actionLoading === u.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : u.status === 'Ativo' ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsuarios.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {filteredUsuarios.map(u => (
          <div key={u.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <Link href={`/admin/usuarios/${u.id}`} className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                    {u.nome[0]?.toUpperCase() || 'U'}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/admin/usuarios/${u.id}`}>
                      <h3 className="font-semibold text-slate-900 truncate hover:text-primary-600 transition-colors">{u.nome}</h3>
                    </Link>
                    <StatusClienteBadge status={u.status} />
                  </div>
                  <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                    <Mail className="w-3.5 h-3.5" />
                    {u.email}
                  </p>
                  {u.bloqueado && (
                    <span className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-red-600">
                      <AlertTriangle className="w-3 h-3" />
                      Conta bloqueada
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" />
                    Tipo
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getTipoColor(u.tipoPermissao)}`}>
                    {getTipoLabel(u.tipoPermissao)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Último acesso
                  </span>
                  <span className="text-xs font-medium text-slate-700">
                    {formatDate(u.dataUltimoAcesso)}
                  </span>
                </div>

                {u.rotasPermitidasRel?.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-slate-500 flex items-center gap-1 flex-shrink-0">
                      <MapPin className="w-3.5 h-3.5" />
                      Rotas
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {u.rotasPermitidasRel.map(r => (
                        <span key={r.rotaId} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {r.rota.descricao}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <Link
                href={`/admin/usuarios/${u.id}`}
                className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <Eye className="w-4 h-4" />
                Ver detalhes
              </Link>
              <div className="flex items-center gap-1">
                <Link
                  href={`/admin/usuarios/${u.id}/editar`}
                  className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </Link>
                {u.bloqueado && (
                  <button
                    onClick={() => handleUnlock(u.id, u.nome)}
                    disabled={actionLoading === u.id}
                    className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                  >
                    {actionLoading === u.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LockOpen className="w-4 h-4" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => handleToggleStatus(u.id, u.status, u.nome)}
                  disabled={actionLoading === u.id}
                  className={`p-2 rounded-lg transition-colors ${
                    u.status === 'Ativo'
                      ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                      : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                  }`}
                >
                  {actionLoading === u.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : u.status === 'Ativo' ? (
                    <XCircle className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredUsuarios.length === 0 && (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">Nenhum usuário encontrado</p>
          </div>
        )}
      </div>
    </div>
  )
}
