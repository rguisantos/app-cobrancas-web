'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, DollarSign, FileText, Wrench, AlertTriangle, Package, User } from 'lucide-react'
import Header from '@/components/layout/header'
import { useToast } from '@/components/ui/toaster'
import { useLocacaoForm } from '@/hooks/useLocacaoForm'
import { LocacaoPagamentoForm } from '@/app/(app)/locacoes/components/LocacaoPagamentoForm'
import type { FormaPagamento } from '@/app/(app)/locacoes/components/LocacaoPagamentoForm'

interface LocacaoData {
  id: string
  clienteId: string
  clienteNome: string
  produtoId: string
  produtoIdentificador: string
  produtoTipo: string
  status: string
  formaPagamento: string
  precoFicha: number
  percentualEmpresa: number
  numeroRelogio: string
  periodicidade: string | null
  valorFixo: number | null
  dataPrimeiraCobranca: string | null
  trocaPano: boolean
  observacao: string | null
}

export default function EditarLocacaoPage() {
  const router = useRouter()
  const params = useParams()
  const locacaoId = params.id as string
  const { success, error } = useToast()

  const [loadingData, setLoadingData] = useState(true)
  const [locacao, setLocacao] = useState<LocacaoData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [notActive, setNotActive] = useState(false)

  const {
    formData,
    setFormData,
    errors,
    setErrors,
    loading,
    setLoading,
    handleChange,
    validate,
    getPercentualCliente,
    getSubmitPayload,
  } = useLocacaoForm()

  // Load locação data
  useEffect(() => {
    fetch(`/api/locacoes/${locacaoId}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found')
        return res.json()
      })
      .then(data => {
        if (data.status !== 'Ativa') {
          setNotActive(true)
        }
        setLocacao(data)
        setFormData(prev => ({
          ...prev,
          formaPagamento: (data.formaPagamento || 'PercentualReceber') as FormaPagamento,
          precoFicha: String(data.precoFicha || ''),
          percentualEmpresa: String(data.percentualEmpresa || 50),
          periodicidade: data.periodicidade || '',
          valorFixo: data.valorFixo ? String(data.valorFixo) : '',
          dataPrimeiraCobranca: data.dataPrimeiraCobranca || '',
          numeroRelogio: data.numeroRelogio || '',
          trocaPano: data.trocaPano || false,
          observacao: data.observacao || '',
        }))
        setLoadingData(false)
      })
      .catch(() => {
        setNotFound(true)
        setLoadingData(false)
      })
  }, [locacaoId, setFormData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)

    try {
      const payload = getSubmitPayload({
        dataUltimaManutencao: formData.trocaPano ? new Date().toISOString() : undefined,
      })

      const res = await fetch(`/api/locacoes/${locacaoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        success('Locação atualizada com sucesso!')
        router.push(`/locacoes/${locacaoId}`)
      } else {
        const errorData = await res.json()
        error(errorData.error || 'Erro ao atualizar locação')
      }
    } catch (err) {
      console.error(err)
      error('Erro ao atualizar locação')
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-slate-500">Carregando dados da locação...</p>
        </div>
      </div>
    )
  }

  // Not found
  if (notFound || !locacao) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Locação não encontrada</h3>
        <p className="text-sm text-slate-500 mb-4">A locação solicitada não existe ou foi removida.</p>
        <Link href="/locacoes" className="btn-secondary">Voltar para Locações</Link>
      </div>
    )
  }

  // Not active
  if (notActive) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Locação não pode ser editada</h3>
        <p className="text-sm text-slate-500 mb-4">
          Esta locação está com status <strong>{locacao.status}</strong>. Apenas locações ativas podem ser editadas.
        </p>
        <Link href={`/locacoes/${locacaoId}`} className="btn-secondary">Ver detalhes da locação</Link>
      </div>
    )
  }

  return (
    <div className="pb-24 lg:pb-8">
      <Header
        title="Editar Locação"
        subtitle={`${locacao.produtoTipo} N° ${locacao.produtoIdentificador} — ${locacao.clienteNome}`}
        actions={
          <Link href={`/locacoes/${locacaoId}`} className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações bloqueadas */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Produto & Cliente
            </h2>
          </div>
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500 block mb-1">Produto</span>
                <span className="font-semibold text-slate-900">
                  {locacao.produtoTipo} N° {locacao.produtoIdentificador}
                </span>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500 block mb-1">Cliente</span>
                <Link
                  href={`/clientes/${locacao.clienteId}`}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  {locacao.clienteNome}
                </Link>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Produto e cliente não podem ser alterados. Para trocar, use a função de Relocar.
            </p>
          </div>
        </section>

        {/* Forma de Pagamento */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-600" />
              Forma de Pagamento
            </h2>
          </div>
          <LocacaoPagamentoForm
            formData={{
              formaPagamento: formData.formaPagamento,
              precoFicha: formData.precoFicha,
              percentualEmpresa: formData.percentualEmpresa,
              periodicidade: formData.periodicidade,
              valorFixo: formData.valorFixo,
              dataPrimeiraCobranca: formData.dataPrimeiraCobranca,
              numeroRelogio: formData.numeroRelogio,
            }}
            errors={errors}
            onChange={handleChange}
          />
        </section>

        {/* Manutenção */}
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
                <span className="font-medium text-slate-900">Troca de Pano / Manutenção Realizada</span>
                <p className="text-sm text-slate-500 mt-1">Marque se foi realizada manutenção</p>
              </div>
            </label>
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
              placeholder="Observações sobre a locação..."
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
                  Salvar Alterações
                </>
              )}
            </button>
            <Link href={`/locacoes/${locacaoId}`} className="btn-secondary hidden lg:inline-flex">
              Cancelar
            </Link>
          </div>
        </div>
      </form>
    </div>
  )
}
