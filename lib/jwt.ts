// lib/jwt.ts — JWT para autenticação do mobile
import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret'
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
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES } as jwt.SignOptions)
}

export function verificarToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, SECRET) as JwtPayload
  } catch {
    return null
  }
}

/** Extrai token do header Authorization: Bearer <token> */
export function extrairToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}
