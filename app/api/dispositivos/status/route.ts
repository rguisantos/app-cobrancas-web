// POST /api/dispositivos/status — Mobile verifica se dispositivo precisa de ativação
// Refatorado: usa helpers centralizados e logger padronizado
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { findDispositivo } from '@/lib/dispositivo-helpers'
import { z } from 'zod'

const schema = z.object({
  deviceKey: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  logger.debug(`[dispositivos/status:${requestId}] Verificação de status`)

  try {
    const body = await req.json()
    const data = schema.parse(body)

    // Se não tem deviceKey, precisa de ativação
    if (!data.deviceKey) {
      logger.debug(`[dispositivos/status:${requestId}] Sem deviceKey - precisa ativação`)
      return NextResponse.json({ needsActivation: true })
    }

    // Buscar dispositivo (centralizado com fallback)
    const dispositivo = await findDispositivo(data.deviceKey)

    if (!dispositivo) {
      logger.debug(`[dispositivos/status:${requestId}] Dispositivo não encontrado - precisa ativação`)
      return NextResponse.json({ needsActivation: true })
    }

    logger.debug(`[dispositivos/status:${requestId}] Dispositivo encontrado: ${dispositivo.nome} (status: ${dispositivo.status})`)

    const needsActivation = dispositivo.status !== 'ativo'

    return NextResponse.json({
      needsActivation,
      dispositivoId: dispositivo.id,
      status: dispositivo.status,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: err.errors },
        { status: 400 }
      )
    }
    logger.error('[dispositivos/status] Erro interno:', err)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
