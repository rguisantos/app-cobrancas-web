'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import Header from '@/components/layout/header'

interface Cliente { id: string; nomeExibicao: string }
interface Produto { id: string; identificador: string; tipoNome: string; statusProduto: string }

export default function NovaLocacaoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clienteIdPreSelect = searchParams.get('clienteId')
  
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [formData, setFormData] = useState({
    clienteId: clienteIdPreSelect || '',
    produtoId: '',
    dataLocacao: new Date().toISOString().split('T')[0],
    formaPagamento: 'PercentualPagar' as 'Periodo' | 'PercentualPagar' | 'PercentualReceber',
    numeroRelogio: '',
    precoFicha: '',
    percentualEmpresa: '',
    periodicidade: '',
    valorFixo: '',
    dataPrimeiraCobranca: '',
    trocaPano: false,
    observacao: ''
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/clientes?limit=1000&status=Ativo').then(res => res.json()),
      fetch('/api/produtos?limit=1000&status=Ativo').then(res => res.json())
    ])
      .then(([clientesData, produtosData]) => {
        setClientes(clientesData.data || clientesData)
        setProdutos(produtosData.data || produtosData)
      })
      .catch(console.error)
  }, [])

  const produtosDisponiveis = produtos.filter(p => p.statusProduto === 'Ativo')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const cliente = clientes.find(c => c.id === formData.clienteId)
    const produto = produtos.find(p => p.id === formData.produtoId)
    
    if (!cliente || !produto) {
      alert('Selecione um cliente e um produto')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/locacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: formData.clienteId,
          clienteNome: cliente.nomeExibicao,
          produtoId: formData.produtoId,
          produtoIdentificador: produto.identificador,
          produtoTipo: produto.tipoNome,
          dataLocacao: formData.dataLocacao,
          formaPagamento: formData.formaPagamento,
          numeroRelogio: formData.numeroRelogio,
          precoFicha: parseFloat(formData.precoFicha) || 0,
          percentualEmpresa: parseFloat(formData.percentualEmpresa) || 0,
          percentualCliente: 100 - (parseFloat(formData.percentualEmpresa) || 0),
          periodicidade: formData.periodicidade || null,
          valorFixo: formData.valorFixo ? parseFloat(formData.valorFixo) : null,
          dataPrimeiraCobranca: formData.dataPrimeiraCobranca || null,
          trocaPano: formData.trocaPano,
          dataUltimaManutencao: formData.trocaPano ? new Date().toISOString() : null,
          observacao: formData.observacao || null,
          status: 'Ativa'
        })
      })

      if (res.ok) {
        router.push('/locacoes')
      } else {
        const error = await res.json()
        alert(error.error || 'Erro ao salvar locação')
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao salvar locação')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Header
        title="Nova Locação"
        subtitle="Registrar uma nova locação"
        actions={
          <Link href="/locacoes" className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="max-w-4xl">
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">📋 Dados da Locação</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Cliente *</label>
              <select
                name="clienteId"
                value={formData.clienteId}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Selecione um cliente</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nomeExibicao}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Produto *</label>
              <select
                name="produtoId"
                value={formData.produtoId}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Selecione um produto</option>
                {produtosDisponiveis.map(p => (
                  <option key={p.id} value={p.id}>{p.tipoNome} N° {p.identificador}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="label">Data da Locação *</label>
              <input
                type="date"
                name="dataLocacao"
                value={formData.dataLocacao}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Número do Relógio *</label>
              <input
                name="numeroRelogio"
                value={formData.numeroRelogio}
                onChange={handleChange}
                className="input"
                placeholder="Leitura inicial do relógio"
                required
              />
            </div>
          </div>
        </div>

        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">💰 Forma de Pagamento</h2>
          
          <div className="flex gap-4 mb-4">
            <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
              formData.formaPagamento === 'PercentualPagar' 
                ? 'border-primary-500 bg-primary-50 text-primary-700' 
                : 'border-slate-200 hover:border-slate-300'
            }`}>
              <input
                type="radio"
                name="formaPagamento"
                value="PercentualPagar"
                checked={formData.formaPagamento === 'PercentualPagar'}
                onChange={handleChange}
                className="sr-only"
              />
              Percentual a Pagar
            </label>
            <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
              formData.formaPagamento === 'PercentualReceber' 
                ? 'border-primary-500 bg-primary-50 text-primary-700' 
                : 'border-slate-200 hover:border-slate-300'
            }`}>
              <input
                type="radio"
                name="formaPagamento"
                value="PercentualReceber"
                checked={formData.formaPagamento === 'PercentualReceber'}
                onChange={handleChange}
                className="sr-only"
              />
              Percentual a Receber
            </label>
            <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
              formData.formaPagamento === 'Periodo' 
                ? 'border-primary-500 bg-primary-50 text-primary-700' 
                : 'border-slate-200 hover:border-slate-300'
            }`}>
              <input
                type="radio"
                name="formaPagamento"
                value="Periodo"
                checked={formData.formaPagamento === 'Periodo'}
                onChange={handleChange}
                className="sr-only"
              />
              Por Período
            </label>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Preço da Ficha *</label>
              <input
                type="number"
                step="0.01"
                name="precoFicha"
                value={formData.precoFicha}
                onChange={handleChange}
                className="input"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="label">% Empresa *</label>
              <input
                type="number"
                name="percentualEmpresa"
                value={formData.percentualEmpresa}
                onChange={handleChange}
                className="input"
                placeholder="Ex: 30"
                required
              />
            </div>
            {formData.formaPagamento === 'Periodo' && (
              <>
                <div>
                  <label className="label">Periodicidade</label>
                  <select
                    name="periodicidade"
                    value={formData.periodicidade}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="">Selecione</option>
                    <option value="Diária">Diária</option>
                    <option value="Semanal">Semanal</option>
                    <option value="Quinzenal">Quinzenal</option>
                    <option value="Mensal">Mensal</option>
                  </select>
                </div>
                <div>
                  <label className="label">Valor Fixo</label>
                  <input
                    type="number"
                    step="0.01"
                    name="valorFixo"
                    value={formData.valorFixo}
                    onChange={handleChange}
                    className="input"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="label">Data Primeira Cobrança</label>
                  <input
                    type="date"
                    name="dataPrimeiraCobranca"
                    value={formData.dataPrimeiraCobranca}
                    onChange={handleChange}
                    className="input"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">🔧 Manutenção</h2>
          
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="trocaPano"
              checked={formData.trocaPano}
              onChange={handleChange}
              className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <div>
              <span className="font-medium text-slate-700">Troca de Pano / Manutenção Realizada</span>
              <p className="text-sm text-slate-500">Marque se foi realizada manutenção no momento da locação</p>
            </div>
          </label>
        </div>

        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">📝 Observações</h2>
          <textarea
            name="observacao"
            value={formData.observacao}
            onChange={handleChange}
            className="input min-h-[100px]"
            placeholder="Observações sobre a locação..."
          />
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
                Salvar Locação
              </>
            )}
          </button>
          <Link href="/locacoes" className="btn-secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
