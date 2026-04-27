// lib/sync-engine.ts
// Motor de sincronização bidirecional — compatível com o SyncService do mobile
// v2: Correções críticas de TOCTOU, paginação, replay, delete-vs-update
import { prisma } from './prisma'
import { logger } from './logger'
import type { ChangeLog, SyncResponse, SyncConflict, UpdatedVersion } from '@cobrancas/shared'

type EntityTable = 'clientes' | 'produtos' | 'locacoes' | 'cobrancas' | 'rotas' | 'usuarios'

type ModelName = 'cliente' | 'produto' | 'locacao' | 'cobranca' | 'rota' | 'usuario'

export const TABLE_MAP: Record<string, EntityTable> = {
  cliente:  'clientes',
  produto:  'produtos',
  locacao:  'locacoes',
  cobranca: 'cobrancas',
  rota:     'rotas',
  usuario:  'usuarios',
}

// Mapeamento correto de tabela para modelo (singularização)
const TABLE_TO_MODEL_MAP: Record<EntityTable, ModelName> = {
  clientes:  'cliente',
  produtos:  'produto',
  locacoes:  'locacao',
  cobrancas: 'cobranca',
  rotas:     'rota',
  usuarios:  'usuario',
}

// Ordem de processamento por dependência
export const PROCESSING_ORDER: ModelName[] = [
  'rota',      // Sem dependências
  'cliente',   // Sem dependências (exceto rota)
  'produto',   // Sem dependências
  'locacao',   // Depende de cliente e produto
  'cobranca',  // Depende de locacao, cliente e produto
  'usuario',   // Sem dependências
]

// Mapeamento de nomes de campos Mobile -> Web (se diferentes)
const FIELD_MAP: Record<string, Record<string, string>> = {
  cliente: {
    // Mobile -> Web (nomes iguais, sem mapeamento necessário)
  },
  produto: {
    conservacao: 'conservacao',  // No mobile é conservacao, no web também
    statusProduto: 'statusProduto',
    numeroRelogio: 'numeroRelogio',
  },
  locacao: {
    numeroRelogio: 'numeroRelogio',
  },
  cobranca: {
    // Campos já estão com nomes iguais
  },
}

// Campos permitidos por modelo (campos que existem no Prisma schema)
// NOTA: 'senha' removido do modelo usuario — risco de segurança (overwrite via sync)
const ALLOWED_FIELDS: Record<string, Set<string>> = {
  cliente: new Set([
    'tipo', 'tipoPessoa', 'identificador', 'nomeExibicao', 'nomeCompleto',
    'razaoSocial', 'nomeFantasia', 'cpf', 'cnpj', 'rg', 'inscricaoEstadual',
    'email', 'telefonePrincipal', 'contatos', 'cep', 'logradouro', 'numero',
    'complemento', 'bairro', 'cidade', 'estado', 'rotaId', 'rotaNome',
    'latitude', 'longitude',
    'status', 'observacao', 'dataCadastro', 'dataUltimaAlteracao',
    'syncStatus', 'lastSyncedAt', 'needsSync', 'version', 'deviceId'
  ]),
  produto: new Set([
    'tipo', 'identificador', 'numeroRelogio', 'tipoId', 'tipoNome',
    'descricaoId', 'descricaoNome', 'tamanhoId', 'tamanhoNome',
    'codigoCH', 'codigoABLF', 'conservacao', 'statusProduto',
    'dataFabricacao', 'dataUltimaManutencao', 'relatorioUltimaManutencao',
    'dataAvaliacao', 'aprovacao', 'estabelecimento', 'observacao', 'dataCadastro',
    'dataUltimaAlteracao',
    'syncStatus', 'lastSyncedAt', 'needsSync', 'version', 'deviceId'
  ]),
  locacao: new Set([
    'tipo', 'clienteId', 'clienteNome', 'produtoId', 'produtoIdentificador',
    'produtoTipo', 'dataLocacao', 'dataFim', 'observacao', 'formaPagamento',
    'numeroRelogio', 'precoFicha', 'percentualEmpresa', 'percentualCliente',
    'periodicidade', 'valorFixo', 'dataPrimeiraCobranca', 'status',
    'ultimaLeituraRelogio', 'dataUltimaCobranca', 'trocaPano', 'dataUltimaManutencao',
    'syncStatus', 'lastSyncedAt', 'needsSync', 'version', 'deviceId'
  ]),
  cobranca: new Set([
    'tipo', 'locacaoId', 'clienteId', 'clienteNome', 'produtoId',
    'produtoIdentificador', 'dataInicio', 'dataFim', 'dataPagamento',
    'relogioAnterior', 'relogioAtual', 'fichasRodadas', 'valorFicha',
    'totalBruto', 'descontoPartidasQtd', 'descontoPartidasValor', 'descontoDinheiro',
    'percentualEmpresa', 'subtotalAposDescontos', 'valorPercentual',
    'totalClientePaga', 'valorRecebido', 'saldoDevedorGerado',
    'status', 'dataVencimento', 'observacao',
    'syncStatus', 'lastSyncedAt', 'needsSync', 'version', 'deviceId'
  ]),
  rota: new Set([
    'descricao', 'status', 'cor', 'regiao', 'ordem', 'observacao',
    'syncStatus', 'lastSyncedAt', 'needsSync', 'version', 'deviceId'
  ]),
  usuario: new Set([
    'tipo', 'nome', 'cpf', 'telefone', 'email',
    // 'senha' REMOVIDO — senha nunca deve ser atualizada via sync
    'tipoPermissao', 'permissoesWeb', 'permissoesMobile', 'rotasPermitidas',
    'status', 'bloqueado', 'dataUltimoAcesso', 'ultimoAcessoDispositivo',
    'syncStatus', 'lastSyncedAt', 'needsSync', 'version', 'deviceId'
  ]),
}

// Limite de registros por entidade no pull
const SYNC_PULL_LIMIT = 500

// Helper para parsear changes que pode vir como string JSON
export function parseChanges(changes: any): Record<string, any> {
  if (typeof changes === 'string') {
    try {
      return JSON.parse(changes)
    } catch {
      return {}
    }
  }
  return changes || {}
}

// Filtrar apenas campos permitidos
export function filterAllowedFields(modelName: string, data: Record<string, any>): Record<string, any> {
  const allowed = ALLOWED_FIELDS[modelName]
  if (!allowed) {
    logger.warn(`[sync] Modelo não encontrado no ALLOWED_FIELDS: ${modelName}`)
    return data
  }

  const filtered: Record<string, any> = {}
  const removed: string[] = []
  
  for (const [key, value] of Object.entries(data)) {
    if (allowed.has(key)) {
      filtered[key] = value
    } else if (!['id', 'createdAt', 'cpfCnpj', 'rgIe', 'locacaoAtiva', 'estaLocado'].includes(key)) {
      removed.push(key)
    }
  }
  
  if (removed.length > 0) {
    logger.debug(`[sync] Campos removidos de ${modelName}: ${removed.join(', ')}`)
  }
  
  return filtered
}

// Converter tipos de dados para Prisma
export function convertForPrisma(data: Record<string, any>): Record<string, any> {
  const converted = { ...data }
  
  // Converter contatos de string JSON para objeto
  if (typeof converted.contatos === 'string') {
    try {
      converted.contatos = JSON.parse(converted.contatos)
    } catch {
      converted.contatos = null
    }
  }
  
  // Converter permissoesWeb/permissoesMobile de string JSON para objeto
  if (typeof converted.permissoesWeb === 'string') {
    try {
      converted.permissoesWeb = JSON.parse(converted.permissoesWeb)
    } catch {
      converted.permissoesWeb = {}
    }
  }
  if (typeof converted.permissoesMobile === 'string') {
    try {
      converted.permissoesMobile = JSON.parse(converted.permissoesMobile)
    } catch {
      converted.permissoesMobile = {}
    }
  }
  if (typeof converted.rotasPermitidas === 'string') {
    try {
      converted.rotasPermitidas = JSON.parse(converted.rotasPermitidas)
    } catch {
      converted.rotasPermitidas = []
    }
  }
  
  // Converter boolean strings/integers
  const booleanFields = ['needsSync', 'trocaPano', 'bloqueado']
  for (const field of booleanFields) {
    if (converted[field] !== undefined && converted[field] !== null) {
      if (converted[field] === 'true' || converted[field] === '1' || converted[field] === 1) {
        converted[field] = true
      } else if (converted[field] === 'false' || converted[field] === '0' || converted[field] === 0 || converted[field] === '') {
        converted[field] = false
      }
    }
  }
  
  // Converter números
  const numericFields = [
    'version', 'precoFicha', 'percentualEmpresa', 'percentualCliente', 'valorFixo',
    'relogioAnterior', 'relogioAtual', 'fichasRodadas', 'valorFicha', 'totalBruto',
    'descontoPartidasQtd', 'descontoPartidasValor', 'descontoDinheiro',
    'subtotalAposDescontos', 'valorPercentual', 'totalClientePaga',
    'valorRecebido', 'saldoDevedorGerado', 'ultimaLeituraRelogio',
    'latitude', 'longitude'
  ]
  
  for (const field of numericFields) {
    if (converted[field] !== undefined && converted[field] !== null && converted[field] !== '') {
      const num = Number(converted[field])
      if (!isNaN(num)) {
        converted[field] = num
      }
    }
  }
  
  return converted
}

// Validar e resolver foreign keys
async function validateForeignKeys(modelName: string, data: Record<string, any>): Promise<Record<string, any>> {
  const result = { ...data }
  
  // Validar rotaId para cliente
  if (modelName === 'cliente' && result.rotaId) {
    const rotaExists = await prisma.rota.findUnique({ where: { id: result.rotaId } })
    if (!rotaExists) {
      logger.warn(`[sync] rotaId '${result.rotaId}' não encontrado, removendo referência`)
      delete result.rotaId
      result.rotaNome = result.rotaNome || null
    }
  }
  
  // Validar clienteId para locacao/cobranca
  if ((modelName === 'locacao' || modelName === 'cobranca') && result.clienteId) {
    const clienteExists = await prisma.cliente.findUnique({ where: { id: result.clienteId } })
    if (!clienteExists) {
      logger.warn(`[sync] clienteId '${result.clienteId}' não encontrado, removendo referência`)
      delete result.clienteId
    }
  }
  
  // Validar produtoId para locacao/cobranca
  if ((modelName === 'locacao' || modelName === 'cobranca') && result.produtoId) {
    const produtoExists = await prisma.produto.findUnique({ where: { id: result.produtoId } })
    if (!produtoExists) {
      logger.warn(`[sync] produtoId '${result.produtoId}' não encontrado, removendo referência`)
      delete result.produtoId
    }
  }
  
  // Validar locacaoId para cobranca
  if (modelName === 'cobranca' && result.locacaoId) {
    const locacaoExists = await prisma.locacao.findUnique({ where: { id: result.locacaoId } })
    if (!locacaoExists) {
      logger.warn(`[sync] locacaoId '${result.locacaoId}' não encontrado, removendo referência`)
      delete result.locacaoId
    }
  }
  
  return result
}

// Ordenar mudanças por dependência (processar locacoes antes de cobrancas)
export function sortChangesByDependency(changes: ChangeLog[]): ChangeLog[] {
  return changes.sort((a, b) => {
    const orderA = PROCESSING_ORDER.indexOf(TABLE_TO_MODEL_MAP[TABLE_MAP[a.entityType]] as ModelName)
    const orderB = PROCESSING_ORDER.indexOf(TABLE_TO_MODEL_MAP[TABLE_MAP[b.entityType]] as ModelName)
    return orderA - orderB
  })
}

// Parsear lastSyncAt de forma segura, evitando Invalid Date
export function parseSafeSince(lastSyncAt: string): Date {
  if (lastSyncAt && !isNaN(Date.parse(lastSyncAt))) {
    return new Date(lastSyncAt)
  }
  // Primeira sync ou data inválida — usar epoch
  logger.warn(`[sync] lastSyncAt inválido ou vazio: "${lastSyncAt}", usando epoch`)
  return new Date(0)
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

  // IMPORTANTE: Ordenar mudanças por dependência
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

      // ──────────────────────────────────────────────────────
      // CORREÇÃO CRÍTICA #3: Ignorar replays (change já aplicado)
      // Verificar se o ChangeLog já foi sincronizado antes de processar
      // ──────────────────────────────────────────────────────
      const existingLog = await prisma.changeLog.findUnique({ where: { id: change.id } })
      if (existingLog?.synced) {
        logger.debug(`[sync/push] Change ${change.id} já aplicado, pulando replay`)
        continue
      }

      // Parsear o campo changes (pode vir como string JSON do SQLite)
      const changesData = parseChanges(change.changes)
      logger.debug(`[sync/push] --- ${change.operation.toUpperCase()} ${change.entityType}:${change.entityId} ---`)

      // Nome do modelo no Prisma (singular)
      const modelName = TABLE_TO_MODEL_MAP[table]
      const repo = (prisma as any)[modelName]

      if (!repo) {
        errors.push(`Modelo não encontrado: ${modelName}`)
        logger.error(`[sync/push] Modelo não encontrado: ${modelName}`)
        continue
      }

      if (change.operation === 'delete') {
        // ──────────────────────────────────────────────────────
        // CORREÇÃO CRÍTICA #2: Soft delete com detecção de conflito delete-vs-update
        // Antes de deletar, verificar se a versão no servidor é compatível
        // ──────────────────────────────────────────────────────
        const existingForDelete = await repo.findUnique({ where: { id: change.entityId } })
        
        if (!existingForDelete) {
          // Entidade já não existe — registrar changelog e continuar
          logger.debug(`[sync/push] Delete de entidade inexistente: ${change.entityId}`)
          await prisma.changeLog.upsert({
            where: { id: change.id },
            update: { synced: true, syncedAt: new Date() },
            create: {
              id: change.id,
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

        const mobileVersion = Number(changesData.version) || 0
        const serverVersion = Number(existingForDelete.version) || 0

        // Se servidor tem versão mais recente que o mobile, houve update de outro dispositivo
        // Gerar conflito delete-vs-update
        if (serverVersion > mobileVersion && serverVersion > 0) {
          logger.warn(`[sync/push] CONFLITO DELETE-VS-UPDATE! Server v${serverVersion} > Mobile v${mobileVersion}`)
          
          const conflict: SyncConflict = {
            entityId: change.entityId,
            entityType: change.entityType,
            localVersion: changesData,
            remoteVersion: existingForDelete,
            conflictType: 'delete',
            resolution: null,
          }
          conflicts.push(conflict)
          
          // Salvar conflito no banco
          await prisma.syncConflict.create({
            data: {
              entityId: change.entityId,
              entityType: change.entityType,
              localVersion: changesData,
              remoteVersion: existingForDelete,
              conflictType: 'delete',
            },
          })

          // Registrar changelog sem aplicar o delete
          await prisma.changeLog.upsert({
            where: { id: change.id },
            update: { synced: false, syncedAt: new Date() },
            create: {
              id: change.id,
              entityId: change.entityId,
              entityType: change.entityType,
              operation: 'delete',
              changes: changesData,
              deviceId,
              synced: false,
              syncedAt: new Date(),
            },
          })
          continue
        }

        // Sem conflito — aplicar soft delete com optimistic locking
        const deleteResult = await repo.updateMany({
          where: { id: change.entityId, version: serverVersion },
          data: { 
            deletedAt: new Date(), 
            syncStatus: 'synced', 
            needsSync: false,
            deviceId,
            version: { increment: 1 },
          },
        })

        if (deleteResult.count === 0) {
          // Outro processo atualizou entre nossa leitura e o delete — registrar conflito
          logger.warn(`[sync/push] Conflito de concorrência no delete: ${change.entityId}`)
          const currentRecord = await repo.findUnique({ where: { id: change.entityId } })
          if (currentRecord) {
            const conflict: SyncConflict = {
              entityId: change.entityId,
              entityType: change.entityType,
              localVersion: changesData,
              remoteVersion: currentRecord,
              conflictType: 'delete',
              resolution: null,
            }
            conflicts.push(conflict)
            await prisma.syncConflict.create({
              data: {
                entityId: change.entityId,
                entityType: change.entityType,
                localVersion: changesData,
                remoteVersion: currentRecord,
                conflictType: 'delete',
              },
            })
          }
        } else {
          updatedVersions.push({
            entityId: change.entityId,
            entityType: change.entityType,
            newVersion: serverVersion + 1,
          })
        }
        
        logger.debug(`[sync/push] Soft delete executado. Registros atualizados: ${deleteResult.count}`)
        
        // Registrar no changelog do servidor (upsert por ID — idempotente em retries)
        await prisma.changeLog.upsert({
          where: { id: change.id },
          update: { synced: true, syncedAt: new Date() },
          create: {
            id: change.id,
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

      // Filtrar e converter dados
      let filteredData = filterAllowedFields(modelName, changesData)
      filteredData = convertForPrisma(filteredData)
      
      // Validar foreign keys (remover referências inválidas)
      filteredData = await validateForeignKeys(modelName, filteredData)
      
      // Preparar dados para create/update
      const data: Record<string, any> = { 
        ...filteredData, 
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
        logger.debug(`[sync/push] Criando novo registro...`)
        
        try {
          const created = await repo.create({ 
            data: { 
              id: change.entityId, 
              ...data,
              createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            } 
          })
          logger.debug(`[sync/push] Registro criado com sucesso! ID: ${created.id}`)
          updatedVersions.push({
            entityId: change.entityId,
            entityType: change.entityType,
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
          // Conflito detectado - servidor tem versão mais recente
          logger.warn(`[sync/push] CONFLITO! Server v${serverVersion} > Mobile v${mobileVersion}`)
          
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
          // ──────────────────────────────────────────────────────
          // CORREÇÃO CRÍTICA #1: Optimistic locking no update
          // Usar updateMany com where: { id, version: serverVersion }
          // para evitar TOCTOU (race condition entre leitura e escrita)
          // ──────────────────────────────────────────────────────
          logger.debug(`[sync/push] Atualizando registro (optimistic lock server v${serverVersion})...`)
          
          try {
            const updateResult = await repo.updateMany({
              where: { id: change.entityId, version: serverVersion },
              data: { 
                ...data, 
                version: { increment: 1 } 
              },
            })

            if (updateResult.count === 0) {
              // Outro processo atualizou entre nossa leitura e o update — registrar conflito
              logger.warn(`[sync/push] Conflito de concorrência (TOCTOU) no update: ${change.entityId}`)
              const currentRecord = await repo.findUnique({ where: { id: change.entityId } })
              if (currentRecord) {
                const conflict: SyncConflict = {
                  entityId: change.entityId,
                  entityType: change.entityType,
                  localVersion: changesData,
                  remoteVersion: currentRecord,
                  conflictType: 'update',
                  resolution: null,
                }
                conflicts.push(conflict)
                await prisma.syncConflict.create({
                  data: {
                    entityId: change.entityId,
                    entityType: change.entityType,
                    localVersion: changesData,
                    remoteVersion: currentRecord,
                    conflictType: 'update',
                  },
                })
              }
            } else {
              const newVersion = serverVersion + 1
              updatedVersions.push({
                entityId: change.entityId,
                entityType: change.entityType,
                newVersion,
              })
              logger.debug(`[sync/push] Registro atualizado com sucesso! Nova versão: ${newVersion}`)
            }
          } catch (updateError) {
            logger.error(`[sync/push] Erro ao atualizar:`, updateError)
            errors.push(`Erro ao atualizar ${modelName}:${change.entityId} - ${String(updateError)}`)
            continue
          }
        }
      }

      // Registrar no changelog do servidor (upsert por ID do mobile — idempotente em retries)
      await prisma.changeLog.upsert({
        where: { id: change.id },
        update: { synced: true, syncedAt: new Date() },
        create: {
          id: change.id,
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
      logger.error(`[sync/push] ERRO CRÍTICO em ${change.entityType}:${change.entityId}:`, err)
    }
  }

  // Atualizar última sincronização do dispositivo
  try {
    await prisma.dispositivo.updateMany({
      where: { id: deviceId },
      data: { ultimaSincronizacao: new Date() },
    })
  } catch (err) {
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
  // ──────────────────────────────────────────────────────
  // CORREÇÃO CRÍTICA #5: Parse seguro de lastSyncAt
  // Evitar Invalid Date que faz o Prisma retornar vazio
  // ──────────────────────────────────────────────────────
  const since = parseSafeSince(lastSyncAt)

  // Detectar device estale (offline > 30 dias = janela de purge do ChangeLog)
  const diasOffline = (Date.now() - since.getTime()) / (1000 * 60 * 60 * 24)
  const diasStaleThreshold = Number(process.env.SYNC_STALE_THRESHOLD_DAYS) || 30
  const isStale = diasOffline > diasStaleThreshold
  if (isStale) {
    logger.warn(`[sync/pull] Device estale: ${Math.round(diasOffline)} dias sem sync — mobile deve usar /api/sync/snapshot`)
  }

  logger.info(`[sync/pull] ====== INICIANDO PULL ======`)
  logger.info(`[sync/pull] Dispositivo: ${deviceId}`)
  logger.info(`[sync/pull] Buscando mudanças desde: ${since.toISOString()}`)

  // ──────────────────────────────────────────────────────
  // CORREÇÃO CRÍTICA #4: Paginação do pull
  // - Ordenar por updatedAt ASC (mais antigos primeiro)
  // - Se results.length === SYNC_PULL_LIMIT, hasMore = true
  // - lastSyncAt = último resultado updatedAt (não Date.now())
  // ──────────────────────────────────────────────────────
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
    usuarios, tiposProduto, descricoesProduto, tamanhosProduto
  ] = await Promise.all([
    prisma.cliente.findMany({
      where: commonWhere,
      orderBy: { updatedAt: 'asc' },
      take: SYNC_PULL_LIMIT,
    }),
    prisma.produto.findMany({
      where: commonWhere,
      orderBy: { updatedAt: 'asc' },
      take: SYNC_PULL_LIMIT,
    }),
    prisma.locacao.findMany({
      where: commonWhere,
      orderBy: { updatedAt: 'asc' },
      take: SYNC_PULL_LIMIT,
    }),
    prisma.cobranca.findMany({
      where: commonWhere,
      orderBy: { updatedAt: 'asc' },
      take: SYNC_PULL_LIMIT,
    }),
    prisma.rota.findMany({
      where: commonWhere,
      orderBy: { updatedAt: 'asc' },
      take: SYNC_PULL_LIMIT,
    }),
    // Usuários - sincronizar permissões alteradas no web (não filtrar por deviceId)
    prisma.usuario.findMany({
      where: {
        deletedAt: null,
        updatedAt: { gt: since },
      },
      orderBy: { updatedAt: 'asc' },
      select: {
        id: true,
        nome: true,
        cpf: true,
        telefone: true,
        email: true,
        tipoPermissao: true,
        permissoesWeb: true,
        permissoesMobile: true,
        rotasPermitidas: true,
        status: true,
        bloqueado: true,
        dataUltimoAcesso: true,
        ultimoAcessoDispositivo: true,
        syncStatus: true,
        lastSyncedAt: true,
        needsSync: true,
        version: true,
        deviceId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    // Atributos de produto
    prisma.tipoProduto.findMany({
      where: { deletedAt: null, updatedAt: { gt: since } },
      orderBy: { updatedAt: 'asc' },
      take: SYNC_PULL_LIMIT,
    }),
    prisma.descricaoProduto.findMany({
      where: { deletedAt: null, updatedAt: { gt: since } },
      orderBy: { updatedAt: 'asc' },
      take: SYNC_PULL_LIMIT,
    }),
    prisma.tamanhoProduto.findMany({
      where: { deletedAt: null, updatedAt: { gt: since } },
      orderBy: { updatedAt: 'asc' },
      take: SYNC_PULL_LIMIT,
    }),
  ])

  // Determinar se há mais registros a buscar
  const hasMoreClientes = clientes.length === SYNC_PULL_LIMIT
  const hasMoreProdutos = produtos.length === SYNC_PULL_LIMIT
  const hasMoreLocacoes = locacoes.length === SYNC_PULL_LIMIT
  const hasMoreCobrancas = cobrancas.length === SYNC_PULL_LIMIT
  const hasMoreRotas = rotas.length === SYNC_PULL_LIMIT
  const hasMore = hasMoreClientes || hasMoreProdutos || hasMoreLocacoes || hasMoreCobrancas || hasMoreRotas

  // Calcular lastSyncAt seguro: usar o updatedAt do último registro retido
  // Se hasMore, o mobile deve usar o updatedAt do último registro como lastSyncAt
  // Se !hasMore, pode usar Date.now() (todas as mudanças foram entregues)
  let responseLastSyncAt: string
  if (hasMore) {
    // Encontrar o menor updatedAt entre os últimos registros de cada entidade
    // que atingiu o limite — o mobile deve pedir a partir desse ponto
    const allLastUpdatedAt = [
      hasMoreClientes && clientes.length > 0 ? new Date(clientes[clientes.length - 1].updatedAt).getTime() : null,
      hasMoreProdutos && produtos.length > 0 ? new Date(produtos[produtos.length - 1].updatedAt).getTime() : null,
      hasMoreLocacoes && locacoes.length > 0 ? new Date(locacoes[locacoes.length - 1].updatedAt).getTime() : null,
      hasMoreCobrancas && cobrancas.length > 0 ? new Date(cobrancas[cobrancas.length - 1].updatedAt).getTime() : null,
      hasMoreRotas && rotas.length > 0 ? new Date(rotas[rotas.length - 1].updatedAt).getTime() : null,
    ].filter((t): t is number => t !== null)

    // Usar o MENOR dos últimos updatedAt para não perder registros
    // O mobile fará pull incremental até hasMore=false
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

  // IMPORTANTE: O mobile espera as entidades dentro de 'changes'
  return {
    success: true,
    lastSyncAt: responseLastSyncAt,
    hasMore,
    isStale,
    changes: {
      clientes,
      produtos,
      locacoes,
      cobrancas,
      rotas,
      usuarios,
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

  logger.debug(`[sync/atributos] Processando atributos: ${tipos.length} tipos, ${descricoes.length} descrições, ${tamanhos.length} tamanhos`)

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
        rotasPermitidas: true, status: true, bloqueado: true,
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

  return {
    clientes, produtos, locacoes, cobrancas, rotas, usuarios,
    tiposProduto, descricoesProduto, tamanhosProduto,
  }
}

// ============================================================
// PURGE DE CHANGELOG ANTIGO
// ============================================================

/**
 * Remove entradas do ChangeLog já sincronizadas há mais de N dias.
 * Deve ser chamado periodicamente (ex: via cron ou após cada sync bem-sucedido).
 * Padrão: 30 dias — mantém histórico recente para debug.
 */
export async function purgeOldChangeLogs(diasRetencao: number = 30): Promise<number> {
  const limite = new Date()
  limite.setDate(limite.getDate() - diasRetencao)

  const result = await prisma.changeLog.deleteMany({
    where: {
      synced: true,
      syncedAt: { lt: limite },
    },
  })

  logger.info(`[sync/purge] Removidos ${result.count} changelogs antigos (>${diasRetencao} dias)`)
  return result.count
}
