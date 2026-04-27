'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, MapPin } from 'lucide-react'
import Header from '@/components/layout/header'
import { useToast } from '@/components/ui/toaster'

const CORES_PREDEFINIDAS = [
  { nome: 'Azul', valor: '#2563EB' },
  { nome: 'Verde', valor: '#16A34A' },
  { nome: 'Roxo', valor: '#7C3AED' },
  { nome: 'Vermelho', valor: '#DC2626' },
  { nome: 'Laranja', valor: '#EA580C' },
  { nome: 'Rosa', valor: '#DB2777' },
  { nome: 'Ciano', valor: '#0891B2' },
  { nome: 'Amarelo', valor: '#CA8A04' },
]

export default function NovaRotaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { error: toastError, success: toastSuccess } = useToast()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    descricao: '',
    status: 'Ativo',
    cor: '#2563EB',
    regiao: '',
    ordem: 0,
    observacao: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'ordem' ? parseInt(value) || 0 : value,
    }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validação client-side
    const newErrors: Record<string, string> = {}
    if (!formData.descricao.trim()) {
      newErrors.descricao = 'Descrição é obrigatória'
    } else if (formData.descricao.length > 100) {
      newErrors.descricao = 'Descrição deve ter no máximo 100 caracteres'
    }
    if (formData.regiao && formData.regiao.length > 100) {
      newErrors.regiao = 'Região deve ter no máximo 100 caracteres'
    }
    if (formData.observacao && formData.observacao.length > 500) {
      newErrors.observacao = 'Observação deve ter no máximo 500 caracteres'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/rotas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        toastSuccess('Rota criada com sucesso')
        router.push('/admin/rotas')
      } else {
        const errorData = await res.json()
        if (errorData.error?.includes('descrição') || errorData.error?.includes('descrição')) {
          setErrors({ descricao: errorData.error })
        } else {
          toastError(errorData.error || 'Erro ao salvar rota')
        }
      }
    } catch (err) {
      console.error(err)
      toastError('Erro ao salvar rota')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Header
        title="Nova Rota"
        subtitle="Cadastrar uma nova rota de cobrança"
        actions={
          <Link href="/admin/rotas" className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="max-w-2xl">
        {/* Informações Básicas */}
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Informações Básicas</h2>
              <p className="text-sm text-slate-500">Dados de identificação da rota</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Descrição <span className="text-red-500">*</span>
              </label>
              <input
                name="descricao"
                value={formData.descricao}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all ${
                  errors.descricao
                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                }`}
                placeholder="Ex: Linha Aquidauana"
                maxLength={100}
              />
              {errors.descricao && (
                <p className="text-red-500 text-xs mt-1">{errors.descricao}</p>
              )}
              <p className="text-xs text-slate-400 mt-1">{formData.descricao.length}/100 caracteres</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Região</label>
                <input
                  name="regiao"
                  value={formData.regiao}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all ${
                    errors.regiao
                      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                  placeholder="Ex: Zona Norte"
                  maxLength={100}
                />
                {errors.regiao && (
                  <p className="text-red-500 text-xs mt-1">{errors.regiao}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Ordem de Cobrança</label>
              <input
                type="number"
                name="ordem"
                value={formData.ordem}
                onChange={handleChange}
                min={0}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                placeholder="0 = sem ordem específica"
              />
              <p className="text-xs text-slate-400 mt-1">Rotas com ordem menor são visitadas primeiro</p>
            </div>
          </div>
        </div>

        {/* Identificação Visual */}
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">Identificação Visual</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Cor da Rota</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {CORES_PREDEFINIDAS.map(cor => (
                  <button
                    key={cor.valor}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, cor: cor.valor }))}
                    className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                      formData.cor === cor.valor ? 'border-slate-900 ring-2 ring-slate-300 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: cor.valor }}
                    title={cor.nome}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <input
                  name="cor"
                  type="color"
                  value={formData.cor}
                  onChange={handleChange}
                  className="w-10 h-10 rounded cursor-pointer border border-slate-200"
                />
                <input
                  type="text"
                  value={formData.cor}
                  onChange={(e) => setFormData(prev => ({ ...prev, cor: e.target.value }))}
                  className="w-32 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
                  placeholder="#2563EB"
                  maxLength={7}
                />
                <div
                  className="w-8 h-8 rounded-lg border border-slate-200"
                  style={{ backgroundColor: formData.cor }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Observações */}
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">Observações</h2>
          <textarea
            name="observacao"
            value={formData.observacao}
            onChange={handleChange}
            rows={3}
            className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all resize-none ${
              errors.observacao
                ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
            }`}
            placeholder="Anotações operacionais sobre a rota..."
            maxLength={500}
          />
          {errors.observacao && (
            <p className="text-red-500 text-xs mt-1">{errors.observacao}</p>
          )}
          <p className="text-xs text-slate-400 mt-1">{formData.observacao.length}/500 caracteres</p>
        </div>

        {/* Ações */}
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Rota
              </>
            )}
          </button>
          <Link href="/admin/rotas" className="btn-secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
