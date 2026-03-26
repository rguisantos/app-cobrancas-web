// GET /api/sync/conflicts — Lista conflitos pendentes
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

    const conflicts = await prisma.syncConflict.findMany({
      where: {
        resolvedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ conflicts })
  } catch (error) {
    console.error('[sync/conflicts]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
