'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, User, Shield, Loader2 } from 'lucide-react'
import Header from '@/components/layout/header'
import { useToast } from '@/components/ui/toaster'

interface Rota {
  id: string
  descricao: string
}

const TIPOS_PERMISSAO = [
  { value: 'Administrador', label: 'Administrador', description: 'Acesso total ao sistema' },
  { value: 'Secretario', label: 'Secretário', description: 'Gerencia cadastros e relatórios' },
  { value: 'AcessoControlado', label: 'Acesso Controlado', description: 'Acesso apenas às rotas permitidas' },
]

export default function EditarUsuarioPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [rotas, setRotas] = useState<Rota[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { error: toastError } = useToast()
  
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
    Promise.all([
      fetch('/api/rotas?status=Ativo').then(res => res.json()),
      fetch(`/api/usuarios/${id}`).then(res => res.json())
    ])
      .then(([rotasData, usuarioData]) => {
        setRotas(rotasData)
        setFormData({
          nome: usuarioData.nome || '',
          cpf: usuarioData.cpf || '',
          telefone: usuarioData.telefone || '',
          email: usuarioData.email || '',
          senha: '',
          confirmarSenha: '',
          tipoPermissao: usuarioData.tipoPermissao || 'Secretario',
          permissoesWeb: usuarioData.permissoesWeb || {
            todosCadastros: false,
            locacaoRelocacaoEstoque: false,
            relatorios: false,
          },
          permissoesMobile: usuarioData.permissoesMobile || {
            todosCadastros: false,
            alteracaoRelogio: false,
            locacaoRelocacaoEstoque: false,
            cobrancasFaturas: false,
          },
          rotasPermitidas: usuarioData.rotasPermitidas || [],
          status: usuarioData.status || 'Ativo',
        })
        setLoadingData(false)
      })
      .catch(err => {
        console.error(err)
        setLoadingData(false)
      })
  }, [id])

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
    if (formData.senha && formData.senha !== formData.confirmarSenha) {
      newErrors.confirmarSenha = 'As senhas não coincidem'
    }
    if (formData.senha && formData.senha.length < 6) {
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
      // Não enviar senha se estiver vazia
      if (!dataToSend.senha) {
        delete (dataToSend as any).senha
      }
      
      const res = await fetch(`/api/usuarios/${id}`, {
        method: 'PUT',
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
          toastError(error.error || 'Erro ao atualizar usuário')
        }
      }
    } catch (err) {
      console.error(err)
      toastError('Erro ao atualizar usuário')
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div>
      <Header
        title="Editar Usuário"
        subtitle={formData.nome}
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
              <label className="label">Nova Senha</label>
              <input
                name="senha"
                type="password"
                value={formData.senha}
                onChange={handleChange}
                className="input"
                placeholder="Deixe em branco para manter"
              />
              <p className="text-xs text-slate-400 mt-1">Deixe em branco para manter a senha atual</p>
            </div>
            <div>
              <label className="label">Confirmar Nova Senha</label>
              <input
                name="confirmarSenha"
                type="password"
                value={formData.confirmarSenha}
                onChange={handleChange}
                className="input"
                placeholder="Repita a nova senha"
              />
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
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Alterações
              </>
            )}
          </button>
          <Link href="/admin/usuarios" className="btn-secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
