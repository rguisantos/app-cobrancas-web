// POST /api/sync/pull — Servidor envia alterações para o mobile
// Refatorado: usa helpers centralizados de dispositivo
import { NextRequest, NextResponse } from 'next/server'
import { extrairToken, verificarToken } from '@/lib/jwt'
import { processPull } from '@/lib/sync-engine'
import { logger } from '@/lib/logger'
import { validateDispositivoAtivo } from '@/lib/dispositivo-helpers'
import { z } from 'zod'
import { registrarAuditoria } from '@/lib/auditoria'

const pullSchema = z.object({
  deviceId:   z.string(),
  deviceKey:  z.string(),
  lastSyncAt: z.string(),
})

export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  logger.info(`[sync/pull:${requestId}] PULL request started`)

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
    const { deviceId, deviceKey, lastSyncAt } = pullSchema.parse(body)
    logger.info(`[sync/pull:${requestId}] DeviceId: ${deviceId}, LastSyncAt: ${lastSyncAt}`)

    // Validar dispositivo usando helper centralizado
    const { dispositivo, error: deviceError } = await validateDispositivoAtivo(deviceKey)
    if (deviceError) {
      logger.warn(`[sync/pull:${requestId}] ${deviceError.message}`)
      return NextResponse.json({ success: false, error: deviceError.message }, { status: deviceError.status })
    }

    logger.debug(`[sync/pull:${requestId}] Dispositivo autorizado, processando pull...`)
    const response = await processPull(deviceId, lastSyncAt)

    const totalChanges =
      (response.changes?.clientes?.length || 0) +
      (response.changes?.produtos?.length || 0) +
      (response.changes?.locacoes?.length || 0) +
      (response.changes?.cobrancas?.length || 0) +
      (response.changes?.rotas?.length || 0)

    logger.info(`[sync/pull:${requestId}] PULL concluído. Total: ${totalChanges}, hasMore: ${response.hasMore}, isStale: ${response.isStale}`)

    registrarAuditoria({
      acao: 'sync_pull',
      entidade: 'sync',
      detalhes: { deviceId, totalChanges },
      usuarioId: tokenValido.sub,
      ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
      origem: 'mobile',
    })

    return NextResponse.json(response)
  } catch (err) {
    if (err instanceof z.ZodError) {
      logger.error(`[sync/pull:${requestId}] Erro de validação:`, err.errors)
      return NextResponse.json({ success: false, error: 'Payload inválido', details: err.errors }, { status: 400 })
    }
    logger.error(`[sync/pull:${requestId}] Erro interno:`, err)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
