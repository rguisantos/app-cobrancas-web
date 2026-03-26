'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, User, Shield, Loader2 } from 'lucide-react'
import Header from '@/components/layout/header'

interface Rota {
  id: string
  descricao: string
}

const TIPOS_PERMISSAO = [
  { value: 'Administrador', label: 'Administrador', description: 'Acesso total ao sistema' },
  { value: 'Secretario', label: 'Secretário', description: 'Gerencia cadastros e relatórios' },
  { value: 'AcessoControlado', label: 'Acesso Controlado', description: 'Acesso apenas às rotas permitidas' },
]

export default function NovoUsuarioPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [rotas, setRotas] = useState<Rota[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  
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
    setFormData(prev => ({ ...prev, [name]: value }))
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
    
    // Validações
    const newErrors: Record<string, string> = {}
    if (formData.senha !== formData.confirmarSenha) {
      newErrors.confirmarSenha = 'As senhas não coincidem'
    }
    if (formData.senha.length < 6) {
      newErrors.senha = 'A senha deve ter pelo menos 6 caracteres'
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
    <div>
      <Header
        title="Novo Usuário"
        subtitle="Cadastrar um novo usuário no sistema"
        actions={
          <Link href="/admin/usuarios" className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="max-w-4xl">
        {/* Dados Pessoais */}
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Dados Pessoais
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Nome Completo *</label>
              <input
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                className="input"
                placeholder="Nome completo do usuário"
                required
              />
              {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome}</p>}
            </div>
            <div>
              <label className="label">CPF</label>
              <input
                name="cpf"
                value={formData.cpf}
                onChange={handleChange}
                className="input"
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input
                name="telefone"
                value={formData.telefone}
                onChange={handleChange}
                className="input"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
        </div>

        {/* Acesso */}
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">🔐 Dados de Acesso</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email *</label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="email@exemplo.com"
                required
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="label">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="input"
              >
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>
            <div>
              <label className="label">Senha *</label>
              <input
                name="senha"
                type="password"
                value={formData.senha}
                onChange={handleChange}
                className="input"
                placeholder="Mínimo 6 caracteres"
                required
              />
              {errors.senha && <p className="text-red-500 text-xs mt-1">{errors.senha}</p>}
            </div>
            <div>
              <label className="label">Confirmar Senha *</label>
              <input
                name="confirmarSenha"
                type="password"
                value={formData.confirmarSenha}
                onChange={handleChange}
                className="input"
                placeholder="Repita a senha"
                required
              />
              {errors.confirmarSenha && <p className="text-red-500 text-xs mt-1">{errors.confirmarSenha}</p>}
            </div>
          </div>
        </div>

        {/* Permissões */}
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Permissões
          </h2>
          
          {/* Tipo de Permissão */}
          <div className="mb-6">
            <label className="label">Tipo de Permissão *</label>
            <div className="grid grid-cols-3 gap-3">
              {TIPOS_PERMISSAO.map(tipo => (
                <label
                  key={tipo.value}
                  className={`flex flex-col p-4 rounded-lg border cursor-pointer transition-all ${
                    formData.tipoPermissao === tipo.value
                      ? 'border-primary-500 bg-primary-50'
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
                    <span className="font-medium text-slate-900">{tipo.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 ml-6">{tipo.description}</p>
                </label>
              ))}
            </div>
          </div>

          {/* Permissões Web */}
          <div className="mb-6">
            <label className="label">Permissões Web</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'todosCadastros', label: 'Todos Cadastros', desc: 'Criar/editar clientes, produtos, rotas' },
                { key: 'locacaoRelocacaoEstoque', label: 'Locação/Relocação', desc: 'Gerenciar locações' },
                { key: 'relatorios', label: 'Relatórios', desc: 'Acessar relatórios' },
              ].map(perm => (
                <label
                  key={perm.key}
                  className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-all ${
                    formData.permissoesWeb[perm.key as keyof typeof formData.permissoesWeb]
                      ? 'border-green-500 bg-green-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.permissoesWeb[perm.key as keyof typeof formData.permissoesWeb]}
                      onChange={(e) => handlePermissaoChange('permissoesWeb', perm.key, e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="font-medium text-sm">{perm.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 ml-6">{perm.desc}</p>
                </label>
              ))}
            </div>
          </div>

          {/* Permissões Mobile */}
          <div className="mb-6">
            <label className="label">Permissões Mobile</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'todosCadastros', label: 'Todos Cadastros' },
                { key: 'alteracaoRelogio', label: 'Alteração de Relógio' },
                { key: 'locacaoRelocacaoEstoque', label: 'Locação/Relocação/Estoque' },
                { key: 'cobrancasFaturas', label: 'Cobranças e Faturas' },
              ].map(perm => (
                <label
                  key={perm.key}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                    formData.permissoesMobile[perm.key as keyof typeof formData.permissoesMobile]
                      ? 'border-green-500 bg-green-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.permissoesMobile[perm.key as keyof typeof formData.permissoesMobile]}
                    onChange={(e) => handlePermissaoChange('permissoesMobile', perm.key, e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">{perm.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Rotas Permitidas (para AcessoControlado) */}
          {formData.tipoPermissao === 'AcessoControlado' && (
            <div>
              <label className="label">Rotas Permitidas</label>
              <p className="text-sm text-slate-500 mb-3">Selecione as rotas que este usuário pode acessar no mobile.</p>
              <div className="grid grid-cols-3 gap-2">
                {rotas.map(rota => (
                  <label
                    key={rota.id}
                    className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all ${
                      formData.rotasPermitidas.includes(rota.id)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.rotasPermitidas.includes(rota.id)}
                      onChange={() => handleRotaToggle(rota.id)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">{rota.descricao}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
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
          <Link href="/admin/usuarios" className="btn-secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
