'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Hash, Settings, Wrench, FileText, Loader2, Calendar, Tag, Package } from 'lucide-react'
import Header from '@/components/layout/header'
import { useToast } from '@/components/ui/toaster'

interface TipoProduto { id: string; nome: string }
interface DescricaoProduto { id: string; nome: string }
interface TamanhoProduto { id: string; nome: string }

export default function NovoProdutoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tipos, setTipos] = useState<TipoProduto[]>([])
  const { error: toastError } = useToast()
  const [descricoes, setDescricoes] = useState<DescricaoProduto[]>([])
  const [tamanhos, setTamanhos] = useState<TamanhoProduto[]>([])
  const [formData, setFormData] = useState({
    identificador: '',
    numeroRelogio: '',
    tipoId: '',
    tipoNome: '',
    descricaoId: '',
    descricaoNome: '',
    tamanhoId: '',
    tamanhoNome: '',
    codigoCH: '',
    codigoABLF: '',
    conservacao: 'Boa',
    statusProduto: 'Ativo',
    dataFabricacao: '',
    dataUltimaManutencao: '',
    relatorioUltimaManutencao: '',
    dataAvaliacao: '',
    aprovacao: '',
    estabelecimento: '',
    observacao: ''
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/tipos-produto').then(res => res.json()),
      fetch('/api/descricoes-produto').then(res => res.json()),
      fetch('/api/tamanhos-produto').then(res => res.json())
    ])
      .then(([tiposData, descricoesData, tamanhosData]) => {
        setTipos(tiposData)
        setDescricoes(descricoesData)
        setTamanhos(tamanhosData)
      })
      .catch(console.error)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    if (name === 'tipoId') {
      const selectedTipo = tipos.find(t => t.id === value)
      setFormData(prev => ({ 
        ...prev, 
        tipoId: value,
        tipoNome: selectedTipo?.nome || ''
      }))
    } else if (name === 'descricaoId') {
      const selectedDescricao = descricoes.find(d => d.id === value)
      setFormData(prev => ({ 
        ...prev, 
        descricaoId: value,
        descricaoNome: selectedDescricao?.nome || ''
      }))
    } else if (name === 'tamanhoId') {
      const selectedTamanho = tamanhos.find(t => t.id === value)
      setFormData(prev => ({ 
        ...prev, 
        tamanhoId: value,
        tamanhoNome: selectedTamanho?.nome || ''
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const newErrors: Record<string, string> = {}
    if (!formData.identificador?.trim()) {
      newErrors.identificador = 'Identificador é obrigatório'
    }
    if (!formData.tipoId) {
      newErrors.tipoId = 'Selecione o tipo do produto'
    }
    if (!formData.descricaoId) {
      newErrors.descricaoId = 'Selecione a descrição do produto'
    }
    if (!formData.tamanhoId) {
      newErrors.tamanhoId = 'Selecione o tamanho do produto'
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        router.push('/produtos')
      } else {
        const errorData = await res.json()
        toastError(errorData.error || 'Erro ao salvar produto')
      }
    } catch (err) {
      console.error(err)
      toastError('Erro ao salvar produto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pb-24 lg:pb-8">
      <Header
        title="Novo Produto"
        subtitle="Cadastrar um novo produto no sistema"
        actions={
          <Link href="/produtos" className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identificação */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Hash className="w-5 h-5 text-blue-600" />
              Identificação
            </h2>
          </div>
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Número/Identificador <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    name="identificador"
                    value={formData.identificador}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border outline-none transition-all ${
                      errors.identificador ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    }`}
                    placeholder="Ex: 515"
                    required
                  />
                </div>
                {errors.identificador && <p className="text-red-500 text-xs mt-1">{errors.identificador}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Número do Relógio <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    name="numeroRelogio"
                    value={formData.numeroRelogio}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    placeholder="Ex: 8070"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Código CH</label>
                <input
                  name="codigoCH"
                  value={formData.codigoCH}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="Código interno CH"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Código ABLF</label>
                <input
                  name="codigoABLF"
                  value={formData.codigoABLF}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="Código interno ABLF"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Características */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-600" />
              Características
            </h2>
          </div>
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tipo <span className="text-red-500">*</span>
                </label>
                <select
                  name="tipoId"
                  value={formData.tipoId}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all bg-white ${
                    errors.tipoId ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                  }`}
                  required
                >
                  <option value="">Selecione o tipo</option>
                  {tipos.map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
                {errors.tipoId && <p className="text-red-500 text-xs mt-1">{errors.tipoId}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Descrição <span className="text-red-500">*</span>
                </label>
                <select
                  name="descricaoId"
                  value={formData.descricaoId}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all bg-white ${
                    errors.descricaoId ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                  }`}
                  required
                >
                  <option value="">Selecione a descrição</option>
                  {descricoes.map(d => (
                    <option key={d.id} value={d.id}>{d.nome}</option>
                  ))}
                </select>
                {errors.descricaoId && <p className="text-red-500 text-xs mt-1">{errors.descricaoId}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tamanho <span className="text-red-500">*</span>
                </label>
                <select
                  name="tamanhoId"
                  value={formData.tamanhoId}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all bg-white ${
                    errors.tamanhoId ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                  }`}
                  required
                >
                  <option value="">Selecione o tamanho</option>
                  {tamanhos.map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
                {errors.tamanhoId && <p className="text-red-500 text-xs mt-1">{errors.tamanhoId}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Conservação</label>
                <select
                  name="conservacao"
                  value={formData.conservacao}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all bg-white"
                >
                  <option value="Ótima">Ótima</option>
                  <option value="Boa">Boa</option>
                  <option value="Regular">Regular</option>
                  <option value="Ruim">Ruim</option>
                  <option value="Péssima">Péssima</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                <select
                  name="statusProduto"
                  value={formData.statusProduto}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all bg-white"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                  <option value="Manutenção">Manutenção</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Manutenção */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-600" />
              Manutenção
            </h2>
          </div>
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Data de Fabricação</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    name="dataFabricacao"
                    value={formData.dataFabricacao}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Data da Última Manutenção</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    name="dataUltimaManutencao"
                    value={formData.dataUltimaManutencao}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Relatório da Última Manutenção</label>
              <textarea
                name="relatorioUltimaManutencao"
                value={formData.relatorioUltimaManutencao}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all resize-none"
                placeholder="Descreva a manutenção realizada..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Data de Avaliação</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    name="dataAvaliacao"
                    value={formData.dataAvaliacao}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Aprovação</label>
                <input
                  name="aprovacao"
                  value={formData.aprovacao}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                  placeholder="Status de aprovação"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Estabelecimento</label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  name="estabelecimento"
                  value={formData.estabelecimento}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                  placeholder="Local onde o produto está (ex: Barracão)"
                />
              </div>
            </div>
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
              placeholder="Observações sobre o produto..."
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
                  Salvar Produto
                </>
              )}
            </button>
            <Link href="/produtos" className="btn-secondary hidden lg:inline-flex">
              Cancelar
            </Link>
          </div>
        </div>
      </form>
    </div>
  )
}
