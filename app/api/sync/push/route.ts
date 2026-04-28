// POST /api/sync/push — Mobile envia alterações locais para o servidor
// Refatorado: usa helpers centralizados de dispositivo
import { NextRequest, NextResponse } from 'next/server'
import { extrairToken, verificarToken } from '@/lib/jwt'
import { processPush, purgeOldChangeLogs } from '@/lib/sync-engine'
import { logger } from '@/lib/logger'
import { validateDispositivoAtivo } from '@/lib/dispositivo-helpers'
import type { ChangeLog } from '@cobrancas/shared'
import { z } from 'zod'

// Schema flexível para aceitar tipos do SQLite (string JSON, number, null)
const changeLogSchema = z.object({
  id:         z.string(),
  entityId:   z.string(),
  entityType: z.enum(['cliente', 'produto', 'locacao', 'cobranca', 'rota', 'usuario']),
  operation:  z.enum(['create', 'update', 'delete']),
  changes:    z.union([z.record(z.any()), z.string()]),
  timestamp:  z.string(),
  deviceId:   z.string(),
  synced:     z.union([z.boolean(), z.number()]),
  syncedAt:   z.string().nullable().optional(),
})

function normalizeChangeLog(change: z.infer<typeof changeLogSchema>) {
  return {
    ...change,
    changes: typeof change.changes === 'string' ? JSON.parse(change.changes) : change.changes,
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
  logger.info(`[sync/push:${requestId}] PUSH request started`)

  // Autenticação via JWT do mobile
  const authHeader = req.headers.get('Authorization')
  const token = extrairToken(authHeader)
  if (!token) {
    return NextResponse.json({ success: false, error: 'Token não fornecido' }, { status: 401 })
  }

  const tokenValido = verificarToken(token)
  if (!tokenValido) {
    return NextResponse.json({ success: false, error: 'Token inválido ou expirado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { deviceId, deviceKey, changes } = pushSchema.parse(body)
    logger.info(`[sync/push:${requestId}] DeviceId: ${deviceId}, Changes: ${changes.length}`)

    // Validar dispositivo usando helper centralizado
    const { dispositivo, error: deviceError } = await validateDispositivoAtivo(deviceKey)
    if (deviceError) {
      logger.warn(`[sync/push:${requestId}] ${deviceError.message}`)
      return NextResponse.json({ success: false, error: deviceError.message }, { status: deviceError.status })
    }

    logger.debug(`[sync/push:${requestId}] Dispositivo: ${dispositivo.nome} (${dispositivo.status})`)

    // Normalizar dados do SQLite (converter tipos)
    const normalizedChanges = changes.map(normalizeChangeLog)

    const { conflicts, errors, updatedVersions } = await processPush(deviceId, normalizedChanges)

    logger.info(`[sync/push:${requestId}] PUSH concluído — Conflitos: ${conflicts.length}, Erros: ${errors.length}`)

    // Purge assíncrono — throttle simples via timestamp
    const requestMinute = Math.floor(Date.now() / (1000 * 60 * 60))
    if (requestMinute % 24 === 0) {
      purgeOldChangeLogs(30).catch(err =>
        logger.warn('[sync/push] Erro no purge de changelog:', err)
      )
    }

    return NextResponse.json({
      success: true,
      lastSyncAt: new Date().toISOString(),
      updatedVersions,
      conflicts,
      errors: errors.length ? errors : undefined,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      logger.error(`[sync/push:${requestId}] Erro de validação:`, err.errors)
      return NextResponse.json({ success: false, error: 'Payload inválido', details: err.errors }, { status: 400 })
    }
    logger.error(`[sync/push:${requestId}] Erro interno:`, err)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
