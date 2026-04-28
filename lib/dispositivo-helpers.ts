// lib/dispositivo-helpers.ts
// Funções centralizadas para validação e busca de dispositivos
// Elimina duplicação de código entre as rotas de sync e dispositivos

import { prisma } from './prisma'
import { logger } from './logger'
import crypto from 'crypto'

// ── Tipos ──────────────────────────────────────────────────────────────

export interface DispositivoValidado {
  id: string
  nome: string
  chave: string
  deviceKey: string | null
  deviceName: string | null
  tipo: string
  status: string
  ativado: boolean
  senhaNumerica: string | null
  ultimaSincronizacao: Date | null
  createdAt: Date
  updatedAt: Date
}

export type DispositivoStatus = 'ativo' | 'inativo' | 'pendente'

// ── Geração segura de chaves e senhas ─────────────────────────────────

/**
 * Gera chave de ativação segura (DEV-XXXXXX) usando crypto
 * Antes usava Math.random() — não criptograficamente seguro
 */
export function gerarChaveAtivacao(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let key = ''
  const bytes = crypto.randomBytes(6)
  for (let i = 0; i < 6; i++) {
    key += chars[bytes[i] % chars.length]
  }
  return `DEV-${key}`
}

/**
 * Gera senha numérica de 6 dígitos usando crypto seguro
 * Substitui Math.floor(Math.random() * 900000) + 100000
 */
export function gerarSenhaNumerica(): string {
  return crypto.randomInt(100000, 1000000).toString()
}

// ── Busca de dispositivo ───────────────────────────────────────────────

/**
 * Busca dispositivo por deviceKey com fallback para chave (legado)
 * Centraliza a lógica que era duplicada em 4+ rotas
 */
export async function findDispositivo(deviceKey: string): Promise<DispositivoValidado | null> {
  // 1. Buscar por deviceKey (campo técnico — preferencial)
  let dispositivo = await prisma.dispositivo.findUnique({
    where: { deviceKey },
  })

  if (dispositivo) {
    logger.debug(`[dispositivo-helpers] Encontrado por deviceKey: ${deviceKey.substring(0, 20)}...`)
    return dispositivo as DispositivoValidado
  }

  // 2. Fallback: buscar por chave (compatibilidade com versões antigas do mobile)
  dispositivo = await prisma.dispositivo.findUnique({
    where: { chave: deviceKey },
  })

  if (dispositivo) {
    logger.debug(`[dispositivo-helpers] Encontrado pela chave (legado): ${deviceKey.substring(0, 20)}...`)
    return dispositivo as DispositivoValidado
  }

  return null
}

/**
 * Busca dispositivo por ID (UUID) ou chave (DEV-XXXXXX)
 * Usado na ativação onde o mobile pode enviar ID ou chave
 */
export async function findDispositivoByIdOrChave(
  dispositivoId: string
): Promise<DispositivoValidado | null> {
  // 1. Buscar por ID (UUID)
  let dispositivo = await prisma.dispositivo.findUnique({
    where: { id: dispositivoId },
  })

  if (dispositivo) {
    return dispositivo as DispositivoValidado
  }

  // 2. Buscar por chave exata
  dispositivo = await prisma.dispositivo.findUnique({
    where: { chave: dispositivoId },
  })

  if (dispositivo) {
    logger.debug(`[dispositivo-helpers] Dispositivo encontrado pela chave: ${dispositivoId}`)
    return dispositivo as DispositivoValidado
  }

  // 3. Tentar com prefixo DEV- se não tiver
  if (!dispositivoId.startsWith('DEV-')) {
    dispositivo = await prisma.dispositivo.findUnique({
      where: { chave: `DEV-${dispositivoId}` },
    })
    if (dispositivo) {
      logger.debug(`[dispositivo-helpers] Dispositivo encontrado pela chave com prefixo DEV-`)
      return dispositivo as DispositivoValidado
    }
  }

  return null
}

// ── Validação de dispositivo ativo ────────────────────────────────────

/**
 * Valida que o dispositivo existe e está ativo
 * Retorna o dispositivo ou lança erro apropriado
 */
export async function validateDispositivoAtivo(
  deviceKey: string
): Promise<{ dispositivo: DispositivoValidado; error?: { message: string; status: number } }> {
  const dispositivo = await findDispositivo(deviceKey)

  if (!dispositivo) {
    return {
      dispositivo: dispositivo!,
      error: { message: 'Dispositivo não encontrado', status: 403 },
    }
  }

  if (dispositivo.status !== 'ativo') {
    return {
      dispositivo,
      error: { message: 'Dispositivo inativo', status: 403 },
    }
  }

  return { dispositivo }
}

// ── Rate Limiting (Database-based) ────────────────────────────────────

// Tabela de rate limiting em memória (mantida para compatibilidade)
// Em produção com múltiplas instâncias, migrar para Redis/Upstash
const failedAttempts = new Map<string, { count: number; blockedUntil: number }>()

const MAX_ATTEMPTS = 5
const BLOCK_DURATION_MS = 15 * 60 * 1000 // 15 minutos

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now()
  const record = failedAttempts.get(ip)

  if (record && record.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((record.blockedUntil - now) / 1000),
    }
  }

  return { allowed: true }
}

export function registerFailure(ip: string): void {
  const now = Date.now()
  const record = failedAttempts.get(ip) || { count: 0, blockedUntil: 0 }

  // Reset se o bloqueio já expirou
  if (record.blockedUntil > 0 && record.blockedUntil <= now) {
    record.count = 0
    record.blockedUntil = 0
  }

  record.count += 1

  if (record.count >= MAX_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_DURATION_MS
    logger.warn(`[dispositivo-helpers] IP ${ip} bloqueado após ${MAX_ATTEMPTS} tentativas falhas`)
  }

  failedAttempts.set(ip, record)
}

export function registerSuccess(ip: string): void {
  failedAttempts.delete(ip)
}

// ── Utilitários ───────────────────────────────────────────────────────

export function getClientIp(req: { headers: { get: (name: string) => string | null } }): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}
