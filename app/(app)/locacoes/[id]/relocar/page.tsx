'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Search, ArrowLeftRight, Loader2, ArrowRight } from 'lucide-react'
import Header from '@/components/layout/header'
import { formatarMoeda } from '@/shared/types'
import { useToast } from '@/components/ui/toaster'

interface Locacao {
  id: string
  clienteId: string
  clienteNome: string
  produtoId: string
  produtoIdentificador: string
  produtoTipo: string
  numeroRelogio: string
  precoFicha: number
  percentualEmpresa: number
  formaPagamento: string
  periodicidade?: string
  valorFixo?: number
}

interface Cliente {
  id: string
  nomeExibicao: string
  cidade: string
  estado: string
}

const FORMA_PAGAMENTO_OPTIONS = [
  { value: 'PercentualReceber', label: '% Receber', icon: '📈' },
  { value: 'PercentualPagar', label: '% Pagar', icon: '📉' },
  { value: 'Periodo', label: 'Período', icon: '📅' },
]

const PERIODICIDADES = ['Mensal', 'Semanal', 'Quinzenal', 'Diária']

export default function RelocarProdutoPage() {
  const router = useRouter()
  const params = useParams()
  const locacaoId = params.id as string
  const { success, error } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [locacao, setLocacao] = useState<Locacao | null>(null)
  const [buscaCliente, setBuscaCliente] = useState('')
  const [clientesBusca, setClientesBusca] = useState<Cliente[]>([])
  const [buscandoClientes, setBuscandoClientes] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const [formData, setFormData] = useState({
    novoClienteId: '',
    novoClienteNome: '',
    formaPagamento: 'PercentualReceber' as 'Periodo' | 'PercentualPagar' | 'PercentualReceber',
    numeroRelogio: '',
    precoFicha: '',
    percentualEmpresa: '50',
    periodicidade: '',
    valorFixo: '',
    motivoRelocacao: '',
    observacao: '',
    trocaPano: false,
  })

  // Carregar dados da locação
  useEffect(() => {
    fetch(`/api/locacoes/${locacaoId}`)
      .then(res => res.json())
      .then(data => {
        setLocacao(data)
        setFormData(prev => ({
          ...prev,
          numeroRelogio: data.numeroRelogio || '',
          precoFicha: String(data.precoFicha || ''),
          percentualEmpresa: String(data.percentualEmpresa || 50),
          formaPagamento: data.formaPagamento || 'PercentualReceber',
          periodicidade: data.periodicidade || '',
          valorFixo: data.valorFixo ? String(data.valorFixo) : '',
        }))
        setLoadingData(false)
      })
      .catch(err => {
        console.error(err)
        setLoadingData(false)
      })
  }, [locacaoId])

  // Buscar clientes
  const buscarClientes = useCallback(async (termo: string) => {
    if (!termo.trim()) {
      setClientesBusca([])
      return
    }
    
    setBuscandoClientes(true)
    try {
      const res = await fetch(`/api/clientes?search=${encodeURIComponent(termo)}`)
      const data = await res.json()
      setClientesBusca(data.slice(0, 10))
    } catch (err) {
      console.error(err)
    } finally {
      setBuscandoClientes(false)
    }
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (buscaCliente) {
        buscarClientes(buscaCliente)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [buscaCliente, buscarClientes])

  const selecionarCliente = (cliente: Cliente) => {
    setFormData(prev => ({
      ...prev,
      novoClienteId: cliente.id,
      novoClienteNome: cliente.nomeExibicao,
    }))
    setBuscaCliente('')
    setClientesBusca([])
    setErrors(prev => ({ ...prev, novoClienteId: '' }))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const percentualCliente = 100 - (parseFloat(formData.percentualEmpresa) || 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validações
    const newErrors: Record<string, string> = {}
    if (!formData.novoClienteId) {
      newErrors.novoClienteId = 'Selecione um cliente'
    }
    if (!formData.motivoRelocacao.trim()) {
      newErrors.motivoRelocacao = 'Informe o motivo da relocação'
    }
    if (!formData.numeroRelogio.trim()) {
      newErrors.numeroRelogio = 'Informe o número do relógio'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    
    try {
      const res = await fetch(`/api/locacoes/${locacaoId}/relocar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          novoClienteId: formData.novoClienteId,
          novoClienteNome: formData.novoClienteNome,
          formaPagamento: formData.formaPagamento,
          numeroRelogio: formData.numeroRelogio,
          precoFicha: parseFloat(formData.precoFicha) || 0,
          percentualEmpresa: parseFloat(formData.percentualEmpresa) || 50,
          percentualCliente,
          periodicidade: formData.periodicidade || undefined,
          valorFixo: formData.valorFixo ? parseFloat(formData.valorFixo) : undefined,
          motivoRelocacao: formData.motivoRelocacao,
          observacao: formData.observacao || undefined,
          trocaPano: formData.trocaPano,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        success(`Produto relocado com sucesso para ${formData.novoClienteNome}!`)
        router.push('/locacoes')
      } else {
        const errorData = await res.json()
        error(errorData.error || 'Erro ao relocar produto')
      }
    } catch (err) {
      console.error(err)
      error('Erro ao relocar produto')
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

  if (!locacao) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Locação não encontrada</p>
        <Link href="/locacoes" className="btn-secondary mt-4">Voltar para Locações</Link>
      </div>
    )
  }

  return (
    <div>
      <Header
        title="Relocar Produto"
        subtitle={`${locacao.produtoTipo} N° ${locacao.produtoIdentificador}`}
        actions={
          <Link href={`/locacoes/${locacaoId}`} className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="max-w-4xl">
        {/* Produto Atual */}
        <div className="card p-6 mb-6 bg-primary-50 border-primary-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">🎱</span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-primary-900">{locacao.produtoTipo} N° {locacao.produtoIdentificador}</p>
              <p className="text-sm text-primary-600">Cliente atual: <strong>{locacao.clienteNome}</strong></p>
            </div>
            <ArrowRight className="w-6 h-6 text-primary-400" />
          </div>
        </div>

        {/* Novo Cliente */}
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5" />
            Buscar Novo Cliente
          </h2>
          
          <div className="relative mb-4">
            <input
              value={buscaCliente}
              onChange={(e) => setBuscaCliente(e.target.value)}
              className="input pl-10"
              placeholder="Digite para buscar cliente..."
            />
            {buscandoClientes && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-primary-500" />
            )}
            
            {/* Resultados da busca */}
            {clientesBusca.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {clientesBusca.map(cliente => (
                  <button
                    key={cliente.id}
                    type="button"
                    onClick={() => selecionarCliente(cliente)}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b last:border-b-0"
                  >
                    <p className="font-medium">{cliente.nomeExibicao}</p>
                    <p className="text-sm text-slate-500">{cliente.cidade} - {cliente.estado}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cliente selecionado */}
          {formData.novoClienteId && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">Novo cliente selecionado:</p>
              <p className="font-semibold text-green-900">{formData.novoClienteNome}</p>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, novoClienteId: '', novoClienteNome: '' }))}
                className="text-sm text-red-600 hover:underline mt-1"
              >
                Remover seleção
              </button>
            </div>
          )}
          {errors.novoClienteId && <p className="text-red-500 text-sm mt-2">{errors.novoClienteId}</p>}
        </div>

        {/* Forma de Pagamento */}
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">💰 Forma de Pagamento</h2>
          
          <div className="flex gap-3 mb-4">
            {FORMA_PAGAMENTO_OPTIONS.map(opt => (
              <label
                key={opt.value}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                  formData.formaPagamento === opt.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="formaPagamento"
                  value={opt.value}
                  checked={formData.formaPagamento === opt.value}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span>{opt.icon}</span>
                <span className="font-medium">{opt.label}</span>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Número do Relógio *</label>
              <input
                name="numeroRelogio"
                value={formData.numeroRelogio}
                onChange={handleChange}
                className="input"
                placeholder="00000"
              />
              {errors.numeroRelogio && <p className="text-red-500 text-xs mt-1">{errors.numeroRelogio}</p>}
            </div>
            
            {formData.formaPagamento !== 'Periodo' ? (
              <>
                <div>
                  <label className="label">Preço da Ficha (R$) *</label>
                  <input
                    name="precoFicha"
                    value={formData.precoFicha}
                    onChange={handleChange}
                    className="input"
                    placeholder="3,00"
                    type="number"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="label">% Empresa *</label>
                  <input
                    name="percentualEmpresa"
                    value={formData.percentualEmpresa}
                    onChange={handleChange}
                    className="input"
                    placeholder="50"
                    type="number"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="label">% Cliente (automático)</label>
                  <input
                    value={percentualCliente}
                    className="input bg-slate-50"
                    disabled
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="label">Periodicidade *</label>
                  <select
                    name="periodicidade"
                    value={formData.periodicidade}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="">Selecione</option>
                    {PERIODICIDADES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Valor Fixo (R$) *</label>
                  <input
                    name="valorFixo"
                    value={formData.valorFixo}
                    onChange={handleChange}
                    className="input"
                    placeholder="150,00"
                    type="number"
                    step="0.01"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Motivo */}
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            Motivo da Relocação
          </h2>
          
          <div>
            <label className="label">Motivo *</label>
            <textarea
              name="motivoRelocacao"
              value={formData.motivoRelocacao}
              onChange={handleChange}
              className="input min-h-[80px]"
              placeholder="Ex: Cliente solicitou mudança, produto apresentou defeito no local atual..."
            />
            {errors.motivoRelocacao && <p className="text-red-500 text-xs mt-1">{errors.motivoRelocacao}</p>}
          </div>
          
          <div className="mt-4">
            <label className="label">Observação</label>
            <textarea
              name="observacao"
              value={formData.observacao}
              onChange={handleChange}
              className="input min-h-[60px]"
              placeholder="Informações adicionais..."
            />
          </div>
          
          <div className="mt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.trocaPano}
                onChange={(e) => setFormData(prev => ({ ...prev, trocaPano: e.target.checked }))}
                className="w-5 h-5 rounded border-slate-300"
              />
              <div>
                <span className="font-medium">Troca de pano realizada</span>
                <p className="text-sm text-slate-500">Marque se houve troca de pano na relocação</p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading || !formData.novoClienteId} className="btn-primary">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Relocando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Confirmar Relocação
              </>
            )}
          </button>
          <Link href={`/locacoes/${locacaoId}`} className="btn-secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
