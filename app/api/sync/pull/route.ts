// POST /api/sync/pull — Servidor envia alterações para o mobile
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extrairToken, verificarToken } from '@/lib/jwt'
import { processPull } from '@/lib/sync-engine'
import { z } from 'zod'

const pullSchema = z.object({
  deviceId:   z.string(),
  deviceKey:  z.string(),
  lastSyncAt: z.string(),
})

export async function POST(req: NextRequest) {
  const token = extrairToken(req.headers.get('Authorization'))
  if (!token || !verificarToken(token)) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { deviceId, deviceKey, lastSyncAt } = pullSchema.parse(body)

    const dispositivo = await prisma.dispositivo.findUnique({ where: { chave: deviceKey } })
    if (!dispositivo || dispositivo.status !== 'ativo') {
      return NextResponse.json({ success: false, error: 'Dispositivo não autorizado' }, { status: 403 })
    }

    const response = await processPull(deviceId, lastSyncAt)
    return NextResponse.json(response)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Payload inválido' }, { status: 400 })
    }
    console.error('[sync/pull]', err)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
