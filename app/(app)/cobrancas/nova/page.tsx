'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Calculator, Loader2, FileText, Hash, DollarSign, Calendar, User, Package, Wrench } from 'lucide-react'
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
  ultimaLeituraRelogio: number | null
  status: string
}

export default function NovaCobrancaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const locacaoIdPreSelect = searchParams.get('locacaoId')

  const [loading, setLoading] = useState(false)
  const [locacoes, setLocacoes] = useState<Locacao[]>([])
  const [locacaoSelecionada, setLocacaoSelecionada] = useState<Locacao | null>(null)
  const { warning, error: toastError } = useToast()

  const [formData, setFormData] = useState({
    locacaoId: locacaoIdPreSelect || '',
    relogioAtual: '',
    descontoPartidasQtd: '',
    descontoDinheiro: '',
    valorRecebido: '',
    observacao: '',
    dataInicio: '',
    dataFim: new Date().toISOString().split('T')[0],
    trocaPano: false,
  })

  const [calculos, setCalculos] = useState({
    fichasRodadas: 0,
    totalBruto: 0,
    subtotalAposDescontos: 0,
    valorPercentual: 0,
    totalClientePaga: 0
  })

  useEffect(() => {
    fetch('/api/locacoes?status=Ativa&limit=1000')
      .then(res => res.json())
      .then(data => {
        const locacoesData = data.data || data
        setLocacoes(locacoesData)
        if (locacaoIdPreSelect) {
          const loc = locacoesData.find((l: Locacao) => l.id === locacaoIdPreSelect)
          if (loc) setLocacaoSelecionada(loc)
        }
      })
      .catch(console.error)
  }, [locacaoIdPreSelect])

  useEffect(() => {
    if (!locacaoSelecionada) {
      setCalculos({ fichasRodadas: 0, totalBruto: 0, subtotalAposDescontos: 0, valorPercentual: 0, totalClientePaga: 0 })
      return
    }

    const relogioAnterior = locacaoSelecionada.ultimaLeituraRelogio || 0
    const relogioAtual = parseFloat(formData.relogioAtual) || 0
    const fichasRodadas = relogioAtual - relogioAnterior
    const totalBruto = fichasRodadas * locacaoSelecionada.precoFicha

    const descontoPartidasQtd = parseFloat(formData.descontoPartidasQtd) || 0
    const descontoPartidasValor = descontoPartidasQtd * locacaoSelecionada.precoFicha
    const descontoDinheiro = parseFloat(formData.descontoDinheiro) || 0
    
    const subtotalAposDescontos = totalBruto - descontoPartidasValor - descontoDinheiro
    const valorPercentual = subtotalAposDescontos * (locacaoSelecionada.percentualEmpresa / 100)
    const totalClientePaga = subtotalAposDescontos - valorPercentual

    setCalculos({
      fichasRodadas,
      totalBruto,
      subtotalAposDescontos: Math.max(0, subtotalAposDescontos),
      valorPercentual: Math.max(0, valorPercentual),
      totalClientePaga: Math.max(0, totalClientePaga)
    })
  }, [locacaoSelecionada, formData.relogioAtual, formData.descontoPartidasQtd, formData.descontoDinheiro])

  const handleLocacaoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const locacaoId = e.target.value
    const loc = locacoes.find(l => l.id === locacaoId)
    setLocacaoSelecionada(loc || null)
    setFormData(prev => ({ ...prev, locacaoId }))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!locacaoSelecionada) {
      warning('Selecione uma locação')
      return
    }

    const relogioAnterior = locacaoSelecionada.ultimaLeituraRelogio || 0
    const relogioAtual = parseFloat(formData.relogioAtual) || 0

    if (relogioAtual < relogioAnterior) {
      warning('A leitura atual não pode ser menor que a leitura anterior')
      return
    }

    setLoading(true)

    try {
      const valorRecebido = parseFloat(formData.valorRecebido) || 0
      const saldoDevedorGerado = Math.max(0, calculos.totalClientePaga - valorRecebido)

      const res = await fetch('/api/cobrancas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locacaoId: formData.locacaoId,
          clienteId: locacaoSelecionada.clienteId,
          clienteNome: locacaoSelecionada.clienteNome,
          produtoId: locacaoSelecionada.produtoId,
          produtoIdentificador: locacaoSelecionada.produtoIdentificador,
          dataInicio: formData.dataInicio || new Date().toISOString().split('T')[0],
          dataFim: formData.dataFim,
          relogioAnterior,
          relogioAtual,
          fichasRodadas: calculos.fichasRodadas,
          valorFicha: locacaoSelecionada.precoFicha,
          totalBruto: calculos.totalBruto,
          descontoPartidasQtd: parseFloat(formData.descontoPartidasQtd) || null,
          descontoPartidasValor: parseFloat(formData.descontoPartidasQtd) * locacaoSelecionada.precoFicha || null,
          descontoDinheiro: parseFloat(formData.descontoDinheiro) || null,
          percentualEmpresa: locacaoSelecionada.percentualEmpresa,
          subtotalAposDescontos: calculos.subtotalAposDescontos,
          valorPercentual: calculos.valorPercentual,
          totalClientePaga: calculos.totalClientePaga,
          valorRecebido,
          saldoDevedorGerado: Math.max(0, saldoDevedorGerado),
          status: valorRecebido >= calculos.totalClientePaga ? 'Pago' : (valorRecebido > 0 ? 'Parcial' : 'Pendente'),
          observacao: formData.observacao || null,
          trocaPano: formData.trocaPano,
        })
      })

      if (res.ok) {
        // No need to call PUT /locacoes — the cobrança POST already propagates
        // ultimaLeituraRelogio, dataUltimaCobranca, numeroRelogio, and trocaPano
        router.push('/cobrancas')
      } else {
        const errorData = await res.json()
        toastError(errorData.error || 'Erro ao salvar cobrança')
      }
    } catch (err) {
      console.error(err)
      toastError('Erro ao salvar cobrança')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pb-24 lg:pb-8">
      <Header
        title="Nova Cobrança"
        subtitle="Registrar uma nova cobrança"
        actions={
          <Link href="/cobrancas" className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selecionar Locação */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Selecionar Locação
            </h2>
          </div>
          <div className="p-4 md:p-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Locação Ativa <span className="text-red-500">*</span>
              </label>
              <select
                name="locacaoId"
                value={formData.locacaoId}
                onChange={handleLocacaoChange}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
                required
              >
                <option value="">Selecione uma locação</option>
                {locacoes.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.clienteNome} - {l.produtoTipo} N° {l.produtoIdentificador} (Relógio: {l.numeroRelogio})
                  </option>
                ))}
              </select>
            </div>

            {locacaoSelecionada && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Cliente</span>
                    <p className="font-medium text-slate-900">{locacaoSelecionada.clienteNome}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Package className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Produto</span>
                    <p className="font-medium text-slate-900">{locacaoSelecionada.produtoTipo} N° {locacaoSelecionada.produtoIdentificador}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Hash className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Relógio N°</span>
                    <p className="font-mono font-bold text-slate-900">{locacaoSelecionada.numeroRelogio}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Preço Ficha</span>
                    <p className="font-medium text-slate-900">{formatarMoeda(locacaoSelecionada.precoFicha)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-rose-600">%</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">% Empresa</span>
                    <p className="font-medium text-slate-900">{locacaoSelecionada.percentualEmpresa}%</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {locacaoSelecionada && (
          <>
            {/* Leitura do Relógio */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Hash className="w-5 h-5 text-purple-600" />
                  Leitura do Relógio
                </h2>
              </div>
              <div className="p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Leitura Anterior
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={locacaoSelecionada.ultimaLeituraRelogio ?? 0}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 font-mono text-lg cursor-not-allowed"
                      readOnly
                    />
                    <p className="text-xs text-slate-400 mt-1">Leitura da última cobrança</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Leitura Atual <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="relogioAtual"
                      value={formData.relogioAtual}
                      onChange={handleChange}
                      min={locacaoSelecionada.ultimaLeituraRelogio ?? 0}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all font-mono text-lg"
                      placeholder="Ex: 8500"
                      required
                    />
                    {formData.relogioAtual && (parseFloat(formData.relogioAtual) || 0) < (locacaoSelecionada.ultimaLeituraRelogio ?? 0) && (
                      <p className="text-xs text-red-500 mt-1 font-medium">Leitura atual não pode ser menor que a anterior</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Data Início</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        name="dataInicio"
                        value={formData.dataInicio}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Data Fim <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        name="dataFim"
                        value={formData.dataFim}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Indicador de fichas rodadas */}
                <div className="mt-4 flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <span className="text-sm text-purple-700">Fichas Rodadas (Atual - Anterior)</span>
                  <span className="text-xl font-bold text-purple-700">
                    {calculos.fichasRodadas.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            </section>

            {/* Descontos */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                  Descontos (Opcional)
                </h2>
              </div>
              <div className="p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Desconto Partidas (Qtd)</label>
                    <input
                      type="number"
                      step="1"
                      name="descontoPartidasQtd"
                      value={formData.descontoPartidasQtd}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                      placeholder="Ex: 10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Desconto em Dinheiro (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        name="descontoDinheiro"
                        value={formData.descontoDinheiro}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                        placeholder="Ex: 50.00"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Troca de Pano */}
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
                    <span className="font-medium text-slate-900">Troca de Pano</span>
                    <p className="text-sm text-slate-500 mt-1">
                      Marque se foi realizada troca de pano neste momento. Isso registrará uma manutenção de troca de pano no produto e na locação.
                    </p>
                  </div>
                </label>
              </div>
            </section>

            {/* Cálculos */}
            <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm overflow-hidden">
              <div className="px-4 md:px-6 py-4 border-b border-blue-200/50">
                <h2 className="font-semibold text-blue-900 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-blue-600" />
                  Cálculos
                </h2>
              </div>
              <div className="p-4 md:p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <span className="text-xs text-slate-500">Fichas Rodadas</span>
                    <p className="text-xl font-bold text-slate-900 mt-1">{calculos.fichasRodadas.toFixed(0)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <span className="text-xs text-slate-500">Total Bruto</span>
                    <p className="text-xl font-bold text-slate-900 mt-1">{formatarMoeda(calculos.totalBruto)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <span className="text-xs text-slate-500">Subtotal (após descontos)</span>
                    <p className="text-xl font-bold text-slate-900 mt-1">{formatarMoeda(calculos.subtotalAposDescontos)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <span className="text-xs text-slate-500">% Empresa</span>
                    <p className="text-xl font-bold text-blue-700 mt-1">-{formatarMoeda(calculos.valorPercentual)}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium text-blue-900">Total Cliente Paga:</span>
                    <span className="text-3xl font-bold text-emerald-700">{formatarMoeda(calculos.totalClientePaga)}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Pagamento */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  Pagamento
                </h2>
              </div>
              <div className="p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Valor Recebido <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        name="valorRecebido"
                        value={formData.valorRecebido}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-lg font-medium"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Saldo Devedor</label>
                    <div className={`text-2xl font-bold mt-2 ${
                      (calculos.totalClientePaga - (parseFloat(formData.valorRecebido) || 0)) > 0 
                        ? 'text-red-600' 
                        : 'text-emerald-600'
                    }`}>
                      {formatarMoeda(Math.max(0, calculos.totalClientePaga - (parseFloat(formData.valorRecebido) || 0)))}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Observação</label>
                  <textarea
                    name="observacao"
                    value={formData.observacao}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 outline-none transition-all resize-none"
                    placeholder="Observações sobre a cobrança..."
                  />
                </div>
              </div>
            </section>

            {/* Botões de Ação - Sticky em Mobile */}
            <div className="fixed bottom-0 left-0 right-0 lg:static lg:mt-0 bg-white border-t border-slate-200 p-4 lg:bg-transparent lg:border-0 lg:p-0 z-10">
              <div className="max-w-7xl mx-auto flex gap-3">
                <button type="submit" disabled={loading} className="flex-1 lg:flex-none btn-primary justify-center">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Salvar Cobrança
                    </>
                  )}
                </button>
                <Link href="/cobrancas" className="btn-secondary hidden lg:inline-flex">
                  Cancelar
                </Link>
              </div>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
