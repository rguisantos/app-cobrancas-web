'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Edit, LockOpen, KeyRound, Trash2, Loader2,
  User, Mail, Phone, FileText, Shield, Clock, Smartphone,
  Monitor, Calendar, MapPin, Globe, CheckCircle2, XCircle,
  AlertTriangle,
} from 'lucide-react'
import Header from '@/components/layout/header'
import { StatusClienteBadge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toaster'
import { ConfirmModal } from '@/components/ui/confirm-modal'

// ─── Types ──────────────────────────────────────────────────────

interface Sessao {
  id: string
  dispositivo: string | null
  ip: string | null
  userAgent: string | null
  expiraEm: string
  createdAt: string
}

interface PermissoesWeb {
  clientes: boolean; produtos: boolean; rotas: boolean
  locacaoRelocacaoEstoque: boolean; cobrancas: boolean; manutencoes: boolean; relogios: boolean
  relatorios: boolean; dashboard: boolean; agenda: boolean; mapa: boolean
  adminCadastros: boolean; adminUsuarios: boolean; adminDispositivos: boolean; adminSincronizacao: boolean; adminAuditoria: boolean
}

interface PermissoesMobile {
  clientes: boolean; produtos: boolean; alteracaoRelogio: boolean
  locacaoRelocacaoEstoque: boolean; cobrancasFaturas: boolean; manutencoes: boolean
  relatorios: boolean; sincronizacao: boolean
}

interface UsuarioData {
  id: string
  nome: string
  email: string
  cpf: string | null
  telefone: string | null
  tipoPermissao: string
  status: string
  bloqueado: boolean
  tentativasLoginFalhas: number | null
  bloqueadoAte: string | null
  permissoesWeb: PermissoesWeb | null
  permissoesMobile: PermissoesMobile | null
  dataUltimoAcesso: string | null
  ultimoAcessoDispositivo: string | null
  createdAt: string
  updatedAt: string
  rotasPermitidasRel: Array<{ rotaId: string; rota: { id: string; descricao: string } }>
}

// ─── Constants ──────────────────────────────────────────────────

const WEB_PERM_GROUPS = [
  {
    label: 'Cadastros',
    perms: [
      { key: 'clientes', label: 'Clientes' },
      { key: 'produtos', label: 'Produtos' },
      { key: 'rotas', label: 'Rotas' },
    ],
  },
  {
    label: 'Operações',
    perms: [
      { key: 'locacaoRelocacaoEstoque', label: 'Locação/Relocação' },
      { key: 'cobrancas', label: 'Cobranças' },
      { key: 'manutencoes', label: 'Manutenções' },
      { key: 'relogios', label: 'Relógios' },
    ],
  },
  {
    label: 'Visualização',
    perms: [
      { key: 'relatorios', label: 'Relatórios' },
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'agenda', label: 'Agenda' },
      { key: 'mapa', label: 'Mapa' },
    ],
  },
  {
    label: 'Admin',
    perms: [
      { key: 'adminCadastros', label: 'Cadastros' },
      { key: 'adminUsuarios', label: 'Usuários' },
      { key: 'adminDispositivos', label: 'Dispositivos' },
      { key: 'adminSincronizacao', label: 'Sincronização' },
      { key: 'adminAuditoria', label: 'Auditoria' },
    ],
  },
]

const MOBILE_PERM_GROUPS = [
  {
    label: 'Cadastros',
    perms: [
      { key: 'clientes', label: 'Clientes' },
      { key: 'produtos', label: 'Produtos' },
    ],
  },
  {
    label: 'Operações',
    perms: [
      { key: 'alteracaoRelogio', label: 'Alteração de Relógio' },
      { key: 'locacaoRelocacaoEstoque', label: 'Locação/Relocação/Estoque' },
      { key: 'cobrancasFaturas', label: 'Cobranças e Faturas' },
      { key: 'manutencoes', label: 'Manutenções' },
    ],
  },
  {
    label: 'Visualização',
    perms: [
      { key: 'relatorios', label: 'Relatórios' },
      { key: 'sincronizacao', label: 'Sincronização' },
    ],
  },
]

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

// ─── Component ──────────────────────────────────────────────────

export default function UsuarioDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const toast = useToast()

  const [usuario, setUsuario] = useState<UsuarioData | null>(null)
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [usuarioRes, sessoesRes] = await Promise.all([
        fetch(`/api/usuarios/${id}`),
        fetch(`/api/usuarios/${id}/sessoes`),
      ])

      if (!usuarioRes.ok) {
        toast.error('Usuário não encontrado')
        router.push('/admin/usuarios')
        return
      }

      const usuarioData = await usuarioRes.json()
      const sessoesData = sessoesRes.ok ? await sessoesRes.json() : []

      setUsuario(usuarioData)
      setSessoes(sessoesData)
    } catch {
      toast.error('Erro ao carregar dados do usuário')
    } finally {
      setLoading(false)
    }
  }, [id, router, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleUnlock = async () => {
    setActionLoading('unlock')
    try {
      const res = await fetch(`/api/usuarios/${id}/desbloquear`, { method: 'POST' })
      if (res.ok) {
        toast.success('Usuário desbloqueado com sucesso')
        fetchData()
      } else {
        toast.error('Erro ao desbloquear usuário')
      }
    } catch {
      toast.error('Erro ao desbloquear usuário')
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleStatus = async () => {
    setActionLoading('toggle')
    try {
      const newStatus = usuario?.status === 'Ativo' ? 'Inativo' : 'Ativo'
      const res = await fetch(`/api/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        toast.success(`Usuário ${newStatus === 'Ativo' ? 'ativado' : 'desativado'} com sucesso`)
        fetchData()
      } else {
        toast.error('Erro ao alterar status')
      }
    } catch {
      toast.error('Erro ao alterar status')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    setActionLoading('delete')
    try {
      const res = await fetch(`/api/usuarios/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Usuário excluído com sucesso')
        router.push('/admin/usuarios')
      } else {
        toast.error('Erro ao excluir usuário')
      }
    } catch {
      toast.error('Erro ao excluir usuário')
    } finally {
      setActionLoading(null)
      setShowDeleteModal(false)
    }
  }

  const formatDate = (dateStr: string | Date | null) => {
    if (!dateStr) return '—'
    try {
      const d = dateStr instanceof Date ? dateStr : new Date(dateStr)
      return d.toLocaleString('pt-BR')
    } catch {
      return String(dateStr)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    )
  }

  if (!usuario) return null

  return (
    <div className="pb-20 lg:pb-8">
      <Header
        title={usuario.nome}
        subtitle={getTipoLabel(usuario.tipoPermissao)}
        actions={
          <div className="flex gap-2">
            <Link href="/admin/usuarios" className="btn-secondary text-sm">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Link>
            <Link href={`/admin/usuarios/${id}/editar`} className="btn-primary text-sm">
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">Editar</span>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Info */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-primary-600" />
                Informações do Usuário
              </h2>
            </div>
            <div className="p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-start gap-6 mb-6">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-blue-400 flex items-center justify-center text-white font-bold text-3xl shadow-lg flex-shrink-0">
                  {usuario.nome?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-slate-900 truncate">{usuario.nome}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                    <Mail className="w-4 h-4" />
                    {usuario.email}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getTipoColor(usuario.tipoPermissao)}`}>
                      <Shield className="w-3 h-3 mr-1" />
                      {getTipoLabel(usuario.tipoPermissao)}
                    </span>
                    <StatusClienteBadge status={usuario.status} />
                    {usuario.bloqueado && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Bloqueado
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {usuario.cpf && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      CPF
                    </p>
                    <p className="font-medium text-slate-900">{usuario.cpf}</p>
                  </div>
                )}
                {usuario.telefone && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      Telefone
                    </p>
                    <p className="font-medium text-slate-900">{usuario.telefone}</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Permissões Web */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-blue-100/50">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-blue-600" />
                Permissões Web
              </h2>
            </div>
            <div className="p-4 md:p-6">
              {usuario.permissoesWeb ? (
                <div className="space-y-4">
                  {WEB_PERM_GROUPS.map(group => {
                    const activePerms = group.perms.filter(p => (usuario.permissoesWeb as any)?.[p.key])
                    return (
                      <div key={group.label}>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{group.label}</p>
                        <div className="flex flex-wrap gap-2">
                          {group.perms.map(perm => {
                            const active = (usuario.permissoesWeb as any)?.[perm.key]
                            return (
                              <span
                                key={perm.key}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                                  active
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-50 text-slate-400 border border-slate-100 line-through'
                                }`}
                              >
                                {active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                {perm.label}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Sem permissões configuradas</p>
              )}
            </div>
          </section>

          {/* Permissões Mobile */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-purple-100/50">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-purple-600" />
                Permissões Mobile
              </h2>
            </div>
            <div className="p-4 md:p-6">
              {usuario.permissoesMobile ? (
                <div className="space-y-4">
                  {MOBILE_PERM_GROUPS.map(group => (
                    <div key={group.label}>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{group.label}</p>
                      <div className="flex flex-wrap gap-2">
                        {group.perms.map(perm => {
                          const active = (usuario.permissoesMobile as any)?.[perm.key]
                          return (
                            <span
                              key={perm.key}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                                active
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-50 text-slate-400 border border-slate-100 line-through'
                              }`}
                            >
                              {active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {perm.label}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Sem permissões configuradas</p>
              )}
            </div>
          </section>

          {/* Rotas Permitidas (AcessoControlado) */}
          {usuario.tipoPermissao === 'AcessoControlado' && (
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-amber-100/50">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-amber-600" />
                  Rotas Permitidas
                </h2>
              </div>
              <div className="p-4 md:p-6">
                {usuario.rotasPermitidasRel && usuario.rotasPermitidasRel.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {usuario.rotasPermitidasRel.map(r => (
                      <span
                        key={r.rotaId}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        {r.rota.descricao}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Nenhuma rota atribuída</p>
                )}
              </div>
            </section>
          )}

          {/* Sessões Ativas */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-slate-600" />
                Sessões Ativas
                {sessoes.length > 0 && (
                  <span className="bg-primary-100 text-primary-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {sessoes.length}
                  </span>
                )}
              </h2>
            </div>
            <div className="p-4 md:p-6">
              {sessoes.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <Globe className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500">Nenhuma sessão ativa</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {sessoes.map(s => (
                    <div key={s.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                        {s.dispositivo === 'Mobile' ? (
                          <Smartphone className="w-4 h-4 text-slate-600" />
                        ) : (
                          <Monitor className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {s.dispositivo || 'Web'}
                          {s.ip && <span className="text-slate-400 font-normal ml-2">{s.ip}</span>}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {s.userAgent ? s.userAgent.substring(0, 80) : '—'}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-slate-500">Expira</p>
                        <p className="text-xs font-medium text-slate-700">{formatDate(s.expiraEm)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Security Info */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-blue-100/50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Segurança
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Último acesso</p>
                  <p className="font-medium text-slate-900">{formatDate(usuario.dataUltimoAcesso)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  {usuario.ultimoAcessoDispositivo === 'Mobile' ? (
                    <Smartphone className="w-4 h-4 text-slate-500" />
                  ) : (
                    <Monitor className="w-4 h-4 text-slate-500" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-500">Dispositivo</p>
                  <p className="font-medium text-slate-900">{usuario.ultimoAcessoDispositivo || 'Web'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Conta criada em</p>
                  <p className="font-medium text-slate-900">{formatDate(usuario.createdAt)}</p>
                </div>
              </div>

              {/* Lockout info */}
              {usuario.bloqueado && (
                <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Conta bloqueada
                  </p>
                  {usuario.tentativasLoginFalhas !== null && usuario.tentativasLoginFalhas > 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      {usuario.tentativasLoginFalhas} tentativas falhas
                    </p>
                  )}
                  {usuario.bloqueadoAte && (
                    <p className="text-xs text-red-600 mt-0.5">
                      Bloqueado até {formatDate(usuario.bloqueadoAte)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Actions */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-900">Ações</h3>
            </div>
            <div className="p-4 space-y-2">
              <Link
                href={`/admin/usuarios/${id}/editar`}
                className="btn-secondary w-full justify-center"
              >
                <Edit className="w-4 h-4" />
                Editar Usuário
              </Link>

              {usuario.bloqueado && (
                <button
                  onClick={handleUnlock}
                  disabled={actionLoading === 'unlock'}
                  className="btn-secondary w-full justify-center text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                >
                  {actionLoading === 'unlock' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LockOpen className="w-4 h-4" />
                  )}
                  Desbloquear
                </button>
              )}

              <button
                onClick={handleToggleStatus}
                disabled={actionLoading === 'toggle'}
                className={`btn-secondary w-full justify-center ${
                  usuario.status === 'Ativo'
                    ? 'text-slate-600 hover:text-slate-700'
                    : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                {actionLoading === 'toggle' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : usuario.status === 'Ativo' ? (
                  <XCircle className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {usuario.status === 'Ativo' ? 'Desativar' : 'Ativar'}
              </button>

              <button
                onClick={() => setShowDeleteModal(true)}
                disabled={actionLoading === 'delete'}
                className="btn-secondary w-full justify-center text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Excluir
              </button>
            </div>
          </section>

          {/* Quick Links */}
          <section className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Dica
            </h3>
            <p className="text-sm text-amber-700">
              Ao redefinir a senha de um usuário, todas as sessões ativas serão encerradas automaticamente.
            </p>
          </section>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Excluir usuário"
        message={`Tem certeza que deseja excluir o usuário "${usuario.nome}"? Esta ação não pode ser desfeita e todas as sessões serão encerradas.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        isLoading={actionLoading === 'delete'}
      />
    </div>
  )
}
