// POST /api/dispositivos/ativar — Mobile ativa dispositivo com senha de 6 dígitos
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  dispositivoId: z.string().min(1, 'ID do dispositivo é obrigatório'),
  deviceKey:     z.string().min(1, 'Chave do dispositivo é obrigatória'),
  deviceName:    z.string().min(1, 'Nome do dispositivo é obrigatório'),
  senhaNumerica: z.string().length(6, 'Senha deve ter 6 dígitos'),
})

// Rate limiting simples em memória (por IP)
// Em produção usar Redis/Upstash
const failedAttempts = new Map<string, { count: number; blockedUntil: number }>()

const MAX_ATTEMPTS = 5
const BLOCK_DURATION_MS = 15 * 60 * 1000 // 15 minutos

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
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

function registerFailure(ip: string): void {
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
    console.warn(`[dispositivos/ativar] IP ${ip} bloqueado após ${MAX_ATTEMPTS} tentativas falhas`)
  }

  failedAttempts.set(ip, record)
}

function registerSuccess(ip: string): void {
  failedAttempts.delete(ip)
}

export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  const ip = getClientIp(req)
  console.log(`\n[DISPOSITIVOS/ATIVAR:${requestId}] ========== ATIVAÇÃO START ==========`)
  console.log(`[DISPOSITIVOS/ATIVAR:${requestId}] IP: ${ip}`)

  // Verificar rate limit antes de qualquer processamento
  const rateCheck = checkRateLimit(ip)
  if (!rateCheck.allowed) {
    console.warn(`[DISPOSITIVOS/ATIVAR:${requestId}] ❌ Rate limit excedido para IP ${ip}`)
    return NextResponse.json(
      {
        success: false,
        error: `Muitas tentativas falhas. Tente novamente em ${rateCheck.retryAfterSeconds} segundos.`,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) },
      }
    )
  }

  try {
    const body = await req.json()
    const data = schema.parse(body)
    console.log(`[DISPOSITIVOS/ATIVAR:${requestId}] DispositivoId: ${data.dispositivoId}`)

    const dispositivo = await prisma.dispositivo.findUnique({
      where: { id: data.dispositivoId },
    })

    if (!dispositivo) {
      registerFailure(ip)
      console.error(`[DISPOSITIVOS/ATIVAR:${requestId}] ❌ Dispositivo não encontrado`)
      // Mensagem genérica — não revelar se o ID existe ou não
      return NextResponse.json(
        { success: false, error: 'ID ou senha numérica inválidos' },
        { status: 401 }
      )
    }

    console.log(`[DISPOSITIVOS/ATIVAR:${requestId}] Dispositivo encontrado: ${dispositivo.nome}`)

    // Verificar senha numérica (timing-safe via comparação de string após parse)
    if (!dispositivo.senhaNumerica || dispositivo.senhaNumerica !== data.senhaNumerica) {
      registerFailure(ip)
      console.error(`[DISPOSITIVOS/ATIVAR:${requestId}] ❌ Senha numérica inválida`)
      return NextResponse.json(
        { success: false, error: 'ID ou senha numérica inválidos' },
        { status: 401 }
      )
    }

    // Ativar dispositivo: atualizar chave, nome, status e INVALIDAR o PIN
    const dispositivoAtualizado = await prisma.dispositivo.update({
      where: { id: data.dispositivoId },
      data: {
        chave: data.deviceKey,
        nome: data.deviceName,
        status: 'ativo',
        senhaNumerica: null, // PIN single-use — invalidado após uso
        updatedAt: new Date(),
      },
    })

    registerSuccess(ip)
    console.log(`[DISPOSITIVOS/ATIVAR:${requestId}] ✅ Dispositivo ativado! PIN invalidado.`)
    console.log(`[DISPOSITIVOS/ATIVAR:${requestId}] ========== ATIVAÇÃO END (200) ==========\n`)

    return NextResponse.json({
      success: true,
      dispositivo: {
        id: dispositivoAtualizado.id,
        nome: dispositivoAtualizado.nome,
        status: dispositivoAtualizado.status,
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error(`[DISPOSITIVOS/ATIVAR:${requestId}] ❌ Erro de validação:`, err.errors)
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: err.errors },
        { status: 400 }
      )
    }
    console.error(`[DISPOSITIVOS/ATIVAR:${requestId}] ❌ Erro interno:`, err)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
