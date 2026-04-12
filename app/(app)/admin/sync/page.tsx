import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/header'
import Badge from '@/components/ui/badge'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Smartphone, Wifi, WifiOff, AlertTriangle, CheckCircle2, Clock, Activity, RefreshCw, Database, Users, Package, FileText, DollarSign } from 'lucide-react'

export const metadata: Metadata = { title: 'Monitor de Sincronização' }

export default async function SyncPage() {
  const session = await getSession()
  if (!session?.user || session.user.tipoPermissao !== 'Administrador') redirect('/dashboard')

  const [conflitos, changelogs, dispositivos] = await Promise.all([
    prisma.syncConflict.findMany({ 
      where: { resolution: null }, 
      orderBy: { createdAt: 'desc' }, 
      take: 20 
    }),
    prisma.changeLog.findMany({ 
      orderBy: { timestamp: 'desc' }, 
      take: 50
    }),
    prisma.dispositivo.findMany({ 
      orderBy: { ultimaSincronizacao: 'desc' }
    }),
  ])

  // Criar mapa de dispositivos para lookup rápido
  const dispositivosMap = new Map(dispositivos.map(d => [d.id, d.nome]))
  
  // Contar operações por dispositivo
  const operacoesPorDispositivo = new Map<string, number>()
  changelogs.forEach(log => {
    if (log.deviceId) {
      operacoesPorDispositivo.set(log.deviceId, (operacoesPorDispositivo.get(log.deviceId) || 0) + 1)
    }
  })

  // Estatísticas
  const totalOperacoes = changelogs.length
  const operacoesSynced = changelogs.filter(l => l.synced).length
  const operacoesPendentes = totalOperacoes - operacoesSynced
  const operacoesPorTipo = {
    cliente: changelogs.filter(l => l.entityType === 'cliente').length,
    produto: changelogs.filter(l => l.entityType === 'produto').length,
    locacao: changelogs.filter(l => l.entityType === 'locacao').length,
    cobranca: changelogs.filter(l => l.entityType === 'cobranca').length,
  }

  // Timestamp atual para verificação de status online (30 min)
  // Server Component: executado apenas uma vez no servidor
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now()
  const ONLINE_THRESHOLD = 1000 * 60 * 30
  
  // Pré-calcular status dos dispositivos
  const dispositivosComStatus = dispositivos.map(d => ({
    ...d,
    isOnline: d.ultimaSincronizacao && 
      (nowMs - new Date(d.ultimaSincronizacao).getTime()) < ONLINE_THRESHOLD,
    lastSyncFormatted: d.ultimaSincronizacao 
      ? formatDistanceToNow(new Date(d.ultimaSincronizacao), { locale: ptBR, addSuffix: true })
      : 'Nunca'
  }))

  // Labels amigáveis
  const entityLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    cliente: { label: 'Cliente', icon: <Users className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700' },
    produto: { label: 'Produto', icon: <Package className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700' },
    locacao: { label: 'Locação', icon: <FileText className="w-4 h-4" />, color: 'bg-green-100 text-green-700' },
    cobranca: { label: 'Cobrança', icon: <DollarSign className="w-4 h-4" />, color: 'bg-amber-100 text-amber-700' },
    usuario: { label: 'Usuário', icon: <Users className="w-4 h-4" />, color: 'bg-pink-100 text-pink-700' },
    rota: { label: 'Rota', icon: <Database className="w-4 h-4" />, color: 'bg-cyan-100 text-cyan-700' },
  }

  const operationLabels: Record<string, { label: string; color: string }> = {
    create: { label: 'Criado', color: 'text-green-600 bg-green-50' },
    update: { label: 'Atualizado', color: 'text-blue-600 bg-blue-50' },
    delete: { label: 'Excluído', color: 'text-red-600 bg-red-50' },
  }

  return (
    <div>
      <Header
        title="Sincronização"
        subtitle="Monitor de sincronização bidirecional com o mobile"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalOperacoes}</p>
              <p className="text-xs text-slate-500">Operações Hoje</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{operacoesSynced}</p>
              <p className="text-xs text-slate-500">Sincronizadas</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{operacoesPendentes}</p>
              <p className="text-xs text-slate-500">Pendentes</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{conflitos.length}</p>
              <p className="text-xs text-slate-500">Conflitos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status dispositivos */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Dispositivos Conectados
          </h2>
          <span className="text-xs text-slate-500">{dispositivos.length} dispositivo(s)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dispositivosComStatus.map(d => (
            <div key={d.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                d.isOnline ? 'bg-green-100' : 'bg-slate-100'
              }`}>
                {d.isOnline ? (
                  <Wifi className="w-6 h-6 text-green-600" />
                ) : (
                  <WifiOff className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-900 truncate">{d.nome}</p>
                  <Badge 
                    label={d.status === 'ativo' ? 'Ativo' : 'Inativo'} 
                    variant={d.status === 'ativo' ? 'green' : 'gray'} 
                    size="sm"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Último sync: {d.lastSyncFormatted}
                </p>
                <p className="text-xs text-slate-400">
                  {operacoesPorDispositivo.get(d.id) || 0} operações
                </p>
              </div>
            </div>
          ))}
          {dispositivos.length === 0 && (
            <div className="col-span-full text-center py-8 text-slate-400 text-sm">
              Nenhum dispositivo registrado
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conflitos pendentes */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Conflitos Pendentes
            </h2>
            <Badge label={conflitos.length.toString()} variant={conflitos.length > 0 ? 'yellow' : 'green'} />
          </div>
          {conflitos.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <p className="font-medium text-slate-700">Nenhum conflito pendente</p>
              <p className="text-sm text-slate-500 mt-1">Todos os dados estão sincronizados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {conflitos.map(c => {
                const entityInfo = entityLabels[c.entityType] || { label: c.entityType, color: 'bg-gray-100 text-gray-700' }
                return (
                  <div key={c.id} className="border border-amber-200 bg-amber-50 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${entityInfo.color}`}>
                          {entityInfo.icon}
                          {entityInfo.label}
                        </span>
                        <span className="text-xs text-amber-700 font-medium">
                          {c.conflictType === 'update_conflict' ? 'Conflito de atualização' : c.conflictType}
                        </span>
                      </div>
                      <Badge label="Pendente" variant="yellow" size="sm" />
                    </div>
                    <p className="text-xs text-amber-600 font-mono mt-2 bg-amber-100 px-2 py-1 rounded">
                      ID: {c.entityId}
                    </p>
                    <p className="text-xs text-amber-500 mt-2">
                      {format(c.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Log de operações */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Histórico de Operações
            </h2>
            <span className="text-xs text-slate-500">Últimas 50</span>
          </div>
          
          {/* Resumo por tipo */}
          <div className="grid grid-cols-4 gap-2 mb-4 pb-4 border-b border-slate-100">
            {Object.entries(operacoesPorTipo).map(([tipo, count]) => {
              const info = entityLabels[tipo]
              if (!info || count === 0) return null
              return (
                <div key={tipo} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg ${info.color} text-xs`}>
                  {info.icon}
                  <span className="font-medium">{count}</span>
                </div>
              )
            })}
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {changelogs.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">
                Nenhuma operação registrada
              </div>
            )}
            {changelogs.map(log => {
              const entityInfo = entityLabels[log.entityType] || { 
                label: log.entityType, 
                icon: <Database className="w-4 h-4" />, 
                color: 'bg-gray-100 text-gray-700' 
              }
              const opInfo = operationLabels[log.operation] || { 
                label: log.operation, 
                color: 'text-gray-600 bg-gray-50' 
              }
              
              // Extrair informações amigáveis do campo changes
              const changes = log.changes as Record<string, unknown>
              const entityNameRaw = changes?.nome ?? changes?.descricao ?? changes?.name ?? null
              const entityName = typeof entityNameRaw === 'string' ? entityNameRaw : null
              const entityDetail = (() => {
                if (log.entityType === 'cliente') {
                  return changes?.cpf ? `CPF: ${String(changes.cpf).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.***-$2')}` : null
                }
                if (log.entityType === 'produto') {
                  return changes?.valor ? `R$ ${Number(changes.valor).toFixed(2)}` : null
                }
                if (log.entityType === 'locacao') {
                  return changes?.dataLocacao ? `Data: ${format(new Date(String(changes.dataLocacao)), 'dd/MM/yyyy')}` : null
                }
                if (log.entityType === 'cobranca') {
                  return changes?.valor ? `R$ ${Number(changes.valor).toFixed(2)}` : null
                }
                return null
              })()
              
              return (
                <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${entityInfo.color}`}>
                    {entityInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-700">
                        {entityName || entityInfo.label}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${opInfo.color}`}>
                        {opInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                      {entityDetail && (
                        <>
                          <span className="text-slate-600">{entityDetail}</span>
                          <span className="text-slate-300">•</span>
                        </>
                      )}
                      {log.deviceId && dispositivosMap.has(log.deviceId) && (
                        <>
                          <span className="inline-flex items-center gap-1">
                            <Smartphone className="w-3 h-3" />
                            {dispositivosMap.get(log.deviceId)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-500">
                      {format(log.timestamp, "HH:mm:ss", { locale: ptBR })}
                    </p>
                    <Badge 
                      label={log.synced ? 'Sync' : 'Pendente'} 
                      variant={log.synced ? 'green' : 'yellow'} 
                      size="sm"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
