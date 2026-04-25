'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, User, Shield, Loader2, Phone, Mail, FileText, Tag, Eye, EyeOff } from 'lucide-react'
import Header from '@/components/layout/header'

interface Rota {
  id: string
  descricao: string
}

const TIPOS_PERMISSAO = [
  { value: 'Administrador', label: 'Administrador', description: 'Acesso total ao sistema', color: 'purple' },
  { value: 'Secretario', label: 'Secretário', description: 'Gerencia cadastros e relatórios', color: 'emerald' },
  { value: 'AcessoControlado', label: 'Acesso Controlado', description: 'Acesso apenas às rotas permitidas', color: 'amber' },
]

const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .substring(0, 14)
}

const formatPhone = (value: string) => {
  const cleaned = value.replace(/\D/g, '')
  if (cleaned.length <= 10) {
    return cleaned
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 14)
  }
  return cleaned
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .substring(0, 15)
}

export default function NovoUsuarioPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [rotas, setRotas] = useState<Rota[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    tipoPermissao: 'Secretario',
    permissoesWeb: {
      todosCadastros: false,
      locacaoRelocacaoEstoque: false,
      relatorios: false,
    },
    permissoesMobile: {
      todosCadastros: false,
      alteracaoRelogio: false,
      locacaoRelocacaoEstoque: false,
      cobrancasFaturas: false,
    },
    rotasPermitidas: [] as string[],
    status: 'Ativo',
  })

  useEffect(() => {
    fetch('/api/rotas?status=Ativo')
      .then(res => res.json())
      .then(data => setRotas(data))
      .catch(console.error)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    let formattedValue = value

    if (name === 'cpf') formattedValue = formatCPF(value)
    else if (name === 'telefone') formattedValue = formatPhone(value)

    setFormData(prev => ({ ...prev, [name]: formattedValue }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handlePermissaoChange = (area: 'permissoesWeb' | 'permissoesMobile', field: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [area]: {
        ...prev[area],
        [field]: checked,
      },
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const newErrors: Record<string, string> = {}

    if (!formData.nome.trim() || formData.nome.trim().length < 2) {
      newErrors.nome = 'Nome deve ter pelo menos 2 caracteres'
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email.trim() || !emailRegex.test(formData.email)) {
      newErrors.email = 'E-mail inválido'
    }
    if (!formData.senha || formData.senha.length < 6) {
      newErrors.senha = 'A senha deve ter pelo menos 6 caracteres'
    }
    if (formData.senha !== formData.confirmarSenha) {
      newErrors.confirmarSenha = 'As senhas não coincidem'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    setErrors({})

    try {
      const { confirmarSenha, ...dataToSend } = formData
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      })

      if (res.ok) {
        router.push('/admin/usuarios')
      } else {
        const error = await res.json()
        if (error.errors) {
          setErrors(error.errors)
        } else {
          alert(error.error || 'Erro ao criar usuário')
        }
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao criar usuário')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pb-24 lg:pb-8">
      <Header
        title="Novo Usuário"
        subtitle="Cadastrar um novo usuário no sistema"
        actions={
          <Link href="/admin/usuarios" className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
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

        {/* Acesso */}
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
                  Senha <span className="text-red-500">*</span>
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
                    placeholder="Mínimo 6 caracteres"
                    required
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
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirmar Senha <span className="text-red-500">*</span>
                </label>
                <input
                  name="confirmarSenha"
                  type="password"
                  value={formData.confirmarSenha}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all ${
                    errors.confirmarSenha ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                  }`}
                  placeholder="Repita a senha"
                  required
                />
                {errors.confirmarSenha && <p className="text-red-500 text-xs mt-1">{errors.confirmarSenha}</p>}
              </div>
            </div>
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
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">Tipo de Permissão</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {TIPOS_PERMISSAO.map(tipo => {
                  const colorClasses = {
                    purple: 'border-purple-500 bg-purple-50 text-purple-700',
                    emerald: 'border-emerald-500 bg-emerald-50 text-emerald-700',
                    amber: 'border-amber-500 bg-amber-50 text-amber-700',
                  }
                  return (
                    <label
                      key={tipo.value}
                      className={`flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        formData.tipoPermissao === tipo.value
                          ? colorClasses[tipo.color as keyof typeof colorClasses]
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Permissões Web</label>
                <div className="space-y-2">
                  {[
                    { key: 'todosCadastros', label: 'Todos Cadastros', desc: 'Criar/editar clientes, produtos, rotas' },
                    { key: 'locacaoRelocacaoEstoque', label: 'Locação/Relocação', desc: 'Gerenciar locações' },
                    { key: 'relatorios', label: 'Relatórios', desc: 'Acessar relatórios' },
                  ].map(perm => (
                    <label
                      key={perm.key}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        formData.permissoesWeb[perm.key as keyof typeof formData.permissoesWeb]
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.permissoesWeb[perm.key as keyof typeof formData.permissoesWeb]}
                        onChange={(e) => handlePermissaoChange('permissoesWeb', perm.key, e.target.checked)}
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Permissões Mobile</label>
                <div className="space-y-2">
                  {[
                    { key: 'todosCadastros', label: 'Todos Cadastros' },
                    { key: 'alteracaoRelogio', label: 'Alteração de Relógio' },
                    { key: 'locacaoRelocacaoEstoque', label: 'Locação/Relocação/Estoque' },
                    { key: 'cobrancasFaturas', label: 'Cobranças e Faturas' },
                  ].map(perm => (
                    <label
                      key={perm.key}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        formData.permissoesMobile[perm.key as keyof typeof formData.permissoesMobile]
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.permissoesMobile[perm.key as keyof typeof formData.permissoesMobile]}
                        onChange={(e) => handlePermissaoChange('permissoesMobile', perm.key, e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-medium text-slate-900">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {formData.tipoPermissao === 'AcessoControlado' && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <label className="block text-sm font-medium text-slate-700 mb-3">Rotas Permitidas</label>
                <p className="text-sm text-slate-500 mb-3">Selecione as rotas que este usuário pode acessar no mobile.</p>
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
              </div>
            )}
          </div>
        </section>

        {/* Botões de Ação - Sticky em Mobile */}
        <div className="fixed bottom-0 left-0 right-0 lg:static lg:mt-0 bg-white border-t border-slate-200 p-4 lg:bg-transparent lg:border-0 lg:p-0 z-10">
          <div className="max-w-7xl mx-auto flex gap-3">
            <button type="submit" disabled={loading} className="flex-1 lg:flex-none btn-primary justify-center">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Criar Usuário
                </>
              )}
            </button>
            <Link href="/admin/usuarios" className="btn-secondary hidden lg:inline-flex">
              Cancelar
            </Link>
          </div>
        </div>
      </form>
    </div>
  )
}
