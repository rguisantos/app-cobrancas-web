// POST /api/auth/forgot-password — Solicitar recuperação de senha
// Gera um token seguro e o retorna na resposta (em produção, seria enviado por email)
// Sempre retorna sucesso para não vazar se o email existe ou não
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { registrarAuditoria, extractRequestInfo } from '@/lib/auditoria'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Email inválido'),
})

// Hash do token para armazenamento (mesma abordagem dos refresh tokens)
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = schema.parse(body)

    // Buscar usuário ativo pelo email
    const usuario = await prisma.usuario.findFirst({
      where: { email, status: 'Ativo', deletedAt: null },
      select: { id: true, email: true, nome: true },
    })

    if (!usuario) {
      // Não vazar que o email não existe — retornar sucesso silencioso
      logger.info(`[forgot-password] Email não encontrado: ${email}`)
      return NextResponse.json({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá as instruções de recuperação.',
      })
    }

    // Invalidar tokens anteriores não usados
    await prisma.tokenRecuperacao.updateMany({
      where: { usuarioId: usuario.id, usado: false },
      data: { usado: true },
    })

    // Gerar token seguro (64 bytes = 512 bits)
    const rawToken = crypto.randomBytes(64).toString('hex')
    const tokenHash = hashToken(rawToken)

    // Token expira em 1 hora
    const expiraEm = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.tokenRecuperacao.create({
      data: {
        usuarioId: usuario.id,
        token: tokenHash,
        expiraEm,
      },
    })

    registrarAuditoria({
      acao: 'recuperar_senha',
      entidade: 'usuario',
      entidadeId: usuario.id,
      entidadeNome: usuario.email,
      detalhes: { email, tokenGerado: true },
      ...extractRequestInfo(req),
      severidade: 'seguranca',
    })

    logger.info(`[forgot-password] Token de recuperação gerado para: ${email}`)

    // Em produção: enviar email com link contendo o token
    // Por enquanto, retornamos o token na resposta para facilitar o desenvolvimento
    // IMPORTANTE: Em produção, remover o campo `token` da resposta!
    return NextResponse.json({
      success: true,
      message: 'Se o email estiver cadastrado, você receberá as instruções de recuperação.',
      // Em desenvolvimento, retornar o token para testes:
      ...(process.env.NODE_ENV === 'development' && { token: rawToken }),
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }
    logger.error('[forgot-password] Erro interno:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
