'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, Package, User, DollarSign, Wrench, FileText, Calendar, TrendingUp, TrendingDown, Clock } from 'lucide-react'
import Header from '@/components/layout/header'

interface Cliente { 
  id: string
  nomeExibicao: string 
}
interface Produto { 
  id: string
  identificador: string
  tipoNome: string
  descricaoNome: string
  numeroRelogio: string
  statusProduto: string 
}

const FORMA_OPTS = [
  { value: 'PercentualReceber', label: '% Receber', icon: TrendingUp, color: 'emerald' },
  { value: 'PercentualPagar', label: '% Pagar', icon: TrendingDown, color: 'rose' },
  { value: 'Periodo', label: 'Período', icon: Clock, color: 'blue' },
]

const PERIODICIDADES = ['Mensal', 'Semanal', 'Quinzenal', 'Diária']

export default function NovaLocacaoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clienteIdPreSelect = searchParams.get('clienteId')
  
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  
  const [formData, setFormData] = useState({
    clienteId: clienteIdPreSelect || '',
    produtoId: '',
    produtoIdentificador: '',
    produtoTipo: '',
    numeroRelogio: '',
    dataLocacao: new Date().toISOString().split('T')[0],
    formaPagamento: 'PercentualReceber' as 'Periodo' | 'PercentualPagar' | 'PercentualReceber',
    precoFicha: '',
    percentualEmpresa: '50',
    periodicidade: '',
    valorFixo: '',
    dataPrimeiraCobranca: '',
    trocaPano: false,
    observacao: ''
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/clientes?limit=1000&status=Ativo').then(res => res.json()),
      fetch('/api/produtos?disponiveis=true&limit=1000').then(res => res.json())
    ])
      .then(([clientesData, produtosData]) => {
        setClientes(clientesData.data || clientesData)
        setProdutos(produtosData.data || produtosData)
        setLoadingData(false)
      })
      .catch(console.error)
  }, [])

  const percentualCliente = Math.max(0, 100 - (parseFloat(formData.percentualEmpresa) || 0))

  const handleProdutoChange = useCallback((produtoId: string) => {
    const produto = produtos.find(p => p.id === produtoId)
    if (produto) {
      setFormData(prev => ({
        ...prev,
        produtoId,
        produtoIdentificador: produto.identificador,
        produtoTipo: produto.tipoNome,
        numeroRelogio: produto.numeroRelogio || prev.numeroRelogio
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        produtoId,
        produtoIdentificador: '',
        produtoTipo: ''
      }))
    }
  }, [produtos])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    if (name === 'produtoId') {
      handleProdutoChange(value)
    } else {
      setFormData(prev => ({ 
        ...prev, 
        [name]: type === 'checkbox' ? checked : value 
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const cliente = clientes.find(c => c.id === formData.clienteId)
    
    if (!cliente || !formData.produtoId) {
      alert('Selecione um cliente e um produto')
      return
    }

    if (!formData.numeroRelogio.trim()) {
      alert('Informe o número do relógio')
      return
    }

    if (formData.formaPagamento !== 'Periodo') {
      if (!formData.precoFicha || parseFloat(formData.precoFicha) <= 0) {
        alert('Informe o preço da ficha')
        return
      }
      const pct = parseFloat(formData.percentualEmpresa)
      if (isNaN(pct) || pct < 0 || pct > 100) {
        alert('Percentual da empresa deve ser entre 0 e 100')
        return
      }
    } else {
      if (!formData.valorFixo || parseFloat(formData.valorFixo) <= 0) {
        alert('Informe o valor fixo')
        return
      }
      if (!formData.periodicidade) {
        alert('Selecione a periodicidade')
        return
      }
    }

    setLoading(true)

    try {
      const res = await fetch('/api/locacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: formData.clienteId,
          clienteNome: cliente.nomeExibicao,
          produtoId: formData.produtoId,
          produtoIdentificador: formData.produtoIdentificador,
          produtoTipo: formData.produtoTipo,
          dataLocacao: formData.dataLocacao,
          formaPagamento: formData.formaPagamento,
          numeroRelogio: formData.numeroRelogio,
          precoFicha: parseFloat(formData.precoFicha) || 0,
          percentualEmpresa: parseFloat(formData.percentualEmpresa) || 50,
          percentualCliente,
          periodicidade: formData.periodicidade || null,
          valorFixo: formData.valorFixo ? parseFloat(formData.valorFixo) : null,
          dataPrimeiraCobranca: formData.dataPrimeiraCobranca || null,
          trocaPano: formData.trocaPano,
          dataUltimaManutencao: formData.trocaPano ? new Date().toISOString() : null,
          observacao: formData.observacao || null,
          status: 'Ativa'
        })
      })

      if (res.ok) {
        router.push('/locacoes')
      } else {
        const error = await res.json()
        alert(error.error || 'Erro ao salvar locação')
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao salvar locação')
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-slate-500">Carregando dados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-24 lg:pb-8">
      <Header
        title="Nova Locação"
        subtitle="Registrar uma nova locação"
        actions={
          <Link href="/locacoes" className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Produto */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Produto
            </h2>
          </div>
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Produto Disponível <span className="text-red-500">*</span>
                </label>
                <select
                  name="produtoId"
                  value={formData.produtoId}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
                  required
                >
                  <option value="">Selecione um produto disponível</option>
                  {produtos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.tipoNome} N° {p.identificador} - {p.descricaoNome}
                    </option>
                  ))}
                </select>
                {produtos.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                    <span>⚠️</span>
                    Nenhum produto disponível para locação
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Número do Relógio <span className="text-red-500">*</span>
                </label>
                <input
                  name="numeroRelogio"
                  value={formData.numeroRelogio}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-mono"
                  placeholder="Leitura inicial do relógio"
                  required
                />
              </div>
            </div>

            {formData.produtoId && (
              <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Produto selecionado:</span>{' '}
                  {formData.produtoTipo} N° {formData.produtoIdentificador}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Cliente */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              Cliente
            </h2>
          </div>
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Cliente <span className="text-red-500">*</span>
                </label>
                <select
                  name="clienteId"
                  value={formData.clienteId}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all bg-white"
                  required
                >
                  <option value="">Selecione um cliente</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nomeExibicao}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Data da Locação <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    name="dataLocacao"
                    value={formData.dataLocacao}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Forma de Pagamento */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-600" />
              Forma de Pagamento
            </h2>
          </div>
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              {FORMA_OPTS.map(opt => {
                const Icon = opt.icon
                const isSelected = formData.formaPagamento === opt.value
                const colorClasses = {
                  emerald: 'border-emerald-500 bg-emerald-50 text-emerald-700',
                  rose: 'border-rose-500 bg-rose-50 text-rose-700',
                  blue: 'border-blue-500 bg-blue-50 text-blue-700',
                }
                return (
                  <label
                    key={opt.value}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected 
                        ? colorClasses[opt.color as keyof typeof colorClasses]
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="formaPagamento"
                      value={opt.value}
                      checked={isSelected}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <Icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{opt.label}</span>
                  </label>
                )
              })}
            </div>

            {formData.formaPagamento !== 'Periodo' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Preço da Ficha (R$) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        name="precoFicha"
                        value={formData.precoFicha}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                        placeholder="3,00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      % Empresa <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="percentualEmpresa"
                        value={formData.percentualEmpresa}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                        placeholder="50"
                        min="0"
                        max="100"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">% Cliente (automático)</label>
                    <div className="relative">
                      <input
                        value={`${percentualCliente}%`}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600"
                        disabled
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Data Primeira Cobrança</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        name="dataPrimeiraCobranca"
                        value={formData.dataPrimeiraCobranca}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Periodicidade <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="periodicidade"
                    value={formData.periodicidade}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
                  >
                    <option value="">Selecione</option>
                    {PERIODICIDADES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Valor Fixo (R$) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      name="valorFixo"
                      value={formData.valorFixo}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      placeholder="150,00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Data Primeira Cobrança</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      name="dataPrimeiraCobranca"
                      value={formData.dataPrimeiraCobranca}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Manutenção */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-purple-600" />
              Manutenção
            </h2>
          </div>
          <div className="p-4 md:p-6">
            <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              formData.trocaPano 
                ? 'border-purple-500 bg-purple-50' 
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}>
              <input
                type="checkbox"
                name="trocaPano"
                checked={formData.trocaPano}
                onChange={handleChange}
                className="w-5 h-5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 mt-0.5"
              />
              <div>
                <span className="font-medium text-slate-900">Troca de Pano / Manutenção Realizada</span>
                <p className="text-sm text-slate-500 mt-1">Marque se foi realizada manutenção no momento da locação</p>
              </div>
            </label>
          </div>
        </section>

        {/* Observações */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-600" />
              Observações
            </h2>
          </div>
          <div className="p-4 md:p-6">
            <textarea
              name="observacao"
              value={formData.observacao}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 outline-none transition-all resize-none"
              placeholder="Observações sobre a locação..."
            />
          </div>
        </section>

        {/* Botões de Ação - Sticky em Mobile */}
        <div className="fixed bottom-0 left-0 right-0 lg:static lg:mt-0 bg-white border-t border-slate-200 p-4 lg:bg-transparent lg:border-0 lg:p-0 z-10">
          <div className="max-w-7xl mx-auto flex gap-3">
            <button type="submit" disabled={loading || !formData.produtoId} className="flex-1 lg:flex-none btn-primary justify-center">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Locação
                </>
              )}
            </button>
            <Link href="/locacoes" className="btn-secondary hidden lg:inline-flex">
              Cancelar
            </Link>
          </div>
        </div>
      </form>
    </div>
  )
}
