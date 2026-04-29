// lib/sync-engine.ts
// Motor de sincronização bidirecional — compatível com o SyncService do mobile
// v3: Modularizado — helpers extraídos para sync-helpers.ts
import { prisma } from './prisma'
import { logger } from './logger'
import type { ChangeLog, SyncResponse, SyncConflict, UpdatedVersion } from '@cobrancas/shared'
import {
  TABLE_MAP,
  TABLE_TO_MODEL_MAP,
  PROCESSING_ORDER,
  SYNC_PULL_LIMIT,
  parseChanges,
  filterAllowedFields,
  convertForPrisma,
  sortChangesByDependency,
  parseSafeSince,
} from './sync-helpers'

// Re-export para compatibilidade com testes e importações existentes
export {
  TABLE_MAP,
  PROCESSING_ORDER,
  ALLOWED_FIELDS,
  SYNC_PULL_LIMIT,
  parseChanges,
  filterAllowedFields,
  convertForPrisma,
  sortChangesByDependency,
  parseSafeSince,
} from './sync-helpers'

// Mapeamento de nomes de campos Mobile -> Web (se diferentes)
const FIELD_MAP: Record<string, Record<string, string>> = {
  cliente: {},
  produto: {
    conservacao: 'conservacao',
    statusProduto: 'statusProduto',
    numeroRelogio: 'numeroRelogio',
  },
  locacao: {
    numeroRelogio: 'numeroRelogio',
  },
  cobranca: {},
}

// Validar e resolver foreign keys
async function validateForeignKeys(modelName: string, data: Record<string, any>): Promise<Record<string, any>> {
  const result = { ...data }

  if (modelName === 'cliente' && result.rotaId) {
    const rotaExists = await prisma.rota.findUnique({ where: { id: result.rotaId } })
    if (!rotaExists) {
      logger.warn(`[sync] rotaId '${result.rotaId}' não encontrado, removendo referência`)
      delete result.rotaId
      result.rotaNome = result.rotaNome || null
    }
  }

  if ((modelName === 'locacao' || modelName === 'cobranca') && result.clienteId) {
    const clienteExists = await prisma.cliente.findUnique({ where: { id: result.clienteId } })
    if (!clienteExists) {
      logger.warn(`[sync] clienteId '${result.clienteId}' não encontrado, removendo referência`)
      delete result.clienteId
    }
  }

  if ((modelName === 'locacao' || modelName === 'cobranca') && result.produtoId) {
    const produtoExists = await prisma.produto.findUnique({ where: { id: result.produtoId } })
    if (!produtoExists) {
      logger.warn(`[sync] produtoId '${result.produtoId}' não encontrado, removendo referência`)
      delete result.produtoId
    }
  }

  if (modelName === 'cobranca' && result.locacaoId) {
    const locacaoExists = await prisma.locacao.findUnique({ where: { id: result.locacaoId } })
    if (!locacaoExists) {
      logger.warn(`[sync] locacaoId '${result.locacaoId}' não encontrado, removendo referência`)
      delete result.locacaoId
    }
  }

  return result
}

// ============================================================
// PUSH — mobile → servidor
// ============================================================

export async function processPush(
  deviceId: string,
  changes: ChangeLog[]
): Promise<{ conflicts: SyncConflict[]; errors: string[]; updatedVersions: UpdatedVersion[] }> {
  const conflicts: SyncConflict[] = []
  const errors: string[] = []
  const updatedVersions: UpdatedVersion[] = []

  logger.info(`[sync/push] ====== INICIANDO PUSH ======`)
  logger.info(`[sync/push] Dispositivo: ${deviceId}`)
  logger.info(`[sync/push] Total de mudanças: ${changes.length}`)

  const sortedChanges = sortChangesByDependency(changes)
  logger.debug(`[sync/push] Ordem de processamento: ${sortedChanges.map(c => c.entityType).join(', ')}`)

  for (const change of sortedChanges) {
    try {
      const table = TABLE_MAP[change.entityType]
      if (!table) {
        errors.push(`Tipo desconhecido: ${change.entityType}`)
        logger.error(`[sync/push] Tipo desconhecido: ${change.entityType}`)
        continue
      }

      // Ignorar replays (change já aplicado)
      const existingLog = await prisma.changeLog.findUnique({ where: { id: change.id } })
      if (existingLog?.synced) {
        logger.debug(`[sync/push] Change ${change.id} já aplicado, pulando replay`)
        continue
      }

      const changesData = parseChanges(change.changes)
      logger.debug(`[sync/push] --- ${change.operation.toUpperCase()} ${change.entityType}:${change.entityId} ---`)

      const modelName = TABLE_TO_MODEL_MAP[table]
      const repo = (prisma as any)[modelName]

      if (!repo) {
        errors.push(`Modelo não encontrado: ${modelName}`)
        logger.error(`[sync/push] Modelo não encontrado: ${modelName}`)
        continue
      }

      if (change.operation === 'delete') {
        // Soft delete com detecção de conflito delete-vs-update
        const existingForDelete = await repo.findUnique({ where: { id: change.entityId } })

        if (!existingForDelete) {
          // Entidade já não existe — registrar changelog e continuar
          logger.debug(`[sync/push] Delete de entidade inexistente: ${change.entityId}`)
          await prisma.changeLog.upsert({
            where: { id: change.id },
            update: { synced: true, syncedAt: new Date() },
            create: {
              id: change.id, entityId: change.entityId, entityType: change.entityType,
              operation: 'delete', changes: changesData, deviceId, synced: true, syncedAt: new Date(),
            },
          })
          continue
        }

        const mobileVersion = Number(changesData.version) || 0
        const serverVersion = Number(existingForDelete.version) || 0

        // Conflito delete-vs-update
        if (serverVersion > mobileVersion && serverVersion > 0) {
          logger.warn(`[sync/push] CONFLITO DELETE-VS-UPDATE! Server v${serverVersion} > Mobile v${mobileVersion}`)

          const conflict: SyncConflict = {
            entityId: change.entityId, entityType: change.entityType,
            localVersion: changesData, remoteVersion: existingForDelete,
            conflictType: 'delete', resolution: null,
          }
          conflicts.push(conflict)

          await prisma.syncConflict.create({
            data: {
              entityId: change.entityId, entityType: change.entityType,
              localVersion: changesData, remoteVersion: existingForDelete, conflictType: 'delete',
            },
          })

          await prisma.changeLog.upsert({
            where: { id: change.id },
            update: { synced: false, syncedAt: new Date() },
            create: {
              id: change.id, entityId: change.entityId, entityType: change.entityType,
              operation: 'delete', changes: changesData, deviceId, synced: false, syncedAt: new Date(),
            },
          })
          continue
        }

        // Sem conflito — aplicar soft delete com optimistic locking
        const deleteResult = await repo.updateMany({
          where: { id: change.entityId, version: serverVersion },
          data: {
            deletedAt: new Date(), syncStatus: 'synced', needsSync: false,
            deviceId, version: { increment: 1 },
          },
        })

        if (deleteResult.count === 0) {
          logger.warn(`[sync/push] Conflito de concorrência no delete: ${change.entityId}`)
          const currentRecord = await repo.findUnique({ where: { id: change.entityId } })
          if (currentRecord) {
            const conflict: SyncConflict = {
              entityId: change.entityId, entityType: change.entityType,
              localVersion: changesData, remoteVersion: currentRecord,
              conflictType: 'delete', resolution: null,
            }
            conflicts.push(conflict)
            await prisma.syncConflict.create({
              data: {
                entityId: change.entityId, entityType: change.entityType,
                localVersion: changesData, remoteVersion: currentRecord, conflictType: 'delete',
              },
            })
          }
        } else {
          updatedVersions.push({ entityId: change.entityId, entityType: change.entityType, newVersion: serverVersion + 1 })
        }

        await prisma.changeLog.upsert({
          where: { id: change.id },
          update: { synced: true, syncedAt: new Date() },
          create: {
            id: change.id, entityId: change.entityId, entityType: change.entityType,
            operation: 'delete', changes: changesData, deviceId, synced: true, syncedAt: new Date(),
          },
        })
        continue
      }

      // CREATE / UPDATE
      let filteredData = filterAllowedFields(modelName, changesData)
      filteredData = convertForPrisma(filteredData)
      filteredData = await validateForeignKeys(modelName, filteredData)

      const data: Record<string, any> = {
        ...filteredData,
        syncStatus: 'synced',
        needsSync: false,
        deviceId,
        updatedAt: new Date(),
      }
      delete data.id
      delete data.createdAt

      const existing = await repo.findUnique({ where: { id: change.entityId } })

      if (!existing) {
        // CREATE
        logger.debug(`[sync/push] Criando novo registro...`)
        try {
          const created = await repo.create({
            data: {
              id: change.entityId,
              ...data,
              createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            },
          })
          logger.debug(`[sync/push] Registro criado com sucesso! ID: ${created.id}`)
          updatedVersions.push({
            entityId: change.entityId, entityType: change.entityType,
            newVersion: Number(created.version) || 1,
          })
        } catch (createError) {
          logger.error(`[sync/push] Erro ao criar:`, createError)
          errors.push(`Erro ao criar ${modelName}:${change.entityId} - ${String(createError)}`)
          continue
        }
      } else {
        // UPDATE - verificar conflito de versão
        const mobileVersion = Number(changesData.version) || 0
        const serverVersion = Number(existing.version) || 0

        if (serverVersion > mobileVersion && serverVersion > 0) {
          logger.warn(`[sync/push] CONFLITO! Server v${serverVersion} > Mobile v${mobileVersion}`)

          const conflict: SyncConflict = {
            entityId: change.entityId, entityType: change.entityType,
            localVersion: changesData, remoteVersion: existing,
            conflictType: 'update', resolution: null,
          }
          conflicts.push(conflict)

          await prisma.syncConflict.create({
            data: {
              entityId: change.entityId, entityType: change.entityType,
              localVersion: changesData, remoteVersion: existing, conflictType: 'update',
            },
          })
        } else {
          // Optimistic locking no update
          logger.debug(`[sync/push] Atualizando registro (optimistic lock server v${serverVersion})...`)

          try {
            const updateResult = await repo.updateMany({
              where: { id: change.entityId, version: serverVersion },
              data: { ...data, version: { increment: 1 } },
            })

            if (updateResult.count === 0) {
              logger.warn(`[sync/push] Conflito de concorrência (TOCTOU) no update: ${change.entityId}`)
              const currentRecord = await repo.findUnique({ where: { id: change.entityId } })
              if (currentRecord) {
                const conflict: SyncConflict = {
                  entityId: change.entityId, entityType: change.entityType,
                  localVersion: changesData, remoteVersion: currentRecord,
                  conflictType: 'update', resolution: null,
                }
                conflicts.push(conflict)
                await prisma.syncConflict.create({
                  data: {
                    entityId: change.entityId, entityType: change.entityType,
                    localVersion: changesData, remoteVersion: currentRecord, conflictType: 'update',
                  },
                })
              }
            } else {
              const newVersion = serverVersion + 1
              updatedVersions.push({ entityId: change.entityId, entityType: change.entityType, newVersion })
              logger.debug(`[sync/push] Registro atualizado com sucesso! Nova versão: ${newVersion}`)
            }
          } catch (updateError) {
            logger.error(`[sync/push] Erro ao atualizar:`, updateError)
            errors.push(`Erro ao atualizar ${modelName}:${change.entityId} - ${String(updateError)}`)
            continue
          }
        }
      }

      // Registrar no changelog do servidor
      await prisma.changeLog.upsert({
        where: { id: change.id },
        update: { synced: true, syncedAt: new Date() },
        create: {
          id: change.id, entityId: change.entityId, entityType: change.entityType,
          operation: change.operation, changes: changesData, deviceId, synced: true, syncedAt: new Date(),
        },
      })

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      errors.push(`Erro em ${change.entityType}:${change.entityId} - ${errorMsg}`)
      logger.error(`[sync/push] ERRO CRÍTICO em ${change.entityType}:${change.entityId}:`, err)
    }
  }

  // Atualizar última sincronização do dispositivo
  try {
    await prisma.dispositivo.updateMany({
      where: { id: deviceId },
      data: { ultimaSincronizacao: new Date() },
    })
  } catch {
    logger.debug(`[sync/push] Dispositivo não encontrado para atualizar última sync`)
  }

  logger.info(`[sync/push] ====== PUSH CONCLUÍDO ======`)
  logger.info(`[sync/push] Conflitos: ${conflicts.length}, Erros: ${errors.length}, Versões atualizadas: ${updatedVersions.length}`)

  return { conflicts, errors, updatedVersions }
}

// ============================================================
// PULL — servidor → mobile (com paginação)
// ============================================================

export async function processPull(
  deviceId: string,
  lastSyncAt: string
): Promise<SyncResponse> {
  const since = parseSafeSince(lastSyncAt)

  // Detectar device estale (offline > 30 dias)
  const diasOffline = (Date.now() - since.getTime()) / (1000 * 60 * 60 * 24)
  const diasStaleThreshold = Number(process.env.SYNC_STALE_THRESHOLD_DAYS) || 30
  const isStale = diasOffline > diasStaleThreshold
  if (isStale) {
    logger.warn(`[sync/pull] Device estale: ${Math.round(diasOffline)} dias sem sync — mobile deve usar /api/sync/snapshot`)
  }

  logger.info(`[sync/pull] ====== INICIANDO PULL ======`)
  logger.info(`[sync/pull] Dispositivo: ${deviceId}`)
  logger.info(`[sync/pull] Buscando mudanças desde: ${since.toISOString()}`)

  const commonWhere = {
    deletedAt: null as any,
    updatedAt: { gt: since } as any,
    OR: [
      { deviceId: { not: deviceId } },
      { deviceId: '' },
    ] as any,
  }

  const [
    clientes, produtos, locacoes, cobrancas, rotas,
    usuarios, tiposProduto, descricoesProduto, tamanhosProduto,
  ] = await Promise.all([
    prisma.cliente.findMany({ where: commonWhere, orderBy: { updatedAt: 'asc' }, take: SYNC_PULL_LIMIT }),
    prisma.produto.findMany({ where: commonWhere, orderBy: { updatedAt: 'asc' }, take: SYNC_PULL_LIMIT }),
    prisma.locacao.findMany({ where: commonWhere, orderBy: { updatedAt: 'asc' }, take: SYNC_PULL_LIMIT }),
    prisma.cobranca.findMany({ where: commonWhere, orderBy: { updatedAt: 'asc' }, take: SYNC_PULL_LIMIT }),
    prisma.rota.findMany({ where: commonWhere, orderBy: { updatedAt: 'asc' }, take: SYNC_PULL_LIMIT }),
    prisma.usuario.findMany({
      where: { deletedAt: null, updatedAt: { gt: since } },
      orderBy: { updatedAt: 'asc' },
      select: {
        id: true, nome: true, cpf: true, telefone: true, email: true,
        tipoPermissao: true, permissoesWeb: true, permissoesMobile: true,
        rotasPermitidasRel: { select: { rotaId: true, usuarioId: true } }, status: true, bloqueado: true,
        dataUltimoAcesso: true, ultimoAcessoDispositivo: true,
        syncStatus: true, lastSyncedAt: true, needsSync: true,
        version: true, deviceId: true, createdAt: true, updatedAt: true,
      },
    }),
    prisma.tipoProduto.findMany({ where: { deletedAt: null, updatedAt: { gt: since } }, orderBy: { updatedAt: 'asc' }, take: SYNC_PULL_LIMIT }),
    prisma.descricaoProduto.findMany({ where: { deletedAt: null, updatedAt: { gt: since } }, orderBy: { updatedAt: 'asc' }, take: SYNC_PULL_LIMIT }),
    prisma.tamanhoProduto.findMany({ where: { deletedAt: null, updatedAt: { gt: since } }, orderBy: { updatedAt: 'asc' }, take: SYNC_PULL_LIMIT }),
  ])

  // Determinar se há mais registros
  const hasMoreClientes = clientes.length === SYNC_PULL_LIMIT
  const hasMoreProdutos = produtos.length === SYNC_PULL_LIMIT
  const hasMoreLocacoes = locacoes.length === SYNC_PULL_LIMIT
  const hasMoreCobrancas = cobrancas.length === SYNC_PULL_LIMIT
  const hasMoreRotas = rotas.length === SYNC_PULL_LIMIT
  const hasMore = hasMoreClientes || hasMoreProdutos || hasMoreLocacoes || hasMoreCobrancas || hasMoreRotas

  let responseLastSyncAt: string
  if (hasMore) {
    const allLastUpdatedAt = [
      hasMoreClientes && clientes.length > 0 ? new Date(clientes[clientes.length - 1].updatedAt).getTime() : null,
      hasMoreProdutos && produtos.length > 0 ? new Date(produtos[produtos.length - 1].updatedAt).getTime() : null,
      hasMoreLocacoes && locacoes.length > 0 ? new Date(locacoes[locacoes.length - 1].updatedAt).getTime() : null,
      hasMoreCobrancas && cobrancas.length > 0 ? new Date(cobrancas[cobrancas.length - 1].updatedAt).getTime() : null,
      hasMoreRotas && rotas.length > 0 ? new Date(rotas[rotas.length - 1].updatedAt).getTime() : null,
    ].filter((t): t is number => t !== null)

    const minLastUpdatedAt = allLastUpdatedAt.length > 0 ? Math.min(...allLastUpdatedAt) : Date.now()
    responseLastSyncAt = new Date(minLastUpdatedAt).toISOString()
  } else {
    responseLastSyncAt = new Date().toISOString()
  }

  logger.info(`[sync/pull] Resultados:`)
  logger.info(`[sync/pull] - Clientes: ${clientes.length}${hasMoreClientes ? ' (hasMore!)' : ''}`)
  logger.info(`[sync/pull] - Produtos: ${produtos.length}${hasMoreProdutos ? ' (hasMore!)' : ''}`)
  logger.info(`[sync/pull] - Locações: ${locacoes.length}${hasMoreLocacoes ? ' (hasMore!)' : ''}`)
  logger.info(`[sync/pull] - Cobranças: ${cobrancas.length}${hasMoreCobrancas ? ' (hasMore!)' : ''}`)
  logger.info(`[sync/pull] - Rotas: ${rotas.length}${hasMoreRotas ? ' (hasMore!)' : ''}`)
  logger.info(`[sync/pull] - Usuários: ${usuarios.length}`)
  logger.info(`[sync/pull] - Tipos: ${tiposProduto.length}`)
  logger.info(`[sync/pull] - Descrições: ${descricoesProduto.length}`)
  logger.info(`[sync/pull] - Tamanhos: ${tamanhosProduto.length}`)
  logger.info(`[sync/pull] hasMore: ${hasMore}, lastSyncAt: ${responseLastSyncAt}`)
  logger.info(`[sync/pull] ====== PULL CONCLUÍDO ======`)

  // Transformar usuarios: derivar rotasPermitidas a partir de rotasPermitidasRel
  const usuariosTransformed = usuarios.map(u => {
    const { rotasPermitidasRel, ...rest } = u
    return { ...rest, rotasPermitidas: rotasPermitidasRel.map((ur: { rotaId: string }) => ur.rotaId) }
  })

  return {
    success: true,
    lastSyncAt: responseLastSyncAt,
    hasMore,
    isStale,
    changes: { clientes, produtos, locacoes, cobrancas, rotas, usuarios: usuariosTransformed },
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
  logger.debug(`[sync/atributos] Processando atributos: ${tipos.length} tipos, ${descricoes.length} descrições, ${tamanhos.length} tamanhos`)

  for (const tipo of tipos) {
    try {
      await prisma.tipoProduto.upsert({
        where: { id: tipo.id },
        create: { id: tipo.id, nome: tipo.nome, deviceId, syncStatus: 'synced' },
        update: { nome: tipo.nome, deviceId, syncStatus: 'synced' },
      })
    } catch (err) {
      errors.push(`Erro ao salvar tipo ${tipo.id}: ${String(err)}`)
    }
  }

  for (const desc of descricoes) {
    try {
      await prisma.descricaoProduto.upsert({
        where: { id: desc.id },
        create: { id: desc.id, nome: desc.nome, deviceId, syncStatus: 'synced' },
        update: { nome: desc.nome, deviceId, syncStatus: 'synced' },
      })
    } catch (err) {
      errors.push(`Erro ao salvar descrição ${desc.id}: ${String(err)}`)
    }
  }

  for (const tam of tamanhos) {
    try {
      await prisma.tamanhoProduto.upsert({
        where: { id: tam.id },
        create: { id: tam.id, nome: tam.nome, deviceId, syncStatus: 'synced' },
        update: { nome: tam.nome, deviceId, syncStatus: 'synced' },
      })
    } catch (err) {
      errors.push(`Erro ao salvar tamanho ${tam.id}: ${String(err)}`)
    }
  }

  return { errors }
}

// ============================================================
// SNAPSHOT — Estado completo para device estale
// ============================================================

export async function processSnapshot(deviceId: string): Promise<{
  clientes: any[]
  produtos: any[]
  locacoes: any[]
  cobrancas: any[]
  rotas: any[]
  usuarios: any[]
  tiposProduto: any[]
  descricoesProduto: any[]
  tamanhosProduto: any[]
}> {
  logger.info(`[sync/snapshot] Gerando snapshot para dispositivo: ${deviceId}`)

  const [clientes, produtos, locacoes, cobrancas, rotas, usuarios, tiposProduto, descricoesProduto, tamanhosProduto] = await Promise.all([
    prisma.cliente.findMany({ where: { deletedAt: null } }),
    prisma.produto.findMany({ where: { deletedAt: null } }),
    prisma.locacao.findMany({ where: { deletedAt: null } }),
    prisma.cobranca.findMany({ where: { deletedAt: null } }),
    prisma.rota.findMany({ where: { deletedAt: null } }),
    prisma.usuario.findMany({
      where: { deletedAt: null },
      select: {
        id: true, nome: true, cpf: true, telefone: true, email: true,
        tipoPermissao: true, permissoesWeb: true, permissoesMobile: true,
        rotasPermitidasRel: { select: { rotaId: true, usuarioId: true } }, status: true, bloqueado: true,
        dataUltimoAcesso: true, ultimoAcessoDispositivo: true,
        syncStatus: true, lastSyncedAt: true, needsSync: true,
        version: true, deviceId: true, createdAt: true, updatedAt: true,
      },
    }),
    prisma.tipoProduto.findMany({ where: { deletedAt: null } }),
    prisma.descricaoProduto.findMany({ where: { deletedAt: null } }),
    prisma.tamanhoProduto.findMany({ where: { deletedAt: null } }),
  ])

  logger.info(`[sync/snapshot] Snapshot gerado: ${clientes.length} clientes, ${produtos.length} produtos, ${locacoes.length} locações, ${cobrancas.length} cobranças, ${rotas.length} rotas`)

  // Transformar usuarios: derivar rotasPermitidas a partir de rotasPermitidasRel
  const usuariosTransformed = usuarios.map(u => {
    const { rotasPermitidasRel, ...rest } = u
    return { ...rest, rotasPermitidas: rotasPermitidasRel.map((ur: { rotaId: string }) => ur.rotaId) }
  })

  return {
    clientes, produtos, locacoes, cobrancas, rotas, usuarios: usuariosTransformed,
    tiposProduto, descricoesProduto, tamanhosProduto,
  }
}

// ============================================================
// PURGE DE CHANGELOG ANTIGO
// ============================================================

export async function purgeOldChangeLogs(diasRetencao: number = 30): Promise<number> {
  const limite = new Date()
  limite.setDate(limite.getDate() - diasRetencao)

  const result = await prisma.changeLog.deleteMany({
    where: { synced: true, syncedAt: { lt: limite } },
  })

  logger.info(`[sync/purge] Removidos ${result.count} changelogs antigos (>${diasRetencao} dias)`)
  return result.count
}
