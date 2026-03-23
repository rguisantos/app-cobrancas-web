'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import Header from '@/components/layout/header'

interface TipoProduto { id: string; nome: string }
interface DescricaoProduto { id: string; nome: string }
interface TamanhoProduto { id: string; nome: string }

export default function NovoProdutoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [tipos, setTipos] = useState<TipoProduto[]>([])
  const [descricoes, setDescricoes] = useState<DescricaoProduto[]>([])
  const [tamanhos, setTamanhos] = useState<TamanhoProduto[]>([])
  const [formData, setFormData] = useState({
    identificador: '',
    numeroRelogio: '',
    tipoId: '',
    tipoNome: '',
    descricaoId: '',
    descricaoNome: '',
    tamanhoId: '',
    tamanhoNome: '',
    conservacao: 'Boa',
    statusProduto: 'Ativo',
    observacao: ''
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/tipos-produto').then(res => res.json()),
      fetch('/api/descricoes-produto').then(res => res.json()),
      fetch('/api/tamanhos-produto').then(res => res.json())
    ])
      .then(([tiposData, descricoesData, tamanhosData]) => {
        setTipos(tiposData)
        setDescricoes(descricoesData)
        setTamanhos(tamanhosData)
      })
      .catch(console.error)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    // Handle dropdown changes that need to update both ID and name
    if (name === 'tipoId') {
      const selectedTipo = tipos.find(t => t.id === value)
      setFormData(prev => ({ 
        ...prev, 
        tipoId: value,
        tipoNome: selectedTipo?.nome || ''
      }))
    } else if (name === 'descricaoId') {
      const selectedDescricao = descricoes.find(d => d.id === value)
      setFormData(prev => ({ 
        ...prev, 
        descricaoId: value,
        descricaoNome: selectedDescricao?.nome || ''
      }))
    } else if (name === 'tamanhoId') {
      const selectedTamanho = tamanhos.find(t => t.id === value)
      setFormData(prev => ({ 
        ...prev, 
        tamanhoId: value,
        tamanhoNome: selectedTamanho?.nome || ''
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.tipoId || !formData.descricaoId || !formData.tamanhoId) {
      alert('Selecione o tipo, descrição e tamanho do produto')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        router.push('/produtos')
      } else {
        const error = await res.json()
        alert(error.error || 'Erro ao salvar produto')
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao salvar produto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Header
        title="Novo Produto"
        subtitle="Cadastrar um novo produto"
        actions={
          <Link href="/produtos" className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="max-w-4xl">
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">🎱 Identificação</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Número/Identificador *</label>
              <input
                name="identificador"
                value={formData.identificador}
                onChange={handleChange}
                className="input"
                placeholder="Ex: 515"
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
                placeholder="Ex: 8070"
                required
              />
            </div>
          </div>
        </div>

        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">📋 Características</h2>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Tipo *</label>
              <select
                name="tipoId"
                value={formData.tipoId}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Selecione o tipo</option>
                {tipos.map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Descrição *</label>
              <select
                name="descricaoId"
                value={formData.descricaoId}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Selecione a descrição</option>
                {descricoes.map(d => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Tamanho *</label>
              <select
                name="tamanhoId"
                value={formData.tamanhoId}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Selecione o tamanho</option>
                {tamanhos.map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="label">Conservação</label>
              <select
                name="conservacao"
                value={formData.conservacao}
                onChange={handleChange}
                className="input"
              >
                <option value="Ótima">Ótima</option>
                <option value="Boa">Boa</option>
                <option value="Regular">Regular</option>
                <option value="Ruim">Ruim</option>
                <option value="Péssima">Péssima</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select
                name="statusProduto"
                value={formData.statusProduto}
                onChange={handleChange}
                className="input"
              >
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
                <option value="Manutenção">Manutenção</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">📝 Observações</h2>
          <textarea
            name="observacao"
            value={formData.observacao}
            onChange={handleChange}
            className="input min-h-[100px]"
            placeholder="Observações sobre o produto..."
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
                Salvar Produto
              </>
            )}
          </button>
          <Link href="/produtos" className="btn-secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
