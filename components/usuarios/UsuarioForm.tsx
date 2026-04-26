'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  User, Shield, Loader2, Phone, Mail, FileText, Tag,
  Eye, EyeOff, KeyRound, LockOpen, Monitor, Smartphone,
  CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react'
import { useToast } from '@/components/ui/toaster'

// ─── Types ──────────────────────────────────────────────────────

interface Rota {
  id: string
  descricao: string
}

export interface PermissoesWebForm {
  clientes: boolean
  produtos: boolean
  rotas: boolean
  locacaoRelocacaoEstoque: boolean
  cobrancas: boolean
  manutencoes: boolean
  relogios: boolean
  relatorios: boolean
  dashboard: boolean
  agenda: boolean
  mapa: boolean
  adminCadastros: boolean
  adminUsuarios: boolean
  adminDispositivos: boolean
  adminSincronizacao: boolean
  adminAuditoria: boolean
}

export interface PermissoesMobileForm {
  clientes: boolean
  produtos: boolean
  alteracaoRelogio: boolean
  locacaoRelocacaoEstoque: boolean
  cobrancasFaturas: boolean
  manutencoes: boolean
  relatorios: boolean
  sincronizacao: boolean
}

export interface UsuarioFormData {
  nome: string
  cpf: string
  telefone: string
  email: string
  senha: string
  confirmarSenha: string
  tipoPermissao: string
  permissoesWeb: PermissoesWebForm
  permissoesMobile: PermissoesMobileForm
  rotasPermitidas: string[]
  status: string
}

interface UsuarioFormProps {
  mode: 'create' | 'edit'
  initialData?: Partial<UsuarioFormData & { bloqueado?: boolean; id?: string }>
  rotas: Rota[]
  onSubmit: (data: UsuarioFormData) => Promise<void>
  onCancel: () => void
}

// ─── Constants ──────────────────────────────────────────────────

const TIPOS_PERMISSAO = [
  { value: 'Administrador', label: 'Administrador', description: 'Acesso total ao sistema', color: 'purple' },
  { value: 'Secretario', label: 'Secretário', description: 'Gerencia cadastros e relatórios', color: 'emerald' },
  { value: 'AcessoControlado', label: 'Acesso Controlado', description: 'Acesso apenas às rotas permitidas', color: 'amber' },
]

const PERMISSOES_PADRAO: Record<string, { web: PermissoesWebForm; mobile: PermissoesMobileForm }> = {
  Administrador: {
    web: {
      clientes: true, produtos: true, rotas: true,
      locacaoRelocacaoEstoque: true, cobrancas: true, manutencoes: true, relogios: true,
      relatorios: true, dashboard: true, agenda: true, mapa: true,
      adminCadastros: true, adminUsuarios: true, adminDispositivos: true, adminSincronizacao: true, adminAuditoria: true,
    },
    mobile: {
      clientes: true, produtos: true, alteracaoRelogio: true,
      locacaoRelocacaoEstoque: true, cobrancasFaturas: true, manutencoes: true,
      relatorios: true, sincronizacao: true,
    },
  },
  Secretario: {
    web: {
      clientes: true, produtos: true, rotas: true,
      locacaoRelocacaoEstoque: true, cobrancas: true, manutencoes: true, relogios: true,
      relatorios: true, dashboard: true, agenda: true, mapa: true,
      adminCadastros: false, adminUsuarios: false, adminDispositivos: false, adminSincronizacao: false, adminAuditoria: false,
    },
    mobile: {
      clientes: true, produtos: true, alteracaoRelogio: false,
      locacaoRelocacaoEstoque: true, cobrancasFaturas: true, manutencoes: true,
      relatorios: true, sincronizacao: true,
    },
  },
  AcessoControlado: {
    web: {
      clientes: false, produtos: false, rotas: false,
      locacaoRelocacaoEstoque: false, cobrancas: false, manutencoes: false, relogios: false,
      relatorios: false, dashboard: true, agenda: false, mapa: false,
      adminCadastros: false, adminUsuarios: false, adminDispositivos: false, adminSincronizacao: false, adminAuditoria: false,
    },
    mobile: {
      clientes: false, produtos: false, alteracaoRelogio: false,
      locacaoRelocacaoEstoque: false, cobrancasFaturas: true, manutencoes: false,
      relatorios: false, sincronizacao: true,
    },
  },
}

const WEB_PERM_GROUPS = [
  {
    label: 'Cadastros',
    perms: [
      { key: 'clientes', label: 'Clientes', desc: 'Gerenciar clientes' },
      { key: 'produtos', label: 'Produtos', desc: 'Gerenciar produtos' },
      { key: 'rotas', label: 'Rotas', desc: 'Gerenciar rotas' },
    ],
  },
  {
    label: 'Operações',
    perms: [
      { key: 'locacaoRelocacaoEstoque', label: 'Locação/Relocação', desc: 'Gerenciar locações e estoque' },
      { key: 'cobrancas', label: 'Cobranças', desc: 'Gerenciar cobranças' },
      { key: 'manutencoes', label: 'Manutenções', desc: 'Gerenciar manutenções' },
      { key: 'relogios', label: 'Relógios', desc: 'Alteração de relógio' },
    ],
  },
  {
    label: 'Visualização',
    perms: [
      { key: 'relatorios', label: 'Relatórios', desc: 'Acessar relatórios' },
      { key: 'dashboard', label: 'Dashboard', desc: 'Ver painel principal' },
      { key: 'agenda', label: 'Agenda', desc: 'Acessar agenda' },
      { key: 'mapa', label: 'Mapa', desc: 'Acessar mapa' },
    ],
  },
  {
    label: 'Admin',
    perms: [
      { key: 'adminCadastros', label: 'Cadastros', desc: 'Administração de cadastros' },
      { key: 'adminUsuarios', label: 'Usuários', desc: 'Administração de usuários' },
      { key: 'adminDispositivos', label: 'Dispositivos', desc: 'Administração de dispositivos' },
      { key: 'adminSincronizacao', label: 'Sincronização', desc: 'Administração de sync' },
      { key: 'adminAuditoria', label: 'Auditoria', desc: 'Ver logs de auditoria' },
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

const EMPTY_WEB: PermissoesWebForm = {
  clientes: false, produtos: false, rotas: false,
  locacaoRelocacaoEstoque: false, cobrancas: false, manutencoes: false, relogios: false,
  relatorios: false, dashboard: false, agenda: false, mapa: false,
  adminCadastros: false, adminUsuarios: false, adminDispositivos: false, adminSincronizacao: false, adminAuditoria: false,
}

const EMPTY_MOBILE: PermissoesMobileForm = {
  clientes: false, produtos: false, alteracaoRelogio: false,
  locacaoRelocacaoEstoque: false, cobrancasFaturas: false, manutencoes: false,
  relatorios: false, sincronizacao: false,
}

// ─── Helpers ────────────────────────────────────────────────────

const formatCPF = (value: string) =>
  value.replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .substring(0, 14)

const formatPhone = (value: string) => {
  const cleaned = value.replace(/\D/g, '')
  if (cleaned.length <= 10) {
    return cleaned.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2').substring(0, 14)
  }
  return cleaned.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 15)
}

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
  if (senha.length < 8) return 'Senha deve ter pelo menos 8 caracteres'
  if (!/[A-Z]/.test(senha)) return 'Senha deve conter pelo menos uma letra maiúscula'
  if (!/[a-z]/.test(senha)) return 'Senha deve conter pelo menos uma letra minúscula'
  if (!/[0-9]/.test(senha)) return 'Senha deve conter pelo menos um número'
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:',.<>?\/]/.test(senha)) return 'Senha deve conter pelo menos um caractere especial'
  return null
}

// ─── Component ──────────────────────────────────────────────────

export default function UsuarioForm({ mode, initialData, rotas, onSubmit, onCancel }: UsuarioFormProps) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetNovaSenha, setResetNovaSenha] = useState('')
  const [showResetSenha, setShowResetSenha] = useState(false)

  const [formData, setFormData] = useState<UsuarioFormData>({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    tipoPermissao: 'Secretario',
    permissoesWeb: { ...EMPTY_WEB },
    permissoesMobile: { ...EMPTY_MOBILE },
    rotasPermitidas: [],
    status: 'Ativo',
  })

  // Populate form from initialData on edit mode
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData(prev => ({
        ...prev,
        nome: initialData.nome ?? '',
        cpf: initialData.cpf ?? '',
        telefone: initialData.telefone ?? '',
        email: initialData.email ?? '',
        senha: '',
        confirmarSenha: '',
        tipoPermissao: initialData.tipoPermissao ?? 'Secretario',
        permissoesWeb: initialData.permissoesWeb ?? { ...EMPTY_WEB },
        permissoesMobile: initialData.permissoesMobile ?? { ...EMPTY_MOBILE },
        rotasPermitidas: initialData.rotasPermitidas ?? [],
        status: initialData.status ?? 'Ativo',
      }))
    }
  }, [mode, initialData])

  // Auto-apply default permissions when tipoPermissao changes
  const handleTipoPermissaoChange = useCallback((newTipo: string) => {
    const defaults = PERMISSOES_PADRAO[newTipo]
    if (defaults) {
      setFormData(prev => ({
        ...prev,
        tipoPermissao: newTipo,
        permissoesWeb: { ...defaults.web },
        permissoesMobile: { ...defaults.mobile },
      }))
    } else {
      setFormData(prev => ({ ...prev, tipoPermissao: newTipo }))
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    let formattedValue = value

    if (name === 'cpf') formattedValue = formatCPF(value)
    else if (name === 'telefone') formattedValue = formatPhone(value)
    else if (name === 'tipoPermissao') {
      handleTipoPermissaoChange(value)
      setErrors(prev => ({ ...prev, [name]: '' }))
      return
    }

    setFormData(prev => ({ ...prev, [name]: formattedValue }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handlePermissaoWebChange = (field: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissoesWeb: { ...prev.permissoesWeb, [field]: checked },
    }))
  }

  const handlePermissaoMobileChange = (field: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissoesMobile: { ...prev.permissoesMobile, [field]: checked },
    }))
  }

  const handleRotaToggle = (rotaId: string) => {
    setFormData(prev => ({
      ...prev,
      rotasPermitidas: prev.rotasPermitidas.includes(rotaId)
        ? prev.rotasPermitidas.filter(id => id !== rotaId)
        : [...prev.rotasPermitidas, rotaId],
    }))
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!formData.nome.trim() || formData.nome.trim().length < 2) {
      newErrors.nome = 'Nome deve ter pelo menos 2 caracteres'
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email.trim() || !emailRegex.test(formData.email)) {
      newErrors.email = 'E-mail inválido'
    }

    // Password validation
    if (mode === 'create') {
      if (!formData.senha) {
        newErrors.senha = 'Senha é obrigatória'
      } else {
        const senhaError = validateSenha(formData.senha)
        if (senhaError) newErrors.senha = senhaError
      }
      if (!formData.confirmarSenha) {
        newErrors.confirmarSenha = 'Confirmação de senha é obrigatória'
      } else if (formData.senha !== formData.confirmarSenha) {
        newErrors.confirmarSenha = 'As senhas não coincidem'
      }
    } else {
      // Edit mode: password is optional
      if (formData.senha) {
        const senhaError = validateSenha(formData.senha)
        if (senhaError) newErrors.senha = senhaError
        if (formData.senha !== formData.confirmarSenha) {
          newErrors.confirmarSenha = 'As senhas não coincidem'
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    setErrors({})

    try {
      await onSubmit(formData)
    } catch (err: any) {
      toast.error(err?.message || `Erro ao ${mode === 'create' ? 'criar' : 'atualizar'} usuário`)
    } finally {
      setLoading(false)
    }
  }

  // Reset password action (edit mode only)
  const handleResetPassword = async () => {
    if (!initialData?.id) return
    const senhaError = validateSenha(resetNovaSenha)
    if (senhaError) {
      toast.error(senhaError)
      return
    }

    setResettingPassword(true)
    try {
      const res = await fetch(`/api/usuarios/${initialData.id}/reset-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novaSenha: resetNovaSenha }),
      })
      if (res.ok) {
        toast.success('Senha redefinida com sucesso')
        setShowResetModal(false)
        setResetNovaSenha('')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao redefinir senha')
      }
    } catch {
      toast.error('Erro ao redefinir senha')
    } finally {
      setResettingPassword(false)
    }
  }

  // Unlock action (edit mode only)
  const handleUnlock = async () => {
    if (!initialData?.id) return
    setUnlocking(true)
    try {
      const res = await fetch(`/api/usuarios/${initialData.id}/desbloquear`, { method: 'POST' })
      if (res.ok) {
        toast.success('Usuário desbloqueado com sucesso')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao desbloquear')
      }
    } catch {
      toast.error('Erro ao desbloquear')
    } finally {
      setUnlocking(false)
    }
  }

  const passwordStrength = getPasswordStrength(formData.senha)
  const isEdit = mode === 'edit'

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {/* Dados Pessoais */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Dados Pessoais
          </h2>
        </div>
        <div className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg border outline-none transition-all ${
                    errors.nome ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                  placeholder="Nome completo do usuário"
                  required
                />
              </div>
              {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">CPF</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dados de Acesso */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            Dados de Acesso
          </h2>
        </div>
        <div className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg border outline-none transition-all ${
                    errors.email ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                  }`}
                  placeholder="email@exemplo.com"
                  required
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all bg-white"
              >
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {isEdit ? 'Nova Senha' : 'Senha'} {isEdit ? null : <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <input
                  name="senha"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.senha}
                  onChange={handleChange}
                  className={`w-full pl-4 pr-10 py-2.5 rounded-lg border outline-none transition-all ${
                    errors.senha ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                  }`}
                  placeholder={isEdit ? 'Deixe em branco para manter' : 'Mínimo 8 caracteres'}
                  {...(isEdit ? {} : { required: true })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.senha && <p className="text-red-500 text-xs mt-1">{errors.senha}</p>}
              {isEdit && !formData.senha && (
                <p className="text-xs text-slate-400 mt-1">Deixe em branco para manter a senha atual</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {isEdit ? 'Confirmar Nova Senha' : 'Confirmar Senha'} {isEdit ? null : <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <input
                  name="confirmarSenha"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmarSenha}
                  onChange={handleChange}
                  className={`w-full pl-4 pr-10 py-2.5 rounded-lg border outline-none transition-all ${
                    errors.confirmarSenha ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                  }`}
                  placeholder={isEdit ? 'Repita a nova senha' : 'Repita a senha'}
                  {...(isEdit ? {} : { required: true })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmarSenha && <p className="text-red-500 text-xs mt-1">{errors.confirmarSenha}</p>}
            </div>
          </div>

          {/* Password Strength Indicator */}
          {formData.senha && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
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
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
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

          {/* Edit mode: Reset Password and Unlock buttons */}
          {isEdit && initialData?.id && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="btn-secondary text-sm"
              >
                <KeyRound className="w-4 h-4" />
                Redefinir Senha
              </button>
              {initialData.bloqueado && (
                <button
                  type="button"
                  onClick={handleUnlock}
                  disabled={unlocking}
                  className="btn-secondary text-sm text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                >
                  {unlocking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LockOpen className="w-4 h-4" />
                  )}
                  Desbloquear
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Permissões */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-600" />
            Permissões
          </h2>
        </div>
        <div className="p-4 md:p-6">
          {/* Tipo de Permissão */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-3">Tipo de Permissão</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {TIPOS_PERMISSAO.map(tipo => {
                const colorClasses: Record<string, string> = {
                  purple: 'border-purple-500 bg-purple-50 text-purple-700',
                  emerald: 'border-emerald-500 bg-emerald-50 text-emerald-700',
                  amber: 'border-amber-500 bg-amber-50 text-amber-700',
                }
                return (
                  <label
                    key={tipo.value}
                    className={`flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.tipoPermissao === tipo.value
                        ? colorClasses[tipo.color]
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="tipoPermissao"
                        value={tipo.value}
                        checked={formData.tipoPermissao === tipo.value}
                        onChange={handleChange}
                        className="w-4 h-4"
                      />
                      <span className="font-medium">{tipo.label}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 ml-6">{tipo.description}</p>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Permissões Web - Agrupadas por categoria */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Monitor className="w-4 h-4 text-blue-600" />
              <label className="text-sm font-medium text-slate-700">Permissões Web</label>
            </div>
            <div className="space-y-4">
              {WEB_PERM_GROUPS.map(group => (
                <div key={group.label}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{group.label}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {group.perms.map(perm => (
                      <label
                        key={perm.key}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          formData.permissoesWeb[perm.key as keyof PermissoesWebForm]
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.permissoesWeb[perm.key as keyof PermissoesWebForm]}
                          onChange={(e) => handlePermissaoWebChange(perm.key, e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-slate-900">{perm.label}</span>
                          <p className="text-xs text-slate-500">{perm.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Permissões Mobile - Agrupadas por categoria */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="w-4 h-4 text-purple-600" />
              <label className="text-sm font-medium text-slate-700">Permissões Mobile</label>
            </div>
            <div className="space-y-4">
              {MOBILE_PERM_GROUPS.map(group => (
                <div key={group.label}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{group.label}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.perms.map(perm => (
                      <label
                        key={perm.key}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          formData.permissoesMobile[perm.key as keyof PermissoesMobileForm]
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.permissoesMobile[perm.key as keyof PermissoesMobileForm]}
                          onChange={(e) => handlePermissaoMobileChange(perm.key, e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm font-medium text-slate-900">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rotas Permitidas (para AcessoControlado) */}
          {formData.tipoPermissao === 'AcessoControlado' && (
            <div className="pt-6 border-t border-slate-100">
              <label className="block text-sm font-medium text-slate-700 mb-2">Rotas Permitidas</label>
              <p className="text-sm text-slate-500 mb-3">Selecione as rotas que este usuário pode acessar no mobile.</p>
              {rotas.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">
                  Nenhuma rota ativa cadastrada
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {rotas.map(rota => (
                    <label
                      key={rota.id}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        formData.rotasPermitidas.includes(rota.id)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.rotasPermitidas.includes(rota.id)}
                        onChange={() => handleRotaToggle(rota.id)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm truncate">{rota.descricao}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Action Buttons - Sticky on mobile */}
      <div className="fixed bottom-0 left-0 right-0 lg:static lg:mt-0 bg-white border-t border-slate-200 p-4 lg:bg-transparent lg:border-0 lg:p-0 z-10">
        <div className="max-w-7xl mx-auto flex gap-3">
          <button type="submit" disabled={loading} className="flex-1 lg:flex-none btn-primary justify-center">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isEdit ? 'Salvando...' : 'Criando...'}
              </>
            ) : (
              <>
                {isEdit ? (
                  <>
                    <Shield className="w-4 h-4" />
                    Salvar Alterações
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4" />
                    Criar Usuário
                  </>
                )}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary hidden lg:inline-flex"
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-amber-100">
                  <KeyRound className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-slate-900">Redefinir Senha</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Defina uma nova senha para este usuário. A senha atual será substituída e todas as sessões ativas serão encerradas.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nova Senha</label>
                  <div className="relative">
                    <input
                      type={showResetSenha ? 'text' : 'password'}
                      value={resetNovaSenha}
                      onChange={e => setResetNovaSenha(e.target.value)}
                      className="w-full px-4 pr-10 py-2.5 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                      placeholder="Mínimo 8 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetSenha(!showResetSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showResetSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {resetNovaSenha && (
                    <div className="mt-2">
                      {getPasswordStrength(resetNovaSenha).checks.map((check, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          {check.pass ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <XCircle className="w-3 h-3 text-slate-300" />
                          )}
                          <span className={`text-xs ${check.pass ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {check.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 pt-0">
              <button
                type="button"
                onClick={() => { setShowResetModal(false); setResetNovaSenha('') }}
                disabled={resettingPassword}
                className="btn-secondary py-2.5 px-4"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resettingPassword || !resetNovaSenha}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm text-white bg-amber-600 hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {resettingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                Redefinir
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
