'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatarMoeda } from '@/shared/types'
import { Hash, DollarSign, Percent, FileText, AlertTriangle, Calculator, RefreshCw } from 'lucide-react'

interface Cobranca {
  id: string
  totalBruto: number
  fichasRodadas: number
  relogioAnterior: number
  relogioAtual: number
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
  saldoAnterior: number
  precoFicha: number
}

export default function EditarCobrancaForm({ cobranca, saldoAnterior, precoFicha }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Campos editáveis - Relógio
  const [relogioAnterior, setRelogioAnterior] = useState(cobranca.relogioAnterior.toString())
  const [relogioAtual, setRelogioAtual] = useState(cobranca.relogioAtual.toString())
  
  // Campos editáveis - Descontos
  const [descontoPartidasQtd, setDescontoPartidasQtd] = useState(cobranca.descontoPartidasQtd?.toString() || '')
  const [descontoDinheiro, setDescontoDinheiro] = useState(cobranca.descontoDinheiro?.toString() || '')
  
  // Campos editáveis - Pagamento
  const [valorRecebido, setValorRecebido] = useState(cobranca.valorRecebido.toString())
  const [status, setStatus] = useState(cobranca.status)
  const [observacao, setObservacao] = useState(cobranca.observacao || '')

  // Cálculos dinâmicos
  const calcularTotais = () => {
    const relogioAnt = parseFloat(relogioAnterior) || 0
    const relogioAtu = parseFloat(relogioAtual) || 0
    const fichasRodadas = Math.max(0, relogioAtu - relogioAnt)
    
    const totalBruto = fichasRodadas * precoFicha
    const descontoPartidas = parseFloat(descontoPartidasQtd || '0') * precoFicha
    const descontoDinheiroVal = parseFloat(descontoDinheiro || '0')
    
    // Desconto Partidas reduz o subtotal (antes do percentual)
    // Desconto Dinheiro reduz o líquido do cliente (após o percentual)
    const subtotal = totalBruto - descontoPartidas
    const valorPercentual = subtotal * (cobranca.percentualEmpresa / 100)
    const totalClientePaga = subtotal - valorPercentual - descontoDinheiroVal
    
    // Saldo devedor inclui o saldo anterior da cobrança anterior (se houver)
    const totalComSaldoAnterior = totalClientePaga + saldoAnterior
    const valorRecebidoVal = parseFloat(valorRecebido || '0')
    const saldoDevedor = Math.max(0, totalComSaldoAnterior - valorRecebidoVal)

    return {
      relogioAnterior: relogioAnt,
      relogioAtual: relogioAtu,
      fichasRodadas,
      totalBruto,
      descontoPartidasValor: descontoPartidas,
      descontoDinheiro: descontoDinheiroVal,
      subtotalAposDescontos: subtotal,
      valorPercentual,
      totalClientePaga,
      saldoDevedorGerado: saldoDevedor
    }
  }

  const totais = calcularTotais()
  
  // Verificar se houve mudança no relógio
  const relogioMudou = totais.relogioAnterior !== cobranca.relogioAnterior || totais.relogioAtual !== cobranca.relogioAtual

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validação do relógio
    if (totais.relogioAtual < totais.relogioAnterior) {
      setError('Relógio atual não pode ser menor que o anterior')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/cobrancas/${cobranca.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Relógio
          relogioAnterior: totais.relogioAnterior,
          relogioAtual: totais.relogioAtual,
          fichasRodadas: totais.fichasRodadas,
          // Valores recalculados
          totalBruto: totais.totalBruto,
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
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Relógio */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-purple-100/50 border-b">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Hash className="w-4 h-4 text-purple-600" />
            Leitura do Relógio
          </h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label text-xs">Relógio Anterior</label>
              <input
                type="number"
                step="1"
                min="0"
                className="input font-mono text-lg"
                value={relogioAnterior}
                onChange={(e) => setRelogioAnterior(e.target.value)}
              />
            </div>
            <div>
              <label className="label text-xs">Relógio Atual</label>
              <input
                type="number"
                step="1"
                min="0"
                className="input font-mono text-lg"
                value={relogioAtual}
                onChange={(e) => setRelogioAtual(e.target.value)}
              />
            </div>
          </div>
          
          {/* Indicador de fichas */}
          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
            <span className="text-sm text-purple-700">Fichas Rodadas</span>
            <span className="text-xl font-bold text-purple-700">
              {totais.fichasRodadas.toLocaleString('pt-BR')}
            </span>
          </div>

          {relogioMudou && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-700">
              <RefreshCw className="w-4 h-4" />
              Os valores serão recalculados com a nova leitura
            </div>
          )}
        </div>
      </div>

      {/* Descontos */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-amber-100/50 border-b">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Percent className="w-4 h-4 text-amber-600" />
            Descontos
          </h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label text-xs">Desconto Partidas (quantidade)</label>
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
                <p className="text-xs text-amber-600 mt-1">
                  Valor: {formatarMoeda(totais.descontoPartidasValor)}
                </p>
              )}
            </div>
            <div>
              <label className="label text-xs">Desconto em Dinheiro (R$)</label>
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
      </div>

      {/* Pagamento */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-b">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Pagamento
          </h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label text-xs">Valor Recebido (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input text-lg"
                value={valorRecebido}
                onChange={(e) => setValorRecebido(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="label text-xs">Status</label>
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
      </div>

      {/* Observação */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-600" />
            Observação
          </h3>
        </div>
        <div className="p-4">
          <textarea
            className="input min-h-[80px]"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Observações sobre a cobrança..."
          />
        </div>
      </div>

      {/* Resumo dos Cálculos */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 bg-gradient-to-r from-slate-100 to-slate-200/50 border-b">
          <h4 className="font-semibold text-slate-900 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-slate-600" />
            Resumo Calculado
          </h4>
        </div>
        <div className="p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Fichas Rodadas</span>
              <span className="font-medium text-purple-700">{totais.fichasRodadas.toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Total Bruto <span className="text-slate-400">({totais.fichasRodadas.toLocaleString('pt-BR')} × {formatarMoeda(precoFicha)})</span></span>
              <span className="font-medium">{formatarMoeda(totais.totalBruto)}</span>
            </div>
            
            {totais.descontoPartidasValor > 0 && (
              <div className="flex justify-between py-2 border-b border-slate-100 text-amber-600">
                <span>- Desconto Partidas</span>
                <span className="font-medium">-{formatarMoeda(totais.descontoPartidasValor)}</span>
              </div>
            )}
            
            {totais.descontoDinheiro > 0 && (
              <div className="flex justify-between py-2 border-b border-slate-100 text-amber-600">
                <span>- Desconto Dinheiro</span>
                <span className="font-medium">-{formatarMoeda(totais.descontoDinheiro)}</span>
              </div>
            )}
            
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-medium">{formatarMoeda(totais.subtotalAposDescontos)}</span>
            </div>
            
            <div className="flex justify-between py-2 border-b border-slate-100 text-blue-600">
              <span>- Percentual ({cobranca.percentualEmpresa}%)</span>
              <span className="font-medium">-{formatarMoeda(totais.valorPercentual)}</span>
            </div>
            
            <div className="flex justify-between py-3 bg-emerald-50 -mx-4 px-4 rounded-lg">
              <span className="font-semibold text-emerald-800">Total Cliente Paga</span>
              <span className="text-lg font-bold text-emerald-700">{formatarMoeda(totais.totalClientePaga)}</span>
            </div>
            
            {saldoAnterior > 0 && (
              <>
                <div className="flex justify-between py-2 border-b border-red-100 text-red-600">
                  <span className="font-medium">+ Saldo Devedor Anterior</span>
                  <span className="font-bold">{formatarMoeda(saldoAnterior)}</span>
                </div>
                <div className="flex justify-between py-3 bg-red-50 -mx-4 px-4 rounded-lg border border-red-200">
                  <span className="font-semibold text-red-800">Total a Receber</span>
                  <span className="text-lg font-bold text-red-700">{formatarMoeda(totais.totalClientePaga + saldoAnterior)}</span>
                </div>
              </>
            )}
            
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Valor Recebido</span>
              <span className="font-bold text-emerald-600">{formatarMoeda(parseFloat(valorRecebido || '0'))}</span>
            </div>
            
            <div className={`flex justify-between py-3 -mx-4 px-4 rounded-lg ${totais.saldoDevedorGerado > 0 ? 'bg-red-100' : 'bg-emerald-100'}`}>
              <span className={`font-semibold ${totais.saldoDevedorGerado > 0 ? 'text-red-800' : 'text-emerald-800'}`}>
                Saldo Devedor Final
              </span>
              <span className={`text-lg font-bold ${totais.saldoDevedorGerado > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                {formatarMoeda(totais.saldoDevedorGerado)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Botões */}
      <div className="flex gap-3 pt-4 pb-8">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex-1 py-3 text-base"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Salvando...
            </span>
          ) : 'Salvar Alterações'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary py-3 px-6"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
