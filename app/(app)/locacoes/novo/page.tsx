'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, Package, User, DollarSign, Wrench, FileText, Calendar, Eye } from 'lucide-react'
import Header from '@/components/layout/header'
import { useToast } from '@/components/ui/toaster'
import { useLocacaoForm } from '@/hooks/useLocacaoForm'
import { LocacaoPagamentoForm, FORMA_OPTS, PERIODICIDADES } from '@/app/(app)/locacoes/components/LocacaoPagamentoForm'
import type { FormaPagamento } from '@/app/(app)/locacoes/components/LocacaoPagamentoForm'
import { formatarMoeda } from '@/shared/types'

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

export default function NovaLocacaoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clienteIdPreSelect = searchParams.get('clienteId')
  const { warning, error, success } = useToast()
  
  const [loadingData, setLoadingData] = useState(true)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [showPreview, setShowPreview] = useState(false)
  
  const {
    formData,
    setFormData,
    errors,
    setErrors,
    loading,
    setLoading,
    handleChange,
    setFieldValue,
    validate,
    getPercentualCliente,
    getSubmitPayload,
    clearErrors,
  } = useLocacaoForm({
    initialData: {
      clienteId: clienteIdPreSelect || '',
    }
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

  const handleProdutoChange = useCallback((produtoId: string) => {
    const produto = produtos.find(p => p.id === produtoId)
    if (produto) {
      setFieldValue('produtoId', produtoId)
      setFieldValue('produtoIdentificador', produto.identificador)
      setFieldValue('produtoTipo', produto.tipoNome)
      if (produto.numeroRelogio) {
        setFieldValue('numeroRelogio', produto.numeroRelogio)
      }
    } else {
      setFieldValue('produtoId', produtoId)
      setFieldValue('produtoIdentificador', '')
      setFieldValue('produtoTipo', '')
    }
  }, [produtos, setFieldValue])

  const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name } = e.target
    if (name === 'produtoId') {
      handleProdutoChange(e.target.value)
    } else {
      handleChange(e)
    }
  }, [handleProdutoChange, handleChange])

  const handleValidateAll = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.clienteId) {
      newErrors.clienteId = 'Selecione um cliente'
    }
    if (!formData.produtoId) {
      newErrors.produtoId = 'Selecione um produto'
    }
    if (!formData.numeroRelogio.trim()) {
      newErrors.numeroRelogio = 'Informe o número do relógio'
    }

    // Validate payment fields
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
  }, [formData, setErrors])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!handleValidateAll()) {
      warning('Corrija os erros antes de salvar')
      return
    }

    setLoading(true)

    try {
      const cliente = clientes.find(c => c.id === formData.clienteId)
      const payload = getSubmitPayload({
        clienteId: formData.clienteId,
        clienteNome: cliente?.nomeExibicao || '',
        produtoId: formData.produtoId,
        produtoIdentificador: formData.produtoIdentificador,
        produtoTipo: formData.produtoTipo,
        dataLocacao: formData.dataLocacao,
        dataUltimaManutencao: formData.trocaPano ? new Date().toISOString() : null,
        status: 'Ativa',
      })

      const res = await fetch('/api/locacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        success('Locação criada com sucesso!')
        router.push('/locacoes')
      } else {
        const errorData = await res.json()
        error(errorData.error || 'Erro ao salvar locação')
      }
    } catch (err) {
      console.error(err)
      error('Erro ao salvar locação')
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

  const selectedProduto = produtos.find(p => p.id === formData.produtoId)
  const selectedCliente = clientes.find(c => c.id === formData.clienteId)
  const percentualCliente = getPercentualCliente()

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
                  onChange={handleFormChange}
                  className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all bg-white ${
                    errors.produtoId ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                  required
                >
                  <option value="">Selecione um produto disponível</option>
                  {produtos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.tipoNome} N° {p.identificador} - {p.descricaoNome}
                    </option>
                  ))}
                </select>
                {errors.produtoId && (
                  <p className="text-red-500 text-xs mt-1">{errors.produtoId}</p>
                )}
                {produtos.length === 0 && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700 mb-2">
                      Nenhum produto disponível para locação.
                    </p>
                    <Link href="/produtos/novo" className="text-xs font-medium text-amber-800 hover:underline flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" />
                      Cadastrar novo produto
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {formData.produtoId && selectedProduto && (
              <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Produto selecionado:</span>{' '}
                  {selectedProduto.tipoNome} N° {selectedProduto.identificador} — {selectedProduto.descricaoNome}
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
                  onChange={handleFormChange}
                  className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all bg-white ${
                    errors.clienteId ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                  }`}
                  required
                >
                  <option value="">Selecione um cliente</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nomeExibicao}</option>
                  ))}
                </select>
                {errors.clienteId && (
                  <p className="text-red-500 text-xs mt-1">{errors.clienteId}</p>
                )}
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
                    onChange={handleFormChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                    required
                  />
                </div>
              </div>
            </div>
            {clientes.length === 0 && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700 mb-2">
                  Nenhum cliente ativo encontrado.
                </p>
                <Link href="/clientes/novo" className="text-xs font-medium text-amber-800 hover:underline flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  Cadastrar novo cliente
                </Link>
              </div>
            )}
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
            onChange={handleFormChange}
          />
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
                onChange={handleFormChange}
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
              onChange={handleFormChange}
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 outline-none transition-all resize-none"
              placeholder="Observações sobre a locação..."
            />
          </div>
        </section>

        {/* Preview/Summary */}
        {formData.produtoId && formData.clienteId && (
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                Resumo da Locação
              </h2>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-blue-600 hover:underline"
              >
                {showPreview ? 'Ocultar' : 'Expandir'}
              </button>
            </div>
            {showPreview && (
              <div className="p-4 md:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-500">Produto</span>
                    <span className="font-medium text-slate-900">{formData.produtoTipo} N° {formData.produtoIdentificador}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-500">Cliente</span>
                    <span className="font-medium text-slate-900">{selectedCliente?.nomeExibicao}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-500">Forma Pgto</span>
                    <span className="font-medium text-slate-900">{FORMA_OPTS.find(o => o.value === formData.formaPagamento)?.label}</span>
                  </div>
                  {formData.formaPagamento !== 'Periodo' ? (
                    <>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-slate-500">Preço Ficha</span>
                        <span className="font-bold text-slate-900">{formatarMoeda(parseFloat(formData.precoFicha) || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-slate-500">% Empresa</span>
                        <span className="font-medium text-slate-900">{formData.percentualEmpresa}%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-slate-500">% Cliente</span>
                        <span className="font-medium text-slate-900">{percentualCliente}%</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-slate-500">Valor Fixo</span>
                        <span className="font-bold text-emerald-700">{formatarMoeda(parseFloat(formData.valorFixo) || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-slate-500">Periodicidade</span>
                        <span className="font-medium text-slate-900">{formData.periodicidade}</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-500">Relógio</span>
                    <span className="font-mono font-medium text-slate-900">{formData.numeroRelogio}</span>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Botões de Ação - Sticky em Mobile */}
        <div className="fixed bottom-0 left-0 right-0 lg:static lg:mt-0 bg-white border-t border-slate-200 p-4 lg:bg-transparent lg:border-0 lg:p-0 z-10">
          <div className="max-w-7xl mx-auto flex gap-3">
            <button type="submit" disabled={loading || !formData.produtoId || !formData.clienteId} className="flex-1 lg:flex-none btn-primary justify-center">
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
