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

// Access token: curto por padrão (15min), configurável via env
// Refresh token: endpoint /api/mobile/auth/refresh com janela de 7 dias
const EXPIRES = process.env.JWT_EXPIRES_IN || '15m'

export interface JwtPayload {
  sub: string        // userId
  email: string
  nome: string
  tipoPermissao: string
  deviceId?: string  // CORREÇÃO: incluir deviceId no JWT para validar identidade do dispositivo
  iat?: number
  exp?: number
}

export function gerarToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const secret = getSecret()
  return jwt.sign(payload, secret, { expiresIn: EXPIRES } as jwt.SignOptions)
}

/** Gera token com deviceId incluído no payload (para validação de identidade do dispositivo) */
export function gerarTokenComDevice(payload: Omit<JwtPayload, 'iat' | 'exp'>, deviceId: string): string {
  const secret = getSecret()
  return jwt.sign({ ...payload, deviceId }, secret, { expiresIn: EXPIRES } as jwt.SignOptions)
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
