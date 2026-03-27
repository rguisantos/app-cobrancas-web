// lib/jwt.ts — JWT para autenticação do mobile
import jwt from 'jsonwebtoken'

// CRÍTICO: Não usar fallback - deve falhar se não configurado
const getSecret = (): string => {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error(
      'ERRO CRÍTICO: JWT_SECRET ou NEXTAUTH_SECRET não configurado! ' +
      'Configure uma das variáveis de ambiente antes de iniciar a aplicação.'
    )
  }
  return secret
}

const EXPIRES = process.env.JWT_EXPIRES_IN || '30d'

export interface JwtPayload {
  sub: string        // userId
  email: string
  nome: string
  tipoPermissao: string
  iat?: number
  exp?: number
}

export function gerarToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const secret = getSecret()
  return jwt.sign(payload, secret, { expiresIn: EXPIRES } as jwt.SignOptions)
}

export function verificarToken(token: string): JwtPayload | null {
  try {
    const secret = getSecret()
    return jwt.verify(token, secret) as JwtPayload
  } catch {
    return null
  }
}

/** Extrai token do header Authorization: Bearer <token> */
export function extrairToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}
