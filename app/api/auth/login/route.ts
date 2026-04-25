// POST /api/auth/login — Login para o app web
// Retorna { token, user } no mesmo formato que o mobile espera
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verificarSenha } from '@/lib/hash'
import { gerarToken } from '@/lib/jwt'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { z } from 'zod'

// Rate limit: 5 attempts per 15 minutes per IP
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 5 })

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  // Rate limit check
  const ip = getClientIp(req)
  const limitResult = loginLimiter(ip)
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

  try {
    const body = await req.json()
    const { email, password } = schema.parse(body)

    const usuario = await prisma.usuario.findFirst({
      where: { email, status: 'Ativo', bloqueado: false, deletedAt: null },
      include: { rotasPermitidasRel: { include: { rota: true } } },
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Email e/ou senha incorretos' }, { status: 401 })
    }

    const senhaOk = await verificarSenha(password, usuario.senha)
    if (!senhaOk) {
      return NextResponse.json({ error: 'Email e/ou senha incorretos' }, { status: 401 })
    }

    // Atualizar último acesso
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        dataUltimoAcesso: new Date().toISOString(),
        ultimoAcessoDispositivo: 'Mobile',
      },
    })

    const token = gerarToken({
      sub: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      tipoPermissao: usuario.tipoPermissao,
    })

    const rotasPermitidas = usuario.rotasPermitidasRel.map((ur) => ur.rotaId)

    return NextResponse.json({
      token,
      user: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        role: usuario.tipoPermissao,
        tipoPermissao: usuario.tipoPermissao,
        permissoes: {
          web:    usuario.permissoesWeb,
          mobile: usuario.permissoesMobile,
        },
        rotasPermitidas,
        status: usuario.status,
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: err.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
