'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import Header from '@/components/layout/header'
import { useToast } from '@/components/ui/toaster'

export default function NovaRotaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { error: toastError, success: toastSuccess } = useToast()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    descricao: '',
    status: 'Ativo'
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/rotas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        toastSuccess('Rota criada com sucesso')
        router.push('/admin/rotas')
      } else {
        const errorData = await res.json()
        // Mapear erros da API para campos
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

      <form onSubmit={handleSubmit} className="max-w-xl">
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">Dados da Rota</h2>
          
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
          </div>
        </div>

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
