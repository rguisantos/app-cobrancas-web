// POST /api/sync/push — Mobile envia alterações locais para o servidor
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extrairToken, verificarToken } from '@/lib/jwt'
import { processPush, purgeOldChangeLogs } from '@/lib/sync-engine'
import { logger } from '@/lib/logger'
import type { ChangeLog, EntityType } from '@cobrancas/shared'
import { z } from 'zod'

// Schema flexível para aceitar tipos do SQLite (string JSON, number, null)
const changeLogSchema = z.object({
  id:         z.string(),
  entityId:   z.string(),
  entityType: z.enum(['cliente', 'produto', 'locacao', 'cobranca', 'rota', 'usuario']),
  operation:  z.enum(['create', 'update', 'delete']),
  changes:    z.union([z.record(z.any()), z.string()]), // Pode ser objeto ou string JSON
  timestamp:  z.string(),
  deviceId:   z.string(),
  synced:     z.union([z.boolean(), z.number()]), // Pode ser boolean ou 0/1
  syncedAt:   z.string().nullable().optional(), // Pode ser null
})

// Função para normalizar dados do SQLite
function normalizeChangeLog(change: z.infer<typeof changeLogSchema>) {
  return {
    ...change,
    changes: typeof change.changes === 'string' 
      ? JSON.parse(change.changes) 
      : change.changes,
    synced: Boolean(change.synced),
    syncedAt: change.syncedAt || undefined,
  }
}

const pushSchema = z.object({
  deviceId:   z.string(),
  deviceKey:  z.string(),
  lastSyncAt: z.string(),
  changes:    z.array(changeLogSchema),
})

export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  logger.info(`[SYNC/PUSH:${requestId}] PUSH request started`)

  // Autenticação via JWT do mobile
  const authHeader = req.headers.get('Authorization')
  
  const token = extrairToken(authHeader)
  if (!token) {
    logger.warn(`[SYNC/PUSH:${requestId}] Token não encontrado no header`)
    return NextResponse.json({ success: false, error: 'Token não fornecido' }, { status: 401 })
  }
  
  const tokenValido = verificarToken(token)
  if (!tokenValido) {
    logger.warn(`[SYNC/PUSH:${requestId}] Token inválido ou expirado`)
    return NextResponse.json({ success: false, error: 'Token inválido ou expirado' }, { status: 401 })
  }
  
  logger.debug(`[SYNC/PUSH:${requestId}] Token válido`)

  try {
    const body = await req.json()
    const { deviceId, deviceKey, changes } = pushSchema.parse(body)
    logger.info(`[SYNC/PUSH:${requestId}] DeviceId: ${deviceId}, Changes: ${changes.length}`)

    // Validar dispositivo registrado - buscar por deviceKey (campo técnico)
    // com fallback para chave (compatibilidade)
    let dispositivo = await prisma.dispositivo.findUnique({ where: { deviceKey: deviceKey } })
    if (!dispositivo) {
      // Fallback: tentar buscar por chave (para compatibilidade)
      dispositivo = await prisma.dispositivo.findUnique({ where: { chave: deviceKey } })
      if (dispositivo) {
        logger.debug(`[SYNC/PUSH:${requestId}] Dispositivo encontrado pela chave (legado)`)
      }
    }
    
    if (!dispositivo) {
      logger.warn(`[SYNC/PUSH:${requestId}] Dispositivo não encontrado`)
      return NextResponse.json({ success: false, error: 'Dispositivo não encontrado' }, { status: 403 })
    }
    
    logger.debug(`[SYNC/PUSH:${requestId}] Dispositivo: ${dispositivo.nome} (${dispositivo.status})`)
    
    if (dispositivo.status !== 'ativo') {
      logger.warn(`[SYNC/PUSH:${requestId}] Dispositivo inativo: ${dispositivo.status}`)
      return NextResponse.json({ success: false, error: 'Dispositivo inativo' }, { status: 403 })
    }

    // Normalizar dados do SQLite (converter tipos)
    const normalizedChanges = changes.map(normalizeChangeLog)
    
    const { conflicts, errors, updatedVersions } = await processPush(deviceId, normalizedChanges)

    logger.info(`[SYNC/PUSH:${requestId}] PUSH concluído — Conflitos: ${conflicts.length}, Erros: ${errors.length}`)

    // Purge assíncrono — throttle simples via timestamp
    const requestMinute = Math.floor(Date.now() / (1000 * 60 * 60))  // muda a cada hora
    if (requestMinute % 24 === 0) {  // ~1x a cada 24 ciclos (24h se 1 push/hora)
      purgeOldChangeLogs(30).catch(err =>
        logger.warn('[SYNC/PUSH] Erro no purge de changelog:', err)
      )
    }

    return NextResponse.json({
      success: true,
      lastSyncAt: new Date().toISOString(),
      updatedVersions, // CORREÇÃO: retornar versões atualizadas para o mobile
      conflicts,
      errors: errors.length ? errors : undefined,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      logger.error(`[SYNC/PUSH:${requestId}] Erro de validação:`, err.errors)
      return NextResponse.json({ success: false, error: 'Payload inválido', details: err.errors }, { status: 400 })
    }
    logger.error(`[SYNC/PUSH:${requestId}] Erro interno:`, err)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
