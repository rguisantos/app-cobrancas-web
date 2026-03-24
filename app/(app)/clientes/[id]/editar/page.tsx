'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, User, Building2, Plus, Trash2, MapPin, Loader2 } from 'lucide-react'
import Header from '@/components/layout/header'

interface Rota {
  id: string
  descricao: string
}

interface Estado {
  id: number
  sigla: string
  nome: string
}

interface Cidade {
  id: number
  nome: string
}

interface Contato {
  id: string
  nome: string
  telefone: string
  whatsapp: boolean
  principal: boolean
}

export default function EditarClientePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [loadingCep, setLoadingCep] = useState(false)
  const [loadingCidades, setLoadingCidades] = useState(false)
  const [rotas, setRotas] = useState<Rota[]>([])
  const [estados, setEstados] = useState<Estado[]>([])
  const [cidades, setCidades] = useState<Cidade[]>([])
  
  const [formData, setFormData] = useState({
    tipoPessoa: 'Fisica' as 'Fisica' | 'Juridica',
    identificador: '',
    nomeExibicao: '',
    nomeCompleto: '',
    razaoSocial: '',
    nomeFantasia: '',
    cpf: '',
    cnpj: '',
    rg: '',
    inscricaoEstadual: '',
    email: '',
    telefonePrincipal: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    rotaId: '',
    observacao: '',
    status: 'Ativo'
  })
  
  const [contatos, setContatos] = useState<Contato[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Carregar dados iniciais
  useEffect(() => {
    Promise.all([
      fetch('/api/rotas?status=Ativo').then(res => res.json()),
      fetch('/api/localizacao/estados').then(res => res.json()),
      fetch(`/api/clientes/${id}`).then(res => res.json())
    ])
      .then(([rotasData, estadosData, clienteData]) => {
        setRotas(rotasData)
        setEstados(estadosData)
        setFormData({
          tipoPessoa: clienteData.tipoPessoa || 'Fisica',
          identificador: clienteData.identificador || '',
          nomeExibicao: clienteData.nomeExibicao || '',
          nomeCompleto: clienteData.nomeCompleto || '',
          razaoSocial: clienteData.razaoSocial || '',
          nomeFantasia: clienteData.nomeFantasia || '',
          cpf: clienteData.cpf || '',
          cnpj: clienteData.cnpj || '',
          rg: clienteData.rg || '',
          inscricaoEstadual: clienteData.inscricaoEstadual || '',
          email: clienteData.email || '',
          telefonePrincipal: clienteData.telefonePrincipal || '',
          cep: clienteData.cep || '',
          logradouro: clienteData.logradouro || '',
          numero: clienteData.numero || '',
          complemento: clienteData.complemento || '',
          bairro: clienteData.bairro || '',
          cidade: clienteData.cidade || '',
          estado: clienteData.estado || '',
          rotaId: clienteData.rotaId || '',
          observacao: clienteData.observacao || '',
          status: clienteData.status || 'Ativo'
        })
        
        // Carregar contatos adicionais
        if (clienteData.contatos && Array.isArray(clienteData.contatos)) {
          setContatos(clienteData.contatos.map((c: any, idx: number) => ({
            id: c.id || `contato_${idx}`,
            nome: c.nome || '',
            telefone: c.telefone || '',
            whatsapp: c.whatsapp || false,
            principal: c.principal || false
          })))
        }
        
        setLoadingData(false)
      })
      .catch(err => {
        console.error(err)
        setLoadingData(false)
      })
  }, [id])

  // Carregar cidades quando estado muda
  useEffect(() => {
    if (formData.estado) {
      setLoadingCidades(true)
      fetch(`/api/localizacao/cidades?uf=${formData.estado}`)
        .then(res => res.json())
        .then(data => setCidades(data))
        .catch(console.error)
        .finally(() => setLoadingCidades(false))
    }
  }, [formData.estado])

  // Buscar CEP
  const buscarCep = useCallback(async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return

    setLoadingCep(true)
    setErrors(prev => ({ ...prev, cep: '' }))

    try {
      const response = await fetch(`/api/localizacao/cep?cep=${cepLimpo}`)
      const data = await response.json()

      if (data.error) {
        setErrors(prev => ({ ...prev, cep: data.error }))
        return
      }

      setFormData(prev => ({
        ...prev,
        logradouro: data.logradouro || prev.logradouro,
        bairro: data.bairro || prev.bairro,
        cidade: data.cidade || prev.cidade,
        estado: data.estado || prev.estado,
      }))
    } catch (err) {
      console.error('Erro ao buscar CEP:', err)
      setErrors(prev => ({ ...prev, cep: 'Erro ao buscar CEP' }))
    } finally {
      setLoadingCep(false)
    }
  }, [])

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const formatted = value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .substring(0, 9)
    
    setFormData(prev => ({ ...prev, cep: formatted }))
    
    const digits = formatted.replace(/\D/g, '')
    if (digits.length === 8) {
      buscarCep(formatted)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  // Contatos
  const adicionarContato = () => {
    setContatos(prev => [
      ...prev,
      {
        id: `contato_${Date.now()}`,
        nome: '',
        telefone: '',
        whatsapp: false,
        principal: false
      }
    ])
  }

  const removerContato = (contatoId: string) => {
    setContatos(prev => prev.filter(c => c.id !== contatoId))
  }

  const atualizarContato = (contatoId: string, field: keyof Contato, value: string | boolean) => {
    setContatos(prev =>
      prev.map(c =>
        c.id === contatoId ? { ...c, [field]: value } : c
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      const res = await fetch(`/api/clientes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          contatos: contatos.filter(c => c.nome || c.telefone)
        })
      })

      if (res.ok) {
        router.push('/clientes')
      } else {
        const error = await res.json()
        if (error.errors) {
          setErrors(error.errors)
        } else {
          alert(error.error || 'Erro ao atualizar cliente')
        }
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao atualizar cliente')
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
        title="Editar Cliente"
        subtitle={formData.nomeExibicao}
        actions={
          <Link href="/clientes" className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="max-w-4xl">
        {/* Tipo de Pessoa */}
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            {formData.tipoPessoa === 'Fisica' ? <User className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
            Tipo de Pessoa
          </h2>
          
          <div className="flex gap-4 mb-4">
            <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
              formData.tipoPessoa === 'Fisica' 
                ? 'border-primary-500 bg-primary-50 text-primary-700' 
                : 'border-slate-200 hover:border-slate-300'
            }`}>
              <input
                type="radio"
                name="tipoPessoa"
                value="Fisica"
                checked={formData.tipoPessoa === 'Fisica'}
                onChange={handleChange}
                className="sr-only"
              />
              <User className="w-4 h-4" />
              Pessoa Física
            </label>
            <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
              formData.tipoPessoa === 'Juridica' 
                ? 'border-primary-500 bg-primary-50 text-primary-700' 
                : 'border-slate-200 hover:border-slate-300'
            }`}>
              <input
                type="radio"
                name="tipoPessoa"
                value="Juridica"
                checked={formData.tipoPessoa === 'Juridica'}
                onChange={handleChange}
                className="sr-only"
              />
              <Building2 className="w-4 h-4" />
              Pessoa Jurídica
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Código/Identificador *</label>
              <input
                name="identificador"
                value={formData.identificador}
                onChange={handleChange}
                className="input"
                placeholder="Ex: 10365"
                required
              />
            </div>
            <div>
              <label className="label">Nome de Exibição *</label>
              <input
                name="nomeExibicao"
                value={formData.nomeExibicao}
                onChange={handleChange}
                className="input"
                placeholder="Nome curto para exibição"
                required
              />
            </div>
          </div>

          {formData.tipoPessoa === 'Fisica' ? (
            <>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="label">Nome Completo</label>
                  <input
                    name="nomeCompleto"
                    value={formData.nomeCompleto}
                    onChange={handleChange}
                    className="input"
                    placeholder="Nome completo"
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
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="label">RG</label>
                  <input
                    name="rg"
                    value={formData.rg}
                    onChange={handleChange}
                    className="input"
                    placeholder="00.000.000-0"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="label">Razão Social</label>
                  <input
                    name="razaoSocial"
                    value={formData.razaoSocial}
                    onChange={handleChange}
                    className="input"
                    placeholder="Razão social da empresa"
                  />
                </div>
                <div>
                  <label className="label">Nome Fantasia</label>
                  <input
                    name="nomeFantasia"
                    value={formData.nomeFantasia}
                    onChange={handleChange}
                    className="input"
                    placeholder="Nome fantasia"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="label">CNPJ</label>
                  <input
                    name="cnpj"
                    value={formData.cnpj}
                    onChange={handleChange}
                    className="input"
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div>
                  <label className="label">Inscrição Estadual</label>
                  <input
                    name="inscricaoEstadual"
                    value={formData.inscricaoEstadual}
                    onChange={handleChange}
                    className="input"
                    placeholder="000.000.000.000"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Contato Principal */}
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">📞 Contato Principal</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Telefone Principal *</label>
              <input
                name="telefonePrincipal"
                value={formData.telefonePrincipal}
                onChange={handleChange}
                className="input"
                placeholder="(00) 00000-0000"
                required
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="email@exemplo.com"
              />
            </div>
          </div>
        </div>

        {/* Contatos Adicionais */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">👥 Contatos Adicionais</h2>
            <button
              type="button"
              onClick={adicionarContato}
              className="btn-secondary text-sm py-1.5"
            >
              <Plus className="w-4 h-4" />
              Adicionar Contato
            </button>
          </div>

          {contatos.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum contato adicional. Clique em "Adicionar Contato" para incluir.</p>
          ) : (
            <div className="space-y-4">
              {contatos.map((contato, index) => (
                <div key={contato.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-600">Contato {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removerContato(contato.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="label text-xs">Nome</label>
                      <input
                        value={contato.nome}
                        onChange={(e) => atualizarContato(contato.id, 'nome', e.target.value)}
                        className="input"
                        placeholder="Nome do contato"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Telefone</label>
                      <input
                        value={contato.telefone}
                        onChange={(e) => atualizarContato(contato.id, 'telefone', e.target.value)}
                        className="input"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div className="flex items-end gap-4 pb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={contato.whatsapp}
                          onChange={(e) => atualizarContato(contato.id, 'whatsapp', e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300"
                        />
                        <span className="text-sm">WhatsApp</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Endereço */}
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Endereço
          </h2>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">CEP *</label>
              <div className="relative">
                <input
                  name="cep"
                  value={formData.cep}
                  onChange={handleCepChange}
                  className={`input ${errors.cep ? 'border-red-500' : ''}`}
                  placeholder="00000-000"
                  required
                />
                {loadingCep && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary-500" />
                )}
              </div>
              {errors.cep && <p className="text-red-500 text-xs mt-1">{errors.cep}</p>}
            </div>
            <div className="col-span-2">
              <label className="label">Logradouro *</label>
              <input
                name="logradouro"
                value={formData.logradouro}
                onChange={handleChange}
                className="input"
                placeholder="Rua, Avenida, etc."
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-4">
            <div>
              <label className="label">Número *</label>
              <input
                name="numero"
                value={formData.numero}
                onChange={handleChange}
                className="input"
                placeholder="123"
                required
              />
            </div>
            <div>
              <label className="label">Complemento</label>
              <input
                name="complemento"
                value={formData.complemento}
                onChange={handleChange}
                className="input"
                placeholder="Sala, Apto..."
              />
            </div>
            <div className="col-span-2">
              <label className="label">Bairro *</label>
              <input
                name="bairro"
                value={formData.bairro}
                onChange={handleChange}
                className="input"
                placeholder="Bairro"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <label className="label">Estado *</label>
              <select
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Selecione</option>
                {estados.map(e => (
                  <option key={e.id} value={e.sigla}>{e.sigla} - {e.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Cidade *</label>
              <select
                name="cidade"
                value={formData.cidade}
                onChange={handleChange}
                className="input"
                required
                disabled={!formData.estado || loadingCidades}
              >
                <option value="">
                  {loadingCidades ? 'Carregando...' : 'Selecione'}
                </option>
                {cidades.map(c => (
                  <option key={c.id} value={c.nome}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Rota *</label>
              <select
                name="rotaId"
                value={formData.rotaId}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Selecione uma rota</option>
                {rotas.map(r => (
                  <option key={r.id} value={r.id}>{r.descricao}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Outras Informações */}
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">📝 Outras Informações</h2>
          
          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="mt-4">
            <label className="label">Observação</label>
            <textarea
              name="observacao"
              value={formData.observacao}
              onChange={handleChange}
              className="input min-h-[100px]"
              placeholder="Observações sobre o cliente..."
            />
          </div>
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
          <Link href="/clientes" className="btn-secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
