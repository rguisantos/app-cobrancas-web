'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  Loader2,
  Wrench,
  Scissors,
  Package,
  Calendar,
  User,
  Search,
  Info,
} from 'lucide-react'
import Header from '@/components/layout/header'
import { useToast } from '@/components/ui/toaster'

interface Produto {
  id: string
  identificador: string
  tipoNome: string
  descricaoNome: string
  tamanhoNome: string
  statusProduto: string
  locacoes?: {
    id: string
    clienteId: string
    clienteNome: string
    status: string
  }[]
}

export default function NovaManutencaoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const produtoIdPreSelect = searchParams.get('produtoId')
  const { warning, error } = useToast()

  const [loading, setLoading] = useState(false)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [produtosFiltrados, setProdutosFiltrados] = useState<Produto[]>([])
  const [buscaProduto, setBuscaProduto] = useState('')
  const [mostrarBusca, setMostrarBusca] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [locacaoAtiva, setLocacaoAtiva] = useState<{ id: string; clienteId: string; clienteNome: string } | null>(null)

  const [formData, setFormData] = useState({
    produtoId: produtoIdPreSelect || '',
    tipo: 'manutencao' as 'trocaPano' | 'manutencao',
    descricao: '',
    data: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    fetch('/api/produtos?limit=1000')
      .then(res => res.json())
      .then(data => {
        const produtosData = data.data || data
        setProdutos(produtosData)
        setProdutosFiltrados(produtosData)
        if (produtoIdPreSelect) {
          const prod = produtosData.find((p: Produto) => p.id === produtoIdPreSelect)
          if (prod) selecionarProduto(prod)
        }
      })
      .catch(console.error)
  }, [produtoIdPreSelect])

  useEffect(() => {
    if (!buscaProduto.trim()) {
      setProdutosFiltrados(produtos)
      return
    }
    const termo = buscaProduto.toLowerCase()
    const filtrados = produtos.filter(p =>
      p.identificador.toLowerCase().includes(termo) ||
      p.tipoNome.toLowerCase().includes(termo) ||
      p.descricaoNome.toLowerCase().includes(termo)
    )
    setProdutosFiltrados(filtrados)
  }, [buscaProduto, produtos])

  const selecionarProduto = async (produto: Produto) => {
    setProdutoSelecionado(produto)
    setFormData(prev => ({ ...prev, produtoId: produto.id }))
    setMostrarBusca(false)
    setBuscaProduto('')

    // Buscar locação ativa do produto
    try {
      const res = await fetch(`/api/locacoes?produtoId=${produto.id}&status=Ativa&limit=1`)
      const data = await res.json()
      const locacoes = data.data || data
      if (locacoes.length > 0) {
        setLocacaoAtiva({
          id: locacoes[0].id,
          clienteId: locacoes[0].clienteId,
          clienteNome: locacoes[0].clienteNome,
        })
      } else {
        setLocacaoAtiva(null)
      }
    } catch {
      setLocacaoAtiva(null)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!produtoSelecionado) {
      warning('Selecione um produto')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/manutencoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produtoId: formData.produtoId,
          produtoIdentificador: produtoSelecionado.identificador,
          produtoTipo: produtoSelecionado.tipoNome,
          clienteId: locacaoAtiva?.clienteId || null,
          clienteNome: locacaoAtiva?.clienteNome || null,
          locacaoId: locacaoAtiva?.id || null,
          tipo: formData.tipo,
          descricao: formData.descricao || null,
          data: formData.data,
        }),
      })

      if (res.ok) {
        router.push('/manutencoes')
      } else {
        const errorData = await res.json()
        error(errorData.error || 'Erro ao registrar manutenção')
      }
    } catch (err) {
      console.error(err)
      error('Erro ao registrar manutenção')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pb-24 lg:pb-8">
      <Header
        title="Nova Manutenção"
        subtitle="Registrar uma nova manutenção ou troca de pano"
        actions={
          <Link href="/manutencoes" className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selecionar Produto */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Selecionar Produto
            </h2>
          </div>
          <div className="p-4 md:p-6">
            {!produtoSelecionado ? (
              <div>
                <button
                  type="button"
                  onClick={() => setMostrarBusca(!mostrarBusca)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-slate-300 text-slate-500 hover:border-primary-400 hover:text-primary-600 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Buscar produto...
                </button>

                {mostrarBusca && (
                  <div className="mt-4 space-y-3">
                    <input
                      type="text"
                      value={buscaProduto}
                      onChange={(e) => setBuscaProduto(e.target.value)}
                      className="input text-sm"
                      placeholder="Buscar por número, tipo ou descrição..."
                      autoFocus
                    />
                    <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                      {produtosFiltrados.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-500">
                          Nenhum produto encontrado
                        </div>
                      ) : (
                        produtosFiltrados.slice(0, 50).map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => selecionarProduto(p)}
                            className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-sm text-slate-700">
                                {p.identificador}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900 text-sm">{p.tipoNome}</p>
                                <p className="text-xs text-slate-500">{p.descricaoNome} - {p.tamanhoNome}</p>
                              </div>
                            </div>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                              p.statusProduto === 'Ativo' ? 'bg-emerald-100 text-emerald-700' :
                              p.statusProduto === 'Manutenção' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {p.statusProduto}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                    {produtoSelecionado.identificador}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{produtoSelecionado.tipoNome}</p>
                    <p className="text-sm text-slate-500">{produtoSelecionado.descricaoNome} - {produtoSelecionado.tamanhoNome}</p>
                    <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      produtoSelecionado.statusProduto === 'Ativo' ? 'bg-emerald-100 text-emerald-700' :
                      produtoSelecionado.statusProduto === 'Manutenção' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {produtoSelecionado.statusProduto}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProdutoSelecionado(null)
                      setLocacaoAtiva(null)
                      setFormData(prev => ({ ...prev, produtoId: '' }))
                    }}
                    className="text-sm text-slate-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
                  >
                    Trocar
                  </button>
                </div>

                {locacaoAtiva && (
                  <div className="mt-3 flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <User className="w-4 h-4 text-purple-500" />
                    <span className="text-sm text-purple-700">
                      Locado para: <strong>{locacaoAtiva.clienteNome}</strong>
                    </span>
                  </div>
                )}

                {formData.tipo === 'manutencao' && produtoSelecionado.statusProduto === 'Ativo' && (
                  <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-amber-700">
                      O status do produto será alterado para <strong>Manutenção</strong> ao registrar.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {produtoSelecionado && (
          <>
            {/* Tipo e Data */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-orange-600" />
                  Detalhes da Manutenção
                </h2>
              </div>
              <div className="p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Tipo <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="tipo"
                      value={formData.tipo}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all bg-white"
                      required
                    >
                      <option value="manutencao">Manutenção</option>
                      <option value="trocaPano">Troca de Pano</option>
                    </select>
                    <p className="mt-1.5 text-xs text-slate-500">
                      {formData.tipo === 'manutencao'
                        ? 'O produto será marcado como "Manutenção" e a data será registrada.'
                        : 'A data da troca de pano será registrada no produto.'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Data <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        name="data"
                        value={formData.data}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Descrição */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  {formData.tipo === 'manutencao' ? (
                    <Wrench className="w-5 h-5 text-orange-600" />
                  ) : (
                    <Scissors className="w-5 h-5 text-amber-600" />
                  )}
                  Descrição
                </h2>
              </div>
              <div className="p-4 md:p-6">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Descrição da {formData.tipo === 'manutencao' ? 'manutenção' : 'troca de pano'}
                </label>
                <textarea
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 outline-none transition-all resize-none"
                  placeholder={`Descreva a ${formData.tipo === 'manutencao' ? 'manutenção realizada' : 'troca de pano'}...`}
                />
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
                      Registrar {formData.tipo === 'manutencao' ? 'Manutenção' : 'Troca de Pano'}
                    </>
                  )}
                </button>
                <Link href="/manutencoes" className="btn-secondary hidden lg:inline-flex">
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
