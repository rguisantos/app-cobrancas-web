// POST /api/sync/pull — Servidor envia alterações para o mobile
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extrairToken, verificarToken } from '@/lib/jwt'
import { processPull } from '@/lib/sync-engine'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const pullSchema = z.object({
  deviceId:   z.string(),
  deviceKey:  z.string(),
  lastSyncAt: z.string(),
})

export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  logger.info(`[SYNC/PULL:${requestId}] PULL request started`)

  // Autenticação via JWT do mobile
  const authHeader = req.headers.get('Authorization')
  
  const token = extrairToken(authHeader)
  if (!token) {
    logger.warn(`[SYNC/PULL:${requestId}] Token não encontrado no header`)
    return NextResponse.json({ success: false, error: 'Token não fornecido' }, { status: 401 })
  }
  
  const tokenValido = verificarToken(token)
  if (!tokenValido) {
    logger.warn(`[SYNC/PULL:${requestId}] Token inválido ou expirado`)
    return NextResponse.json({ success: false, error: 'Token inválido ou expirado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { deviceId, deviceKey, lastSyncAt } = pullSchema.parse(body)
    logger.info(`[SYNC/PULL:${requestId}] DeviceId: ${deviceId}, LastSyncAt: ${lastSyncAt}`)

    // Validar dispositivo registrado - buscar por deviceKey (campo técnico)
    // com fallback para chave (compatibilidade)
    let dispositivo = await prisma.dispositivo.findUnique({ where: { deviceKey: deviceKey } })
    if (!dispositivo) {
      // Fallback: tentar buscar por chave (para compatibilidade)
      dispositivo = await prisma.dispositivo.findUnique({ where: { chave: deviceKey } })
      if (dispositivo) {
        logger.debug(`[SYNC/PULL:${requestId}] Dispositivo encontrado pela chave (legado)`)
      }
    }
    
    if (!dispositivo) {
      logger.warn(`[SYNC/PULL:${requestId}] Dispositivo não encontrado`)
      return NextResponse.json({ success: false, error: 'Dispositivo não encontrado' }, { status: 403 })
    }
    
    if (dispositivo.status !== 'ativo') {
      logger.warn(`[SYNC/PULL:${requestId}] Dispositivo inativo: ${dispositivo.status}`)
      return NextResponse.json({ success: false, error: 'Dispositivo inativo' }, { status: 403 })
    }

    logger.debug(`[SYNC/PULL:${requestId}] Dispositivo autorizado, processando pull...`)
    const response = await processPull(deviceId, lastSyncAt)
    
    const totalChanges = 
      (response.changes?.clientes?.length || 0) +
      (response.changes?.produtos?.length || 0) +
      (response.changes?.locacoes?.length || 0) +
      (response.changes?.cobrancas?.length || 0) +
      (response.changes?.rotas?.length || 0)
    
    logger.info(`[SYNC/PULL:${requestId}] PULL concluído. Total: ${totalChanges}, hasMore: ${response.hasMore}, isStale: ${response.isStale}`)
    
    return NextResponse.json(response)
  } catch (err) {
    if (err instanceof z.ZodError) {
      logger.error(`[SYNC/PULL:${requestId}] Erro de validação:`, err.errors)
      return NextResponse.json({ success: false, error: 'Payload inválido', details: err.errors }, { status: 400 })
    }
    logger.error(`[SYNC/PULL:${requestId}] Erro interno:`, err)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
