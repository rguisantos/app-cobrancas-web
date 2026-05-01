// POST /api/sync/conflict/resolve — Resolve um conflito de sincronização (mobile JWT)
// Refatorado: usa resolvedor centralizado (elimina ~95% de duplicação)
import { NextRequest, NextResponse } from 'next/server'
import { extrairToken, verificarToken } from '@/lib/jwt'
import { resolveConflict, conflictResolveSchema } from '@/lib/sync-conflict-resolver'
import { logger } from '@/lib/logger'
import { registrarAuditoria, extractRequestInfo } from '@/lib/auditoria'

export async function POST(req: NextRequest) {
  const token = extrairToken(req.headers.get('Authorization'))
  if (!token || !verificarToken(token)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const input = conflictResolveSchema.parse(body)

    const result = await resolveConflict(input)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 400 }
      )
    }

    registrarAuditoria({
      acao: 'sync_conflict_resolve',
      entidade: 'sync',
      detalhes: { conflictId: input.conflitoId, resolution: input.estrategia },
      ...extractRequestInfo(req),
      origem: 'mobile',
      severidade: 'aviso',
    })

    return NextResponse.json({ success: true, message: 'Conflito resolvido' })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    logger.error('[sync/conflict/resolve] Erro:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
