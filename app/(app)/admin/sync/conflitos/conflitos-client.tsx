'use client'

import { useState, useCallback } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Header from '@/components/layout/header'
import {
  AlertTriangle,
  CheckCircle2,
  Users,
  Package,
  FileText,
  DollarSign,
  Database,
  MapPin,
  Filter,
  ArrowLeft,
  ArrowRight,
  Edit3,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
  X,
  Save,
  Monitor,
  Smartphone,
} from 'lucide-react'
import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────────────────
interface Conflito {
  id: string
  entityId: string
  entityType: string
  localVersion: any
  remoteVersion: any
  conflictType: string
  createdAt: string
  resolving?: boolean
}

interface ConflitosClientProps {
  initialConflitos: Conflito[]
  totalResolvidos: number
}

// ── Entity Labels ──────────────────────────────────────────────────────
const ENTITY_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; darkColor: string }> = {
  cliente: { label: 'Cliente', icon: Users, color: 'bg-blue-100 text-blue-700', darkColor: 'dark:bg-blue-900/30 dark:text-blue-400' },
  produto: { label: 'Produto', icon: Package, color: 'bg-purple-100 text-purple-700', darkColor: 'dark:bg-purple-900/30 dark:text-purple-400' },
  locacao: { label: 'Locação', icon: FileText, color: 'bg-green-100 text-green-700', darkColor: 'dark:bg-green-900/30 dark:text-green-400' },
  cobranca: { label: 'Cobrança', icon: DollarSign, color: 'bg-amber-100 text-amber-700', darkColor: 'dark:bg-amber-900/30 dark:text-amber-400' },
  usuario: { label: 'Usuário', icon: Users, color: 'bg-pink-100 text-pink-700', darkColor: 'dark:bg-pink-900/30 dark:text-pink-400' },
  rota: { label: 'Rota', icon: MapPin, color: 'bg-cyan-100 text-cyan-700', darkColor: 'dark:bg-cyan-900/30 dark:text-cyan-400' },
}

const CONFLICT_TYPE_LABELS: Record<string, string> = {
  update: 'Conflito de atualização',
  update_conflict: 'Conflito de atualização',
  delete: 'Conflito de exclusão',
  delete_conflict: 'Conflito de exclusão',
}

// ── Diff Utility ───────────────────────────────────────────────────────
function getDifferences(local: Record<string, any>, remote: Record<string, any>): string[] {
  const allKeys = new Set([...Object.keys(local || {}), ...Object.keys(remote || {})])
  const diffKeys: string[] = []
  
  // Skip system/sync fields
  const skipFields = new Set(['id', 'createdAt', 'updatedAt', 'syncStatus', 'lastSyncedAt', 'needsSync', 'version', 'deviceId', 'deletedAt', 'senha'])
  
  allKeys.forEach(key => {
    if (skipFields.has(key)) return
    const localVal = JSON.stringify(local?.[key])
    const remoteVal = JSON.stringify(remote?.[key])
    if (localVal !== remoteVal) diffKeys.push(key)
  })
  
  return diffKeys
}

// Fields that are user-friendly to show
const FIELD_LABELS: Record<string, string> = {
  tipoPessoa: 'Tipo Pessoa',
  identificador: 'Identificador',
  cpf: 'CPF',
  rg: 'RG',
  nomeCompleto: 'Nome Completo',
  cnpj: 'CNPJ',
  razaoSocial: 'Razão Social',
  nomeFantasia: 'Nome Fantasia',
  nomeExibicao: 'Nome de Exibição',
  email: 'E-mail',
  telefonePrincipal: 'Telefone',
  cep: 'CEP',
  logradouro: 'Logradouro',
  numero: 'Número',
  complemento: 'Complemento',
  bairro: 'Bairro',
  cidade: 'Cidade',
  estado: 'Estado',
  rotaId: 'Rota',
  rotaNome: 'Nome da Rota',
  status: 'Status',
  observacao: 'Observação',
  numeroRelogio: 'Nº Relógio',
  tipoNome: 'Tipo',
  descricaoNome: 'Descrição',
  tamanhoNome: 'Tamanho',
  conservacao: 'Conservação',
  statusProduto: 'Status Produto',
  estabelecimento: 'Estabelecimento',
  clienteNome: 'Cliente',
  produtoIdentificador: 'Produto',
  produtoTipo: 'Tipo Produto',
  dataLocacao: 'Data Locação',
  dataFim: 'Data Fim',
  formaPagamento: 'Forma Pagamento',
  precoFicha: 'Preço Ficha',
  percentualEmpresa: '% Empresa',
  percentualCliente: '% Cliente',
  periodicidade: 'Periodicidade',
  valorFixo: 'Valor Fixo',
  dataInicio: 'Data Início',
  dataPagamento: 'Data Pagamento',
  relogioAnterior: 'Relógio Anterior',
  relogioAtual: 'Relógio Atual',
  fichasRodadas: 'Fichas Rodadas',
  valorFicha: 'Valor Ficha',
  totalBruto: 'Total Bruto',
  descontoDinheiro: 'Desconto (R$)',
  subtotalAposDescontos: 'Subtotal',
  valorPercentual: 'Valor Percentual',
  totalClientePaga: 'Total Cliente',
  valorRecebido: 'Valor Recebido',
  saldoDevedorGerado: 'Saldo Devedor',
  dataVencimento: 'Data Vencimento',
  descricao: 'Descrição',
  nome: 'Nome',
  tipo: 'Tipo',
}

function formatFieldValue(value: any): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'number') return value.toLocaleString('pt-BR')
  return String(value)
}

// ── Component ──────────────────────────────────────────────────────────
export default function ConflitosClient({ initialConflitos, totalResolvidos }: ConflitosClientProps) {
  const [conflitos, setConflitos] = useState<Conflito[]>(initialConflitos)
  const [filterEntityType, setFilterEntityType] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [manualEditId, setManualEditId] = useState<string | null>(null)
  const [manualData, setManualData] = useState<Record<string, any>>({})
  const [error, setError] = useState<string | null>(null)
  const [resolutionLoading, setResolutionLoading] = useState<string | null>(null)

  // Filter conflicts
  const filteredConflitos = filterEntityType === 'all'
    ? conflitos
    : conflitos.filter(c => c.entityType === filterEntityType)

  // Entity type options from current conflicts
  const entityTypes = Array.from(new Set(conflitos.map(c => c.entityType)))

  // Resolve conflict
  const resolveConflict = useCallback(async (
    conflitoId: string, 
    estrategia: 'local' | 'remote' | 'newest' | 'manual',
    versaoFinal?: Record<string, any>
  ) => {
    setResolutionLoading(conflitoId)
    setError(null)

    try {
      const res = await fetch('/api/admin/sync/conflict/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conflitoId,
          estrategia,
          versaoFinal: estrategia === 'manual' ? versaoFinal : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao resolver conflito')
        return
      }

      // Animate removal
      setConflitos(prev => prev.map(c => 
        c.id === conflitoId ? { ...c, resolving: true } : c
      ))

      // Remove after animation
      setTimeout(() => {
        setConflitos(prev => prev.filter(c => c.id !== conflitoId))
        setManualEditId(null)
        setManualData({})
      }, 400)

    } catch (err) {
      setError('Erro de conexão ao resolver conflito')
    } finally {
      setResolutionLoading(null)
    }
  }, [])

  // Start manual edit
  const startManualEdit = (conflito: Conflito) => {
    const local = conflito.localVersion as Record<string, any> || {}
    const diffKeys = getDifferences(local, conflito.remoteVersion as Record<string, any> || {})
    
    // Start with local version as base
    const initialData: Record<string, any> = {}
    diffKeys.forEach(key => {
      initialData[key] = local[key] ?? ''
    })
    
    setManualData(initialData)
    setManualEditId(conflito.id)
  }

  return (
    <div>
      <Header
        title="Conflitos de Sincronização"
        subtitle="Resolva conflitos entre versões locais e remotas dos dados"
        actions={
          <Link
            href="/admin/sync"
            className="btn-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Monitor
          </Link>
        }
      />

      {/* Error message */}
      {error && (
        <div className="alert-danger mb-4">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center dark:bg-red-900/30">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{conflitos.length}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pendentes</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center dark:bg-green-900/30">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalResolvidos}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Resolvidos</p>
            </div>
          </div>
        </div>
        <div className="card p-4 col-span-2 md:col-span-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center dark:bg-blue-900/30">
              <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <select
                value={filterEntityType}
                onChange={(e) => setFilterEntityType(e.target.value)}
                className="input text-sm py-1.5"
              >
                <option value="all">Todos os tipos</option>
                {entityTypes.map(type => {
                  const config = ENTITY_CONFIG[type]
                  return (
                    <option key={type} value={type}>
                      {config?.label || type} ({conflitos.filter(c => c.entityType === type).length})
                    </option>
                  )
                })}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Conflict List */}
      {filteredConflitos.length === 0 ? (
        <div className="card p-12">
          <div className="empty-state">
            <div className="empty-state-icon">
              <CheckCircle2 className="w-8 h-8 text-green-500 dark:text-green-400" />
            </div>
            <p className="font-medium text-slate-700 dark:text-slate-300">
              {conflitos.length === 0 ? 'Nenhum conflito pendente' : 'Nenhum conflito para este filtro'}
            </p>
            <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
              {conflitos.length === 0 
                ? 'Todos os dados estão sincronizados corretamente' 
                : 'Tente selecionar outro tipo de entidade'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredConflitos.map(conflito => {
            const config = ENTITY_CONFIG[conflito.entityType] || { label: conflito.entityType, icon: Database, color: 'bg-gray-100 text-gray-700', darkColor: 'dark:bg-gray-800 dark:text-gray-400' }
            const Icon = config.icon
            const isExpanded = expandedId === conflito.id
            const isManualEditing = manualEditId === conflito.id
            const isResolving = conflito.resolving
            const isLoading = resolutionLoading === conflito.id

            const local = (conflito.localVersion as Record<string, any>) || {}
            const remote = (conflito.remoteVersion as Record<string, any>) || {}
            const diffKeys = getDifferences(local, remote)

            return (
              <div
                key={conflito.id}
                className={`card overflow-hidden transition-all duration-300 ${
                  isResolving ? 'slide-out' : ''
                }`}
              >
                {/* Conflict Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : conflito.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config.color} ${config.darkColor}`}>
                        <Icon className="w-4 h-4" />
                        {config.label}
                      </span>
                      <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg dark:text-amber-400 dark:bg-amber-900/30">
                        {CONFLICT_TYPE_LABELS[conflito.conflictType] || conflito.conflictType}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(conflito.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-600 font-bold dark:text-red-400">
                        {diffKeys.length} {diffKeys.length === 1 ? 'diferença' : 'diferenças'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs font-mono text-slate-500 mt-2 bg-slate-50 px-2 py-1 rounded dark:bg-slate-700 dark:text-slate-400">
                    ID: {conflito.entityId}
                  </p>
                </div>

                {/* Expanded Detail */}
                {isExpanded && !isResolving && (
                  <div className="border-t border-slate-100 dark:border-slate-700 fade-in">
                    {/* Side-by-side comparison */}
                    <div className="p-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Local Version */}
                        <div className="rounded-xl border border-blue-200 dark:border-blue-800 overflow-hidden">
                          <div className="bg-blue-50 px-4 py-2.5 flex items-center gap-2 border-b border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                            <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">Versão Local</span>
                          </div>
                          <div className="p-4 space-y-2 bg-white dark:bg-slate-800">
                            {diffKeys.length > 0 ? diffKeys.map(key => {
                              const isDiff = JSON.stringify(local[key]) !== JSON.stringify(remote[key])
                              return (
                                <div key={key} className={`rounded-lg p-2 text-sm ${isDiff ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                                    {FIELD_LABELS[key] || key}
                                  </p>
                                  <p className={`font-medium ${isDiff ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {formatFieldValue(local[key])}
                                  </p>
                                </div>
                              )
                            }) : (
                              <p className="text-sm text-slate-500 dark:text-slate-400">Sem campos para comparação</p>
                            )}
                          </div>
                        </div>

                        {/* Remote Version */}
                        <div className="rounded-xl border border-purple-200 dark:border-purple-800 overflow-hidden">
                          <div className="bg-purple-50 px-4 py-2.5 flex items-center gap-2 border-b border-purple-200 dark:bg-purple-900/20 dark:border-purple-800">
                            <Monitor className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span className="text-sm font-semibold text-purple-700 dark:text-purple-400">Versão Remota</span>
                          </div>
                          <div className="p-4 space-y-2 bg-white dark:bg-slate-800">
                            {diffKeys.length > 0 ? diffKeys.map(key => {
                              const isDiff = JSON.stringify(local[key]) !== JSON.stringify(remote[key])
                              return (
                                <div key={key} className={`rounded-lg p-2 text-sm ${isDiff ? 'bg-purple-50 dark:bg-purple-900/20' : ''}`}>
                                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                                    {FIELD_LABELS[key] || key}
                                  </p>
                                  <p className={`font-medium ${isDiff ? 'text-purple-700 dark:text-purple-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {formatFieldValue(remote[key])}
                                  </p>
                                </div>
                              )
                            }) : (
                              <p className="text-sm text-slate-500 dark:text-slate-400">Sem campos para comparação</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Raw JSON toggle */}
                    <RawJsonToggle local={local} remote={remote} />

                    {/* Resolution Actions */}
                    <div className="p-4 pt-0">
                      {isManualEditing ? (
                        <ManualResolutionForm
                          diffKeys={diffKeys}
                          local={local}
                          remote={remote}
                          manualData={manualData}
                          setManualData={setManualData}
                          onResolve={() => resolveConflict(conflito.id, 'manual', manualData)}
                          onCancel={() => { setManualEditId(null); setManualData({}) }}
                          isLoading={isLoading}
                        />
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => resolveConflict(conflito.id, 'local')}
                            disabled={isLoading}
                            className="btn-secondary text-blue-700 border-blue-300 hover:bg-blue-50 hover:border-blue-400 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/20"
                          >
                            <Smartphone className="w-4 h-4" />
                            Usar Local
                          </button>
                          <button
                            onClick={() => resolveConflict(conflito.id, 'remote')}
                            disabled={isLoading}
                            className="btn-secondary text-purple-700 border-purple-300 hover:bg-purple-50 hover:border-purple-400 dark:text-purple-400 dark:border-purple-700 dark:hover:bg-purple-900/20"
                          >
                            <Monitor className="w-4 h-4" />
                            Usar Remoto
                          </button>
                          <button
                            onClick={() => resolveConflict(conflito.id, 'newest')}
                            disabled={isLoading}
                            className="btn-secondary text-green-700 border-green-300 hover:bg-green-50 hover:border-green-400 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/20"
                          >
                            <Zap className="w-4 h-4" />
                            Usar Mais Recente
                          </button>
                          <button
                            onClick={() => startManualEdit(conflito)}
                            disabled={isLoading}
                            className="btn-secondary text-amber-700 border-amber-300 hover:bg-amber-50 hover:border-amber-400 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-900/20"
                          >
                            <Edit3 className="w-4 h-4" />
                            Resolução Manual
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Raw JSON Toggle ────────────────────────────────────────────────────
function RawJsonToggle({ local, remote }: { local: Record<string, any>; remote: Record<string, any> }) {
  const [show, setShow] = useState(false)
  
  return (
    <div className="px-4 pb-2">
      <button
        onClick={() => setShow(!show)}
        className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 flex items-center gap-1 transition-colors"
      >
        {show ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {show ? 'Ocultar' : 'Mostrar'} JSON bruto
      </button>
      {show && (
        <div className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-2 fade-in">
          <pre className="text-xs bg-slate-50 p-3 rounded-lg overflow-auto max-h-48 border border-slate-100 dark:bg-slate-900 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            {JSON.stringify(local, null, 2)}
          </pre>
          <pre className="text-xs bg-slate-50 p-3 rounded-lg overflow-auto max-h-48 border border-slate-100 dark:bg-slate-900 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            {JSON.stringify(remote, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// ── Manual Resolution Form ─────────────────────────────────────────────
function ManualResolutionForm({
  diffKeys,
  local,
  remote,
  manualData,
  setManualData,
  onResolve,
  onCancel,
  isLoading,
}: {
  diffKeys: string[]
  local: Record<string, any>
  remote: Record<string, any>
  manualData: Record<string, any>
  setManualData: (data: Record<string, any>) => void
  onResolve: () => void
  onCancel: () => void
  isLoading: boolean
}) {
  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800 p-4 bg-amber-50/50 dark:bg-amber-900/10">
      <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-3 flex items-center gap-2">
        <Edit3 className="w-4 h-4" />
        Resolução Manual — Edite os campos abaixo
      </h4>
      <div className="space-y-3">
        {diffKeys.map(key => (
          <div key={key}>
            <label className="label text-xs">
              {FIELD_LABELS[key] || key}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setManualData({ ...manualData, [key]: local[key] ?? '' })}
                className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 whitespace-nowrap"
                title="Usar valor local"
              >
                Local: {formatFieldValue(local[key])}
              </button>
              <button
                type="button"
                onClick={() => setManualData({ ...manualData, [key]: remote[key] ?? '' })}
                className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 whitespace-nowrap"
                title="Usar valor remoto"
              >
                Remoto: {formatFieldValue(remote[key])}
              </button>
            </div>
            <input
              type="text"
              value={formatFieldValue(manualData[key])}
              onChange={(e) => setManualData({ ...manualData, [key]: e.target.value })}
              className="input mt-1 text-sm"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={onResolve}
          disabled={isLoading}
          className="btn-primary flex items-center gap-2"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Salvar Resolução
        </button>
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="btn-ghost"
        >
          <X className="w-4 h-4" />
          Cancelar
        </button>
      </div>
    </div>
  )
}
