// lib/sync-conflict-resolver.ts
// Lógica compartilhada de resolução de conflitos de sincronização
// Usada por ambos: /api/sync/conflict/resolve (mobile JWT) e /api/admin/sync/conflict/resolve (admin NextAuth)
// Antes: ~95% de código duplicado entre os dois endpoints

import { prisma } from './prisma'
import { logger } from './logger'
import { z } from 'zod'

// ── Schema de validação (suporta PT e EN) ─────────────────────────────

export const conflictResolveSchema = z.object({
  conflitoId: z.string().optional(),
  conflictId: z.string().optional(),
  estrategia: z.enum(['local', 'remote', 'newest', 'manual']).optional(),
  resolution: z.enum(['local', 'remote', 'newest', 'manual']).optional(),
  versaoFinal: z.any().optional(),
  manualData: z.any().optional(),
}).transform((data) => ({
  conflitoId: data.conflitoId || data.conflictId || '',
  estrategia: data.estrategia || data.resolution || 'newest',
  versaoFinal: data.versaoFinal || data.manualData,
}))

export type ConflictResolveInput = z.infer<typeof conflictResolveSchema>

// ── Mapeamento de entidades ────────────────────────────────────────────

const ENTITY_TABLE_MAP: Record<string, string> = {
  cliente: 'cliente',
  produto: 'produto',
  locacao: 'locacao',
  cobranca: 'cobranca',
  rota: 'rota',
  usuario: 'usuario', // ADICIONADO: antes faltava no map dos endpoints de conflito
}

// Campos que NUNCA devem ser sobrescritos via resolução de conflito
const CAMPOS_PROIBIDOS = new Set([
  'id', 'createdAt', 'deletedAt', 'senha',
  'deviceId', 'syncStatus', 'needsSync', 'version',
])

// ── Resolução de conflitos ────────────────────────────────────────────

export interface ConflictResolveResult {
  success: boolean
  error?: string
  status?: number
}

/**
 * Resolve um conflito de sincronização — lógica centralizada
 * @param input - Dados da resolução (ID, estratégia, versão manual)
 * @returns Resultado da operação
 */
export async function resolveConflict(
  input: ConflictResolveInput
): Promise<ConflictResolveResult> {
  const { conflitoId, estrategia, versaoFinal } = input

  if (!conflitoId) {
    return { success: false, error: 'ID do conflito é obrigatório', status: 400 }
  }

  // Buscar conflito
  const conflito = await prisma.syncConflict.findUnique({
    where: { id: conflitoId },
  })

  if (!conflito) {
    return { success: false, error: 'Conflito não encontrado', status: 404 }
  }

  if (conflito.resolution) {
    return { success: false, error: 'Conflito já resolvido', status: 400 }
  }

  // Determinar versão final baseado na estratégia
  let versao: any
  switch (estrategia) {
    case 'local':
      versao = conflito.localVersion
      break
    case 'remote':
      versao = conflito.remoteVersion
      break
    case 'newest': {
      const localData = conflito.localVersion as Record<string, any> | null
      const remoteData = conflito.remoteVersion as Record<string, any> | null
      const localDate = localData?.updatedAt ? new Date(localData.updatedAt) : new Date(0)
      const remoteDate = remoteData?.updatedAt ? new Date(remoteData.updatedAt) : new Date(0)
      versao = localDate > remoteDate ? conflito.localVersion : conflito.remoteVersion
      break
    }
    case 'manual':
      versao = versaoFinal
      break
  }

  // Aplicar versão no banco
  const tableName = ENTITY_TABLE_MAP[conflito.entityType]
  if (tableName && versao) {
    const repo = (prisma as any)[tableName]
    if (repo) {
      // Filtrar campos proibidos para evitar mass assignment
      const dadosFiltrados: Record<string, any> = {}
      for (const [k, v] of Object.entries(versao as Record<string, any>)) {
        if (!CAMPOS_PROIBIDOS.has(k)) {
          dadosFiltrados[k] = v
        }
      }

      try {
        await repo.update({
          where: { id: conflito.entityId },
          data: {
            ...dadosFiltrados,
            version: { increment: 1 },
            syncStatus: 'synced',
            needsSync: true, // Marcar para sincronizar com outros dispositivos
          },
        })
        logger.info(`[conflict-resolver] Conflito ${conflitoId} resolvido com estratégia "${estrategia}" para ${conflito.entityType}:${conflito.entityId}`)
      } catch (err) {
        logger.error(`[conflict-resolver] Erro ao aplicar resolução no banco:`, err)
        return { success: false, error: 'Erro ao aplicar resolução no banco de dados', status: 500 }
      }
    } else {
      logger.warn(`[conflict-resolver] Modelo não encontrado para entityType: ${conflito.entityType}`)
    }
  }

  // Marcar conflito como resolvido
  try {
    await prisma.syncConflict.update({
      where: { id: conflitoId },
      data: {
        resolution: estrategia,
        resolvedAt: new Date(),
      },
    })
  } catch (err) {
    logger.error(`[conflict-resolver] Erro ao marcar conflito como resolvido:`, err)
    return { success: false, error: 'Erro ao atualizar conflito', status: 500 }
  }

  return { success: true }
}
