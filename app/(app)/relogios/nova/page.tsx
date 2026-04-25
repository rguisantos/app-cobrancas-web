'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  Loader2,
  Package,
  Search,
  Hash,
  AlertCircle,
} from 'lucide-react'
import Header from '@/components/layout/header'

interface Produto {
  id: string
  identificador: string
  tipoNome: string
  descricaoNome: string
  numeroRelogio: string
  statusProduto: string
}

export default function NovaAlteracaoRelogioPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const produtoIdPreSelect = searchParams.get('produtoId')

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [buscaProduto, setBuscaProduto] = useState('')
  const [showProdutoList, setShowProdutoList] = useState(false)

  const [formData, setFormData] = useState({
    produtoId: produtoIdPreSelect || '',
    relogioNovo: '',
    motivo: '',
  })

  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)

  useEffect(() => {
    fetch('/api/produtos?limit=1000')
      .then(res => res.json())
      .then(data => {
        const prods = data.data || data
        setProdutos(prods)
        // If pre-selected, find and set it
        if (produtoIdPreSelect) {
          const found = prods.find((p: Produto) => p.id === produtoIdPreSelect)
          if (found) {
            setProdutoSelecionado(found)
          }
        }
        setLoadingData(false)
      })
      .catch(console.error)
  }, [produtoIdPreSelect])

  const produtosFiltrados = buscaProduto.trim()
    ? produtos.filter(p =>
        p.identificador.toLowerCase().includes(buscaProduto.toLowerCase()) ||
        p.tipoNome.toLowerCase().includes(buscaProduto.toLowerCase()) ||
        p.numeroRelogio.includes(buscaProduto)
      )
    : produtos

  const handleSelectProduto = useCallback((produto: Produto) => {
    setFormData(prev => ({ ...prev, produtoId: produto.id }))
    setProdutoSelecionado(produto)
    setBuscaProduto('')
    setShowProdutoList(false)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.produtoId) {
      alert('Selecione um produto')
      return
    }

    if (!formData.relogioNovo.trim()) {
      alert('Informe o novo número do relógio')
      return
    }

    if (!formData.motivo.trim()) {
      alert('Informe o motivo da alteração')
      return
    }

    if (produtoSelecionado && formData.relogioNovo === produtoSelecionado.numeroRelogio) {
      alert('O novo número do relógio é igual ao atual')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/historico-relogio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produtoId: formData.produtoId,
          relogioNovo: formData.relogioNovo,
          motivo: formData.motivo,
        }),
      })

      if (res.ok) {
        router.push('/relogios')
      } else {
        const error = await res.json()
        alert(error.error || 'Erro ao registrar alteração')
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao registrar alteração')
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
        title="Alterar Relógio"
        subtitle="Registrar alteração no número do relógio"
        actions={
          <Link href="/relogios" className="btn-secondary">
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
            {/* Produto Search/Select */}
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Buscar Produto <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="Buscar por número, tipo ou relógio..."
                  value={buscaProduto}
                  onChange={e => {
                    setBuscaProduto(e.target.value)
                    setShowProdutoList(true)
                  }}
                  onFocus={() => setShowProdutoList(true)}
                />
              </div>

              {/* Dropdown de produtos */}
              {showProdutoList && buscaProduto && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                  {produtosFiltrados.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">
                      Nenhum produto encontrado
                    </div>
                  ) : (
                    produtosFiltrados.slice(0, 20).map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2 border-b border-slate-50 last:border-0"
                        onClick={() => handleSelectProduto(p)}
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            {p.tipoNome} N° {p.identificador}
                          </p>
                          <p className="text-xs text-slate-500">{p.descricaoNome}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-slate-400">Relógio atual</p>
                          <p className="font-mono text-sm font-bold text-slate-700">{p.numeroRelogio}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Produto selecionado */}
            {produtoSelecionado && (
              <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      {produtoSelecionado.tipoNome} N° {produtoSelecionado.identificador}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      {produtoSelecionado.descricaoNome} • {produtoSelecionado.statusProduto}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-blue-600">Relógio Atual</p>
                    <p className="text-2xl font-mono font-bold text-blue-900">
                      {produtoSelecionado.numeroRelogio}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {produtoSelecionado && (
              <button
                type="button"
                className="mt-2 text-xs text-slate-500 hover:text-red-500 transition-colors"
                onClick={() => {
                  setProdutoSelecionado(null)
                  setFormData(prev => ({ ...prev, produtoId: '' }))
                }}
              >
                Limpar seleção
              </button>
            )}
          </div>
        </section>

        {/* Novo Relógio e Motivo */}
        {produtoSelecionado && (
          <>
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Hash className="w-5 h-5 text-emerald-600" />
                  Novo Relógio
                </h2>
              </div>
              <div className="p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Relógio anterior */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Relógio Anterior
                    </label>
                    <input
                      value={produtoSelecionado.numeroRelogio}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-mono"
                      disabled
                    />
                    <p className="text-xs text-slate-400 mt-1">Preenchido automaticamente</p>
                  </div>

                  {/* Novo relógio */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Novo Relógio <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="relogioNovo"
                      value={formData.relogioNovo}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-mono text-lg font-bold"
                      placeholder="Digite o novo número"
                      required
                    />
                  </div>
                </div>

                {/* Comparação visual */}
                {formData.relogioNovo && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-center">
                        <p className="text-xs text-slate-400 mb-1">Anterior</p>
                        <p className="text-2xl font-mono font-bold text-slate-500">
                          {produtoSelecionado.numeroRelogio}
                        </p>
                      </div>
                      <div className="text-slate-300">→</div>
                      <div className="text-center">
                        <p className="text-xs text-slate-400 mb-1">Novo</p>
                        <p className="text-2xl font-mono font-bold text-emerald-600">
                          {formData.relogioNovo}
                        </p>
                      </div>
                      {(() => {
                        const ant = parseFloat(produtoSelecionado.numeroRelogio)
                        const nov = parseFloat(formData.relogioNovo)
                        if (!isNaN(ant) && !isNaN(nov)) {
                          const diff = nov - ant
                          return (
                            <div className="ml-4">
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                                diff < 0
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : diff > 0
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-slate-100 text-slate-600'
                              }`}>
                                {diff < 0 ? '' : diff > 0 ? '+' : ''}{diff.toLocaleString('pt-BR')}
                              </span>
                            </div>
                          )
                        }
                        return null
                      })()}
                    </div>
                  </div>
                )}

                {/* Aviso se número for igual */}
                {formData.relogioNovo === produtoSelecionado.numeroRelogio && formData.relogioNovo && (
                  <div className="mt-3 flex items-center gap-2 text-amber-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    O novo número é igual ao atual
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  Motivo
                </h2>
              </div>
              <div className="p-4 md:p-6">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Motivo da Alteração <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="motivo"
                  value={formData.motivo}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 outline-none transition-all resize-none"
                  placeholder="Descreva o motivo da alteração do relógio (ex: troca de equipamento, manutenção, reset...)"
                  required
                />
              </div>
            </section>
          </>
        )}

        {/* Botões de Ação - Sticky em Mobile */}
        <div className="fixed bottom-0 left-0 right-0 lg:static lg:mt-0 bg-white border-t border-slate-200 p-4 lg:bg-transparent lg:border-0 lg:p-0 z-10">
          <div className="max-w-7xl mx-auto flex gap-3">
            <button
              type="submit"
              disabled={loading || !formData.produtoId || !formData.relogioNovo || !formData.motivo}
              className="flex-1 lg:flex-none btn-primary justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Registrar Alteração
                </>
              )}
            </button>
            <Link href="/relogios" className="btn-secondary hidden lg:inline-flex">
              Cancelar
            </Link>
          </div>
        </div>
      </form>
    </div>
  )
}
