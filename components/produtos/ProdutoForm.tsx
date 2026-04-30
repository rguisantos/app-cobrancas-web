'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Hash, Settings, Wrench, FileText, Loader2, Calendar, Tag, Package } from 'lucide-react'
import Header from '@/components/layout/header'
import { useToast } from '@/components/ui/toaster'

// ============================================================================
// TIPOS
// ============================================================================

interface AtributoOpcao {
  id: string
  nome: string
}

interface ProdutoFormData {
  identificador: string
  numeroRelogio: string
  tipoId: string
  tipoNome: string
  descricaoId: string
  descricaoNome: string
  tamanhoId: string
  tamanhoNome: string
  codigoCH: string
  codigoABLF: string
  conservacao: string
  statusProduto: string
  dataFabricacao: string
  dataUltimaManutencao: string
  relatorioUltimaManutencao: string
  dataAvaliacao: string
  aprovacao: string
  estabelecimento: string
  observacao: string
}

interface ProdutoFormProps {
  mode: 'criar' | 'editar'
  produtoId?: string
  initialData?: Partial<ProdutoFormData>
}

// ============================================================================
// CONSTANTES
// ============================================================================

const CONSERVACAO_OPTIONS = [
  { value: 'Ótima', label: 'Ótima' },
  { value: 'Boa', label: 'Boa' },
  { value: 'Regular', label: 'Regular' },
  { value: 'Ruim', label: 'Ruim' },
  { value: 'Péssima', label: 'Péssima' },
]

const STATUS_OPTIONS = [
  { value: 'Ativo', label: 'Ativo' },
  { value: 'Inativo', label: 'Inativo' },
  { value: 'Manutenção', label: 'Manutenção' },
]

const EMPTY_FORM: ProdutoFormData = {
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
  observacao: '',
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function ProdutoForm({ mode, produtoId, initialData }: ProdutoFormProps) {
  const router = useRouter()
  const { error: toastError } = useToast()

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(mode === 'editar')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tipos, setTipos] = useState<AtributoOpcao[]>([])
  const [descricoes, setDescricoes] = useState<AtributoOpcao[]>([])
  const [tamanhos, setTamanhos] = useState<AtributoOpcao[]>([])
  const [estabelecimentos, setEstabelecimentos] = useState<AtributoOpcao[]>([])
  const [formData, setFormData] = useState<ProdutoFormData>(
    initialData ? { ...EMPTY_FORM, ...initialData } : EMPTY_FORM
  )

  // Carregar dados do produto (modo editar) e atributos
  useEffect(() => {
    const promises: Promise<unknown>[] = [
      fetch('/api/tipos-produto').then(res => res.json()).then(setTipos),
      fetch('/api/descricoes-produto').then(res => res.json()).then(setDescricoes),
      fetch('/api/tamanhos-produto').then(res => res.json()).then(setTamanhos),
      fetch('/api/estabelecimentos?limit=100').then(res => res.json()).then((data: any) => {
        const list = Array.isArray(data) ? data : (data?.data && Array.isArray(data.data) ? data.data : [])
        setEstabelecimentos(list.map((e: any) => ({ id: e.id, nome: e.nome })))
      }),
    ]

    if (mode === 'editar' && produtoId) {
      promises.push(
        fetch(`/api/produtos/${produtoId}`)
          .then(res => res.json())
          .then((produtoData: Record<string, unknown>) => {
            setFormData({
              identificador: (produtoData.identificador as string) || '',
              numeroRelogio: (produtoData.numeroRelogio as string) || '',
              tipoId: (produtoData.tipoId as string) || '',
              tipoNome: (produtoData.tipoNome as string) || '',
              descricaoId: (produtoData.descricaoId as string) || '',
              descricaoNome: (produtoData.descricaoNome as string) || '',
              tamanhoId: (produtoData.tamanhoId as string) || '',
              tamanhoNome: (produtoData.tamanhoNome as string) || '',
              codigoCH: (produtoData.codigoCH as string) || '',
              codigoABLF: (produtoData.codigoABLF as string) || '',
              conservacao: (produtoData.conservacao as string) || 'Boa',
              statusProduto: (produtoData.statusProduto as string) || 'Ativo',
              dataFabricacao: (produtoData.dataFabricacao as string) || '',
              dataUltimaManutencao: (produtoData.dataUltimaManutencao as string) || '',
              relatorioUltimaManutencao: (produtoData.relatorioUltimaManutencao as string) || '',
              dataAvaliacao: (produtoData.dataAvaliacao as string) || '',
              aprovacao: (produtoData.aprovacao as string) || '',
              estabelecimento: (produtoData.estabelecimento as string) || '',
              observacao: (produtoData.observacao as string) || '',
            })
          })
      )
    }

    Promise.all(promises)
      .then(() => setLoadingData(false))
      .catch(() => setLoadingData(false))
  }, [mode, produtoId])

  // Handler de mudança de campo com auto-preenchimento de nomes de atributos
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    setFormData(prev => {
      const next = { ...prev, [name]: value }

      // Auto-preencher nome ao selecionar atributo
      if (name === 'tipoId') {
        const selected = tipos.find(t => t.id === value)
        next.tipoNome = selected?.nome || ''
      } else if (name === 'descricaoId') {
        const selected = descricoes.find(d => d.id === value)
        next.descricaoNome = selected?.nome || ''
      } else if (name === 'tamanhoId') {
        const selected = tamanhos.find(t => t.id === value)
        next.tamanhoNome = selected?.nome || ''
      }

      return next
    })

    setErrors(prev => ({ ...prev, [name]: '' }))
  }, [tipos, descricoes, tamanhos])

  // Validação do formulário
  const validate = useCallback((): Record<string, string> => {
    const newErrors: Record<string, string> = {}
    if (!formData.identificador?.trim()) {
      newErrors.identificador = 'Identificador é obrigatório'
    }
    if (!formData.numeroRelogio?.trim()) {
      newErrors.numeroRelogio = 'Número do relógio é obrigatório'
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
    return newErrors
  }, [formData])

  // Submit do formulário
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setLoading(true)

    try {
      const url = mode === 'criar' ? '/api/produtos' : `/api/produtos/${produtoId}`
      const method = mode === 'criar' ? 'POST' : 'PUT'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        router.push('/produtos')
        router.refresh()
      } else {
        const errorData = await res.json()
        toastError(errorData.error || `Erro ao ${mode === 'criar' ? 'salvar' : 'atualizar'} produto`)
      }
    } catch {
      toastError(`Erro ao ${mode === 'criar' ? 'salvar' : 'atualizar'} produto`)
    } finally {
      setLoading(false)
    }
  }, [mode, produtoId, formData, validate, router, toastError])

  // Loading state
  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-slate-500">Carregando dados do produto...</p>
        </div>
      </div>
    )
  }

  const isEditar = mode === 'editar'
  const title = isEditar ? 'Editar Produto' : 'Novo Produto'
  const subtitle = isEditar && formData.tipoNome
    ? `${formData.tipoNome} N° ${formData.identificador}`
    : 'Cadastrar um novo produto no sistema'
  const saveLabel = isEditar ? 'Salvar Alterações' : 'Salvar Produto'

  return (
    <div className="pb-24 lg:pb-8">
      <Header
        title={title}
        subtitle={subtitle}
        actions={
          <Link href="/produtos" className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identificação */}
        <FormSection icon={<Hash className="w-5 h-5 text-blue-600" />} title="Identificação">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Número/Identificador"
              required
              error={errors.identificador}
            >
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  name="identificador"
                  value={formData.identificador}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg border outline-none transition-all ${
                    isEditar
                      ? 'border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed'
                      : errors.identificador
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                  placeholder="Ex: 515"
                  required
                  readOnly={isEditar}
                />
              </div>
              {isEditar && <p className="text-xs text-slate-400 mt-1">O identificador não pode ser alterado</p>}
            </FormField>

            <FormField
              label="Número do Relógio"
              required
              error={errors.numeroRelogio}
            >
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  name="numeroRelogio"
                  value={formData.numeroRelogio}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg border outline-none transition-all ${
                    errors.numeroRelogio
                      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                  placeholder="Ex: 8070"
                  required
                />
              </div>
            </FormField>

            <FormField label="Código CH">
              <input
                name="codigoCH"
                value={formData.codigoCH}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                placeholder="Código interno CH"
              />
            </FormField>

            <FormField label="Código ABLF">
              <input
                name="codigoABLF"
                value={formData.codigoABLF}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                placeholder="Código interno ABLF"
              />
            </FormField>
          </div>
        </FormSection>

        {/* Características */}
        <FormSection icon={<Settings className="w-5 h-5 text-purple-600" />} title="Características">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Tipo" required error={errors.tipoId}>
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
            </FormField>

            <FormField label="Descrição" required error={errors.descricaoId}>
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
            </FormField>

            <FormField label="Tamanho" required error={errors.tamanhoId}>
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
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <FormField label="Conservação">
              <select
                name="conservacao"
                value={formData.conservacao}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all bg-white"
              >
                {CONSERVACAO_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Status">
              <select
                name="statusProduto"
                value={formData.statusProduto}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all bg-white"
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </FormField>
          </div>
        </FormSection>

        {/* Manutenção */}
        <FormSection icon={<Wrench className="w-5 h-5 text-amber-600" />} title="Manutenção">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Data de Fabricação">
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
            </FormField>

            <FormField label="Data da Última Manutenção">
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
            </FormField>
          </div>

          <div className="mt-4">
            <FormField label="Relatório da Última Manutenção">
              <textarea
                name="relatorioUltimaManutencao"
                value={formData.relatorioUltimaManutencao}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all resize-none"
                placeholder="Descreva a manutenção realizada..."
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <FormField label="Data de Avaliação">
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
            </FormField>

            <FormField label="Aprovação">
              <input
                name="aprovacao"
                value={formData.aprovacao}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                placeholder="Status de aprovação"
              />
            </FormField>
          </div>

          <div className="mt-4">
            <FormField label="Estabelecimento">
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  name="estabelecimento"
                  value={formData.estabelecimento}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all bg-white appearance-none"
                >
                  <option value="">Selecione o estabelecimento</option>
                  {estabelecimentos.map(e => (
                    <option key={e.id} value={e.nome}>{e.nome}</option>
                  ))}
                </select>
              </div>
            </FormField>
          </div>
        </FormSection>

        {/* Observações */}
        <FormSection icon={<FileText className="w-5 h-5 text-slate-600" />} title="Observações">
          <textarea
            name="observacao"
            value={formData.observacao}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 outline-none transition-all resize-none"
            placeholder="Observações sobre o produto..."
          />
        </FormSection>

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
                  {saveLabel}
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

// ============================================================================
// SUB-COMPONENTES
// ============================================================================

function FormSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          {icon}
          {title}
        </h2>
      </div>
      <div className="p-4 md:p-6">
        {children}
      </div>
    </section>
  )
}

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}
