'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, MapPin, Loader2, Package, User, DollarSign, Percent, Clock, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import Header from '@/components/layout/header'
import { useToast } from '@/components/ui/toaster'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { formatarMoeda } from '@/shared/types'
import { FORMA_OPTS } from '@/app/(app)/locacoes/components/LocacaoPagamentoForm'

interface Locacao {
  id: string
  clienteId: string
  clienteNome: string
  produtoId: string
  produtoIdentificador: string
  produtoTipo: string
  formaPagamento: string
  precoFicha: number
  percentualEmpresa: number
  percentualCliente: number
  periodicidade?: string
  valorFixo?: number
  numeroRelogio: string
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
  const [showConfirm, setShowConfirm] = useState(false)
  
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

  const handleValidate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.estabelecimento) {
      newErrors.estabelecimento = 'Selecione o destino'
    }
    if (!formData.motivo.trim()) {
      newErrors.motivo = 'Informe o motivo'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault()
    if (handleValidate()) {
      setShowConfirm(true)
    }
  }

  const handleConfirmEnviar = async () => {
    setLoading(true)
    setShowConfirm(false)

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

  const formaLabel = FORMA_OPTS.find(o => o.value === locacao.formaPagamento)?.label || locacao.formaPagamento

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

      <form onSubmit={handleSubmitClick} className="max-w-2xl space-y-6">
        {/* Produto e Resumo Financeiro */}
        <div className="card p-6 bg-slate-50">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center">
              <Package className="w-7 h-7 text-primary-700" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{locacao.produtoTipo} N° {locacao.produtoIdentificador}</p>
              <p className="text-sm text-slate-500">Cliente: <strong>{locacao.clienteNome}</strong></p>
              <p className="text-sm text-slate-500 font-mono">Relógio: {locacao.numeroRelogio}</p>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-xs font-medium text-slate-600 uppercase tracking-wider mb-3">Resumo financeiro</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500">Forma Pgto</span>
                <p className="font-medium text-slate-900 text-sm">{formaLabel}</p>
              </div>
              {locacao.formaPagamento !== 'Periodo' ? (
                <>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-xs text-slate-500">Preço Ficha</span>
                    <p className="font-bold text-slate-900 text-sm">{formatarMoeda(locacao.precoFicha)}</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-xs text-slate-500">% Empresa / % Cliente</span>
                    <p className="font-medium text-slate-900 text-sm">{locacao.percentualEmpresa}% / {locacao.percentualCliente}%</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-xs text-slate-500">Valor Fixo</span>
                    <p className="font-bold text-emerald-700 text-sm">{locacao.valorFixo ? formatarMoeda(locacao.valorFixo) : '—'}</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-xs text-slate-500">Periodicidade</span>
                    <p className="font-medium text-slate-900 text-sm">{locacao.periodicidade || '—'}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Destino */}
        <div className="card p-6">
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
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Motivo</h2>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Motivo do envio <span className="text-red-500">*</span></label>
            <textarea
              name="motivo"
              value={formData.motivo}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none min-h-[80px]"
              placeholder="Ex: Manutenção, cliente cancelou contrato, produto danificado..."
            />
            {errors.motivo && <p className="text-red-500 text-xs mt-1">{errors.motivo}</p>}
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Observação</label>
            <textarea
              name="observacao"
              value={formData.observacao}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none min-h-[60px]"
              placeholder="Informações adicionais..."
            />
          </div>
        </div>

        {/* Aviso detalhado */}
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium text-sm">O que acontecerá ao confirmar:</p>
              <ul className="text-red-700 text-sm mt-2 space-y-1">
                <li>• A locação de <strong>{locacao.clienteNome}</strong> será <strong>finalizada</strong></li>
                <li>• O produto {locacao.produtoTipo} N° {locacao.produtoIdentificador} ficará disponível no estabelecimento <strong>{formData.estabelecimento || 'selecionado'}</strong></li>
                <li>• O produto poderá ser locado novamente para outro cliente</li>
              </ul>
            </div>
          </div>
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

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmEnviar}
        title="Confirmar Envio para Estoque"
        message={`Tem certeza que deseja finalizar a locação de ${locacao.clienteNome} e enviar ${locacao.produtoTipo} N° ${locacao.produtoIdentificador} para ${formData.estabelecimento}? Esta ação não pode ser desfeita.`}
        confirmText="Confirmar Envio"
        cancelText="Cancelar"
        variant="danger"
        isLoading={loading}
      />
    </div>
  )
}
