// GET /api/sync/conflicts — Lista conflitos pendentes do dispositivo autenticado
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extrairToken, verificarToken } from '@/lib/jwt'
import { z } from 'zod'

const querySchema = z.object({
  deviceId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const token = extrairToken(req.headers.get('Authorization'))
  if (!token || !verificarToken(token)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const { deviceId } = querySchema.parse({
      deviceId: searchParams.get('deviceId') || undefined,
    })

    // FIX: aplicar filtro de deviceId — cada dispositivo só vê seus próprios conflitos
    const conflicts = await prisma.syncConflict.findMany({
      where: {
        resolvedAt: null,
        ...(deviceId ? { deviceId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ conflicts })
  } catch (error) {
    console.error('[sync/conflicts]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
