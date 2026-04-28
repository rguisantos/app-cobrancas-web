// POST /api/admin/sync/conflict/resolve — Resolve conflito (web admin, NextAuth)
// Refatorado: usa resolvedor centralizado (elimina ~95% de duplicação com versão mobile)
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { resolveConflict, conflictResolveSchema } from '@/lib/sync-conflict-resolver'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user || session.user.tipoPermissao !== 'Administrador') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const input = conflictResolveSchema.parse(body)

    const result = await resolveConflict(input)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 400 }
      )
    }

    logger.info(`[admin/sync/conflict/resolve] Conflito ${input.conflitoId} resolvido por admin ${session.user.nome}`)

    return NextResponse.json({ success: true, message: 'Conflito resolvido' })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    logger.error('[admin/sync/conflict/resolve] Erro:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
