'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Save, Calculator, Loader2, FileText, Hash, DollarSign,
  Calendar, User, Package, Wrench, MapPin, ChevronDown, ChevronRight,
  AlertCircle, CheckCircle2, Clock
} from 'lucide-react'
import Header from '@/components/layout/header'
import { formatarMoeda } from '@/shared/types'
import { useToast } from '@/components/ui/toaster'

// ============================================================================
// TIPOS
// ============================================================================

interface Rota {
  id: string
  descricao: string
  cor: string
  regiao: string | null
  _count?: { clientes: number }
}

interface LocacaoPorRota {
  id: string
  clienteId: string
  clienteNome: string
  produtoId: string
  produtoIdentificador: string
  produtoTipo: string
  numeroRelogio: string
  precoFicha: number
  percentualEmpresa: number
  status: string
  dataLocacao: string
  saldoDevedor: number
  cliente?: { nomeExibicao: string; rotaId: string }
}

interface ClienteGrupo {
  clienteId: string
  clienteNome: string
  locacoes: LocacaoPorRota[]
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function NovaCobrancaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const locacaoIdPreSelect = searchParams.get('locacaoId')

  const { warning, error: toastError } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingRotas, setLoadingRotas] = useState(true)
  const [loadingClientes, setLoadingClientes] = useState(false)

  // Etapa 1: Rotas
  const [rotas, setRotas] = useState<Rota[]>([])
  const [rotaSelecionada, setRotaSelecionada] = useState<string>('')

  // Etapa 2: Clientes com locações
  const [clientes, setClientes] = useState<ClienteGrupo[]>([])
  const [clienteExpandido, setClienteExpandido] = useState<string | null>(null)

  // Etapa 3: Locação selecionada
  const [locacaoSelecionada, setLocacaoSelecionada] = useState<LocacaoPorRota | null>(null)

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

  const [saldoAnterior, setSaldoAnterior] = useState(0)

  const [calculos, setCalculos] = useState({
    fichasRodadas: 0,
    totalBruto: 0,
    subtotalAposDescontos: 0,
    valorPercentual: 0,
    totalClientePaga: 0,
    totalComSaldoAnterior: 0
  })

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  // Carregar rotas ao montar
  useEffect(() => {
    fetch('/api/rotas?status=Ativo&limit=100')
      .then(res => res.json())
      .then(data => {
        const rotasData = data.data || data
        setRotas(rotasData)
      })
      .catch(err => {
        console.error('Erro ao buscar rotas:', err)
        toastError('Erro ao carregar rotas')
      })
      .finally(() => setLoadingRotas(false))
  }, [])

  // Quando selecionar rota, buscar clientes/locações
  useEffect(() => {
    if (!rotaSelecionada) {
      setClientes([])
      setClienteExpandido(null)
      return
    }

    setLoadingClientes(true)
    setClienteExpandido(null)
    setLocacaoSelecionada(null)

    fetch(`/api/locacoes/por-rota?rotaId=${rotaSelecionada}`)
      .then(res => res.json())
      .then(data => {
        const clientesData = data.data || []
        setClientes(clientesData)

        // Se veio locacaoIdPreSelect, tentar pré-selecionar
        if (locacaoIdPreSelect) {
          for (const cl of clientesData) {
            const loc = cl.locacoes.find((l: LocacaoPorRota) => l.id === locacaoIdPreSelect)
            if (loc) {
              setClienteExpandido(cl.clienteId)
              handleSelectLocacao(loc)
              break
            }
          }
        }
      })
      .catch(err => {
        console.error('Erro ao buscar clientes:', err)
        toastError('Erro ao carregar clientes')
      })
      .finally(() => setLoadingClientes(false))
  }, [rotaSelecionada]) // eslint-disable-line react-hooks/exhaustive-deps

  // Buscar saldo devedor da cobrança anterior quando locação for selecionada
  useEffect(() => {
    if (!locacaoSelecionada) {
      setSaldoAnterior(0)
      return
    }

    fetch(`/api/cobrancas?locacaoId=${locacaoSelecionada.id}&limit=1`)
      .then(res => res.json())
      .then(data => {
        const cobrancas = data.data || data
        if (Array.isArray(cobrancas) && cobrancas.length > 0) {
          const ultimaCobranca = cobrancas[0]
          const saldo = ultimaCobranca.saldoDevedorGerado || 0
          setSaldoAnterior(saldo > 0 ? saldo : 0)
        } else {
          setSaldoAnterior(0)
        }
      })
      .catch(err => {
        console.error('Erro ao buscar saldo anterior:', err)
        setSaldoAnterior(0)
      })
  }, [locacaoSelecionada])

  // Recalcular quando inputs mudam
  useEffect(() => {
    if (!locacaoSelecionada) {
      setCalculos({ fichasRodadas: 0, totalBruto: 0, subtotalAposDescontos: 0, valorPercentual: 0, totalClientePaga: 0, totalComSaldoAnterior: 0 })
      return
    }

    const relogioAnterior = parseFloat(locacaoSelecionada.numeroRelogio) || 0
    const relogioAtual = parseFloat(formData.relogioAtual) || 0
    const fichasRodadas = Math.max(0, relogioAtual - relogioAnterior)
    const totalBruto = fichasRodadas * locacaoSelecionada.precoFicha

    const descontoPartidasQtd = parseFloat(formData.descontoPartidasQtd) || 0
    const descontoPartidasValor = descontoPartidasQtd * locacaoSelecionada.precoFicha
    const descontoDinheiro = parseFloat(formData.descontoDinheiro) || 0

    const subtotalAposDescontos = totalBruto - descontoPartidasValor
    const valorPercentual = subtotalAposDescontos * (locacaoSelecionada.percentualEmpresa / 100)
    const totalClientePaga = subtotalAposDescontos - valorPercentual - descontoDinheiro
    const totalComSaldoAnterior = Math.max(0, totalClientePaga) + saldoAnterior

    setCalculos({
      fichasRodadas,
      totalBruto,
      subtotalAposDescontos: Math.max(0, subtotalAposDescontos),
      valorPercentual: Math.max(0, valorPercentual),
      totalClientePaga: Math.max(0, totalClientePaga),
      totalComSaldoAnterior
    })
  }, [locacaoSelecionada, formData.relogioAtual, formData.descontoPartidasQtd, formData.descontoDinheiro, saldoAnterior])

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleSelectLocacao = (loc: LocacaoPorRota) => {
    setLocacaoSelecionada(loc)
    setSaldoAnterior(0)
    setFormData(prev => ({ ...prev, locacaoId: loc.id, relogioAtual: '', valorRecebido: '' }))
    // Scroll para a seção de relógio
    setTimeout(() => {
      document.getElementById('secao-relogio')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (loading) return

    if (!locacaoSelecionada) {
      warning('Selecione uma locação')
      return
    }

    const relogioAnterior = parseFloat(locacaoSelecionada.numeroRelogio) || 0
    const relogioAtual = parseFloat(formData.relogioAtual) || 0

    if (relogioAtual < relogioAnterior) {
      warning('A leitura atual não pode ser menor que a leitura anterior')
      return
    }

    setLoading(true)

    try {
      const valorRecebido = parseFloat(formData.valorRecebido) || 0
      const saldoDevedorGerado = Math.max(0, calculos.totalComSaldoAnterior - valorRecebido)

      const res = await fetch('/api/cobrancas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locacaoId: formData.locacaoId,
          clienteId: locacaoSelecionada.clienteId,
          clienteNome: locacaoSelecionada.cliente?.nomeExibicao ?? locacaoSelecionada.clienteNome,
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
          saldoAnterior,
          valorRecebido,
          saldoDevedorGerado: Math.max(0, saldoDevedorGerado),
          status: valorRecebido >= calculos.totalComSaldoAnterior ? 'Pago' : (valorRecebido > 0 ? 'Parcial' : 'Pendente'),
          observacao: formData.observacao || null,
          trocaPano: formData.trocaPano,
        })
      })

      if (res.ok) {
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

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================

  const statusLocacaoConfig: Record<string, { bg: string; text: string; label: string }> = {
    Ativa: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Ativa' },
    Finalizada: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Finalizada' },
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

        {/* ================================================================ */}
        {/* ETAPA 1: Selecionar Rota                                        */}
        {/* ================================================================ */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Selecionar Rota
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Escolha a rota para ver os clientes e locações</p>
          </div>
          <div className="p-4 md:p-6">
            {loadingRotas ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span className="ml-2 text-slate-500">Carregando rotas...</span>
              </div>
            ) : rotas.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <MapPin className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p>Nenhuma rota ativa encontrada</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {rotas.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setRotaSelecionada(r.id)
                      setLocacaoSelecionada(null)
                      setFormData(prev => ({ ...prev, locacaoId: '' }))
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      rotaSelecionada === r.id
                        ? 'border-blue-500 bg-blue-50 shadow-md ring-1 ring-blue-200'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm"
                        style={{ backgroundColor: r.cor || '#2563EB' }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 truncate">{r.descricao}</p>
                        {r.regiao && (
                          <p className="text-xs text-slate-500 truncate">{r.regiao}</p>
                        )}
                      </div>
                      {r._count && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full flex-shrink-0">
                          {r._count.clientes} cliente{r._count.clientes !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ================================================================ */}
        {/* ETAPA 2: Clientes e Locações da Rota                            */}
        {/* ================================================================ */}
        {rotaSelecionada && (
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" />
                Clientes e Locações
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Selecione a locação para registrar a cobrança
                {clientes.length > 0 && (
                  <span className="ml-1 font-medium text-slate-700">
                    — {clientes.length} cliente{clientes.length !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
            <div className="p-4 md:p-6">
              {loadingClientes ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  <span className="ml-2 text-slate-500">Carregando clientes...</span>
                </div>
              ) : clientes.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <User className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p>Nenhum cliente com locação ativa nesta rota</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clientes.map(cliente => {
                    const isExpandido = clienteExpandido === cliente.clienteId
                    const locacoesAtivas = cliente.locacoes.filter(l => l.status === 'Ativa').length
                    const locacoesSaldo = cliente.locacoes.filter(l => l.saldoDevedor > 0).length
                    const saldoTotal = cliente.locacoes.reduce((sum, l) => sum + l.saldoDevedor, 0)

                    return (
                      <div
                        key={cliente.clienteId}
                        className={`rounded-xl border-2 overflow-hidden transition-all ${
                          isExpandido
                            ? 'border-emerald-300 bg-emerald-50/30'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Header do Cliente */}
                        <button
                          type="button"
                          onClick={() => setClienteExpandido(isExpandido ? null : cliente.clienteId)}
                          className="w-full p-4 flex items-center gap-3 text-left"
                        >
                          {isExpandido ? (
                            <ChevronDown className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                          )}
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                            {cliente.clienteNome?.charAt(0)?.toUpperCase() ?? '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{cliente.clienteNome}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-xs text-emerald-600 font-medium">
                                {locacoesAtivas} ativa{locacoesAtivas !== 1 ? 's' : ''}
                              </span>
                              {saldoTotal > 0 && (
                                <span className="text-xs text-red-600 font-medium flex items-center gap-0.5">
                                  <AlertCircle className="w-3 h-3" />
                                  Deve {formatarMoeda(saldoTotal)}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-slate-400 flex-shrink-0">
                            {cliente.locacoes.length} locação{cliente.locacoes.length !== 1 ? 'ões' : ''}
                          </span>
                        </button>

                        {/* Locações do Cliente */}
                        {isExpandido && (
                          <div className="px-4 pb-4 space-y-2">
                            {cliente.locacoes.map(loc => {
                              const isSelected = locacaoSelecionada?.id === loc.id
                              const stConfig = statusLocacaoConfig[loc.status] || statusLocacaoConfig['Ativa']

                              return (
                                <button
                                  key={loc.id}
                                  type="button"
                                  onClick={() => handleSelectLocacao(loc)}
                                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                                    isSelected
                                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                      loc.status === 'Ativa' ? 'bg-emerald-100' : 'bg-amber-100'
                                    }`}>
                                      <Package className={`w-4 h-4 ${
                                        loc.status === 'Ativa' ? 'text-emerald-600' : 'text-amber-600'
                                      }`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono font-semibold text-slate-900">
                                          {loc.produtoTipo} N° {loc.produtoIdentificador}
                                        </span>
                                        <span className={`text-xs px-1.5 py-0.5 rounded border ${stConfig.bg} ${stConfig.text}`}>
                                          {stConfig.label}
                                        </span>
                                        {isSelected && (
                                          <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3 mt-0.5">
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                          <Hash className="w-3 h-3" />
                                          Relógio: {loc.numeroRelogio}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                          {formatarMoeda(loc.precoFicha)}/ficha
                                        </span>
                                        {loc.saldoDevedor > 0 && (
                                          <span className="text-xs text-red-600 font-medium flex items-center gap-0.5">
                                            <AlertCircle className="w-3 h-3" />
                                            Deve {formatarMoeda(loc.saldoDevedor)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ================================================================ */}
        {/* ETAPA 3: Dados da Cobrança                                      */}
        {/* ================================================================ */}
        {locacaoSelecionada && (
          <>
            {/* Info da locação selecionada */}
            <div id="secao-relogio" className="bg-blue-50 rounded-xl border border-blue-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900">
                  Locação selecionada: {locacaoSelecionada.produtoTipo} N° {locacaoSelecionada.produtoIdentificador}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded border ${
                  locacaoSelecionada.status === 'Ativa'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}>
                  {locacaoSelecionada.status}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="text-xs text-slate-500">Cliente</span>
                    <p className="text-sm font-medium text-slate-900 truncate">{locacaoSelecionada.cliente?.nomeExibicao ?? locacaoSelecionada.clienteNome}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-blue-600" />
                  <div>
                    <span className="text-xs text-slate-500">Relógio</span>
                    <p className="text-sm font-mono font-bold text-slate-900">{locacaoSelecionada.numeroRelogio}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                  <div>
                    <span className="text-xs text-slate-500">Preço Ficha</span>
                    <p className="text-sm font-medium text-slate-900">{formatarMoeda(locacaoSelecionada.precoFicha)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-rose-600">%</span>
                  <div>
                    <span className="text-xs text-slate-500">% Empresa</span>
                    <p className="text-sm font-medium text-slate-900">{locacaoSelecionada.percentualEmpresa}%</p>
                  </div>
                </div>
                {locacaoSelecionada.saldoDevedor > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <div>
                      <span className="text-xs text-slate-500">Saldo Devedor</span>
                      <p className="text-sm font-bold text-red-600">{formatarMoeda(locacaoSelecionada.saldoDevedor)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

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
                      value={parseFloat(locacaoSelecionada.numeroRelogio) || 0}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 font-mono text-lg cursor-not-allowed"
                      readOnly
                    />
                    <p className="text-xs text-slate-400 mt-1">Relógio atual do produto/locação</p>
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
                      min={parseFloat(locacaoSelecionada.numeroRelogio) || 0}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all font-mono text-lg"
                      placeholder="Ex: 9100"
                      required
                    />
                    {formData.relogioAtual && (parseFloat(formData.relogioAtual) || 0) < (parseFloat(locacaoSelecionada.numeroRelogio) || 0) && (
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
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <span className="text-xs text-slate-500">Fichas Rodadas</span>
                    <p className="text-xl font-bold text-slate-900 mt-1">{calculos.fichasRodadas.toFixed(0)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <span className="text-xs text-slate-500">Total Bruto</span>
                    <p className="text-xl font-bold text-slate-900 mt-1">{formatarMoeda(calculos.totalBruto)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <span className="text-xs text-slate-500">Subtotal (após partidas)</span>
                    <p className="text-xl font-bold text-slate-900 mt-1">{formatarMoeda(calculos.subtotalAposDescontos)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <span className="text-xs text-slate-500">% Empresa</span>
                    <p className="text-xl font-bold text-blue-700 mt-1">-{formatarMoeda(calculos.valorPercentual)}</p>
                  </div>
                  {(parseFloat(formData.descontoDinheiro) || 0) > 0 && (
                    <div className="bg-white rounded-lg p-3 border border-amber-100">
                      <span className="text-xs text-slate-500">Desc. Dinheiro (líquido)</span>
                      <p className="text-xl font-bold text-amber-600 mt-1">-{formatarMoeda(parseFloat(formData.descontoDinheiro) || 0)}</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium text-blue-900">Total Cliente Paga:</span>
                    <span className="text-3xl font-bold text-emerald-700">{formatarMoeda(calculos.totalClientePaga)}</span>
                  </div>
                  {saldoAnterior > 0 && (
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-medium text-orange-700">+ Saldo Devedor Anterior:</span>
                      <span className="text-xl font-bold text-orange-600">{formatarMoeda(saldoAnterior)}</span>
                    </div>
                  )}
                  {saldoAnterior > 0 && (
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-orange-200">
                      <span className="text-lg font-semibold text-red-900">Total a Receber (com saldo):</span>
                      <span className="text-3xl font-bold text-red-700">{formatarMoeda(calculos.totalComSaldoAnterior)}</span>
                    </div>
                  )}
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
                      (calculos.totalComSaldoAnterior - (parseFloat(formData.valorRecebido) || 0)) > 0
                        ? 'text-red-600'
                        : 'text-emerald-600'
                    }`}>
                      {formatarMoeda(Math.max(0, calculos.totalComSaldoAnterior - (parseFloat(formData.valorRecebido) || 0)))}
                    </div>
                    {saldoAnterior > 0 && (
                      <p className="text-xs text-orange-600 mt-1">Inclui saldo anterior de {formatarMoeda(saldoAnterior)}</p>
                    )}
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
