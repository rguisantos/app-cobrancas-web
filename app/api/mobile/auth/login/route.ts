// POST /api/mobile/auth/login — Login para o app mobile
// Mantido para compatibilidade com o app mobile existente
// Este endpoint está fora de /api/auth/ para evitar interceptação pelo NextAuth
import { NextRequest, NextResponse } from 'next/server'
import { executarLogin } from '@/lib/auth-core'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { loginSchema } from '@/lib/validations'

// Rate limit: 10 tentativas por 15 minutos por IP (mobile pode ter mais usuários atrás do mesmo IP)
const mobileLoginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10 })

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)

  try {
    const body = await req.json()
    // Forçar dispositivo como Mobile para compatibilidade
    const parsed = loginSchema.safeParse({ ...body, dispositivo: 'Mobile' })

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.errors },
        { status: 400 }
      )
    }

    const limitResult = mobileLoginLimiter(`Mobile:${ip}`)
    if (!limitResult.success) {
      const retryAfterSeconds = Math.ceil((limitResult.resetAt - Date.now()) / 1000)
      return NextResponse.json(
        { error: 'Muitas tentativas de login. Tente novamente mais tarde.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSeconds),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(limitResult.resetAt),
          },
        }
      )
    }

    const result = await executarLogin({
      email: parsed.data.email,
      senha: parsed.data.senha,
      dispositivo: 'Mobile',
      ip,
      userAgent: req.headers.get('user-agent') || undefined,
    })

    if (!result.success) {
      const response: Record<string, unknown> = { error: result.error }
      if (result.lockoutInfo) {
        response.lockoutInfo = result.lockoutInfo
      }
      return NextResponse.json(response, { status: result.status })
    }

    return NextResponse.json({
      token: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
