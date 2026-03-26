'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Calculator } from 'lucide-react'
import Header from '@/components/layout/header'
import { formatarMoeda } from '@/shared/types'

interface Locacao {
  id: string
  clienteId: string
  clienteNome: string
  produtoId: string
  produtoIdentificador: string
  produtoTipo: string
  numeroRelogio: string
  precoFicha: number
  percentualEmpresa: number
  ultimaLeituraRelogio: number | null
  status: string
}

export default function NovaCobrancaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const locacaoIdPreSelect = searchParams.get('locacaoId')

  const [loading, setLoading] = useState(false)
  const [locacoes, setLocacoes] = useState<Locacao[]>([])
  const [locacaoSelecionada, setLocacaoSelecionada] = useState<Locacao | null>(null)

  const [formData, setFormData] = useState({
    locacaoId: locacaoIdPreSelect || '',
    relogioAtual: '',
    descontoPartidasQtd: '',
    descontoDinheiro: '',
    valorRecebido: '',
    observacao: '',
    dataInicio: '',
    dataFim: new Date().toISOString().split('T')[0]
  })

  const [calculos, setCalculos] = useState({
    fichasRodadas: 0,
    totalBruto: 0,
    subtotalAposDescontos: 0,
    valorPercentual: 0,
    totalClientePaga: 0
  })

  useEffect(() => {
    fetch('/api/locacoes?status=Ativa&limit=1000')
      .then(res => res.json())
      .then(data => {
        const locacoesData = data.data || data
        setLocacoes(locacoesData)
        if (locacaoIdPreSelect) {
          const loc = locacoesData.find((l: Locacao) => l.id === locacaoIdPreSelect)
          if (loc) setLocacaoSelecionada(loc)
        }
      })
      .catch(console.error)
  }, [locacaoIdPreSelect])

  useEffect(() => {
    if (!locacaoSelecionada) {
      setCalculos({ fichasRodadas: 0, totalBruto: 0, subtotalAposDescontos: 0, valorPercentual: 0, totalClientePaga: 0 })
      return
    }

    const relogioAnterior = locacaoSelecionada.ultimaLeituraRelogio || 0
    const relogioAtual = parseFloat(formData.relogioAtual) || 0
    const fichasRodadas = relogioAtual - relogioAnterior
    const totalBruto = fichasRodadas * locacaoSelecionada.precoFicha

    const descontoPartidasQtd = parseFloat(formData.descontoPartidasQtd) || 0
    const descontoPartidasValor = descontoPartidasQtd * locacaoSelecionada.precoFicha
    const descontoDinheiro = parseFloat(formData.descontoDinheiro) || 0
    
    const subtotalAposDescontos = totalBruto - descontoPartidasValor - descontoDinheiro
    const valorPercentual = subtotalAposDescontos * (locacaoSelecionada.percentualEmpresa / 100)
    const totalClientePaga = subtotalAposDescontos - valorPercentual

    setCalculos({
      fichasRodadas,
      totalBruto,
      subtotalAposDescontos: Math.max(0, subtotalAposDescontos),
      valorPercentual: Math.max(0, valorPercentual),
      totalClientePaga: Math.max(0, totalClientePaga)
    })
  }, [locacaoSelecionada, formData.relogioAtual, formData.descontoPartidasQtd, formData.descontoDinheiro])

  const handleLocacaoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const locacaoId = e.target.value
    const loc = locacoes.find(l => l.id === locacaoId)
    setLocacaoSelecionada(loc || null)
    setFormData(prev => ({ ...prev, locacaoId }))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!locacaoSelecionada) {
      alert('Selecione uma locação')
      return
    }

    const relogioAnterior = locacaoSelecionada.ultimaLeituraRelogio || 0
    const relogioAtual = parseFloat(formData.relogioAtual) || 0

    if (relogioAtual < relogioAnterior) {
      alert('A leitura atual não pode ser menor que a leitura anterior')
      return
    }

    setLoading(true)

    try {
      const valorRecebido = parseFloat(formData.valorRecebido) || 0
      const saldoDevedorGerado = calculos.totalClientePaga - valorRecebido

      const res = await fetch('/api/cobrancas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locacaoId: formData.locacaoId,
          clienteId: locacaoSelecionada.clienteId,
          clienteNome: locacaoSelecionada.clienteNome,
          produtoId: locacaoSelecionada.produtoId,
          produtoIdentificador: locacaoSelecionada.produtoIdentificador,
          dataInicio: formData.dataInicio || new Date().toISOString().split('T')[0],
          dataFim: formData.dataFim,
          relogioAnterior,
          relogioAtual,
          fichasRodadas: calculos.fichasRodadas,
          valorFicha: locacaoSelecionada.precoFicha,
          totalBruto: calculos.totalBruto,
          descontoPartidasQtd: parseFloat(formData.descontoPartidasQtd) || null,
          descontoPartidasValor: parseFloat(formData.descontoPartidasQtd) * locacaoSelecionada.precoFicha || null,
          descontoDinheiro: parseFloat(formData.descontoDinheiro) || null,
          percentualEmpresa: locacaoSelecionada.percentualEmpresa,
          subtotalAposDescontos: calculos.subtotalAposDescontos,
          valorPercentual: calculos.valorPercentual,
          totalClientePaga: calculos.totalClientePaga,
          valorRecebido,
          saldoDevedorGerado: Math.max(0, saldoDevedorGerado),
          status: valorRecebido >= calculos.totalClientePaga ? 'Pago' : (valorRecebido > 0 ? 'Parcial' : 'Pendente'),
          observacao: formData.observacao || null
        })
      })

      if (res.ok) {
        // Update locacao with new ultimaLeituraRelogio
        await fetch(`/api/locacoes/${formData.locacaoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ultimaLeituraRelogio: relogioAtual,
            dataUltimaCobranca: formData.dataFim
          })
        })
        router.push('/cobrancas')
      } else {
        const error = await res.json()
        alert(error.error || 'Erro ao salvar cobrança')
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao salvar cobrança')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Header
        title="Nova Cobrança"
        subtitle="Registrar uma nova cobrança"
        actions={
          <Link href="/cobrancas" className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="max-w-4xl">
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">📋 Selecionar Locação</h2>
          
          <div>
            <label className="label">Locação Ativa *</label>
            <select
              name="locacaoId"
              value={formData.locacaoId}
              onChange={handleLocacaoChange}
              className="input"
              required
            >
              <option value="">Selecione uma locação</option>
              {locacoes.map(l => (
                <option key={l.id} value={l.id}>
                  {l.clienteNome} - {l.produtoTipo} N° {l.produtoIdentificador} (Relógio: {l.numeroRelogio})
                </option>
              ))}
            </select>
          </div>

          {locacaoSelecionada && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Cliente</span>
                  <p className="font-medium">{locacaoSelecionada.clienteNome}</p>
                </div>
                <div>
                  <span className="text-slate-500">Produto</span>
                  <p className="font-medium">{locacaoSelecionada.produtoTipo} N° {locacaoSelecionada.produtoIdentificador}</p>
                </div>
                <div>
                  <span className="text-slate-500">Última Leitura</span>
                  <p className="font-mono font-medium">{locacaoSelecionada.ultimaLeituraRelogio ?? 0}</p>
                </div>
                <div>
                  <span className="text-slate-500">Preço Ficha</span>
                  <p className="font-medium">{formatarMoeda(locacaoSelecionada.precoFicha)}</p>
                </div>
                <div>
                  <span className="text-slate-500">% Empresa</span>
                  <p className="font-medium">{locacaoSelecionada.percentualEmpresa}%</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {locacaoSelecionada && (
          <>
            <div className="card p-6 mb-6">
              <h2 className="font-semibold text-slate-900 mb-4">📊 Leitura do Relógio</h2>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Leitura Atual *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="relogioAtual"
                    value={formData.relogioAtual}
                    onChange={handleChange}
                    className="input"
                    placeholder="Ex: 8500"
                    required
                  />
                </div>
                <div>
                  <label className="label">Data Início</label>
                  <input
                    type="date"
                    name="dataInicio"
                    value={formData.dataInicio}
                    onChange={handleChange}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Data Fim *</label>
                  <input
                    type="date"
                    name="dataFim"
                    value={formData.dataFim}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="card p-6 mb-6">
              <h2 className="font-semibold text-slate-900 mb-4">💸 Descontos (Opcional)</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Desconto Partidas (Qtd)</label>
                  <input
                    type="number"
                    step="1"
                    name="descontoPartidasQtd"
                    value={formData.descontoPartidasQtd}
                    onChange={handleChange}
                    className="input"
                    placeholder="Ex: 10"
                  />
                </div>
                <div>
                  <label className="label">Desconto em Dinheiro (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="descontoDinheiro"
                    value={formData.descontoDinheiro}
                    onChange={handleChange}
                    className="input"
                    placeholder="Ex: 50.00"
                  />
                </div>
              </div>
            </div>

            <div className="card p-6 mb-6 bg-primary-50 border-primary-200">
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Cálculos
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span className="text-slate-600">Fichas Rodadas:</span>
                  <span className="font-semibold">{calculos.fichasRodadas.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Bruto:</span>
                  <span className="font-semibold">{formatarMoeda(calculos.totalBruto)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal (após descontos):</span>
                  <span className="font-semibold">{formatarMoeda(calculos.subtotalAposDescontos)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Valor % Empresa:</span>
                  <span className="font-semibold text-blue-700">{formatarMoeda(calculos.valorPercentual)}</span>
                </div>
                <div className="flex justify-between col-span-2 pt-2 border-t border-primary-200">
                  <span className="text-slate-900 font-medium">Total Cliente Paga:</span>
                  <span className="font-bold text-lg text-green-700">{formatarMoeda(calculos.totalClientePaga)}</span>
                </div>
              </div>
            </div>

            <div className="card p-6 mb-6">
              <h2 className="font-semibold text-slate-900 mb-4">💵 Pagamento</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Valor Recebido *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="valorRecebido"
                    value={formData.valorRecebido}
                    onChange={handleChange}
                    className="input"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="label">Saldo Devedor</label>
                  <p className={`text-lg font-semibold mt-2 ${
                    (calculos.totalClientePaga - (parseFloat(formData.valorRecebido) || 0)) > 0 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    {formatarMoeda(Math.max(0, calculos.totalClientePaga - (parseFloat(formData.valorRecebido) || 0)))}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <label className="label">Observação</label>
                <textarea
                  name="observacao"
                  value={formData.observacao}
                  onChange={handleChange}
                  className="input min-h-[80px]"
                  placeholder="Observações sobre a cobrança..."
                />
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
                    Salvar Cobrança
                  </>
                )}
              </button>
              <Link href="/cobrancas" className="btn-secondary">Cancelar</Link>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
