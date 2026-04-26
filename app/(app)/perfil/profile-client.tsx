'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  User,
  Mail,
  Shield,
  Clock,
  Smartphone,
  Monitor,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Calendar,
  CheckCircle,
  XCircle,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────

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
  permissoesWeb?: PermissoesWeb | null
  permissoesMobile?: PermissoesMobile | null
  dataUltimoAcesso: string | null
  ultimoAcessoDispositivo: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

interface ProfileClientProps {
  usuario: UsuarioData
}

// ─── Helpers ────────────────────────────────────────────────────

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

function getPasswordStrength(password: string): {
  score: number
  label: string
  color: string
  checks: { label: string; pass: boolean }[]
} {
  const checks = [
    { label: 'Pelo menos 8 caracteres', pass: password.length >= 8 },
    { label: 'Letra maiúscula', pass: /[A-Z]/.test(password) },
    { label: 'Letra minúscula', pass: /[a-z]/.test(password) },
    { label: 'Número', pass: /[0-9]/.test(password) },
    { label: 'Caractere especial', pass: /[!@#$%^&*()_+\-=\[\]{}|;:',.<>?\/]/.test(password) },
  ]
  const score = checks.filter(c => c.pass).length
  let label = 'Muito fraca'
  let color = 'bg-red-500'
  if (score === 5) { label = 'Forte'; color = 'bg-emerald-500' }
  else if (score >= 4) { label = 'Boa'; color = 'bg-amber-500' }
  else if (score >= 3) { label = 'Razoável'; color = 'bg-orange-500' }
  else if (score >= 2) { label = 'Fraca'; color = 'bg-red-400' }
  return { score, label, color, checks }
}

function validateSenha(senha: string): string | null {
  if (senha.length < 8) return 'A senha deve ter pelo menos 8 caracteres'
  if (!/[A-Z]/.test(senha)) return 'A senha deve conter pelo menos uma letra maiúscula'
  if (!/[a-z]/.test(senha)) return 'A senha deve conter pelo menos uma letra minúscula'
  if (!/[0-9]/.test(senha)) return 'A senha deve conter pelo menos um número'
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:',.<>?\/]/.test(senha)) return 'A senha deve conter pelo menos um caractere especial'
  return null
}

// ─── Component ──────────────────────────────────────────────────

export default function ProfileClient({ usuario }: ProfileClientProps) {
  const { update: updateSession } = useSession()
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [showSenhaAtual, setShowSenhaAtual] = useState(false)
  const [showNovaSenha, setShowNovaSenha] = useState(false)
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    // Strong password validation
    const senhaError = validateSenha(novaSenha)
    if (senhaError) {
      setMessage({ type: 'error', text: senhaError })
      return
    }

    if (novaSenha !== confirmarSenha) {
      setMessage({ type: 'error', text: 'As senhas não coincidem' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senhaAtual,
          novaSenha,
          confirmarSenha,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ type: 'success', text: 'Senha alterada com sucesso!' })
        setSenhaAtual('')
        setNovaSenha('')
        setConfirmarSenha('')
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao alterar senha' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão. Tente novamente.' })
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = getPasswordStrength(novaSenha)

  const permissaoLabel: Record<string, string> = {
    Administrador: 'Administrador',
    Secretario: 'Secretário',
    AcessoControlado: 'Acesso Controlado',
  }

  const permissaoColor: Record<string, string> = {
    Administrador: 'bg-purple-100 text-purple-700 border-purple-200',
    Secretario: 'bg-blue-100 text-blue-700 border-blue-200',
    AcessoControlado: 'bg-amber-100 text-amber-700 border-amber-200',
  }

  const statusColor = usuario.status === 'Ativo'
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : 'bg-red-100 text-red-700 border-red-200'

  const formatDate = (dateStr: string | Date | null) => {
    if (!dateStr) return 'Nunca'
    try {
      const d = dateStr instanceof Date ? dateStr : new Date(dateStr)
      return d.toLocaleString('pt-BR')
    } catch {
      return String(dateStr)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Coluna principal - Informações */}
      <div className="lg:col-span-2 space-y-6">
        {/* Informações do Usuário */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-600" />
              Informações Pessoais
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
                  <span className={`badge ${permissaoColor[usuario.tipoPermissao] || 'badge-gray'}`}>
                    <Shield className="w-3 h-3 mr-1" />
                    {permissaoLabel[usuario.tipoPermissao] || usuario.tipoPermissao}
                  </span>
                  <span className={`badge ${statusColor}`}>
                    {usuario.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {usuario.cpf && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">CPF</p>
                  <p className="font-medium text-slate-900">{usuario.cpf}</p>
                </div>
              )}
              {usuario.telefone && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Telefone</p>
                  <p className="font-medium text-slate-900">{usuario.telefone}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Permissões */}
        {(usuario.permissoesWeb || usuario.permissoesMobile) && (
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-emerald-100/50">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600" />
                Minhas Permissões
              </h2>
            </div>
            <div className="p-4 md:p-6 space-y-6">
              {/* Web Perms */}
              {usuario.permissoesWeb && (
                <div>
                  <p className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-3">
                    <Monitor className="w-4 h-4 text-blue-600" />
                    Web
                  </p>
                  <div className="space-y-3">
                    {WEB_PERM_GROUPS.map(group => {
                      const activePerms = group.perms.filter(p => (usuario.permissoesWeb as any)?.[p.key])
                      if (activePerms.length === 0) return null
                      return (
                        <div key={group.label}>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{group.label}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {group.perms.map(perm => {
                              const active = (usuario.permissoesWeb as any)?.[perm.key]
                              return (
                                <span
                                  key={perm.key}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
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
                </div>
              )}

              {/* Mobile Perms */}
              {usuario.permissoesMobile && (
                <div>
                  <p className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-3">
                    <Smartphone className="w-4 h-4 text-purple-600" />
                    Mobile
                  </p>
                  <div className="space-y-3">
                    {MOBILE_PERM_GROUPS.map(group => {
                      const activePerms = group.perms.filter(p => (usuario.permissoesMobile as any)?.[p.key])
                      if (activePerms.length === 0) return null
                      return (
                        <div key={group.label}>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{group.label}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {group.perms.map(perm => {
                              const active = (usuario.permissoesMobile as any)?.[perm.key]
                              return (
                                <span
                                  key={perm.key}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
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
                </div>
              )}
            </div>
          </section>
        )}

        {/* Alterar Senha */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-amber-100/50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-600" />
              Alterar Senha
            </h2>
          </div>
          <div className="p-4 md:p-6">
            {message && (
              <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
                message.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                {message.text}
              </div>
            )}

            <form onSubmit={handleAlterarSenha} className="space-y-4">
              {/* Senha Atual */}
              <div>
                <label className="label">Senha Atual</label>
                <div className="relative">
                  <input
                    type={showSenhaAtual ? 'text' : 'password'}
                    value={senhaAtual}
                    onChange={e => setSenhaAtual(e.target.value)}
                    className="input pr-10"
                    placeholder="Digite sua senha atual"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenhaAtual(!showSenhaAtual)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showSenhaAtual ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showSenhaAtual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Nova Senha */}
              <div>
                <label className="label">Nova Senha</label>
                <div className="relative">
                  <input
                    type={showNovaSenha ? 'text' : 'password'}
                    value={novaSenha}
                    onChange={e => setNovaSenha(e.target.value)}
                    className="input pr-10"
                    placeholder="Mínimo 8 caracteres"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNovaSenha(!showNovaSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showNovaSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showNovaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {novaSenha && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-600">Força da senha</span>
                      <span className={`text-xs font-semibold ${
                        passwordStrength.score === 5 ? 'text-emerald-600' :
                        passwordStrength.score >= 4 ? 'text-amber-600' :
                        passwordStrength.score >= 3 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            i <= passwordStrength.score ? passwordStrength.color : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="space-y-1">
                      {passwordStrength.checks.map((check, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          {check.pass ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-slate-300" />
                          )}
                          <span className={`text-xs ${check.pass ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {check.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmar Senha */}
              <div>
                <label className="label">Confirmar Nova Senha</label>
                <div className="relative">
                  <input
                    type={showConfirmarSenha ? 'text' : 'password'}
                    value={confirmarSenha}
                    onChange={e => setConfirmarSenha(e.target.value)}
                    className={`input pr-10 ${
                      confirmarSenha && novaSenha !== confirmarSenha ? 'border-red-300 focus:ring-red-500' : ''
                    }`}
                    placeholder="Repita a nova senha"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showConfirmarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showConfirmarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmarSenha && novaSenha !== confirmarSenha && (
                  <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !senhaAtual || !novaSenha || !confirmarSenha || novaSenha !== confirmarSenha}
                className="btn-primary w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Alterando...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Alterar Senha
                  </>
                )}
              </button>
            </form>
          </div>
        </section>
      </div>

      {/* Coluna lateral - Sessão e Atalhos */}
      <div className="space-y-6">
        {/* Sessão */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-blue-100/50">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Sessão
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
          </div>
        </section>

        {/* Atalhos */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-semibold text-slate-900">Acesso Rápido</h3>
          </div>
          <div className="p-4 space-y-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-primary-600 transition-colors" />
              <span className="text-sm font-medium text-slate-700 group-hover:text-primary-600 transition-colors">
                Voltar ao Dashboard
              </span>
            </Link>
          </div>
        </section>

        {/* Informações de Segurança */}
        <section className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Política de Senha
          </h3>
          <ul className="text-sm text-amber-700 space-y-1">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              Mínimo 8 caracteres
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              Pelo menos uma letra maiúscula
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              Pelo menos uma letra minúscula
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              Pelo menos um número
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              Pelo menos um caractere especial
            </li>
          </ul>
          <p className="text-xs text-amber-600 mt-3">
            Nunca compartilhe sua senha com terceiros.
          </p>
        </section>
      </div>
    </div>
  )
}
