// POST /api/auth/logout — Invalidação real de sessão
// Suporta: revogar sessão específica (refreshToken) ou todas as sessões do usuário (revogarTodas)
import { NextRequest, NextResponse } from 'next/server'
import { revogarSessao, revogarTodasSessoes } from '@/lib/auth-core'
import { extrairToken, verificarToken } from '@/lib/jwt'
import { registrarAuditoria, extractRequestInfo } from '@/lib/auditoria'
import { z } from 'zod'

const schema = z.object({
  refreshToken: z.string().optional(),
  revogarTodas: z.boolean().default(false), // Se true, revoga TODAS as sessões
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { refreshToken, revogarTodas } = schema.parse(body)

    // Obter payload do access token para auditoria (disponível em todos os fluxos)
    const token = extrairToken(req.headers.get('Authorization'))
    const payload = token ? verificarToken(token) : null

    if (revogarTodas) {
      if (payload?.sub) {
        const count = await revogarTodasSessoes(payload.sub)
        registrarAuditoria({
          acao: 'revogar_todas_sessoes',
          entidade: 'sessao',
          detalhes: { sessoesRevogadas: count },
          usuarioId: payload.sub,
          ...extractRequestInfo(req),
          severidade: 'seguranca',
        })
        return NextResponse.json({ success: true, message: `${count} sessões encerradas` })
      }
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
    }

    if (refreshToken) {
      const revoked = await revogarSessao(refreshToken)
      registrarAuditoria({
        acao: 'logout',
        entidade: 'sessao',
        detalhes: { tipo: 'sessao_unica' },
        usuarioId: payload?.sub,
        ...extractRequestInfo(req),
        severidade: 'seguranca',
      })
      if (revoked) {
        return NextResponse.json({ success: true, message: 'Sessão encerrada' })
      }
      return NextResponse.json({ success: true, message: 'Sessão já não existe' })
    }

    // Sem refresh token fornecido — best effort
    registrarAuditoria({
      acao: 'logout',
      entidade: 'sessao',
      detalhes: { tipo: 'sem_token' },
      usuarioId: payload?.sub,
      ...extractRequestInfo(req),
      severidade: 'seguranca',
    })
    return NextResponse.json({ success: true, message: 'Logout realizado' })
  } catch {
    return NextResponse.json({ success: true, message: 'Logout realizado' })
  }
}
