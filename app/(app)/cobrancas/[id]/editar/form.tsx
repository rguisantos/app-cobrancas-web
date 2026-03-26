'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatarMoeda } from '@/shared/types'

interface Cobranca {
  id: string
  totalBruto: number
  fichasRodadas: number
  descontoPartidasQtd: number | null
  descontoPartidasValor: number | null
  descontoDinheiro: number | null
  subtotalAposDescontos: number
  percentualEmpresa: number
  valorPercentual: number
  totalClientePaga: number
  valorRecebido: number
  saldoDevedorGerado: number
  status: string
  observacao: string | null
}

interface Props {
  cobranca: Cobranca
}

export default function EditarCobrancaForm({ cobranca }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Campos editáveis
  const [descontoPartidasQtd, setDescontoPartidasQtd] = useState(cobranca.descontoPartidasQtd?.toString() || '')
  const [descontoDinheiro, setDescontoDinheiro] = useState(cobranca.descontoDinheiro?.toString() || '')
  const [valorRecebido, setValorRecebido] = useState(cobranca.valorRecebido.toString())
  const [status, setStatus] = useState(cobranca.status)
  const [observacao, setObservacao] = useState(cobranca.observacao || '')

  // Cálculos dinâmicos
  const calcularTotais = () => {
    const descontoPartidas = parseFloat(descontoPartidasQtd || '0') * (cobranca.totalBruto / (cobranca.fichasRodadas || 1))
    const descontoDinheiroVal = parseFloat(descontoDinheiro || '0')
    
    const subtotal = cobranca.totalBruto - descontoPartidas - descontoDinheiroVal
    const valorPercentual = subtotal * (cobranca.percentualEmpresa / 100)
    const totalClientePaga = subtotal - valorPercentual
    
    const valorRecebidoVal = parseFloat(valorRecebido || '0')
    const saldoDevedor = Math.max(0, totalClientePaga - valorRecebidoVal)

    return {
      descontoPartidasValor: descontoPartidas,
      descontoDinheiro: descontoDinheiroVal,
      subtotalAposDescontos: subtotal,
      valorPercentual,
      totalClientePaga,
      saldoDevedorGerado: saldoDevedor
    }
  }

  const totais = calcularTotais()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/cobrancas/${cobranca.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descontoPartidasQtd: parseFloat(descontoPartidasQtd || '0') || null,
          descontoPartidasValor: totais.descontoPartidasValor || null,
          descontoDinheiro: totais.descontoDinheiro || null,
          subtotalAposDescontos: totais.subtotalAposDescontos,
          valorPercentual: totais.valorPercentual,
          totalClientePaga: totais.totalClientePaga,
          valorRecebido: parseFloat(valorRecebido || '0'),
          saldoDevedorGerado: totais.saldoDevedorGerado,
          status,
          observacao: observacao || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao salvar cobrança')
      }

      router.push(`/cobrancas/${cobranca.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar cobrança')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Descontos */}
      <div className="space-y-4">
        <h3 className="font-medium text-slate-900">Descontos</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Desconto Partidas (quantidade)</label>
            <input
              type="number"
              step="1"
              min="0"
              className="input"
              value={descontoPartidasQtd}
              onChange={(e) => setDescontoPartidasQtd(e.target.value)}
              placeholder="0"
            />
            {parseFloat(descontoPartidasQtd || '0') > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                Valor: {formatarMoeda(totais.descontoPartidasValor)}
              </p>
            )}
          </div>
          
          <div>
            <label className="label">Desconto em Dinheiro (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={descontoDinheiro}
              onChange={(e) => setDescontoDinheiro(e.target.value)}
              placeholder="0,00"
            />
          </div>
        </div>
      </div>

      {/* Pagamento */}
      <div className="space-y-4">
        <h3 className="font-medium text-slate-900">Pagamento</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Valor Recebido (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={valorRecebido}
              onChange={(e) => setValorRecebido(e.target.value)}
              placeholder="0,00"
            />
          </div>
          
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="Pago">Pago</option>
              <option value="Parcial">Parcial</option>
              <option value="Pendente">Pendente</option>
              <option value="Atrasado">Atrasado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Observação */}
      <div>
        <label className="label">Observação</label>
        <textarea
          className="input min-h-[80px]"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Observações sobre a cobrança..."
        />
      </div>

      {/* Resumo dos Cálculos */}
      <div className="bg-slate-50 rounded-lg p-4 space-y-2">
        <h4 className="font-medium text-slate-700 mb-3">📊 Resumo Calculado</h4>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between col-span-2">
            <span className="text-slate-600">Total Bruto</span>
            <span>{formatarMoeda(cobranca.totalBruto)}</span>
          </div>
          
          {totais.descontoPartidasValor > 0 && (
            <div className="flex justify-between col-span-2 text-amber-700">
              <span>- Desconto Partidas</span>
              <span>-{formatarMoeda(totais.descontoPartidasValor)}</span>
            </div>
          )}
          
          {totais.descontoDinheiro > 0 && (
            <div className="flex justify-between col-span-2 text-amber-700">
              <span>- Desconto Dinheiro</span>
              <span>-{formatarMoeda(totais.descontoDinheiro)}</span>
            </div>
          )}
          
          <div className="flex justify-between col-span-2">
            <span className="text-slate-600">Subtotal</span>
            <span>{formatarMoeda(totais.subtotalAposDescontos)}</span>
          </div>
          
          <div className="flex justify-between col-span-2 text-blue-700">
            <span>- Percentual ({cobranca.percentualEmpresa}%)</span>
            <span>-{formatarMoeda(totais.valorPercentual)}</span>
          </div>
          
          <div className="flex justify-between col-span-2 pt-2 border-t border-slate-200 font-medium">
            <span className="text-green-800">Total Cliente Paga</span>
            <span className="text-green-700">{formatarMoeda(totais.totalClientePaga)}</span>
          </div>
          
          <div className="flex justify-between col-span-2">
            <span className="text-slate-600">Valor Recebido</span>
            <span className="text-green-700">{formatarMoeda(parseFloat(valorRecebido || '0'))}</span>
          </div>
          
          <div className="flex justify-between col-span-2 pt-2 border-t border-slate-200">
            <span className="text-red-700 font-medium">Saldo Devedor</span>
            <span className="text-red-600 font-bold">{formatarMoeda(totais.saldoDevedorGerado)}</span>
          </div>
        </div>
      </div>

      {/* Botões */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex-1"
        >
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
