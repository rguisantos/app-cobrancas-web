// POST /api/sync/snapshot — Estado completo para device estale
// Quando um dispositivo fica >30 dias sem sync, o ChangeLog pode ter sido purgado,
// impossibilitando o pull incremental. Este endpoint devolve TODOS os dados ativos.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extrairToken, verificarToken } from '@/lib/jwt'
import { processSnapshot } from '@/lib/sync-engine'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const snapshotSchema = z.object({
  deviceId:  z.string(),
  deviceKey: z.string(),
})

export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  logger.info(`[SYNC/SNAPSHOT:${requestId}] SNAPSHOT request started`)

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
    const { deviceId, deviceKey } = snapshotSchema.parse(body)
    logger.info(`[SYNC/SNAPSHOT:${requestId}] DeviceId: ${deviceId}`)

    // Validar dispositivo
    let dispositivo = await prisma.dispositivo.findUnique({ where: { deviceKey: deviceKey } })
    if (!dispositivo) {
      dispositivo = await prisma.dispositivo.findUnique({ where: { chave: deviceKey } })
    }
    
    if (!dispositivo) {
      return NextResponse.json({ success: false, error: 'Dispositivo não encontrado' }, { status: 403 })
    }
    
    if (dispositivo.status !== 'ativo') {
      return NextResponse.json({ success: false, error: 'Dispositivo inativo' }, { status: 403 })
    }

    const snapshot = await processSnapshot(deviceId)

    // Atualizar última sincronização
    await prisma.dispositivo.updateMany({
      where: { id: deviceId },
      data: { ultimaSincronizacao: new Date() },
    })

    logger.info(`[SYNC/SNAPSHOT:${requestId}] Snapshot enviado com sucesso`)

    return NextResponse.json({
      success: true,
      lastSyncAt: new Date().toISOString(),
      snapshot,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Payload inválido', details: err.errors }, { status: 400 })
    }
    logger.error(`[SYNC/SNAPSHOT:${requestId}] Erro interno:`, err)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
