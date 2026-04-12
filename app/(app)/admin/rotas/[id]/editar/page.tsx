'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, MapPin, Loader2, Trash2 } from 'lucide-react'
import Header from '@/components/layout/header'

export default function EditarRotaPage() {
  const router = useRouter()
  const params = useParams()
  const rotaId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState({
    descricao: '',
    status: 'Ativo',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch(`/api/rotas/${rotaId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          router.push('/admin/rotas')
          return
        }
        setFormData({
          descricao: data.descricao || '',
          status: data.status || 'Ativo',
        })
      })
      .catch(() => router.push('/admin/rotas'))
      .finally(() => setLoading(false))
  }, [rotaId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.descricao.trim()) {
      setErrors({ descricao: 'Descrição é obrigatória' })
      return
    }

    setSaving(true)
    setErrors({})

    try {
      const res = await fetch(`/api/rotas/${rotaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        router.push(`/admin/rotas/${rotaId}`)
      } else {
        const error = await res.json()
        alert(error.error || 'Erro ao atualizar rota')
      }
    } catch {
      alert('Erro ao atualizar rota')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta rota? Esta ação não pode ser desfeita.')) {
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`/api/rotas/${rotaId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        router.push('/admin/rotas')
      } else {
        const error = await res.json()
        alert(error.error || 'Erro ao excluir rota')
      }
    } catch {
      alert('Erro ao excluir rota')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="pb-24 lg:pb-8">
      <Header
        title="Editar Rota"
        subtitle={formData.descricao}
        actions={
          <Link href={`/admin/rotas/${rotaId}`} className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Informações da Rota</h2>
              <p className="text-sm text-slate-500">Atualize os dados da rota</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Descrição <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.descricao}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, descricao: e.target.value }))
                  setErrors(prev => ({ ...prev, descricao: '' }))
                }}
                className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all ${
                  errors.descricao 
                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                    : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                }`}
                placeholder="Ex: Rota Norte, Zona Sul..."
              />
              {errors.descricao && (
                <p className="text-red-500 text-xs mt-1">{errors.descricao}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
              >
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="fixed bottom-0 left-0 right-0 lg:static lg:mt-0 bg-white border-t border-slate-200 p-4 lg:bg-transparent lg:border-0 lg:p-0 z-10">
          <div className="max-w-7xl mx-auto flex gap-3">
            <button 
              type="submit" 
              disabled={saving} 
              className="flex-1 lg:flex-none btn-primary justify-center"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Alterações
                </>
              )}
            </button>
            <button 
              type="button" 
              onClick={handleDelete}
              disabled={deleting}
              className="btn-secondary text-red-600 hover:bg-red-50 hover:border-red-200"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Excluir</span>
            </button>
            <Link 
              href={`/admin/rotas/${rotaId}`} 
              className="btn-secondary hidden lg:inline-flex"
            >
              Cancelar
            </Link>
          </div>
        </div>
      </form>
    </div>
  )
}
