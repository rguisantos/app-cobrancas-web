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
} from 'lucide-react'
import { formatarMoeda } from '@/shared/types'

interface UsuarioData {
  id: string
  nome: string
  email: string
  cpf: string | null
  telefone: string | null
  tipoPermissao: string
  status: string
  dataUltimoAcesso: string | null
  ultimoAcessoDispositivo: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

interface ProfileClientProps {
  usuario: UsuarioData
}

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

    if (novaSenha !== confirmarSenha) {
      setMessage({ type: 'error', text: 'As senhas não coincidem' })
      return
    }

    if (novaSenha.length < 6) {
      setMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres' })
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
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
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
                    minLength={6}
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
            Dica de Segurança
          </h3>
          <p className="text-sm text-amber-700">
            Use uma senha forte com letras maiúsculas, minúsculas, números e caracteres especiais.
            Nunca compartilhe sua senha com terceiros.
          </p>
        </section>
      </div>
    </div>
  )
}
