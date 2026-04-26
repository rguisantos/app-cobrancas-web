// POST /api/mobile/auth/refresh — Renova tokens usando refresh token armazenado no DB
// Sistema de rotação de refresh tokens: a cada renovação, o token antigo é revogado
// e um novo par (access + refresh) é emitido.
import { NextRequest, NextResponse } from 'next/server'
import { validarRefreshToken, criarSessao, revogarSessao } from '@/lib/auth-core'
import { prisma } from '@/lib/prisma'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Rate limit: 30 tentativas por 15 minutos por IP (refresh é chamado com mais frequência)
const refreshLimiter = rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 30 })

const schema = z.object({
  refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
})

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const limitResult = refreshLimiter(ip)
  if (!limitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Muitas requisições. Tente novamente mais tarde.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((limitResult.resetAt - Date.now()) / 1000)) },
      }
    )
  }

  try {
    const body = await req.json()
    const { refreshToken } = schema.parse(body)

    // Validar o refresh token contra o banco de dados
    const validation = await validarRefreshToken(refreshToken)

    if (!validation.valid || !validation.usuarioId || !validation.sessaoId) {
      return NextResponse.json(
        { success: false, error: 'Refresh token inválido ou expirado. Faça login novamente.' },
        { status: 401 }
      )
    }

    // Verificar se o usuário ainda está ativo
    const usuario = await prisma.usuario.findFirst({
      where: { id: validation.usuarioId, status: 'Ativo', bloqueado: false, deletedAt: null },
      include: { rotasPermitidasRel: { include: { rota: true } } },
    })

    if (!usuario) {
      // Revogar sessão do usuário inativo
      await revogarSessao(refreshToken)
      return NextResponse.json(
        { success: false, error: 'Usuário inativo ou bloqueado' },
        { status: 401 }
      )
    }

    // Revogar o refresh token antigo (rotação)
    await revogarSessao(refreshToken)

    // Criar nova sessão com novos tokens
    const { accessToken, refreshToken: newRefreshToken } = await criarSessao(
      usuario.id,
      'Mobile',
      ip,
      req.headers.get('user-agent') || undefined
    )

    const rotasPermitidas = usuario.rotasPermitidasRel.map((ur) => ur.rotaId)

    return NextResponse.json({
      success: true,
      token: accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        role: usuario.tipoPermissao,
        tipoPermissao: usuario.tipoPermissao,
        permissoes: {
          web: usuario.permissoesWeb,
          mobile: usuario.permissoesMobile,
        },
        rotasPermitidas,
        status: usuario.status,
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Dados inválidos' }, { status: 400 })
    }
    logger.error('[mobile/auth/refresh] Erro interno:', err)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
