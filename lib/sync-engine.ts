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

// Helper para parsear changes que pode vir como string JSON
function parseChanges(changes: any): Record<string, any> {
  if (typeof changes === 'string') {
    try {
      return JSON.parse(changes)
    } catch {
      return {}
    }
  }
  return changes || {}
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
      if (!table) { 
        errors.push(`Tipo desconhecido: ${change.entityType}`) 
        continue 
      }

      // Parsear o campo changes (pode vir como string JSON do SQLite)
      const changesData = parseChanges(change.changes)

      // Nome do modelo no Prisma (singular)
      const modelName = table.slice(0, -1) as 'cliente' | 'produto' | 'locacao' | 'cobranca' | 'rota'
      const repo = (prisma as any)[modelName]

      if (!repo) {
        errors.push(`Modelo não encontrado: ${modelName}`)
        continue
      }

      if (change.operation === 'delete') {
        // Soft delete
        await repo.updateMany({
          where: { id: change.entityId },
          data: { 
            deletedAt: new Date(), 
            syncStatus: 'synced', 
            needsSync: false,
            deviceId 
          },
        })
        
        // Registrar no changelog do servidor
        await prisma.changeLog.create({
          data: {
            entityId: change.entityId,
            entityType: change.entityType,
            operation: 'delete',
            changes: changesData,
            deviceId,
            synced: true,
            syncedAt: new Date(),
          },
        })
        continue
      }

      // Preparar dados para create/update
      const data: Record<string, any> = { 
        ...changesData, 
        syncStatus: 'synced', 
        needsSync: false, 
        deviceId,
        updatedAt: new Date(),
      }
      
      // Remover campos que não devem ser atualizados
      delete data.id
      delete data.createdAt

      // Verificar se a entidade já existe
      const existing = await repo.findUnique({ where: { id: change.entityId } })

      if (!existing) {
        // CREATE - criar nova entidade
        await repo.create({ 
          data: { 
            id: change.entityId, 
            ...data,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
          } 
        })
      } else {
        // UPDATE - verificar conflito de versão
        const mobileVersion = changesData.version ?? 0
        const serverVersion = existing.version ?? 0

        if (serverVersion > mobileVersion && serverVersion > 0) {
          // Conflito detectado - servidor tem versão mais recente
          const conflict: SyncConflict = {
            entityId: change.entityId,
            entityType: change.entityType,
            localVersion: changesData,
            remoteVersion: existing,
            conflictType: 'update',
            resolution: null,
          }
          conflicts.push(conflict)
          
          // Salvar conflito no banco
          await prisma.syncConflict.create({
            data: {
              entityId: change.entityId,
              entityType: change.entityType,
              localVersion: changesData,
              remoteVersion: existing,
              conflictType: 'update',
            },
          })
        } else {
          // Sem conflito - atualizar
          await repo.update({
            where: { id: change.entityId },
            data: { 
              ...data, 
              version: { increment: 1 } 
            },
          })
        }
      }

      // Registrar no changelog do servidor
      await prisma.changeLog.create({
        data: {
          entityId: change.entityId,
          entityType: change.entityType,
          operation: change.operation,
          changes: changesData,
          deviceId,
          synced: true,
          syncedAt: new Date(),
        },
      })

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      errors.push(`Erro em ${change.entityType}:${change.entityId} - ${errorMsg}`)
      console.error('[sync/push] Erro:', err)
    }
  }

  // Atualizar última sincronização do dispositivo
  // O deviceId aqui é o ID do dispositivo, não a chave
  try {
    await prisma.dispositivo.updateMany({
      where: { id: deviceId },
      data: { ultimaSincronizacao: new Date() },
    })
  } catch {
    // Ignorar erro se dispositivo não encontrado
  }

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
  // Incluir entidades deletadas (com deletedAt não nulo)
  const [clientes, produtos, locacoes, cobrancas, rotas, tiposProduto, descricoesProduto, tamanhosProduto] = await Promise.all([
    prisma.cliente.findMany({
      where: {
        updatedAt: { gt: since },
        OR: [
          { deviceId: { not: deviceId } },
          { deviceId: '' },
        ],
      },
    }),
    prisma.produto.findMany({
      where: {
        updatedAt: { gt: since },
        OR: [
          { deviceId: { not: deviceId } },
          { deviceId: '' },
        ],
      },
    }),
    prisma.locacao.findMany({
      where: {
        updatedAt: { gt: since },
        OR: [
          { deviceId: { not: deviceId } },
          { deviceId: '' },
        ],
      },
    }),
    prisma.cobranca.findMany({
      where: {
        updatedAt: { gt: since },
        OR: [
          { deviceId: { not: deviceId } },
          { deviceId: '' },
        ],
      },
    }),
    prisma.rota.findMany({
      where: {
        updatedAt: { gt: since },
        OR: [
          { deviceId: { not: deviceId } },
          { deviceId: '' },
        ],
      },
    }),
    // Atributos de produto
    prisma.tipoProduto.findMany({
      where: { updatedAt: { gt: since } },
    }),
    prisma.descricaoProduto.findMany({
      where: { updatedAt: { gt: since } },
    }),
    prisma.tamanhoProduto.findMany({
      where: { updatedAt: { gt: since } },
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
    // Atributos de produto (para sincronização completa)
    tiposProduto,
    descricoesProduto,
    tamanhosProduto,
  }
}

// ============================================================
// SINCRONIZAÇÃO DE ATRIBUTOS DE PRODUTO
// ============================================================

export async function processPushAtributos(
  deviceId: string,
  tipos: any[],
  descricoes: any[],
  tamanhos: any[]
): Promise<{ errors: string[] }> {
  const errors: string[] = []

  // Processar tipos de produto
  for (const tipo of tipos) {
    try {
      await prisma.tipoProduto.upsert({
        where: { id: tipo.id },
        create: { 
          id: tipo.id, 
          nome: tipo.nome,
          deviceId,
          syncStatus: 'synced',
        },
        update: { 
          nome: tipo.nome,
          deviceId,
          syncStatus: 'synced',
        },
      })
    } catch (err) {
      errors.push(`Erro ao salvar tipo ${tipo.id}: ${String(err)}`)
    }
  }

  // Processar descrições de produto
  for (const desc of descricoes) {
    try {
      await prisma.descricaoProduto.upsert({
        where: { id: desc.id },
        create: { 
          id: desc.id, 
          nome: desc.nome,
          deviceId,
          syncStatus: 'synced',
        },
        update: { 
          nome: desc.nome,
          deviceId,
          syncStatus: 'synced',
        },
      })
    } catch (err) {
      errors.push(`Erro ao salvar descrição ${desc.id}: ${String(err)}`)
    }
  }

  // Processar tamanhos de produto
  for (const tam of tamanhos) {
    try {
      await prisma.tamanhoProduto.upsert({
        where: { id: tam.id },
        create: { 
          id: tam.id, 
          nome: tam.nome,
          deviceId,
          syncStatus: 'synced',
        },
        update: { 
          nome: tam.nome,
          deviceId,
          syncStatus: 'synced',
        },
      })
    } catch (err) {
      errors.push(`Erro ao salvar tamanho ${tam.id}: ${String(err)}`)
    }
  }

  return { errors }
}
