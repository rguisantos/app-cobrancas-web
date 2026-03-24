'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import Header from '@/components/layout/header'

interface Cliente { 
  id: string
  nomeExibicao: string 
}
interface Produto { 
  id: string
  identificador: string
  tipoNome: string
  descricaoNome: string
  numeroRelogio: string
  statusProduto: string 
}

const FORMA_OPTS = [
  { value: 'PercentualReceber', label: '% Receber', icon: '📈' },
  { value: 'PercentualPagar', label: '% Pagar', icon: '📉' },
  { value: 'Periodo', label: 'Período', icon: '📅' },
]

const PERIODICIDADES = ['Mensal', 'Semanal', 'Quinzenal', 'Diária']

export default function NovaLocacaoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clienteIdPreSelect = searchParams.get('clienteId')
  
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  
  const [formData, setFormData] = useState({
    clienteId: clienteIdPreSelect || '',
    produtoId: '',
    produtoIdentificador: '',
    produtoTipo: '',
    numeroRelogio: '',
    dataLocacao: new Date().toISOString().split('T')[0],
    formaPagamento: 'PercentualReceber' as 'Periodo' | 'PercentualPagar' | 'PercentualReceber',
    precoFicha: '',
    percentualEmpresa: '50',
    periodicidade: '',
    valorFixo: '',
    dataPrimeiraCobranca: '',
    trocaPano: false,
    observacao: ''
  })

  // Carregar dados iniciais
  useEffect(() => {
    Promise.all([
      fetch('/api/clientes?limit=1000&status=Ativo').then(res => res.json()),
      fetch('/api/produtos?disponiveis=true&limit=1000').then(res => res.json())
    ])
      .then(([clientesData, produtosData]) => {
        setClientes(clientesData.data || clientesData)
        setProdutos(produtosData.data || produtosData)
        setLoadingData(false)
      })
      .catch(console.error)
  }, [])

  // Calcula percentual do cliente automaticamente
  const percentualCliente = Math.max(0, 100 - (parseFloat(formData.percentualEmpresa) || 0))

  // Quando selecionar um produto, pré-preenche o número do relógio
  const handleProdutoChange = useCallback((produtoId: string) => {
    const produto = produtos.find(p => p.id === produtoId)
    if (produto) {
      setFormData(prev => ({
        ...prev,
        produtoId,
        produtoIdentificador: produto.identificador,
        produtoTipo: produto.tipoNome,
        numeroRelogio: produto.numeroRelogio || prev.numeroRelogio
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        produtoId,
        produtoIdentificador: '',
        produtoTipo: ''
      }))
    }
  }, [produtos])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    if (name === 'produtoId') {
      handleProdutoChange(value)
    } else {
      setFormData(prev => ({ 
        ...prev, 
        [name]: type === 'checkbox' ? checked : value 
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const cliente = clientes.find(c => c.id === formData.clienteId)
    
    if (!cliente || !formData.produtoId) {
      alert('Selecione um cliente e um produto')
      return
    }

    if (!formData.numeroRelogio.trim()) {
      alert('Informe o número do relógio')
      return
    }

    if (formData.formaPagamento !== 'Periodo') {
      if (!formData.precoFicha || parseFloat(formData.precoFicha) <= 0) {
        alert('Informe o preço da ficha')
        return
      }
      const pct = parseFloat(formData.percentualEmpresa)
      if (isNaN(pct) || pct < 0 || pct > 100) {
        alert('Percentual da empresa deve ser entre 0 e 100')
        return
      }
    } else {
      if (!formData.valorFixo || parseFloat(formData.valorFixo) <= 0) {
        alert('Informe o valor fixo')
        return
      }
      if (!formData.periodicidade) {
        alert('Selecione a periodicidade')
        return
      }
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
          produtoIdentificador: formData.produtoIdentificador,
          produtoTipo: formData.produtoTipo,
          dataLocacao: formData.dataLocacao,
          formaPagamento: formData.formaPagamento,
          numeroRelogio: formData.numeroRelogio,
          precoFicha: parseFloat(formData.precoFicha) || 0,
          percentualEmpresa: parseFloat(formData.percentualEmpresa) || 50,
          percentualCliente,
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

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    )
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
        {/* Produto */}
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">🎱 Produto</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Produto Disponível *</label>
              <select
                name="produtoId"
                value={formData.produtoId}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Selecione um produto disponível</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.tipoNome} N° {p.identificador} - {p.descricaoNome}
                  </option>
                ))}
              </select>
              {produtos.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Nenhum produto disponível para locação
                </p>
              )}
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

        {/* Cliente */}
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">👤 Cliente</h2>
          
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
          </div>
        </div>

        {/* Forma de Pagamento */}
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">💰 Forma de Pagamento</h2>
          
          <div className="flex gap-3 mb-4">
            {FORMA_OPTS.map(opt => (
              <label
                key={opt.value}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                  formData.formaPagamento === opt.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="formaPagamento"
                  value={opt.value}
                  checked={formData.formaPagamento === opt.value}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span>{opt.icon}</span>
                <span className="font-medium">{opt.label}</span>
              </label>
            ))}
          </div>

          {formData.formaPagamento !== 'Periodo' ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Preço da Ficha (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="precoFicha"
                    value={formData.precoFicha}
                    onChange={handleChange}
                    className="input"
                    placeholder="3,00"
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
                    placeholder="50"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="label">% Cliente (automático)</label>
                  <input
                    value={`${percentualCliente}%`}
                    className="input bg-slate-50"
                    disabled
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
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
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Periodicidade *</label>
                  <select
                    name="periodicidade"
                    value={formData.periodicidade}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="">Selecione</option>
                    {PERIODICIDADES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Valor Fixo (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="valorFixo"
                    value={formData.valorFixo}
                    onChange={handleChange}
                    className="input"
                    placeholder="150,00"
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
              </div>
            </>
          )}
        </div>

        {/* Manutenção */}
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

        {/* Observações */}
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
          <button type="submit" disabled={loading || !formData.produtoId} className="btn-primary">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
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
