// POST /api/sync/conflict/resolve — Resolve um conflito de sincronização
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extrairToken, verificarToken } from '@/lib/jwt'
import { z } from 'zod'

const schema = z.object({
  conflitoId: z.string(),
  estrategia: z.enum(['local', 'remote', 'newest', 'manual']),
  versaoFinal: z.any().optional(),
})

export async function POST(req: NextRequest) {
  const token = extrairToken(req.headers.get('Authorization'))
  if (!token || !verificarToken(token)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { conflitoId, estrategia, versaoFinal } = schema.parse(body)

    const conflito = await prisma.syncConflict.findUnique({
      where: { id: conflitoId },
    })

    if (!conflito) {
      return NextResponse.json({ error: 'Conflito não encontrado' }, { status: 404 })
    }

    // Determinar versão final baseado na estratégia
    let versao: any
    switch (estrategia) {
      case 'local':
        versao = conflito.localVersion
        break
      case 'remote':
        versao = conflito.remoteVersion
        break
      case 'newest':
        const localDate = new Date((conflito.localVersion as any).updatedAt)
        const remoteDate = new Date((conflito.remoteVersion as any).updatedAt)
        versao = localDate > remoteDate ? conflito.localVersion : conflito.remoteVersion
        break
      case 'manual':
        versao = versaoFinal
        break
    }

    // Aplicar versão no banco
    const entityTableMap: Record<string, string> = {
      cliente: 'cliente',
      produto: 'produto',
      locacao: 'locacao',
      cobranca: 'cobranca',
      rota: 'rota',
    }

    const tableName = entityTableMap[conflito.entityType]
    if (tableName && versao) {
      const repo = (prisma as any)[tableName]
      if (repo) {
        await repo.update({
          where: { id: conflito.entityId },
          data: {
            ...versao,
            version: { increment: 1 },
            syncStatus: 'synced',
            needsSync: true, // Marcar para sincronizar com outros dispositivos
          },
        })
      }
    }

    // Marcar conflito como resolvido
    await prisma.syncConflict.update({
      where: { id: conflitoId },
      data: {
        resolution: estrategia,
        resolvedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, message: 'Conflito resolvido' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }
    console.error('[sync/conflict/resolve]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
