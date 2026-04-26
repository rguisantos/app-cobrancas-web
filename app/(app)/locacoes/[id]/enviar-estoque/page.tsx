'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, MapPin, Loader2 } from 'lucide-react'
import Header from '@/components/layout/header'
import { useToast } from '@/components/ui/toaster'

interface Locacao {
  id: string
  clienteId: string
  clienteNome: string
  produtoId: string
  produtoIdentificador: string
  produtoTipo: string
}

interface Estabelecimento {
  id: string
  nome: string
}

export default function EnviarEstoquePage() {
  const router = useRouter()
  const params = useParams()
  const locacaoId = params.id as string
  const { success, error } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [locacao, setLocacao] = useState<Locacao | null>(null)
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const [formData, setFormData] = useState({
    estabelecimento: '',
    motivo: '',
    observacao: '',
  })

  // Carregar dados
  useEffect(() => {
    Promise.all([
      fetch(`/api/locacoes/${locacaoId}`).then(res => res.json()),
      fetch('/api/estabelecimentos').then(res => res.json()),
    ])
      .then(([locacaoData, estabelecimentosData]) => {
        setLocacao(locacaoData)
        setEstabelecimentos(estabelecimentosData)
        setLoadingData(false)
      })
      .catch(err => {
        console.error(err)
        setLoadingData(false)
      })
  }, [locacaoId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validações
    const newErrors: Record<string, string> = {}
    if (!formData.estabelecimento) {
      newErrors.estabelecimento = 'Selecione o destino'
    }
    if (!formData.motivo.trim()) {
      newErrors.motivo = 'Informe o motivo'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    
    try {
      const res = await fetch(`/api/locacoes/${locacaoId}/enviar-estoque`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        success(`Produto enviado para ${formData.estabelecimento} com sucesso!`)
        router.push('/produtos')
      } else {
        const errorData = await res.json()
        error(errorData.error || 'Erro ao enviar produto')
      }
    } catch (err) {
      console.error(err)
      error('Erro ao enviar produto')
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    )
  }

  if (!locacao) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Locação não encontrada</p>
        <Link href="/locacoes" className="btn-secondary mt-4">Voltar para Locações</Link>
      </div>
    )
  }

  return (
    <div>
      <Header
        title="Enviar para Estoque"
        subtitle="Finalizar locação e enviar produto para estabelecimento"
        actions={
          <Link href={`/locacoes/${locacaoId}`} className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="max-w-2xl">
        {/* Produto */}
        <div className="card p-6 mb-6 bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">🎱</span>
            </div>
            <div>
              <p className="font-semibold text-slate-900">{locacao.produtoTipo} N° {locacao.produtoIdentificador}</p>
              <p className="text-sm text-slate-500">Cliente: <strong>{locacao.clienteNome}</strong></p>
            </div>
          </div>
        </div>

        {/* Destino */}
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Destino
          </h2>
          
          {estabelecimentos.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-700 text-sm">
                Nenhum estabelecimento cadastrado. Cadastre estabelecimentos em Admin → Atributos de Produto.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {estabelecimentos.map(est => (
                <label
                  key={est.id}
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                    formData.estabelecimento === est.nome
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="estabelecimento"
                    value={est.nome}
                    checked={formData.estabelecimento === est.nome}
                    onChange={handleChange}
                    className="w-4 h-4"
                  />
                  <MapPin className="w-5 h-5 text-slate-400" />
                  <span className="font-medium">{est.nome}</span>
                </label>
              ))}
            </div>
          )}
          {errors.estabelecimento && <p className="text-red-500 text-sm mt-2">{errors.estabelecimento}</p>}
        </div>

        {/* Motivo */}
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">📝 Motivo</h2>
          
          <div>
            <label className="label">Motivo do envio *</label>
            <textarea
              name="motivo"
              value={formData.motivo}
              onChange={handleChange}
              className="input min-h-[80px]"
              placeholder="Ex: Manutenção, cliente cancelou contrato, produto danificado..."
            />
            {errors.motivo && <p className="text-red-500 text-xs mt-1">{errors.motivo}</p>}
          </div>
          
          <div className="mt-4">
            <label className="label">Observação</label>
            <textarea
              name="observacao"
              value={formData.observacao}
              onChange={handleChange}
              className="input min-h-[60px]"
              placeholder="Informações adicionais..."
            />
          </div>
        </div>

        {/* Aviso */}
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
          <p className="text-red-700 text-sm">
            ⚠️ Esta ação irá finalizar a locação atual do cliente <strong>{locacao.clienteNome}</strong> e 
            o produto ficará disponível no estabelecimento selecionado para nova locação.
          </p>
        </div>

        <div className="flex gap-3">
          <button 
            type="submit" 
            disabled={loading || !formData.estabelecimento || estabelecimentos.length === 0} 
            className="btn-primary bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Confirmar Envio
              </>
            )}
          </button>
          <Link href={`/locacoes/${locacaoId}`} className="btn-secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
