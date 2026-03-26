'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import Header from '@/components/layout/header'

export default function NovaRotaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    descricao: '',
    status: 'Ativo'
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/rotas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        router.push('/admin/rotas')
      } else {
        const error = await res.json()
        alert(error.error || 'Erro ao salvar rota')
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao salvar rota')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Header
        title="Nova Rota"
        subtitle="Cadastrar uma nova rota"
        actions={
          <Link href="/admin/rotas" className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="max-w-xl">
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">🗺️ Dados da Rota</h2>
          
          <div className="space-y-4">
            <div>
              <label className="label">Descrição *</label>
              <input
                name="descricao"
                value={formData.descricao}
                onChange={handleChange}
                className="input"
                placeholder="Ex: Linha Aquidauana"
                required
              />
            </div>
            <div>
              <label className="label">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="input"
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
                <span className="animate-spin">⏳</span>
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
