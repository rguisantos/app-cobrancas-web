// POST /api/sync/push — Mobile envia alterações locais para o servidor
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extrairToken, verificarToken } from '@/lib/jwt'
import { processPush } from '@/lib/sync-engine'
import type { ChangeLog, EntityType } from '@/shared/types'
import { z } from 'zod'

const changeLogSchema = z.object({
  id:         z.string(),
  entityId:   z.string(),
  entityType: z.enum(['cliente', 'produto', 'locacao', 'cobranca', 'rota', 'usuario']),
  operation:  z.enum(['create', 'update', 'delete']),
  changes:    z.record(z.any()),
  timestamp:  z.string(),
  deviceId:   z.string(),
  synced:     z.boolean(),
  syncedAt:   z.string().optional(),
})

const pushSchema = z.object({
  deviceId:   z.string(),
  deviceKey:  z.string(),
  lastSyncAt: z.string(),
  changes:    z.array(changeLogSchema),
})

export async function POST(req: NextRequest) {
  // Autenticação via JWT do mobile
  const token = extrairToken(req.headers.get('Authorization'))
  if (!token || !verificarToken(token)) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { deviceId, deviceKey, changes } = pushSchema.parse(body)

    // Validar dispositivo registrado
    const dispositivo = await prisma.dispositivo.findUnique({ where: { chave: deviceKey } })
    if (!dispositivo || dispositivo.status !== 'ativo') {
      return NextResponse.json({ success: false, error: 'Dispositivo não autorizado' }, { status: 403 })
    }

    const { conflicts, errors } = await processPush(deviceId, changes)

    return NextResponse.json({
      success: true,
      lastSyncAt: new Date().toISOString(),
      conflicts,
      errors: errors.length ? errors : undefined,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Payload inválido', details: err.errors }, { status: 400 })
    }
    console.error('[sync/push]', err)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
