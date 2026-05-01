// POST /api/dispositivos/ativar — Mobile ativa dispositivo com senha de 6 dígitos
// Refatorado: usa helpers centralizados, logger padronizado, validação aprimorada
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import {
  findDispositivoByIdOrChave,
  checkRateLimit,
  registerFailure,
  registerSuccess,
  getClientIp,
} from '@/lib/dispositivo-helpers'
import { z } from 'zod'
import { registrarAuditoria } from '@/lib/auditoria'

const schema = z.object({
  dispositivoId: z.string().min(1, 'ID do dispositivo é obrigatório'),
  deviceKey: z.string().min(1, 'Chave do dispositivo é obrigatória'),
  deviceName: z.string().min(1, 'Nome do dispositivo é obrigatório'),
  senhaNumerica: z.string().length(6, 'Senha deve ter 6 dígitos'),
})

export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  const ip = getClientIp(req)
  logger.info(`[dispositivos/ativar:${requestId}] Ativação solicitada - IP: ${ip}`)

  // Verificar rate limit antes de qualquer processamento
  const rateCheck = checkRateLimit(ip)
  if (!rateCheck.allowed) {
    logger.warn(`[dispositivos/ativar:${requestId}] Rate limit excedido para IP ${ip}`)
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
    logger.debug(`[dispositivos/ativar:${requestId}] DispositivoId: ${data.dispositivoId}`)

    // Buscar dispositivo por ID ou chave (centralizado)
    const dispositivo = await findDispositivoByIdOrChave(data.dispositivoId)

    if (!dispositivo) {
      registerFailure(ip)
      // Mensagem genérica — não revelar se o ID existe ou não
      logger.warn(`[dispositivos/ativar:${requestId}] Dispositivo não encontrado`)
      return NextResponse.json(
        { success: false, error: 'ID ou senha numérica inválidos' },
        { status: 401 }
      )
    }

    logger.debug(`[dispositivos/ativar:${requestId}] Dispositivo encontrado: ${dispositivo.nome} (ativado: ${dispositivo.ativado})`)

    // Verificar senha numérica
    if (!dispositivo.senhaNumerica || dispositivo.senhaNumerica !== data.senhaNumerica) {
      registerFailure(ip)
      logger.warn(`[dispositivos/ativar:${requestId}] Senha numérica inválida`)
      return NextResponse.json(
        { success: false, error: 'ID ou senha numérica inválidos' },
        { status: 401 }
      )
    }

    // Verificar se o deviceKey já está em uso por outro dispositivo
    const dispositivoComMesmoDeviceKey = await prisma.dispositivo.findFirst({
      where: {
        deviceKey: data.deviceKey,
        NOT: { id: dispositivo.id },
      },
    })

    if (dispositivoComMesmoDeviceKey) {
      logger.warn(`[dispositivos/ativar:${requestId}] DeviceKey já em uso por outro dispositivo`)
      return NextResponse.json(
        { success: false, error: 'Este aparelho já está vinculado a outro dispositivo' },
        { status: 400 }
      )
    }

    // Ativar dispositivo:
    // - Manter a chave original (nunca muda)
    // - Armazenar deviceKey e deviceName separadamente
    // - Marcar como ativado
    // - Invalidar a senha após uso (single-use PIN)
    const dispositivoAtualizado = await prisma.dispositivo.update({
      where: { id: dispositivo.id },
      data: {
        deviceKey: data.deviceKey,
        deviceName: data.deviceName,
        ativado: true,
        status: 'ativo',
        senhaNumerica: null, // PIN single-use — invalidado após uso
        updatedAt: new Date(),
      },
    })

    registerSuccess(ip)
    logger.info(`[dispositivos/ativar:${requestId}] Dispositivo ativado com sucesso: ${dispositivoAtualizado.id} - ${dispositivoAtualizado.nome}`)

    registrarAuditoria({
      acao: 'ativar_dispositivo',
      entidade: 'dispositivo',
      entidadeId: dispositivoAtualizado.id,
      entidadeNome: dispositivoAtualizado.nome,
      detalhes: { deviceName: data.deviceName, ativado: true },
      ip,
      userAgent: req.headers.get('user-agent') || undefined,
      origem: 'mobile',
      severidade: 'seguranca',
    })

    return NextResponse.json({
      success: true,
      dispositivo: {
        id: dispositivoAtualizado.id,
        nome: dispositivoAtualizado.nome,
        chave: dispositivoAtualizado.chave,
        deviceKey: dispositivoAtualizado.deviceKey,
        status: dispositivoAtualizado.status,
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      logger.warn(`[dispositivos/ativar:${requestId}] Erro de validação:`, err.errors)
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: err.errors },
        { status: 400 }
      )
    }
    logger.error(`[dispositivos/ativar:${requestId}] Erro interno:`, err)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
