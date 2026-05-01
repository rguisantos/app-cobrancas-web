'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Search, Filter, ChevronLeft, ChevronRight,
  Plus, Pencil, Trash2, Loader2, FileText,
  Shield, User, Clock, TrendingUp, Activity,
  ArrowRightLeft, LogIn, LogOut, Wrench, MapPin,
  Package, DollarSign, RefreshCw, Monitor, Globe,
  AlertTriangle, Smartphone, Server, Zap, ChevronDown,
  ChevronUp, Eye, Hash, Fingerprint, ArrowDownUp,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ============================================================================
// TIPOS
// ============================================================================

interface DeviceInfo {
  browser: string
  os: string
  deviceType: 'Desktop' | 'Mobile' | 'Tablet' | 'API' | 'Desconhecido'
  display: string
}

interface DiffItem {
  campo: string
  valorAntes: any
  valorDepois: any
}

interface AuditLog {
  id: string
  usuarioId: string | null
  acao: string
  entidade: string
  entidadeId: string | null
  entidadeNome: string | null
  detalhes: Record<string, any> | null
  antes: Record<string, any> | null
  depois: Record<string, any> | null
  ip: string | null
  userAgent: string | null
  dispositivo: string | null
  severidade: string
  origem: string
  createdAt: string
  // Enriched
  acaoLabel: string
  entidadeLabel: string
  categoria: string
  categoriaLabel: string
  categoriaColor: string
  categoriaBg: string
  resumo: string
  usuarioNome: string
  usuarioEmail: string
  usuarioTipoPermissao: string
  deviceInfo: DeviceInfo
  diff: DiffItem[]
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

interface TopUsuario {
  usuarioId: string
  nome: string
  email: string
  count: number
}

interface Stats {
  totalMes: number
  totalHoje: number
  criticasHoje: number
  topAcoes: { acao: string; label: string; count: number }[]
  topUsuarios: TopUsuario[]
  porSeveridade: { severidade: string; count: number }[]
  porOrigem: { origem: string; count: number }[]
  porEntidade: { entidade: string; label: string; count: number }[]
}

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const ENTIDADES = [
  { value: '', label: 'Todas as entidades' },
  { value: 'usuario', label: 'Usuários' },
  { value: 'cliente', label: 'Clientes' },
  { value: 'produto', label: 'Produtos' },
  { value: 'locacao', label: 'Locações' },
  { value: 'cobranca', label: 'Cobranças' },
  { value: 'rota', label: 'Rotas' },
  { value: 'manutencao', label: 'Manutenções' },
  { value: 'tipoProduto', label: 'Tipos de Produto' },
  { value: 'descricaoProduto', label: 'Descrições de Produto' },
  { value: 'tamanhoProduto', label: 'Tamanhos de Produto' },
  { value: 'estabelecimento', label: 'Estabelecimentos' },
  { value: 'historicoRelogio', label: 'Histórico Relógio' },
  { value: 'sessao', label: 'Sessão' },
  { value: 'sistema', label: 'Sistema' },
  { value: 'sync', label: 'Sincronização' },
  { value: 'dispositivo', label: 'Dispositivo' },
  { value: 'meta', label: 'Meta' },
  { value: 'notificacao', label: 'Notificação' },
]

const CATEGORIAS = [
  { value: '', label: 'Todas as categorias' },
  { value: 'criar', label: 'Criação' },
  { value: 'editar', label: 'Edição' },
  { value: 'excluir', label: 'Exclusão' },
  { value: 'login', label: 'Autenticação' },
  { value: 'sistema', label: 'Sistema' },
  { value: 'sync', label: 'Sincronização' },
  { value: 'seguranca', label: 'Segurança' },
  { value: 'especial', label: 'Ação Especial' },
]

const SEVERIDADES = [
  { value: '', label: 'Todas' },
  { value: 'info', label: 'Info' },
  { value: 'aviso', label: 'Aviso' },
  { value: 'critico', label: 'Crítico' },
  { value: 'seguranca', label: 'Segurança' },
]

const ORIGENS = [
  { value: '', label: 'Todas' },
  { value: 'web', label: 'Web' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'sistema', label: 'Sistema' },
  { value: 'cron', label: 'Automático' },
]

const CATEGORIA_ICONS: Record<string, any> = {
  criar: Plus,
  editar: Pencil,
  excluir: Trash2,
  login: LogIn,
  sistema: Shield,
  sync: RefreshCw,
  especial: ArrowRightLeft,
  seguranca: AlertTriangle,
}

const SEVERIDADE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  info: { label: 'Info', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', icon: FileText },
  aviso: { label: 'Aviso', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: AlertTriangle },
  critico: { label: 'Crítico', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: Zap },
  seguranca: { label: 'Segurança', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', icon: Shield },
}

const ORIGEM_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  web: { label: 'Web', icon: Monitor, color: 'text-blue-500' },
  mobile: { label: 'Mobile', icon: Smartphone, color: 'text-green-500' },
  sistema: { label: 'Sistema', icon: Server, color: 'text-slate-500' },
  cron: { label: 'Automático', icon: Clock, color: 'text-orange-500' },
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function AuditoriaClient() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 0 })
  const [stats, setStats] = useState<Stats>({
    totalMes: 0, totalHoje: 0, criticasHoje: 0,
    topAcoes: [], topUsuarios: [],
    porSeveridade: [], porOrigem: [], porEntidade: [],
  })
  const [loading, setLoading] = useState(true)

  // Filters
  const [entidade, setEntidade] = useState('')
  const [acao, setAcao] = useState('')
  const [usuarioId, setUsuarioId] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [severidade, setSeveridade] = useState('')
  const [origem, setOrigem] = useState('')
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '50',
      })
      if (entidade) params.set('entidade', entidade)
      if (acao) params.set('acao', acao)
      if (usuarioId) params.set('usuarioId', usuarioId)
      if (dataInicio) params.set('dataInicio', dataInicio)
      if (dataFim) params.set('dataFim', dataFim)
      if (severidade) params.set('severidade', severidade)
      if (origem) params.set('origem', origem)

      const res = await fetch(`/api/auditoria?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
        setPagination(data.pagination || { page: 1, limit: 50, total: 0, pages: 0 })
        setStats(data.stats || { totalMes: 0, totalHoje: 0, criticasHoje: 0, topAcoes: [], topUsuarios: [], porSeveridade: [], porOrigem: [], porEntidade: [] })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, entidade, acao, usuarioId, dataInicio, dataFim, severidade, origem])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  function handleFilter() {
    setPagination(p => ({ ...p, page: 1 }))
  }

  function handleClearFilters() {
    setEntidade('')
    setAcao('')
    setUsuarioId('')
    setDataInicio('')
    setDataFim('')
    setSearchTerm('')
    setSeveridade('')
    setOrigem('')
    setPagination(p => ({ ...p, page: 1 }))
  }

  const hasFilters = entidade || acao || usuarioId || dataInicio || dataFim || searchTerm || severidade || origem

  // Client-side search filter
  const filteredLogs = searchTerm
    ? logs.filter(log =>
        log.resumo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entidadeLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.acaoLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.usuarioNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.entidadeNome && log.entidadeNome.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.entidadeId && log.entidadeId.includes(searchTerm)) ||
        (log.ip && log.ip.includes(searchTerm)) ||
        (log.dispositivo && log.dispositivo.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : logs

  return (
    <div className="space-y-6">
      {/* ================================================================ */}
      {/* DASHBOARD DE ESTATÍSTICAS                                       */}
      {/* ================================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600" />
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100">
                <Activity className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-emerald-600 font-medium">Ações Hoje</p>
                <p className="text-2xl font-bold text-emerald-700">{stats.totalHoje}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-blue-500 to-blue-600" />
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-100">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium">Últimos 30 dias</p>
                <p className="text-2xl font-bold text-blue-700">{stats.totalMes}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-purple-500 to-purple-600" />
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-100">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-purple-600 font-medium">Total Registros</p>
                <p className="text-2xl font-bold text-purple-700">{pagination.total}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className={`h-1.5 ${stats.criticasHoje > 0 ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-amber-500 to-amber-600'}`} />
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${stats.criticasHoje > 0 ? 'bg-red-100' : 'bg-amber-100'}`}>
                {stats.criticasHoje > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                ) : (
                  <Shield className="w-5 h-5 text-amber-600" />
                )}
              </div>
              <div>
                <p className={`text-xs font-medium ${stats.criticasHoje > 0 ? 'text-red-600' : 'text-amber-600'}`}>
                  {stats.criticasHoje > 0 ? 'Alertas Hoje' : 'Top Ação'}
                </p>
                {stats.criticasHoje > 0 ? (
                  <p className="text-2xl font-bold text-red-700">{stats.criticasHoje}</p>
                ) : (
                  <>
                    <p className="text-sm font-bold text-amber-700 truncate">
                      {stats.topAcoes[0]?.label || '—'}
                    </p>
                    <p className="text-xs text-amber-500">
                      {stats.topAcoes[0] ? `${stats.topAcoes[0].count} vezes` : ''}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Distribuição por Severidade e Origem */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top ações */}
        {stats.topAcoes.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" />
              Ações mais frequentes (30 dias)
            </h3>
            <div className="flex flex-wrap gap-2">
              {stats.topAcoes.map(ta => (
                <button
                  key={ta.acao}
                  type="button"
                  onClick={() => { setAcao(ta.acao.startsWith('criar') ? 'criar' : ta.acao.startsWith('editar') ? 'editar' : ta.acao.startsWith('excluir') ? 'excluir' : ta.acao); setPagination(p => ({ ...p, page: 1 })) }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    acao === ta.acao
                      ? 'bg-primary-50 border-primary-200 text-primary-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {ta.label}
                  <span className="bg-white rounded-full px-1.5 py-0.5 text-xs border border-slate-200">{ta.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Por Severidade */}
        {stats.porSeveridade.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              Por Severidade
            </h3>
            <div className="space-y-2">
              {stats.porSeveridade.map(ps => {
                const config = SEVERIDADE_CONFIG[ps.severidade] || SEVERIDADE_CONFIG.info
                const pct = stats.totalMes > 0 ? (ps.count / stats.totalMes) * 100 : 0
                return (
                  <div key={ps.severidade} className="flex items-center gap-2">
                    <span className={`text-xs font-medium w-16 ${config.color}`}>{config.label}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          ps.severidade === 'critico' ? 'bg-red-400' :
                          ps.severidade === 'seguranca' ? 'bg-purple-400' :
                          ps.severidade === 'aviso' ? 'bg-amber-400' : 'bg-slate-300'
                        }`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-8 text-right">{ps.count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Por Origem */}
        {stats.porOrigem.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" />
              Por Origem
            </h3>
            <div className="space-y-2">
              {stats.porOrigem.map(po => {
                const config = ORIGEM_CONFIG[po.origem] || ORIGEM_CONFIG.sistema
                const Icon = config.icon
                return (
                  <button
                    key={po.origem}
                    type="button"
                    onClick={() => { setOrigem(origem === po.origem ? '' : po.origem); setPagination(p => ({ ...p, page: 1 })) }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      origem === po.origem ? 'bg-primary-50 text-primary-700' : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${config.color}`} />
                    <span className="flex-1 text-left">{config.label}</span>
                    <span className="text-xs font-medium bg-slate-100 rounded-full px-2 py-0.5">{po.count}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Top Usuários */}
      {stats.topUsuarios.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <User className="w-3.5 h-3.5" />
            Usuários mais ativos (30 dias)
          </h3>
          <div className="flex flex-wrap gap-2">
            {stats.topUsuarios.map(tu => (
              <button
                key={tu.usuarioId}
                type="button"
                onClick={() => { setUsuarioId(usuarioId === tu.usuarioId ? '' : tu.usuarioId); setPagination(p => ({ ...p, page: 1 })) }}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  usuarioId === tu.usuarioId
                    ? 'bg-primary-50 border-primary-200 text-primary-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-primary-700">{tu.nome.charAt(0).toUpperCase()}</span>
                </div>
                {tu.nome}
                <span className="bg-white rounded-full px-1.5 py-0.5 text-xs border border-slate-200">{tu.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* FILTROS                                                         */}
      {/* ================================================================ */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {/* Barra de busca + toggle filtros */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por usuário, ação, entidade, IP, dispositivo..."
                className="w-full pl-9 text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border ${
                showFilters ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filtros
              {hasFilters && (
                <span className="bg-primary-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                  {[entidade, acao, usuarioId, dataInicio, dataFim, severidade, origem].filter(Boolean).length}
                </span>
              )}
              {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {hasFilters && (
              <button
                onClick={handleClearFilters}
                className="px-3 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Filtros avançados */}
        {showFilters && (
          <div className="px-4 pb-4 border-t border-slate-100">
            <div className="flex flex-wrap items-end gap-3 pt-3">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Entidade</label>
                <select
                  value={entidade}
                  onChange={e => setEntidade(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                >
                  {ENTIDADES.map(et => (
                    <option key={et.value} value={et.value}>{et.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Categoria</label>
                <select
                  value={acao}
                  onChange={e => setAcao(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                >
                  {CATEGORIAS.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Severidade</label>
                <select
                  value={severidade}
                  onChange={e => setSeveridade(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                >
                  {SEVERIDADES.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Origem</label>
                <select
                  value={origem}
                  onChange={e => setOrigem(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                >
                  {ORIGENS.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">De</label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={e => setDataInicio(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Até</label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={e => setDataFim(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                />
              </div>
              <button
                onClick={handleFilter}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 flex items-center gap-2 transition-colors"
              >
                <Filter className="w-4 h-4" />
                Filtrar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats line */}
      <div className="flex items-center gap-4 text-sm text-slate-500">
        <span>{pagination.total} registros encontrados</span>
        <span>•</span>
        <span>Página {pagination.page} de {pagination.pages || 1}</span>
        {hasFilters && <span>• <span className="text-primary-600 font-medium">Filtros ativos</span></span>}
      </div>

      {/* ================================================================ */}
      {/* LISTA DE LOGS                                                    */}
      {/* ================================================================ */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <span className="ml-3 text-slate-500">Carregando logs...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-16">
          <Shield className="w-14 h-14 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Nenhum registro de auditoria encontrado</p>
          <p className="text-sm text-slate-400 mt-1">Ajuste os filtros ou aguarde novas ações no sistema</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredLogs.map(log => {
              const CatIcon = CATEGORIA_ICONS[log.categoria] || ArrowRightLeft
              const isExpanded = expandedLog === log.id
              const sevConfig = SEVERIDADE_CONFIG[log.severidade] || SEVERIDADE_CONFIG.info
              const SevIcon = sevConfig.icon
              const origConfig = ORIGEM_CONFIG[log.origem] || ORIGEM_CONFIG.sistema
              const OrigIcon = origConfig.icon

              return (
                <div key={log.id}>
                  <button
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left"
                  >
                    {/* Ícone da categoria */}
                    <div className={`p-2 rounded-lg border ${log.categoriaBg}`}>
                      <CatIcon className={`w-4 h-4 ${log.categoriaColor}`} />
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-900">
                          {log.acaoLabel}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full border ${log.categoriaBg} ${log.categoriaColor}`}>
                          {log.entidadeLabel}
                        </span>
                        {log.entidadeNome && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            {log.entidadeNome}
                          </span>
                        )}
                        {/* Severidade badge */}
                        {log.severidade !== 'info' && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full border ${sevConfig.bg} ${sevConfig.color}`}>
                            {sevConfig.label}
                          </span>
                        )}
                        {/* Origem badge */}
                        <span className="flex items-center gap-0.5 text-xs text-slate-400">
                          <OrigIcon className={`w-3 h-3 ${origConfig.color}`} />
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {log.resumo}
                      </p>
                    </div>

                    {/* Usuário + Data */}
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <User className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">{log.usuarioNome}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5 justify-end">
                        <p title={format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}>
                          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    {/* Expand indicator */}
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Detalhes expandidos */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-slate-100 bg-slate-50/50">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3 text-sm">
                        <div>
                          <span className="text-xs text-slate-500 flex items-center gap-1"><User className="w-3 h-3" /> Usuário</span>
                          <p className="text-slate-700 font-medium">{log.usuarioNome}</p>
                          {log.usuarioEmail && <p className="text-xs text-slate-400">{log.usuarioEmail}</p>}
                          {log.usuarioTipoPermissao && <p className="text-xs text-slate-400">{log.usuarioTipoPermissao}</p>}
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Data/Hora</span>
                          <p className="text-slate-700">
                            {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 flex items-center gap-1"><Globe className="w-3 h-3" /> IP</span>
                          <p className="font-mono text-xs text-slate-700">{log.ip || '—'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 flex items-center gap-1"><Monitor className="w-3 h-3" /> Dispositivo</span>
                          <p className="text-xs text-slate-700">
                            {log.dispositivo || log.deviceInfo?.display || '—'}
                          </p>
                          {log.userAgent && (
                            <p className="text-[10px] text-slate-400 truncate max-w-[200px]" title={log.userAgent}>
                              {log.userAgent.substring(0, 60)}...
                            </p>
                          )}
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 flex items-center gap-1"><Fingerprint className="w-3 h-3" /> Detalhes</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full border ${sevConfig.bg} ${sevConfig.color}`}>
                              {sevConfig.label}
                            </span>
                            <span className="flex items-center gap-0.5 text-xs text-slate-500">
                              <OrigIcon className={`w-3 h-3 ${origConfig.color}`} />
                              {origConfig.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {log.entidadeId && (
                        <div className="mt-3">
                          <span className="text-xs text-slate-500 flex items-center gap-1"><Hash className="w-3 h-3" /> ID da Entidade</span>
                          <p className="font-mono text-xs text-slate-700 bg-white rounded px-2 py-1 border border-slate-200 inline-block mt-0.5">
                            {log.entidadeId}
                          </p>
                        </div>
                      )}

                      {/* Diff antes/depois */}
                      {log.diff && log.diff.length > 0 && (
                        <div className="mt-3">
                          <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                            <ArrowDownUp className="w-3 h-3" /> Alterações
                          </span>
                          <div className="mt-1 bg-white rounded-lg border border-slate-200 overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                  <th className="text-left px-3 py-1.5 text-slate-500 font-medium">Campo</th>
                                  <th className="text-left px-3 py-1.5 text-slate-500 font-medium">Antes</th>
                                  <th className="text-left px-3 py-1.5 text-slate-500 font-medium">Depois</th>
                                </tr>
                              </thead>
                              <tbody>
                                {log.diff.map((d, i) => (
                                  <tr key={i} className="border-b border-slate-100 last:border-0">
                                    <td className="px-3 py-1.5 font-medium text-slate-700">{d.campo}</td>
                                    <td className="px-3 py-1.5 text-red-600/70 line-through">
                                      {d.valorAntes === null || d.valorAntes === undefined ? '—' : String(d.valorAntes)}
                                    </td>
                                    <td className="px-3 py-1.5 text-emerald-600 font-medium">
                                      {d.valorDepois === null || d.valorDepois === undefined ? '—' : String(d.valorDepois)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Detalhes adicionais (JSON) */}
                      {log.detalhes && Object.keys(log.detalhes).length > 0 && (
                        <div className="mt-3">
                          <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                            <Eye className="w-3 h-3" /> Informações Adicionais
                          </span>
                          <div className="mt-1 bg-white rounded-lg border border-slate-200 p-3 overflow-x-auto">
                            <pre className="text-xs text-slate-700 whitespace-pre-wrap">
                              {JSON.stringify(log.detalhes, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Snapshots completos antes/depois (colapsáveis) */}
                      {(log.antes || log.depois) && (!log.diff || log.diff.length === 0) && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                          {log.antes && (
                            <div>
                              <span className="text-xs font-medium text-red-600 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-red-400" /> Antes
                              </span>
                              <div className="mt-1 bg-white rounded-lg border border-slate-200 p-2 overflow-x-auto">
                                <pre className="text-[10px] text-slate-600 whitespace-pre-wrap">
                                  {JSON.stringify(log.antes, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                          {log.depois && (
                            <div>
                              <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Depois
                              </span>
                              <div className="mt-1 bg-white rounded-lg border border-slate-200 p-2 overflow-x-auto">
                                <pre className="text-[10px] text-slate-600 whitespace-pre-wrap">
                                  {JSON.stringify(log.depois, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* PAGINAÇÃO                                                       */}
      {/* ================================================================ */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">
            Mostrando <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span>–
            <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> de{' '}
            <span className="font-medium">{pagination.total}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={pagination.page <= 1}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors border border-slate-200"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <span className="text-sm text-slate-600 flex items-center px-2">
              {pagination.page} / {pagination.pages}
            </span>
            <button
              onClick={() => setPagination(p => ({ ...p, page: Math.min(p.pages, p.page + 1) }))}
              disabled={pagination.page >= pagination.pages}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors border border-slate-200"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
