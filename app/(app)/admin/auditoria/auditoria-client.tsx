'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Search, Filter, ChevronLeft, ChevronRight,
  Plus, Pencil, Trash2, Loader2, FileText,
  Shield, User, Clock, TrendingUp, Activity,
  ArrowRightLeft, LogIn, LogOut, Wrench, MapPin,
  Package, DollarSign, RefreshCw, Monitor, Globe,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ============================================================================
// TIPOS
// ============================================================================

interface AuditLog {
  id: string
  usuarioId: string | null
  acao: string
  entidade: string
  entidadeId: string | null
  detalhes: Record<string, any> | null
  ip: string | null
  userAgent: string | null
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
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

interface Stats {
  totalMes: number
  totalHoje: number
  topAcoes: { acao: string; label: string; count: number }[]
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
]

const CATEGORIAS = [
  { value: '', label: 'Todas as categorias' },
  { value: 'criar', label: 'Criação' },
  { value: 'editar', label: 'Edição' },
  { value: 'excluir', label: 'Exclusão' },
  { value: 'login', label: 'Autenticação' },
  { value: 'sistema', label: 'Sistema' },
  { value: 'sync', label: 'Sincronização' },
  { value: 'especial', label: 'Ação Especial' },
]

const CATEGORIA_ICONS: Record<string, any> = {
  criar: Plus,
  editar: Pencil,
  excluir: Trash2,
  login: LogIn,
  sistema: Shield,
  sync: RefreshCw,
  especial: ArrowRightLeft,
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function AuditoriaClient() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 0 })
  const [stats, setStats] = useState<Stats>({ totalMes: 0, totalHoje: 0, topAcoes: [] })
  const [loading, setLoading] = useState(true)

  // Filters
  const [entidade, setEntidade] = useState('')
  const [acao, setAcao] = useState('')
  const [usuarioId, setUsuarioId] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

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

      const res = await fetch(`/api/auditoria?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
        setPagination(data.pagination || { page: 1, limit: 50, total: 0, pages: 0 })
        setStats(data.stats || { totalMes: 0, totalHoje: 0, topAcoes: [] })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, entidade, acao, usuarioId, dataInicio, dataFim])

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
    setPagination(p => ({ ...p, page: 1 }))
  }

  const hasFilters = entidade || acao || usuarioId || dataInicio || dataFim || searchTerm

  // Client-side search filter
  const filteredLogs = searchTerm
    ? logs.filter(log =>
        log.resumo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entidadeLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.acaoLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.usuarioNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.entidadeId && log.entidadeId.includes(searchTerm)) ||
        (log.ip && log.ip.includes(searchTerm))
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
          <div className="h-1.5 bg-gradient-to-r from-amber-500 to-amber-600" />
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-amber-600 font-medium">Top Ação</p>
                <p className="text-sm font-bold text-amber-700 truncate">
                  {stats.topAcoes[0]?.label || '—'}
                </p>
                <p className="text-xs text-amber-500">
                  {stats.topAcoes[0] ? `${stats.topAcoes[0].count} vezes` : ''}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top ações rápida */}
      {stats.topAcoes.length > 1 && (
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
                onClick={() => { setAcao(ta.acao); setPagination(p => ({ ...p, page: 1 })) }}
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

      {/* ================================================================ */}
      {/* FILTROS                                                         */}
      {/* ================================================================ */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Usuário, ação, entidade, IP..."
                className="w-full pl-9 text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Entidade</label>
            <select
              value={entidade}
              onChange={e => setEntidade(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
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
              className="text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
            >
              {CATEGORIAS.map(op => (
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
              className="text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Até</label>
            <input
              type="date"
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
            />
          </div>
          <button
            onClick={handleFilter}
            className="px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 flex items-center gap-2 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filtrar
          </button>
          {hasFilters && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Stats line */}
      <div className="flex items-center gap-4 text-sm text-slate-500">
        <span>{pagination.total} registros encontrados</span>
        <span>•</span>
        <span>Página {pagination.page} de {pagination.pages || 1}</span>
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
                      <p className="text-xs text-slate-400 mt-0.5" title={format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}>
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </button>

                  {/* Detalhes expandidos */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-slate-100 bg-slate-50/50">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                        <div>
                          <span className="text-xs text-slate-500 flex items-center gap-1"><User className="w-3 h-3" /> Usuário</span>
                          <p className="text-slate-700 font-medium">{log.usuarioNome}</p>
                          {log.usuarioEmail && <p className="text-xs text-slate-400">{log.usuarioEmail}</p>}
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
                          <p className="text-xs text-slate-700 truncate" title={log.userAgent || ''}>
                            {log.userAgent ? (
                              log.userAgent.includes('Mobile') ? '📱 Mobile' :
                              log.userAgent.includes('Postman') ? '🔧 API' :
                              '💻 Desktop'
                            ) : '—'}
                          </p>
                        </div>
                      </div>

                      {log.entidadeId && (
                        <div className="mt-3">
                          <span className="text-xs text-slate-500">ID da Entidade</span>
                          <p className="font-mono text-xs text-slate-700 bg-white rounded px-2 py-1 border border-slate-200 inline-block mt-0.5">
                            {log.entidadeId}
                          </p>
                        </div>
                      )}

                      {log.detalhes && Object.keys(log.detalhes).length > 0 && (
                        <div className="mt-3">
                          <span className="text-xs font-medium text-slate-600">Detalhes:</span>
                          <div className="mt-1 bg-white rounded-lg border border-slate-200 p-3 overflow-x-auto">
                            <pre className="text-xs text-slate-700 whitespace-pre-wrap">
                              {JSON.stringify(log.detalhes, null, 2)}
                            </pre>
                          </div>
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
