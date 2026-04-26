// POST /api/auth/reset-password — Redefinir senha usando token de recuperação
// Valida o token, verifica a força da nova senha e atualiza a senha do usuário
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { hashSenha } from '@/lib/hash'
import { revogarTodasSessoes } from '@/lib/auth-core'
import { validarForcaSenha } from '@/lib/auth-core'
import { logger } from '@/lib/logger'
import { z } from 'zod'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

const schema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  novaSenha: z.string().min(1, 'Nova senha é obrigatória'),
  confirmarSenha: z.string().min(1, 'Confirmação é obrigatória'),
}).refine(data => data.novaSenha === data.confirmarSenha, {
  message: 'As senhas não coincidem',
  path: ['confirmarSenha'],
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, novaSenha, confirmarSenha } = schema.parse(body)

    // Validar força da nova senha
    const forcaSenha = validarForcaSenha(novaSenha)
    if (!forcaSenha.valid) {
      return NextResponse.json(
        { error: 'Senha não atende aos requisitos de segurança', details: forcaSenha.errors },
        { status: 400 }
      )
    }

    // Buscar token de recuperação pelo hash
    const tokenHash = hashToken(token)
    const tokenRecuperacao = await prisma.tokenRecuperacao.findUnique({
      where: { token: tokenHash },
      include: {
        usuario: {
          select: { id: true, email: true, status: true, deletedAt: true },
        },
      },
    })

    if (!tokenRecuperacao) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 400 }
      )
    }

    // Verificar se o token já foi usado
    if (tokenRecuperacao.usado) {
      return NextResponse.json(
        { error: 'Token já foi utilizado. Solicite uma nova recuperação.' },
        { status: 400 }
      )
    }

    // Verificar se o token expirou
    if (tokenRecuperacao.expiraEm <= new Date()) {
      return NextResponse.json(
        { error: 'Token expirado. Solicite uma nova recuperação.' },
        { status: 400 }
      )
    }

    // Verificar se o usuário ainda está ativo
    if (tokenRecuperacao.usuario.status !== 'Ativo' || tokenRecuperacao.usuario.deletedAt) {
      return NextResponse.json(
        { error: 'Conta desativada. Entre em contato com o administrador.' },
        { status: 400 }
      )
    }

    // Hash da nova senha
    const novaSenhaHash = await hashSenha(novaSenha)

    // Transação: atualizar senha + marcar token como usado + desbloquear conta
    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: tokenRecuperacao.usuarioId },
        data: {
          senha: novaSenhaHash,
          tentativasLoginFalhas: 0,
          bloqueadoAte: null,
        },
      }),
      prisma.tokenRecuperacao.update({
        where: { id: tokenRecuperacao.id },
        data: { usado: true },
      }),
    ])

    // Revogar todas as sessões existentes (segurança: força re-login em todos os dispositivos)
    await revogarTodasSessoes(tokenRecuperacao.usuarioId)

    logger.info(`[reset-password] Senha redefinida para: ${tokenRecuperacao.usuario.email}`)

    return NextResponse.json({
      success: true,
      message: 'Senha redefinida com sucesso. Faça login com a nova senha.',
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: err.errors.map(e => e.message) },
        { status: 400 }
      )
    }
    logger.error('[reset-password] Erro interno:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
