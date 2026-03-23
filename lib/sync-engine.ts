// lib/sync-engine.ts
// Motor de sincronização bidirecional — compatível com o SyncService do mobile
import { prisma } from './prisma'
import type { ChangeLog, SyncResponse, SyncConflict } from '@/shared/types'

type EntityTable = 'clientes' | 'produtos' | 'locacoes' | 'cobrancas' | 'rotas'

const TABLE_MAP: Record<string, EntityTable> = {
  cliente:  'clientes',
  produto:  'produtos',
  locacao:  'locacoes',
  cobranca: 'cobrancas',
  rota:     'rotas',
}

// ============================================================
// PUSH — mobile → servidor
// ============================================================
export async function processPush(
  deviceId: string,
  changes: ChangeLog[]
): Promise<{ conflicts: SyncConflict[]; errors: string[] }> {
  const conflicts: SyncConflict[] = []
  const errors: string[] = []

  for (const change of changes) {
    try {
      const table = TABLE_MAP[change.entityType]
      if (!table) { errors.push(`Tipo desconhecido: ${change.entityType}`); continue }

      const repo = (prisma as any)[table.slice(0, -1)] // remove 's' para singular

      if (change.operation === 'delete') {
        await repo.updateMany({
          where: { id: change.entityId },
          data: { deletedAt: new Date(), syncStatus: 'synced', needsSync: false },
        })
        continue
      }

      const data: Record<string, any> = { ...change.changes, syncStatus: 'synced', needsSync: false, deviceId }
      delete data.id

      const existing = await repo.findUnique({ where: { id: change.entityId } })

      if (!existing) {
        // Create
        await repo.create({ data: { id: change.entityId, ...data } })
      } else {
        // Verificar conflito de versão
        if (existing.version > (change.changes.version ?? 0)) {
          const conflict: SyncConflict = {
            entityId: change.entityId,
            entityType: change.entityType,
            localVersion: change.changes,
            remoteVersion: existing,
            conflictType: 'update',
            resolution: null,
          }
          conflicts.push(conflict)
          await prisma.syncConflict.create({
            data: {
              entityId: change.entityId,
              entityType: change.entityType,
              localVersion: change.changes,
              remoteVersion: existing,
              conflictType: 'update',
            },
          })
        } else {
          // Update — versão do mobile é mais nova
          await repo.update({
            where: { id: change.entityId },
            data: { ...data, version: { increment: 1 } },
          })
        }
      }

      // Registrar no changelog do servidor
      await prisma.changeLog.create({
        data: {
          entityId:   change.entityId,
          entityType: change.entityType,
          operation:  change.operation,
          changes:    change.changes,
          deviceId,
          synced:     true,
          syncedAt:   new Date(),
        },
      })
    } catch (err) {
      errors.push(`Erro em ${change.entityId}: ${String(err)}`)
    }
  }

  // Registrar última sync do dispositivo
  await prisma.dispositivo.updateMany({
    where: { chave: deviceId },
    data: { ultimaSincronizacao: new Date() },
  })

  return { conflicts, errors }
}

// ============================================================
// PULL — servidor → mobile
// ============================================================
export async function processPull(
  deviceId: string,
  lastSyncAt: string
): Promise<SyncResponse> {
  const since = new Date(lastSyncAt)

  // Buscar todas as entidades modificadas depois de lastSyncAt
  // que NÃO foram geradas por este dispositivo
  const [clientes, produtos, locacoes, cobrancas, rotas] = await Promise.all([
    prisma.cliente.findMany({
      where: { updatedAt: { gt: since }, deviceId: { not: deviceId } },
    }),
    prisma.produto.findMany({
      where: { updatedAt: { gt: since }, deviceId: { not: deviceId } },
    }),
    prisma.locacao.findMany({
      where: { updatedAt: { gt: since }, deviceId: { not: deviceId } },
    }),
    prisma.cobranca.findMany({
      where: { updatedAt: { gt: since }, deviceId: { not: deviceId } },
    }),
    prisma.rota.findMany({
      where: { updatedAt: { gt: since }, deviceId: { not: deviceId } },
    }),
  ])

  // IMPORTANTE: O mobile espera as entidades dentro de 'changes'
  return {
    success: true,
    lastSyncAt: new Date().toISOString(),
    changes: {
      clientes,
      produtos,
      locacoes,
      cobrancas,
      rotas,
    },
  }
}
