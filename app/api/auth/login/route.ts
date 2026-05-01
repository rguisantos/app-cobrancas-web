// POST /api/auth/login — Login unificado para Web e Mobile
// Retorna { token, refreshToken, user }
// O campo `dispositivo` no body determina se é Web ou Mobile
import { NextRequest, NextResponse } from 'next/server'
import { executarLogin, checkDbRateLimit } from '@/lib/auth-core'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { loginSchema } from '@/lib/validations'
import { registrarAuditoria, extractRequestInfo } from '@/lib/auditoria'

// Rate limit in-memory como primeira camada (rápido, mas reseta em cold start)
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 5 })
const mobileLoginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10 })

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)

  try {
    const body = await req.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.errors },
        { status: 400 }
      )
    }

    const { email, senha, dispositivo } = parsed.data

    // 1. Rate limit in-memory como primeira camada (rápido, proteção básica)
    const limiter = dispositivo === 'Mobile' ? mobileLoginLimiter : loginLimiter
    const limitResult = limiter(`${dispositivo}:${ip}`)
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

    // 2. Executar login (inclui rate limiting persistente via DB + lockout + validação)
    const result = await executarLogin({
      email,
      senha,
      dispositivo,
      ip,
      userAgent: req.headers.get('user-agent') || undefined,
    })

    if (!result.success) {
      registrarAuditoria({
        acao: 'login_falha',
        entidade: 'usuario',
        detalhes: { email, dispositivo, motivo: result.error, sucesso: false },
        ...extractRequestInfo(req),
        origem: dispositivo === 'Mobile' ? 'mobile' : 'web',
        severidade: 'critico',
      })
      const response: Record<string, unknown> = { error: result.error }
      if (result.lockoutInfo) {
        response.lockoutInfo = result.lockoutInfo
      }
      if (result.status === 429) {
        // Rate limit via DB — incluir informações no header
        return NextResponse.json(response, {
          status: 429,
          headers: { 'Retry-After': '900' }, // 15 minutos
        })
      }
      return NextResponse.json(response, { status: result.status })
    }

    registrarAuditoria({
      acao: 'login',
      entidade: 'usuario',
      entidadeId: (result.user as { id?: string })?.id,
      entidadeNome: email,
      detalhes: { email, dispositivo, sucesso: true },
      ...extractRequestInfo(req),
      origem: dispositivo === 'Mobile' ? 'mobile' : 'web',
      severidade: 'seguranca',
    })

    return NextResponse.json({
      token: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
