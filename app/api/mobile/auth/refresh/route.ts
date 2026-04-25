// POST /api/mobile/auth/refresh — Renova token JWT do mobile
// Recebe o token atual (ainda válido ou dentro da janela de tolerância)
// e emite um novo token com expiração renovada.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extrairToken, verificarToken, gerarToken } from '@/lib/jwt'
import { logger } from '@/lib/logger'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { z } from 'zod'

// Rate limit: 30 attempts per 15 minutes per IP (refresh tokens are called more frequently)
const refreshLimiter = rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 30 })

// Janela de tolerância: permite renovar tokens expirados há até 7 dias
const REFRESH_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000

export async function POST(req: NextRequest) {
  // Rate limit check
  const ip = getClientIp(req)
  const limitResult = refreshLimiter(ip)
  if (!limitResult.success) {
    const retryAfterSeconds = Math.ceil((limitResult.resetAt - Date.now()) / 1000)
    return NextResponse.json(
      { success: false, error: 'Muitas requisições. Tente novamente mais tarde.' },
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
    const authHeader = req.headers.get('Authorization')
    const token = extrairToken(authHeader)
    
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token não fornecido' }, { status: 401 })
    }

    // Tentar verificar o token normalmente
    let payload = verificarToken(token)
    
    // Se o token expirou, verificar se está dentro da janela de tolerância
    if (!payload) {
      try {
        const jwt = require('jsonwebtoken')
        const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
        if (!secret) {
          return NextResponse.json({ success: false, error: 'Configuração do servidor incompleta' }, { status: 500 })
        }

        // Decodificar sem verificar expiração para checar o payload
        const decoded = jwt.decode(token) as any
        if (!decoded?.sub) {
          return NextResponse.json({ success: false, error: 'Token malformado' }, { status: 401 })
        }

        // Verificar se está dentro da janela de tolerância
        const exp = decoded.exp * 1000 // Converter para ms
        const now = Date.now()
        if (now - exp > REFRESH_GRACE_PERIOD_MS) {
          logger.warn(`[auth/refresh] Token expirado há mais de 7 dias, recusando renovação`)
          return NextResponse.json({ 
            success: false, 
            error: 'Token expirado há muito tempo. Faça login novamente.' 
          }, { status: 401 })
        }

        // Verificar se o usuário ainda está ativo
        const usuario = await prisma.usuario.findFirst({
          where: { 
            id: decoded.sub, 
            status: 'Ativo', 
            bloqueado: false, 
            deletedAt: null 
          },
        })

        if (!usuario) {
          return NextResponse.json({ success: false, error: 'Usuário inativo ou bloqueado' }, { status: 401 })
        }

        // Emitir novo token
        payload = {
          sub: usuario.id,
          email: usuario.email,
          nome: usuario.nome,
          tipoPermissao: usuario.tipoPermissao,
        }
      } catch (decodeError) {
        logger.error(`[auth/refresh] Erro ao decodificar token:`, decodeError)
        return NextResponse.json({ success: false, error: 'Token inválido' }, { status: 401 })
      }
    }

    if (!payload) {
      return NextResponse.json({ success: false, error: 'Token inválido' }, { status: 401 })
    }

    // Verificar se o usuário ainda está ativo no banco
    const usuario = await prisma.usuario.findFirst({
      where: { 
        id: payload.sub, 
        status: 'Ativo', 
        bloqueado: false, 
        deletedAt: null 
      },
      include: { rotasPermitidasRel: { include: { rota: true } } },
    })

    if (!usuario) {
      return NextResponse.json({ success: false, error: 'Usuário inativo ou bloqueado' }, { status: 401 })
    }

    // Emitir novo token com expiração renovada
    const newToken = gerarToken({
      sub: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      tipoPermissao: usuario.tipoPermissao,
    })

    const rotasPermitidas = usuario.rotasPermitidasRel.map((ur) => ur.rotaId)

    return NextResponse.json({
      success: true,
      token: newToken,
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
    logger.error(`[auth/refresh] Erro interno:`, err)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
