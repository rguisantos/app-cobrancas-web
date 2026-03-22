import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/header'
import Badge from '@/components/ui/badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const metadata: Metadata = { title: 'Monitor de Sincronização' }

export default async function SyncPage() {
  const session = await getSession()
  if (session?.user.tipoPermissao !== 'Administrador') redirect('/dashboard')

  const [conflitos, changelogs, dispositivos] = await Promise.all([
    prisma.syncConflict.findMany({ where: { resolution: null }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.changeLog.findMany({ orderBy: { timestamp: 'desc' }, take: 30 }),
    prisma.dispositivo.findMany({ orderBy: { ultimaSincronizacao: 'desc' } }),
  ])

  const entityLabel: Record<string, string> = {
    cliente: '👥', produto: '🎱', locacao: '📋', cobranca: '💰', rota: '🗺️', usuario: '👤',
  }

  return (
    <div>
      <Header
        title="Sincronização"
        subtitle="Monitor de sincronização bidirecional com o mobile"
      />

      {/* Status dispositivos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {dispositivos.map(d => (
          <div key={d.id} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-slate-900 text-sm">📱 {d.nome}</p>
              <Badge label={d.status} variant={d.status === 'ativo' ? 'green' : 'gray'} />
            </div>
            <p className="text-xs text-slate-500">
              {d.ultimaSincronizacao
                ? `Último sync: ${format(d.ultimaSincronizacao, "dd/MM/yy 'às' HH:mm", { locale: ptBR })}`
                : 'Nunca sincronizou'}
            </p>
          </div>
        ))}
        {dispositivos.length === 0 && (
          <div className="card p-4 col-span-3 text-center text-slate-400 text-sm">Nenhum dispositivo registrado</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conflitos pendentes */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">⚠️ Conflitos Pendentes ({conflitos.length})</h2>
          </div>
          {conflitos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-2">✅</p>
              <p className="text-sm text-slate-500">Nenhum conflito pendente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {conflitos.map(c => (
                <div key={c.id} className="border border-yellow-200 bg-yellow-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-yellow-900">
                      {entityLabel[c.entityType] ?? '📄'} {c.entityType} — {c.conflictType}
                    </span>
                    <Badge label="Pendente" variant="yellow" />
                  </div>
                  <p className="text-xs text-yellow-700 font-mono">{c.entityId}</p>
                  <p className="text-xs text-yellow-600 mt-1">{format(c.createdAt, "dd/MM/yy HH:mm", { locale: ptBR })}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Log de operações */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-4">📋 Log de Operações (últimas 30)</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {changelogs.length === 0 && <p className="text-sm text-slate-400">Nenhuma operação registrada</p>}
            {changelogs.map(log => (
              <div key={log.id} className="flex items-start gap-3 text-xs border-b border-slate-50 pb-2">
                <span className="font-mono text-slate-400 shrink-0">
                  {format(log.timestamp, "HH:mm:ss", { locale: ptBR })}
                </span>
                <div>
                  <span className="font-medium text-slate-700">
                    {entityLabel[log.entityType] ?? '📄'} {log.entityType}
                  </span>
                  <span className={`ml-2 font-semibold ${log.operation === 'create' ? 'text-green-600' : log.operation === 'delete' ? 'text-red-600' : 'text-blue-600'}`}>
                    {log.operation}
                  </span>
                  <p className="text-slate-400 font-mono truncate max-w-xs">{log.entityId}</p>
                </div>
                <Badge label={log.synced ? 'Sync' : 'Pendente'} variant={log.synced ? 'green' : 'yellow'} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
