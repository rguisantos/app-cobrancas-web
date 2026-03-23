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
const ALLOWED_FIELDS: Record<string, Set<string>> = {
  cliente: new Set([
    'tipo', 'tipoPessoa', 'identificador', 'nomeExibicao', 'nomeCompleto',
    'razaoSocial', 'nomeFantasia', 'cpf', 'cnpj', 'rg', 'inscricaoEstadual',
    'email', 'telefonePrincipal', 'contatos', 'cep', 'logradouro', 'numero',
    'complemento', 'bairro', 'cidade', 'estado', 'rotaId', 'rotaNome',
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
    'descricao', 'status',
    'syncStatus', 'lastSyncedAt', 'needsSync', 'version', 'deviceId'
  ]),
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

// Filtrar apenas campos permitidos
function filterAllowedFields(modelName: string, data: Record<string, any>): Record<string, any> {
  const allowed = ALLOWED_FIELDS[modelName]
  if (!allowed) {
    console.log(`[sync] Modelo não encontrado no ALLOWED_FIELDS: ${modelName}`)
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
    console.log(`[sync] Campos removidos de ${modelName}: ${removed.join(', ')}`)
  }
  
  return filtered
}

// Converter tipos de dados para Prisma
function convertForPrisma(data: Record<string, any>): Record<string, any> {
  const converted = { ...data }
  
  // Converter contatos de string JSON para objeto
  if (typeof converted.contatos === 'string') {
    try {
      converted.contatos = JSON.parse(converted.contatos)
    } catch {
      converted.contatos = null
    }
  }
  
  // Converter boolean strings/integers
  const booleanFields = ['needsSync', 'trocaPano']
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
    'valorRecebido', 'saldoDevedorGerado', 'ultimaLeituraRelogio'
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

// ============================================================
// PUSH — mobile → servidor
// ============================================================
export async function processPush(
  deviceId: string,
  changes: ChangeLog[]
): Promise<{ conflicts: SyncConflict[]; errors: string[] }> {
  const conflicts: SyncConflict[] = []
  const errors: string[] = []

  console.log(`[sync/push] ====== INICIANDO PUSH ======`)
  console.log(`[sync/push] Dispositivo: ${deviceId}`)
  console.log(`[sync/push] Total de mudanças: ${changes.length}`)

  for (const change of changes) {
    try {
      const table = TABLE_MAP[change.entityType]
      if (!table) { 
        errors.push(`Tipo desconhecido: ${change.entityType}`) 
        console.error(`[sync/push] Tipo desconhecido: ${change.entityType}`)
        continue 
      }

      // Parsear o campo changes (pode vir como string JSON do SQLite)
      const changesData = parseChanges(change.changes)
      console.log(`[sync/push] --- ${change.operation.toUpperCase()} ${change.entityType}:${change.entityId} ---`)
      console.log(`[sync/push] Dados recebidos:`, JSON.stringify(changesData, null, 2).substring(0, 500))

      // Nome do modelo no Prisma (singular)
      const modelName = table.slice(0, -1) as 'cliente' | 'produto' | 'locacao' | 'cobranca' | 'rota'
      const repo = (prisma as any)[modelName]

      if (!repo) {
        errors.push(`Modelo não encontrado: ${modelName}`)
        console.error(`[sync/push] Modelo não encontrado: ${modelName}`)
        continue
      }

      if (change.operation === 'delete') {
        // Soft delete
        const result = await repo.updateMany({
          where: { id: change.entityId },
          data: { 
            deletedAt: new Date(), 
            syncStatus: 'synced', 
            needsSync: false,
            deviceId 
          },
        })
        
        console.log(`[sync/push] Soft delete executado. Registros atualizados: ${result.count}`)
        
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

      // Filtrar e converter dados
      let filteredData = filterAllowedFields(modelName, changesData)
      filteredData = convertForPrisma(filteredData)
      
      console.log(`[sync/push] Dados filtrados:`, JSON.stringify(filteredData, null, 2).substring(0, 500))
      
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
        console.log(`[sync/push] Criando novo registro...`)
        
        try {
          const created = await repo.create({ 
            data: { 
              id: change.entityId, 
              ...data,
              createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            } 
          })
          console.log(`[sync/push] Registro criado com sucesso! ID: ${created.id}`)
        } catch (createError) {
          console.error(`[sync/push] Erro ao criar:`, createError)
          errors.push(`Erro ao criar ${modelName}:${change.entityId} - ${String(createError)}`)
          continue
        }
      } else {
        // UPDATE - verificar conflito de versão
        const mobileVersion = Number(changesData.version) || 0
        const serverVersion = Number(existing.version) || 0

        if (serverVersion > mobileVersion && serverVersion > 0) {
          // Conflito detectado - servidor tem versão mais recente
          console.log(`[sync/push] CONFLITO! Server v${serverVersion} > Mobile v${mobileVersion}`)
          
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
          console.log(`[sync/push] Atualizando registro existente (server v${serverVersion}, mobile v${mobileVersion})...`)
          
          try {
            await repo.update({
              where: { id: change.entityId },
              data: { 
                ...data, 
                version: { increment: 1 } 
              },
            })
            console.log(`[sync/push] Registro atualizado com sucesso!`)
          } catch (updateError) {
            console.error(`[sync/push] Erro ao atualizar:`, updateError)
            errors.push(`Erro ao atualizar ${modelName}:${change.entityId} - ${String(updateError)}`)
            continue
          }
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
      console.error(`[sync/push] ERRO CRÍTICO em ${change.entityType}:${change.entityId}:`, err)
    }
  }

  // Atualizar última sincronização do dispositivo
  try {
    await prisma.dispositivo.updateMany({
      where: { id: deviceId },
      data: { ultimaSincronizacao: new Date() },
    })
  } catch (err) {
    console.log(`[sync/push] Dispositivo não encontrado para atualizar última sync`)
  }

  console.log(`[sync/push] ====== PUSH CONCLUÍDO ======`)
  console.log(`[sync/push] Conflitos: ${conflicts.length}, Erros: ${errors.length}`)
  
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

  console.log(`[sync/pull] ====== INICIANDO PULL ======`)
  console.log(`[sync/pull] Dispositivo: ${deviceId}`)
  console.log(`[sync/pull] Buscando mudanças desde: ${since.toISOString()}`)

  // Buscar todas as entidades modificadas depois de lastSyncAt
  // que NÃO foram geradas por este dispositivo
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

  console.log(`[sync/pull] Resultados:`)
  console.log(`[sync/pull] - Clientes: ${clientes.length}`)
  console.log(`[sync/pull] - Produtos: ${produtos.length}`)
  console.log(`[sync/pull] - Locações: ${locacoes.length}`)
  console.log(`[sync/pull] - Cobranças: ${cobrancas.length}`)
  console.log(`[sync/pull] - Rotas: ${rotas.length}`)
  console.log(`[sync/pull] - Tipos: ${tiposProduto.length}`)
  console.log(`[sync/pull] - Descrições: ${descricoesProduto.length}`)
  console.log(`[sync/pull] - Tamanhos: ${tamanhosProduto.length}`)
  console.log(`[sync/pull] ====== PULL CONCLUÍDO ======`)

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

  console.log(`[sync/atributos] Processando atributos: ${tipos.length} tipos, ${descricoes.length} descrições, ${tamanhos.length} tamanhos`)

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
