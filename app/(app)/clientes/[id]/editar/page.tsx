'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, User, Building2 } from 'lucide-react'
import Header from '@/components/layout/header'

interface Rota {
  id: string
  descricao: string
}

export default function EditarClientePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [rotas, setRotas] = useState<Rota[]>([])
  const [formData, setFormData] = useState({
    tipoPessoa: 'Fisica' as 'Fisica' | 'Juridica',
    identificador: '',
    nomeExibicao: '',
    nomeCompleto: '',
    razaoSocial: '',
    cpf: '',
    cnpj: '',
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

  useEffect(() => {
    Promise.all([
      fetch('/api/rotas?status=Ativo').then(res => res.json()),
      fetch(`/api/clientes/${id}`).then(res => res.json())
    ])
      .then(([rotasData, clienteData]) => {
        setRotas(rotasData)
        setFormData({
          tipoPessoa: clienteData.tipoPessoa || 'Fisica',
          identificador: clienteData.identificador || '',
          nomeExibicao: clienteData.nomeExibicao || '',
          nomeCompleto: clienteData.nomeCompleto || '',
          razaoSocial: clienteData.razaoSocial || '',
          cpf: clienteData.cpf || '',
          cnpj: clienteData.cnpj || '',
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
        setLoadingData(false)
      })
      .catch(err => {
        console.error(err)
        setLoadingData(false)
      })
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch(`/api/clientes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        router.push('/clientes')
      } else {
        const error = await res.json()
        alert(error.error || 'Erro ao atualizar cliente')
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
        <div className="text-slate-500">Carregando...</div>
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
          ) : (
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
                <label className="label">CNPJ</label>
                <input
                  name="cnpj"
                  value={formData.cnpj}
                  onChange={handleChange}
                  className="input"
                  placeholder="00.000.000/0000-00"
                />
              </div>
            </div>
          )}
        </div>

        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">📞 Contato</h2>
          
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

        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">📍 Endereço</h2>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">CEP *</label>
              <input
                name="cep"
                value={formData.cep}
                onChange={handleChange}
                className="input"
                placeholder="00000-000"
                required
              />
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
              <label className="label">Cidade *</label>
              <input
                name="cidade"
                value={formData.cidade}
                onChange={handleChange}
                className="input"
                placeholder="Cidade"
                required
              />
            </div>
            <div>
              <label className="label">Estado *</label>
              <input
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                className="input"
                placeholder="UF"
                maxLength={2}
                required
              />
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
                <span className="animate-spin">⏳</span>
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
