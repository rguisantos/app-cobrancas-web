// lib/sync-helpers.ts
// Funções auxiliares do motor de sincronização
// Extraído de sync-engine.ts para melhor organização

import { logger } from './logger'
import type { ChangeLog } from '@cobrancas/shared'

// ── Tipos ──────────────────────────────────────────────────────────────

type EntityTable = 'clientes' | 'produtos' | 'locacoes' | 'cobrancas' | 'rotas' | 'usuarios'
type ModelName = 'cliente' | 'produto' | 'locacao' | 'cobranca' | 'rota' | 'usuario'

// ── Mapeamentos ────────────────────────────────────────────────────────

export const TABLE_MAP: Record<string, EntityTable> = {
  cliente:  'clientes',
  produto:  'produtos',
  locacao:  'locacoes',
  cobranca: 'cobrancas',
  rota:     'rotas',
  usuario:  'usuarios',
}

export const TABLE_TO_MODEL_MAP: Record<EntityTable, ModelName> = {
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

// Campos permitidos por modelo (whitelist)
export const ALLOWED_FIELDS: Record<string, Set<string>> = {
  cliente: new Set([
    'tipo', 'tipoPessoa', 'identificador', 'nomeExibicao', 'nomeCompleto',
    'razaoSocial', 'nomeFantasia', 'cpf', 'cnpj', 'rg', 'inscricaoEstadual',
    'email', 'telefonePrincipal', 'contatos', 'cep', 'logradouro', 'numero',
    'complemento', 'bairro', 'cidade', 'estado', 'rotaId', 'rotaNome',
    'latitude', 'longitude',
    'status', 'observacao', 'dataCadastro', 'dataUltimaAlteracao',
    'syncStatus', 'lastSyncedAt', 'needsSync', 'version', 'deviceId',
  ]),
  produto: new Set([
    'tipo', 'identificador', 'numeroRelogio', 'tipoId', 'tipoNome',
    'descricaoId', 'descricaoNome', 'tamanhoId', 'tamanhoNome',
    'codigoCH', 'codigoABLF', 'conservacao', 'statusProduto',
    'dataFabricacao', 'dataUltimaManutencao', 'relatorioUltimaManutencao',
    'dataAvaliacao', 'aprovacao', 'estabelecimento', 'observacao', 'dataCadastro',
    'dataUltimaAlteracao',
    'syncStatus', 'lastSyncedAt', 'needsSync', 'version', 'deviceId',
  ]),
  locacao: new Set([
    'tipo', 'clienteId', 'clienteNome', 'produtoId', 'produtoIdentificador',
    'produtoTipo', 'dataLocacao', 'dataFim', 'observacao', 'formaPagamento',
    'numeroRelogio', 'precoFicha', 'percentualEmpresa', 'percentualCliente',
    'periodicidade', 'valorFixo', 'dataPrimeiraCobranca', 'status',
    'ultimaLeituraRelogio', 'dataUltimaCobranca', 'trocaPano', 'dataUltimaManutencao',
    'syncStatus', 'lastSyncedAt', 'needsSync', 'version', 'deviceId',
  ]),
  cobranca: new Set([
    'tipo', 'locacaoId', 'clienteId', 'clienteNome', 'produtoId',
    'produtoIdentificador', 'dataInicio', 'dataFim', 'dataPagamento',
    'relogioAnterior', 'relogioAtual', 'fichasRodadas', 'valorFicha',
    'totalBruto', 'descontoPartidasQtd', 'descontoPartidasValor', 'descontoDinheiro',
    'percentualEmpresa', 'subtotalAposDescontos', 'valorPercentual',
    'totalClientePaga', 'valorRecebido', 'saldoDevedorGerado',
    'status', 'dataVencimento', 'observacao',
    'syncStatus', 'lastSyncedAt', 'needsSync', 'version', 'deviceId',
  ]),
  rota: new Set([
    'descricao', 'status', 'cor', 'regiao', 'ordem', 'observacao',
    'syncStatus', 'lastSyncedAt', 'needsSync', 'version', 'deviceId',
  ]),
  usuario: new Set([
    'tipo', 'nome', 'cpf', 'telefone', 'email',
    // 'senha' REMOVIDO — senha nunca deve ser atualizada via sync
    'tipoPermissao', 'permissoesWeb', 'permissoesMobile',
    'status', 'bloqueado', 'dataUltimoAcesso', 'ultimoAcessoDispositivo',
    'syncStatus', 'lastSyncedAt', 'needsSync', 'version', 'deviceId',
  ]),
}

// Limite de registros por entidade no pull
export const SYNC_PULL_LIMIT = 500

// ── Funções utilitárias ────────────────────────────────────────────────

/**
 * Parsear changes que pode vir como string JSON (do SQLite)
 */
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

/**
 * Filtrar apenas campos permitidos (whitelist)
 */
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

/**
 * Converter tipos de dados SQLite → Prisma
 */
export function convertForPrisma(data: Record<string, any>): Record<string, any> {
  const converted = { ...data }

  // Converter contatos de string JSON para objeto
  if (typeof converted.contatos === 'string') {
    try { converted.contatos = JSON.parse(converted.contatos) } catch { converted.contatos = null }
  }

  // Converter permissões de string JSON para objeto
  if (typeof converted.permissoesWeb === 'string') {
    try { converted.permissoesWeb = JSON.parse(converted.permissoesWeb) } catch { converted.permissoesWeb = {} }
  }
  if (typeof converted.permissoesMobile === 'string') {
    try { converted.permissoesMobile = JSON.parse(converted.permissoesMobile) } catch { converted.permissoesMobile = {} }
  }
  // rotasPermitidas is now handled via UsuarioRota relation (rotasPermitidasRel)
  // Mobile sync data with rotasPermitidas is converted separately in the sync engine
  if (typeof converted.rotasPermitidas === 'string') {
    try { converted.rotasPermitidas = JSON.parse(converted.rotasPermitidas) } catch { converted.rotasPermitidas = [] }
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
    'latitude', 'longitude',
  ]

  for (const field of numericFields) {
    if (converted[field] !== undefined && converted[field] !== null && converted[field] !== '') {
      const num = Number(converted[field])
      if (!isNaN(num)) converted[field] = num
    }
  }

  return converted
}

/**
 * Ordenar mudanças por dependência (processar locacoes antes de cobrancas)
 */
export function sortChangesByDependency(changes: ChangeLog[]): ChangeLog[] {
  return changes.sort((a, b) => {
    const orderA = PROCESSING_ORDER.indexOf(TABLE_TO_MODEL_MAP[TABLE_MAP[a.entityType]] as ModelName)
    const orderB = PROCESSING_ORDER.indexOf(TABLE_TO_MODEL_MAP[TABLE_MAP[b.entityType]] as ModelName)
    return orderA - orderB
  })
}

/**
 * Parsear lastSyncAt de forma segura, evitando Invalid Date
 */
export function parseSafeSince(lastSyncAt: string): Date {
  if (lastSyncAt && !isNaN(Date.parse(lastSyncAt))) {
    return new Date(lastSyncAt)
  }
  logger.warn(`[sync] lastSyncAt inválido ou vazio: "${lastSyncAt}", usando epoch`)
  return new Date(0)
}
