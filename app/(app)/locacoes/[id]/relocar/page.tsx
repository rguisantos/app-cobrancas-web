'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Search, ArrowLeftRight, Loader2, ArrowRight, DollarSign, Percent, Clock, TrendingUp, TrendingDown, User, Package, AlertTriangle, CheckCircle } from 'lucide-react'
import Header from '@/components/layout/header'
import { formatarMoeda } from '@/shared/types'
import { useToast } from '@/components/ui/toaster'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { LocacaoPagamentoForm, FORMA_OPTS, PERIODICIDADES } from '@/app/(app)/locacoes/components/LocacaoPagamentoForm'
import type { FormaPagamento } from '@/app/(app)/locacoes/components/LocacaoPagamentoForm'

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
  percentualCliente: number
  formaPagamento: string
  periodicidade?: string
  valorFixo?: number
  observacao?: string
}

interface Cliente {
  id: string
  nomeExibicao: string
  cidade: string
  estado: string
}

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
  const [recentClientes, setRecentClientes] = useState<Cliente[]>([])
  const [buscandoClientes, setBuscandoClientes] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showConfirm, setShowConfirm] = useState(false)
  
  const [formData, setFormData] = useState({
    novoClienteId: '',
    novoClienteNome: '',
    formaPagamento: 'PercentualReceber' as FormaPagamento,
    numeroRelogio: '',
    precoFicha: '',
    percentualEmpresa: '50',
    periodicidade: '',
    valorFixo: '',
    dataPrimeiraCobranca: '',
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
        // Helper: extract YYYY-MM-DD from ISO date string for HTML date inputs
        const toDateInput = (v: string | null | undefined) => {
          if (!v) return ''
          try { return new Date(v).toISOString().split('T')[0] } catch { return '' }
        }

        setFormData(prev => ({
          ...prev,
          numeroRelogio: data.numeroRelogio || '',
          precoFicha: String(data.precoFicha || ''),
          percentualEmpresa: String(data.percentualEmpresa || 50),
          formaPagamento: data.formaPagamento || 'PercentualReceber',
          periodicidade: data.periodicidade || '',
          valorFixo: data.valorFixo ? String(data.valorFixo) : '',
          dataPrimeiraCobranca: toDateInput(data.dataPrimeiraCobranca),
        }))
        setLoadingData(false)
      })
      .catch(err => {
        console.error(err)
        setLoadingData(false)
      })
  }, [locacaoId])

  // Load recent clients
  useEffect(() => {
    fetch('/api/clientes?limit=5&status=Ativo')
      .then(res => res.json())
      .then(data => {
        const list = data.data || data
        setRecentClientes(list.slice(0, 5))
      })
      .catch(console.error)
  }, [])

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
      setClientesBusca((data.data || data).slice(0, 10))
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

  const handleValidate = (): boolean => {
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

    if (formData.formaPagamento !== 'Periodo') {
      if (!formData.precoFicha || parseFloat(formData.precoFicha) <= 0) {
        newErrors.precoFicha = 'Informe o preço da ficha'
      }
      const pct = parseFloat(formData.percentualEmpresa)
      if (isNaN(pct) || pct < 0 || pct > 100) {
        newErrors.percentualEmpresa = 'Percentual deve ser entre 0 e 100'
      }
    } else {
      if (!formData.valorFixo || parseFloat(formData.valorFixo) <= 0) {
        newErrors.valorFixo = 'Informe o valor fixo'
      }
      if (!formData.periodicidade) {
        newErrors.periodicidade = 'Selecione a periodicidade'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault()
    if (handleValidate()) {
      setShowConfirm(true)
    }
  }

  const handleConfirmRelocar = async () => {
    setLoading(true)
    setShowConfirm(false)

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
          dataPrimeiraCobranca: formData.dataPrimeiraCobranca || undefined,
          motivoRelocacao: formData.motivoRelocacao,
          observacao: formData.observacao || undefined,
          trocaPano: formData.trocaPano,
        }),
      })

      if (res.ok) {
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

  const formaLabel = FORMA_OPTS.find(o => o.value === locacao.formaPagamento)?.label || locacao.formaPagamento

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

      <form onSubmit={handleSubmitClick} className="max-w-4xl space-y-6">
        {/* Produto Atual & Resumo Financeiro */}
        <div className="card p-6 bg-primary-50 border-primary-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
              <Package className="w-6 h-6 text-primary-700" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-primary-900">{locacao.produtoTipo} N° {locacao.produtoIdentificador}</p>
              <p className="text-sm text-primary-600">Cliente atual: <strong>{locacao.clienteNome}</strong></p>
            </div>
            <ArrowRight className="w-6 h-6 text-primary-400" />
          </div>
          {/* Financial Summary of current locação */}
          <div className="mt-4 pt-4 border-t border-primary-200">
            <p className="text-xs font-medium text-primary-700 uppercase tracking-wider mb-3">Dados financeiros atuais</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white/60 rounded-lg">
                <span className="text-xs text-primary-600">Forma Pgto</span>
                <p className="font-medium text-primary-900 text-sm">{formaLabel}</p>
              </div>
              {locacao.formaPagamento !== 'Periodo' ? (
                <>
                  <div className="p-3 bg-white/60 rounded-lg">
                    <span className="text-xs text-primary-600">Preço Ficha</span>
                    <p className="font-bold text-primary-900 text-sm">{formatarMoeda(locacao.precoFicha)}</p>
                  </div>
                  <div className="p-3 bg-white/60 rounded-lg">
                    <span className="text-xs text-primary-600">% Empresa</span>
                    <p className="font-medium text-primary-900 text-sm">{locacao.percentualEmpresa}%</p>
                  </div>
                  <div className="p-3 bg-white/60 rounded-lg">
                    <span className="text-xs text-primary-600">% Cliente</span>
                    <p className="font-medium text-primary-900 text-sm">{locacao.percentualCliente}%</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-white/60 rounded-lg">
                    <span className="text-xs text-primary-600">Valor Fixo</span>
                    <p className="font-bold text-emerald-700 text-sm">{locacao.valorFixo ? formatarMoeda(locacao.valorFixo) : '—'}</p>
                  </div>
                  <div className="p-3 bg-white/60 rounded-lg">
                    <span className="text-xs text-primary-600">Periodicidade</span>
                    <p className="font-medium text-primary-900 text-sm">{locacao.periodicidade || '—'}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Novo Cliente */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5" />
            Buscar Novo Cliente
          </h2>
          
          <div className="relative mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                placeholder="Digite para buscar cliente..."
              />
              {buscandoClientes && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-primary-500" />
              )}
            </div>
            
            {/* Resultados da busca */}
            {clientesBusca.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {clientesBusca.map(cliente => (
                  <button
                    key={cliente.id}
                    type="button"
                    onClick={() => selecionarCliente(cliente)}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b last:border-b-0 flex items-center gap-3"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="font-medium">{cliente.nomeExibicao}</p>
                      <p className="text-sm text-slate-500">{cliente.cidade} - {cliente.estado}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recent clients suggestion */}
          {!formData.novoClienteId && !buscaCliente && recentClientes.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-slate-500 mb-2">Clientes recentes:</p>
              <div className="flex flex-wrap gap-2">
                {recentClientes.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selecionarCliente(c)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
                  >
                    {c.nomeExibicao}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cliente selecionado */}
          {formData.novoClienteId && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-green-600">Novo cliente selecionado:</p>
                <p className="font-semibold text-green-900">{formData.novoClienteNome}</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, novoClienteId: '', novoClienteNome: '' }))}
                className="text-sm text-red-600 hover:underline"
              >
                Remover
              </button>
            </div>
          )}
          {errors.novoClienteId && <p className="text-red-500 text-sm mt-2">{errors.novoClienteId}</p>}
        </div>

        {/* Forma de Pagamento */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-600" />
              Forma de Pagamento
            </h2>
          </div>
          <LocacaoPagamentoForm
            formData={{
              formaPagamento: formData.formaPagamento,
              precoFicha: formData.precoFicha,
              percentualEmpresa: formData.percentualEmpresa,
              periodicidade: formData.periodicidade,
              valorFixo: formData.valorFixo,
              dataPrimeiraCobranca: formData.dataPrimeiraCobranca,
              numeroRelogio: formData.numeroRelogio,
            }}
            errors={errors}
            onChange={handleChange}
          />
        </section>

        {/* Motivo */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            Motivo da Relocação
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Motivo <span className="text-red-500">*</span></label>
            <textarea
              name="motivoRelocacao"
              value={formData.motivoRelocacao}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none min-h-[80px]"
              placeholder="Ex: Cliente solicitou mudança, produto apresentou defeito no local atual..."
            />
            {errors.motivoRelocacao && <p className="text-red-500 text-xs mt-1">{errors.motivoRelocacao}</p>}
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Observação</label>
            <textarea
              name="observacao"
              value={formData.observacao}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none min-h-[60px]"
              placeholder="Informações adicionais..."
            />
          </div>
          
          <div className="mt-4">
            <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              formData.trocaPano 
                ? 'border-purple-500 bg-purple-50' 
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}>
              <input
                type="checkbox"
                checked={formData.trocaPano}
                onChange={(e) => setFormData(prev => ({ ...prev, trocaPano: e.target.checked }))}
                className="w-5 h-5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 mt-0.5"
              />
              <div>
                <span className="font-medium text-slate-900">Troca de pano realizada</span>
                <p className="text-sm text-slate-500 mt-1">Marque se houve troca de pano na relocação</p>
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

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmRelocar}
        title="Confirmar Relocação"
        message={`Tem certeza que deseja relocar ${locacao.produtoTipo} N° ${locacao.produtoIdentificador} de ${locacao.clienteNome} para ${formData.novoClienteNome}? A locação atual será finalizada e uma nova será criada.`}
        confirmText="Confirmar Relocação"
        cancelText="Cancelar"
        variant="warning"
        isLoading={loading}
      />
    </div>
  )
}
