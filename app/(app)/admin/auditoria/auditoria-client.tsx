'use client'

import { useEffect, useState } from 'react'
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  FileText,
  Smartphone,
  RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AuditLog {
  id: string
  entityId: string
  entityType: string
  operation: string
  changes: Record<string, any>
  timestamp: string
  deviceId: string
  synced: boolean
  entityLabel: string
  operationLabel: string
  summary: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

const OPERATION_STYLES: Record<string, { icon: any; bg: string; text: string }> = {
  create: { icon: Plus, bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  update: { icon: Pencil, bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
  delete: { icon: Trash2, bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
}

const ENTITY_TYPES = [
  { value: '', label: 'Todas as entidades' },
  { value: 'cliente', label: 'Clientes' },
  { value: 'produto', label: 'Produtos' },
  { value: 'locacao', label: 'Locações' },
  { value: 'cobranca', label: 'Cobranças' },
  { value: 'rota', label: 'Rotas' },
  { value: 'usuario', label: 'Usuários' },
  { value: 'manutencao', label: 'Manutenções' },
  { value: 'historicoRelogio', label: 'Histórico Relógio' },
  { value: 'tipoProduto', label: 'Tipos de Produto' },
  { value: 'descricaoProduto', label: 'Descrições de Produto' },
  { value: 'tamanhoProduto', label: 'Tamanhos de Produto' },
  { value: 'estabelecimento', label: 'Estabelecimentos' },
]

const OPERATIONS = [
  { value: '', label: 'Todas as operações' },
  { value: 'create', label: 'Criação' },
  { value: 'update', label: 'Atualização' },
  { value: 'delete', label: 'Exclusão' },
]

export default function AuditoriaClient() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)

  // Filters
  const [entityType, setEntityType] = useState('')
  const [operation, setOperation] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, entityType, operation])

  async function fetchLogs() {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '50',
      })
      if (entityType) params.set('entityType', entityType)
      if (operation) params.set('operation', operation)
      if (dataInicio) params.set('dataInicio', dataInicio)
      if (dataFim) params.set('dataFim', dataFim)

      const res = await fetch(`/api/auditoria?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
        setPagination(data.pagination || { page: 1, limit: 50, total: 0, pages: 0 })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleFilter() {
    setPagination(p => ({ ...p, page: 1 }))
    fetchLogs()
  }

  const filteredLogs = searchTerm
    ? logs.filter(log =>
        log.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entityLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entityId.includes(searchTerm) ||
        log.deviceId.includes(searchTerm)
      )
    : logs

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Buscar</label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por entidade, ID, resumo..."
                className="w-full pl-9 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Entidade</label>
            <select
              value={entityType}
              onChange={e => setEntityType(e.target.value)}
              className="mt-1 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
            >
              {ENTITY_TYPES.map(et => (
                <option key={et.value} value={et.value}>{et.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Operação</label>
            <select
              value={operation}
              onChange={e => setOperation(e.target.value)}
              className="mt-1 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
            >
              {OPERATIONS.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">De</label>
            <input
              type="date"
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              className="mt-1 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Até</label>
            <input
              type="date"
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              className="mt-1 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
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

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
        <span>{pagination.total} registros encontrados</span>
        <span>•</span>
        <span>Página {pagination.page} de {pagination.pages || 1}</span>
      </div>

      {/* Logs list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Nenhum registro de auditoria encontrado</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredLogs.map(log => {
              const opStyle = OPERATION_STYLES[log.operation] || OPERATION_STYLES.update
              const OpIcon = opStyle.icon
              const isExpanded = expandedLog === log.id

              return (
                <div key={log.id}>
                  <button
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors text-left"
                  >
                    <div className={`p-2 rounded-lg ${opStyle.bg}`}>
                      <OpIcon className={`w-4 h-4 ${opStyle.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {log.entityLabel}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${opStyle.bg} ${opStyle.text}`}>
                          {log.operationLabel}
                        </span>
                        {log.synced && (
                          <span className="text-xs text-green-500 flex items-center gap-0.5">
                            <RefreshCw className="w-3 h-3" /> synced
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {log.summary}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {format(new Date(log.timestamp), "dd/MM/yyyy HH:mm")}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        <Smartphone className="w-3 h-3" />
                        <span className="truncate max-w-[100px]">{log.deviceId || 'Web'}</span>
                      </div>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                        <div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">ID da Entidade</span>
                          <p className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate">{log.entityId}</p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">Tipo</span>
                          <p className="text-slate-700 dark:text-slate-300">{log.entityType}</p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">Dispositivo</span>
                          <p className="font-mono text-xs text-slate-700 dark:text-slate-300">{log.deviceId || 'Web'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">Data/Hora</span>
                          <p className="text-slate-700 dark:text-slate-300">
                            {format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <div className="mt-3">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Alterações:</span>
                          <div className="mt-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 overflow-x-auto">
                            <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                              {JSON.stringify(log.changes, null, 2)}
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

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
            disabled={pagination.page <= 1}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {pagination.page} / {pagination.pages}
          </span>
          <button
            onClick={() => setPagination(p => ({ ...p, page: Math.min(p.pages, p.page + 1) }))}
            disabled={pagination.page >= pagination.pages}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      )}
    </div>
  )
}
